import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppRole } from "@/lib/auth/roles";
import { EmpresaLifecycleError } from "@/lib/empresas/lifecycle-server";
import { EmpresaServerError } from "@/lib/empresas/server";

export const EMPRESA_OPERATIONAL_ROLES = [
  "inclusion_empresas_admin",
  "inclusion_empresas_profesional",
] as const;

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export type EmpresaLifecycleRouteContext = {
  params: Promise<{ id: string }>;
};

type AuthorizedContext = Extract<
  Awaited<ReturnType<typeof requireAppRole>>,
  { ok: true }
>["context"];

export function buildEmpresaLifecycleActor(context: AuthorizedContext) {
  return {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
  };
}

export async function parseEmpresaRouteId(context: EmpresaLifecycleRouteContext) {
  const { id } = await context.params;
  const parsed = z.string().min(1).safeParse(id);

  if (!parsed.success) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
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
    throw new EmpresaServerError(400, "Payload inválido.");
  }
}

export function jsonValidationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "Payload inválido.", fieldErrors: error.flatten().fieldErrors },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}

export function jsonEmpresaLifecycleError(error: unknown, logLabel: string) {
  if (error instanceof EmpresaLifecycleError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

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
