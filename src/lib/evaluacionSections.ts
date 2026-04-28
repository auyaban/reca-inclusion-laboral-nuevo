import { getMeaningfulAsistentes, isCompleteAsistente } from "@/lib/asistentes"
import type { FailedVisitPresetFieldGroup } from "@/lib/failedVisitPreset"
import { normalizeEvaluacionCatalogText } from "@/lib/evaluacionCatalogText"
import { MODALIDAD_OPTIONS } from "@/lib/modalidad"

export const EVALUACION_SECTION_ORDER = [
  "company",
  "section_2_1",
  "section_2_2",
  "section_2_3",
  "section_2_4",
  "section_2_5",
  "section_2_6",
  "section_3",
  "section_4",
  "section_5",
  "section_6",
  "section_7",
  "section_8"
] as const
export const EVALUACION_QUESTION_SECTION_IDS = [
  "section_2_1",
  "section_2_2",
  "section_2_3",
  "section_2_4",
  "section_2_5",
  "section_2_6",
  "section_3"
] as const
export const EVALUACION_DYNAMIC_SECTION_IDS = ["section_8"] as const
export const EVALUACION_OPTIONAL_QUESTION_FIELD_KEYS = [] as const

export type EvaluacionSectionId = (typeof EVALUACION_SECTION_ORDER)[number]
export type EvaluacionQuestionSectionId = (typeof EVALUACION_QUESTION_SECTION_IDS)[number]
export type EvaluacionNavGroupId = "section_2_group"
export type EvaluacionFieldClassification =
  | "input_web"
  | "derived"
  | "static_copy"
  | "auxiliary_sheet"
  | "deferred_blocker"
export type EvaluacionQuestionKind =
  | "accesible_con_observaciones"
  | "lista"
  | "lista_doble"
  | "lista_triple"
  | "lista_multiple"
  | "texto"
export type EvaluacionQuestionFieldKey =
  | "accesible"
  | "respuesta"
  | "secundaria"
  | "terciaria"
  | "cuaternaria"
  | "quinary"
  | "observaciones"
  | "detalle"
export type EvaluacionAdjustmentFieldKey = "aplica" | "nota" | "ajustes"
export type EvaluacionCompanyFieldSource = "input" | "empresa"

export type EvaluacionCompanyFieldDescriptor = {
  id: string
  label: string
  source: EvaluacionCompanyFieldSource
  classification: Extract<EvaluacionFieldClassification, "input_web" | "derived">
  readonly: boolean
  options: readonly string[]
  sheetCell: string
  path: string
}

export type EvaluacionQuestionFieldDescriptor = {
  key: EvaluacionQuestionFieldKey
  label: string
  classification: "input_web"
  sheetCell: string
  options: readonly string[]
  supportsDictation: boolean
}

export type EvaluacionQuestionDescriptor = {
  id: string
  sectionId: EvaluacionQuestionSectionId
  label: string
  kind: EvaluacionQuestionKind
  accesibleOptions: readonly string[]
  responseOptions: readonly string[]
  secondaryOptions: readonly string[]
  tertiaryOptions: readonly string[]
  quaternaryOptions: readonly string[]
  quinaryOptions: readonly string[]
  fields: readonly EvaluacionQuestionFieldDescriptor[]
}

export type EvaluacionConceptFieldDescriptor = {
  id: "nivel_accesibilidad" | "descripcion"
  label: string
  classification: Extract<EvaluacionFieldClassification, "input_web" | "derived">
  sheetCell: string
  options: readonly string[]
  path: string
}

export type EvaluacionAdjustmentFieldDescriptor = {
  key: EvaluacionAdjustmentFieldKey
  label: string
  classification: Extract<EvaluacionFieldClassification, "input_web" | "derived" | "static_copy">
  sheetCell: string
  options: readonly string[]
  path: string
}

export type EvaluacionAdjustmentItemDescriptor = {
  id: string
  label: string
  codes: string
  ajustes: string
  fields: readonly EvaluacionAdjustmentFieldDescriptor[]
}

export type EvaluacionNarrativeFieldDescriptor = {
  id: string
  label: string
  classification: "input_web"
  sheetCell: string
  path: string
  supportsDictation: boolean
}

export type EvaluacionFieldRegistryEntry = {
  path: string
  sectionId: EvaluacionSectionId
  classification: EvaluacionFieldClassification
  sheetCell?: string
  sheetDynamicTarget?: string
}

export type EvaluacionMasterDriftDescriptor = {
  id: string
  label: string
  classification: Extract<EvaluacionFieldClassification, "static_copy" | "auxiliary_sheet" | "deferred_blocker">
  sheetRef: string
  rationale: string
}

export const EVALUACION_DEFAULT_ASISTENTES_MODE = "reca_plus_agency_advisor"
export const EVALUACION_BASE_ASISTENTES_ROWS = 2
export const EVALUACION_MAX_ASISTENTES = 10
export const EVALUACION_MIN_SIGNIFICANT_ATTENDEES = 2
export const EVALUACION_NAV_SECTION_2_GROUP_ID = "section_2_group" as const
export const EVALUACION_SECTION_LABELS: Record<EvaluacionSectionId, string> = normalizeEvaluacionCatalogText({
  "company": "Empresa",
  "section_2_1": "2.1 Condiciones de movilidad y urbanisticas",
  "section_2_2": "2.2 Condiciones de accesibilidad general",
  "section_2_3": "2.3 Condiciones de accesibilidad discapacidad fisica",
  "section_2_4": "2.4 Condiciones de accesibilidad discapacidad sensorial",
  "section_2_5": "2.5 Condiciones de accesibilidad discapacidad intelectual - TEA",
  "section_2_6": "2.6 Condiciones de accesibilidad discapacidad psicosocial",
  "section_3": "3. Condiciones organizacionales",
  "section_4": "4. Concepto de la evaluacion",
  "section_5": "5. Ajustes razonables",
  "section_6": "6. Observaciones",
  "section_7": "7. Cargos compatibles",
  "section_8": "8. Asistentes"
})

export type EvaluacionNavConfigItem =
  | {
      type: "section"
      id: EvaluacionSectionId
      label: string
      shortLabel?: string
    }
  | {
      type: "group"
      id: EvaluacionNavGroupId
      label: string
      shortLabel?: string
      children: readonly EvaluacionSectionId[]
    }

export const EVALUACION_NAV_ITEMS: readonly EvaluacionNavConfigItem[] = [
  {
    type: "section",
    id: "company",
    label: EVALUACION_SECTION_LABELS.company,
    shortLabel: "Empresa"
  },
  {
    type: "group",
    id: EVALUACION_NAV_SECTION_2_GROUP_ID,
    label: "Sección 2",
    shortLabel: "2",
    children: [
      "section_2_1",
      "section_2_2",
      "section_2_3",
      "section_2_4",
      "section_2_5",
      "section_2_6"
    ]
  },
  {
    type: "section",
    id: "section_3",
    label: EVALUACION_SECTION_LABELS.section_3,
    shortLabel: "3"
  },
  {
    type: "section",
    id: "section_4",
    label: EVALUACION_SECTION_LABELS.section_4,
    shortLabel: "4"
  },
  {
    type: "section",
    id: "section_5",
    label: EVALUACION_SECTION_LABELS.section_5,
    shortLabel: "5"
  },
  {
    type: "section",
    id: "section_6",
    label: EVALUACION_SECTION_LABELS.section_6,
    shortLabel: "6"
  },
  {
    type: "section",
    id: "section_7",
    label: EVALUACION_SECTION_LABELS.section_7,
    shortLabel: "7"
  },
  {
    type: "section",
    id: "section_8",
    label: EVALUACION_SECTION_LABELS.section_8,
    shortLabel: "8"
  }
] as const

export const EVALUACION_COMPANY_FIELD_DESCRIPTORS: readonly EvaluacionCompanyFieldDescriptor[] = normalizeEvaluacionCatalogText([
  {
    "id": "fecha_visita",
    "label": "Fecha de la visita",
    "source": "input",
    "classification": "input_web",
    "readonly": false,
    "options": [],
    "sheetCell": "D7",
    "path": "fecha_visita"
  },
  {
    "id": "nombre_empresa",
    "label": "Nombre de la empresa",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D8",
    "path": "nombre_empresa"
  },
  {
    "id": "direccion_empresa",
    "label": "Dirección de la empresa",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D9",
    "path": "direccion_empresa"
  },
  {
    "id": "correo_1",
    "label": "Correo electrónico",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D10",
    "path": "correo_1"
  },
  {
    "id": "contacto_empresa",
    "label": "Contacto de la empresa",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D11",
    "path": "contacto_empresa"
  },
  {
    "id": "caja_compensacion",
    "label": "Empresa afiliada a Caja de Compensación",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D12",
    "path": "caja_compensacion"
  },
  {
    "id": "asesor",
    "label": "Asesor",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "D13",
    "path": "asesor"
  },
  {
    "id": "modalidad",
    "label": "Modalidad",
    "source": "input",
    "classification": "input_web",
    "readonly": false,
    "options": [
      "Presencial",
      "Virtual",
      "Mixta",
      "No aplica"
    ],
    "sheetCell": "P7",
    "path": "modalidad"
  },
  {
    "id": "ciudad_empresa",
    "label": "Ciudad/Municipio",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "P8",
    "path": "ciudad_empresa"
  },
  {
    "id": "nit_empresa",
    "label": "Número de NIT",
    "source": "input",
    "classification": "input_web",
    "readonly": false,
    "options": [],
    "sheetCell": "P9",
    "path": "nit_empresa"
  },
  {
    "id": "telefono_empresa",
    "label": "Teléfonos",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "P10",
    "path": "telefono_empresa"
  },
  {
    "id": "cargo",
    "label": "Cargo",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "P11",
    "path": "cargo"
  },
  {
    "id": "sede_empresa",
    "label": "Sede Compensar",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "P12",
    "path": "sede_empresa"
  },
  {
    "id": "profesional_asignado",
    "label": "Profesional asignado RECA",
    "source": "empresa",
    "classification": "derived",
    "readonly": true,
    "options": [],
    "sheetCell": "P13",
    "path": "profesional_asignado"
  }
])
export const EVALUACION_COMPANY_FIELD_IDS = EVALUACION_COMPANY_FIELD_DESCRIPTORS.map((field) => field.id)

export const EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION: Record<
  EvaluacionQuestionSectionId,
  readonly EvaluacionQuestionDescriptor[]
