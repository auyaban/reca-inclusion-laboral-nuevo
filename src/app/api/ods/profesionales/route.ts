import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function jsonError(error: unknown, logLabel: string) {
  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    const admin = createSupabaseAdminClient();

    let profQuery = admin
      .from("profesionales")
      .select("id, nombre_profesional, programa_servicio")
      .is("deleted_at", null);

    let intQuery = admin
      .from("interpretes")
      .select("id, nombre")
      .is("deleted_at", null);

    if (q && q.trim().length >= 2) {
      const pattern = `%${q.trim()}%`;
      profQuery = profQuery.ilike("nombre_profesional", pattern);
      intQuery = intQuery.ilike("nombre", pattern);
    }

    const [profesionalesRes, interpretesRes] = await Promise.all([
      profQuery.order("nombre_profesional", { ascending: true }).limit(20),
      intQuery.order("nombre", { ascending: true }).limit(20),
    ]);

    if (profesionalesRes.error) throw profesionalesRes.error;
    if (interpretesRes.error) throw interpretesRes.error;

    const profesionales = (profesionalesRes.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre_profesional,
      programa: p.programa_servicio,
      source: "profesionales" as const,
    }));

    const interpretes = (interpretesRes.data ?? []).map((i) => ({
      id: i.id,
      nombre: i.nombre,
      programa: null,
      source: "interpretes" as const,
    }));

    return NextResponse.json(
      { items: [...profesionales, ...interpretes] },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return jsonError(error, "[api/ods/profesionales.get] failed");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const body = await request.json();
    const { nombre, programa } = body as { nombre?: string; programa?: string };

    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const admin = createSupabaseAdminClient();
    const programaLower = (programa ?? "").toLowerCase();
    const esInterprete = programaLower.includes("interp");

    if (esInterprete) {
      const { data, error } = await admin
        .from("interpretes")
        .insert({ nombre: nombre.trim() })
        .select("id, nombre")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "No se pudo crear el intérprete." },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      return NextResponse.json(
        { id: data.id, nombre: data.nombre, source: "interpretes" as const },
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    const { data, error } = await admin
      .from("profesionales")
      .insert({
        nombre_profesional: nombre.trim(),
        programa_servicio: programaLower.includes("inclus") && programaLower.includes("labor")
          ? "Inclusion Laboral"
          : programa?.trim() ?? null,
      })
      .select("id, nombre_profesional, programa_servicio")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "No se pudo crear el profesional." },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { id: data.id, nombre: data.nombre_profesional, programa: data.programa_servicio, source: "profesionales" as const },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return jsonError(error, "[api/ods/profesionales.post] failed");
  }
}
