"use client";

import { useCallback, useEffect, useState } from "react";
import { isAppRole, type AppRole } from "@/lib/auth/appRoles";

type CurrentRolePayload = {
  email?: string | null;
  displayName?: string | null;
  usuarioLogin?: string | null;
  profesionalId?: number | null;
  roles?: unknown;
  error?: string;
};

type CurrentRoleState = {
  loading: boolean;
  error: string | null;
  email: string | null;
  displayName: string | null;
  usuarioLogin: string | null;
  profesionalId: number | null;
  roles: AppRole[];
};

export type CurrentRoleInitialData = Omit<CurrentRoleState, "loading" | "error">;

type UseCurrentRoleOptions = {
  initialData?: CurrentRoleInitialData | null;
};

export type UseCurrentRoleResult = CurrentRoleState & {
  hasRole: (role: AppRole) => boolean;
};

const INITIAL_STATE: CurrentRoleState = {
  loading: true,
  error: null,
  email: null,
  displayName: null,
  usuarioLogin: null,
  profesionalId: null,
  roles: [],
};

function parseRoles(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAppRole);
}

function readError(payload: CurrentRolePayload) {
  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : "No se pudo cargar el perfil.";
}

function buildInitialState(initialData?: CurrentRoleInitialData | null) {
  if (!initialData) {
    return INITIAL_STATE;
  }

  return {
    ...initialData,
    roles: parseRoles(initialData.roles),
    loading: false,
    error: null,
  };
}

export function useCurrentRole(
  options: UseCurrentRoleOptions = {}
): UseCurrentRoleResult {
  const hasInitialData = Boolean(options.initialData);
  const [state, setState] = useState<CurrentRoleState>(() =>
    buildInitialState(options.initialData)
  );

  useEffect(() => {
    if (hasInitialData) {
      return;
    }

    let cancelled = false;

    async function loadCurrentRole() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => ({}))) as CurrentRolePayload;

        if (!response.ok) {
          throw new Error(readError(payload));
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            email: payload.email ?? null,
            displayName: payload.displayName ?? null,
            usuarioLogin: payload.usuarioLogin ?? null,
            profesionalId: payload.profesionalId ?? null,
            roles: parseRoles(payload.roles),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            ...INITIAL_STATE,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el perfil.",
          });
        }
      }
    }

    void loadCurrentRole();

    return () => {
      cancelled = true;
    };
  }, [hasInitialData]);

  const hasRole = useCallback(
    (role: AppRole) => state.roles.includes(role),
    [state.roles]
  );

  return {
    ...state,
    hasRole,
  };
}
