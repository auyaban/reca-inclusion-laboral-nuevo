"use client";

import { useEffect, useRef } from "react";

type UseInitialLocalDraftSeedParams = {
  enabled: boolean;
  seedKey: string | null;
  step: number;
  getValues: () => Record<string, unknown>;
  autosave: (
    step: number,
    data: Record<string, unknown>,
    options?: { forcePersist?: boolean }
  ) => void;
  localDraftSavedAt: Date | null;
  hasPendingAutosave: boolean;
  hasLocalDirtyChanges: boolean;
};

export function useInitialLocalDraftSeed({
  enabled,
  seedKey,
  step,
  getValues,
  autosave,
  localDraftSavedAt,
  hasPendingAutosave,
  hasLocalDirtyChanges,
}: UseInitialLocalDraftSeedParams) {
  const seededKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !seedKey) {
      return;
    }

    if (seededKeysRef.current.has(seedKey)) {
      return;
    }

    if (localDraftSavedAt || hasPendingAutosave || hasLocalDirtyChanges) {
      seededKeysRef.current.add(seedKey);
      return;
    }

    seededKeysRef.current.add(seedKey);
    autosave(step, getValues(), { forcePersist: true });
  }, [
    autosave,
    enabled,
    getValues,
    hasLocalDirtyChanges,
    hasPendingAutosave,
    localDraftSavedAt,
    seedKey,
    step,
  ]);
}
