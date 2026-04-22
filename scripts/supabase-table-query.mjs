import process from "node:process";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { loadLocalEnvFiles } from "./load-local-env.mjs";

loadLocalEnvFiles();

const usage = `Usage:
  npm run supabase:table -- --table public.empresas --select "nombre_empresa,nit" --limit 5
  npm run supabase:table -- --table public.form_drafts --select "id,form_slug,updated_at" --eq user_id=<uuid>
  npm run supabase:table -- --table public.empresas --select "*" --ilike nombre_empresa=%RECA% --order nombre_empresa:asc

Options:
  --table <schema.table|table>    Required table name. Defaults schema to public when omitted.
  --select <columns>              PostgREST select string. Defaults to *
  --limit <number>                Limit returned rows.
  --order <column[:asc|desc]>     Repeatable order clause.
  --count <exact|planned|estimated>
  --eq <column=value>             Repeatable equality filter.
  --ilike <column=pattern>        Repeatable ilike filter.
  --gt <column=value>             Repeatable greater-than filter.
  --gte <column=value>            Repeatable greater-than-or-equal filter.
  --lt <column=value>             Repeatable less-than filter.
  --lte <column=value>            Repeatable less-than-or-equal filter.
  --in <column=a,b,c>             Repeatable IN filter.
  --single                        Expect exactly one row.
  --maybe-single                  Return one row or null.
  --help                          Show this help.
`;

const { values } = parseArgs({
  options: {
    table: { type: "string" },
    select: { type: "string" },
    limit: { type: "string" },
    order: { type: "string", multiple: true },
    count: { type: "string" },
    eq: { type: "string", multiple: true },
    ilike: { type: "string", multiple: true },
    gt: { type: "string", multiple: true },
    gte: { type: "string", multiple: true },
    lt: { type: "string", multiple: true },
    lte: { type: "string", multiple: true },
    in: { type: "string", multiple: true },
    single: { type: "boolean" },
    maybeSingle: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function splitQualifiedTable(input) {
  const parts = input.split(".");
  if (parts.length === 1) {
    return { schema: "public", table: parts[0] };
  }

  return { schema: parts[0], table: parts.slice(1).join(".") };
}

function parseAssignment(rawValue, optionName) {
  const separatorIndex = rawValue.indexOf("=");
  if (separatorIndex <= 0) {
    throw new Error(`Invalid ${optionName} filter "${rawValue}". Expected column=value.`);
  }

  return {
    column: rawValue.slice(0, separatorIndex),
    value: rawValue.slice(separatorIndex + 1),
  };
}

function applyAssignments(query, entries, optionName, apply) {
  let nextQuery = query;

  for (const rawEntry of entries ?? []) {
    const { column, value } = parseAssignment(rawEntry, optionName);
    nextQuery = apply(nextQuery, column, value);
  }

  return nextQuery;
}

function applyOrder(query, entries) {
  let nextQuery = query;

  for (const rawEntry of entries ?? []) {
    const [column, direction = "asc"] = rawEntry.split(":");
    nextQuery = nextQuery.order(column, { ascending: direction !== "desc" });
  }

  return nextQuery;
}

async function main() {
  if (values.help || !values.table) {
    console.log(usage);
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  if (values.single && values.maybeSingle) {
    console.error("Use only one of --single or --maybe-single.");
    process.exitCode = 1;
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in local env files.");
    process.exitCode = 1;
    return;
  }

  const { schema, table } = splitQualifiedTable(values.table);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let query = supabase
    .schema(schema)
    .from(table)
    .select(values.select ?? "*", values.count ? { count: values.count } : undefined);

  query = applyAssignments(query, values.eq, "--eq", (current, column, value) =>
    current.eq(column, value)
  );
  query = applyAssignments(query, values.ilike, "--ilike", (current, column, value) =>
    current.ilike(column, value)
  );
  query = applyAssignments(query, values.gt, "--gt", (current, column, value) =>
    current.gt(column, value)
  );
  query = applyAssignments(query, values.gte, "--gte", (current, column, value) =>
    current.gte(column, value)
  );
  query = applyAssignments(query, values.lt, "--lt", (current, column, value) =>
    current.lt(column, value)
  );
  query = applyAssignments(query, values.lte, "--lte", (current, column, value) =>
    current.lte(column, value)
  );
  query = applyAssignments(query, values.in, "--in", (current, column, value) =>
    current.in(column, value.split(",").map((entry) => entry.trim()))
  );
  query = applyOrder(query, values.order);

  if (values.limit) {
    const limit = Number.parseInt(values.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) {
      console.error(`Invalid --limit value "${values.limit}". Expected a positive integer.`);
      process.exitCode = 1;
      return;
    }

    query = query.limit(limit);
  }

  if (values.single) {
    query = query.single();
  } else if (values.maybeSingle) {
    query = query.maybeSingle();
  }

  const { data, error, count } = await query;

  if (error) {
    console.error(`Supabase query failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;

  console.log(
    JSON.stringify(
      {
        schema,
        table,
        rowCount,
        count,
        data,
      },
      null,
      2
    )
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
