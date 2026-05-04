import { NextResponse } from "next/server";
import { z } from "zod";
import { bootstrapSeguimientosCase } from "@/lib/seguimientosCase";
import {
  buildSeguimientosServerErrorPayload,
  getSeguimientosErrorStatusCode,
} from "@/lib/seguimientosServerErrors";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  cedula: z.string().trim().min(1, "La cédula es obligatoria."),
  companyTypeOverride: z
    .enum(["compensar", "no_compensar"])
    .optional(),
});

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const actor = await resolveSeguimientosRouteActor(request, supabase);
    if (!actor.ok) {
      return actor.response;
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
        },
        { status: 400 }
      );
    }

    const result = await bootstrapSeguimientosCase({
      cedula: parsed.data.cedula,
      companyTypeOverride: parsed.data.companyTypeOverride,
      supabase,
      userId: actor.userId,
    });

    const statusCode =
      result.status === "ready" ||
      result.status === "requires_empresa_assignment" ||
      result.status === "requires_disambiguation"
        ? 200
        : result.status === "resolution_required"
          ? 409
          : result.code
            ? getSeguimientosErrorStatusCode(result.code)
            : 400;

    return NextResponse.json(result, {
      status: statusCode,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/seguimientos/case/bootstrap] failed", error);
    const { statusCode, body } = buildSeguimientosServerErrorPayload(
      error,
      "No se pudo preparar el caso de Seguimientos."
    );
    return NextResponse.json(
      body,
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
