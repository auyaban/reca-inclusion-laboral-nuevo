import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loadLocalEnvFiles } from "../../../scripts/load-local-env.mjs";
import {
  EMPRESA_LIFECYCLE_EVIDENCE_FIELDS,
  getEmpresaLifecycleTree,
} from "@/lib/empresas/lifecycle-tree-server";

loadLocalEnvFiles();

const supabaseUrl = process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const missingIntegrationEnvMessage =
  "Missing SUPABASE_TEST_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for lifecycle Supabase integration test.";

// HABITEL S.A.S - empresa real de produccion seleccionada como fixture estable
// para integration test T2. Si Aaron borra/anonimiza esta empresa en BD,
// el segundo test falla. Decision PO #162: aceptado como costo del approach
// "integration con Supabase real" frente a alternativa "schema snapshot".
const HABITEL_EMPRESA_ID = "6b03e3f0-dbd0-4005-a642-f8fc3b2d316d";
const HABITEL_FILTERS =
  "nombre_empresa.ilike.%HABITEL%,payload_normalized->parsed_raw->>nombre_empresa.ilike.%HABITEL%";

type LifecycleEvidenceProjection = {
  registro_id: string;
  finalizado_at_colombia: string | null;
  created_at: string | null;
};

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase integration env.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function sortableTime(row: LifecycleEvidenceProjection) {
  const primary = Date.parse(row.finalizado_at_colombia ?? "");
  const secondary = Date.parse(row.created_at ?? "");
  return {
    primary: Number.isFinite(primary) ? primary : Number.NEGATIVE_INFINITY,
    secondary: Number.isFinite(secondary) ? secondary : Number.NEGATIVE_INFINITY,
  };
}

if (!runIntegration) {
  console.warn(`[SKIP] ${missingIntegrationEnvMessage}`);
}

describe.runIf(!runIntegration)("empresa lifecycle tree Supabase schema integration env", () => {
  it.runIf(process.env.CI === "true")("requires Supabase integration env in CI", () => {
    throw new Error(missingIntegrationEnvMessage);
  });

  it.runIf(process.env.CI !== "true")("documents local skip when Supabase env is missing", () => {
    expect(runIntegration).toBe(false);
  });
});

describe.runIf(runIntegration)("empresa lifecycle tree Supabase schema integration", () => {
  it("queries real finalized evidence using production columns and operational date ordering", async () => {
    const { data, error } = await adminClient()
      .from("formatos_finalizados_il")
      .select(EMPRESA_LIFECYCLE_EVIDENCE_FIELDS)
      .or(HABITEL_FILTERS)
      .order("finalizado_at_colombia", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(10);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0]).not.toHaveProperty("finalizado_at_iso");

    const rows = (data ?? []) as LifecycleEvidenceProjection[];
    for (let index = 1; index < rows.length; index += 1) {
      const previous = sortableTime(rows[index - 1]);
      const current = sortableTime(rows[index]);

      expect(previous.primary).toBeGreaterThanOrEqual(current.primary);
      if (previous.primary === current.primary) {
        expect(previous.secondary).toBeGreaterThanOrEqual(current.secondary);
      }
    }
  });

  it("builds the lifecycle tree for an active company with finalized evidence", async () => {
    const tree = await getEmpresaLifecycleTree({ empresaId: HABITEL_EMPRESA_ID });
    const renderedEvidenceCount =
      tree.companyStages.reduce((count, stage) => count + stage.evidence.length, 0) +
      tree.profileBranches.reduce(
        (count, profile) =>
          count +
          profile.evidence.length +
          profile.people.reduce(
            (peopleCount, person) =>
              peopleCount + person.evidence.length + person.seguimientos.length,
            0
          ),
        0
      ) +
      tree.peopleWithoutProfile.reduce(
        (count, person) => count + person.evidence.length + person.seguimientos.length,
        0
      ) +
      tree.archivedBranches.reduce(
        (count, person) => count + person.evidence.length + person.seguimientos.length,
        0
      ) +
      tree.unclassifiedEvidence.length;

    expect(tree.empresa.id).toBe(HABITEL_EMPRESA_ID);
    expect(renderedEvidenceCount).toBeGreaterThan(0);
  });
});
