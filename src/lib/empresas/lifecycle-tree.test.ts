import { describe, expect, it } from "vitest";
import {
  buildEmpresaLifecycleTree,
  normalizeLifecycleFormatType,
  type EmpresaLifecycleEvidenceRow,
  type EmpresaLifecycleSourceEmpresa,
} from "@/lib/empresas/lifecycle-tree";

const empresa: EmpresaLifecycleSourceEmpresa = {
  id: "empresa-1",
  nombre_empresa: "Empresa Demo",
  nit_empresa: "900123456-1",
  caja_compensacion: "Compensar",
};

function row(
  overrides: Partial<EmpresaLifecycleEvidenceRow> & {
    registro_id: string;
    nombre_formato: string;
    parsed_raw?: Record<string, unknown>;
  }
): EmpresaLifecycleEvidenceRow {
  return {
    registro_id: overrides.registro_id,
    nombre_formato: overrides.nombre_formato,
    nombre_empresa: "Empresa Demo",
    created_at: "2026-04-20T10:00:00.000Z",
    finalizado_at_colombia: null,
    path_formato: null,
    payload_source: "form_web",
    payload_schema_version: "1",
    payload_generated_at: null,
    acta_ref: `acta-${overrides.registro_id}`,
    payload_normalized: {
      parsed_raw: {
        nit_empresa: "900.123.456-1",
        nombre_empresa: "Empresa Demo",
        caja_compensacion: "Compensar",
        fecha_servicio: "2026-04-20",
        nombre_profesional: "Sara Zambrano",
        pdf_link: "https://drive.google.com/demo.pdf",
        ...overrides.parsed_raw,
      },
      internal_only: "dato secreto que no debe salir",
    },
    ...overrides,
  };
}

