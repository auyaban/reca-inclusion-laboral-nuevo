import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/hub", "/formularios"];

export async function proxy(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !hasAuthenticatedClaims) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && hasAuthenticatedClaims) {
    return NextResponse.redirect(new URL("/hub", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico|api).*)"],
};
