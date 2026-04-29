import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  deleteEmpresa,
  EmpresaServerError,
  getEmpresaDetail,
  updateEmpresa,
} from "@/lib/empresas/server";
import { deleteEmpresaSchema, updateEmpresaSchema } from "@/lib/empresas/schemas";

const ADMIN_ROLE = ["inclusion_empresas_admin"] as const;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function buildActor(context: Extract<Awaited<ReturnType<typeof requireAppRole>>, { ok: true }>["context"]) {
  return {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
  };
}

function jsonError(error: unknown, logLabel: string) {
  if (error instanceof EmpresaServerError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const empresa = await getEmpresaDetail({ id });
    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(empresa, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError(error, "[api/empresas/[id].get] failed");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = updateEmpresaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { id } = await context.params;
    const empresa = await updateEmpresa({
      id,
      input: parsed.data,
      actor: buildActor(authorization.context),
    });

    return NextResponse.json(empresa, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError(error, "[api/empresas/[id].put] failed");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const bodyText = await request.text();
    const parsed = deleteEmpresaSchema.safeParse(
      bodyText ? JSON.parse(bodyText) : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { id } = await context.params;
    const result = await deleteEmpresa({
      id,
      comentario: parsed.data.comentario,
      actor: buildActor(authorization.context),
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError(error, "[api/empresas/[id].delete] failed");
  }
}
