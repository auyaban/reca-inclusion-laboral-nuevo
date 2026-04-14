"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_TAKEOVER_ERROR =
  "No se pudo tomar el control del borrador. Intentalo de nuevo en unos segundos.";

type UseFormDraftLifecycleOptions = {
  initialRestoring?: boolean;
  takeOverErrorMessage?: string;
};

export function useFormDraftLifecycle(
  options: UseFormDraftLifecycleOptions = {}
) {
  const [draftLifecycleSuspended, setDraftLifecycleSuspended] = useState(false);
  const [restoringDraft, setRestoringDraft] = useState(
    options.initialRestoring ?? false
  );
  const hydratedRouteRef = useRef<string | null>(null);

  const isRouteHydrated = useCallback((routeKey: string) => {
    return hydratedRouteRef.current === routeKey;
  }, []);

  const markRouteHydrated = useCallback((routeKey: string | null) => {
    hydratedRouteRef.current = routeKey;
  }, []);

  const suspendDraftLifecycle = useCallback(() => {
    setDraftLifecycleSuspended(true);
  }, []);

  const resumeDraftLifecycle = useCallback(() => {
    setDraftLifecycleSuspended(false);
  }, []);

  const takeOverDraftWithFeedback = useCallback(
    (
      takeOverDraft: () => boolean,
      setServerError: (value: string | null) => void
    ) => {
      const didTakeOver = takeOverDraft();
      if (!didTakeOver) {
        setServerError(options.takeOverErrorMessage ?? DEFAULT_TAKEOVER_ERROR);
        return false;
      }

      setServerError(null);
      return true;
    },
    [options.takeOverErrorMessage]
  );

  return {
    draftLifecycleSuspended,
    restoringDraft,
    setRestoringDraft,
    isRouteHydrated,
    markRouteHydrated,
    suspendDraftLifecycle,
    resumeDraftLifecycle,
    takeOverDraftWithFeedback,
  };
}
