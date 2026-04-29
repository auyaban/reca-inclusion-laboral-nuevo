import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { calculateService } from "@/lib/ods/serviceCalculation";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const calculationInputSchema = {
  valor_base: (v: unknown) => typeof v === "number" && v >= 0,
  servicio_interpretacion: (v: unknown) => typeof v === "boolean",
  horas_interprete: (v: unknown) => typeof v === "number" && v >= 0,
  minutos_interprete: (v: unknown) => typeof v === "number" && v >= 0 && v < 60,
  modalidad_servicio: (v: unknown) =>
    typeof v === "string" &&
    ["Virtual", "Bogotá", "Fuera de Bogotá", "Todas"].includes(v),
};

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const body = await request.json();

    for (const [key, validator] of Object.entries(calculationInputSchema)) {
      if (!validator((body as Record<string, unknown>)[key])) {
        return NextResponse.json(
          { error: `Campo invalido: ${key}` },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
    }

    const result = calculateService(body as Parameters<typeof calculateService>[0]);
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[api/ods/calcular.post] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
