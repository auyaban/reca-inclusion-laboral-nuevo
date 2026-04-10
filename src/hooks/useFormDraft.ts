"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";

export type DraftMeta = {
  id: string;
  form_slug: string;
  step: number;
  data: Record<string, unknown>;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot: Empresa | null;
  updated_at?: string;
  created_at?: string;
};

type Options = {
  slug?: string | null;
  empresa?: Empresa | null;
  initialDraftId?: string | null;
  initialLocalDraftSessionId?: string | null;
  loadMatchingDrafts?: boolean;
  loadAllDrafts?: boolean;
};

type SaveDraftResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

type LoadDraftResult = {
  draft: DraftMeta | null;
  empresa: Empresa | null;
  error?: string;
};

type LocalDraft = {
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
  updatedAt: string | null;
};

type LocalDraftEnvelopeV2 = {
  version: 2;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
};

type DraftSelectResult = {
  data: unknown;
  error: unknown;
};

type DraftRow = {
  id: string;
  form_slug: string;
  empresa_nit: string;
  empresa_nombre: string | null;
  empresa_snapshot: unknown;
  step: number | null;
  data: Record<string, unknown> | null;
  updated_at: string | null;
  created_at: string | null;
};

type DraftSchemaMode = "unknown" | "legacy" | "extended";

const EXTENDED_DRAFT_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "empresa_snapshot",
  "step",
  "data",
  "updated_at",
  "created_at",
].join(", ");

const LEGACY_DRAFT_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "data",
  "updated_at",
].join(", ");

let draftSchemaMode: DraftSchemaMode = "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraftData(value: unknown) {
  return isRecord(value) ? value : {};
}

function isMissingDraftSchemaError(error: unknown) {
  return isRecord(error) && error.code === "42703";
}

function getDraftFields() {
  return draftSchemaMode === "legacy"
    ? LEGACY_DRAFT_FIELDS
    : EXTENDED_DRAFT_FIELDS;
}

async function runDraftSelect(
  queryFactory: (fields: string) => PromiseLike<DraftSelectResult>
): Promise<DraftSelectResult> {
  const fields = getDraftFields();
  let result = await queryFactory(fields);

  if (
    draftSchemaMode !== "legacy" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    draftSchemaMode = "legacy";
    result = await queryFactory(LEGACY_DRAFT_FIELDS);
  } else if (
    draftSchemaMode === "unknown" &&
    isRecord(result) &&
    !result.error &&
    fields === EXTENDED_DRAFT_FIELDS
  ) {
    draftSchemaMode = "extended";
  }

  return result;
}

function createSessionId() {
  return crypto.randomUUID();
}

