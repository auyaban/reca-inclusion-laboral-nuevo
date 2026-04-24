// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetProfesionalesCatalogCache,
  useProfesionalesCatalog,
} from "@/hooks/useProfesionalesCatalog";

function Harness() {
  const { profesionales, refresh } = useProfesionalesCatalog();

  return (
    <div>
      <button type="button" onClick={() => void refresh()}>
        refresh
      </button>
      <button type="button" onClick={() => void refresh({ force: true })}>
        force
      </button>
      <div data-testid="profesionales">
        {profesionales.map((item) => item.nombre_profesional).join(",")}
      </div>
    </div>
  );
}

describe("useProfesionalesCatalog", () => {
  beforeEach(() => {
    resetProfesionalesCatalogCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetProfesionalesCatalogCache();
  });

  it("uses cache on refresh() and bypasses it on refresh({ force: true })", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            nombre_profesional: "Laura RECA",
            cargo_profesional: "Profesional RECA",
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            nombre_profesional: "Marta RECA",
            cargo_profesional: "Profesional RECA",
          },
        ],
      } as Response);

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("profesionales").textContent).toBe("Laura RECA");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "force" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("profesionales").textContent).toBe("Marta RECA");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
