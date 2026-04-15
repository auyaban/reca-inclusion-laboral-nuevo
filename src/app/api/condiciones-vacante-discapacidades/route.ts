import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSheetsClient } from "@/lib/google/auth";
import {
  buildCondicionesVacanteCatalogs,
  CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE,
} from "@/lib/condicionesVacanteCatalogs";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_MASTER_ID;
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Falta GOOGLE_SHEETS_MASTER_ID" },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE,
    });

    const catalogs = buildCondicionesVacanteCatalogs(response.data.values ?? []);

    return NextResponse.json(catalogs, {
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/condiciones-vacante-discapacidades] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
