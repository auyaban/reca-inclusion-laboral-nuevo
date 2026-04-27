import process from "node:process";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { loadLocalEnvFiles } from "./load-local-env.mjs";

loadLocalEnvFiles();

const usage = `Usage:
  npm run finalization:baseline
  npm run finalization:baseline -- --days 14 --limit 500
  npm run finalization:baseline -- --form-slug presentacion --json

Options:
  --days <number>        Look back this many days from now. Default 30.
  --since <iso-date>     Use an explicit lower bound for updated_at.
  --limit <number>       Maximum rows to inspect. Default 1000.
  --form-slug <slug>     Filter by form slug.
  --status <status|all>  Filter by status. Default succeeded.
  --json                 Print JSON instead of Markdown.
  --help                 Show this help.
`;

const { values } = parseArgs({
  options: {
    days: { type: "string" },
    since: { type: "string" },
    limit: { type: "string" },
    "form-slug": { type: "string" },
    status: { type: "string" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const FINALIZATION_COLUMNS = [
  "form_slug",
  "status",
  "stage",
  "updated_at",
  "completed_at",
  "total_duration_ms",
  "profiling_steps",
  "prewarm_status",
  "prewarm_reused",
  "prewarm_structure_signature",
].join(",");

function parsePositiveInteger(rawValue, flagName, fallback) {
  if (rawValue == null) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flagName} value "${rawValue}". Expected a positive integer.`);
  }

  return parsed;
}

function buildSinceIso() {
  if (values.since) {
    const explicit = new Date(values.since);
    if (Number.isNaN(explicit.getTime())) {
      throw new Error(`Invalid --since value "${values.since}". Expected an ISO date.`);
    }

    return explicit.toISOString();
  }

  const days = parsePositiveInteger(values.days, "--days", 30);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in local env files."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function fetchFinalizationRows(options) {
  const pageSize = 1000;
  const rows = [];

  while (rows.length < options.limit) {
    const from = rows.length;
    const to = Math.min(from + pageSize, options.limit) - 1;

    let query = options.supabase
      .from("form_finalization_requests")
      .select(FINALIZATION_COLUMNS)
      .gte("updated_at", options.sinceIso)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (options.status !== "all") {
      query = query.eq("status", options.status);
    }

    if (options.formSlug) {
      query = query.eq("form_slug", options.formSlug);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getDuration(row) {
  return isNumber(row.total_duration_ms) && row.total_duration_ms >= 0
    ? row.total_duration_ms
    : null;
}

function percentile(valuesList, percentileValue) {
  const valuesSorted = valuesList
    .filter((value) => isNumber(value) && value >= 0)
    .sort((left, right) => left - right);

  if (valuesSorted.length === 0) {
    return null;
  }

  const index = Math.min(
    valuesSorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * valuesSorted.length) - 1)
  );

  return valuesSorted[index];
}

function average(valuesList) {
  const numeric = valuesList.filter((value) => isNumber(value) && value >= 0);
  if (numeric.length === 0) {
    return null;
  }

  return Math.round(
    numeric.reduce((sum, value) => sum + value, 0) / numeric.length
  );
}

function groupBy(rows, getKey) {
  const groups = new Map();

  for (const row of rows) {
    const key = getKey(row);
    const current = groups.get(key);
    if (current) {
      current.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}

function summarizeRows(rows, metadata = {}) {
  const durations = rows.map(getDuration).filter((value) => value != null);

  return {
    ...metadata,
    count: rows.length,
    timedCount: durations.length,
    missingTimingCount: rows.length - durations.length,
    avgMs: average(durations),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: durations.length > 0 ? Math.max(...durations) : null,
  };
}

function normalizePrewarmStatus(value) {
  return typeof value === "string" && value ? value : "unknown";
}

function normalizePrewarmReused(value) {
  return typeof value === "boolean" ? String(value) : "unknown";
}

function buildGroupedSummaries(rows) {
  const byForm = Array.from(groupBy(rows, (row) => row.form_slug ?? "unknown"))
    .map(([formSlug, groupRows]) => summarizeRows(groupRows, { formSlug }))
    .sort((left, right) => {
      const rightP95 = right.p95Ms ?? -1;
      const leftP95 = left.p95Ms ?? -1;
      return rightP95 - leftP95 || right.count - left.count;
    });

  const byPrewarm = Array.from(
    groupBy(rows, (row) =>
      [
        row.form_slug ?? "unknown",
        normalizePrewarmStatus(row.prewarm_status),
        normalizePrewarmReused(row.prewarm_reused),
      ].join("|")
    )
  )
    .map(([key, groupRows]) => {
      const [formSlug, prewarmStatus, prewarmReused] = key.split("|");
      return summarizeRows(groupRows, {
        formSlug,
        prewarmStatus,
        prewarmReused,
      });
    })
    .sort((left, right) => {
      if (left.formSlug !== right.formSlug) {
        return left.formSlug.localeCompare(right.formSlug);
      }

      return (right.p95Ms ?? -1) - (left.p95Ms ?? -1);
    });

  return { byForm, byPrewarm };
}

function getStepRows(rows) {
  const stepRows = [];

  for (const row of rows) {
    if (!Array.isArray(row.profiling_steps)) {
      continue;
    }

    for (const step of row.profiling_steps) {
      if (
        !step ||
        typeof step !== "object" ||
        typeof step.label !== "string" ||
        !isNumber(step.durationMs)
      ) {
        continue;
      }

      stepRows.push({
        formSlug: row.form_slug ?? "unknown",
        label: step.label,
        durationMs: step.durationMs,
        totalMs: isNumber(step.totalMs) ? step.totalMs : null,
      });
    }
  }

  return stepRows;
}

function summarizeSteps(rows) {
  return Array.from(
    groupBy(rows, (row) => [row.formSlug, row.label].join("|"))
  )
    .map(([key, groupRows]) => {
      const [formSlug, label] = key.split("|");
      const durations = groupRows.map((row) => row.durationMs);

      return {
        formSlug,
        label,
        count: groupRows.length,
        avgMs: average(durations),
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
        maxMs: durations.length > 0 ? Math.max(...durations) : null,
      };
    })
    .sort((left, right) => {
      const rightP95 = right.p95Ms ?? -1;
      const leftP95 = left.p95Ms ?? -1;
      return rightP95 - leftP95 || right.count - left.count;
    });
}

function formatMs(value) {
  if (value == null) {
    return "n/a";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function renderTable(headers, rows) {
  if (rows.length === 0) {
    return "_No data._";
  }

  const separator = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];

  return lines.join("\n");
}

function renderMarkdown(report) {
  const lines = [
    "# Finalization Baseline",
    "",
    `Generated at: ${report.generatedAt}`,
    `Window: ${report.filters.sinceIso} to now`,
    `Status filter: ${report.filters.status}`,
    `Form filter: ${report.filters.formSlug ?? "all"}`,
    `Rows inspected: ${report.rowCount}`,
    `Rows with timing: ${report.timedRowCount}`,
    `Rows with profiling steps: ${report.rowsWithProfilingSteps}`,
    "",
    "## By Form",
    "",
    renderTable(
      ["form", "rows", "timed", "missing timing", "avg", "p50", "p95", "max"],
      report.byForm.map((row) => [
        row.formSlug,
        String(row.count),
        String(row.timedCount),
        String(row.missingTimingCount),
        formatMs(row.avgMs),
        formatMs(row.p50Ms),
        formatMs(row.p95Ms),
        formatMs(row.maxMs),
      ])
    ),
    "",
    "## By Form And Prewarm",
    "",
    renderTable(
      ["form", "prewarm", "reused", "rows", "p50", "p95", "max"],
      report.byPrewarm.map((row) => [
        row.formSlug,
        row.prewarmStatus,
        row.prewarmReused,
        String(row.count),
        formatMs(row.p50Ms),
        formatMs(row.p95Ms),
        formatMs(row.maxMs),
      ])
    ),
    "",
    "## Slowest Steps",
    "",
    renderTable(
      ["form", "step", "count", "avg", "p50", "p95", "max"],
      report.slowestSteps.slice(0, 20).map((row) => [
        row.formSlug,
        row.label,
        String(row.count),
        formatMs(row.avgMs),
        formatMs(row.p50Ms),
        formatMs(row.p95Ms),
        formatMs(row.maxMs),
      ])
    ),
    "",
    "## Decision Candidates",
    "",
  ];

  if (report.slowestSteps.length === 0) {
    lines.push("- No profiling steps available in the selected window.");
  } else {
    for (const [index, step] of report.slowestSteps.slice(0, 3).entries()) {
      lines.push(
        `${index + 1}. ${step.formSlug} / ${step.label}: p95 ${formatMs(
          step.p95Ms
        )}, ${step.count} samples.`
      );
    }
  }

  return lines.join("\n");
}

function buildReport(rows, filters) {
  const { byForm, byPrewarm } = buildGroupedSummaries(rows);
  const stepRows = getStepRows(rows);
  const slowestSteps = summarizeSteps(stepRows);
  const timedRowCount = rows.filter((row) => getDuration(row) != null).length;
  const rowsWithProfilingSteps = rows.filter((row) =>
    Array.isArray(row.profiling_steps)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    filters,
    rowCount: rows.length,
    timedRowCount,
    rowsWithProfilingSteps,
    byForm,
    byPrewarm,
    slowestSteps,
  };
}

async function main() {
  if (values.help) {
    console.log(usage);
    return;
  }

  const limit = parsePositiveInteger(values.limit, "--limit", 1000);
  const status = values.status ?? "succeeded";
  const sinceIso = buildSinceIso();
  const supabase = createSupabaseClient();
  const formSlug = values["form-slug"] ?? null;

  const rows = await fetchFinalizationRows({
    supabase,
    sinceIso,
    limit,
    status,
    formSlug,
  });

  const report = buildReport(rows, {
    sinceIso,
    limit,
    status,
    formSlug,
  });

  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(renderMarkdown(report));
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
