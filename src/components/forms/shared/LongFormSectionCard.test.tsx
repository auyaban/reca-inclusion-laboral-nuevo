import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LongFormSectionCard } from "@/components/forms/shared/LongFormSectionCard";

describe("LongFormSectionCard", () => {
  it("renders children when expanded and applies the active state class", () => {
    const html = renderToStaticMarkup(
      <LongFormSectionCard
        id="visit"
        title="Datos de la visita"
        description="Descripción"
        status="active"
        collapsed={false}
        onToggle={vi.fn()}
      >
        <div>Contenido visible</div>
      </LongFormSectionCard>
    );

    expect(html).toContain("Datos de la visita");
    expect(html).toContain("Descripción");
    expect(html).toContain("Contenido visible");
    expect(html).toContain("border-reca shadow-md");
    expect(html).toContain("Colapsar");
  });

  it("hides children when collapsed and applies the error state class", () => {
    const html = renderToStaticMarkup(
      <LongFormSectionCard
        id="attendees"
        title="Asistentes"
        status="error"
        collapsed
        onToggle={vi.fn()}
      >
        <div>No visible</div>
      </LongFormSectionCard>
    );

    expect(html).toContain("Asistentes");
    expect(html).not.toContain("No visible");
    expect(html).toContain("border-red-200");
    expect(html).toContain("Expandir");
  });

  it("omits the toggle button when no toggle handler is provided", () => {
    const html = renderToStaticMarkup(
      <LongFormSectionCard
        id="overview"
        title="Resumen"
        status="idle"
        collapsed={false}
      >
        <div>Contenido</div>
      </LongFormSectionCard>
    );

    expect(html).toContain("Resumen");
    expect(html).toContain("Contenido");
    expect(html).not.toContain("Colapsar");
    expect(html).not.toContain("Expandir");
  });
});
