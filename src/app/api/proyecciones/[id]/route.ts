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
import {
  getProyeccion,
  updateProyeccion,
} from "@/lib/proyecciones/server";
import { updateProyeccionSchema } from "@/lib/proyecciones/schemas";

export async function GET(_request: Request, context: ProyeccionRouteContext) {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const id = await parseProyeccionRouteId(context);
    const result = await getProyeccion(id);
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones.id.get] failed");
  }
}

export async function PATCH(request: Request, context: ProyeccionRouteContext) {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const id = await parseProyeccionRouteId(context);
    const parsed = updateProyeccionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonProyeccionValidationError(parsed.error as z.ZodError);
    }

    const result = await updateProyeccion({
      id,
      actor: buildProyeccionActor(authorization.context),
      payload: parsed.data,
    });
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones.id.patch] failed");
  }
}
