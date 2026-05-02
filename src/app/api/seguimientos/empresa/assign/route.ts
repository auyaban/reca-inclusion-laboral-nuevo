import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import {
  getUsuarioRecaByCedula,
  upsertUsuariosRecaRows,
} from "@/lib/usuariosRecaServer";
import { normalizeCedulaUsuario } from "@/lib/usuariosReca";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  cedula: z.string().trim().min(1, "La cédula es obligatoria."),
  nit_empresa: z.string().trim().min(1, "El NIT de empresa es obligatorio."),
});

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function PUT(request: Request) {
  try {
    const actor = await resolveSeguimientosRouteActor(request, {});
    if (!actor.ok) {
      return actor.response;
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
        },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const normalizedCedula = normalizeCedulaUsuario(parsed.data.cedula);
    const existingUser = await getUsuarioRecaByCedula(normalizedCedula);
    if (!existingUser) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "No se encontró el vinculado en usuarios_reca. Créalo primero desde el registro de oferentes.",
        },
        { status: 404, headers: CACHE_HEADERS }
      );
    }

    const hasEmpresa =
      typeof existingUser.empresa_nit === "string" &&
      existingUser.empresa_nit.trim().length > 0;

    if (hasEmpresa) {
      return NextResponse.json(
        {
          status: "error",
          message: "El vinculado ya tiene una empresa asignada.",
        },
        { status: 409, headers: CACHE_HEADERS }
      );
    }

    // Resolve empresa name server-side to prevent client-supplied
    // nombre_empresa from diverging from the empresas table.
    const supabase = await createClient();
    const { data: empresaRow, error: empresaError } = await supabase
      .from("empresas")
      .select("nombre_empresa")
      .eq("nit_empresa", parsed.data.nit_empresa)
      .is("deleted_at", null)
      .maybeSingle();

    if (empresaError) {
      console.error(
        "[api/seguimientos/empresa/assign] failed to resolve empresa by NIT",
        empresaError
      );
      return NextResponse.json(
        {
          status: "error",
          message: "No se pudo asignar la empresa. Intenta de nuevo.",
        },
        { status: 500, headers: CACHE_HEADERS }
      );
    }

    if (!empresaRow) {
      return NextResponse.json(
        {
          status: "error",
          message: "Empresa no encontrada. Verifica el NIT.",
        },
        { status: 422, headers: CACHE_HEADERS }
      );
    }

    // Race condition: check-then-write pattern is acceptable for human-paced
    // single-operator-per-cedula usage. No DB constraint guards concurrent
    // assignments of the same cedula.

    await upsertUsuariosRecaRows([
      {
        cedula_usuario: normalizedCedula,
        empresa_nit: parsed.data.nit_empresa,
        empresa_nombre: empresaRow.nombre_empresa ?? "",
      },
    ]);

    return NextResponse.json(
      { status: "assigned" },
      { status: 200, headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[api/seguimientos/empresa/assign] failed", error);
    return NextResponse.json(
      {
        status: "error",
        message: "No se pudo asignar la empresa. Intenta de nuevo.",
      },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
