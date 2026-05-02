import { describe, expect, it } from "vitest";
import {
  resolveExpectedCaseUpdatedAt,
  commitHydrationStateWithRef,
  resetLastCommittedUpdatedAtRef,
} from "@/hooks/useSeguimientosCaseState";

describe("resolveExpectedCaseUpdatedAt", () => {
  it("returns the ref value when lastCommittedRef has a value (post-save closure bridge)", () => {
    const ref = { current: "2026-05-01T10:01:00.000Z" };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBe("2026-05-01T10:01:00.000Z");
  });

  it("falls back to currentDraftData.caseMeta.updatedAt when ref is null (first save, no prior response)", () => {
    const ref = { current: null };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBe("2026-05-01T10:00:00.000Z");
  });

  it("returns null when both ref and draftData have no updatedAt", () => {
    const ref = { current: null };
    const draftData = {
      caseMeta: { updatedAt: null },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBeNull();
  });

  it("bridges stale closure: ref wins after being updated between saves (non-fantasma proof)", () => {
    // Simulates the exact pattern in handleSaveBaseStage / handleSaveDirtyStages:
    // 1. First save: ref is null (no prior response), uses stale closure value
    // 2. After response: ref is updated with new server timestamp
    // 3. Second save (same closure): ref has value, wins over stale closure
    const ref = { current: null as string | null };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    // First save — uses draft data (no ref yet)
    const firstResult = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(firstResult).toBe("2026-05-01T10:00:00.000Z");

    // After response, handler updates ref with fresh timestamp
    // (this line corresponds to handleSaveBaseStage / handleSaveDirtyStages
    // setting lastCommittedUpdatedAtRef.current)
    ref.current = "2026-05-01T10:01:00.000Z";

    // Second save (same closure, React hasn't re-rendered yet) — ref wins
    const secondResult = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(secondResult).toBe("2026-05-01T10:01:00.000Z");

    // NON-FANTASMA PROOF: comment out ref.current = "..." above (line ~39).
    // The second assertion fails: expected T1, received T0 (stale closure).
  });
});

describe("commitHydrationStateWithRef", () => {
  it("updates the ref with the hydration updatedAt", () => {
    const ref = { current: null as string | null };
    const hydration = {
      caseMeta: { updatedAt: "2026-05-01T10:01:00.000Z" },
    };

    commitHydrationStateWithRef(hydration, ref);

    expect(ref.current).toBe("2026-05-01T10:01:00.000Z");
  });

  it("sets ref to null when hydration has no updatedAt", () => {
    const ref = { current: "2026-05-01T10:00:00.000Z" };
    const hydration = {
      caseMeta: { updatedAt: undefined },
    };

    commitHydrationStateWithRef(hydration, ref);

    expect(ref.current).toBeNull();
  });
});

describe("resetLastCommittedUpdatedAtRef", () => {
  it("sets ref to null when called (simulates resetToCedulaGate / restoreFromDraftData)", () => {
    const ref = { current: "2026-05-01T10:05:00.000Z" };

    resetLastCommittedUpdatedAtRef(ref);

    expect(ref.current).toBeNull();

    // After reset, next save falls back to draft data
    const draftData = {
      caseMeta: { updatedAt: "2026-05-02T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(result).toBe("2026-05-02T10:00:00.000Z");
  });

  it("is idempotent when ref is already null", () => {
    const ref = { current: null as string | null };

    resetLastCommittedUpdatedAtRef(ref);

    expect(ref.current).toBeNull();
  });
});