> = normalizeEvaluacionCatalogText({
  "section_2_1": [
    {
      "id": "transporte_publico",
      "sectionId": "section_2_1",
      "label": "¿Existe transporte público para ingresar y salir de la empresa?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M17",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q17",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "rutas_pcd",
      "sectionId": "section_2_1",
      "label": "¿La empresa cuenta con rutas para sus vinculados PcD?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M19",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q19",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "parqueaderos",
      "sectionId": "section_2_1",
      "label": "¿La organización cuenta con parqueaderos? (Vehículos, moto, bicicletas)",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M20",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q20",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "ubicacion_accesible",
      "sectionId": "section_2_1",
      "label": "¿La ubicación de la empresa es accesible?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M21",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q21",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "vias_cercanas",
      "sectionId": "section_2_1",
      "label": "¿Las vías cercanas a la empresa son accesibles?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M22",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q22",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "paso_peatonal",
      "sectionId": "section_2_1",
      "label": "¿Existe un paso peatonal accesible? (Puente peatonal, cebra, semáforo, sendero peatonal)",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M23",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q23",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "rampas_cerca",
      "sectionId": "section_2_1",
      "label": "¿Existen rampas cerca a la empresa?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M24",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q24",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "senales_podotactiles",
      "sectionId": "section_2_1",
      "label": "¿Existen señales podotáctiles?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Presencia de señales podotáctiles continuas y en buen estado.",
        "Presencia de señales podotáctiles discontinuas y en buen estado.",
        "No aplica.",
        "Presencia de señales podotáctiles continuas y en mal estado.",
        "Presencia de señales podotáctiles discontinuas y en mal estado."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M25",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P25",
          "options": [
            "Presencia de señales podotáctiles continuas y en buen estado.",
            "Presencia de señales podotáctiles discontinuas y en buen estado.",
            "No aplica.",
            "Presencia de señales podotáctiles continuas y en mal estado.",
            "Presencia de señales podotáctiles discontinuas y en mal estado."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "alumbrado_publico",
      "sectionId": "section_2_1",
      "label": "¿Se cuenta con alumbrado público cerca a la empresa?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Alumbrado público en buen estado.",
        "Alumbrado público en mal estado.",
        "No aplica"
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M26",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P26",
          "options": [
            "Alumbrado público en buen estado.",
            "Alumbrado público en mal estado.",
            "No aplica"
          ],
          "supportsDictation": false
        }
      ]
    }
  ],
  "section_2_2": [
    {
      "id": "areas_administrativa_operativa",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con área administrativa y operativa?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con ambas áreas.",
        "Se cuenta con área operativa.",
        "Se cuenta con área administrativa.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M28",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P28",
          "options": [
            "Cuenta con ambas áreas.",
            "Se cuenta con área operativa.",
            "Se cuenta con área administrativa.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "zonas_comunes",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con zonas comunes? (Describa cuáles)",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M29",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q29",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "enfermeria_accesible",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con enfermería y es accesible para la PcD?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Accesible para toda la población.",
        "No accesible para USR.",
        "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
        "No accesible para personas con discapacidad visual.",
        "No accesible para personas con discapacidad auditiva.",
        "No accesible para personas con discapacidad cognitiva.",
        "No accesible para personas con TEA.",
        "No accesible para personas con discapacidad psicosocial.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M30",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P30",
          "options": [
            "Accesible para toda la población.",
            "No accesible para USR.",
            "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
            "No accesible para personas con discapacidad visual.",
            "No accesible para personas con discapacidad auditiva.",
            "No accesible para personas con discapacidad cognitiva.",
            "No accesible para personas con TEA.",
            "No accesible para personas con discapacidad psicosocial.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q31",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "ergonomia_administrativa",
      "sectionId": "section_2_2",
      "label": "En el área administrativa, el diseño de los puestos de trabajo y mobiliario es ergonómico y está en buen estado?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Accesible para toda la población.",
        "No accesible para USR.",
        "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
        "No accesible para personas con discapacidad visual.",
        "No accesible para personas con discapacidad auditiva.",
        "No accesible para personas con discapacidad cognitiva.",
        "No accesible para personas con TEA.",
        "No accesible para personas con discapacidad psicosocial.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M32",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P32",
          "options": [
            "Accesible para toda la población.",
            "No accesible para USR.",
            "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
            "No accesible para personas con discapacidad visual.",
            "No accesible para personas con discapacidad auditiva.",
            "No accesible para personas con discapacidad cognitiva.",
            "No accesible para personas con TEA.",
            "No accesible para personas con discapacidad psicosocial.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q33",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "ergonomia_operativa",
      "sectionId": "section_2_2",
      "label": "En el área operativa, el diseño de los puestos de trabajo y mobiliario son ergonómicos y están en buen estado?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Accesible para toda la población.",
        "No accesible para USR.",
        "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
        "No accesible para personas con discapacidad visual.",
        "No accesible para personas con discapacidad auditiva.",
        "No accesible para personas con discapacidad cognitiva.",
        "No accesible para personas con TEA.",
        "No accesible para personas con discapacidad psicosocial.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M34",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P34",
          "options": [
            "Accesible para toda la población.",
            "No accesible para USR.",
            "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
            "No accesible para personas con discapacidad visual.",
            "No accesible para personas con discapacidad auditiva.",
            "No accesible para personas con discapacidad cognitiva.",
            "No accesible para personas con TEA.",
            "No accesible para personas con discapacidad psicosocial.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q34",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "mobiliario_zonas_comunes",
      "sectionId": "section_2_2",
      "label": "¿En las zonas comunes, el mobiliario se encuentra en buen estado?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Accesible para toda la población.",
        "No accesible para USR.",
        "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
        "No accesible para personas con discapacidad visual.",
        "No accesible para personas con discapacidad auditiva.",
        "No accesible para personas con discapacidad cognitiva.",
        "No accesible para personas con TEA.",
        "No accesible para personas con discapacidad psicosocial.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M36",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P36",
          "options": [
            "Accesible para toda la población.",
            "No accesible para USR.",
            "No accesible para personas con discapacidad física con apoyo diferente a silla de ruedas.",
            "No accesible para personas con discapacidad visual.",
            "No accesible para personas con discapacidad auditiva.",
            "No accesible para personas con discapacidad cognitiva.",
            "No accesible para personas con TEA.",
            "No accesible para personas con discapacidad psicosocial.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q37",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "evaluacion_ergonomica_puestos",
      "sectionId": "section_2_2",
      "label": "¿La organización ha realizado evaluación ergonómica de los puestos de trabajo?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Con apoyo de la ARL.",
        "Sin apoyo de la ARL.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M38",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P38",
          "options": [
            "Con apoyo de la ARL.",
            "Sin apoyo de la ARL.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ventilacion_area_administrativa",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de ventilación se cuenta en el área administrativa?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Ventilación natural.",
        "Ventilación artificial.",
        "Ventilación natural y artificial.",
        "No cuenta con ventilación.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
        "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M39",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P39",
          "options": [
            "Ventilación natural.",
            "Ventilación artificial.",
            "Ventilación natural y artificial.",
            "No cuenta con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P40",
          "options": [
            "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
            "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ventilacion_area_operativa",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de ventilación se cuenta en el área operativa?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Ventilación natural.",
        "Ventilación artificial.",
        "Ventilación natural y artificial.",
        "No cuenta con ventilación.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
        "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M41",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P41",
          "options": [
            "Ventilación natural.",
            "Ventilación artificial.",
            "Ventilación natural y artificial.",
            "No cuenta con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P42",
          "options": [
            "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
            "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ventilacion_areas_comunes",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de ventilación se cuenta en las áreas comunes?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Ventilación natural.",
        "Ventilación artificial.",
        "Ventilación natural y artificial.",
        "No cuenta con ventilación.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
        "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M43",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P43",
          "options": [
            "Ventilación natural.",
            "Ventilación artificial.",
            "Ventilación natural y artificial.",
            "No cuenta con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P44",
          "options": [
            "La organización ha realizado mediciones higiénicas relacionadas con ventilación.",
            "La organización NO ha realizado mediciones higiénicas relacionadas con ventilación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "iluminacion_area_administrativa",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de iluminación se cuenta en el área administrativa?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Iluminación natural y artificial.",
        "Iluminación artificial.",
        "Iluminación natural.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas en iluminación.",
        "La organización no ha realizado mediciones higiénicas en iluminación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M45",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P45",
          "options": [
            "Iluminación natural y artificial.",
            "Iluminación artificial.",
            "Iluminación natural.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P46",
          "options": [
            "La organización ha realizado mediciones higiénicas en iluminación.",
            "La organización no ha realizado mediciones higiénicas en iluminación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "iluminacion_area_operativa",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de iluminación se cuenta en el área operativa?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Iluminación natural y artificial.",
        "Iluminación artificial.",
        "Iluminación natural.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas en iluminación.",
        "La organización no ha realizado mediciones higiénicas en iluminación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M47",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P47",
          "options": [
            "Iluminación natural y artificial.",
            "Iluminación artificial.",
            "Iluminación natural.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P48",
          "options": [
            "La organización ha realizado mediciones higiénicas en iluminación.",
            "La organización no ha realizado mediciones higiénicas en iluminación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "iluminacion_areas_comunes",
      "sectionId": "section_2_2",
      "label": "¿Con qué tipo de iluminación se cuenta en las áreas comunes?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Iluminación natural y artificial.",
        "Iluminación artificial.",
        "Iluminación natural.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La organización ha realizado mediciones higiénicas en iluminación.",
        "La organización no ha realizado mediciones higiénicas en iluminación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M49",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P49",
          "options": [
            "Iluminación natural y artificial.",
            "Iluminación artificial.",
            "Iluminación natural.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P50",
          "options": [
            "La organización ha realizado mediciones higiénicas en iluminación.",
            "La organización no ha realizado mediciones higiénicas en iluminación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ruido_area_administrativa",
      "sectionId": "section_2_2",
      "label": "¿El nivel de ruido en el área administrativa es adecuado?",
      "kind": "lista_triple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Percepción de ruido bajo.",
        "Percepción de ruido medio.",
        "Percepción de ruido alto.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Se requiere el uso de elemento de protección auditiva.",
        "No se requiere el uso de elementos de protección auditiva.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "La organización ha realizado mediciones higiénicas de ruido.",
        "La organización No ha realizado mediciones higiénicas de ruido.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M51",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P51",
          "options": [
            "Percepción de ruido bajo.",
            "Percepción de ruido medio.",
            "Percepción de ruido alto.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P52",
          "options": [
            "Se requiere el uso de elemento de protección auditiva.",
            "No se requiere el uso de elementos de protección auditiva.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P53",
          "options": [
            "La organización ha realizado mediciones higiénicas de ruido.",
            "La organización No ha realizado mediciones higiénicas de ruido.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ruido_area_operativa",
      "sectionId": "section_2_2",
      "label": "¿El nivel de ruido en el área operativa es adecuado?",
      "kind": "lista_triple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Percepción de ruido bajo.",
        "Percepción de ruido medio.",
        "Percepción de ruido alto.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Se requiere el uso de elemento de protección auditiva.",
        "No se requiere el uso de elementos de protección auditiva.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "La organización ha realizado mediciones higiénicas de ruido.",
        "La organización No ha realizado mediciones higiénicas de ruido.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M54",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P54",
          "options": [
            "Percepción de ruido bajo.",
            "Percepción de ruido medio.",
            "Percepción de ruido alto.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P55",
          "options": [
            "Se requiere el uso de elemento de protección auditiva.",
            "No se requiere el uso de elementos de protección auditiva.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P56",
          "options": [
            "La organización ha realizado mediciones higiénicas de ruido.",
            "La organización No ha realizado mediciones higiénicas de ruido.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ruido_areas_comunes",
      "sectionId": "section_2_2",
      "label": "¿El nivel de ruido de las áreas comunes es adecuado?",
      "kind": "lista_triple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Percepción de ruido bajo.",
        "Percepción de ruido medio.",
        "Percepción de ruido alto.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Se requiere el uso de elemento de protección auditiva.",
        "No se requiere el uso de elementos de protección auditiva.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "La organización ha realizado mediciones higiénicas de ruido.",
        "La organización No ha realizado mediciones higiénicas de ruido.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M57",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P57",
          "options": [
            "Percepción de ruido bajo.",
            "Percepción de ruido medio.",
            "Percepción de ruido alto.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P58",
          "options": [
            "Se requiere el uso de elemento de protección auditiva.",
            "No se requiere el uso de elementos de protección auditiva.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P59",
          "options": [
            "La organización ha realizado mediciones higiénicas de ruido.",
            "La organización No ha realizado mediciones higiénicas de ruido.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "flexibilidad_hibrido_remoto",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con flexibilidad de trabajo híbrido o remoto?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "No cuenta con flexibilidad de trabajo.",
        "Sí cuenta con flexibilidad de trabajo.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M60",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P60",
          "options": [
            "No cuenta con flexibilidad de trabajo.",
            "Sí cuenta con flexibilidad de trabajo.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "flexibilidad_horarios_calamidades",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con flexibilidad de horarios ante calamidades domésticas, teniendo en cuenta las mujeres cuidadoras?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "No cuenta con flexibilidad.",
        "Sí cuenta con flexibilidad.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M61",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P61",
          "options": [
            "No cuenta con flexibilidad.",
            "Sí cuenta con flexibilidad.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "sala_lactancia",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con sala de lactancia?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Sí",
        "No",
        "En construcción"
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M62",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P62",
          "options": [
            "Sí",
            "No",
            "En construcción"
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "protocolo_sala_lactancia",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con protocolo de manejo en sala de lactancia según resolución 2423 del 2018?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Sí",
        "No",
        "En construcción"
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M63",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P63",
          "options": [
            "Sí",
            "No",
            "En construcción"
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "linea_purpura",
      "sectionId": "section_2_2",
      "label": "¿La empresa conoce y maneja la línea Púrpura?",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M64",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q64",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "salas_amigas",
      "sectionId": "section_2_2",
      "label": "¿La empresa conoce y maneja salas amigas?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Sí",
        "No",
        "En construcción"
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M65",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P65",
          "options": [
            "Sí",
            "No",
            "En construcción"
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "protocolo_hostigamiento_acoso_sexual",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con un protocolo contra el hostigamiento y acoso sexual?",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M66",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q66",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "protocolo_acoso_laboral",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con un protocolo contra el acoso laboral?",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M67",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q67",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "practicas_equidad_genero",
      "sectionId": "section_2_2",
      "label": "¿La empresa cuenta con prácticas inclusivas orientadas a la equidad de género, cuáles?",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M68",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q68",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "canales_comunicacion_lenguaje_inclusivo",
      "sectionId": "section_2_2",
      "label": "¿Cuenta con canales de comunicación interno que promuevan el uso de lenguaje inclusivo?",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M69",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q69",
          "options": [],
          "supportsDictation": true
        }
      ]
    }
  ],
  "section_2_3": [
    {
      "id": "entrada_salida",
      "sectionId": "section_2_3",
      "label": "¿La entrada y salida de la empresa es accesible?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M71",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q71",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "rampas_interior_usr",
      "sectionId": "section_2_3",
      "label": "¿Hay rampas al interior de la empresa para el acceso a USR?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M72",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q72",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "ascensor_interior",
      "sectionId": "section_2_3",
      "label": "¿Hay ascensor al interior de las instalaciones?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M73",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q73",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "zonas_oficinas_accesibles",
      "sectionId": "section_2_3",
      "label": "¿Las zonas de oficinas son accesibles?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M74",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q74",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "cafeteria_accesible",
      "sectionId": "section_2_3",
      "label": "¿La cafetería es accesible?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M75",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q75",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "zonas_descanso_accesibles",
      "sectionId": "section_2_3",
      "label": "¿Las zonas de descanso son accesibles?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M76",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q76",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "pasillos_amplios",
      "sectionId": "section_2_3",
      "label": "¿Los pasillos son amplios y permiten el desplazamiento independiente?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M77",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q77",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "escaleras_doble_funcion",
      "sectionId": "section_2_3",
      "label": "¿Las escaleras cumplen una doble función, tanto para emergencias como para el tránsito interno de la empresa?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con pasamanos a un solo costado de la escalera.",
        "Cuenta con pasamanos en ambos costados.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Cuenta con bandas antideslizantes.",
        "No cuenta con bandas antideslizantes.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No aplica."
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M78",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P78",
          "options": [
            "Cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P79",
          "options": [
            "Cuenta con pasamanos a un solo costado de la escalera.",
            "Cuenta con pasamanos en ambos costados.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P80",
          "options": [
            "Cuenta con bandas antideslizantes.",
            "No cuenta con bandas antideslizantes.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P81",
          "options": [
            "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "escaleras_interior",
      "sectionId": "section_2_3",
      "label": "¿Hay escaleras al interior de las instalaciones?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con pasamanos a un solo costado de la escalera.",
        "Cuenta con pasamanos en ambos costados.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Cuenta con bandas antideslizantes.",
        "No cuenta con bandas antideslizantes.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No aplica."
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M82",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P82",
          "options": [
            "Cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P83",
          "options": [
            "Cuenta con pasamanos a un solo costado de la escalera.",
            "Cuenta con pasamanos en ambos costados.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P84",
          "options": [
            "Cuenta con bandas antideslizantes.",
            "No cuenta con bandas antideslizantes.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P85",
          "options": [
            "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "escaleras_emergencia",
      "sectionId": "section_2_3",
      "label": "¿Cuenta con escaleras de emergencia?",
      "kind": "lista_triple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No cuenta con pasamanos (Altura de 85 a 100 cm).",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con bandas antideslizantes.",
        "No cuenta con bandas antideslizantes.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M86",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P86",
          "options": [
            "Cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No cuenta con pasamanos (Altura de 85 a 100 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P87",
          "options": [
            "Cuenta con bandas antideslizantes.",
            "No cuenta con bandas antideslizantes.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P88",
          "options": [
            "Cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No cuenta con las características básicas de un diseño seguro (Ancho mínimo 90 cm).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "bano_discapacidad_fisica",
      "sectionId": "section_2_3",
      "label": "¿Existe un baño para discapacidad física?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
        "No cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con espacio mínimo de lado o al frente de 120 cm.",
        "No cuenta con espacio mínimo de lado o al frente de 120 cm.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Cuenta con lavamanos de altura de 75 cm.",
        "No cuenta con lavamanos de altura de 75 cm.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "Cuenta con timbre de emergencia situado al lado del sanitario.",
        "No cuenta con timbre de emergencia situado al lado del sanitario.",
        "No aplica."
      ],
      "quinaryOptions": [
        "Los accesorios interfieren con las barras de apoyo.",
        "Los accesorios NO interfieren con las barras de apoyo.",
        "No aplica."
      ],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M89",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P89",
          "options": [
            "Cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
            "No cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P90",
          "options": [
            "Cuenta con espacio mínimo de lado o al frente de 120 cm.",
            "No cuenta con espacio mínimo de lado o al frente de 120 cm.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P91",
          "options": [
            "Cuenta con lavamanos de altura de 75 cm.",
            "No cuenta con lavamanos de altura de 75 cm.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P92",
          "options": [
            "Cuenta con timbre de emergencia situado al lado del sanitario.",
            "No cuenta con timbre de emergencia situado al lado del sanitario.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "quinary",
          "label": "Selecci?n 5",
          "classification": "input_web",
          "sheetCell": "P93",
          "options": [
            "Los accesorios interfieren con las barras de apoyo.",
            "Los accesorios NO interfieren con las barras de apoyo.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "silla_evacuacion_usr",
      "sectionId": "section_2_3",
      "label": "¿La empresa cuenta con silla de evacuación para personas USR?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Silla de evacuación en buen estado.",
        "Silla de evacuación en mal estado.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M94",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P94",
          "options": [
            "Silla de evacuación en buen estado.",
            "Silla de evacuación en mal estado.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "silla_evacuacion_oruga",
      "sectionId": "section_2_3",
      "label": "¿La empresa cuenta con silla de evacuación tipo oruga?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Silla tipo oruga en buen estado.",
        "Silla tipo oruga en mal estado.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M95",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P95",
          "options": [
            "Silla tipo oruga en buen estado.",
            "Silla tipo oruga en mal estado.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ergonomia_superficies_irregulares",
      "sectionId": "section_2_3",
      "label": "¿La organización ha realizado evaluación ergonómica de superficies sin irregularidades? (Sin desniveles bruscos y con suelos que sean antideslizantes)",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Con apoyo de la ARL.",
        "Sin apoyo de la ARL.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M96",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P96",
          "options": [
            "Con apoyo de la ARL.",
            "Sin apoyo de la ARL.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "senalizacion_ntc",
      "sectionId": "section_2_3",
      "label": "¿La señalización cumple con los criterios de la NTC?",
      "kind": "lista_doble",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "La señalización cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
        "La señalización No cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
        "No aplica.",
        "No se cuenta con señalización de orientación."
      ],
      "secondaryOptions": [
        "La señalización cumple con los criterios de material de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M97",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P97",
          "options": [
            "La señalización cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
            "La señalización No cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
            "No aplica.",
            "No se cuenta con señalización de orientación."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P98",
          "options": [
            "La señalización cumple con los criterios de material de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "mapa_evacuacion_ntc",
      "sectionId": "section_2_3",
      "label": "¿El mapa de evacuación cumple con criterios de accesibilidad de la NTC?",
      "kind": "lista_triple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con señalización en el área operativa.",
        "Cuenta con señalización en el área administrativa.",
        "Cuenta con señalización en ambas áreas.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La señalización cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
        "La señalización No cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
        "No aplica.",
        "No se cuenta con señalización de orientación."
      ],
      "tertiaryOptions": [
        "La señalización cumple con los criterios de material de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M99",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P99",
          "options": [
            "Cuenta con señalización en el área operativa.",
            "Cuenta con señalización en el área administrativa.",
            "Cuenta con señalización en ambas áreas.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P100",
          "options": [
            "La señalización cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
            "La señalización No cumple con los criterios de altura de acuerdo a la NTC (Altura de 120 cm a 160 cm).",
            "No aplica.",
            "No se cuenta con señalización de orientación."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P101",
          "options": [
            "La señalización cumple con los criterios de material de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ajustes_razonables_individualizados",
      "sectionId": "section_2_3",
      "label": "¿La organización cuenta con la posibilidad de hacer ajustes razonables individualizados?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M102",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P102",
          "options": [
            "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ajustes_razonables_detalle",
      "sectionId": "section_2_3",
      "label": "Detalle de ajustes razonables individualizados",
      "kind": "texto",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "Q103",
          "options": [],
          "supportsDictation": true
        }
      ]
    }
  ],
  "section_2_4": [
    {
      "id": "senalizacion_orientacion",
      "sectionId": "section_2_4",
      "label": "¿Se cuenta con señalización de orientación y movilidad?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con señalización en el área operativa.",
        "Cuenta con señalización en el área administrativa.",
        "Cuenta con señalización en ambas áreas.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M105",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P105",
          "options": [
            "Cuenta con señalización en el área operativa.",
            "Cuenta con señalización en el área administrativa.",
            "Cuenta con señalización en ambas áreas.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "senalizacion_emergencia",
      "sectionId": "section_2_4",
      "label": "¿Se cuenta con señalización de emergencia?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con señalización en el área operativa.",
        "Cuenta con señalización en el área administrativa.",
        "Cuenta con señalización en ambas áreas.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M106",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P106",
          "options": [
            "Cuenta con señalización en el área operativa.",
            "Cuenta con señalización en el área administrativa.",
            "Cuenta con señalización en ambas áreas.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "distribucion_zonas_comunes",
      "sectionId": "section_2_4",
      "label": "¿La distribución de las zonas comunes (cafetería, oficinas, entre otras) permite una fácil orientación y guía espacial?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M107",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q107",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "senalizacion_mapa_evacuacion",
      "sectionId": "section_2_4",
      "label": "¿La señalización de mapa evacuación garantiza que pueda comprender y orientarse de manera autónoma y segura, \"relieve-colores, apoyo auditivo\"?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M108",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q108",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "ascensor_apoyo_visual_sonoro",
      "sectionId": "section_2_4",
      "label": "¿El ascensor al interior de las instalaciones cuenta con apoyo visual y sonoro?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M109",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q109",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "apoyo_seguridad_ubicacion",
      "sectionId": "section_2_4",
      "label": "¿Se cuenta con apoyo de seguridad para la ubicación dentro de las instalaciones?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M110",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q110",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "senalizacion_ntc",
      "sectionId": "section_2_4",
      "label": "¿La señalización cumple con los criterios de la NTC?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "La señalización cumple con los criterios de material de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La señalización cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
        "No se cuenta con señalización de orientación.",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M111",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P111",
          "options": [
            "La señalización cumple con los criterios de material de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P112",
          "options": [
            "La señalización cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
            "No se cuenta con señalización de orientación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "mapa_evacuacion_ntc",
      "sectionId": "section_2_4",
      "label": "¿El mapa de evacuación cumple con criterios de accesibilidad de la NTC?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con señalización en el área operativa.",
        "Cuenta con señalización en el área administrativa.",
        "Cuenta con señalización en ambas áreas.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La señalización cumple con los criterios de material de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "La señalización cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
        "La señalización No cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
        "No se cuenta con señalización de orientación.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M113",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P113",
          "options": [
            "Cuenta con señalización en el área operativa.",
            "Cuenta con señalización en el área administrativa.",
            "Cuenta con señalización en ambas áreas.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P114",
          "options": [
            "La señalización cumple con los criterios de material de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de material de acuerdo a la NTC.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P115",
          "options": [
            "La señalización cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
            "La señalización No cumple con los criterios de accesibilidad (Braille, LSC, pictograma y letras) de acuerdo a la NTC.",
            "No se cuenta con señalización de orientación.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "informacion_accesible_ingreso",
      "sectionId": "section_2_4",
      "label": "¿Se suministra información accesible al ingreso de la empresa?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "El nombre de la empresa es visible desde el exterior.",
        "El nombre de la empresa No es visible desde el exterior.",
        "No aplica."
      ],
      "secondaryOptions": [
        "La nomenclatura (número de bodega, dirección) de la empresa es visible desde el exterior.",
        "La nomenclatura (número de bodega, dirección) de la empresa No es visible desde el exterior.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "El timbre cuenta con apoyo auditivo.",
        "El timbre cuenta con apoyo visual.",
        "El timbre cuenta con apoyo visual y auditivo.",
        "Cuenta con timbre pero no es accesible para PCD.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "La empresa cuenta con citofono.",
        "La empresa No cuenta con citofono.",
        "No aplica.",
        "La empresa cuenta con teléfono anuncio ingreso"
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M116",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P116",
          "options": [
            "El nombre de la empresa es visible desde el exterior.",
            "El nombre de la empresa No es visible desde el exterior.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P117",
          "options": [
            "La nomenclatura (número de bodega, dirección) de la empresa es visible desde el exterior.",
            "La nomenclatura (número de bodega, dirección) de la empresa No es visible desde el exterior.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P118",
          "options": [
            "El timbre cuenta con apoyo auditivo.",
            "El timbre cuenta con apoyo visual.",
            "El timbre cuenta con apoyo visual y auditivo.",
            "Cuenta con timbre pero no es accesible para PCD.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P119",
          "options": [
            "La empresa cuenta con citofono.",
            "La empresa No cuenta con citofono.",
            "No aplica.",
            "La empresa cuenta con teléfono anuncio ingreso"
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "medios_tecnologicos_ingreso",
      "sectionId": "section_2_4",
      "label": "¿La empresa hace uso de medios tecnológicos para el ingreso? (Tablet, lector facial, biométrico)",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M120",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q120",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "material_seleccion_accesible",
      "sectionId": "section_2_4",
      "label": "¿El material utilizado en el proceso de selección es accesible?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con subtítulos y LSC.",
        "No cuenta con subtítulos y LSC.",
        "No aplica.",
        "Cuenta con LSC y no tiene apoyo de subtítulos.",
        "Cuenta con subtítulos y no apoyo de LSC."
      ],
      "secondaryOptions": [
        "Cuenta con audiodescripción y sistema braille.",
        "No cuenta con audiodescripción y sistema braille.",
        "No aplica.",
        "Cuenta con audiodescripción y no cuenta con sistema braille.",
        "No cuenta con audiodescripción y cuenta con sistema braille."
      ],
      "tertiaryOptions": [
        "Cuenta con vídeos, imágenes y pictogramas.",
        "No cuenta con vídeos, imágenes y pictogramas.",
        "No aplica.",
        "Cuenta con vídeos.",
        "Cuenta con vídeos e imágenes.",
        "Cuenta con vídeos y pictogramas.",
        "Cuenta con imágenes.",
        "Cuenta con imágenes y pictogramas.",
        "Cuenta con pictogramas."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M121",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P121",
          "options": [
            "Cuenta con subtítulos y LSC.",
            "No cuenta con subtítulos y LSC.",
            "No aplica.",
            "Cuenta con LSC y no tiene apoyo de subtítulos.",
            "Cuenta con subtítulos y no apoyo de LSC."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P122",
          "options": [
            "Cuenta con audiodescripción y sistema braille.",
            "No cuenta con audiodescripción y sistema braille.",
            "No aplica.",
            "Cuenta con audiodescripción y no cuenta con sistema braille.",
            "No cuenta con audiodescripción y cuenta con sistema braille."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P123",
          "options": [
            "Cuenta con vídeos, imágenes y pictogramas.",
            "No cuenta con vídeos, imágenes y pictogramas.",
            "No aplica.",
            "Cuenta con vídeos.",
            "Cuenta con vídeos e imágenes.",
            "Cuenta con vídeos y pictogramas.",
            "Cuenta con imágenes.",
            "Cuenta con imágenes y pictogramas.",
            "Cuenta con pictogramas."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_contratacion_accesible",
      "sectionId": "section_2_4",
      "label": "¿El material utilizado en el proceso de contratación es accesible?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con audiodescripción y sistema braille.",
        "No cuenta con audiodescripción y sistema braille.",
        "No aplica.",
        "Cuenta con audiodescripción y no cuenta con sistema braille.",
        "No cuenta con audiodescripción y cuenta con sistema braille."
      ],
      "secondaryOptions": [
        "Cuenta con vídeos, imágenes y pictogramas.",
        "No cuenta con vídeos, imágenes y pictogramas.",
        "No aplica.",
        "Cuenta con vídeos.",
        "Cuenta con vídeos e imágenes.",
        "Cuenta con vídeos y pictogramas.",
        "Cuenta con imágenes.",
        "Cuenta con imágenes y pictogramas.",
        "Cuenta con pictogramas."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M124",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P124",
          "options": [
            "Cuenta con audiodescripción y sistema braille.",
            "No cuenta con audiodescripción y sistema braille.",
            "No aplica.",
            "Cuenta con audiodescripción y no cuenta con sistema braille.",
            "No cuenta con audiodescripción y cuenta con sistema braille."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P126",
          "options": [
            "Cuenta con vídeos, imágenes y pictogramas.",
            "No cuenta con vídeos, imágenes y pictogramas.",
            "No aplica.",
            "Cuenta con vídeos.",
            "Cuenta con vídeos e imágenes.",
            "Cuenta con vídeos y pictogramas.",
            "Cuenta con imágenes.",
            "Cuenta con imágenes y pictogramas.",
            "Cuenta con pictogramas."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_induccion_accesible",
      "sectionId": "section_2_4",
      "label": "¿El material utilizado en el proceso de inducción y reinducción es accesible?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con subtítulos y LSC.",
        "No cuenta con subtítulos y LSC.",
        "No aplica.",
        "Cuenta con LSC y no tiene apoyo de subtítulos.",
        "Cuenta con subtítulos y no apoyo de LSC."
      ],
      "secondaryOptions": [
        "Cuenta con audiodescripción y sistema braille.",
        "No cuenta con audiodescripción y sistema braille.",
        "No aplica.",
        "Cuenta con audiodescripción y no cuenta con sistema braille.",
        "No cuenta con audiodescripción y cuenta con sistema braille."
      ],
      "tertiaryOptions": [
        "Cuenta con vídeos, imágenes y pictogramas.",
        "No cuenta con vídeos, imágenes y pictogramas.",
        "No aplica.",
        "Cuenta con vídeos.",
        "Cuenta con vídeos e imágenes.",
        "Cuenta con vídeos y pictogramas.",
        "Cuenta con imágenes.",
        "Cuenta con imágenes y pictogramas.",
        "Cuenta con pictogramas."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M127",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P127",
          "options": [
            "Cuenta con subtítulos y LSC.",
            "No cuenta con subtítulos y LSC.",
            "No aplica.",
            "Cuenta con LSC y no tiene apoyo de subtítulos.",
            "Cuenta con subtítulos y no apoyo de LSC."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P129",
          "options": [
            "Cuenta con audiodescripción y sistema braille.",
            "No cuenta con audiodescripción y sistema braille.",
            "No aplica.",
            "Cuenta con audiodescripción y no cuenta con sistema braille.",
            "No cuenta con audiodescripción y cuenta con sistema braille."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P130",
          "options": [
            "Cuenta con vídeos, imágenes y pictogramas.",
            "No cuenta con vídeos, imágenes y pictogramas.",
            "No aplica.",
            "Cuenta con vídeos.",
            "Cuenta con vídeos e imágenes.",
            "Cuenta con vídeos y pictogramas.",
            "Cuenta con imágenes.",
            "Cuenta con imágenes y pictogramas.",
            "Cuenta con pictogramas."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_evaluacion_desempeno",
      "sectionId": "section_2_4",
      "label": "¿El material utilizado en el proceso de evaluación del desempeño es accesible?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con subtítulos y LSC.",
        "No cuenta con subtítulos y LSC.",
        "No aplica.",
        "Cuenta con LSC y no tiene apoyo de subtítulos.",
        "Cuenta con subtítulos y no apoyo de LSC."
      ],
      "secondaryOptions": [
        "Cuenta con audiodescripción y sistema braille.",
        "No cuenta con audiodescripción y sistema braille.",
        "No aplica.",
        "Cuenta con audiodescripción y no cuenta con sistema braille.",
        "No cuenta con audiodescripción y cuenta con sistema braille."
      ],
      "tertiaryOptions": [
        "Cuenta con vídeos, imágenes y pictogramas.",
        "No cuenta con vídeos, imágenes y pictogramas.",
        "No aplica.",
        "Cuenta con vídeos.",
        "Cuenta con vídeos e imágenes.",
        "Cuenta con vídeos y pictogramas.",
        "Cuenta con imágenes.",
        "Cuenta con imágenes y pictogramas.",
        "Cuenta con pictogramas."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M131",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P131",
          "options": [
            "Cuenta con subtítulos y LSC.",
            "No cuenta con subtítulos y LSC.",
            "No aplica.",
            "Cuenta con LSC y no tiene apoyo de subtítulos.",
            "Cuenta con subtítulos y no apoyo de LSC."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P132",
          "options": [
            "Cuenta con audiodescripción y sistema braille.",
            "No cuenta con audiodescripción y sistema braille.",
            "No aplica.",
            "Cuenta con audiodescripción y no cuenta con sistema braille.",
            "No cuenta con audiodescripción y cuenta con sistema braille."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P133",
          "options": [
            "Cuenta con vídeos, imágenes y pictogramas.",
            "No cuenta con vídeos, imágenes y pictogramas.",
            "No aplica.",
            "Cuenta con vídeos.",
            "Cuenta con vídeos e imágenes.",
            "Cuenta con vídeos y pictogramas.",
            "Cuenta con imágenes.",
            "Cuenta con imágenes y pictogramas.",
            "Cuenta con pictogramas."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "plataformas_autogestion",
      "sectionId": "section_2_4",
      "label": "¿La organización cuenta con plataformas de autogestión?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Trámites administrativos.",
        "Proceso de autocapacitación.",
        "Trámites administrativos y proceso de autocapacitación.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con subtítulos y LSC.",
        "No cuenta con subtítulos y LSC.",
        "No aplica.",
        "Cuenta con LSC y no tiene apoyo de subtítulos.",
        "Cuenta con subtítulos y no apoyo de LSC."
      ],
      "tertiaryOptions": [
        "Cuenta con audiodescripción y sistema braille.",
        "No cuenta con audiodescripción y sistema braille.",
        "No aplica.",
        "Cuenta con audiodescripción y no cuenta con sistema braille.",
        "No cuenta con audiodescripción y cuenta con sistema braille."
      ],
      "quaternaryOptions": [
        "Cuenta con vídeos, imágenes y pictogramas.",
        "No cuenta con vídeos, imágenes y pictogramas.",
        "No aplica.",
        "Cuenta con vídeos.",
        "Cuenta con vídeos e imágenes.",
        "Cuenta con vídeos y pictogramas.",
        "Cuenta con imágenes.",
        "Cuenta con imágenes y pictogramas.",
        "Cuenta con pictogramas."
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M134",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P134",
          "options": [
            "Trámites administrativos.",
            "Proceso de autocapacitación.",
            "Trámites administrativos y proceso de autocapacitación.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P135",
          "options": [
            "Cuenta con subtítulos y LSC.",
            "No cuenta con subtítulos y LSC.",
            "No aplica.",
            "Cuenta con LSC y no tiene apoyo de subtítulos.",
            "Cuenta con subtítulos y no apoyo de LSC."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P137",
          "options": [
            "Cuenta con audiodescripción y sistema braille.",
            "No cuenta con audiodescripción y sistema braille.",
            "No aplica.",
            "Cuenta con audiodescripción y no cuenta con sistema braille.",
            "No cuenta con audiodescripción y cuenta con sistema braille."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P138",
          "options": [
            "Cuenta con vídeos, imágenes y pictogramas.",
            "No cuenta con vídeos, imágenes y pictogramas.",
            "No aplica.",
            "Cuenta con vídeos.",
            "Cuenta con vídeos e imágenes.",
            "Cuenta con vídeos y pictogramas.",
            "Cuenta con imágenes.",
            "Cuenta con imágenes y pictogramas.",
            "Cuenta con pictogramas."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "alarma_emergencia",
      "sectionId": "section_2_4",
      "label": "¿La empresa cuenta con alarma de emergencia accesible?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con solo alarma auditiva.",
        "Cuenta con solo alarma visual.",
        "Cuenta con alarma auditiva y visual.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M139",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P139",
          "options": [
            "Cuenta con solo alarma auditiva.",
            "Cuenta con solo alarma visual.",
            "Cuenta con alarma auditiva y visual.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ajustes_razonables_individualizados",
      "sectionId": "section_2_4",
      "label": "¿La organización cuenta con la posibilidad de hacer ajustes razonables individualizados?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M140",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P140",
          "options": [
            "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "detalle",
          "label": "Detalle",
          "classification": "input_web",
          "sheetCell": "Q141",
          "options": [],
          "supportsDictation": true
        }
      ]
    }
  ],
  "section_2_5": [
    {
      "id": "material_seleccion_cognitiva",
      "sectionId": "section_2_5",
      "label": "¿El material utilizado en el proceso de selección es accesible?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M143",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P143",
          "options": [
            "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_contratacion_cognitiva",
      "sectionId": "section_2_5",
      "label": "¿El material utilizado en el proceso de contratación es accesible?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M144",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P144",
          "options": [
            "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_induccion_cognitiva",
      "sectionId": "section_2_5",
      "label": "¿El material utilizado en el proceso de inducción y reinducción es accesible?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M145",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P145",
          "options": [
            "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "material_evaluacion_cognitiva",
      "sectionId": "section_2_5",
      "label": "¿El material utilizado en el proceso de evaluación del desempeño es accesible?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M146",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P146",
          "options": [
            "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ascensor_facil_ubicacion",
      "sectionId": "section_2_5",
      "label": "¿El ascensor al interior de las instalaciones es de fácil ubicación y su llamado a piso es de fácil entendimiento?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M147",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q147",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "distribucion_zonas_comunes_percepcion",
      "sectionId": "section_2_5",
      "label": "¿La distribución de las zonas comunes (cafetería, oficinas, entre otras) permite una fácil orientación y percepción espacial?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M148",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q148",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "plataformas_autogestion_intelectual",
      "sectionId": "section_2_5",
      "label": "¿La organización cuenta con plataformas de autogestión?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Trámites administrativos.",
        "Proceso de autocapacitación.",
        "Trámites administrativos y proceso de autocapacitación.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
        "No aplica."
      ],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M149",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P149",
          "options": [
            "Trámites administrativos.",
            "Proceso de autocapacitación.",
            "Trámites administrativos y proceso de autocapacitación.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P150",
          "options": [
            "Cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No cuenta con accesibilidad cognitiva (lectura fácil - lenguaje sencillo).",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ajustes_razonables_intelectual",
      "sectionId": "section_2_5",
      "label": "¿La organización cuenta con la posibilidad de hacer ajustes razonables individualizados?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M151",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P151",
          "options": [
            "Cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No cuenta con la posibilidad de flexibilizar rutinas laborales.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "detalle",
          "label": "Detalle",
          "classification": "input_web",
          "sheetCell": "Q152",
          "options": [],
          "supportsDictation": true
        }
      ]
    }
  ],
  "section_2_6": [
    {
      "id": "ajustes_razonables_psicosocial",
      "sectionId": "section_2_6",
      "label": "¿La organización cuenta con la posibilidad de hacer ajustes razonables individualizados?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Es posible flexibilizar los niveles de ruido que tenga en su puesto de trabajo.",
        "No es posible flexibilizar los niveles de ruido que tenga en su puesto de trabajo.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M154",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P154",
          "options": [
            "Es posible flexibilizar los niveles de ruido que tenga en su puesto de trabajo.",
            "No es posible flexibilizar los niveles de ruido que tenga en su puesto de trabajo.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "detalle",
          "label": "Detalle",
          "classification": "input_web",
          "sheetCell": "Q155",
          "options": [],
          "supportsDictation": true
        }
      ]
    }
  ],
  "section_3": [
    {
      "id": "experiencia_vinculacion_pcd",
      "sectionId": "section_3",
      "label": "¿La empresa ha contratado o tiene experiencias de vinculación PcD?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M157",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q157",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "personal_tercerizado_capacitado",
      "sectionId": "section_3",
      "label": "¿El personal tercerizado (Seguridad, servicios generales, mantenimiento, entre otros) está capacitado o tiene experiencia en interacción con PcD?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con capacitación.",
        "Cuenta con experiencia.",
        "Cuenta con capacitación y experiencia.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M158",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P158",
          "options": [
            "Cuenta con capacitación.",
            "Cuenta con experiencia.",
            "Cuenta con capacitación y experiencia.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "personal_directo_capacitado",
      "sectionId": "section_3",
      "label": "¿El personal directo de la empresa está capacitado o tiene experiencia en interacción con PcD?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Cuenta con capacitación.",
        "Cuenta con experiencia.",
        "Cuenta con capacitación y experiencia.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M159",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P159",
          "options": [
            "Cuenta con capacitación.",
            "Cuenta con experiencia.",
            "Cuenta con capacitación y experiencia.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "apoyo_arl_seguridad",
      "sectionId": "section_3",
      "label": "¿La empresa ha solicitado el apoyo y servicios de la ARL para velar por la seguridad y bienestar de los trabajadores en condición de discapacidad?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "La ARL apoya mensual.",
        "La ARL apoya Trimestral.",
        "La ARL apoya Semestral.",
        "La ARL apoya Anual.",
        "Nunca lo han solicitado.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M160",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P160",
          "options": [
            "La ARL apoya mensual.",
            "La ARL apoya Trimestral.",
            "La ARL apoya Semestral.",
            "La ARL apoya Anual.",
            "Nunca lo han solicitado.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "capacitacion_emergencias",
      "sectionId": "section_3",
      "label": "¿La empresa ha sido capacitada en plan de emergencia y evacuación, ante una emergencia por bomberos?",
      "kind": "accesible_con_observaciones",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M161",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "observaciones",
          "label": "Observaciones",
          "classification": "input_web",
          "sheetCell": "Q161",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "politica_diversidad_inclusion",
      "sectionId": "section_3",
      "label": "¿La empresa cuenta con una política de diversidad e inclusión laboral?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "La política se encuentra finalizada.",
        "La política está en construcción.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M162",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P162",
          "options": [
            "La política se encuentra finalizada.",
            "La política está en construcción.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "rrhh_normatividad",
      "sectionId": "section_3",
      "label": "¿El área de recursos humanos conoce la normatividad vigente para la vinculación laboral de PcD?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Conoce los beneficios tributarios.",
        "No conoce los beneficios tributarios.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Conoce los beneficios en licitaciones públicas.",
        "No conoce los beneficios en licitaciones públicas.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Conoce los beneficios en cuota de aprendiz SENA.",
        "No conoce los beneficios en cuota de aprendiz SENA.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "Conoce la normatividad referente al certificado de discapacidad.",
        "No conoce la normatividad referente al certificado de discapacidad.",
        "No aplica."
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M163",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P163",
          "options": [
            "Conoce los beneficios tributarios.",
            "No conoce los beneficios tributarios.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P164",
          "options": [
            "Conoce los beneficios en licitaciones públicas.",
            "No conoce los beneficios en licitaciones públicas.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P165",
          "options": [
            "Conoce los beneficios en cuota de aprendiz SENA.",
            "No conoce los beneficios en cuota de aprendiz SENA.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P166",
          "options": [
            "Conoce la normatividad referente al certificado de discapacidad.",
            "No conoce la normatividad referente al certificado de discapacidad.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "ajustes_razonables_empresa",
      "sectionId": "section_3",
      "label": "¿La empresa tiene dentro de su alcance realizar ajustes razonables, e implementar sistemas de apoyo que se sugieren para la vinculación de PcD?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "Parcial",
        "Si",
        "No"
      ],
      "responseOptions": [
        "Es posible realizar ajustes al puesto de trabajo.",
        "No es posible realizar ajustes al puesto de trabajo.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Es posible realizar ajustes arquitectónicos.",
        "No es posible realizar ajustes arquitectónicos.",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Es posible realizar ajustes en documentación y presentación de la información.",
        "No es posible realizar ajustes en documentación y presentación de la información.",
        "No aplica."
      ],
      "quaternaryOptions": [
        "Es posible realizar ajustes en cuanto a carga laboral o trabajo bajo presión.",
        "No es posible realizar ajustes en cuanto a carga laboral o trabajo bajo presión.",
        "No aplica."
      ],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M167",
          "options": [
            "Parcial",
            "Si",
            "No"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P167",
          "options": [
            "Es posible realizar ajustes al puesto de trabajo.",
            "No es posible realizar ajustes al puesto de trabajo.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P168",
          "options": [
            "Es posible realizar ajustes arquitectónicos.",
            "No es posible realizar ajustes arquitectónicos.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P169",
          "options": [
            "Es posible realizar ajustes en documentación y presentación de la información.",
            "No es posible realizar ajustes en documentación y presentación de la información.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "cuaternaria",
          "label": "Selecci?n 4",
          "classification": "input_web",
          "sheetCell": "P170",
          "options": [
            "Es posible realizar ajustes en cuanto a carga laboral o trabajo bajo presión.",
            "No es posible realizar ajustes en cuanto a carga laboral o trabajo bajo presión.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "protocolo_emergencias_pcd",
      "sectionId": "section_3",
      "label": "¿La empresa cuenta con protocolo de atención de emergencias para personas con discapacidad?",
      "kind": "lista_multiple",
      "accesibleOptions": [
        "Parcial",
        "Si",
        "No"
      ],
      "responseOptions": [
        "Cuenta con los números de contacto en caso de emergencia.",
        "No cuenta con los números de contacto en caso de emergencia.",
        "No aplica."
      ],
      "secondaryOptions": [
        "Conoce los puntos de atención en caso de emergencia (clinicas, hospitales).",
        "No conoce los puntos de atención en caso de emergencia (clinicas, hospitales).",
        "No aplica."
      ],
      "tertiaryOptions": [
        "Tiene conocimiento sobre las recomendaciones médicas asociadas a la PcD.",
        "No tiene conocimiento sobre las recomendaciones médicas asociadas a la PcD.",
        "No aplica."
      ],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M171",
          "options": [
            "Parcial",
            "Si",
            "No"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P171",
          "options": [
            "Cuenta con los números de contacto en caso de emergencia.",
            "No cuenta con los números de contacto en caso de emergencia.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "secundaria",
          "label": "Selecci?n 2",
          "classification": "input_web",
          "sheetCell": "P172",
          "options": [
            "Conoce los puntos de atención en caso de emergencia (clinicas, hospitales).",
            "No conoce los puntos de atención en caso de emergencia (clinicas, hospitales).",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "terciaria",
          "label": "Selecci?n 3",
          "classification": "input_web",
          "sheetCell": "P173",
          "options": [
            "Tiene conocimiento sobre las recomendaciones médicas asociadas a la PcD.",
            "No tiene conocimiento sobre las recomendaciones médicas asociadas a la PcD.",
            "No aplica."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "apoyo_bomberos_discapacidad",
      "sectionId": "section_3",
      "label": "¿La empresa ha solicitado apoyo de otra entidad como bomberos para población con discapacidad?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Si ha contado con apoyo.",
        "No ha contado con apoyo.",
        "Se cuenta con apoyo parcial.",
        "No aplica."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M174",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P174",
          "options": [
            "Si ha contado con apoyo.",
            "No ha contado con apoyo.",
            "Se cuenta con apoyo parcial.",
            "No aplica."
          ],
          "supportsDictation": false
        },
        {
          "key": "detalle",
          "label": "Detalle",
          "classification": "input_web",
          "sheetCell": "Q175",
          "options": [],
          "supportsDictation": true
        }
      ]
    },
    {
      "id": "disponibilidad_tiempo_inclusion",
      "sectionId": "section_3",
      "label": "¿La empresa cuenta con disposición y tiempo para realizar los procesos de Inclusión Laboral?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Se cuenta con 30 minutos.",
        "Se cuenta con 45 minutos.",
        "Se cuenta con 60 minutos o más."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M176",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P176",
          "options": [
            "Se cuenta con 30 minutos.",
            "Se cuenta con 45 minutos.",
            "Se cuenta con 60 minutos o más."
          ],
          "supportsDictation": false
        }
      ]
    },
    {
      "id": "practicas_equidad_genero",
      "sectionId": "section_3",
      "label": "¿La empresa cuenta con prácticas inclusivas orientadas a la equidad de género y cuáles?",
      "kind": "lista",
      "accesibleOptions": [
        "No",
        "Si",
        "Parcial"
      ],
      "responseOptions": [
        "Ajuste de lenguaje inclusivo en las comunicaciones internas.",
        "Salas de lactancia.",
        "Guarderías.",
        "Programas de apoyo a mujeres cuidadoras.",
        "Otros."
      ],
      "secondaryOptions": [],
      "tertiaryOptions": [],
      "quaternaryOptions": [],
      "quinaryOptions": [],
      "fields": [
        {
          "key": "accesible",
          "label": "Accesibilidad",
          "classification": "input_web",
          "sheetCell": "M177",
          "options": [
            "No",
            "Si",
            "Parcial"
          ],
          "supportsDictation": false
        },
        {
          "key": "respuesta",
          "label": "Respuesta",
          "classification": "input_web",
          "sheetCell": "P177",
          "options": [
            "Ajuste de lenguaje inclusivo en las comunicaciones internas.",
            "Salas de lactancia.",
            "Guarderías.",
            "Programas de apoyo a mujeres cuidadoras.",
            "Otros."
          ],
          "supportsDictation": false
        }
      ]
    }
  ]
})

export const EVALUACION_QUESTION_DESCRIPTORS = EVALUACION_QUESTION_SECTION_IDS.flatMap(
  (sectionId) => EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId]
)

export const EVALUACION_TOTAL_QUESTIONS = EVALUACION_QUESTION_DESCRIPTORS.length
export const EVALUACION_QUESTION_TYPE_COUNTS = {
  "accesible_con_observaciones": 24,
  "lista": 34,
  "lista_doble": 7,
  "lista_triple": 5,
  "texto": 6,
  "lista_multiple": 15
} as const

export const EVALUACION_SECTION_4_OPTIONS = normalizeEvaluacionCatalogText([
  "Alto",
  "Medio",
  "Bajo"
] as const)
export const EVALUACION_SECTION_4_DESCRIPTIONS = normalizeEvaluacionCatalogText({
  "Alto": "La empresa ha demostrado un alto nivel de cumplimiento en cuanto a infraestructura, arquitectura y accesibilidad para personas con discapacidad. Se han tomado medidas para garantizar la accesibilidad en todos los niveles, desde la entrada hasta los servicios y espacios de trabajo.",
  "Medio": "La empresa ha mostrado un esfuerzo moderado en cuanto a infraestructura, arquitectura y accesibilidad para personas con discapacidad. Se han tomado algunas medidas para garantizar la accesibilidad en algunos lugares, pero aun se requiere mejorar en otros aspectos.",
  "Bajo": "La empresa ha demostrado un bajo nivel de cumplimiento en cuanto a infraestructura, arquitectura y accesibilidad para personas con discapacidad."
} as const)
export const EVALUACION_SECTION_4_FIELD_DESCRIPTORS: readonly EvaluacionConceptFieldDescriptor[] = normalizeEvaluacionCatalogText([
  {
    "id": "nivel_accesibilidad",
    "label": "Nivel de accesibilidad",
    "classification": "input_web",
    "sheetCell": "M180",
    "options": [
      "Alto",
      "Medio",
      "Bajo"
    ],
    "path": "section_4.nivel_accesibilidad"
  },
  {
    "id": "descripcion",
    "label": "Descripci?n",
    "classification": "derived",
    "sheetCell": "Q180",
    "options": [],
    "path": "section_4.descripcion"
  }
])

export const EVALUACION_SECTION_5_APLICA_OPTIONS = normalizeEvaluacionCatalogText([
  "No aplica",
  "Aplica"
] as const)
export const EVALUACION_SECTION_5_ITEMS: readonly EvaluacionAdjustmentItemDescriptor[] = normalizeEvaluacionCatalogText([
  {
    "id": "discapacidad_fisica",
    "label": "Discapacidad Física",
    "codes": "Códigos CIE-10: I60-I69 Enfermedades cerebrovasculares, G12 Atrofia muscular espinal y síndromes afines, E10-E14 Diabetes mellitus, L10 Pénfigo, M00 Artritis piógena, G24 Distonía, G40 Epilepsia, entre otros, G83 Hemiparesia, Q77.4 Acondroplasia.",
    "ajustes": "Eliminar toda clase de barreras arquitectónicas posible que impida la movilización de la persona. En lo posible evitar los desplazamientos innecesarios. Evaluar la ergonomía del puesto de trabajo de acuerdo con las necesidades del oferente.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G186",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_fisica.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A187",
        "options": [],
        "path": "section_5.discapacidad_fisica.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K186",
        "options": [],
        "path": "section_5.discapacidad_fisica.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_fisica_usr",
    "label": "Discapacidad Física Usuario en Silla de Ruedas (USR)",
    "codes": "Códigos CIE-10: G80 Parálisis cerebral, G82 Paraplejía y cuadriplejía, G83 Otros síndromes paralíticos, G71.0 Distrofia muscular, G35 Esclerosis múltiple, entre otros.",
    "ajustes": "Realizar los ajustes arquitectónicos correspondientes en el puesto de trabajo, las áreas comunes, implementación de baños para personas con discapacidad, al igual que la necesidad de rampas de acceso, asegurándose de eliminar toda clase de barreras arquitectónicas posible que impida la movilización de la persona. En lo posible evitar los desplazamientos innecesarios. Evaluar la ergonomía del puesto de trabajo de acuerdo con las necesidades del oferente.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G188",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_fisica_usr.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A189",
        "options": [],
        "path": "section_5.discapacidad_fisica_usr.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K188",
        "options": [],
        "path": "section_5.discapacidad_fisica_usr.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_auditiva",
    "label": "Discapacidad Auditiva",
    "codes": "Códigos CIE-10: C72.4 Tumor maligno del nervio acústico, H80 Otosclerosis, H81 Trastornos de la función vestibular, H83.0 Laberintitis, H83.1 Fístula del laberinto.",
    "ajustes": "Para establecer una comunicación efectiva, es crucial utilizar diversas herramientas y técnicas como:  Correo electrónico, notas escritas, mensajes de texto, uso de WhatsApp y el centro de relevo, es importante tener en cuenta que al comunicar algo o dar instrucciones, se recomienda hacer contacto visual y mantener un tono de voz claro y alto sin llegar a gritar. Para garantizar la comprensión, se sugiere adaptar videos con Lengua de Señas Colombiana (LSC) siempre que sea posible. Estas medidas son compatibles y beneficiosas para personas con hipoacusia o sordera, contribuyendo a una comunicación más inclusiva y efectiva.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G190",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_auditiva.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A191",
        "options": [],
        "path": "section_5.discapacidad_auditiva.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K190",
        "options": [],
        "path": "section_5.discapacidad_auditiva.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_visual",
    "label": "Discapacidad Visual",
    "codes": "Códigos CIE-10: H54 Ceguera y disminución de la agudeza visual, A18.5 Tuberculosis del ojo, C69.0 Tumor maligno de la conjuntiva, C69.1 Tumor maligno de la córnea, C69.2 Tumor maligno de la retina, H18.4 Degeneración de la córnea.",
    "ajustes": "En caso de que se presente una fatiga visual, se recomienda alternar las tareas de escritura. Garantizar una buena iluminación en el sitio de trabajo. Evitar cambios de los implementos de trabajo, como también la ubicación de objetos grandes que puedan interferir con la movilización, se recomienda comunicar los cambios de posiciones. Permitir que la persona pueda grabar las sesiones o procesos de capacitación. Promover el orden del puesto de trabajo con la finalidad de prevenir accidentes o incidentes de trabajo. En caso de ser requerido colocar un monitor amplio para la elaboración de las tareas. Contar con único lugar de trabajo, para así favorecer la orientación espacio temporal Recorrido en la instalación, para así lograr comprender dimensiones, ubicación y espacio de la misma.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G192",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_visual.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A193",
        "options": [],
        "path": "section_5.discapacidad_visual.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K192",
        "options": [],
        "path": "section_5.discapacidad_visual.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_intelectual",
    "label": "Discapacidad Intelectual",
    "codes": "Códigos CIE-10: Q90 Síndrome de Down, Q91 Síndrome de Edwards y síndrome de Patau, F70 Retraso mental leve, G20 Enfermedad de Parkinson, G30 Enfermedad de Alzheimer.",
    "ajustes": "Para lograr una comunicación efectiva y un aprendizaje óptimo, es esencial ofrecer instrucciones claras acompañadas de ejemplos prácticos, de esta forma permitir que la persona desarrolle prontamente la actividad para asegurar una comprensión profunda. En las etapas iniciales, planificar las tareas diarias y semanales con el respaldo de una agenda que facilita la organización, y la retroalimentación constante, tanto de instrucciones como de tareas. Es fundamental para evaluar el progreso, de este modo se proporciona retroalimentación oportuna con ejemplos concretos contribuye al aprendizaje continuo y la mejora constante.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G194",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_intelectual.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A195",
        "options": [],
        "path": "section_5.discapacidad_intelectual.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K194",
        "options": [],
        "path": "section_5.discapacidad_intelectual.ajustes"
      }
    ]
  },
  {
    "id": "trastorno_espectro_autista",
    "label": "Trastorno del Espectro Autista",
    "codes": "Códigos CIE-10: F84.5 Síndrome de Asperger, F60.2 Trastorno asocial de la personalidad, F84.1 Autismo atípico.",
    "ajustes": "Sea muy concreto con la información presentada, evitando el uso de bromas o palabras de doble sentido, es importante tener presente que el modelamiento de las actividades, favorece la integración de actividades. Al igual que para lograr una comunicación efectiva y un aprendizaje óptimo, es esencial ofrecer instrucciones claras acompañadas de ejemplos prácticos, de esta forma permitir que la persona desarrolle prontamente la actividad para asegurar una comprensión profunda. En las etapas iniciales, planificar las tareas diarias y semanales con el respaldo de una agenda que facilita la organización, y la retroalimentación constante, tanto de instrucciones como de tareas. Es fundamental para evaluar el progreso, de este modo se proporciona retroalimentación oportuna con ejemplos concretos contribuye al aprendizaje continuo y la mejora constante.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G196",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.trastorno_espectro_autista.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A197",
        "options": [],
        "path": "section_5.trastorno_espectro_autista.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K196",
        "options": [],
        "path": "section_5.trastorno_espectro_autista.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_psicosocial",
    "label": "Discapacidad Psicosocial",
    "codes": "Códigos CIE-10: F92.0 Trastorno depresivo de la conducta, F25 Trastornos esquizoafectivos, F31 Trastorno afectivo bipolar, F34 Trastornos del humor [afectivos] persistentes, F50.1 Anorexia nerviosa atípica, F60 Trastornos específicos de la personalidad.",
    "ajustes": "Garantice que el ambiente sea agradable, ventilado y sin interferencias a fin de lograr toda su atención. Evalúe si la persona requiere información y entrenamiento previo en el uso de maquinaria, equipo y otros materiales para realizar sus actividades. Usar colores con poca saturación para propiciar espacios de trabajo relajantes.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G198",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_psicosocial.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A199",
        "options": [],
        "path": "section_5.discapacidad_psicosocial.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K198",
        "options": [],
        "path": "section_5.discapacidad_psicosocial.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_visual_baja_vision",
    "label": "Discapacidad Visual Tipo Baja Visión",
    "codes": "Códigos CIE-10: H18.3 Cambios en las membranas de la córnea, H33 Desprendimiento y desgarro de la retina, H40 Glaucoma, H00 Orzuelo y calacio, H06 Trastornos del aparato lagrimal, H54 Ceguera y disminución de la agudeza visual.",
    "ajustes": "En caso de que se presente una fatiga visual, se recomienda alternar las tareas de escritura. Garantizar una buena iluminación en el sitio de trabajo. Evitar cambios de los implementos de trabajo, como también la ubicación de objetos grandes que puedan interferir con la movilización, se recomienda comunicar los cambios de posiciones. Permitir que la persona pueda grabar las sesiones o procesos de capacitación. Promover el orden del puesto de trabajo con la finalidad de prevenir accidentes o incidentes de trabajo. En caso de ser requerido colocar un monitor amplio para la elaboración de las tareas. Contar con único lugar de trabajo, para así favorecer la orientación espacio temporal Recorrido en la instalación, para así lograr comprender dimensiones, ubicación y espacio de la misma.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G200",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_visual_baja_vision.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A201",
        "options": [],
        "path": "section_5.discapacidad_visual_baja_vision.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K200",
        "options": [],
        "path": "section_5.discapacidad_visual_baja_vision.ajustes"
      }
    ]
  },
  {
    "id": "discapacidad_auditiva_reducida",
    "label": "Discapacidad Auditiva Audición Reducida",
    "codes": "Códigos CIE-10: H90 Hipoacusia conductiva y neurosensorial, H73 Otros trastornos de la membrana timpánica, H90 Hipoacusia conductiva y neurosensorial, H90.0 Hipoacusia conductiva bilateral, H90.5 Hipoacusia neurosensorial, sin otra especificación, H90.6 Hipoacusia mixta conductiva y neurosensorial, bilateral.",
    "ajustes": "Para establecer una comunicación efectiva, es crucial utilizar diversas herramientas y técnicas como:  Correo electrónico, notas escritas, mensajes de texto, uso de WhatsApp y el centro de relevo, es importante tener en cuenta que al comunicar algo o dar instrucciones, se recomienda hacer contacto visual y mantener un tono de voz claro y alto sin llegar a gritar. Para garantizar la comprensión, se sugiere adaptar videos con Lengua de Señas Colombiana (LSC) siempre que sea posible. Estas medidas son compatibles y beneficiosas para personas con hipoacusia o sordera, contribuyendo a una comunicación más inclusiva y efectiva.",
    "fields": [
      {
        "key": "aplica",
        "label": "Aplica",
        "classification": "input_web",
        "sheetCell": "G202",
        "options": [
          "No aplica",
          "Aplica"
        ],
        "path": "section_5.discapacidad_auditiva_reducida.aplica"
      },
      {
        "key": "nota",
        "label": "Nota",
        "classification": "static_copy",
        "sheetCell": "A203",
        "options": [],
        "path": "section_5.discapacidad_auditiva_reducida.nota"
      },
      {
        "key": "ajustes",
        "label": "Ajustes",
        "classification": "derived",
        "sheetCell": "K202",
        "options": [],
        "path": "section_5.discapacidad_auditiva_reducida.ajustes"
      }
    ]
  }
])
export const EVALUACION_SECTION_5_ITEM_IDS = EVALUACION_SECTION_5_ITEMS.map((item) => item.id)

export const EVALUACION_SECTION_6_FIELDS: readonly EvaluacionNarrativeFieldDescriptor[] = normalizeEvaluacionCatalogText([
  {
    "id": "observaciones_generales",
    "label": "Observaciones generales",
    "classification": "input_web",
    "sheetCell": "A205",
    "path": "observaciones_generales",
    "supportsDictation": true
  }
])
export const EVALUACION_SECTION_7_FIELDS: readonly EvaluacionNarrativeFieldDescriptor[] = normalizeEvaluacionCatalogText([
  {
    "id": "cargos_compatibles",
    "label": "Cargos compatibles",
    "classification": "input_web",
    "sheetCell": "A208",
    "path": "cargos_compatibles",
    "supportsDictation": true
  }
])

function resolveEvaluacionFailedVisitNoAplicaOption(options: readonly string[]) {
  return (
    options.find((option) =>
      option
        .trim()
        .toLocaleLowerCase("es-CO")
        .replace(/\.+$/, "") === "no aplica"
    ) ?? null
  )
}

function normalizeEvaluacionFailedVisitOption(option: string) {
  return option
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .replace(/\.+$/, "")
}

function hasEvaluacionNoSiParcialOptions(options: readonly string[]) {
  const normalizedOptions = new Set(
    options.map((option) => normalizeEvaluacionFailedVisitOption(option))
  )

  return (
    normalizedOptions.size === 3 &&
    normalizedOptions.has("no") &&
    normalizedOptions.has("si") &&
    normalizedOptions.has("parcial")
  )
}

function buildEvaluacionFailedVisitPresetGroups() {
  const groupedPaths = new Map<string, string[]>()

  EVALUACION_QUESTION_DESCRIPTORS.forEach((question) => {
    question.fields.forEach((field) => {
      const fieldPath = `${question.sectionId}.${question.id}.${field.key}`
      if (hasEvaluacionNoSiParcialOptions(field.options)) {
        groupedPaths.set("No", [...(groupedPaths.get("No") ?? []), fieldPath])
        return
      }

      const noAplicaOption = resolveEvaluacionFailedVisitNoAplicaOption(
        field.options
      )

      if (noAplicaOption) {
        groupedPaths.set(noAplicaOption, [
          ...(groupedPaths.get(noAplicaOption) ?? []),
          fieldPath,
        ])
        return
      }

      if (field.options.length === 0) {
        groupedPaths.set("No aplica", [
          ...(groupedPaths.get("No aplica") ?? []),
          fieldPath,
        ])
      }
    })
  })

  groupedPaths.set("No aplica", [
    ...(groupedPaths.get("No aplica") ?? []),
    ...EVALUACION_SECTION_5_ITEMS.map((item) => `section_5.${item.id}.aplica`),
    "section_4.descripcion",
    "cargos_compatibles",
  ])

  return [...groupedPaths.entries()].map(
    ([value, paths]) =>
      ({
        value,
        paths,
      }) satisfies FailedVisitPresetFieldGroup
  )
}

const EVALUACION_FAILED_VISIT_OPTIONAL_PATH_SET = new Set<string>([
  "section_4.nivel_accesibilidad",
  ...EVALUACION_QUESTION_DESCRIPTORS.flatMap((question) =>
    question.fields
      .filter(
        (field) =>
          field.options.length > 0 &&
          !hasEvaluacionNoSiParcialOptions(field.options) &&
          !resolveEvaluacionFailedVisitNoAplicaOption(field.options)
      )
      .map((field) => `${question.sectionId}.${question.id}.${field.key}`)
  ),
])

export const EVALUACION_FAILED_VISIT_PRESET_FIELD_GROUPS =
  buildEvaluacionFailedVisitPresetGroups()
export const EVALUACION_FAILED_VISIT_OPTIONAL_PATHS = [
  ...EVALUACION_FAILED_VISIT_OPTIONAL_PATH_SET,
]

export function isEvaluacionFailedVisitOptionalPath(path: string) {
  return EVALUACION_FAILED_VISIT_OPTIONAL_PATH_SET.has(path)
}

export const EVALUACION_SECTION_8_CONFIG = {
  mode: EVALUACION_DEFAULT_ASISTENTES_MODE,
  maxItems: EVALUACION_MAX_ASISTENTES,
  baseRows: EVALUACION_BASE_ASISTENTES_ROWS,
  startRow: 212,
  nameColumn: "C",
  cargoColumn: "O",
  labelNameColumn: "A",
  labelCargoColumn: "N",
} as const

export const EVALUACION_MASTER_DRIFTS: readonly EvaluacionMasterDriftDescriptor[] = normalizeEvaluacionCatalogText([
  {
    id: "a18_google_maps",
    label: "Registro Google maps",
    classification: "static_copy",
    sheetRef: "2. EVALUACI?N DE ACCESIBILIDAD!A18",
    rationale:
      "Existe en maestro vivo como rotulo operativo, pero no tiene celda editable asociada ni mapping legacy. Se preserva fuera del payload web V1.",
  },
  {
    id: "w61_w69_unmapped_dropdowns",
    label: "Validaciones W61:W69 sin encabezado funcional",
    classification: "deferred_blocker",
    sheetRef: "2. EVALUACI?N DE ACCESIBILIDAD!W61:W69",
    rationale:
      "El maestro vivo expone dropdowns adicionales sin encabezado ni semantica inequivoca. Se excluyen del contrato V1 hasta que producto confirme su significado.",
  },
  {
    id: "sheet_2_1_fotos",
    label: "2.1 EVALUACI?N FOTOS",
    classification: "auxiliary_sheet",
    sheetRef: "2.1 EVALUACI?N FOTOS",
    rationale:
      "La pestana auxiliar sigue viva en el entregable de Sheets, pero no forma parte del payload principal ni del schema de inputs de F1.",
  },
 ] as const)

export const EVALUACION_FIELD_REGISTRY: readonly EvaluacionFieldRegistryEntry[] = normalizeEvaluacionCatalogText([
  {
    "path": "fecha_visita",
    "sectionId": "company",
    "classification": "input_web",
    "sheetCell": "D7"
  },
  {
    "path": "nombre_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D8"
  },
  {
    "path": "direccion_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D9"
  },
  {
    "path": "correo_1",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D10"
  },
  {
    "path": "contacto_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D11"
  },
  {
    "path": "caja_compensacion",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D12"
  },
  {
    "path": "asesor",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "D13"
  },
  {
    "path": "modalidad",
    "sectionId": "company",
    "classification": "input_web",
    "sheetCell": "P7"
  },
  {
    "path": "ciudad_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "P8"
  },
  {
    "path": "nit_empresa",
    "sectionId": "company",
    "classification": "input_web",
    "sheetCell": "P9"
  },
  {
    "path": "telefono_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "P10"
  },
  {
    "path": "cargo",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "P11"
  },
  {
    "path": "sede_empresa",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "P12"
  },
  {
    "path": "profesional_asignado",
    "sectionId": "company",
    "classification": "derived",
    "sheetCell": "P13"
  },
  {
    "path": "section_2_1.transporte_publico.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M17"
  },
  {
    "path": "section_2_1.transporte_publico.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q17"
  },
  {
    "path": "section_2_1.rutas_pcd.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M19"
  },
  {
    "path": "section_2_1.rutas_pcd.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q19"
  },
  {
    "path": "section_2_1.parqueaderos.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M20"
  },
  {
    "path": "section_2_1.parqueaderos.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q20"
  },
  {
    "path": "section_2_1.ubicacion_accesible.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M21"
  },
  {
    "path": "section_2_1.ubicacion_accesible.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q21"
  },
  {
    "path": "section_2_1.vias_cercanas.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M22"
  },
  {
    "path": "section_2_1.vias_cercanas.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q22"
  },
  {
    "path": "section_2_1.paso_peatonal.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M23"
  },
  {
    "path": "section_2_1.paso_peatonal.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q23"
  },
  {
    "path": "section_2_1.rampas_cerca.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M24"
  },
  {
    "path": "section_2_1.rampas_cerca.observaciones",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "Q24"
  },
  {
    "path": "section_2_1.senales_podotactiles.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M25"
  },
  {
    "path": "section_2_1.senales_podotactiles.respuesta",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "P25"
  },
  {
    "path": "section_2_1.alumbrado_publico.accesible",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "M26"
  },
  {
    "path": "section_2_1.alumbrado_publico.respuesta",
    "sectionId": "section_2_1",
    "classification": "input_web",
    "sheetCell": "P26"
  },
  {
    "path": "section_2_2.areas_administrativa_operativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M28"
  },
  {
    "path": "section_2_2.areas_administrativa_operativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P28"
  },
  {
    "path": "section_2_2.zonas_comunes.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M29"
  },
  {
    "path": "section_2_2.zonas_comunes.observaciones",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q29"
  },
  {
    "path": "section_2_2.enfermeria_accesible.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M30"
  },
  {
    "path": "section_2_2.enfermeria_accesible.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P30"
  },
  {
    "path": "section_2_2.enfermeria_accesible.observaciones",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q31"
  },
  {
    "path": "section_2_2.ergonomia_administrativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M32"
  },
  {
    "path": "section_2_2.ergonomia_administrativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P32"
  },
  {
    "path": "section_2_2.ergonomia_administrativa.observaciones",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q33"
  },
  {
    "path": "section_2_2.ergonomia_operativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M34"
  },
  {
    "path": "section_2_2.ergonomia_operativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P34"
  },
  {
    "path": "section_2_2.ergonomia_operativa.observaciones",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q34"
  },
  {
    "path": "section_2_2.mobiliario_zonas_comunes.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M36"
  },
  {
    "path": "section_2_2.mobiliario_zonas_comunes.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P36"
  },
  {
    "path": "section_2_2.mobiliario_zonas_comunes.observaciones",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q37"
  },
  {
    "path": "section_2_2.evaluacion_ergonomica_puestos.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M38"
  },
  {
    "path": "section_2_2.evaluacion_ergonomica_puestos.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P38"
  },
  {
    "path": "section_2_2.ventilacion_area_administrativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M39"
  },
  {
    "path": "section_2_2.ventilacion_area_administrativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P39"
  },
  {
    "path": "section_2_2.ventilacion_area_administrativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P40"
  },
  {
    "path": "section_2_2.ventilacion_area_operativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M41"
  },
  {
    "path": "section_2_2.ventilacion_area_operativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P41"
  },
  {
    "path": "section_2_2.ventilacion_area_operativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P42"
  },
  {
    "path": "section_2_2.ventilacion_areas_comunes.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M43"
  },
  {
    "path": "section_2_2.ventilacion_areas_comunes.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P43"
  },
  {
    "path": "section_2_2.ventilacion_areas_comunes.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P44"
  },
  {
    "path": "section_2_2.iluminacion_area_administrativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M45"
  },
  {
    "path": "section_2_2.iluminacion_area_administrativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P45"
  },
  {
    "path": "section_2_2.iluminacion_area_administrativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P46"
  },
  {
    "path": "section_2_2.iluminacion_area_operativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M47"
  },
  {
    "path": "section_2_2.iluminacion_area_operativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P47"
  },
  {
    "path": "section_2_2.iluminacion_area_operativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P48"
  },
  {
    "path": "section_2_2.iluminacion_areas_comunes.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M49"
  },
  {
    "path": "section_2_2.iluminacion_areas_comunes.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P49"
  },
  {
    "path": "section_2_2.iluminacion_areas_comunes.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P50"
  },
  {
    "path": "section_2_2.ruido_area_administrativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M51"
  },
  {
    "path": "section_2_2.ruido_area_administrativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P51"
  },
  {
    "path": "section_2_2.ruido_area_administrativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P52"
  },
  {
    "path": "section_2_2.ruido_area_administrativa.terciaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P53"
  },
  {
    "path": "section_2_2.ruido_area_operativa.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M54"
  },
  {
    "path": "section_2_2.ruido_area_operativa.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P54"
  },
  {
    "path": "section_2_2.ruido_area_operativa.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P55"
  },
  {
    "path": "section_2_2.ruido_area_operativa.terciaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P56"
  },
  {
    "path": "section_2_2.ruido_areas_comunes.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M57"
  },
  {
    "path": "section_2_2.ruido_areas_comunes.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P57"
  },
  {
    "path": "section_2_2.ruido_areas_comunes.secundaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P58"
  },
  {
    "path": "section_2_2.ruido_areas_comunes.terciaria",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P59"
  },
  {
    "path": "section_2_2.flexibilidad_hibrido_remoto.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M60"
  },
  {
    "path": "section_2_2.flexibilidad_hibrido_remoto.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P60"
  },
  {
    "path": "section_2_2.flexibilidad_horarios_calamidades.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M61"
  },
  {
    "path": "section_2_2.flexibilidad_horarios_calamidades.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P61"
  },
  {
    "path": "section_2_2.sala_lactancia.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M62"
  },
  {
    "path": "section_2_2.sala_lactancia.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P62"
  },
  {
    "path": "section_2_2.protocolo_sala_lactancia.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M63"
  },
  {
    "path": "section_2_2.protocolo_sala_lactancia.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P63"
  },
  {
    "path": "section_2_2.linea_purpura.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M64"
  },
  {
    "path": "section_2_2.linea_purpura.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q64"
  },
  {
    "path": "section_2_2.salas_amigas.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M65"
  },
  {
    "path": "section_2_2.salas_amigas.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "P65"
  },
  {
    "path": "section_2_2.protocolo_hostigamiento_acoso_sexual.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M66"
  },
  {
    "path": "section_2_2.protocolo_hostigamiento_acoso_sexual.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q66"
  },
  {
    "path": "section_2_2.protocolo_acoso_laboral.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M67"
  },
  {
    "path": "section_2_2.protocolo_acoso_laboral.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q67"
  },
  {
    "path": "section_2_2.practicas_equidad_genero.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M68"
  },
  {
    "path": "section_2_2.practicas_equidad_genero.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q68"
  },
  {
    "path": "section_2_2.canales_comunicacion_lenguaje_inclusivo.accesible",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "M69"
  },
  {
    "path": "section_2_2.canales_comunicacion_lenguaje_inclusivo.respuesta",
    "sectionId": "section_2_2",
    "classification": "input_web",
    "sheetCell": "Q69"
  },
  {
    "path": "section_2_3.entrada_salida.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M71"
  },
  {
    "path": "section_2_3.entrada_salida.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q71"
  },
  {
    "path": "section_2_3.rampas_interior_usr.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M72"
  },
  {
    "path": "section_2_3.rampas_interior_usr.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q72"
  },
  {
    "path": "section_2_3.ascensor_interior.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M73"
  },
  {
    "path": "section_2_3.ascensor_interior.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q73"
  },
  {
    "path": "section_2_3.zonas_oficinas_accesibles.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M74"
  },
  {
    "path": "section_2_3.zonas_oficinas_accesibles.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q74"
  },
  {
    "path": "section_2_3.cafeteria_accesible.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M75"
  },
  {
    "path": "section_2_3.cafeteria_accesible.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q75"
  },
  {
    "path": "section_2_3.zonas_descanso_accesibles.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M76"
  },
  {
    "path": "section_2_3.zonas_descanso_accesibles.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q76"
  },
  {
    "path": "section_2_3.pasillos_amplios.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M77"
  },
  {
    "path": "section_2_3.pasillos_amplios.observaciones",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q77"
  },
  {
    "path": "section_2_3.escaleras_doble_funcion.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M78"
  },
  {
    "path": "section_2_3.escaleras_doble_funcion.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P78"
  },
  {
    "path": "section_2_3.escaleras_doble_funcion.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P79"
  },
  {
    "path": "section_2_3.escaleras_doble_funcion.terciaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P80"
  },
  {
    "path": "section_2_3.escaleras_doble_funcion.cuaternaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P81"
  },
  {
    "path": "section_2_3.escaleras_interior.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M82"
  },
  {
    "path": "section_2_3.escaleras_interior.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P82"
  },
  {
    "path": "section_2_3.escaleras_interior.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P83"
  },
  {
    "path": "section_2_3.escaleras_interior.terciaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P84"
  },
  {
    "path": "section_2_3.escaleras_interior.cuaternaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P85"
  },
  {
    "path": "section_2_3.escaleras_emergencia.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M86"
  },
  {
    "path": "section_2_3.escaleras_emergencia.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P86"
  },
  {
    "path": "section_2_3.escaleras_emergencia.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P87"
  },
  {
    "path": "section_2_3.escaleras_emergencia.terciaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P88"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M89"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P89"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P90"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.terciaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P91"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.cuaternaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P92"
  },
  {
    "path": "section_2_3.bano_discapacidad_fisica.quinary",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P93"
  },
  {
    "path": "section_2_3.silla_evacuacion_usr.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M94"
  },
  {
    "path": "section_2_3.silla_evacuacion_usr.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P94"
  },
  {
    "path": "section_2_3.silla_evacuacion_oruga.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M95"
  },
  {
    "path": "section_2_3.silla_evacuacion_oruga.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P95"
  },
  {
    "path": "section_2_3.ergonomia_superficies_irregulares.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M96"
  },
  {
    "path": "section_2_3.ergonomia_superficies_irregulares.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P96"
  },
  {
    "path": "section_2_3.senalizacion_ntc.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M97"
  },
  {
    "path": "section_2_3.senalizacion_ntc.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P97"
  },
  {
    "path": "section_2_3.senalizacion_ntc.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P98"
  },
  {
    "path": "section_2_3.mapa_evacuacion_ntc.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M99"
  },
  {
    "path": "section_2_3.mapa_evacuacion_ntc.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P99"
  },
  {
    "path": "section_2_3.mapa_evacuacion_ntc.secundaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P100"
  },
  {
    "path": "section_2_3.mapa_evacuacion_ntc.terciaria",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P101"
  },
  {
    "path": "section_2_3.ajustes_razonables_individualizados.accesible",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "M102"
  },
  {
    "path": "section_2_3.ajustes_razonables_individualizados.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "P102"
  },
  {
    "path": "section_2_3.ajustes_razonables_detalle.respuesta",
    "sectionId": "section_2_3",
    "classification": "input_web",
    "sheetCell": "Q103"
  },
  {
    "path": "section_2_4.senalizacion_orientacion.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M105"
  },
  {
    "path": "section_2_4.senalizacion_orientacion.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P105"
  },
  {
    "path": "section_2_4.senalizacion_emergencia.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M106"
  },
  {
    "path": "section_2_4.senalizacion_emergencia.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P106"
  },
  {
    "path": "section_2_4.distribucion_zonas_comunes.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M107"
  },
  {
    "path": "section_2_4.distribucion_zonas_comunes.observaciones",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q107"
  },
  {
    "path": "section_2_4.senalizacion_mapa_evacuacion.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M108"
  },
  {
    "path": "section_2_4.senalizacion_mapa_evacuacion.observaciones",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q108"
  },
  {
    "path": "section_2_4.ascensor_apoyo_visual_sonoro.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M109"
  },
  {
    "path": "section_2_4.ascensor_apoyo_visual_sonoro.observaciones",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q109"
  },
  {
    "path": "section_2_4.apoyo_seguridad_ubicacion.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M110"
  },
  {
    "path": "section_2_4.apoyo_seguridad_ubicacion.observaciones",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q110"
  },
  {
    "path": "section_2_4.senalizacion_ntc.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M111"
  },
  {
    "path": "section_2_4.senalizacion_ntc.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P111"
  },
  {
    "path": "section_2_4.senalizacion_ntc.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P112"
  },
  {
    "path": "section_2_4.mapa_evacuacion_ntc.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M113"
  },
  {
    "path": "section_2_4.mapa_evacuacion_ntc.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P113"
  },
  {
    "path": "section_2_4.mapa_evacuacion_ntc.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P114"
  },
  {
    "path": "section_2_4.mapa_evacuacion_ntc.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P115"
  },
  {
    "path": "section_2_4.informacion_accesible_ingreso.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M116"
  },
  {
    "path": "section_2_4.informacion_accesible_ingreso.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P116"
  },
  {
    "path": "section_2_4.informacion_accesible_ingreso.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P117"
  },
  {
    "path": "section_2_4.informacion_accesible_ingreso.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P118"
  },
  {
    "path": "section_2_4.informacion_accesible_ingreso.cuaternaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P119"
  },
  {
    "path": "section_2_4.medios_tecnologicos_ingreso.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M120"
  },
  {
    "path": "section_2_4.medios_tecnologicos_ingreso.observaciones",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q120"
  },
  {
    "path": "section_2_4.material_seleccion_accesible.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M121"
  },
  {
    "path": "section_2_4.material_seleccion_accesible.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P121"
  },
  {
    "path": "section_2_4.material_seleccion_accesible.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P122"
  },
  {
    "path": "section_2_4.material_seleccion_accesible.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P123"
  },
  {
    "path": "section_2_4.material_contratacion_accesible.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M124"
  },
  {
    "path": "section_2_4.material_contratacion_accesible.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P124"
  },
  {
    "path": "section_2_4.material_contratacion_accesible.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P126"
  },
  {
    "path": "section_2_4.material_induccion_accesible.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M127"
  },
  {
    "path": "section_2_4.material_induccion_accesible.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P127"
  },
  {
    "path": "section_2_4.material_induccion_accesible.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P129"
  },
  {
    "path": "section_2_4.material_induccion_accesible.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P130"
  },
  {
    "path": "section_2_4.material_evaluacion_desempeno.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M131"
  },
  {
    "path": "section_2_4.material_evaluacion_desempeno.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P131"
  },
  {
    "path": "section_2_4.material_evaluacion_desempeno.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P132"
  },
  {
    "path": "section_2_4.material_evaluacion_desempeno.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P133"
  },
  {
    "path": "section_2_4.plataformas_autogestion.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M134"
  },
  {
    "path": "section_2_4.plataformas_autogestion.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P134"
  },
  {
    "path": "section_2_4.plataformas_autogestion.secundaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P135"
  },
  {
    "path": "section_2_4.plataformas_autogestion.terciaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P137"
  },
  {
    "path": "section_2_4.plataformas_autogestion.cuaternaria",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P138"
  },
  {
    "path": "section_2_4.alarma_emergencia.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M139"
  },
  {
    "path": "section_2_4.alarma_emergencia.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P139"
  },
  {
    "path": "section_2_4.ajustes_razonables_individualizados.accesible",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "M140"
  },
  {
    "path": "section_2_4.ajustes_razonables_individualizados.respuesta",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "P140"
  },
  {
    "path": "section_2_4.ajustes_razonables_individualizados.detalle",
    "sectionId": "section_2_4",
    "classification": "input_web",
    "sheetCell": "Q141"
  },
  {
    "path": "section_2_5.material_seleccion_cognitiva.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M143"
  },
  {
    "path": "section_2_5.material_seleccion_cognitiva.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P143"
  },
  {
    "path": "section_2_5.material_contratacion_cognitiva.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M144"
  },
  {
    "path": "section_2_5.material_contratacion_cognitiva.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P144"
  },
  {
    "path": "section_2_5.material_induccion_cognitiva.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M145"
  },
  {
    "path": "section_2_5.material_induccion_cognitiva.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P145"
  },
  {
    "path": "section_2_5.material_evaluacion_cognitiva.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M146"
  },
  {
    "path": "section_2_5.material_evaluacion_cognitiva.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P146"
  },
  {
    "path": "section_2_5.ascensor_facil_ubicacion.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M147"
  },
  {
    "path": "section_2_5.ascensor_facil_ubicacion.observaciones",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "Q147"
  },
  {
    "path": "section_2_5.distribucion_zonas_comunes_percepcion.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M148"
  },
  {
    "path": "section_2_5.distribucion_zonas_comunes_percepcion.observaciones",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "Q148"
  },
  {
    "path": "section_2_5.plataformas_autogestion_intelectual.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M149"
  },
  {
    "path": "section_2_5.plataformas_autogestion_intelectual.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P149"
  },
  {
    "path": "section_2_5.plataformas_autogestion_intelectual.secundaria",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P150"
  },
  {
    "path": "section_2_5.ajustes_razonables_intelectual.accesible",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "M151"
  },
  {
    "path": "section_2_5.ajustes_razonables_intelectual.respuesta",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "P151"
  },
  {
    "path": "section_2_5.ajustes_razonables_intelectual.detalle",
    "sectionId": "section_2_5",
    "classification": "input_web",
    "sheetCell": "Q152"
  },
  {
    "path": "section_2_6.ajustes_razonables_psicosocial.accesible",
    "sectionId": "section_2_6",
    "classification": "input_web",
    "sheetCell": "M154"
  },
  {
    "path": "section_2_6.ajustes_razonables_psicosocial.respuesta",
    "sectionId": "section_2_6",
    "classification": "input_web",
    "sheetCell": "P154"
  },
  {
    "path": "section_2_6.ajustes_razonables_psicosocial.detalle",
    "sectionId": "section_2_6",
    "classification": "input_web",
    "sheetCell": "Q155"
  },
  {
    "path": "section_3.experiencia_vinculacion_pcd.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M157"
  },
  {
    "path": "section_3.experiencia_vinculacion_pcd.observaciones",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "Q157"
  },
  {
    "path": "section_3.personal_tercerizado_capacitado.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M158"
  },
  {
    "path": "section_3.personal_tercerizado_capacitado.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P158"
  },
  {
    "path": "section_3.personal_directo_capacitado.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M159"
  },
  {
    "path": "section_3.personal_directo_capacitado.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P159"
  },
  {
    "path": "section_3.apoyo_arl_seguridad.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M160"
  },
  {
    "path": "section_3.apoyo_arl_seguridad.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P160"
  },
  {
    "path": "section_3.capacitacion_emergencias.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M161"
  },
  {
    "path": "section_3.capacitacion_emergencias.observaciones",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "Q161"
  },
  {
    "path": "section_3.politica_diversidad_inclusion.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M162"
  },
  {
    "path": "section_3.politica_diversidad_inclusion.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P162"
  },
  {
    "path": "section_3.rrhh_normatividad.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M163"
  },
  {
    "path": "section_3.rrhh_normatividad.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P163"
  },
  {
    "path": "section_3.rrhh_normatividad.secundaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P164"
  },
  {
    "path": "section_3.rrhh_normatividad.terciaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P165"
  },
  {
    "path": "section_3.rrhh_normatividad.cuaternaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P166"
  },
  {
    "path": "section_3.ajustes_razonables_empresa.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M167"
  },
  {
    "path": "section_3.ajustes_razonables_empresa.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P167"
  },
  {
    "path": "section_3.ajustes_razonables_empresa.secundaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P168"
  },
  {
    "path": "section_3.ajustes_razonables_empresa.terciaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P169"
  },
  {
    "path": "section_3.ajustes_razonables_empresa.cuaternaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P170"
  },
  {
    "path": "section_3.protocolo_emergencias_pcd.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M171"
  },
  {
    "path": "section_3.protocolo_emergencias_pcd.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P171"
  },
  {
    "path": "section_3.protocolo_emergencias_pcd.secundaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P172"
  },
  {
    "path": "section_3.protocolo_emergencias_pcd.terciaria",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P173"
  },
  {
    "path": "section_3.apoyo_bomberos_discapacidad.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M174"
  },
  {
    "path": "section_3.apoyo_bomberos_discapacidad.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P174"
  },
  {
    "path": "section_3.apoyo_bomberos_discapacidad.detalle",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "Q175"
  },
  {
    "path": "section_3.disponibilidad_tiempo_inclusion.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M176"
  },
  {
    "path": "section_3.disponibilidad_tiempo_inclusion.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P176"
  },
  {
    "path": "section_3.practicas_equidad_genero.accesible",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "M177"
  },
  {
    "path": "section_3.practicas_equidad_genero.respuesta",
    "sectionId": "section_3",
    "classification": "input_web",
    "sheetCell": "P177"
  },
  {
    "path": "section_4.nivel_accesibilidad",
    "sectionId": "section_4",
    "classification": "input_web",
    "sheetCell": "M180"
  },
  {
    "path": "section_4.descripcion",
    "sectionId": "section_4",
    "classification": "derived",
    "sheetCell": "Q180"
  },
  {
    "path": "section_5.discapacidad_fisica.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G186"
  },
  {
    "path": "section_5.discapacidad_fisica.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A187"
  },
  {
    "path": "section_5.discapacidad_fisica.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K186"
  },
  {
    "path": "section_5.discapacidad_fisica_usr.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G188"
  },
  {
    "path": "section_5.discapacidad_fisica_usr.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A189"
  },
  {
    "path": "section_5.discapacidad_fisica_usr.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K188"
  },
  {
    "path": "section_5.discapacidad_auditiva.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G190"
  },
  {
    "path": "section_5.discapacidad_auditiva.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A191"
  },
  {
    "path": "section_5.discapacidad_auditiva.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K190"
  },
  {
    "path": "section_5.discapacidad_visual.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G192"
  },
  {
    "path": "section_5.discapacidad_visual.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A193"
  },
  {
    "path": "section_5.discapacidad_visual.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K192"
  },
  {
    "path": "section_5.discapacidad_intelectual.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G194"
  },
  {
    "path": "section_5.discapacidad_intelectual.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A195"
  },
  {
    "path": "section_5.discapacidad_intelectual.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K194"
  },
  {
    "path": "section_5.trastorno_espectro_autista.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G196"
  },
  {
    "path": "section_5.trastorno_espectro_autista.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A197"
  },
  {
    "path": "section_5.trastorno_espectro_autista.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K196"
  },
  {
    "path": "section_5.discapacidad_psicosocial.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G198"
  },
  {
    "path": "section_5.discapacidad_psicosocial.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A199"
  },
  {
    "path": "section_5.discapacidad_psicosocial.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K198"
  },
  {
    "path": "section_5.discapacidad_visual_baja_vision.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G200"
  },
  {
    "path": "section_5.discapacidad_visual_baja_vision.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A201"
  },
  {
    "path": "section_5.discapacidad_visual_baja_vision.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K200"
  },
  {
    "path": "section_5.discapacidad_auditiva_reducida.aplica",
    "sectionId": "section_5",
    "classification": "input_web",
    "sheetCell": "G202"
  },
  {
    "path": "section_5.discapacidad_auditiva_reducida.nota",
    "sectionId": "section_5",
    "classification": "static_copy",
    "sheetCell": "A203"
  },
  {
    "path": "section_5.discapacidad_auditiva_reducida.ajustes",
    "sectionId": "section_5",
    "classification": "derived",
    "sheetCell": "K202"
  },
  {
    "path": "observaciones_generales",
    "sectionId": "section_6",
    "classification": "input_web",
    "sheetCell": "A205"
  },
  {
    "path": "cargos_compatibles",
    "sectionId": "section_7",
    "classification": "input_web",
    "sheetCell": "A208"
  },
  {
    "path": "asistentes[].nombre",
    "sectionId": "section_8",
    "classification": "input_web",
    "sheetDynamicTarget": "section_8.name_col"
  },
  {
    "path": "asistentes[].cargo",
    "sectionId": "section_8",
    "classification": "input_web",
    "sheetDynamicTarget": "section_8.cargo_col"
  }
])

export const EVALUACION_INPUT_FIELD_PATHS = EVALUACION_FIELD_REGISTRY.filter(
  (entry) => entry.classification === "input_web"
).map((entry) => entry.path)

export const EVALUACION_DERIVED_FIELD_PATHS = EVALUACION_FIELD_REGISTRY.filter(
  (entry) => entry.classification === "derived"
).map((entry) => entry.path)

export const EVALUACION_STATIC_COPY_FIELD_PATHS = EVALUACION_FIELD_REGISTRY.filter(
  (entry) => entry.classification === "static_copy"
).map((entry) => entry.path)

export const EVALUACION_LONG_TEXT_FIELD_PATHS = [
  ...EVALUACION_QUESTION_DESCRIPTORS.flatMap((question) =>
    question.fields
      .filter((field) => field.supportsDictation)
      .map((field) => `${question.sectionId}.${question.id}.${field.key}`)
  ),
  ...EVALUACION_SECTION_6_FIELDS.map((field) => field.path),
  ...EVALUACION_SECTION_7_FIELDS.map((field) => field.path),
] as const

export const EVALUACION_COMPANY_INPUT_FIELD_IDS = EVALUACION_COMPANY_FIELD_DESCRIPTORS.filter(
  (field) => field.classification === "input_web"
).map((field) => field.id)

export const EVALUACION_COMPANY_DERIVED_FIELD_IDS = EVALUACION_COMPANY_FIELD_DESCRIPTORS.filter(
  (field) => field.classification === "derived"
).map((field) => field.id)

export const EVALUACION_SECTION_5_TOTAL_ITEMS = EVALUACION_SECTION_5_ITEMS.length
export const EVALUACION_VISIBLE_SECTION_COUNT = EVALUACION_SECTION_ORDER.length

export const EVALUACION_COMPANY_FIELD_OPTIONS = {
  modalidad: MODALIDAD_OPTIONS,
} as const

const EVALUACION_OPTIONAL_QUESTION_FIELD_KEY_SET = new Set<EvaluacionQuestionFieldKey>(
  EVALUACION_OPTIONAL_QUESTION_FIELD_KEYS
)

export const EVALUACION_CONTENT_SECTION_ORDER = EVALUACION_SECTION_ORDER.filter(
  (sectionId) => sectionId !== "company"
) as readonly Exclude<EvaluacionSectionId, "company">[]

export type EvaluacionContentSectionId =
  (typeof EVALUACION_CONTENT_SECTION_ORDER)[number]

export const EVALUACION_ACTIVE_RUNTIME_SECTION_IDS = [
  "section_2_1",
  "section_2_2",
  "section_2_3",
  "section_2_4",
  "section_2_5",
  "section_2_6",
  "section_3",
  "section_4",
  "section_5",
  "section_6",
  "section_7",
  "section_8",
] as const satisfies readonly EvaluacionContentSectionId[]

const EVALUACION_ACTIVE_RUNTIME_SECTION_ID_SET = new Set<EvaluacionContentSectionId>(
  EVALUACION_ACTIVE_RUNTIME_SECTION_IDS
)

export const EVALUACION_BLOCKED_SECTION_IDS = EVALUACION_CONTENT_SECTION_ORDER.filter(
  (
    sectionId
  ): sectionId is Exclude<
    EvaluacionContentSectionId,
    (typeof EVALUACION_ACTIVE_RUNTIME_SECTION_IDS)[number]
  > => !EVALUACION_ACTIVE_RUNTIME_SECTION_ID_SET.has(sectionId)
)

export const EVALUACION_COMPAT_STEP_TO_SECTION_ID = Object.fromEntries(
  EVALUACION_CONTENT_SECTION_ORDER.map((sectionId, index) => [index, sectionId])
) as Record<number, EvaluacionContentSectionId>

export const EVALUACION_COMPAT_SECTION_TO_STEP = Object.fromEntries(
  EVALUACION_CONTENT_SECTION_ORDER.map((sectionId, index) => [sectionId, index])
) as Record<EvaluacionContentSectionId, number>

export const INITIAL_EVALUACION_COLLAPSED_SECTIONS = Object.fromEntries(
  EVALUACION_SECTION_ORDER.map((sectionId) => [sectionId, false])
) as Record<EvaluacionSectionId, boolean>

export function getEvaluacionSectionIdForStep(step: number) {
  return EVALUACION_COMPAT_STEP_TO_SECTION_ID[step] ?? "section_2_1"
}

export function getEvaluacionCompatStepForSection(
  sectionId: EvaluacionContentSectionId
) {
  return EVALUACION_COMPAT_SECTION_TO_STEP[sectionId]
}

export function isEvaluacionCompanySectionComplete(values: {
  hasEmpresa: boolean
  fecha_visita?: string
  modalidad?: string
  nit_empresa?: string
}) {
  return Boolean(
    values.hasEmpresa &&
      values.fecha_visita?.trim() &&
      values.modalidad?.trim() &&
      values.nit_empresa?.trim()
  )
}

export function isEvaluacionNarrativeSectionComplete(values: {
  value?: string
  required?: boolean
}) {
  if (values.required === false) {
    return true
  }

  return Boolean(values.value?.trim())
}

type EvaluacionQuestionCompletionValue = Partial<
  Record<EvaluacionQuestionFieldKey, string>
>

export function isEvaluacionQuestionFieldOptional(
  fieldKey: EvaluacionQuestionFieldKey
) {
  return EVALUACION_OPTIONAL_QUESTION_FIELD_KEY_SET.has(fieldKey)
}

export function isEvaluacionQuestionSectionComplete(
  sectionId: EvaluacionQuestionSectionId,
  values?: Record<string, EvaluacionQuestionCompletionValue | undefined>,
  options?: {
    failedVisitAppliedAt?: string | null
  }
) {
  const failedVisitApplied = Boolean(options?.failedVisitAppliedAt)

  return EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].every((question) =>
    question.fields.every((field) =>
      isEvaluacionQuestionFieldOptional(field.key) ||
      (failedVisitApplied &&
        isEvaluacionFailedVisitOptionalPath(
          `${sectionId}.${question.id}.${field.key}`
        ))
        ? true
        : Boolean(values?.[question.id]?.[field.key]?.trim())
    )
  )
}

export function areEvaluacionQuestionSectionsComplete(
  values: Partial<
    Record<
      EvaluacionQuestionSectionId,
      Record<string, EvaluacionQuestionCompletionValue | undefined>
    >
  >,
  options?: {
    failedVisitAppliedAt?: string | null
  }
) {
  return EVALUACION_QUESTION_SECTION_IDS.every((sectionId) =>
    isEvaluacionQuestionSectionComplete(sectionId, values[sectionId], options)
  )
}

export function isEvaluacionSection4Complete(values: {
  nivel_accesibilidad?: string
  descripcion?: string
  questionSectionsComplete?: boolean
  failedVisitAppliedAt?: string | null
}) {
  if (!values.questionSectionsComplete) {
    return false
  }

  if (values.failedVisitAppliedAt) {
    return Boolean(values.descripcion?.trim())
  }

  return Boolean(values.nivel_accesibilidad?.trim() && values.descripcion?.trim())
}

export function isEvaluacionSection5Complete(
  values?: Partial<Record<string, { aplica?: string; nota?: string } | undefined>>
) {
  return EVALUACION_SECTION_5_ITEMS.every((item) => {
    const itemValue = values?.[item.id]
    return Boolean(itemValue?.aplica?.trim() && itemValue?.nota?.trim())
  })
}

export function isEvaluacionAttendeesSectionComplete(values: {
  asistentes: Array<{ nombre?: string; cargo?: string }>
  failed_visit_applied_at?: string | null
}) {
  const meaningfulAsistentes = getMeaningfulAsistentes(values.asistentes)
  const minimumMeaningfulAttendees = values.failed_visit_applied_at ? 1 : EVALUACION_MIN_SIGNIFICANT_ATTENDEES

  return (
    meaningfulAsistentes.length >= minimumMeaningfulAttendees &&
    meaningfulAsistentes.every((asistente) => isCompleteAsistente(asistente))
  )
}
