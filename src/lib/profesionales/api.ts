import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { ProfesionalServerError } from "@/lib/profesionales/server";

export const PROFESIONALES_ADMIN_ROLE = ["inclusion_empresas_admin"] as const;

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export function buildProfesionalActor(
  context: Extract<Awaited<ReturnType<typeof requireAppRole>>, { ok: true }>["context"]
) {
  return {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
    usuarioLogin: context.profile.usuarioLogin,
  };
}

export function parseProfessionalId(value: string) {
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ProfesionalServerError(400, "Id de profesional inválido.");
  }
  return id;
}

export function jsonProfesionalError(error: unknown, logLabel: string) {
  if (error instanceof ProfesionalServerError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

  if (
    error instanceof Error &&
    error.message === "Solo aaron_vercel puede asignar o retirar Admin Inclusión."
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}
