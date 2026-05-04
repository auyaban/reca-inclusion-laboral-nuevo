import type { OdsPayload } from "@/lib/ods/schemas";
import {
  isCanonicalDiscapacidad,
  isCanonicalGenero,
} from "@/lib/ods/seccion4CatalogValidation";

type OdsUsuarioFields = Pick<
  OdsPayload,
  "cedula_usuario" | "discapacidad_usuario" | "genero_usuario"
>;

type UsuarioRecaRow = {
  cedula_usuario: string;
  discapacidad_usuario: string | null;
  genero_usuario: string | null;
};

type SelectChain = {
  select: (columns: string) => {
    in: (column: string, values: string[]) => {
      limit: (count: number) => PromiseLike<{ data: UsuarioRecaRow[] | null; error: unknown }>;
    };
  };
};

type UpdateChain = {
  update: (patch: Partial<Pick<UsuarioRecaRow, "discapacidad_usuario" | "genero_usuario">>) => {
    eq: (column: string, value: string) => PromiseLike<{ data?: unknown; error: unknown }>;
  };
};

export type UsuariosRecaCorrectionAdmin = {
  from: (table: "usuarios_reca") => SelectChain & UpdateChain;
};

export type UsuariosRecaCorrectionResult = {
  scanned: number;
  updated: number;
  errors: string[];
};

const USUARIOS_RECA_CORRECTION_LIMIT = 500;

function splitList(value: string | null | undefined): string[] {
  return String(value || "")
    .split(";")
    .map((item) => item.trim());
}

function normalizeCedula(value: string): string {
  return value.replace(/\D/g, "");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "unknown");
  }
  return String(error || "unknown");
}

export async function correctUsuariosRecaCatalogFields({
  admin,
  ods,
}: {
  admin: unknown;
  ods: OdsUsuarioFields;
}): Promise<UsuariosRecaCorrectionResult> {
  const client = admin as UsuariosRecaCorrectionAdmin;
  const cedulas = splitList(ods.cedula_usuario).map(normalizeCedula);
  const discapacidades = splitList(ods.discapacidad_usuario);
  const generos = splitList(ods.genero_usuario);
  const uniqueCedulas = [...new Set(cedulas.filter(Boolean))];

  if (uniqueCedulas.length === 0) {
    return { scanned: 0, updated: 0, errors: [] };
  }

  const { data, error } = await client
    .from("usuarios_reca")
    .select("cedula_usuario, discapacidad_usuario, genero_usuario")
    .in("cedula_usuario", uniqueCedulas)
    .limit(USUARIOS_RECA_CORRECTION_LIMIT);

  if (error) {
    console.warn("[ods/usuarios-reca-corrections] lookup_failed", {
      error: errorMessage(error),
    });
    return { scanned: 0, updated: 0, errors: ["lookup_failed"] };
  }

  const rowsByCedula = new Map((data || []).map((row) => [normalizeCedula(row.cedula_usuario), row]));
  let updated = 0;
  const errors: string[] = [];

  for (const [index, cedula] of cedulas.entries()) {
    if (!cedula) continue;
    const row = rowsByCedula.get(cedula);
    if (!row) continue;

    const finalDiscapacidad = discapacidades[index] || "";
    const finalGenero = generos[index] || "";
    const patch: Partial<Pick<UsuarioRecaRow, "discapacidad_usuario" | "genero_usuario">> = {};

    if (
      !isCanonicalDiscapacidad(row.discapacidad_usuario) &&
      isCanonicalDiscapacidad(finalDiscapacidad)
    ) {
      patch.discapacidad_usuario = finalDiscapacidad;
    }

    if (!isCanonicalGenero(row.genero_usuario) && isCanonicalGenero(finalGenero)) {
      patch.genero_usuario = finalGenero;
    }

    if (Object.keys(patch).length === 0) continue;

    const updateResult = await client
      .from("usuarios_reca")
      .update(patch)
      .eq("cedula_usuario", cedula);

    if (updateResult.error) {
      errors.push("update_failed");
      console.warn("[ods/usuarios-reca-corrections] update_failed", {
        error: errorMessage(updateResult.error),
      });
      continue;
    }

    updated += 1;
  }

  return { scanned: data?.length ?? 0, updated, errors };
}
