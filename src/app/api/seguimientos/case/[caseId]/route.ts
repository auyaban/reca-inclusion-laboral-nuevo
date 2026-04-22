import { NextResponse } from "next/server";
import { getSeguimientosCaseHydrationByCaseId } from "@/lib/seguimientosCase";
import { buildSeguimientosServerErrorPayload } from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET(
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
    const hydration = await getSeguimientosCaseHydrationByCaseId({
      caseId,
      supabase,
      userId: actor.userId,
    });

    return NextResponse.json(
      { status: "ready", hydration },
      { status: 200, headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[api/seguimientos/case/[caseId]] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo reconstruir el caso solicitado."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
