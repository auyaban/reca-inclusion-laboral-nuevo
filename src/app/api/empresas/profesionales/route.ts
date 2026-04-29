import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  createProfesional,
  listProfesionales,
  ProfesionalServerError,
} from "@/lib/profesionales/server";
import {
  createProfesionalSchema,
  parseProfesionalListParams,
} from "@/lib/profesionales/schemas";

const ADMIN_ROLE = ["inclusion_empresas_admin"] as const;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function buildActor(
  context: Extract<Awaited<ReturnType<typeof requireAppRole>>, { ok: true }>["context"]
) {
  return {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
    usuarioLogin: context.profile.usuarioLogin,
  };
}

function jsonError(error: unknown, logLabel: string) {
  if (error instanceof ProfesionalServerError) {
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

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const params = parseProfesionalListParams(new URL(request.url).searchParams);
    const result = await listProfesionales({ params });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError(error, "[api/empresas/profesionales.get] failed");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = createProfesionalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await createProfesional({
      input: parsed.data,
      actor: buildActor(authorization.context),
    });

    return NextResponse.json(result, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return jsonError(error, "[api/empresas/profesionales.post] failed");
  }
}
