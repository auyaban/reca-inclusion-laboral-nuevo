import { describe, expect, it } from "vitest";
import {
  auditStructuralA1Writes,
  type CellWrite,
  type FormSheetMutation,
} from "@/lib/google/sheets";
import {
  buildSection1Data,
  type FinalizationSection1Data,
} from "@/lib/finalization/routeHelpers";
import {
  buildCondicionesVacanteSheetMutation,
} from "@/lib/finalization/condicionesVacanteSheet";
import {
  buildContratacionSheetMutation,
} from "@/lib/finalization/contratacionSheet";
import {
  buildEvaluacionSheetMutation,
} from "@/lib/finalization/evaluacionSheet";
import {
  buildInduccionOperativaSheetMutation,
} from "@/lib/finalization/induccionOperativaSheet";
import {
  buildInduccionOrganizacionalSheetMutation,
} from "@/lib/finalization/induccionOrganizacionalSheet";
import {
  buildInterpreteLscSheetMutation,
} from "@/lib/finalization/interpreteLscSheet";
import {
  getPresentacionSheetName,
  PRESENTACION_ACUERDOS_CELL,
  PRESENTACION_ATTENDEES_BASE_ROWS,
  PRESENTACION_ATTENDEES_CARGO_COL,
  PRESENTACION_ATTENDEES_NAME_COL,
  PRESENTACION_ATTENDEES_START_ROW,
} from "@/lib/finalization/presentacionSheet";
import {
  buildSeleccionSheetMutation,
} from "@/lib/finalization/seleccionSheet";
import {
  SENSIBILIZACION_ATTENDEES_BASE_ROWS,
  SENSIBILIZACION_ATTENDEES_CARGO_COL,
  SENSIBILIZACION_ATTENDEES_NAME_COL,
  SENSIBILIZACION_ATTENDEES_START_ROW,
  SENSIBILIZACION_OBSERVACIONES_CELL,
  SENSIBILIZACION_SHEET_NAME,
} from "@/lib/finalization/sensibilizacionSheet";
import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { normalizeContratacionValues } from "@/lib/contratacion";
import { createEmptyEvaluacionValues } from "@/lib/evaluacion";
import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";
import { normalizePresentacionValues } from "@/lib/presentacion";
import { normalizeSensibilizacionValues } from "@/lib/sensibilizacion";
import { buildValidInduccionOperativaValues } from "@/lib/testing/induccionOperativaFixtures";
import {
  buildValidInduccionOrganizacionalValues,
  INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
} from "@/lib/testing/induccionOrganizacionalFixtures";
import {
  buildValidSeleccionOferenteRow,
  buildValidSeleccionValues,
  SELECCION_TEST_EMPRESA,
} from "@/lib/testing/seleccionFixtures";

const BASE_EMPRESA = SELECCION_TEST_EMPRESA;

const PRESENTACION_SECTION_1_MAP = {
  fecha_visita: "D7",
  modalidad: "Q7",
  nombre_empresa: "D8",
  direccion_empresa: "D9",
  correo_1: "D10",
  contacto_empresa: "D11",
  caja_compensacion: "D12",
  profesional_asignado: "D13",
  asesor: "D14",
  ciudad_empresa: "Q8",
  nit_empresa: "Q9",
  telefono_empresa: "Q10",
  cargo: "Q11",
  sede_empresa: "Q12",
  correo_profesional: "Q13",
  correo_asesor: "Q14",
} as const;

const PRESENTACION_MOTIVACION_MAP = {
  "Responsabilidad Social Empresarial": "U60",
  "Objetivos y metas para la diversidad, equidad e inclusión.": "U61",
  "Avances a nivel global de impacto en Colombia": "U62",
  "Beneficios Tributarios": "U63",
  "Beneficios en la contratación de población en riesgo de exclusión": "U64",
  "Ventaja en licitaciones públicas": "U65",
  "Cumplimiento de la normativa establecida por el Estado Colombiano.": "U66",
  "Experiencia en la vinculación de personas en condición de discapacidad.":
    "U67",
} as const;

