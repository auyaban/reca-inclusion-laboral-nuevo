import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  jsonProyeccionError,
  PROYECCIONES_NO_STORE_HEADERS,
  PROYECCIONES_OPERATIONAL_ROLES,
} from "@/lib/proyecciones/api";
import { listCachedProyeccionServicios } from "@/lib/proyecciones/server";

export async function GET() {
  try {
    const authorization = await requireAppRole(PROYECCIONES_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const result = await listCachedProyeccionServicios();
    return NextResponse.json(result, { headers: PROYECCIONES_NO_STORE_HEADERS });
  } catch (error) {
    return jsonProyeccionError(error, "[api/proyecciones/servicios.get] failed");
  }
}
