import { NextRequest, NextResponse } from "next/server";
import { runImportPipeline, readPdfText, unwrapPayloadNormalized, type CatalogDependencies, type PreResolvedFinalizedRecord } from "@/lib/ods/import/pipeline";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAppRole } from "@/lib/auth/roles";
import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import { extractActaIdFromInput, extractGoogleArtifactReference, type GoogleArtifactReference } from "@/lib/ods/import/parsers/actaIdParser";
import type { ActaParseResult } from "@/lib/ods/import/parsers";

const ODS_ROLE = ["ods_operador"] as const;
const EMPRESA_SELECT = "nit_empresa, nombre_empresa, ciudad_empresa, sede_empresa, zona_empresa, caja_compensacion, correo_profesional, profesional_asignado, asesor";
const FALLBACK_EMPRESAS_LIMIT = 500;
const FUZZY_NIT_SCAN_LIMIT = 2000;
const TARIFAS_SCAN_LIMIT = 500;
const FINALIZED_SELECT = "registro_id, acta_ref, payload_normalized";
const FINALIZATION_ARTIFACT_SELECT = "idempotency_key, external_artifacts, response_payload";

type EmpresaRow = {
  nit_empresa: string | null;
  nombre_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  zona_empresa: string | null;
  caja_compensacion: string | null;
  correo_profesional: string | null;
  profesional_asignado: string | null;
  asesor: string | null;
};

type ProfesionalRow = { id: number; nombre_profesional: string | null };
type InterpreteRow = { id: number; nombre: string | null };
type UsuarioRow = {
  cedula_usuario: string | null;
  nombre_usuario: string | null;
  discapacidad_usuario: string | null;
  genero_usuario: string | null;
};

type FinalizedRecordRow = {
  registro_id: string | null;
  acta_ref: string | null;
  payload_normalized: unknown | null;
};

type FinalizedLookupResult =
  | { status: "found"; record: PreResolvedFinalizedRecord }
  | { status: "missing_payload"; actaRef: string }
  | { status: "not_found"; actaRef: string };

type FormFinalizationRequestRow = {
  idempotency_key?: string | null;
  external_artifacts: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
};