const SENSIBILIZACION_SECTION_1_MAP = {
  fecha_visita: "D7",
  modalidad: "N7",
  nombre_empresa: "D8",
  ciudad_empresa: "N8",
  direccion_empresa: "D9",
  nit_empresa: "N9",
  correo_1: "D10",
  telefono_empresa: "N10",
  contacto_empresa: "D11",
  cargo: "N11",
  asesor: "D12",
  sede_empresa: "N12",
} as const;

function buildAttendees(count: number, options?: { firstCargo?: string }) {
  return Array.from({ length: count }, (_, index) => ({
    nombre: `Asistente ${index + 1}`,
    cargo: index === 0 ? (options?.firstCargo ?? "Profesional RECA") : `Cargo ${index + 1}`,
  }));
}

function buildCommonSection1Data(
  formData: Pick<FinalizationSection1Data, "fecha_visita" | "modalidad" | "nit_empresa">
) {
  return buildSection1Data(BASE_EMPRESA, formData);
}

function buildPresentacionAuditMutation(options?: {
  asistentesCount?: number;
  tipoVisita?: "Presentación" | "Reactivación";
}) {
  const formData = normalizePresentacionValues(
    {
      tipo_visita: options?.tipoVisita ?? "Presentación",
      fecha_visita: "2026-04-23",
      modalidad: "Presencial",
      nit_empresa: BASE_EMPRESA.nit_empresa,
      motivacion: [
        "Responsabilidad Social Empresarial",
        "Beneficios Tributarios",
      ],
      acuerdos_observaciones: "Acuerdos y observaciones",
      asistentes: buildAttendees(options?.asistentesCount ?? 3, {
        firstCargo: "Profesional RECA",
      }),
    },
    BASE_EMPRESA
  );
  const targetSheetName = getPresentacionSheetName(formData.tipo_visita);
  const section1Data = {
    ...buildCommonSection1Data(formData),
    nombre_empresa: BASE_EMPRESA.nombre_empresa,
    direccion_empresa: BASE_EMPRESA.direccion_empresa ?? "",
    correo_1: BASE_EMPRESA.correo_1 ?? "",
    contacto_empresa: BASE_EMPRESA.contacto_empresa ?? "",
    caja_compensacion: BASE_EMPRESA.caja_compensacion ?? "",
    profesional_asignado: BASE_EMPRESA.profesional_asignado ?? "",
    asesor: BASE_EMPRESA.asesor ?? "",
    ciudad_empresa: BASE_EMPRESA.ciudad_empresa ?? "",
    telefono_empresa: BASE_EMPRESA.telefono_empresa ?? "",
    cargo: BASE_EMPRESA.cargo ?? "",
    sede_empresa: BASE_EMPRESA.sede_empresa ?? "",
    correo_profesional: BASE_EMPRESA.correo_profesional ?? "",
    correo_asesor: BASE_EMPRESA.correo_asesor ?? "",
  };
  const writes: CellWrite[] = [];

  for (const [field, cell] of Object.entries(PRESENTACION_SECTION_1_MAP)) {
    const value = section1Data[field as keyof typeof section1Data];
    if (value) {
      writes.push({
        range: `'${targetSheetName}'!${cell}`,
        value,
      });
    }
  }

  for (const [opcion, cell] of Object.entries(PRESENTACION_MOTIVACION_MAP)) {
    writes.push({
      range: `'${targetSheetName}'!${cell}`,
      value: formData.motivacion.includes(
        opcion as (typeof formData.motivacion)[number]
      ),
    });
  }

  writes.push({
    range: `'${targetSheetName}'!${PRESENTACION_ACUERDOS_CELL}`,
    value: formData.acuerdos_observaciones,
  });

  formData.asistentes.forEach((asistente, index) => {
    const row = PRESENTACION_ATTENDEES_START_ROW + index;
    if (asistente.nombre) {
      writes.push({
        range: `'${targetSheetName}'!${PRESENTACION_ATTENDEES_NAME_COL}${row}`,
        value: asistente.nombre,
      });
    }
    if (asistente.cargo) {
      writes.push({
        range: `'${targetSheetName}'!${PRESENTACION_ATTENDEES_CARGO_COL}${row}`,
        value: asistente.cargo,
      });
    }
  });

  const extraRows = Math.max(
    0,
    formData.asistentes.length - PRESENTACION_ATTENDEES_BASE_ROWS
  );

  return {
    writes,
    rowInsertions:
      extraRows > 0
        ? [
            {
              sheetName: targetSheetName,
              insertAtRow:
                PRESENTACION_ATTENDEES_START_ROW +
                PRESENTACION_ATTENDEES_BASE_ROWS -
                1,
              count: extraRows,
              templateRow:
                PRESENTACION_ATTENDEES_START_ROW +
                PRESENTACION_ATTENDEES_BASE_ROWS -
                1,
            },
          ]
        : [],
  } satisfies FormSheetMutation;
}

