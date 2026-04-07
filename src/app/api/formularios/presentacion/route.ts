import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa, ...formData } = body;

    const supabase = await createClient();

    // Verificar sesión activa
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Construir payload normalizado para formatos_finalizados_il
    const now = new Date();
    const payload_raw = {
      schema_version: 1,
      form_id: "presentacion_programa",
      cache_snapshot: {
        section_1: {
          tipo_visita: formData.tipo_visita,
          fecha_visita: formData.fecha_visita,
          modalidad: formData.modalidad,
          nit_empresa: formData.nit_empresa,
          nombre_empresa: empresa.nombre_empresa,
          direccion_empresa: empresa.direccion_empresa,
          correo_1: empresa.correo_1,
          contacto_empresa: empresa.contacto_empresa,
          caja_compensacion: empresa.caja_compensacion,
          profesional_asignado: empresa.profesional_asignado,
          asesor: empresa.asesor,
          ciudad_empresa: empresa.ciudad_empresa,
          telefono_empresa: empresa.telefono_empresa,
          cargo: empresa.cargo,
          sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa,
          correo_profesional: empresa.correo_profesional,
          correo_asesor: empresa.correo_asesor,
        },
        section_3_item_8: formData.motivacion,
        section_4: { acuerdos_observaciones: formData.acuerdos_observaciones },
        section_5: formData.asistentes,
      },
      metadata: {
        generated_at: now.toISOString(),
        payload_source: "form_web",
      },
    };

    const payload_normalized = {
      schema_version: 1,
      form_id: "presentacion_programa",
      attachment: {
        document_kind:
          formData.tipo_visita === "Reactivación"
            ? "program_reactivation"
            : "program_presentation",
        document_label:
          formData.tipo_visita === "Reactivación"
            ? "Reactivación del programa"
            : "Presentación del programa",
        is_ods_candidate: true,
      },
      parsed_raw: {
        nit_empresa: formData.nit_empresa,
        nombre_empresa: empresa.nombre_empresa,
        fecha_servicio: formData.fecha_visita,
        nombre_profesional: empresa.profesional_asignado ?? "",
        modalidad_servicio: formData.modalidad,
        asistentes: formData.asistentes,
        ciudad_empresa: empresa.ciudad_empresa ?? "",
        sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
        caja_compensacion: empresa.caja_compensacion ?? "",
        asesor_empresa: empresa.asesor ?? "",
        motivacion: formData.motivacion,
        acuerdos_observaciones: formData.acuerdos_observaciones,
      },
    };

    const { error } = await supabase.from("formatos_finalizados_il").insert({
      usuario_login: session.user.email,
      nombre_usuario: session.user.email?.split("@")[0] ?? "",
      nombre_formato: `${formData.tipo_visita} del Programa`,
      nombre_empresa: empresa.nombre_empresa,
      finalizado_at_colombia: new Date(
        now.toLocaleString("en-US", { timeZone: "America/Bogota" })
      ).toISOString().replace("T", " ").split(".")[0],
      finalizado_at_iso: now.toISOString(),
      payload_raw,
      payload_normalized,
      payload_schema_version: 1,
      payload_source: "form_web",
      payload_generated_at: now.toISOString(),
    });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Error al guardar en base de datos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
