import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  EMPRESA_OPERATIONAL_ROLES,
  type EmpresaLifecycleRouteContext,
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
  parseEmpresaRouteId,
} from "@/lib/empresas/lifecycle-api";
import { listEmpresaEventosOperativos } from "@/lib/empresas/lifecycle-queries";
import { parseEmpresaEventosParams } from "@/lib/empresas/lifecycle-schemas";

export async function GET(
  request: Request,
  context: EmpresaLifecycleRouteContext
) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const result = await listEmpresaEventosOperativos({
      empresaId: await parseEmpresaRouteId(context),
      params: parseEmpresaEventosParams(new URL(request.url).searchParams),
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(
      error,
      "[api/empresas/[id]/eventos.get] failed"
    );
  }
}
