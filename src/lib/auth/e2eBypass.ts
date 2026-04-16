export const E2E_AUTH_BYPASS_COOKIE = "reca-e2e-auth";
export const E2E_AUTH_BYPASS_ENV = "E2E_AUTH_BYPASS";

type RequestLike = {
  headers?: Headers;
  cookies?: {
    get: (name: string) => { value?: string } | undefined;
  };
};

function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const entry of cookies) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName === name) {
      return rawValue.join("=") || null;
    }
  }

  return null;
}

export function isE2eAuthBypassEnabled() {
  return process.env[E2E_AUTH_BYPASS_ENV] === "1";
}

export function isE2eAuthBypassedRequest(request: RequestLike) {
  if (!isE2eAuthBypassEnabled()) {
    return false;
  }

  const cookieValue =
    request.cookies?.get(E2E_AUTH_BYPASS_COOKIE)?.value ??
    getCookieValue(request.headers?.get("cookie"), E2E_AUTH_BYPASS_COOKIE);

  return cookieValue === "1";
}

export function isRequestAuthenticated({
  request,
  user,
  authError,
}: {
  request: RequestLike;
  user: unknown;
  authError: unknown;
}) {
  return (Boolean(user) && !authError) || isE2eAuthBypassedRequest(request);
}
