import { NextResponse } from "next/server";
import { grantSeguimientosStageOverride } from "@/lib/seguimientosCase";
import {
  buildSeguimientosServerErrorPayload,
  getSeguimientosErrorStatusCode,
} from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";
import { seguimientosStageOverrideSchema } from "@/lib/validations/seguimientos";

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
    const parsed = seguimientosStageOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Datos invalidos.",
        },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const { caseId } = await context.params;
    const result = await grantSeguimientosStageOverride({
      caseId,
      stageIds: parsed.data.stageIds,
      supabase,
      userId: actor.userId,
    });

    return NextResponse.json(result, {
      status:
        result.status === "error"
          ? result.code
            ? getSeguimientosErrorStatusCode(result.code)
            : 400
          : 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/seguimientos/case/[caseId]/stages/override] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo autorizar el override del seguimiento."
    );
    return NextResponse.json(body, {
      status: statusCode,
      headers: CACHE_HEADERS,
    });
  }
}
