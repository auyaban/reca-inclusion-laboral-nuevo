import { NextResponse } from "next/server";
import { z } from "zod";
import { parseEmpresaSnapshot } from "@/lib/empresa";
import { createClient } from "@/lib/supabase/server";
import { prepareDraftSpreadsheet } from "@/lib/google/draftSpreadsheet";
import { isFinalizationFormSlug } from "@/lib/finalization/formRegistry";
import { isFinalizationPrewarmEnabled } from "@/lib/finalization/prewarmConfig";
import { buildDraftSpreadsheetProvisionalName } from "@/lib/finalization/documentNaming";
import {
  buildPrewarmHintForForm,
  getPrewarmCapViolation,
} from "@/lib/finalization/prewarmRegistry";
import { resolveFinalizationTemplateId } from "@/lib/finalization/templateResolution";
import { enforcePrewarmRateLimit } from "@/lib/security/prewarmRateLimit";
import type { DraftPrewarmSupabaseClient } from "@/lib/drafts/serverDraftPrewarm";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

const empresaSchema = z.object({
  nombre_empresa: z.string().trim().min(1),
});

const prewarmHintSchema = z.object({
  bundleKey: z.string().trim().min(1),
  structureSignature: z.string().trim().min(1),
  variantKey: z.string().trim().min(1),
  repeatedCounts: z.record(z.string(), z.number().int().nonnegative()),
  provisionalName: z.string().trim().min(1),
});

const prewarmGoogleSchema = z.object({
  formSlug: z.string().trim().min(1),
  empresa: empresaSchema,
  draft_identity: z.object({
    draft_id: z.string().trim().min(1),
    local_draft_session_id: z.string().trim().min(1),
  }),
  prewarm_hint: prewarmHintSchema,
});

type CanonicalDraftLookupClient = {
  from: (table: "form_drafts") => {
    select: (fields: string) => {
      eq: (field: string, value: string) => {
        eq: (field: string, value: string) => {
          eq: (field: string, value: string) => {
            is: (
              field: string,
              value: null
            ) => {
              maybeSingle: () => Promise<{
                data: { data?: unknown; empresa_snapshot?: unknown } | null;
                error: { message?: string } | null;
              }>;
            };
          };
        };
      };
    };
  };
};

type CanonicalDraftSnapshot = {
  formData: unknown;
  empresaNombre: string | null;
};

async function readCanonicalDraftSnapshot(options: {
  supabase: CanonicalDraftLookupClient;
  draftId: string;
  formSlug: FinalizationFormSlug;
  userId: string;
}): Promise<CanonicalDraftSnapshot | null> {
  const { data, error } = await options.supabase
    .from("form_drafts")
    .select("data, empresa_snapshot")
    .eq("id", options.draftId)
    .eq("user_id", options.userId)
    .eq("form_slug", options.formSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "No se pudo leer el borrador remoto.");
  }

  if (!data) {
    return null;
  }

  return {
    formData: data.data ?? {},
    empresaNombre:
      parseEmpresaSnapshot(data.empresa_snapshot)?.nombre_empresa ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = prewarmGoogleSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, status: "failed", error: issue?.message ?? "Datos inválidos." },
        { status: 400 }
      );
    }

    const { formSlug, empresa, draft_identity: draftIdentity } = parsed.data;

    if (!isFinalizationFormSlug(formSlug)) {
      return NextResponse.json(
        { success: false, status: "failed", error: "Formulario no soportado." },
        { status: 400 }
      );
    }

    if (!isFinalizationPrewarmEnabled(formSlug)) {
      return NextResponse.json(
        { success: false, status: "failed", error: "Prewarm deshabilitado." },
        { status: 409 }
      );
    }

    const masterTemplateId = resolveFinalizationTemplateId(formSlug);
    const sheetsFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!masterTemplateId || !sheetsFolderId) {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: "Faltan variables de entorno de Google Drive o Sheets.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, status: "failed", error: "No autenticado." },
        { status: 401 }
      );
    }

    const canonicalDraft = await readCanonicalDraftSnapshot({
      supabase: supabase as unknown as CanonicalDraftLookupClient,
      draftId: draftIdentity.draft_id,
      formSlug,
      userId: user.id,
    });

    if (!canonicalDraft) {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: "No se encontro el borrador remoto para preparar Google.",
        },
        { status: 404 }
      );
    }

    const canonicalEmpresaNombre =
      canonicalDraft.empresaNombre ?? empresa.nombre_empresa;
    const canonicalHint = buildPrewarmHintForForm({
      formSlug,
      formData: canonicalDraft.formData,
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug,
        draftId: draftIdentity.draft_id,
        localDraftSessionId: draftIdentity.local_draft_session_id,
      }),
    });
    const capViolation = getPrewarmCapViolation(formSlug, canonicalHint);

    if (capViolation) {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: capViolation.message,
          code: capViolation.code,
          field: capViolation.field,
          count: capViolation.count,
          max: capViolation.max,
        },
        { status: 400 }
      );
    }

    const rateLimitDecision = await enforcePrewarmRateLimit({
      userId: user.id,
      draftId: draftIdentity.draft_id,
      formSlug,
      empresaKey: canonicalEmpresaNombre,
      structureSignature: canonicalHint.structureSignature,
    });

    if (!rateLimitDecision.allowed) {
      return NextResponse.json(
        {
          success: false,
          status: "throttled",
          error: rateLimitDecision.error,
          retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
        },
        {
          status: rateLimitDecision.status,
          headers: {
            "Retry-After": String(rateLimitDecision.retryAfterSeconds),
          },
        }
      );
    }

    const draftPrewarmSupabase = supabase as unknown as DraftPrewarmSupabaseClient;
    const prepared = await prepareDraftSpreadsheet({
      supabase: draftPrewarmSupabase,
      userId: user.id,
      draftId: draftIdentity.draft_id,
      formSlug,
      masterTemplateId,
      sheetsFolderId,
      empresaNombre: canonicalEmpresaNombre,
      hint: canonicalHint,
      strictDraftPersistence: true,
      mode: "background",
    });

    if (prepared.kind === "unavailable") {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: "No se encontro el borrador remoto para preparar Google.",
        },
        { status: 404 }
      );
    }

    if (prepared.kind === "busy") {
      const leaseExpiryMs = Date.parse(String(prepared.leaseExpiresAt ?? ""));
      const retryAfterSeconds = Number.isFinite(leaseExpiryMs)
        ? Math.max(1, Math.ceil((leaseExpiryMs - Date.now()) / 1000))
        : 5;

      return NextResponse.json(
        {
          success: false,
          status: "busy",
          error: "Ya hay otra preparacion de Google en curso para este borrador.",
          retryAfterSeconds,
        },
        {
          status: 409,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      status: prepared.prewarmReused
        ? "noop"
        : prepared.prewarmStatus === "rebuilt"
          ? "rebuilt"
          : "ready",
      prewarm: prepared.summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "No se pudo preparar Google.",
      },
      { status: 500 }
    );
  }
}
