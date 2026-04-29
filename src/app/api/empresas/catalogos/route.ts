import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { getEmpresaCatalogos } from "@/lib/empresas/server";

const ADMIN_ROLE = ["inclusion_empresas_admin"] as const;
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const authorization = await requireAppRole(ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const catalogos = await getEmpresaCatalogos();
    return NextResponse.json(catalogos, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[api/empresas/catalogos] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
