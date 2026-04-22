import { NextResponse } from "next/server";
import { saveSeguimientosDirtyStages } from "@/lib/seguimientosCase";
import { coerceSeguimientosFollowupsRecord } from "@/lib/seguimientosRuntime";
import {
  buildSeguimientosServerErrorPayload,
  getSeguimientosErrorStatusCode,
} from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";
import { seguimientosStagesSaveSchema } from "@/lib/validations/seguimientos";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function buildValidationErrorResponseBody(
  issues: readonly {
    path: readonly (string | number)[];
    message: string;
  }[]
) {
  const normalizedIssues = issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
  const firstIssue = normalizedIssues[0];

  return {
    status: "error" as const,
    message: firstIssue?.message ?? "Datos invalidos.",
    fieldPath: firstIssue?.path ?? null,
    issues: normalizedIssues,
  };
}

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
    const parsed = seguimientosStagesSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        buildValidationErrorResponseBody(parsed.error.issues),
        { status: 400 }
      );
    }

    const { caseId } = await context.params;
    const result = await saveSeguimientosDirtyStages({
      caseId,
      companyType: parsed.data.companyType,
      activeStageId: parsed.data.activeStageId,
      baseValues: parsed.data.baseValues,
      followupValuesByIndex: coerceSeguimientosFollowupsRecord(
        parsed.data.followupValuesByIndex
      ),
      dirtyStageIds: parsed.data.dirtyStageIds,
      overrideGrants: parsed.data.overrideGrants,
      supabase,
      userId: actor.userId,
      expectedCaseUpdatedAt: parsed.data.expectedCaseUpdatedAt ?? null,
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
    console.error("[api/seguimientos/case/[caseId]/stages/save] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudieron guardar los cambios de Seguimientos."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
