import { NextResponse } from "next/server";
import { z } from "zod";
import { EMPRESA_SEARCH_FIELDS } from "@/lib/empresa";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";
import type { Empresa } from "@/lib/store/empresaStore";
import { normalizeCedulaUsuario } from "@/lib/usuariosReca";
import {
  getUsuarioRecaByCedula,
  upsertUsuariosRecaRows,
} from "@/lib/usuariosRecaServer";

const bodySchema = z.object({
  cedula: z.string().trim().min(1, "La cedula es obligatoria."),
  nit_empresa: z.string().trim().min(1, "El NIT de empresa es obligatorio."),
  empresa_nombre: z.string().optional(),
});

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function findActiveEmpresasByNit(
  supabase: ServerSupabaseClient,
  nitEmpresa: string
) {
  const { data, error } = await supabase
    .from("empresas")
    .select(EMPRESA_SEARCH_FIELDS)
    .eq("nit_empresa", nitEmpresa)
    .is("deleted_at", null)
    .order("nombre_empresa", { ascending: true })
    .limit(1000);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Empresa[]).slice();
}

function resolveEmpresaSelection(options: {
  empresas: readonly Empresa[];
  empresaNombre?: string;
}) {
  const empresaNombre = options.empresaNombre?.trim() ?? "";
  if (empresaNombre) {
    const matches = options.empresas.filter(
      (empresa) => empresa.nombre_empresa === empresaNombre
    );

    return matches.length === 1 ? matches[0] : null;
  }

  return options.empresas.length === 1 ? options.empresas[0] : null;
}

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
          message: parsed.error.issues[0]?.message ?? "Datos invalidos.",
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

    const supabase = await createClient();
    let requestedEmpresas: Empresa[];
    try {
      requestedEmpresas = await findActiveEmpresasByNit(
        supabase,
        parsed.data.nit_empresa
      );
    } catch (empresaError) {
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

    const selectedEmpresa = resolveEmpresaSelection({
      empresas: requestedEmpresas,
      empresaNombre: parsed.data.empresa_nombre,
    });

    if (!selectedEmpresa) {
      const message = parsed.data.empresa_nombre?.trim()
        ? "La empresa seleccionada no pertenece al catalogo activo del NIT."
        : requestedEmpresas.length > 1
          ? "Selecciona una empresa valida para ese NIT."
          : "Empresa no encontrada. Verifica el NIT.";

      return NextResponse.json(
        {
          status: "error",
          message,
        },
        { status: 422, headers: CACHE_HEADERS }
      );
    }

    const existingNit = String(existingUser.empresa_nit ?? "").trim();
    if (existingNit && existingNit !== parsed.data.nit_empresa) {
      let existingEmpresas: Empresa[] = [];
      try {
        existingEmpresas = await findActiveEmpresasByNit(supabase, existingNit);
      } catch (empresaError) {
        console.error(
          "[api/seguimientos/empresa/assign] failed to resolve existing empresa by NIT",
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

      if (existingEmpresas.length > 0) {
        return NextResponse.json(
          {
            status: "error",
            message: "El vinculado ya tiene una empresa asignada.",
          },
          { status: 409, headers: CACHE_HEADERS }
        );
      }
    }

    // Race condition: check-then-write pattern is acceptable for human-paced
    // single-operator-per-cedula usage. No DB constraint guards concurrent
    // assignments of the same cedula.
    await upsertUsuariosRecaRows([
      {
        cedula_usuario: normalizedCedula,
        empresa_nit: parsed.data.nit_empresa,
        empresa_nombre: selectedEmpresa.nombre_empresa ?? "",
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
