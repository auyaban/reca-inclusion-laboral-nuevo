import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { listEmpresaEventos } from "@/lib/empresas/server";

const ADMIN_ROLE = ["inclusion_empresas_admin"] as const;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const items = await listEmpresaEventos({ empresaId: id, limit: 20 });

    return NextResponse.json({ items }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[api/empresas/[id]/eventos] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
