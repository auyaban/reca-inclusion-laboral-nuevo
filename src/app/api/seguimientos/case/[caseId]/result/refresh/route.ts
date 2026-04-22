import { NextResponse } from "next/server";
import { refreshSeguimientosResultSummary } from "@/lib/seguimientosCase";
import { buildSeguimientosServerErrorPayload } from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";

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

    const { caseId } = await context.params;
    const result = await refreshSeguimientosResultSummary({
      caseId,
      supabase,
      userId: actor.userId,
    });

    return NextResponse.json(result, {
      status: result.status === "ready" ? 200 : 400,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error(
      "[api/seguimientos/case/[caseId]/result/refresh] failed",
      error
    );
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo actualizar el consolidado de Seguimientos."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
