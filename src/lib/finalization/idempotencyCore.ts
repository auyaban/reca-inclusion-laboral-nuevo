import { createHash } from "crypto";
import { coerceTrimmedText, isRecord } from "@/lib/finalization/valueUtils";

export type FinalizationIdentity = {
  draft_id?: string | null;
  local_draft_session_id: string;
};

export type FinalizationSuccessResponse = {
  success: true;
  sheetLink: string;
  pdfLink?: string;
};

export function normalizeFinalizationIdentity(identity: FinalizationIdentity) {
  const draftId = coerceTrimmedText(identity.draft_id);

  return {
    local_draft_session_id: coerceTrimmedText(identity.local_draft_session_id),
    ...(draftId ? { draft_id: draftId } : {}),
  };
}

export function getFinalizationIdentityKey(identity: FinalizationIdentity) {
  const normalizedIdentity = normalizeFinalizationIdentity(identity);

  return (
    normalizedIdentity.draft_id ?? normalizedIdentity.local_draft_session_id
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashStringHex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildRequestHash(data: unknown) {
  return hashStringHex(stableStringify(data));
}

export function buildScopedFinalizationIdempotencyKey(options: {
  formSlug: string;
  userId: string;
  identity: FinalizationIdentity;
  requestHash: string;
}) {
  const identityKey = getFinalizationIdentityKey(options.identity);

  return hashStringHex(
    `${options.formSlug}:${options.userId}:${identityKey}:${options.requestHash}`
  );
}