describe("empresa lifecycle tree", () => {
  it("normalizes known lifecycle format names and keeps unknown formats separate", () => {
    expect(normalizeLifecycleFormatType("Presentacion del Programa")).toBe(
      "presentacion"
    );
    expect(normalizeLifecycleFormatType("Revision Condicion")).toBe(
      "condiciones-vacante"
    );
    expect(
      normalizeLifecycleFormatType(
        "Seguimiento al Proceso de Inclusion Laboral #3"
      )
    ).toBe("seguimiento");
    expect(normalizeLifecycleFormatType("Servicio de Interpretacion LSC")).toBe(
      "otro"
    );
  });

  it("builds a conservative read-only tree without exposing raw payloads", () => {
    const tree = buildEmpresaLifecycleTree({
      empresa,
      rows: [
        row({
          registro_id: "presentacion-1",
          nombre_formato: "Presentacion del Programa",
        }),
        row({
          registro_id: "evaluacion-1",
          nombre_formato: "Evaluacion Accesibilidad",
        }),
        row({
          registro_id: "perfil-1",
          nombre_formato: "Condiciones de Vacante",
          parsed_raw: { cargo_objetivo: "Auxiliar administrativo" },
        }),
        row({
          registro_id: "seleccion-1",
          nombre_formato: "Seleccion Incluyente",
          parsed_raw: {
            cargo_objetivo: "Auxiliar administrativo",
            participantes: [
              {
                cedula_usuario: "100",
                nombre_usuario: "Ana Ruiz",
                cargo_servicio: "Auxiliar administrativo",
              },
              {
                cedula_usuario: "200",
                nombre_usuario: "Luis Gomez",
                cargo_servicio: "Cargo distinto",
              },
            ],
          },
        }),
        row({
          registro_id: "contratacion-1",
          nombre_formato: "Contratacion Incluyente",
          parsed_raw: {
            cargo_objetivo: "Auxiliar administrativo",
            participantes: [
              {
                cedula_usuario: "100",
                nombre_usuario: "Ana Ruiz",
                cargo_servicio: "Auxiliar administrativo",
              },
            ],
          },
        }),
        row({
          registro_id: "induccion-operativa-1",
          nombre_formato: "Induccion Operativa",
          parsed_raw: {
            linked_person_cedula: "100",
            linked_person_name: "Ana Ruiz",
          },
        }),
        row({
          registro_id: "seguimiento-1",
          nombre_formato: "Seguimiento al Proceso de Inclusion Laboral #1",
          parsed_raw: {
            seguimiento_numero: "1",
            participantes: [{ cedula_usuario: "100", nombre_usuario: "Ana Ruiz" }],
          },
        }),
        row({
          registro_id: "sensibilizacion-1",
          nombre_formato: "Sensibilizacion",
        }),
        row({
          registro_id: "induccion-organizacional-1",
          nombre_formato: "Induccion Organizacional",
          parsed_raw: {
            participantes: [{ cedula_usuario: "100", nombre_usuario: "Ana Ruiz" }],
          },
        }),
        row({
          registro_id: "seleccion-archivada",
          nombre_formato: "Seleccion Incluyente",
          created_at: "2025-08-01T10:00:00.000Z",
          parsed_raw: {
            fecha_servicio: "2025-08-01",
            cargo_objetivo: "Auxiliar administrativo",
            participantes: [
              {
                cedula_usuario: "300",
                nombre_usuario: "Carlos Paz",
                cargo_servicio: "Auxiliar administrativo",
              },
            ],
          },
        }),
        row({
          registro_id: "sin-cargo",
          nombre_formato: "Condiciones de Vacante",
          parsed_raw: { cargo_objetivo: "" },
        }),
        row({
          registro_id: "lsc-1",
          nombre_formato: "Servicio de Interpretacion LSC",
        }),
      ],
      now: new Date("2026-04-30T00:00:00.000Z"),
    });

    expect(tree.empresa.companyType).toBe("compensar");
    expect(tree.companyStages.map((stage) => stage.type)).toEqual([
      "presentacion",
      "evaluacion",
      "sensibilizacion",
      "induccion-organizacional",
    ]);
    expect(tree.profileBranches).toHaveLength(1);
    expect(tree.profileBranches[0]).toEqual(
      expect.objectContaining({
        cargo: "Auxiliar administrativo",
        people: [
          expect.objectContaining({
            cedula: "100",
            nombre: "Ana Ruiz",
            status: "en_seguimiento",
            seguimientos: [
              expect.objectContaining({ seguimientoNumero: 1 }),
            ],
          }),
        ],
      })
    );
    expect(tree.peopleWithoutProfile).toEqual([
      expect.objectContaining({ cedula: "200", nombre: "Luis Gomez" }),
    ]);
    expect(tree.archivedBranches).toEqual([
      expect.objectContaining({ cedula: "300", nombre: "Carlos Paz" }),
    ]);
    expect(tree.unclassifiedEvidence.map((item) => item.id)).toEqual(
      expect.arrayContaining(["sin-cargo", "lsc-1"])
    );
    expect(tree.summary).toEqual(
      expect.objectContaining({
        companyStages: 4,
        profiles: 1,
        people: 2,
        archivedBranches: 1,
        unclassifiedEvidence: 2,
      })
    );
    expect(JSON.stringify(tree)).not.toContain("payload_normalized");
    expect(JSON.stringify(tree)).not.toContain("dato secreto");
  });

  it("marks evidence matched by company name as lower confidence", () => {
    const tree = buildEmpresaLifecycleTree({
      empresa,
      rows: [
        row({
          registro_id: "presentacion-name-match",
          nombre_formato: "Presentacion del Programa",
          parsed_raw: {
            nit_empresa: "",
            nombre_empresa: "Empresa Demo",
          },
        }),
      ],
      nameFallbackEvidenceIds: ["presentacion-name-match"],
      now: new Date("2026-04-30T00:00:00.000Z"),
    });

    expect(tree.companyStages[0]?.evidence[0]?.warnings).toContain(
      "Evidencia asociada por nombre de empresa; validar NIT cuando sea posible."
    );
    expect(tree.dataQualityWarnings).toContainEqual({
      code: "matched_by_name_fallback",
      message:
        "Evidencia asociada por nombre de empresa; validar NIT cuando sea posible.",
      evidenceId: "presentacion-name-match",
    });
  });

  it("sanitizes evidence links before exposing the tree", () => {
    const tree = buildEmpresaLifecycleTree({
      empresa,
      rows: [
        row({
          registro_id: "unsafe-links",
          nombre_formato: "Presentacion del Programa",
          parsed_raw: {
            pdf_link: "javascript:alert(1)",
            sheet_link: "data:text/html;base64,PHNjcmlwdD4=",
          },
        }),
        row({
          registro_id: "safe-links",
          nombre_formato: "Evaluacion Accesibilidad",
          parsed_raw: {
            pdf_link: "https://drive.google.com/safe.pdf",
            sheet_link: "http://sheets.google.com/safe",
          },
        }),
      ],
      now: new Date("2026-04-30T00:00:00.000Z"),
    });

    const unsafe = tree.companyStages
      .flatMap((stage) => stage.evidence)
      .find((item) => item.id === "unsafe-links");
    const safe = tree.companyStages
      .flatMap((stage) => stage.evidence)
      .find((item) => item.id === "safe-links");

    expect(unsafe).toEqual(
      expect.objectContaining({ pdfLink: null, sheetLink: null })
    );
    expect(safe).toEqual(
      expect.objectContaining({
        pdfLink: "https://drive.google.com/safe.pdf",
        sheetLink: "http://sheets.google.com/safe",
      })
    );
  });
});
