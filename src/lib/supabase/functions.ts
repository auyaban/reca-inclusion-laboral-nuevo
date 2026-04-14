export function getSupabaseFunctionUrl(functionName: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  return new URL(`/functions/v1/${functionName}`, supabaseUrl).toString();
}
