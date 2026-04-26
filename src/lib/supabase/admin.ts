import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type CreateSupabaseAdminClientOptions = {
  missingEnvMessage?: string;
};

const DEFAULT_MISSING_ENV_MESSAGE = "Supabase admin no esta configurado.";

export function createSupabaseAdminClient(
  options: CreateSupabaseAdminClientOptions = {}
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(options.missingEnvMessage ?? DEFAULT_MISSING_ENV_MESSAGE);
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}
