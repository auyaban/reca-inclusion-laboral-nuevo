import {
  buildRequestHash,
  hashStringHex,
} from "@/lib/finalization/idempotencyCore";
import { coerceTrimmedText } from "@/lib/finalization/valueUtils";
import type { InduccionOrganizacionalValues } from "@/lib/induccionOrganizacional";

export type InduccionOrganizacionalFinalizationIdentity = {
  draft_id?: string | null;
  local_draft_session_id: string;
};

function normalizeIdentity(identity: InduccionOrganizacionalFinalizationIdentity) {
  const draftId = coerceTrimmedText(identity.draft_id);
  return {
    local_draft_session_id: coerceTrimmedText(identity.local_draft_session_id),
    ...(draftId ? { draft_id: draftId } : {}),
  };
}

export function buildInduccionOrganizacionalRequestHash(
  payload: InduccionOrganizacionalValues
) {
  return buildRequestHash(payload);
}

export function buildInduccionOrganizacionalIdempotencyKey({
  userId,
  identity,
  requestHash,
}: {
  userId: string;
  identity: InduccionOrganizacionalFinalizationIdentity;
  requestHash: string;
}) {
  const normalizedIdentity = normalizeIdentity(identity);
  const identityKey =
    normalizedIdentity.draft_id ?? normalizedIdentity.local_draft_session_id;

  return hashStringHex(
    `induccion-organizacional:${userId}:${identityKey}:${requestHash}`
  );
}
