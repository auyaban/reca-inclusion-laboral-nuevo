import { NextResponse } from "next/server";
import { exportSeguimientosPdf } from "@/lib/seguimientosCase";
import { buildSeguimientosServerErrorPayload } from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";
import { seguimientosPdfExportSchema } from "@/lib/validations/seguimientos";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const supabase = await createClient();
    const actor = await resolveSeguimientosRouteActor(request, supabase);
    if (!actor.ok) {
      return actor.response;
    }

    const body = await request.json();
    const parsed = seguimientosPdfExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Datos invalidos.",
        },
        { status: 400 }
      );
    }

    const { caseId } = await context.params;
    const result = await exportSeguimientosPdf({
      caseId,
      optionId: parsed.data.optionId,
      supabase,
      userId: actor.userId,
    });

    return NextResponse.json(result, {
      status: result.status === "error" ? 400 : 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/seguimientos/case/[caseId]/pdf/export] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo exportar el PDF de Seguimientos."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
