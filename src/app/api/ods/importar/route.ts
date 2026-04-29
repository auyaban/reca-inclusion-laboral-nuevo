import { NextRequest, NextResponse } from "next/server";
import { runImportPipeline, type CatalogDependencies } from "@/lib/ods/import/pipeline";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // TODO E4: registrar fallos en ods_import_failures table
  try {
    const supabase = await createClient();

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // TODO E4: verificar rol ods_operador
    // const { data: roles } = await supabase.from("profesional_roles").select("role").eq("profesional_id", ...);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const actaIdOrUrl = formData.get("actaIdOrUrl") as string | null;

    if (!file && !actaIdOrUrl) {
      return NextResponse.json(
        { error: "Debe proporcionar un archivo o un ACTA ID/URL" },
        { status: 400 },
      );
    }

    // Cargar catalogos en paralelo (C4)
    const [tarifasRes, empresasRes, profesionalesRes, interpretesRes, usuariosRes] = await Promise.all([
      supabase.from("tarifas").select("codigo_servicio, referencia_servicio, descripcion_servicio, modalidad_servicio, valor_base, vigente_desde, vigente_hasta"),
      supabase.from("empresas").select("nit_empresa, nombre_empresa, ciudad_empresa, sede_empresa, zona_empresa, caja_compensacion, correo_profesional, profesional_asignado, asesor"),
      supabase.from("profesionales").select("id, nombre_profesional"),
      supabase.from("interpretes").select("id, nombre_interprete"),
      supabase.from("usuarios_reca").select("cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario"),
    ]);

    const tarifas = (tarifasRes.data || []).map((t) => {
      const vigenteDesde = t.vigente_desde ? new Date(t.vigente_desde) : new Date("2000-01-01");
      const vigenteHasta = t.vigente_hasta ? new Date(t.vigente_hasta) : new Date("2099-12-31");
      const now = new Date();
      return {
        codigo_servicio: t.codigo_servicio,
        referencia_servicio: t.referencia_servicio,
        descripcion_servicio: t.descripcion_servicio,
        modalidad_servicio: t.modalidad_servicio,
        valor_base: Number(t.valor_base ?? 0),
        vigente: now >= vigenteDesde && now <= vigenteHasta,
      };
    }).filter((t) => t.vigente);

    const empresas = empresasRes.data || [];
    const profesionales = profesionalesRes.data || [];
    const interpretes = interpretesRes.data || [];
    const usuarios = usuariosRes.data || [];

    const deps: CatalogDependencies = {
      tarifas,
      companyByNit: (nit: string) => {
        const cleanNit = nit.replace(/[^0-9]/g, "");
        return empresas.find((e) => e.nit_empresa?.replace(/[^0-9]/g, "") === cleanNit) || null;
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
          i.nombre_interprete?.toLowerCase().includes(normalized) ||
          normalized.includes(i.nombre_interprete?.toLowerCase() || ""),
        );
        if (intMatch) {
          return {
            nombre: intMatch.nombre_interprete || "",
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
    };

    let fileBuffer: ArrayBuffer | undefined;
    let filePath = "";
    let fileType: "pdf" | "excel" | undefined;

    if (file) {
      fileBuffer = await file.arrayBuffer();
      filePath = file.name;
      fileType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "excel";
    }

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
