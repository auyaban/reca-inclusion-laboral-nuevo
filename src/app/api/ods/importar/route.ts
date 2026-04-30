import { NextRequest, NextResponse } from "next/server";
import { runImportPipeline, readPdfText, unwrapPayloadNormalized, type CatalogDependencies } from "@/lib/ods/import/pipeline";
import { createClient } from "@/lib/supabase/server";
import { requireAppRole } from "@/lib/auth/roles";
import { tryReadRecaMetadata } from "@/lib/ods/import/parsers/pdfMetadata";
import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import type { ActaParseResult } from "@/lib/ods/import/parsers";

const ODS_ROLE = ["ods_operador"] as const;

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

export async function POST(request: NextRequest) {
  // TODO E4: registrar fallos en ods_import_failures table
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) return authorization.response;

    const supabase = await createClient();

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

    // EG-1: parse preliminar (Nivel 1 + Nivel 2 ACTA ID lookup) antes de cargar catalogos.
    let preliminaryParseResult: ActaParseResult | undefined;
    let preliminaryFullText = "";

    if (file && fileBuffer) {
      // Try Nivel 1
      if (fileType === "pdf") {
        try {
          const recaMetadata = await tryReadRecaMetadata(fileBuffer);
          if (recaMetadata) {
            preliminaryParseResult = {
              file_path: filePath,
              source_type: "local_pdf",
              warnings: [],
              ...(recaMetadata as Record<string, unknown>),
            } as ActaParseResult;
          }
        } catch {}

        // Try Nivel 2: extract ACTA ID + lookup
        if (!preliminaryParseResult) {
          try {
            preliminaryFullText = await readPdfText(fileBuffer);
            const actaRef = extractPdfActaId(preliminaryFullText);
            if (actaRef) {
              const { data } = await supabase
                .from("formatos_finalizados_il")
                .select("payload_normalized")
                .eq("acta_ref", actaRef)
                .maybeSingle();
              if (data?.payload_normalized) {
                // El payload viene anidado en parsed_raw; unwrap antes de
                // extraer hints (NIT, fecha, cedulas) para los catalog queries.
                const payload = unwrapPayloadNormalized(
                  data.payload_normalized as Record<string, unknown>
                );
                preliminaryParseResult = {
                  ...(payload as Record<string, unknown>),
                  file_path: filePath,
                  source_type: "local_pdf",
                  acta_ref: actaRef,
                  warnings: [],
                } as ActaParseResult;
              }
            }
          } catch {}
        }
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
      .select("nit_empresa, nombre_empresa, ciudad_empresa, sede_empresa, zona_empresa, caja_compensacion, correo_profesional, profesional_asignado, asesor")
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
        : Promise.resolve({ data: [] as EmpresaRow[] });

    // EL-3: filtro vigencia con fecha del acta en SQL.
    // Nota: la tabla `tarifas` NO tiene columna `deleted_at` (a diferencia de empresas/profesionales).
    const tarifasPromise = supabase.from("tarifas")
      .select("codigo_servicio, referencia_servicio, descripcion_servicio, modalidad_servicio, valor_base, vigente_desde, vigente_hasta")
      .or(`vigente_desde.is.null,vigente_desde.lte.${fechaForVigencia}`)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${fechaForVigencia}`);

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

    // Fuzzy NIT fallback: si no hay match exacto, query secundaria solo de nit_empresa
    if (detectedNitDigits && empresas.length === 0) {
      const nitsRes = await supabase.from("empresas").select("nit_empresa").is("deleted_at", null);
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
        const { data } = await supabase
          .from("formatos_finalizados_il")
          .select("payload_normalized")
          .eq("acta_ref", actaRef)
          .maybeSingle();
        return data as { payload_normalized: unknown } | null;
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
        },
        deps,
        controller.signal,
      );

      // Avoid unused var lint when preliminary text was computed but not consumed
      void preliminaryFullText;

      return NextResponse.json(result);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // TODO E4: registrar en ods_import_failures
    console.error("Error en importar acta:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
        success: false,
      },
      { status: 500 },
    );
  }
}
