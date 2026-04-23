import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

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

function normalizeInterpreteName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildInterpreteNameKey(value: string) {
  return normalizeInterpreteName(value).toLocaleLowerCase("es-CO");
}

function isInterpreteCatalogRow(value: unknown): value is InterpreteCatalogRow {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).nombre === "string"
  );
}

function sortInterpretes(rows: readonly InterpreteCatalogRow[]) {
  return [...rows].sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es-CO", {
      sensitivity: "base",
    })
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

    const { data: existingRows, error: existingError } = await admin
      .from("interpretes")
      .select("id, nombre")
      .ilike("nombre", normalizedName);

    if (existingError) {
      throw existingError;
    }

    const existingRow =
      (existingRows ?? [])
        .filter(isInterpreteCatalogRow)
        .find((row) => buildInterpreteNameKey(row.nombre) === normalizedNameKey) ??
      null;

    if (existingRow) {
      return NextResponse.json(existingRow, {
        status: 200,
      });
    }

    const { data: insertedRow, error: insertError } = await admin
      .from("interpretes")
      .insert({ nombre: normalizedName })
      .select("id, nombre")
      .single();

    if (insertError) {
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
