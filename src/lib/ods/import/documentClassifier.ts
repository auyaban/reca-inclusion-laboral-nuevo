import { z } from "zod";

export const DOCUMENT_KINDS = [
  "interpreter_service",
  "attendance_support",
  "vacancy_review",
  "program_presentation",
  "accessibility_assessment",
  "program_reactivation",
  "follow_up",
  "sensibilizacion",
  "inclusive_selection",
  "inclusive_hiring",
  "operational_induction",
  "organizational_induction",
  "process_match",
  "needs_review",
] as const;

export const documentKindSchema = z.enum(DOCUMENT_KINDS);
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type DocumentClassification = {
  document_kind: DocumentKind;
  document_label: string;
  is_ods_candidate: boolean;
  classification_score: number;
  classification_reason: string;
};

type RuleEntry = {
  tokens: string[];
  classification: DocumentClassification;
};

const EXPLICIT_RULES: RuleEntry[] = [
  {
    tokens: [
      "interprete lsc",
      "interprete",
      "servicio interprete",
      "int rprete lsc",
      "servicio int rprete",
      "servicio int rprete lsc",
    ],
    classification: {
      document_kind: "interpreter_service",
      document_label: "Servicio interprete",
      is_ods_candidate: true,
      classification_score: 0.95,
      classification_reason:
        "El archivo parece corresponder a un servicio de interprete LSC.",
    },
  },
  {
    tokens: ["control de asistencia"],
    classification: {
      document_kind: "attendance_support",
      document_label: "Control de asistencia",
      is_ods_candidate: false,
      classification_score: 0.99,
      classification_reason:
        "El nombre del archivo corresponde a soporte de asistencia, no al acta principal.",
    },
  },
  {
    tokens: [
      "levantamiento del perfil",
      "condiciones de la vacante",
      "revision de las condiciones",
    ],
    classification: {
      document_kind: "vacancy_review",
      document_label: "Revision de condicion o vacante",
      is_ods_candidate: true,
      classification_score: 0.92,
      classification_reason:
        "El archivo parece corresponder a una revision de condicion/vacante util para ODS.",
    },
  },
  {
    tokens: ["presentacion del programa"],
    classification: {
      document_kind: "program_presentation",
      document_label: "Presentacion del programa",
      is_ods_candidate: true,
      classification_score: 0.92,
      classification_reason:
        "El archivo parece ser una presentacion del programa.",
    },
  },
  {
    tokens: ["evaluacion de accesibilidad"],
    classification: {
      document_kind: "accessibility_assessment",
      document_label: "Evaluacion de accesibilidad",
      is_ods_candidate: true,
      classification_score: 0.92,
      classification_reason:
        "El archivo parece ser una evaluacion de accesibilidad.",
    },
  },
  {
    tokens: ["reactivacion del programa", "reactivacion programa"],
    classification: {
      document_kind: "program_reactivation",
      document_label: "Reactivacion del programa",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason:
        "El archivo parece ser una reactivacion del programa.",
    },
  },
  {
    tokens: ["seguimiento", "seguimientos"],
    classification: {
      document_kind: "follow_up",
      document_label: "Seguimiento",
      is_ods_candidate: true,
      classification_score: 0.88,
      classification_reason: "El archivo parece ser un seguimiento.",
    },
  },
  {
    tokens: ["sensibilizacion"],
    classification: {
      document_kind: "sensibilizacion",
      document_label: "Sensibilizacion",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason: "El archivo parece ser una sensibilizacion.",
    },
  },
  {
    tokens: ["seleccion incluyente", "seleccion_incluyente"],
    classification: {
      document_kind: "inclusive_selection",
      document_label: "Seleccion incluyente",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason:
        "El archivo parece ser una seleccion incluyente.",
    },
  },
  {
    tokens: ["contratacion incluyente", "contratacion_incluyente"],
    classification: {
      document_kind: "inclusive_hiring",
      document_label: "Contratacion incluyente",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason:
        "El archivo parece ser una contratacion incluyente.",
    },
  },
  {
    tokens: ["induccion operativa"],
    classification: {
      document_kind: "operational_induction",
      document_label: "Induccion operativa",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason:
        "El archivo parece ser una induccion operativa.",
    },
  },
  {
    tokens: ["induccion organizacional"],
    classification: {
      document_kind: "organizational_induction",
      document_label: "Induccion organizacional",
      is_ods_candidate: true,
      classification_score: 0.9,
      classification_reason:
        "El archivo parece ser una induccion organizacional.",
    },
  },
];

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyDocument(options: {
  filename: string;
  subject?: string;
  process_hint?: string;
  process_score?: number;
}): DocumentClassification {
  const { filename, subject = "", process_hint = "", process_score = 0.0 } = options;
  const text = normalizeSearchText(`${filename} ${subject}`);

  for (const rule of EXPLICIT_RULES) {
    if (rule.tokens.some((token) => text.includes(normalizeSearchText(token)))) {
      return rule.classification;
    }
  }

  if (process_hint && (process_score || 0) >= 0.5) {
    return {
      document_kind: "process_match",
      document_label: process_hint.replace(/_/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      is_ods_candidate: true,
      classification_score: process_score,
      classification_reason:
        "El nombre del archivo coincide de forma razonable con un proceso conocido.",
    };
  }

  return {
    document_kind: "needs_review",
    document_label: "Requiere revision",
    is_ods_candidate: false,
    classification_score: 0.0,
    classification_reason:
      "No hubo senales suficientes para clasificar el PDF de forma confiable.",
  };
}

export function getDocumentKindLabel(kind: DocumentKind): string {
  switch (kind) {
    case "interpreter_service": return "Servicio interprete";
    case "attendance_support": return "Control de asistencia";
    case "vacancy_review": return "Revision de condicion o vacante";
    case "program_presentation": return "Presentacion del programa";
    case "accessibility_assessment": return "Evaluacion de accesibilidad";
    case "program_reactivation": return "Reactivacion del programa";
    case "follow_up": return "Seguimiento";
    case "sensibilizacion": return "Sensibilizacion";
    case "inclusive_selection": return "Seleccion incluyente";
    case "inclusive_hiring": return "Contratacion incluyente";
    case "operational_induction": return "Induccion operativa";
    case "organizational_induction": return "Induccion organizacional";
    case "process_match": return "Proceso conocido";
    case "needs_review": return "Requiere revision";
  }
}

export function isOdsCandidate(kind: DocumentKind): boolean {
  switch (kind) {
    case "interpreter_service":
    case "vacancy_review":
    case "program_presentation":
    case "accessibility_assessment":
    case "program_reactivation":
    case "follow_up":
    case "sensibilizacion":
    case "inclusive_selection":
    case "inclusive_hiring":
    case "operational_induction":
    case "organizational_induction":
    case "process_match":
      return true;
    case "attendance_support":
    case "needs_review":
      return false;
  }
}
