import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppRole } from "@/lib/auth/roles";
import { ProyeccionServerError } from "@/lib/proyecciones/server";

export const PROYECCIONES_OPERATIONAL_ROLES = [
  "inclusion_empresas_admin",
  "inclusion_empresas_profesional",
] as const;

export const PROYECCIONES_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export function withProyeccionesNoStore(response: Response) {
  response.headers.set("Cache-Control", PROYECCIONES_NO_STORE_HEADERS["Cache-Control"]);
  return response;
}

type AuthorizedContext = Extract<
  Awaited<ReturnType<typeof requireAppRole>>,
  { ok: true }
>["context"];

export type ProyeccionRouteContext = {
  params: Promise<{ id: string }>;
};

export function buildProyeccionActor(context: AuthorizedContext) {
  return {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
  };
}

export async function parseProyeccionRouteId(context: ProyeccionRouteContext) {
  const { id } = await context.params;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    throw new ProyeccionServerError({
      status: 404,
      code: "not_found",
      message: "Proyeccion no encontrada.",
    });
  }

  return parsed.data;
}

export async function readJsonBody(request: Request) {
  const bodyText = await request.text();
  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new ProyeccionServerError({
      status: 400,
      code: "invalid_payload",
      message: "Payload invalido.",
    });
  }
}

export function jsonProyeccionValidationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "Payload invalido.", fieldErrors: error.flatten().fieldErrors },
    { status: 400, headers: PROYECCIONES_NO_STORE_HEADERS }
  );
}

export function jsonProyeccionError(error: unknown, logLabel: string) {
  if (error instanceof ProyeccionServerError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: PROYECCIONES_NO_STORE_HEADERS }
    );
  }

  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: PROYECCIONES_NO_STORE_HEADERS }
  );
}