function warnImportStage(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("[ods.importar]", stage, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function toPreResolvedFinalizedRecord(row: FinalizedRecordRow | null): FinalizedLookupResult {
  const actaRef = readText(row?.acta_ref);
  if (!row || !actaRef) {
    return { status: "not_found", actaRef: "" };
  }

  const registroId = readText(row.registro_id);
  if (!registroId || !row.payload_normalized) {
    return { status: "missing_payload", actaRef };
  }

  return {
    status: "found",
    record: {
      acta_ref: actaRef,
      registro_id: registroId,
      payload_normalized: row.payload_normalized,
    },
  };
}

async function lookupFinalizedByActaRef(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  actaRef: string
): Promise<FinalizedLookupResult> {
  const { data, error } = await admin
    .from("formatos_finalizados_il")
    .select(FINALIZED_SELECT)
    .eq("acta_ref", actaRef)
    .maybeSingle();

  if (error) throw error;
  const result = toPreResolvedFinalizedRecord((data as FinalizedRecordRow | null) ?? null);
  if (result.status === "not_found") {
    return { status: "not_found", actaRef };
  }
  return result;
}

function buildPreliminaryParseResult(
  record: PreResolvedFinalizedRecord,
  filePath: string,
  sourceType: ActaParseResult["source_type"]
): ActaParseResult {
  const payload = unwrapPayloadNormalized(record.payload_normalized as Record<string, unknown>);
  return {
    ...(payload as Record<string, unknown>),
    file_path: filePath,
    source_type: sourceType,
    acta_ref: record.acta_ref,
    warnings: [],
  } as ActaParseResult;
}

function artifactFieldIdMatches(value: unknown, artifactId: string) {
  const text = readText(value);
  return text === artifactId;
}

function artifactLinkMatches(value: unknown, artifact: GoogleArtifactReference) {
  const text = readText(value);
  if (!text) return false;
  const parsed = extractGoogleArtifactReference(text);
  return parsed?.kind === artifact.kind && parsed.artifactId === artifact.artifactId;
}

function rowMatchesArtifact(row: FormFinalizationRequestRow, artifact: GoogleArtifactReference) {
  const artifacts = isRecord(row.external_artifacts) ? row.external_artifacts : {};
  const response = isRecord(row.response_payload) ? row.response_payload : {};
  if (artifact.kind === "google_sheet") {
    return (
      artifactFieldIdMatches(artifacts.spreadsheetId, artifact.artifactId) ||
      artifactLinkMatches(artifacts.sheetLink, artifact) ||
      artifactLinkMatches(response.sheetLink, artifact)
    );
  }
  return (
    artifactFieldIdMatches(artifacts.pdfFileId, artifact.artifactId) ||
    artifactFieldIdMatches(artifacts.driveFileId, artifact.artifactId) ||
    artifactFieldIdMatches(artifacts.fileId, artifact.artifactId) ||
    artifactFieldIdMatches(response.pdfFileId, artifact.artifactId) ||
    artifactFieldIdMatches(response.driveFileId, artifact.artifactId) ||
    artifactFieldIdMatches(response.fileId, artifact.artifactId) ||
    artifactLinkMatches(artifacts.pdfLink, artifact) ||
    artifactLinkMatches(response.pdfLink, artifact)
  );
}

function actaRefFromFinalizationRow(row: FormFinalizationRequestRow) {
  const artifacts = isRecord(row.external_artifacts) ? row.external_artifacts : {};
  const response = isRecord(row.response_payload) ? row.response_payload : {};
  return readText(artifacts.actaRef) || readText(response.actaRef);
}

async function resolveArtifactActaRef(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  artifact: GoogleArtifactReference
) {
  const exactFilters = artifact.kind === "google_sheet"
    ? [
        ["external_artifacts->>spreadsheetId", artifact.artifactId],
        ["external_artifacts->>sheetLink", artifact.originalUrl],
        ["response_payload->>sheetLink", artifact.originalUrl],
      ]
    : [
        ["external_artifacts->>pdfFileId", artifact.artifactId],
        ["external_artifacts->>driveFileId", artifact.artifactId],
        ["external_artifacts->>fileId", artifact.artifactId],
        ["response_payload->>pdfFileId", artifact.artifactId],
        ["response_payload->>driveFileId", artifact.artifactId],
        ["response_payload->>fileId", artifact.artifactId],
        ["external_artifacts->>pdfLink", artifact.originalUrl],
        ["response_payload->>pdfLink", artifact.originalUrl],
      ];

  const responses = await Promise.all(
    exactFilters.map(([column, value]) =>
      admin
        .from("form_finalization_requests")
        .select(FINALIZATION_ARTIFACT_SELECT)
        .eq("status", "succeeded")
        .eq(column, value)
        .limit(2)
    )
  );

  const rowsByKey = new Map<string, FormFinalizationRequestRow>();
  for (const { data, error } of responses) {
    if (error) throw error;
    for (const row of (data || []) as FormFinalizationRequestRow[]) {
      const key = readText(row.idempotency_key) || JSON.stringify(row);
      rowsByKey.set(key, row);
    }
  }

  const rows = Array.from(rowsByKey.values()).filter((row) =>
    rowMatchesArtifact(row, artifact)
  );
  if (rows.length !== 1) return "";
  return actaRefFromFinalizationRow(rows[0]);
}

export async function POST(request: NextRequest) {
  // TODO E4: registrar fallos en ods_import_failures table
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) return authorization.response;

    const supabase = await createClient();
    const admin = createSupabaseAdminClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const actaIdOrUrl = formData.get("actaIdOrUrl") as string | null;

    if (!file && !actaIdOrUrl) {
      return NextResponse.json(
        { error: "Debe proporcionar un archivo o un ACTA ID/URL" },
        { status: 400 },
      );
    }

    let fileBuffer: ArrayBuffer | undefined;
    let filePath = "";
    let fileType: "pdf" | "excel" | undefined;

    if (file) {
      fileBuffer = await file.arrayBuffer();
      filePath = file.name;
      fileType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "excel";
    }

    // EG-1: parse preliminar (Nivel 2 ACTA ID lookup) antes de cargar catalogos.
    // TODO: refactor route preliminary/catalog loading into prepareCatalogHints(input).
    let preliminaryParseResult: ActaParseResult | undefined;
    let preliminaryFullText = "";
    let preResolvedFinalizedRecord: PreResolvedFinalizedRecord | undefined;

    if (!file && actaIdOrUrl) {
      let actaRef = extractActaIdFromInput(actaIdOrUrl);
      const artifact = !actaRef ? extractGoogleArtifactReference(actaIdOrUrl) : null;

      if (!actaRef && artifact) {
        try {
          actaRef = await resolveArtifactActaRef(admin, artifact);
        } catch (error) {
          warnImportStage("direct_input.artifact_lookup", error);
        }
      }

      if (!actaRef) {
        if (artifact) {
          return NextResponse.json(
            {
              success: false,
              error: "No encontramos un acta finalizada con ese ACTA ID o URL. Verifica el codigo o sube el PDF.",
            },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { success: false, error: "No pudimos identificar un ACTA ID o URL de acta soportada." },
          { status: 400 }
        );
      }

      const lookup = await lookupFinalizedByActaRef(admin, actaRef);
      if (lookup.status === "not_found") {
        return NextResponse.json(
          {
            success: false,
            error: "No encontramos un acta finalizada con ese ACTA ID o URL. Verifica el codigo o sube el PDF.",
          },
          { status: 404 }
        );
      }
      if (lookup.status === "missing_payload") {
        return NextResponse.json(
          {
            success: false,
            error: "El acta existe, pero no tiene payload normalizado disponible. Sube el PDF para intentar extraccion.",
          },
          { status: 422 }
        );
      }

      preResolvedFinalizedRecord = lookup.record;
      preliminaryParseResult = buildPreliminaryParseResult(lookup.record, actaIdOrUrl, "acta_ref");
    } else if (file && fileBuffer && fileType === "pdf") {
      try {
        preliminaryFullText = await readPdfText(fileBuffer);
        const actaRef = extractPdfActaId(preliminaryFullText);
        if (actaRef) {
          const lookup = await lookupFinalizedByActaRef(admin, actaRef);
          if (lookup.status === "found") {
            preResolvedFinalizedRecord = lookup.record;
            preliminaryParseResult = buildPreliminaryParseResult(lookup.record, filePath, "local_pdf");
          }
        }
      } catch (error) {
        warnImportStage("preliminary_acta_lookup", error);
      }
    }

    // Extraer hints para queries selectivas
    const detectedNitRaw = String(preliminaryParseResult?.nit_empresa || "").trim();
    const detectedNitDigits = detectedNitRaw.replace(/[^0-9]/g, "");
    const detectedNombreEmpresa = String(preliminaryParseResult?.nombre_empresa || "").trim();
    const detectedNombreProfesional = String(preliminaryParseResult?.nombre_profesional || "").trim();
    const detectedFecha = String(preliminaryParseResult?.fecha_servicio || "").slice(0, 10);
    const detectedCedulas = (preliminaryParseResult?.participantes || [])
      .map((p) => String((p as Record<string, string>).cedula_usuario || (p as Record<string, string>).cedula || "").replace(/[^0-9]/g, ""))
      .filter((c) => c.length > 0);

    const fechaForVigencia = detectedFecha || new Date().toISOString().slice(0, 10);

    const empresasQueryBase = supabase.from("empresas")
      .select(EMPRESA_SELECT)
      .is("deleted_at", null);

    // Las empresas en BD pueden estar guardadas con o sin guión y dígito de
    // verificación (ej "900696296-4" vs "9006962964"). Buscamos ambas formas
    // para no perder match.
    const nitCandidates = Array.from(
      new Set([detectedNitRaw, detectedNitDigits].filter((v) => v.length > 0))
    );

    const empresasPromise: Promise<{ data: EmpresaRow[] | null }> = nitCandidates.length > 0
      ? (empresasQueryBase.in("nit_empresa", nitCandidates).limit(5) as unknown as Promise<{ data: EmpresaRow[] | null }>)
      : detectedNombreEmpresa
        ? (empresasQueryBase.ilike("nombre_empresa", `%${detectedNombreEmpresa.slice(0, 30)}%`).limit(50) as unknown as Promise<{ data: EmpresaRow[] | null }>)
        : file
          ? (empresasQueryBase.limit(FALLBACK_EMPRESAS_LIMIT) as unknown as Promise<{ data: EmpresaRow[] | null }>)
          : Promise.resolve({ data: [] as EmpresaRow[] });

    // EL-3: filtro vigencia con fecha del acta en SQL.
    // Nota: la tabla `tarifas` NO tiene columna `deleted_at` (a diferencia de empresas/profesionales).
    const tarifasPromise = supabase.from("tarifas")
      .select("codigo_servicio, referencia_servicio, descripcion_servicio, modalidad_servicio, valor_base, vigente_desde, vigente_hasta")
      .or(`vigente_desde.is.null,vigente_desde.lte.${fechaForVigencia}`)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${fechaForVigencia}`)
      .limit(TARIFAS_SCAN_LIMIT);

    const profesionalesPromise: Promise<{ data: ProfesionalRow[] | null }> = detectedNombreProfesional
      ? (supabase.from("profesionales").select("id, nombre_profesional").is("deleted_at", null).ilike("nombre_profesional", `%${detectedNombreProfesional.slice(0, 30)}%`).limit(20) as unknown as Promise<{ data: ProfesionalRow[] | null }>)
      : Promise.resolve({ data: [] as ProfesionalRow[] });

    const interpretesPromise: Promise<{ data: InterpreteRow[] | null }> = detectedNombreProfesional
      ? (supabase.from("interpretes").select("id, nombre").is("deleted_at", null).ilike("nombre", `%${detectedNombreProfesional.slice(0, 30)}%`).limit(20) as unknown as Promise<{ data: InterpreteRow[] | null }>)
      : Promise.resolve({ data: [] as InterpreteRow[] });

    const usuariosPromise: Promise<{ data: UsuarioRow[] | null }> = detectedCedulas.length > 0
      ? (supabase.from("usuarios_reca").select("cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario").is("deleted_at", null).in("cedula_usuario", detectedCedulas) as unknown as Promise<{ data: UsuarioRow[] | null }>)
      : Promise.resolve({ data: [] as UsuarioRow[] });

    const [tarifasRes, empresasRes, profesionalesRes, interpretesRes, usuariosRes] = await Promise.all([
      tarifasPromise, empresasPromise, profesionalesPromise, interpretesPromise, usuariosPromise,
    ]);

    const tarifas = (tarifasRes.data || []).map((t) => ({
      codigo_servicio: t.codigo_servicio,
      referencia_servicio: t.referencia_servicio,
      descripcion_servicio: t.descripcion_servicio,
      modalidad_servicio: t.modalidad_servicio,
      valor_base: Number(t.valor_base ?? 0),
    }));

    const empresas = empresasRes.data || [];
    let allKnownNits = empresas.map((e) => e.nit_empresa).filter(Boolean) as string[];

    // Fuzzy NIT fallback: si no hay match exacto, query secundaria solo de
    // nit_empresa. Cap explicito para limitar egress y tiempo de Levenshtein.
    if (detectedNitDigits && empresas.length === 0) {
      const nitsRes = await supabase
        .from("empresas")
        .select("nit_empresa")
        .is("deleted_at", null)
        .limit(FUZZY_NIT_SCAN_LIMIT);
      allKnownNits = (nitsRes.data || []).map((e) => e.nit_empresa).filter(Boolean) as string[];
    }

    const profesionales = profesionalesRes.data || [];
    const interpretes = interpretesRes.data || [];
    const usuarios = usuariosRes.data || [];

    const deps: CatalogDependencies = {
      tarifas,
      allKnownNits,
      companyByNit: (nit: string) => {
        const cleanNit = nit.replace(/[^0-9]/g, "");
        const found = empresas.find((e) => e.nit_empresa?.replace(/[^0-9]/g, "") === cleanNit);
        return found || null;
      },
      companyByNameFuzzy: (name: string) => {
        const normalized = name.toLowerCase().trim();
        const match = empresas.find((e) =>
          e.nombre_empresa?.toLowerCase().includes(normalized) ||
          normalized.includes(e.nombre_empresa?.toLowerCase() || ""),
        );
        if (!match) return null;
        return {
          nit_empresa: match.nit_empresa || "",
          nombre_empresa: match.nombre_empresa || "",
          caja_compensacion: match.caja_compensacion || undefined,
          asesor_empresa: match.asesor || undefined,
          sede_empresa: match.sede_empresa || undefined,
          matchType: "name_fuzzy" as const,
          confidence: 0.8,
        };
      },
      professionalByNameFuzzy: (name: string) => {
        const normalized = name.toLowerCase().trim();
        const profMatch = profesionales.find((p) =>
          p.nombre_profesional?.toLowerCase().includes(normalized) ||
          normalized.includes(p.nombre_profesional?.toLowerCase() || ""),
        );
        if (profMatch) {
          return {
            nombre: profMatch.nombre_profesional || "",
            source: "profesionales" as const,
            matchType: "fuzzy" as const,
            confidence: 0.7,
          };
        }
        const intMatch = interpretes.find((i) =>
          i.nombre?.toLowerCase().includes(normalized) ||
          normalized.includes(i.nombre?.toLowerCase() || ""),
        );
        if (intMatch) {
          return {
            nombre: intMatch.nombre || "",
            source: "interpretes" as const,
            matchType: "fuzzy" as const,
            confidence: 0.85,
          };
        }
        return null;
      },
      participantByCedula: (cedula: string) => {
        const user = usuarios.find((u) => u.cedula_usuario === cedula);
        if (!user) return null;
        return {
          exists: true,
          nombre: user.nombre_usuario || undefined,
          discapacidad: user.discapacidad_usuario || undefined,
          genero: user.genero_usuario || undefined,
        };
      },
      finalizedRecordByActaRef: async (actaRef: string) => {
        return preResolvedFinalizedRecord?.acta_ref === actaRef
          ? preResolvedFinalizedRecord
          : null;
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 230_000);

    try {
      const result = await runImportPipeline(
        {
          fileBuffer,
          filePath: filePath || actaIdOrUrl || "",
          fileType,
          actaIdOrUrl: actaIdOrUrl || undefined,
          // Reusa el texto extraído en el preliminary parse para evitar
          // que el pipeline vuelva a parsear el PDF en Nivel 2/3/4.
          precomputedFullText: preliminaryFullText || undefined,
          preResolvedFinalizedRecord,
        },
        deps,
        controller.signal,
      );

      return NextResponse.json(result);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // TODO E4: registrar en ods_import_failures
    console.error("Error en importar acta:", error);
    return NextResponse.json(
      {
        error: "Error interno",
        success: false,
      },
      { status: 500 },
    );
  }
}