function buildSensibilizacionAuditMutation(options?: { asistentesCount?: number }) {
  const formData = normalizeSensibilizacionValues(
    {
      fecha_visita: "2026-04-23",
      modalidad: "Presencial",
      nit_empresa: BASE_EMPRESA.nit_empresa,
      observaciones: "Observaciones sensibilización",
      asistentes: buildAttendees(options?.asistentesCount ?? 4, {
        firstCargo: "Profesional RECA",
      }),
    },
    BASE_EMPRESA
  );
  const section1Data = buildCommonSection1Data(formData);
  const meaningfulAsistentes = normalizePayloadAsistentes(formData.asistentes);
  const writes: CellWrite[] = [];

  for (const [field, cell] of Object.entries(SENSIBILIZACION_SECTION_1_MAP)) {
    const value = section1Data[field as keyof typeof section1Data];
    if (value) {
      writes.push({
        range: `'${SENSIBILIZACION_SHEET_NAME}'!${cell}`,
        value,
      });
    }
  }

  writes.push({
    range: `'${SENSIBILIZACION_SHEET_NAME}'!${SENSIBILIZACION_OBSERVACIONES_CELL}`,
    value: formData.observaciones,
  });

  meaningfulAsistentes.forEach((asistente, index) => {
    const row = SENSIBILIZACION_ATTENDEES_START_ROW + index;
    if (asistente.nombre) {
      writes.push({
        range: `'${SENSIBILIZACION_SHEET_NAME}'!${SENSIBILIZACION_ATTENDEES_NAME_COL}${row}`,
        value: asistente.nombre,
      });
    }
    if (asistente.cargo) {
      writes.push({
        range: `'${SENSIBILIZACION_SHEET_NAME}'!${SENSIBILIZACION_ATTENDEES_CARGO_COL}${row}`,
        value: asistente.cargo,
      });
    }
  });

  const extraRows = Math.max(
    0,
    meaningfulAsistentes.length - SENSIBILIZACION_ATTENDEES_BASE_ROWS
  );

  return {
    writes,
    rowInsertions:
      extraRows > 0
        ? [
            {
              sheetName: SENSIBILIZACION_SHEET_NAME,
              insertAtRow:
                SENSIBILIZACION_ATTENDEES_START_ROW +
                SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                1,
              count: extraRows,
              templateRow:
                SENSIBILIZACION_ATTENDEES_START_ROW +
                SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                1,
            },
          ]
        : [],
  } satisfies FormSheetMutation;
}

function buildCondicionesValues(options?: {
  discapacidadesCount?: number;
  asistentesCount?: number;
}) {
  const discapacidadesCount = options?.discapacidadesCount ?? 4;
  const asistentesCount = options?.asistentesCount ?? 3;

  return normalizeCondicionesVacanteValues(
    {
      fecha_visita: "2026-04-23",
      modalidad: "Presencial",
      nit_empresa: BASE_EMPRESA.nit_empresa,
      observaciones_recomendaciones: "Observaciones finales",
      discapacidades: Array.from({ length: discapacidadesCount }, (_, index) => ({
        discapacidad: `Discapacidad ${index + 1}`,
      })),
      asistentes: buildAttendees(asistentesCount),
    },
    BASE_EMPRESA
  );
}

