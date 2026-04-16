import type { User } from "@supabase/supabase-js";
import { parseEmpresaSnapshot } from "@/lib/empresa";
import { createClient } from "@/lib/supabase/server";
import type { DraftSummary, DraftRow } from "./shared";
import { buildDraftSummary } from "./shared";

const DEFAULT_USER_NAME = "Profesional";

const DRAFT_SUMMARY_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
  "created_at",
  "last_checkpoint_at",
  "last_checkpoint_hash",
  "empresa_snapshot",
].join(", ");

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type HubInitialData = {
  initialPanelOpen: boolean;
  initialUserName: string;
  initialRemoteDrafts: DraftSummary[];
};

function getSingleSearchParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return null;
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitialUserName(user: Pick<User, "app_metadata" | "email"> | null) {
  const usuarioLogin = readNonEmptyString(
    (user?.app_metadata as Record<string, unknown> | undefined)?.usuario_login
  );
  if (usuarioLogin) {
    return usuarioLogin;
  }

  const localPart = user?.email?.split("@")[0]?.trim();
  if (localPart) {
    return localPart;
  }

  return DEFAULT_USER_NAME;
}

async function fetchServerDraftSummaries(
  userId: string,
  supabase: ServerSupabaseClient
) {
  const { data, error } = await supabase
    .from("form_drafts")
    .select(DRAFT_SUMMARY_FIELDS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return [] satisfies DraftSummary[];
  }

  return (((data ?? []) as unknown[]) as DraftRow[]).map((row) =>
    buildDraftSummary(row, parseEmpresaSnapshot(row.empresa_snapshot))
  );
}

export async function getHubInitialData(params?: {
  panel?: string | string[] | undefined;
}): Promise<HubInitialData> {
  const initialPanelOpen = getSingleSearchParam(params?.panel) === "drafts";

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        initialPanelOpen,
        initialUserName: DEFAULT_USER_NAME,
        initialRemoteDrafts: [],
      };
    }

    const initialRemoteDrafts = await fetchServerDraftSummaries(user.id, supabase);

    return {
      initialPanelOpen,
      initialUserName: getInitialUserName(user),
      initialRemoteDrafts,
    };
  } catch {
    return {
      initialPanelOpen,
      initialUserName: DEFAULT_USER_NAME,
      initialRemoteDrafts: [],
    };
  }
}
