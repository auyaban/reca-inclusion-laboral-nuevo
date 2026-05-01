import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildProyeccionActor,
  jsonProyeccionError,
  jsonProyeccionValidationError,
  PROYECCIONES_NO_STORE_HEADERS,
  PROYECCIONES_OPERATIONAL_ROLES,
  readJsonBody,
} from "@/lib/proyecciones/api";
import {
  createProyeccion,
  listProyecciones,
} from "@/lib/proyecciones/server";
import {
  createProyeccionSchema,
  parseProyeccionesListParams,
} from "@/lib/proyecciones/schemas";

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const params = parseProyeccionesListParams(new URL(request.url).searchParams);
    const result = await listProyecciones(params);
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones.get] failed");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = createProyeccionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonProyeccionValidationError(parsed.error as z.ZodError);
    }

    const result = await createProyeccion({
      actor: buildProyeccionActor(authorization.context),
      payload: parsed.data,
    });
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones.post] failed");
  }
}