function buildEvaluacionValues() {
  const formData = createEmptyEvaluacionValues(BASE_EMPRESA);
  formData.section_4.nivel_accesibilidad = "Alto";
  formData.section_4.descripcion = "Nivel de accesibilidad alto";
  formData.section_5.discapacidad_fisica.aplica = "Aplica";
  formData.section_5.discapacidad_fisica.ajustes = "Eliminar barreras";
  formData.observaciones_generales = "Observaciones";
  formData.cargos_compatibles = "Analista";
  return formData;
}

function buildInterpreteSection1Data() {
  return {
    fecha_visita: "2026-04-23",
    modalidad_interprete: "Presencial",
    modalidad_profesional_reca: "Virtual",
    nombre_empresa: BASE_EMPRESA.nombre_empresa,
    ciudad_empresa: BASE_EMPRESA.ciudad_empresa ?? "",
    direccion_empresa: BASE_EMPRESA.direccion_empresa ?? "",
    nit_empresa: BASE_EMPRESA.nit_empresa ?? "",
    contacto_empresa: BASE_EMPRESA.contacto_empresa ?? "",
    cargo: BASE_EMPRESA.cargo ?? "",
    asesor: BASE_EMPRESA.asesor ?? "",
    sede_empresa: BASE_EMPRESA.sede_empresa ?? "",
    profesional_asignado: BASE_EMPRESA.profesional_asignado ?? "",
    correo_profesional: BASE_EMPRESA.correo_profesional ?? "",
    correo_asesor: BASE_EMPRESA.correo_asesor ?? "",
    caja_compensacion: BASE_EMPRESA.caja_compensacion ?? "",
  };
}

function buildInterpreteAuditFormData(options?: {
  oferentes?: number;
  interpretes?: number;
  asistentes?: number;
}) {
  const oferentesCount = options?.oferentes ?? 1;
  const interpretesCount = options?.interpretes ?? 1;
  const asistentesCount = options?.asistentes ?? 2;

  return normalizeInterpreteLscValues(
    {
      fecha_visita: "2026-04-23",
      modalidad_interprete: "Presencial",
      modalidad_profesional_reca: "Virtual",
      nit_empresa: BASE_EMPRESA.nit_empresa,
      oferentes: Array.from({ length: oferentesCount }, (_, index) => ({
        nombre_oferente: `Oferente ${index + 1}`,
        cedula: `${1010 + index}`,
        proceso: `Proceso ${index + 1}`,
      })),
      interpretes: Array.from({ length: interpretesCount }, (_, index) => ({
        nombre: `Interprete ${index + 1}`,
        hora_inicial: "08:00",
        hora_final: `${String(10 + index).padStart(2, "0")}:00`,
      })),
      sabana: { activo: true, horas: 2 },
      asistentes: buildAttendees(asistentesCount),
    },
    BASE_EMPRESA
  );
}

function expectAuditSafe(label: string, mutation: FormSheetMutation) {
  const report = auditStructuralA1Writes(mutation);
  expect(report.safe, `${label}\n${JSON.stringify(report, null, 2)}`).toBe(true);
  expect(report.issues, label).toEqual([]);
}

