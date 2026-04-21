"use client";

import { useEffect, useRef } from "react";

type UseInitialLocalDraftSeedParams = {
  enabled: boolean;
  hydrationSettled: boolean;
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
  hydrationSettled,
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
    if (!enabled || !hydrationSettled || !seedKey) {
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
    hydrationSettled,
    localDraftSavedAt,
    seedKey,
    step,
  ]);
}
