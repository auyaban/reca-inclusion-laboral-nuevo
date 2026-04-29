import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  buildEmpresaLifecycleActor,
  EMPRESA_OPERATIONAL_ROLES,
  type EmpresaLifecycleRouteContext,
  jsonEmpresaLifecycleError,
  jsonValidationError,
  NO_STORE_HEADERS,
  parseEmpresaRouteId,
  readJsonBody,
} from "@/lib/empresas/lifecycle-api";
import { agregarEmpresaNota } from "@/lib/empresas/lifecycle-server";
import { notaEmpresaSchema } from "@/lib/empresas/lifecycle-schemas";

export async function POST(
  request: Request,
  context: EmpresaLifecycleRouteContext
) {
  try {
    const authorization = await requireAppRole(EMPRESA_OPERATIONAL_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = notaEmpresaSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const result = await agregarEmpresaNota({
      empresaId: await parseEmpresaRouteId(context),
      actor: buildEmpresaLifecycleActor(authorization.context),
      contenido: parsed.data.contenido,
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(
      error,
      "[api/empresas/[id]/notas.post] failed"
    );
  }
}
