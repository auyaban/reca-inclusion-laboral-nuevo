import type { DraftMeta } from "@/lib/drafts/shared";
import type { Empresa } from "@/lib/store/empresaStore";

export type InitialDraftResolution =
  | { status: "none" }
  | { status: "ready"; draft: DraftMeta; empresa: Empresa }
  | { status: "error"; message: string };

export const NO_INITIAL_DRAFT_RESOLUTION: InitialDraftResolution = {
  status: "none",
};
