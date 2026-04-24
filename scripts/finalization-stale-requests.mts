import process from "node:process";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnvFiles } from "./load-local-env.mjs";
import {
  FINALIZATION_PROCESSING_TTL_MS,
  buildStaleFinalizationReport,
  buildStaleThresholdIso,
  type StaleFinalizationSourceRow,
} from "../src/lib/finalization/staleProcessing.mjs";

loadLocalEnvFiles();

const usage = `Usage:
  npm run finalization:stale
  npm run finalization:stale -- --fail-on-stale
  npm run finalization:stale -- --form-slug interprete-lsc --limit 5

Options:
  --limit <number>            Maximum rows to inspect. Default 100.
  --older-than-ms <number>    Threshold in milliseconds. Default FINALIZATION_PROCESSING_TTL_MS.
  --form-slug <slug>          Filter by form slug.
  --user-id <uuid>            Filter by user id.
  --idempotency-key <key>     Filter by idempotency key.
  --fail-on-stale             Exit with code 2 when stale rows exist.
  --help                      Show this help.
`;

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    "older-than-ms": { type: "string" },
    "form-slug": { type: "string" },
    "user-id": { type: "string" },
    "idempotency-key": { type: "string" },
    "fail-on-stale": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function parsePositiveInteger(
  rawValue: string | undefined,
  flagName: string,
  fallback: number
) {
  if (rawValue == null) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flagName} value "${rawValue}". Expected a positive integer.`);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function queryStaleRows(options: {
  supabase: ReturnType<typeof createClient>;
  now: number;
  olderThanMs: number;
  limit: number;
  formSlug?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
}) {
  const thresholdIso = buildStaleThresholdIso(options.now, options.olderThanMs);
  const withArtifactsColumns =
    "idempotency_key,form_slug,user_id,stage,external_artifacts,external_stage,started_at,updated_at";
  const fallbackColumns =
    "idempotency_key,form_slug,user_id,stage,started_at,updated_at";

  async function runQuery(selectColumns: string) {
    let query = options.supabase
      .from("form_finalization_requests")
      .select(selectColumns)
      .eq("status", "processing")
      .lt("updated_at", thresholdIso);

    if (options.formSlug) {
      query = query.eq("form_slug", options.formSlug);
    }

    if (options.userId) {
      query = query.eq("user_id", options.userId);
    }

    if (options.idempotencyKey) {
      query = query.eq("idempotency_key", options.idempotencyKey);
    }

    return query.order("updated_at", { ascending: true }).limit(options.limit);
  }

  const primary = await runQuery(withArtifactsColumns);
  if (!primary.error) {
    return (primary.data ?? []) as StaleFinalizationSourceRow[];
  }

  if (
    !isRecord(primary.error) ||
    primary.error.code !== "42703" ||
    typeof primary.error.message !== "string" ||
    !primary.error.message.includes("external_artifacts")
  ) {
    throw primary.error;
  }

  const fallback = await runQuery(fallbackColumns);
  if (fallback.error) {
    throw fallback.error;
  }

  return ((fallback.data ?? []) as Array<
    Omit<StaleFinalizationSourceRow, "external_artifacts" | "external_stage">
  >).map((row) => ({
    ...row,
    external_artifacts: null,
    external_stage: null,
  }));
}

async function main() {
  if (values.help) {
    console.log(usage);
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in local env files."
    );
  }

  const limit = parsePositiveInteger(values.limit, "--limit", 100);
  const olderThanMs = parsePositiveInteger(
    values["older-than-ms"],
    "--older-than-ms",
    FINALIZATION_PROCESSING_TTL_MS
  );
  const now = Date.now();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const rows = await queryStaleRows({
    supabase,
    now,
    olderThanMs,
    limit,
    formSlug: values["form-slug"] ?? null,
    userId: values["user-id"] ?? null,
    idempotencyKey: values["idempotency-key"] ?? null,
  });

  const report = buildStaleFinalizationReport(rows, {
    now,
    ttlMs: olderThanMs,
  });

  console.log(JSON.stringify(report, null, 2));

  if (values["fail-on-stale"] && report.staleCount > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    try {
      console.error(JSON.stringify(error, null, 2));
    } catch {
      console.error(String(error));
    }
  }
  process.exitCode = 1;
});
