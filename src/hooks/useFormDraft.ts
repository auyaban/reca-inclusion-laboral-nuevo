"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type DraftMeta = {
  step: number;
  data: Record<string, unknown>;
  empresa_nombre?: string;
  updated_at?: string;
};

type Options = {
  slug: string;
  empresaNit: string;
  empresaNombre?: string;
};

/**
 * Hook reutilizable de autosave + borradores para todos los formularios.
 *
 * - Autosave: guarda en localStorage cada vez que cambian los datos (debounce 800ms)
 * - saveDraft(): persiste en Supabase (form_drafts) — llamar al click "Guardar borrador"
 * - loadDraft(): carga desde Supabase y retorna los datos
 * - clearDraft(): borra de Supabase y localStorage (llamar al finalizar)
 * - hasDraft: true si existe borrador remoto para este formulario+empresa
 */
export function useFormDraft({ slug, empresaNit, empresaNombre }: Options) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lsKey = `draft__${slug}__${empresaNit}`;

  // ── Al montar: comprobar si existe borrador remoto ──────────────────────
  useEffect(() => {
    if (!empresaNit) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("form_drafts")
        .select("step, data, empresa_nombre, updated_at")
        .eq("form_slug", slug)
        .eq("empresa_nit", empresaNit)
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHasDraft(true);
            setDraftMeta({
              step: data.step ?? 0,
              data: (data.data as Record<string, unknown>) ?? {},
              empresa_nombre: data.empresa_nombre ?? undefined,
              updated_at: data.updated_at ?? undefined,
            });
          }
        });
    });
  }, [slug, empresaNit]);

  // ── Autosave a localStorage (debounced) ─────────────────────────────────
  const autosave = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(lsKey, JSON.stringify({ step, data, ts: Date.now() }));
        } catch {
          // localStorage no disponible (modo privado, etc.)
        }
      }, 800);
    },
    [lsKey]
  );

  // ── Cargar desde localStorage (fallback rápido) ─────────────────────────
  const loadLocal = useCallback((): DraftMeta | null => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { step: parsed.step ?? 0, data: parsed.data ?? {} };
    } catch {
      return null;
    }
  }, [lsKey]);

  // ── Guardar borrador en Supabase ─────────────────────────────────────────
  const saveDraft = useCallback(
    async (step: number, data: Record<string, unknown>): Promise<boolean> => {
      setSavingDraft(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { error } = await supabase.from("form_drafts").upsert(
          {
            user_id: session.user.id,
            form_slug: slug,
            empresa_nit: empresaNit,
            empresa_nombre: empresaNombre ?? null,
            step,
            data,
          },
          { onConflict: "user_id,form_slug,empresa_nit" }
        );
        if (error) throw error;
        setHasDraft(true);
        setDraftSavedAt(new Date());
        // también persiste en localStorage
        localStorage.setItem(lsKey, JSON.stringify({ step, data, ts: Date.now() }));
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [slug, empresaNit, empresaNombre, lsKey]
  );

  // ── Borrar borrador (al finalizar el formulario) ─────────────────────────
  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(lsKey);
    } catch { /* ok */ }
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase
        .from("form_drafts")
        .delete()
        .eq("user_id", session.user.id)
        .eq("form_slug", slug)
        .eq("empresa_nit", empresaNit);
      setHasDraft(false);
      setDraftMeta(null);
    } catch { /* ok */ }
  }, [slug, empresaNit, lsKey]);

  return {
    hasDraft,
    draftMeta,
    savingDraft,
    draftSavedAt,
    autosave,
    loadLocal,
    saveDraft,
    clearDraft,
  };
}
