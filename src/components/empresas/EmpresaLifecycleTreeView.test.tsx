// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmpresaLifecycleTreeView from "@/components/empresas/EmpresaLifecycleTreeView";
import type { EmpresaLifecycleTree } from "@/lib/empresas/lifecycle-tree";

const lifecycleTree: EmpresaLifecycleTree = {
  empresa: {
    id: "empresa-1",
    nombreEmpresa: "Manufacturas Reca",
    nitEmpresa: "900123456",
    cajaCompensacion: "Compensar",
    companyType: "compensar",
  },
  summary: {
    companyStages: 1,
    profiles: 1,
    people: 2,
    archivedBranches: 1,
    unclassifiedEvidence: 1,
    dataQualityWarnings: 2,
  },
  companyStages: [
    {
      type: "presentacion",
      label: "Presentacion del programa",
      latestAt: "2026-04-15",
      evidence: [
        {
          id: "ev-presentacion",
          registroId: "registro-presentacion",
          type: "presentacion",
          label: "Presentacion del programa",
          sourceFormat: "Acta presentacion",
          date: "2026-04-15",
          createdAt: "2026-04-15T15:00:00.000Z",
          professionalName: "Sara Zambrano",
          cargo: null,
          personCedula: null,
          personName: null,
          seguimientoNumero: null,
          pdfLink: "https://drive.google.com/presentacion.pdf",
          sheetLink: "https://docs.google.com/spreadsheets/d/presentacion",
          actaRef: "ACTA-001",
          source: "google-sheets",
          schemaVersion: "1",
          warnings: [],
        },
      ],
      warnings: [],
    },
  ],
  profileBranches: [
    {
      id: "profile:operario",
      cargo: "Operario logistico",
      cargoKey: "operario logistico",
      latestAt: "2026-04-17",
      evidence: [
        {
          id: "ev-vacante",
          registroId: "registro-vacante",
          type: "condiciones-vacante",
          label: "Condiciones de vacante",
          sourceFormat: "Revision condiciones",
          date: "2026-04-17",
          createdAt: "2026-04-17T15:00:00.000Z",
          professionalName: "Sara Zambrano",
          cargo: "Operario logistico",
          personCedula: null,
          personName: null,
          seguimientoNumero: null,
          pdfLink: null,
          sheetLink: null,
          actaRef: "ACTA-002",
          source: "google-sheets",
          schemaVersion: "1",
          warnings: [],
        },
      ],
      people: [
        {
          cedula: "100200300",
          nombre: "Luis Gomez",
          cargo: "Operario logistico",
          status: "en_seguimiento",
          selectedAt: "2026-04-20",
          contractedAt: "2026-04-22",
          evidence: [
            {
              id: "ev-seleccion",
              registroId: "registro-seleccion",
              type: "seleccion",
              label: "Seleccion",
              sourceFormat: "Acta seleccion",
              date: "2026-04-20",
              createdAt: "2026-04-20T15:00:00.000Z",
              professionalName: "Sara Zambrano",
              cargo: "Operario logistico",
              personCedula: "100200300",
              personName: "Luis Gomez",
              seguimientoNumero: null,
              pdfLink: null,
              sheetLink: "https://docs.google.com/spreadsheets/d/seleccion",
              actaRef: "ACTA-003",
              source: "google-sheets",
              schemaVersion: "1",
              warnings: [],
            },
          ],
          seguimientos: [
            {
              id: "ev-seguimiento",
              registroId: "registro-seguimiento",
              type: "seguimiento",
              label: "Seguimiento 1",
              sourceFormat: "Acta seguimiento",
              date: "2026-04-29",
              createdAt: "2026-04-29T15:00:00.000Z",
              professionalName: "Sara Zambrano",
              cargo: "Operario logistico",
              personCedula: "100200300",
              personName: "Luis Gomez",
              seguimientoNumero: 1,
              pdfLink: "https://drive.google.com/seguimiento.pdf",
              sheetLink: null,
              actaRef: "ACTA-004",
              source: "google-sheets",
              schemaVersion: "1",
              warnings: [],
            },
          ],
          warnings: [],
        },
      ],
      warnings: [],
    },
  ],
  peopleWithoutProfile: [
    {
      cedula: "111222333",
      nombre: "Carlos Perez",
      cargo: "Auxiliar operativo",
      status: "contratada",
      selectedAt: "2026-04-18",
      contractedAt: "2026-04-24",
      evidence: [
        {
          id: "ev-contratacion-sin-perfil",
          registroId: "registro-contratacion",
          type: "contratacion",
          label: "Contratacion",
          sourceFormat: "Acta contratacion",
          date: "2026-04-24",
          createdAt: "2026-04-24T15:00:00.000Z",
          professionalName: "Sara Zambrano",
          cargo: "Auxiliar operativo",
          personCedula: "111222333",
          personName: "Carlos Perez",
          seguimientoNumero: null,
          pdfLink: null,
          sheetLink: null,
          actaRef: "ACTA-005",
          source: "google-sheets",
          schemaVersion: "1",
          warnings: [],
        },
      ],
      seguimientos: [],
      warnings: [],
    },
  ],
  archivedBranches: [
    {
      cedula: "900800700",
      nombre: "Marta Ruiz",
      cargo: "Auxiliar",
      status: "archivada",
      selectedAt: "2025-01-10",
      contractedAt: null,
      evidence: [],
      seguimientos: [],
      warnings: ["Seleccion sin contratacion mayor a seis meses."],
    },
  ],
  unclassifiedEvidence: [
    {
      id: "ev-otro",
      registroId: "registro-otro",
      type: "otro",
      label: "Evidencia sin clasificar",
      sourceFormat: "Formato desconocido",
      date: "2026-04-10",
      createdAt: "2026-04-10T15:00:00.000Z",
      professionalName: "Sara Zambrano",
      cargo: null,
      personCedula: null,
      personName: null,
      seguimientoNumero: null,
      pdfLink: "https://drive.google.com/otro.pdf",
      sheetLink: null,
      actaRef: null,
      source: "google-sheets",
      schemaVersion: "1",
      warnings: ["Formato fuera del ciclo de vida inicial."],
    },
  ],
  dataQualityWarnings: [
    {
      code: "matched_by_name_fallback",
      message: "Evidencia asociada por nombre de empresa; validar NIT cuando sea posible.",
      evidenceId: "ev-presentacion",
    },
    {
      code: "evidence_limit_reached",
      message: "La consulta alcanzo el limite seguro de evidencias.",
    },
  ],
  generatedAt: "2026-04-30T15:00:00.000Z",
};

