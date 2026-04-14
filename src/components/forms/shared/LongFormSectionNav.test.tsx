import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LongFormSectionNav } from "@/components/forms/shared/LongFormSectionNav";

describe("LongFormSectionNav", () => {
  it("renders all items, their statuses and the draft status block", () => {
    const html = renderToStaticMarkup(
      <LongFormSectionNav
        items={[
          {
            id: "company",
            label: "Empresa",
            shortLabel: "Emp",
            status: "active",
          },
          {
            id: "visit",
            label: "Visita",
            status: "completed",
          },
          {
            id: "observations",
            label: "Observaciones",
            status: "error",
          },
          {
            id: "attendees",
            label: "Asistentes",
            status: "disabled",
          },
        ]}
        activeSectionId="company"
        onSelect={vi.fn()}
        draftStatus={<div>Estado borrador</div>}
      />
    );

    expect(html).toContain("Empresa");
    expect(html).toContain("Visita");
    expect(html).toContain("Observaciones");
    expect(html).toContain("Asistentes");
    expect(html).toContain("Estado borrador");
    expect(html).toContain("border-reca bg-reca text-white");
    expect(html).toContain("border-green-200 bg-green-50 text-green-700");
    expect(html).toContain("border-red-200 bg-red-50 text-red-700");
    expect(html).toContain("border-gray-200 bg-gray-50 text-gray-400");
  });
});
