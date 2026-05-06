import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/appRoles";
import { EMPRESA_SELECT_FIELDS } from "@/lib/empresa";
import {
  jsonEmpresaLifecycleError,
  NO_STORE_HEADERS,
} from "@/lib/empresas/lifecycle-api";
import {
  searchActiveEmpresasByNombreOrNit,
  type EmpresaLookupClient,
} from "@/lib/empresas/lookup";
import { requireAppRole } from "@/lib/auth/roles";

const searchParamsSchema = z.object({
  q: z.string().optional().default(""),
});

const MAX_EMPRESA_SEARCH_QUERY_LENGTH = 100;

/**
 * Search powers shared long-form company pickers and Seguimientos assignment.
 * `ods_operador` needs that surface, while telemetry-only admins do not.
 */
const EMPRESA_SEARCH_ROLES = [
  "inclusion_empresas_admin",
  "inclusion_empresas_profesional",
  "ods_operador",
] as const satisfies readonly AppRole[];

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(EMPRESA_SEARCH_ROLES);
    if (!authorization.ok) {
      return authorization.response;
    }

    const parsed = searchParamsSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    const query = parsed.q.trim().slice(0, MAX_EMPRESA_SEARCH_QUERY_LENGTH);

    if (query.length < 2) {
      return NextResponse.json({ items: [] }, { headers: NO_STORE_HEADERS });
    }

    const supabase = (await createClient()) as unknown as EmpresaLookupClient;
    const items = await searchActiveEmpresasByNombreOrNit(supabase, query, {
      fields: EMPRESA_SELECT_FIELDS,
      limit: 20,
    });

    return NextResponse.json({ items }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonEmpresaLifecycleError(error, "[api/empresas/search.get] failed");
  }
}
