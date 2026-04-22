import { NextResponse } from "next/server";
import {
  isE2eAuthBypassedRequest,
  isRequestAuthenticated,
} from "@/lib/auth/e2eBypass";

export const SEGUIMIENTOS_E2E_ACTOR_USER_ID = "e2e-bypass-user";

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id?: string | null } | null };
      error: unknown;
    }>;
  };
};

export async function resolveSeguimientosRouteActor(
  request: Request,
  supabase: SupabaseLike
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!isRequestAuthenticated({ request, user, authError })) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const userId =
    typeof user?.id === "string" && user.id.trim()
      ? user.id
      : isE2eAuthBypassedRequest(request)
        ? SEGUIMIENTOS_E2E_ACTOR_USER_ID
        : null;

  if (!userId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    userId,
  };
}