function buildDraftMeta(row: DraftRow, empresaSnapshot: Empresa | null): DraftMeta {
  return {
    id: row.id,
    form_slug: row.form_slug,
    step: row.step ?? 0,
    data: row.data ?? {},
    empresa_nit: row.empresa_nit,
    empresa_nombre: row.empresa_nombre ?? undefined,
    empresa_snapshot: empresaSnapshot,
    updated_at: row.updated_at ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

function getDraftWritePayload(
  slug: string,
  empresa: Empresa,
  step: number,
  data: Record<string, unknown>
) {
  const basePayload = {
    form_slug: slug,
    empresa_nit: empresa.nit_empresa,
    empresa_nombre: empresa.nombre_empresa,
    step,
    data,
  };

  if (draftSchemaMode === "legacy") {
    return basePayload;
  }

  return {
    ...basePayload,
    empresa_snapshot: empresa,
  };
}

async function getEmpresaFromNit(nit: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(1)
    .maybeSingle();

  return (data as Empresa | null) ?? null;
}

function getStorageKey(
  slug: string | null | undefined,
  draftId: string | null,
  localDraftSessionId: string
) {
  if (!slug) {
    return null;
  }

  if (draftId) {
    return `draft__${slug}__${draftId}`;
  }

  return `draft__${slug}__session__${localDraftSessionId}`;
}

function saveLocalCopy(
  storageKey: string | null,
  step: number,
  data: Record<string, unknown>,
  empresaSnapshot: Empresa | null
) {
  if (!storageKey) return;

  try {
    const updatedAt = new Date().toISOString();
    const payload: LocalDraftEnvelopeV2 = {
      version: 2,
      step,
      data,
      empresaSnapshot,
      updatedAt,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    return updatedAt;
  } catch {
    // localStorage no disponible
    return null;
  }
}

function removeLocalCopy(storageKey: string | null) {
  if (!storageKey) return;

  try {
    localStorage.removeItem(storageKey);
  } catch {
    // localStorage no disponible
  }
}

function parseLegacyUpdatedAt(ts: unknown) {
  if (typeof ts === "number" && Number.isFinite(ts)) {
    return new Date(ts).toISOString();
  }

  if (typeof ts === "string" && ts.trim()) {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function readLocalCopy(storageKey: string | null): LocalDraft | null {
  if (!storageKey) {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    if (parsed.version === 2) {
      return {
        step: typeof parsed.step === "number" ? parsed.step : 0,
        data: normalizeDraftData(parsed.data),
        empresa: parseEmpresaSnapshot(parsed.empresaSnapshot),
        updatedAt:
          typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
            ? parsed.updatedAt
            : null,
      };
    }

    return {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: normalizeDraftData(parsed.data),
      empresa: null,
      updatedAt: parseLegacyUpdatedAt(parsed.ts),
    };
  } catch {
    return null;
  }
}

export function useFormDraft({
  slug,
  empresa,
  initialDraftId,
  initialLocalDraftSessionId,
  loadMatchingDrafts = true,
  loadAllDrafts = false,
}: Options) {
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    initialDraftId ?? null
  );
  const [localDraftSessionId, setLocalDraftSessionId] = useState(
    initialLocalDraftSessionId?.trim() || createSessionId()
  );
  const [activeDraft, setActiveDraft] = useState<DraftMeta | null>(null);
  const [matchingDrafts, setMatchingDrafts] = useState<DraftMeta[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftMeta[]>([]);
  const [loadingMatchingDrafts, setLoadingMatchingDrafts] = useState(false);
  const [loadingAllDrafts, setLoadingAllDrafts] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const savingDraftRef = useRef(false);
  const hasPendingAutosaveRef = useRef(false);
  const latestLocalDraftRef = useRef<LocalDraft | null>(null);

  useEffect(() => {
    setActiveDraftId(initialDraftId ?? null);
  }, [initialDraftId]);

  useEffect(() => {
    if (!activeDraftId && initialLocalDraftSessionId?.trim()) {
      setLocalDraftSessionId(initialLocalDraftSessionId);
    }
  }, [activeDraftId, initialLocalDraftSessionId]);

  const storageKey = useMemo(
    () => getStorageKey(slug, activeDraftId, localDraftSessionId),
    [slug, activeDraftId, localDraftSessionId]
  );

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    savingDraftRef.current = savingDraft;
  }, [savingDraft]);

  useEffect(() => {
    hasPendingAutosaveRef.current = hasPendingAutosave;
  }, [hasPendingAutosave]);

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user.id ?? null;
  }, []);

  const refreshMatchingDrafts = useCallback(async () => {
    if (!loadMatchingDrafts || !slug || !empresa?.nit_empresa) {
      setMatchingDrafts([]);
      return;
    }

    setLoadingMatchingDrafts(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setMatchingDrafts([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await runDraftSelect((fields) =>
        supabase
          .from("form_drafts")
          .select(fields)
          .eq("user_id", userId)
          .eq("form_slug", slug)
          .eq("empresa_nit", empresa.nit_empresa)
          .order("updated_at", { ascending: false })
      );

      if (error) {
        throw error;
      }

      const drafts = (((data ?? []) as unknown) as DraftRow[]).map((row) =>
        buildDraftMeta(row, parseEmpresaSnapshot(row.empresa_snapshot))
      );

      setMatchingDrafts(drafts);
    } catch {
      setMatchingDrafts([]);
    } finally {
      setLoadingMatchingDrafts(false);
    }
  }, [empresa?.nit_empresa, getUserId, loadMatchingDrafts, slug]);

  const refreshAllDrafts = useCallback(async () => {
    if (!loadAllDrafts) {
      return;
    }

    setLoadingAllDrafts(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setAllDrafts([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await runDraftSelect((fields) =>
        supabase
          .from("form_drafts")
          .select(fields)
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
      );

      if (error) {
        throw error;
      }

      const drafts = (((data ?? []) as unknown) as DraftRow[]).map((row) =>
        buildDraftMeta(row, parseEmpresaSnapshot(row.empresa_snapshot))
      );

      setAllDrafts(drafts);
    } catch {
      setAllDrafts([]);
    } finally {
      setLoadingAllDrafts(false);
    }
  }, [getUserId, loadAllDrafts]);

  useEffect(() => {
    refreshMatchingDrafts();
  }, [refreshMatchingDrafts]);

  useEffect(() => {
    refreshAllDrafts();
  }, [refreshAllDrafts]);

  const commitLocalCopy = useCallback(
    ({
      payload = latestLocalDraftRef.current,
      storage = storageKeyRef.current,
      updateState = true,
    }: {
      payload?: LocalDraft | null;
      storage?: string | null;
      updateState?: boolean;
    } = {}) => {
      if (!storage || !payload) {
        return null;
      }

      const updatedAt = saveLocalCopy(
        storage,
        payload.step,
        payload.data,
        payload.empresa
      );

      if (!updatedAt) {
        return null;
      }

      if (updateState) {
        setLocalDraftSavedAt(new Date(updatedAt));
        setHasPendingAutosave(false);
      }

      return updatedAt;
    },
    []
  );

  const flushAutosave = useCallback(() => {
    if (!hasPendingAutosaveRef.current) {
      return false;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const updatedAt = commitLocalCopy();
    if (!updatedAt) {
      setHasPendingAutosave(false);
      return false;
    }

    return true;
  }, [commitLocalCopy]);

  const autosave = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (!storageKey) return;

      latestLocalDraftRef.current = {
        step,
        data,
        empresa: empresa ?? null,
        updatedAt: null,
      };
      setHasPendingAutosave(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        commitLocalCopy();
      }, 800);
    },
    [commitLocalCopy, empresa, storageKey]
  );

  const loadLocal = useCallback(() => {
    const localDraft = readLocalCopy(storageKey);
    setLocalDraftSavedAt(
      localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null
    );
    setHasPendingAutosave(false);
    return localDraft;
  }, [storageKey]);

  const loadDraft = useCallback(
    async (draftId: string): Promise<LoadDraftResult> => {
      setLoadingDraft(true);
      try {
        const userId = await getUserId();
        if (!userId) {
          return { draft: null, empresa: null, error: "No autenticado" };
        }

        const supabase = createClient();
        const { data, error } = await runDraftSelect((fields) =>
          supabase
            .from("form_drafts")
            .select(fields)
            .eq("user_id", userId)
            .eq("id", draftId)
            .maybeSingle()
        );

        if (error) {
          throw error;
        }

        if (!data) {
          return { draft: null, empresa: null, error: "Borrador no encontrado" };
        }

        const row = (data as unknown) as DraftRow;
        let empresaSnapshot = parseEmpresaSnapshot(row.empresa_snapshot);

        if (!empresaSnapshot && row.empresa_nit) {
          empresaSnapshot = await getEmpresaFromNit(row.empresa_nit);
        }

        if (!empresaSnapshot) {
          return {
            draft: null,
            empresa: null,
            error: "No se pudo reconstruir la empresa de este borrador.",
          };
        }

        const draft = buildDraftMeta(row, empresaSnapshot);
        setActiveDraftId(draft.id);
        setActiveDraft(draft);
        latestLocalDraftRef.current = {
          step: draft.step,
          data: draft.data,
          empresa: empresaSnapshot,
          updatedAt: draft.updated_at ?? null,
        };
        const updatedAt = saveLocalCopy(
          getStorageKey(row.form_slug, row.id, localDraftSessionId),
          draft.step,
          draft.data,
          empresaSnapshot
        );
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);

        return {
          draft,
          empresa: empresaSnapshot,
        };
      } catch (error) {
        return {
          draft: null,
          empresa: null,
          error:
            error instanceof Error ? error.message : "No se pudo cargar el borrador.",
        };
      } finally {
        setLoadingDraft(false);
      }
    },
    [getUserId, localDraftSessionId]
  );

  const saveDraft = useCallback(
    async (step: number, data: Record<string, unknown>): Promise<SaveDraftResult> => {
      if (!slug || !empresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para guardar el borrador.",
        };
      }

      setSavingDraft(true);
      flushAutosave();

      const previousStorageKey = getStorageKey(slug, activeDraftId, localDraftSessionId);

      try {
        const userId = await getUserId();
        if (!userId) {
          return { ok: false, error: "No autenticado" };
        }

        const supabase = createClient();
        const payload = getDraftWritePayload(slug, empresa, step, data);

        let nextDraftId = activeDraftId;

        if (activeDraftId) {
          let { error } = await supabase
            .from("form_drafts")
            .update(payload)
            .eq("id", activeDraftId)
            .eq("user_id", userId);

          if (isMissingDraftSchemaError(error)) {
            draftSchemaMode = "legacy";
            ({ error } = await supabase
              .from("form_drafts")
              .update(getDraftWritePayload(slug, empresa, step, data))
              .eq("id", activeDraftId)
              .eq("user_id", userId));
          } else if (!error && draftSchemaMode === "unknown") {
            draftSchemaMode = "extended";
          }

          if (error) {
            throw error;
          }
        } else {
          let createdDraft: unknown;
          let error: unknown;

          if (draftSchemaMode === "legacy") {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .upsert(
                {
                  user_id: userId,
                  ...getDraftWritePayload(slug, empresa, step, data),
                },
                { onConflict: "user_id,form_slug,empresa_nit" }
              )
              .select(LEGACY_DRAFT_FIELDS)
              .single());
          } else {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .insert({
                user_id: userId,
                ...payload,
              })
              .select(getDraftFields())
              .single());

            if (isMissingDraftSchemaError(error)) {
              draftSchemaMode = "legacy";
              ({ data: createdDraft, error } = await supabase
                .from("form_drafts")
                .upsert(
                  {
                    user_id: userId,
                    ...getDraftWritePayload(slug, empresa, step, data),
                  },
                  { onConflict: "user_id,form_slug,empresa_nit" }
                )
                .select(LEGACY_DRAFT_FIELDS)
                .single());
            } else if (!error && draftSchemaMode === "unknown") {
              draftSchemaMode = "extended";
            }
          }

          if (error) {
            throw error;
          }

          nextDraftId = ((createdDraft as unknown) as DraftRow).id;
          setActiveDraftId(nextDraftId);
        }

        const nextStorageKey = getStorageKey(slug, nextDraftId ?? null, localDraftSessionId);
        latestLocalDraftRef.current = {
          step,
          data,
          empresa,
          updatedAt: null,
        };
        const updatedAt = saveLocalCopy(nextStorageKey, step, data, empresa);
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);

        if (nextStorageKey !== previousStorageKey) {
          removeLocalCopy(previousStorageKey);
        }

        const nextMeta: DraftMeta = {
          id: nextDraftId!,
          form_slug: slug,
          step,
          data,
          empresa_nit: empresa.nit_empresa,
          empresa_nombre: empresa.nombre_empresa,
          empresa_snapshot: empresa,
        };

        setActiveDraft(nextMeta);
        setDraftSavedAt(new Date());
        await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);

        return {
          ok: true,
          draftId: nextDraftId ?? undefined,
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "No se pudo guardar el borrador.",
        };
      } finally {
        setSavingDraft(false);
      }
    },
    [
      activeDraftId,
      empresa,
      flushAutosave,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      slug,
    ]
  );

  const deleteDraft = useCallback(
    async (draftId: string) => {
      try {
        const userId = await getUserId();
        if (!userId) return;

        const supabase = createClient();
        await supabase
          .from("form_drafts")
          .delete()
          .eq("id", draftId)
          .eq("user_id", userId);

        removeLocalCopy(getStorageKey(slug, draftId, localDraftSessionId));

        if (draftId === activeDraftId) {
          latestLocalDraftRef.current = null;
          setActiveDraftId(null);
          setActiveDraft(null);
          setDraftSavedAt(null);
          setLocalDraftSavedAt(null);
          setHasPendingAutosave(false);
        }

        await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);
      } catch {
        // el borrado es best effort
      }
    },
    [
      activeDraftId,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      slug,
    ]
  );

  const clearDraft = useCallback(
    async (draftId = activeDraftId) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      latestLocalDraftRef.current = null;
      setHasPendingAutosave(false);
      setLocalDraftSavedAt(null);
      setDraftSavedAt(null);

      const currentStorageKey = getStorageKey(slug, draftId ?? null, localDraftSessionId);
      removeLocalCopy(currentStorageKey);

      if (!draftId) {
        return;
      }

      await deleteDraft(draftId);
    },
    [activeDraftId, deleteDraft, localDraftSessionId, slug]
  );

  const startNewDraftSession = useCallback((sessionId = createSessionId()) => {
    flushAutosave();
    latestLocalDraftRef.current = null;
    setActiveDraftId(null);
    setActiveDraft(null);
    setLocalDraftSessionId(sessionId);
    setDraftSavedAt(null);
    setLocalDraftSavedAt(null);
    setHasPendingAutosave(false);
    return sessionId;
  }, [flushAutosave]);

  useEffect(() => {
    const handlePageHide = () => {
      flushAutosave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingAutosaveRef.current && !savingDraftRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (hasPendingAutosaveRef.current) {
        commitLocalCopy({ updateState: false });
      }
    };
  }, [commitLocalCopy, flushAutosave]);

  return {
    activeDraftId,
    activeDraft,
    localDraftSessionId,
    matchingDrafts,
    allDrafts,
    loadingDraft,
    loadingMatchingDrafts,
    loadingAllDrafts,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    hasPendingAutosave,
    autosave,
    loadLocal,
    flushAutosave,
    loadDraft,
    saveDraft,
    clearDraft,
    deleteDraft,
    refreshMatchingDrafts,
    refreshAllDrafts,
    startNewDraftSession,
  };
}
