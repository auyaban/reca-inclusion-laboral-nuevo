// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LongFormFailedVisitNotice } from "@/components/forms/shared/LongFormFailedVisitNotice";

afterEach(() => {
  cleanup();
});

describe("LongFormFailedVisitNotice", () => {
  it("shows an active CTA before the failed visit is applied", () => {
    const onRequestApply = vi.fn();

    render(
      <LongFormFailedVisitNotice
        title="Visita fallida"
        description="Descripcion previa"
        appliedMessage="Mensaje aplicado"
        actionLabel="Marcar visita fallida"
        appliedActionLabel="Visita fallida aplicada"
        failedVisitAppliedAt={null}
        onRequestApply={onRequestApply}
      />
    );

    expect(screen.getByText("Descripcion previa")).not.toBeNull();

    const button = screen.getByTestId("long-form-failed-visit-button");
    expect(button.getAttribute("disabled")).toBeNull();

    fireEvent.click(button);

    expect(onRequestApply).toHaveBeenCalledTimes(1);
  });

  it("shows a persistent applied state and disables the CTA afterwards", () => {
    const onRequestApply = vi.fn();

    render(
      <LongFormFailedVisitNotice
        title="Visita fallida"
        description="Descripcion previa"
        appliedMessage="Mensaje aplicado"
        actionLabel="Marcar visita fallida"
        appliedActionLabel="Visita fallida aplicada"
        failedVisitAppliedAt="2026-04-24T12:00:00.000Z"
        onRequestApply={onRequestApply}
      />
    );

    expect(screen.getByText("Mensaje aplicado")).not.toBeNull();

    const button = screen.getByTestId("long-form-failed-visit-button");
    expect(button.getAttribute("disabled")).not.toBeNull();
    expect(button.textContent).toBe("Visita fallida aplicada");

    fireEvent.click(button);

    expect(onRequestApply).not.toHaveBeenCalled();
  });
});
