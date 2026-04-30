import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildEmpresaLifecycleActor,
  EMPRESA_OPERATIONAL_ROLES,
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
} from "@/lib/empresas/lifecycle-api";
import { listMisEmpresas } from "@/lib/empresas/lifecycle-queries";
import { parseMisEmpresasListParams } from "@/lib/empresas/lifecycle-schemas";

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const params = parseMisEmpresasListParams(new URL(request.url).searchParams);
    const result = await listMisEmpresas({
      actor: buildEmpresaLifecycleActor(authorization.context),
      params,
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(error, "[api/empresas/mias.get] failed");
  }
}
