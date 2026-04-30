import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildEmpresaLifecycleActor,
  EMPRESA_OPERATIONAL_ROLES,
  type EmpresaLifecycleRouteContext,
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
  parseEmpresaRouteId,
} from "@/lib/empresas/lifecycle-api";
import { getEmpresaOperativaDetail } from "@/lib/empresas/lifecycle-queries";

export async function GET(
  _request: Request,
  context: EmpresaLifecycleRouteContext
) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const detail = await getEmpresaOperativaDetail({
      empresaId: await parseEmpresaRouteId(context),
      actor: buildEmpresaLifecycleActor(authorization.context),
    });

    return NextResponse.json(detail, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(
      error,
      "[api/empresas/[id]/operativa.get] failed"
    );
  }
}
