import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildProyeccionActor,
  jsonProyeccionError,
  jsonProyeccionValidationError,
  parseProyeccionRouteId,
  PROYECCIONES_NO_STORE_HEADERS,
  PROYECCIONES_OPERATIONAL_ROLES,
  readJsonBody,
  type ProyeccionRouteContext,
} from "@/lib/proyecciones/api";
import { cancelProyeccion } from "@/lib/proyecciones/server";
import { cancelProyeccionSchema } from "@/lib/proyecciones/schemas";

export async function POST(request: Request, context: ProyeccionRouteContext) {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const id = await parseProyeccionRouteId(context);
    const parsed = cancelProyeccionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonProyeccionValidationError(parsed.error as z.ZodError);
    }

    const result = await cancelProyeccion({
      id,
      actor: buildProyeccionActor(authorization.context),
      comentario: parsed.data.comentario,
    });
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones.cancelar.post] failed");
  }
}
