import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import {
  buildInterpreteNameKey,
  normalizeInterpreteName,
  sortInterpretes,
} from "@/lib/interpretesCatalog";
import { enforceInterpretesCatalogRateLimit } from "@/lib/security/interpretesCatalogRateLimit";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
};

const createInterpreteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del interprete es obligatorio."),
});

type InterpreteCatalogRow = {
  id: string;
  nombre: string;
};

type SupabaseLikeError = {
  code?: string;
};

function isInterpreteCatalogRow(value: unknown): value is InterpreteCatalogRow {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).nombre === "string"
  );
}

async function findInterpreteByNameKey(
  admin: ReturnType<typeof createAdminClient>,
  normalizedNameKey: string
) {
  const { data, error } = await admin
    .from("interpretes")
    .select("id, nombre")
    .eq("nombre_key", normalizedNameKey);

  if (error) {
    throw error;
  }

  return (
    (data ?? [])
      .filter(isInterpreteCatalogRow)
      .find((row) => buildInterpreteNameKey(row.nombre) === normalizedNameKey) ??
    null
  );
}

function isUniqueViolation(error: unknown): error is SupabaseLikeError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in (error as Record<string, unknown>) &&
      (error as SupabaseLikeError).code === "23505"
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return user;
}

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("interpretes")
      .select("id, nombre")
      .order("nombre");

    if (error) {
      throw error;
    }

    const rows = sortInterpretes(
      (data ?? []).filter(isInterpreteCatalogRow).filter((row) => row.nombre.trim())
    );

    return NextResponse.json(rows, {
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/interpretes.get] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const rateLimitDecision = await enforceInterpretesCatalogRateLimit(
      request.headers
    );
    if (!rateLimitDecision.allowed) {
      return NextResponse.json(
        { error: rateLimitDecision.error },
        {
          status: rateLimitDecision.status,
          headers: {
            "Retry-After": String(rateLimitDecision.retryAfterSeconds),
          },
        }
      );
    }

    const parsedBody = createInterpreteSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      const issue = parsedBody.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeInterpreteName(parsedBody.data.nombre);
    const normalizedNameKey = buildInterpreteNameKey(normalizedName);
    const admin = createAdminClient();
    const existingRow = await findInterpreteByNameKey(admin, normalizedNameKey);

    if (existingRow) {
      return NextResponse.json(existingRow, {
        status: 200,
      });
    }

    const { data: insertedRow, error: insertError } = await admin
      .from("interpretes")
      .insert({ nombre: normalizedName, nombre_key: normalizedNameKey })
      .select("id, nombre")
      .single();

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        const recoveredRow = await findInterpreteByNameKey(admin, normalizedNameKey);
        if (recoveredRow) {
          return NextResponse.json(recoveredRow, {
            status: 200,
          });
        }
      }

      throw insertError;
    }

    if (!isInterpreteCatalogRow(insertedRow)) {
      throw new Error("No se pudo validar el interprete creado.");
    }

    return NextResponse.json(insertedRow, {
      status: 201,
    });
  } catch (error) {
    console.error("[api/interpretes.post] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
