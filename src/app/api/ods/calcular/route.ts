import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { calculateService } from "@/lib/ods/serviceCalculation";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const body = await request.json();

    try {
      const result = calculateService(body as Parameters<typeof calculateService>[0]);
      return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch (err) {
      if (err instanceof Error) {
        return NextResponse.json(
          { error: err.message },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("[api/ods/calcular.post] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
