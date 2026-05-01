import { requireAppRole } from "@/lib/auth/roles";

export const SEGUIMIENTOS_E2E_ACTOR_USER_ID = "e2e-bypass-user";

export async function resolveSeguimientosRouteActor(
  _request: Request,
  _supabase: unknown
) {
  const authorization = await requireAppRole([
    "inclusion_empresas_admin",
    "inclusion_empresas_profesional",
  ]);

  if (!authorization.ok) {
    return {
      ok: false as const,
      response: authorization.response,
    };
  }

  return {
    ok: true as const,
    userId: authorization.context.user.id,
  };
}
