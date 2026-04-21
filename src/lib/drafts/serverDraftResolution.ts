import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import { type LongFormSlug } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Empresa } from "@/lib/store/empresaStore";
import type { InitialDraftResolution } from "./initialDraftResolution";
import { buildDraftMeta, getErrorMessage, type DraftRow } from "./shared";

const DRAFT_PAYLOAD_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
  "created_at",
  "last_checkpoint_at",
  "last_checkpoint_hash",
  "empresa_snapshot",
  "data",
].join(", ");

const MISSING_DRAFT_MESSAGE =
  "No se pudo abrir el borrador solicitado. Verifica que siga disponible.";
const MISSING_EMPRESA_MESSAGE =
  "No fue posible reconstruir la empresa asociada a este borrador.";

async function getEmpresaByNit(
  nit: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Empresa | null> {
  const { data, error } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Empresa | null) ?? null;
}

export async function resolveInitialDraftResolution(params: {
  draftId: string;
  expectedSlug: LongFormSlug;
}): Promise<InitialDraftResolution> {
  const draftId = params.draftId.trim();
  if (!draftId) {
    return { status: "none" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("form_drafts")
      .select(DRAFT_PAYLOAD_FIELDS)
      .eq("id", draftId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        message: getErrorMessage(error, MISSING_DRAFT_MESSAGE),
      };
    }

    if (!data) {
      return {
        status: "error",
        message: MISSING_DRAFT_MESSAGE,
      };
    }

    const row = data as unknown as DraftRow;
    if (row.form_slug !== params.expectedSlug) {
      return {
        status: "error",
        message: MISSING_DRAFT_MESSAGE,
      };
    }

    let empresa = parseEmpresaSnapshot(row.empresa_snapshot);
    if (!empresa && row.empresa_nit) {
      empresa = await getEmpresaByNit(row.empresa_nit, supabase);
    }

    if (!empresa) {
      return {
        status: "error",
        message: MISSING_EMPRESA_MESSAGE,
      };
    }

    return {
      status: "ready",
      draft: buildDraftMeta(row, empresa),
      empresa,
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error, MISSING_DRAFT_MESSAGE),
    };
  }
}
