import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  EMPRESA_OPERATIONAL_ROLES,
  type EmpresaLifecycleRouteContext,
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
  parseEmpresaRouteId,
} from "@/lib/empresas/lifecycle-api";
import { getEmpresaLifecycleTree } from "@/lib/empresas/lifecycle-tree-server";

export async function GET(
  _request: Request,
  context: EmpresaLifecycleRouteContext
) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const tree = await getEmpresaLifecycleTree({
      empresaId: await parseEmpresaRouteId(context),
    });

    return NextResponse.json(tree, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(
      error,
      "[api/empresas/[id]/ciclo-vida.get] failed"
    );
  }
}
