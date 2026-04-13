const DEFAULT_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "form-action": ["'self'"],
  // Kept intentionally for current Next.js/Tailwind runtime compatibility.
  // This is a pragmatic baseline CSP, not a nonce-based inline-script/style
  // hardening strategy.
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'", "blob:"],
  "connect-src": ["'self'"],
} as const;

export interface BuildContentSecurityPolicyOptions {
  supabaseUrl?: string | null | undefined;
  environment?: string | null | undefined;
}

function normalizeOrigin(rawUrl: string | null | undefined) {
  const value = rawUrl?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function buildRealtimeOrigin(rawUrl: string | null | undefined) {
  const origin = normalizeOrigin(rawUrl);
  if (!origin) {
    return null;
  }

  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

function unique(values: Iterable<string>) {
  return Array.from(new Set(Array.from(values).filter(Boolean)));
}

export function buildContentSecurityPolicy(
  options: BuildContentSecurityPolicyOptions = {}
) {
  const environment = options.environment ?? process.env.NODE_ENV;
  const isProduction = environment === "production";
  const connectSrc = new Set<string>(DEFAULT_DIRECTIVES["connect-src"]);
  const scriptSrc = new Set<string>(DEFAULT_DIRECTIVES["script-src"]);

  const supabaseOrigin = normalizeOrigin(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  if (supabaseOrigin) {
    connectSrc.add(supabaseOrigin);
  }

  const supabaseRealtimeOrigin = buildRealtimeOrigin(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  if (supabaseRealtimeOrigin) {
    connectSrc.add(supabaseRealtimeOrigin);
  }

  // Turbopack dev server still relies on eval and websocket HMR.
  if (!isProduction) {
    scriptSrc.add("'unsafe-eval'");
    connectSrc.add("ws:");
  }

  const directives: Array<[string, string[]]> = [
    ["default-src", unique(DEFAULT_DIRECTIVES["default-src"])],
    ["base-uri", unique(DEFAULT_DIRECTIVES["base-uri"])],
    ["frame-ancestors", unique(DEFAULT_DIRECTIVES["frame-ancestors"])],
    ["object-src", unique(DEFAULT_DIRECTIVES["object-src"])],
    ["form-action", unique(DEFAULT_DIRECTIVES["form-action"])],
    ["script-src", unique(scriptSrc)],
    ["style-src", unique(DEFAULT_DIRECTIVES["style-src"])],
    ["img-src", unique(DEFAULT_DIRECTIVES["img-src"])],
    ["font-src", unique(DEFAULT_DIRECTIVES["font-src"])],
    ["media-src", unique(DEFAULT_DIRECTIVES["media-src"])],
    ["connect-src", unique(connectSrc)],
  ];

  return directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