describe("EmpresaLifecycleTreeView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the company header and summary cards", () => {
    render(<EmpresaLifecycleTreeView tree={lifecycleTree} />);

    expect(screen.queryByRole("heading", { name: "Manufacturas Reca" })).toBeNull();
    expect(screen.getByText("NIT 900123456")).toBeTruthy();
    expect(screen.getByText("Compensar")).toBeTruthy();
    expect(screen.getAllByText("Etapas de empresa").length).toBeGreaterThan(0);
    expect(screen.getByText("Perfiles")).toBeTruthy();
    expect(screen.getByText("Personas")).toBeTruthy();
    expect(screen.getByText("Archivadas")).toBeTruthy();
    expect(screen.getAllByText("Evidencia sin clasificar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alertas de calidad").length).toBeGreaterThan(0);
  });

  it("renders lifecycle sections with labels, people and sanitized links", () => {
    render(<EmpresaLifecycleTreeView tree={lifecycleTree} />);

    expect(screen.getByTestId("lifecycle-timeline")).toBeTruthy();

    const companyStages = screen.getByTestId("lifecycle-company-stages");
    const companyStagesButton = screen.getByRole("button", {
      name: /etapas de empresa/i,
    });
    expect(companyStagesButton.getAttribute("aria-expanded")).toBe("true");
    const companyStagesPanelId = companyStagesButton.getAttribute("aria-controls");
    expect(companyStagesPanelId).toBeTruthy();
    expect(document.getElementById(companyStagesPanelId as string)).toBeTruthy();
    expect(
      within(companyStages).getAllByText("Presentacion del programa").length
    ).toBeGreaterThan(0);
    expect(
      within(companyStages).queryByRole("heading", {
        name: "Presentacion del programa",
      })
    ).toBeNull();
    expect(
      within(companyStages)
        .getByRole("link", { name: "Abrir PDF de Acta presentacion" })
        .getAttribute("href")
    ).toBe("https://drive.google.com/presentacion.pdf");
    expect(
      within(companyStages)
        .getByRole("link", { name: "Abrir PDF de Acta presentacion" })
        .getAttribute("rel")
    ).toBe("noreferrer noopener");
    expect(
      within(companyStages)
        .getByRole("link", { name: "Abrir hoja de Acta presentacion" })
        .getAttribute("href")
    ).toBe("https://docs.google.com/spreadsheets/d/presentacion");

    const profiles = screen.getByTestId("lifecycle-profiles");
    const profilesButton = screen.getByRole("button", {
      name: /perfiles y personas/i,
    });
    expect(profilesButton.getAttribute("aria-expanded")).toBe("true");
    const profilesPanelId = profilesButton.getAttribute("aria-controls");
    expect(profilesPanelId).toBeTruthy();
    expect(document.getElementById(profilesPanelId as string)).toBeTruthy();
    expect(within(profiles).getByText("Operario logistico")).toBeTruthy();
    expect(
      within(profiles).queryByRole("heading", {
        name: "Operario logistico",
      })
    ).toBeNull();
    expect(within(profiles).getByText("Luis Gomez")).toBeTruthy();
    expect(within(profiles).getByText("CC 100200300")).toBeTruthy();
    expect(within(profiles).getByText(/Seguimiento 1/)).toBeTruthy();

    const peopleWithoutProfileButton = screen.getByRole("button", {
      name: /personas sin perfil/i,
    });
    expect(peopleWithoutProfileButton.getAttribute("aria-expanded")).toBe("false");
    const peopleWithoutProfilePanelId =
      peopleWithoutProfileButton.getAttribute("aria-controls");
    expect(peopleWithoutProfilePanelId).toBeTruthy();
    expect(document.getElementById(peopleWithoutProfilePanelId as string)).toBeTruthy();
    fireEvent.click(peopleWithoutProfileButton);
    expect(peopleWithoutProfileButton.getAttribute("aria-expanded")).toBe("true");
    const peopleWithoutProfile = screen.getByTestId(
      "lifecycle-people-without-profile"
    );
    expect(within(peopleWithoutProfile).getByText("Carlos Perez")).toBeTruthy();
    expect(within(peopleWithoutProfile).getByText("CC 111222333")).toBeTruthy();
    expect(
      within(peopleWithoutProfile).getByText("Acta contratacion")
    ).toBeTruthy();
    const archivedButton = screen.getByRole("button", { name: /ramas archivadas/i });
    expect(archivedButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(archivedButton);
    expect(screen.getByText("Marta Ruiz")).toBeTruthy();

    const unclassifiedButton = screen.getByRole("button", {
      name: /evidencia sin clasificar/i,
    });
    expect(unclassifiedButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(unclassifiedButton);
    expect(screen.getByText("Formato desconocido")).toBeTruthy();
  });

  it("renders the empty state and warning copy without raw payload output", () => {
    const emptyTree: EmpresaLifecycleTree = {
      ...lifecycleTree,
      summary: {
        companyStages: 0,
        profiles: 0,
        people: 0,
        archivedBranches: 0,
        unclassifiedEvidence: 0,
        dataQualityWarnings: 9,
      },
      empresa: {
        ...lifecycleTree.empresa,
        cajaCompensacion: null,
        companyType: "unknown",
      },
      companyStages: [],
      profileBranches: [],
      peopleWithoutProfile: [],
      archivedBranches: [],
      unclassifiedEvidence: [],
      dataQualityWarnings: [
        {
          code: "unknown_company_type",
          message: "No se pudo identificar si la empresa es Compensar o No Compensar.",
        },
        {
          code: "evidence_limit_reached",
          message: "La consulta alcanzo el limite seguro de evidencias.",
        },
        {
          code: "matched_by_name_fallback",
          message: "Evidencia asociada por nombre de empresa; validar NIT cuando sea posible.",
          evidenceId: "ev-presentacion",
        },
        {
          code: "missing_company_key",
          message: "Evidencia sin NIT ni nombre de empresa.",
        },
        {
          code: "missing_date",
          message: "Evidencia sin fecha operativa confiable.",
        },
        {
          code: "missing_profile",
          message: "Condiciones de vacante sin cargo objetivo.",
        },
        {
          code: "missing_person_key",
          message: "Evidencia de persona sin cedula.",
        },
        {
          code: "contract_without_selection",
          message: "Contratacion sin seleccion previa detectada.",
        },
        {
          code: "unclassified_format",
          message: "Formato fuera del ciclo de vida inicial.",
        },
      ],
    };

    const { container } = render(<EmpresaLifecycleTreeView tree={emptyTree} />);

    expect(
      screen.getByText(
        "Aún no hay evidencia finalizada para construir el ciclo de vida."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Esta evidencia se asoció por nombre porque no tenía NIT confiable."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/la vista puede estar incompleta/i)
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /alertas de calidad/i }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.getByText("Sin clasificar")).toBeTruthy();
    expect(screen.getByText(/no se pudo identificar si la empresa/i)).toBeTruthy();
    expect(screen.getByText(/sin nit ni nombre de empresa/i)).toBeTruthy();
    expect(screen.getByText(/sin fecha operativa confiable/i)).toBeTruthy();
    expect(screen.getByText(/sin cargo objetivo/i)).toBeTruthy();
    expect(screen.getByText(/sin c[eé]dula/i)).toBeTruthy();
    expect(screen.getByText(/sin selecci[oó]n previa/i)).toBeTruthy();
    expect(screen.getByText(/fuera del ciclo de vida inicial/i)).toBeTruthy();
    expect(container.textContent).not.toContain("matched_by_name_fallback");
    expect(container.textContent).not.toContain("unknown_company_type");
    expect(container.textContent).not.toContain("payload_normalized");
    expect(container.textContent).not.toContain("{");
  });

  it("does not render links with unsafe protocols", () => {
    const unsafeTree = JSON.parse(JSON.stringify(lifecycleTree)) as EmpresaLifecycleTree;
    unsafeTree.companyStages[0].evidence[0].pdfLink = "javascript:alert(1)";
    unsafeTree.companyStages[0].evidence[0].sheetLink = "data:text/html,boom";

    render(<EmpresaLifecycleTreeView tree={unsafeTree} />);

    expect(
      screen.queryByRole("link", { name: "Abrir PDF de Acta presentacion" })
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Abrir hoja de Acta presentacion" })
    ).toBeNull();
  });
});
