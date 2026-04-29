import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isE2eAuthBypassedRequest } from "@/lib/auth/e2eBypass";

const PROTECTED = ["/hub", "/formularios"];
const TEMP_PASSWORD_PATH = "/auth/cambiar-contrasena-temporal";

function hasTemporaryPasswordClaim(claims: unknown) {
  if (!claims || typeof claims !== "object") {
    return false;
  }

  const record = claims as Record<string, unknown>;
  const appMetadata = record.app_metadata;

  return (
    record.reca_password_temp === true ||
    (typeof appMetadata === "object" &&
      appMetadata !== null &&
      (appMetadata as Record<string, unknown>).reca_password_temp === true)
  );
}

export async function proxy(request: NextRequest) {
  const hasE2eBypassAuth = isE2eAuthBypassedRequest(request);

  if (hasE2eBypassAuth) {
    const pathname = request.nextUrl.pathname;
    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

    if (isProtected) {
      return NextResponse.next({
        request: { headers: request.headers },
      });
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/hub", request.url));
    }

    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();
  const hasAuthenticatedClaims = Boolean(claimsData?.claims?.sub) && !claimsError;
  const hasTemporaryPassword = hasTemporaryPasswordClaim(claimsData?.claims);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !hasAuthenticatedClaims) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    isProtected &&
    hasAuthenticatedClaims &&
    hasTemporaryPassword &&
    pathname !== TEMP_PASSWORD_PATH
  ) {
    return NextResponse.redirect(new URL(TEMP_PASSWORD_PATH, request.url));
  }

  if (pathname === "/" && hasAuthenticatedClaims && hasTemporaryPassword) {
    return NextResponse.redirect(new URL(TEMP_PASSWORD_PATH, request.url));
  }

  if (pathname === "/" && hasAuthenticatedClaims) {
    return NextResponse.redirect(new URL("/hub", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico|api).*)"],
};
