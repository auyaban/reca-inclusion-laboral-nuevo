import type { OdsTelemetryJsonObject } from "./types";

export type OdsTelemetryMismatchFixture = {
  name: string;
  motorSuggestion: OdsTelemetryJsonObject;
  finalValue: OdsTelemetryJsonObject;
  expectedMismatchFields: string[];
};

export const ODS_TELEMETRY_MISMATCH_FIXTURES: OdsTelemetryMismatchFixture[] = [
  {
    name: "ignora metadata y normaliza texto simple",
    motorSuggestion: {
      codigo_servicio: " ODS-001 ",
      modalidad_servicio: "Bogotá",
      confidence: "high",
      rationale: ["fixture"],
      rank: 1,
      score: 30,
    },
    finalValue: {
      codigo_servicio: "ods-001",
      modalidad_servicio: " bogota ",
    },
    expectedMismatchFields: [],
  },
  {
    name: "ignora metadata no comparable del motor",
    motorSuggestion: {
      codigo_servicio: "ODS-001",
      alternatives: [
        {
          codigo_servicio: "ODS-002",
          modalidad_servicio: "Virtual",
        },
      ],
      observaciones: "Observacion sugerida por el motor",
    },
    finalValue: {
      codigo_servicio: "ODS-001",
    },
    expectedMismatchFields: [],
  },
  {
    name: "ordena listas separadas por punto y coma",
    motorSuggestion: {
      observaciones: "Gestion RECA; Servicio virtual; Ajuste razonable",
    },
    finalValue: {
      observaciones: " ajuste razonable ; servicio virtual;gestion reca ",
    },
    expectedMismatchFields: [],
  },
  {
    name: "compara decimales con epsilon 0.01",
    motorSuggestion: {
      valor_base: 120000.005,
      valor_total: "350.01",
    },
    finalValue: {
      valor_base: "120000.00",
      valor_total: 350,
    },
    expectedMismatchFields: [],
  },
  {
    name: "trata null y string vacio como equivalentes",
    motorSuggestion: {
      seguimiento_servicio: null,
      observacion_agencia: "",
    },
    finalValue: {
      seguimiento_servicio: "",
      observacion_agencia: null,
    },
    expectedMismatchFields: [],
  },
  {
    name: "detecta diferencias reales y omite campos extra del final",
    motorSuggestion: {
      codigo_servicio: "A-100",
      descripcion_servicio: "Seleccion incluyente",
      modalidad_servicio: "Bogota",
      valor_base: 100,
    },
    finalValue: {
      codigo_servicio: "A-101",
      descripcion_servicio: "Seleccion incluyente",
      modalidad_servicio: "Virtual",
      valor_base: 100.02,
      extra_final: "no cuenta",
    },
    expectedMismatchFields: ["codigo_servicio", "modalidad_servicio", "valor_base"],
  },
  {
    name: "compara booleanos como escalares",
    motorSuggestion: {
      orden_clausulada: true,
    },
    finalValue: {
      orden_clausulada: false,
    },
    expectedMismatchFields: ["orden_clausulada"],
  },
  {
    name: "compara arrays JSON de forma deterministica",
    motorSuggestion: {
      usuarios: ["ana", "luis"],
    },
    finalValue: {
      usuarios: ["ana", "luis"],
    },
    expectedMismatchFields: [],
  },
];
