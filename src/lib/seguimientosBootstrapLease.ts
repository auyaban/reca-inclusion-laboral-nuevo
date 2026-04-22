import { createClient as createAdminClient } from "@supabase/supabase-js";

type SeguimientosBootstrapLeaseRow = {
  claimed: boolean;
  lease_owner: string | null;
  lease_expires_at: string | null;
};

const SEGUIMIENTOS_BOOTSTRAP_LEASE_TTL_SECONDS = 30;

let seguimientosBootstrapAdminClient:
  | ReturnType<typeof createSeguimientosBootstrapAdminClient>
  | null = null;

function createSeguimientosBootstrapAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return createAdminClient(url, serviceRoleKey);
}

function getSeguimientosBootstrapAdminClient() {
  if (!seguimientosBootstrapAdminClient) {
    seguimientosBootstrapAdminClient = createSeguimientosBootstrapAdminClient();
  }

  return seguimientosBootstrapAdminClient;
}

export async function claimSeguimientosBootstrapLease(
  cedula: string,
  requestId: string
) {
  const admin = getSeguimientosBootstrapAdminClient();
  const { data, error } = await admin.rpc("claim_seguimientos_bootstrap_lease", {
    input_cedula: cedula,
    ttl_seconds: SEGUIMIENTOS_BOOTSTRAP_LEASE_TTL_SECONDS,
    request_id: requestId,
  });

  if (error) {
    throw error;
  }

  const row = ((Array.isArray(data) ? data[0] : data) ??
    null) as SeguimientosBootstrapLeaseRow | null;

  return {
    claimed: row?.claimed === true,
    leaseOwner: typeof row?.lease_owner === "string" ? row.lease_owner : null,
    leaseExpiresAt:
      typeof row?.lease_expires_at === "string" ? row.lease_expires_at : null,
  };
}

export async function releaseSeguimientosBootstrapLease(
  cedula: string,
  requestId: string
) {
  const admin = getSeguimientosBootstrapAdminClient();
  const { error } = await admin.rpc("release_seguimientos_bootstrap_lease", {
    input_cedula: cedula,
    request_id: requestId,
  });

  if (error) {
    throw error;
  }
}
