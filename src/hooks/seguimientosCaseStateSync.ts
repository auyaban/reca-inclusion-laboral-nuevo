export function resolveExpectedCaseUpdatedAt(
  lastCommittedRef: { current: string | null },
  currentDraftData: { caseMeta: { updatedAt?: string | null } }
): string | null {
  return lastCommittedRef.current ?? currentDraftData.caseMeta.updatedAt ?? null;
}

/**
 * Updates the ref with the last committed updatedAt from any applied
 * hydration. The next save must use the freshest server snapshot, regardless
 * of whether it came from save, refresh, export, retry, or reload.
 */
export function commitHydrationStateWithRef(
  hydration: { caseMeta: { updatedAt?: string | null } },
  ref: { current: string | null }
) {
  ref.current = hydration.caseMeta.updatedAt ?? null;
}

/**
 * Resets the last-committed updatedAt ref when the operator switches to a
 * different case (cedula gate, draft restore, etc.) to prevent cross-case
 * timestamp contamination.
 */
export function resetLastCommittedUpdatedAtRef(
  ref: { current: string | null }
) {
  ref.current = null;
}
