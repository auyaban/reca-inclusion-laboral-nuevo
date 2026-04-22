import { NextResponse } from "next/server";
import { saveSeguimientosBaseStage } from "@/lib/seguimientosCase";
import {
  buildSeguimientosServerErrorPayload,
  getSeguimientosErrorStatusCode,
} from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";
import { seguimientosBaseStageSaveSchema } from "@/lib/validations/seguimientos";

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
    const parsed = seguimientosBaseStageSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        buildValidationErrorResponseBody(parsed.error.issues),
        { status: 400 }
      );
    }

    const { caseId } = await context.params;
    const result = await saveSeguimientosBaseStage({
      caseId,
      baseValues: parsed.data.baseValues,
      supabase,
      userId: actor.userId,
      overrideGrant: parsed.data.overrideGrant ?? null,
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
    console.error("[api/seguimientos/case/[caseId]/stage/base] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo guardar la ficha inicial de Seguimientos."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
