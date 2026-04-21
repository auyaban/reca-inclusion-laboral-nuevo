// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsuarioRecaLookupField } from "@/components/forms/shared/UsuarioRecaLookupField";

const { useUsuariosRecaSearchMock, useUsuarioRecaDetailMock } = vi.hoisted(
  () => ({
    useUsuariosRecaSearchMock: vi.fn(),
    useUsuarioRecaDetailMock: vi.fn(),
  })
);

vi.mock("@/hooks/useUsuariosRecaSearch", () => ({
  useUsuariosRecaSearch: useUsuariosRecaSearchMock,
}));

vi.mock("@/hooks/useUsuarioRecaDetail", () => ({
  useUsuarioRecaDetail: useUsuarioRecaDetailMock,
}));

const registration = {
  name: "cedula",
  onBlur: vi.fn(),
  onChange: vi.fn(),
  ref: vi.fn(),
};

describe("UsuarioRecaLookupField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUsuarioRecaDetailMock.mockReturnValue({
      loading: false,
      error: null,
      loadByCedula: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it("hides the duplicated suggestion list when the loaded record already matches the lookup value", () => {
    useUsuariosRecaSearchMock.mockReturnValue({
      results: [
        {
          cedula_usuario: "1000061994",
          nombre_usuario: "Ana Perez",
        },
      ],
      loading: false,
      error: null,
      normalizedQuery: "1000061994",
      showNoResults: false,
    });

    render(
      <UsuarioRecaLookupField
        id="cedula"
        dataTestIdBase="vinculado"
        value="1000061994"
        selectedRecordCedula="1000061994"
        hasReplaceTargetData
        registration={registration}
        onSuggestionSelect={vi.fn()}
        onLoadRecord={vi.fn()}
      />
    );

    expect(screen.queryByTestId("vinculado.lookup-results")).toBeNull();
    expect(
      screen.queryByText(
        "Esta fila ya tiene datos diligenciados. Al cargar, se reemplazaran los campos mapeados de esta persona."
      )
    ).toBeNull();
    expect(
      screen.getByText(
        "Escribe la cedula y luego usa Reemplazar datos. Tambien puedes presionar Enter para cargar el registro exacto."
      )
    ).not.toBeNull();
  });

  it("still renders search suggestions when there is no loaded record yet", () => {
    useUsuariosRecaSearchMock.mockReturnValue({
      results: [
        {
          cedula_usuario: "1000061994",
          nombre_usuario: "Ana Perez",
        },
      ],
      loading: false,
      error: null,
      normalizedQuery: "1000061994",
      showNoResults: false,
    });

    render(
      <UsuarioRecaLookupField
        id="cedula"
        dataTestIdBase="vinculado"
        value="1000061994"
        hasReplaceTargetData={false}
        registration={registration}
        onSuggestionSelect={vi.fn()}
        onLoadRecord={vi.fn()}
      />
    );

    expect(screen.getByTestId("vinculado.lookup-results")).not.toBeNull();
    expect(
      screen.getByTestId("vinculado.lookup-suggestion-1000061994")
    ).not.toBeNull();
  });
});
