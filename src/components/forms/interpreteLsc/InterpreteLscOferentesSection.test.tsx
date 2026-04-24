// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterpreteLscOferentesSection } from "@/components/forms/interpreteLsc/InterpreteLscOferentesSection";
import { getDefaultInterpreteLscValues } from "@/lib/interpreteLsc";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

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

function renderSection() {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<InterpreteLscValues>({
      defaultValues: getDefaultInterpreteLscValues(),
    });

    return (
      <InterpreteLscOferentesSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
      />
    );
  }

  return render(<TestHarness />);
}

describe("InterpreteLscOferentesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUsuariosRecaSearchMock.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      normalizedQuery: "",
      showNoResults: false,
    });
    useUsuarioRecaDetailMock.mockReturnValue({
      loading: false,
      error: null,
      loadByCedula: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it("usa un solo input editable para la cedula y conserva lo que el usuario escribe", () => {
    const { container } = renderSection();

    const input = screen.getByTestId(
      "oferentes.0.lookup-input"
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1000061994" } });

    expect(input.value).toBe("1000061994");
    expect(
      container.querySelectorAll('[name="oferentes.0.cedula"]')
    ).toHaveLength(1);
  });
});
