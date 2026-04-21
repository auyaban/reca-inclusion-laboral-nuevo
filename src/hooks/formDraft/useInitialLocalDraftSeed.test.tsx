// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";

function Harness(props: {
  enabled: boolean;
  hydrationSettled: boolean;
  seedKey: string | null;
  localDraftSavedAt: Date | null;
  hasPendingAutosave: boolean;
  hasLocalDirtyChanges: boolean;
  autosave: (
    step: number,
    data: Record<string, unknown>,
    options?: { forcePersist?: boolean }
  ) => void;
}) {
  useInitialLocalDraftSeed({
    enabled: props.enabled,
    hydrationSettled: props.hydrationSettled,
    seedKey: props.seedKey,
    step: 1,
    getValues: () => ({ empresa: "Empresa Demo" }),
    autosave: props.autosave,
    localDraftSavedAt: props.localDraftSavedAt,
    hasPendingAutosave: props.hasPendingAutosave,
    hasLocalDirtyChanges: props.hasLocalDirtyChanges,
  });

  return null;
}

describe("useInitialLocalDraftSeed", () => {
  it("seeds a forced local snapshot once when the form becomes ready", () => {
    const autosave = vi.fn();

    const view = render(
      <Harness
        enabled={false}
        hydrationSettled={false}
        seedKey={null}
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).not.toHaveBeenCalled();

    view.rerender(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).toHaveBeenCalledTimes(1);
    expect(autosave).toHaveBeenCalledWith(
      1,
      { empresa: "Empresa Demo" },
      { forcePersist: true }
    );

    view.rerender(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).toHaveBeenCalledTimes(1);
  });

  it("does not seed when there is already local save state or pending changes", () => {
    const autosave = vi.fn();

    const view = render(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={new Date("2026-04-20T10:00:00.000Z")}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).not.toHaveBeenCalled();

    view.rerender(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-2:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).not.toHaveBeenCalled();
  });

  it("does not seed until hydration settles for the current route", () => {
    const autosave = vi.fn();

    const view = render(
      <Harness
        enabled
        hydrationSettled={false}
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).not.toHaveBeenCalled();

    view.rerender(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).toHaveBeenCalledTimes(1);
  });

  it("does not seed a new key while hydration is still unsettled", () => {
    const autosave = vi.fn();

    const view = render(
      <Harness
        enabled
        hydrationSettled={false}
        seedKey="draft-1:empresa-1"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    view.rerender(
      <Harness
        enabled
        hydrationSettled={false}
        seedKey="draft-2:empresa-2"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).not.toHaveBeenCalled();

    view.rerender(
      <Harness
        enabled
        hydrationSettled
        seedKey="draft-2:empresa-2"
        localDraftSavedAt={null}
        hasPendingAutosave={false}
        hasLocalDirtyChanges={false}
        autosave={autosave}
      />
    );

    expect(autosave).toHaveBeenCalledTimes(1);
    expect(autosave).toHaveBeenLastCalledWith(
      1,
      { empresa: "Empresa Demo" },
      { forcePersist: true }
    );
  });
});
