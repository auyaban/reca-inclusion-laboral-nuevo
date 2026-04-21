// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import type { Empresa } from "@/lib/store/empresaStore";

const mocks = vi.hoisted(() => ({
  buildDraftSpreadsheetProvisionalName: vi.fn(),
  buildPrewarmHintForForm: vi.fn(),
  isFinalizationPrewarmEnabled: vi.fn(),
}));

vi.mock("@/lib/finalization/documentNaming", () => ({
  buildDraftSpreadsheetProvisionalName: mocks.buildDraftSpreadsheetProvisionalName,
}));

vi.mock("@/lib/finalization/prewarmConfig", () => ({
  isFinalizationPrewarmEnabled: mocks.isFinalizationPrewarmEnabled,
}));

vi.mock("@/lib/finalization/prewarmRegistry", () => ({
  buildPrewarmHintForForm: mocks.buildPrewarmHintForForm,
}));

function Harness(props: {
  step: number;
  ensureDraftIdentity: (
    step: number,
    data: Record<string, unknown>
  ) => Promise<{ ok: boolean; draftId?: string }>;
}) {
  useGooglePrewarm({
    formSlug: "evaluacion",
    empresa: {
      id: 1,
      nombre_empresa: "Empresa Demo",
      nit: "123",
    } as unknown as Empresa,
    formData: {
      asistentes: [{ nombre: "Ana" }],
    },
    step: props.step,
    draftId: "draft-1",
    localDraftSessionId: "local-1",
    ensureDraftIdentity: props.ensureDraftIdentity,
  });

  return null;
}

describe("useGooglePrewarm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.buildDraftSpreadsheetProvisionalName.mockReturnValue(
      "BORRADOR - EVALUACION"
    );
    mocks.buildPrewarmHintForForm.mockReturnValue({
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1}',
      variantKey: "default",
      repeatedCounts: { asistentes: 1 },
      provisionalName: "BORRADOR - EVALUACION",
    });
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("backs off repeated non-409/429 failures for the same request key", async () => {
    const ensureDraftIdentity = vi.fn().mockResolvedValue({
      ok: true,
      draftId: "draft-1",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);

    const view = render(
      <Harness step={1} ensureDraftIdentity={ensureDraftIdentity} />
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    view.rerender(<Harness step={2} ensureDraftIdentity={ensureDraftIdentity} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    view.rerender(<Harness step={3} ensureDraftIdentity={ensureDraftIdentity} />);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    view.rerender(<Harness step={4} ensureDraftIdentity={ensureDraftIdentity} />);

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
