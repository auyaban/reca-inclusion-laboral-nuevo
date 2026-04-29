import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  deleteProfesional,
  getProfesionalDetail,
  updateProfesional,
} from "@/lib/profesionales/server";
import {
  deleteProfesionalSchema,
  updateProfesionalSchema,
} from "@/lib/profesionales/schemas";
import {
  buildProfesionalActor,
  jsonProfesionalError,
  NO_STORE_HEADERS,
  parseProfessionalId,
  PROFESIONALES_ADMIN_ROLE,
} from "@/lib/profesionales/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const profesional = await getProfesionalDetail({
      id: parseProfessionalId(id),
      includeDeleted: true,
    });

    if (!profesional) {
      return NextResponse.json(
        { error: "Profesional no encontrado." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(profesional, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id].get] failed"
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = updateProfesionalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { id } = await context.params;
    const profesional = await updateProfesional({
      id: parseProfessionalId(id),
      input: parsed.data,
      actor: buildProfesionalActor(authorization.context),
    });

    return NextResponse.json(profesional, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id].put] failed"
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const bodyText = await request.text();
    const parsed = deleteProfesionalSchema.safeParse(
      bodyText ? JSON.parse(bodyText) : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { id } = await context.params;
    const result = await deleteProfesional({
      id: parseProfessionalId(id),
      comentario: parsed.data.comentario,
      actor: buildProfesionalActor(authorization.context),
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id].delete] failed"
    );
  }
}