// Regla reusable: cualquier builder con inserciones estructurales debe añadir
// al menos un caso de overflow real a esta suite antes de entrar a runtime.
describe("structural A1 write audit", () => {
  it("marks presentacion as safe in base and attendee overflow scenarios", () => {
    expectAuditSafe("presentacion base", buildPresentacionAuditMutation());
    expectAuditSafe(
      "presentacion overflow asistentes",
      buildPresentacionAuditMutation({ asistentesCount: 5 })
    );
  });

  it("marks sensibilizacion as safe in base and attendee overflow scenarios", () => {
    expectAuditSafe("sensibilizacion base", buildSensibilizacionAuditMutation());
    expectAuditSafe(
      "sensibilizacion overflow asistentes",
      buildSensibilizacionAuditMutation({ asistentesCount: 6 })
    );
  });

  it("marks evaluacion as safe in base and attendee overflow scenarios", () => {
    const formData = buildEvaluacionValues();
    expectAuditSafe(
      "evaluacion base",
      buildEvaluacionSheetMutation({
        section1Data: buildCommonSection1Data(formData),
        formData,
        asistentes: buildAttendees(2),
      })
    );
    expectAuditSafe(
      "evaluacion overflow asistentes",
      buildEvaluacionSheetMutation({
        section1Data: buildCommonSection1Data(formData),
        formData,
        asistentes: buildAttendees(5),
      })
    );
  });

  it("marks induccion operativa as safe in base and attendee overflow scenarios", () => {
    const baseValues = buildValidInduccionOperativaValues({
      asistentes: buildAttendees(2),
    });
    expectAuditSafe(
      "induccion operativa base",
      buildInduccionOperativaSheetMutation({
        section1Data: buildCommonSection1Data(baseValues),
        formData: baseValues,
        asistentes: baseValues.asistentes,
      })
    );

    const overflowValues = buildValidInduccionOperativaValues({
      asistentes: buildAttendees(6),
    });
    expectAuditSafe(
      "induccion operativa overflow asistentes",
      buildInduccionOperativaSheetMutation({
        section1Data: buildCommonSection1Data(overflowValues),
        formData: overflowValues,
        asistentes: overflowValues.asistentes,
      })
    );
  });

  it("marks induccion organizacional as safe in base and attendee overflow scenarios", () => {
    const baseValues = buildValidInduccionOrganizacionalValues({
      asistentes: buildAttendees(2),
    });
    expectAuditSafe(
      "induccion organizacional base",
      buildInduccionOrganizacionalSheetMutation({
        section1Data: buildSection1Data(
          INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
          baseValues
        ),
        formData: baseValues,
        asistentes: baseValues.asistentes,
      })
    );

    const overflowValues = buildValidInduccionOrganizacionalValues({
      asistentes: buildAttendees(6),
    });
    expectAuditSafe(
      "induccion organizacional overflow asistentes",
      buildInduccionOrganizacionalSheetMutation({
        section1Data: buildSection1Data(
          INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
          overflowValues
        ),
        formData: overflowValues,
        asistentes: overflowValues.asistentes,
      })
    );
  });

  it("marks condiciones vacante as safe for disability, attendee and combined overflow", () => {
    const baseValues = buildCondicionesValues();
    expectAuditSafe(
      "condiciones vacante base",
      buildCondicionesVacanteSheetMutation({
        section1Data: buildCommonSection1Data(baseValues),
        formData: baseValues,
        asistentes: baseValues.asistentes,
      })
    );

    const disabilityOverflowValues = buildCondicionesValues({
      discapacidadesCount: 6,
      asistentesCount: 3,
    });
    expectAuditSafe(
      "condiciones vacante overflow discapacidades",
      buildCondicionesVacanteSheetMutation({
        section1Data: buildCommonSection1Data(disabilityOverflowValues),
        formData: disabilityOverflowValues,
        asistentes: disabilityOverflowValues.asistentes,
      })
    );

    const attendeeOverflowValues = buildCondicionesValues({
      discapacidadesCount: 4,
      asistentesCount: 5,
    });
    expectAuditSafe(
      "condiciones vacante overflow asistentes",
      buildCondicionesVacanteSheetMutation({
        section1Data: buildCommonSection1Data(attendeeOverflowValues),
        formData: attendeeOverflowValues,
        asistentes: attendeeOverflowValues.asistentes,
      })
    );

    const combinedOverflowValues = buildCondicionesValues({
      discapacidadesCount: 6,
      asistentesCount: 6,
    });
    expectAuditSafe(
      "condiciones vacante overflow combinado",
      buildCondicionesVacanteSheetMutation({
        section1Data: buildCommonSection1Data(combinedOverflowValues),
        formData: combinedOverflowValues,
        asistentes: combinedOverflowValues.asistentes,
      })
    );
  });

  it("marks interprete LSC as safe in base and combined overflow scenarios", () => {
    const baseValues = buildInterpreteAuditFormData();
    expectAuditSafe(
      "interprete lsc base",
      buildInterpreteLscSheetMutation({
        section1Data: buildInterpreteSection1Data(),
        formData: baseValues,
      })
    );

    const combinedOverflowValues = buildInterpreteAuditFormData({
      oferentes: 10,
      interpretes: 5,
      asistentes: 10,
    });
    expectAuditSafe(
      "interprete lsc overflow combinado",
      buildInterpreteLscSheetMutation({
        section1Data: buildInterpreteSection1Data(),
        formData: combinedOverflowValues,
      })
    );
  });

  it("marks seleccion as safe with template blocks alone and with attendee overflow", () => {
    const templateOnlyValues = buildValidSeleccionValues({
      oferentes: [
        buildValidSeleccionOferenteRow(),
        buildValidSeleccionOferenteRow({
          nombre_oferente: "Segundo oferente",
          cedula: "998877",
        }),
      ],
      asistentes: buildAttendees(2),
    });
    expectAuditSafe(
      "seleccion template blocks",
      buildSeleccionSheetMutation({
        section1Data: buildSection1Data(SELECCION_TEST_EMPRESA, templateOnlyValues),
        formData: templateOnlyValues,
        asistentes: templateOnlyValues.asistentes,
      })
    );

    const templateAndRowsValues = buildValidSeleccionValues({
      oferentes: [
        buildValidSeleccionOferenteRow(),
        buildValidSeleccionOferenteRow({
          nombre_oferente: "Segundo oferente",
          cedula: "998877",
        }),
        buildValidSeleccionOferenteRow({
          nombre_oferente: "Tercer oferente",
          cedula: "887766",
        }),
      ],
      asistentes: buildAttendees(5),
    });
    expectAuditSafe(
      "seleccion template blocks + row insertions",
      buildSeleccionSheetMutation({
        section1Data: buildSection1Data(
          SELECCION_TEST_EMPRESA,
          templateAndRowsValues
        ),
        formData: templateAndRowsValues,
        asistentes: templateAndRowsValues.asistentes,
      })
    );
  });

  it("marks contratacion as safe with template blocks alone and with attendee overflow", () => {
    const templateOnlyValues = normalizeContratacionValues(
      {
        fecha_visita: "2026-04-23",
        modalidad: "Presencial",
        nit_empresa: BASE_EMPRESA.nit_empresa,
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: buildAttendees(2),
        vinculados: [
          {
            nombre_oferente: "Ana Perez",
            certificado_porcentaje: "45%",
            grupo_etnico: "Si",
            grupo_etnico_cual: "No aplica",
          },
          {
            nombre_oferente: "Juan Ruiz",
            certificado_porcentaje: "25%",
          },
        ],
      },
      BASE_EMPRESA
    );
    expectAuditSafe(
      "contratacion template blocks",
      buildContratacionSheetMutation({
        section1Data: buildSection1Data(BASE_EMPRESA, templateOnlyValues),
        formData: templateOnlyValues,
        asistentes: templateOnlyValues.asistentes,
      })
    );

    const templateAndRowsValues = normalizeContratacionValues(
      {
        fecha_visita: "2026-04-23",
        modalidad: "Presencial",
        nit_empresa: BASE_EMPRESA.nit_empresa,
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: buildAttendees(6),
        vinculados: [
          {
            nombre_oferente: "Ana Perez",
            certificado_porcentaje: "45%",
            grupo_etnico: "Si",
            grupo_etnico_cual: "No aplica",
          },
          {
            nombre_oferente: "Juan Ruiz",
            certificado_porcentaje: "25%",
          },
          {
            nombre_oferente: "Camila Soto",
            certificado_porcentaje: "12%",
          },
        ],
      },
      BASE_EMPRESA
    );
    expectAuditSafe(
      "contratacion template blocks + row insertions",
      buildContratacionSheetMutation({
        section1Data: buildSection1Data(BASE_EMPRESA, templateAndRowsValues),
        formData: templateAndRowsValues,
        asistentes: templateAndRowsValues.asistentes,
      })
    );
  });
});
