import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildEmpresaLifecycleActor,
  EMPRESA_OPERATIONAL_ROLES,
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
} from "@/lib/empresas/lifecycle-api";
import { listEmpresaPool } from "@/lib/empresas/lifecycle-queries";
import { parseEmpresaOperativaListParams } from "@/lib/empresas/lifecycle-schemas";

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const params = parseEmpresaOperativaListParams(
      new URL(request.url).searchParams
    );
    if (params.q.trim().length < 3) {
      return NextResponse.json(
        {
          items: [],
          total: 0,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: 0,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const result = await listEmpresaPool({
      actor: buildEmpresaLifecycleActor(authorization.context),
      params,
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(error, "[api/empresas/pool.get] failed");
  }
}
