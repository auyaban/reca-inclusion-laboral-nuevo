import { z } from "zod";
import {
  EMPRESA_CAJA_OPTIONS,
  EMPRESA_ESTADO_OPTIONS,
  EMPRESA_GESTION_OPTIONS,
} from "@/lib/empresas/constants";
import { validateSerializedEmpresaContacts } from "@/lib/empresas/contacts";
import {
  normalizeEmpresaCaja,
  normalizeEmpresaCity,
  normalizeEmpresaEstado,
  normalizeEmpresaGestion,
  normalizeEmpresaNit,
  normalizeEmpresaNullableText,
  normalizeEmpresaPhoneList,
  normalizeEmpresaTitleText,
} from "@/lib/empresas/normalization";

const nullableText = z.preprocess(
  normalizeEmpresaNullableText,
  z.string().nullable()
);

const nullableTitleText = z.preprocess(
  normalizeEmpresaTitleText,
  z.string().nullable()
);

const nullableCityText = z.preprocess(
  normalizeEmpresaCity,
  z.string().nullable()
);

const nitSchema = z.preprocess(
  normalizeEmpresaNit,
  z
    .string()
    .regex(/^\d+(?:-\d+)?$/, "El NIT solo puede contener números y un guion.")
    .nullable()
);

const nullablePhoneList = z.preprocess(
  normalizeEmpresaPhoneList,
  z.string().nullable()
);

const nullableNumericId = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().positive().nullable());

function nullableCatalogSchema<T extends readonly string[]>(
  normalize: (value: unknown) => unknown,
  options: T,
  message: string
) {
  return z
    .preprocess((value) => {
      const normalized = normalize(value);
      return typeof normalized === "undefined" ? null : normalized;
    }, z.union([z.string(), z.null()]))
    .superRefine((value, context) => {
      if (value && !options.includes(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
      }
    })
    .transform((value) => value as T[number] | null);
}

const gestionSchema = nullableCatalogSchema(
  normalizeEmpresaGestion,
  EMPRESA_GESTION_OPTIONS,
  "Selecciona una gestión válida."
);

const estadoSchema = nullableCatalogSchema(
  normalizeEmpresaEstado,
  EMPRESA_ESTADO_OPTIONS,
  "Selecciona un estado válido."
);

const cajaSchema = nullableCatalogSchema(
  normalizeEmpresaCaja,
  EMPRESA_CAJA_OPTIONS,
  "Selecciona una caja de compensación válida."
);

const emailSchema = z.string().email("Ingresa un correo válido.");

function validateEmpresaEmails(
  value: { correo_asesor: string | null },
  context: z.RefinementCtx
) {
  if (value.correo_asesor && !emailSchema.safeParse(value.correo_asesor).success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correo_asesor"],
      message: "Ingresa un correo válido.",
    });
  }
}

function readSegment(value: string | null, index: number) {
  return value?.split(";")[index]?.trim() || null;
}

function addRequiredIssue(
  context: z.RefinementCtx,
  path: string,
  message: string
) {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
}

function validateRequiredEmpresaFields(
  value: {
    nombre_empresa: string | null;
    nit_empresa: string | null;
    direccion_empresa: string | null;
    ciudad_empresa: string | null;
    sede_empresa: string | null;
    zona_empresa: string | null;
    responsable_visita: string | null;
    contacto_empresa: string | null;
    cargo: string | null;
    telefono_empresa: string | null;
    correo_1: string | null;
    asesor: string | null;
    correo_asesor: string | null;
    caja_compensacion: string | null;
    estado: string | null;
    gestion: string | null;
    profesional_asignado_id: number | null;
  },
  context: z.RefinementCtx
) {
  if (!value.nombre_empresa) {
    addRequiredIssue(
      context,
      "nombre_empresa",
      "El nombre de la empresa es obligatorio."
    );
  }
  if (!value.nit_empresa) {
    addRequiredIssue(context, "nit_empresa", "El NIT es obligatorio.");
  }
  if (!value.direccion_empresa) {
    addRequiredIssue(context, "direccion_empresa", "La dirección es obligatoria.");
  }
  if (!value.ciudad_empresa) {
    addRequiredIssue(context, "ciudad_empresa", "La ciudad es obligatoria.");
  }
  if (!value.sede_empresa) {
    addRequiredIssue(context, "sede_empresa", "La sede empresa es obligatoria.");
  }
  if (!value.zona_empresa) {
    addRequiredIssue(context, "zona_empresa", "La Zona Compensar es obligatoria.");
  }
  if (!value.responsable_visita) {
    addRequiredIssue(
      context,
      "responsable_visita",
      "El responsable de visita es obligatorio."
    );
  }
  if (!readSegment(value.contacto_empresa, 0)) {
    addRequiredIssue(
      context,
      "contacto_empresa",
      "El primer contacto es obligatorio."
    );
  }
  if (!readSegment(value.cargo, 0)) {
    addRequiredIssue(context, "cargo", "El cargo del responsable es obligatorio.");
  }
  if (!readSegment(value.telefono_empresa, 0)) {
    addRequiredIssue(
      context,
      "telefono_empresa",
      "El teléfono del responsable es obligatorio."
    );
  }
  if (!readSegment(value.correo_1, 0)) {
    addRequiredIssue(context, "correo_1", "El correo del responsable es obligatorio.");
  }
  if (!value.asesor) {
    addRequiredIssue(context, "asesor", "El asesor es obligatorio.");
  }
  if (!value.correo_asesor) {
    addRequiredIssue(context, "correo_asesor", "El correo asesor es obligatorio.");
  }
  if (!value.caja_compensacion) {
    addRequiredIssue(
      context,
      "caja_compensacion",
      "Selecciona una caja de compensación válida."
    );
  }
  if (!value.estado) {
    addRequiredIssue(context, "estado", "Selecciona un estado válido.");
  }
  if (!value.gestion) {
    addRequiredIssue(context, "gestion", "Selecciona una gestión válida.");
  }
  if (!value.profesional_asignado_id) {
    addRequiredIssue(
      context,
      "profesional_asignado_id",
      "Selecciona un profesional asignado."
    );
  }
}

function validateEmpresaContacts(
  value: {
    contacto_empresa: string | null;
    cargo: string | null;
    telefono_empresa: string | null;
    correo_1: string | null;
  },
  context: z.RefinementCtx
) {
  for (const issue of validateSerializedEmpresaContacts(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [issue.field],
      message: issue.message,
    });
  }
}

const empresaBaseObjectSchema = z.object({
  nombre_empresa: nullableTitleText.default(null),
  nit_empresa: nitSchema.default(null),
  direccion_empresa: nullableTitleText.default(null),
  ciudad_empresa: nullableCityText.default(null),
  sede_empresa: nullableTitleText.default(null),
  zona_empresa: nullableTitleText.default(null),
  correo_1: nullableText.default(null),
  contacto_empresa: nullableTitleText.default(null),
  telefono_empresa: nullablePhoneList.default(null),
  cargo: nullableTitleText.default(null),
  responsable_visita: nullableTitleText.default(null),
  profesional_asignado_id: nullableNumericId.default(null),
  asesor: nullableTitleText.default(null),
  correo_asesor: nullableText.default(null),
  caja_compensacion: cajaSchema,
  estado: estadoSchema,
  observaciones: nullableText.default(null),
  gestion: gestionSchema,
  comentario: nullableText.default(null),
});

const empresaUpdateObjectSchema = empresaBaseObjectSchema.extend({
  telefono_empresa: nullableText.default(null),
});

export const empresaBaseSchema = empresaBaseObjectSchema
  .superRefine((value, context) => {
    validateRequiredEmpresaFields(value, context);
    validateEmpresaEmails(value, context);
    validateEmpresaContacts(value, context);
  });

export const createEmpresaSchema = empresaBaseSchema;

export const updateEmpresaSchema = empresaUpdateObjectSchema
  .extend({
    previous_estado: z
      .preprocess(
        (value) =>
          value === "" || value === null || typeof value === "undefined"
            ? null
            : normalizeEmpresaEstado(value),
        z.enum(EMPRESA_ESTADO_OPTIONS).nullable()
      )
      .default(null),
  })
  .superRefine((value, context) => {
    if (
      value.previous_estado &&
      value.estado !== value.previous_estado &&
      !value.comentario
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comentario"],
        message: "El comentario es obligatorio cuando cambia el estado.",
      });
    }
  });

export const deleteEmpresaSchema = z.object({
  comentario: nullableText.default(null),
});

const SORT_FIELDS = [
  "updated_at",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "gestion",
  "profesional_asignado",
  "asesor",
  "caja_compensacion",
  "zona_empresa",
  "estado",
] as const;

const DIRECTIONS = ["asc", "desc"] as const;

function readTextParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 120) : "";
}

function readPageParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readSort(params: URLSearchParams) {
  const value = params.get("sort");
  return SORT_FIELDS.includes(value as (typeof SORT_FIELDS)[number])
    ? (value as (typeof SORT_FIELDS)[number])
    : "updated_at";
}

function readDirection(params: URLSearchParams) {
  const value = params.get("direction");
  return DIRECTIONS.includes(value as (typeof DIRECTIONS)[number])
    ? (value as (typeof DIRECTIONS)[number])
    : "desc";
}

export function parseEmpresaListParams(params: URLSearchParams) {
  const pageSize = Math.min(readPageParam(params, "pageSize", 50), 100);
  const profesionalIdValue = params.get("profesionalId");
  const profesionalId = profesionalIdValue
    ? Number.parseInt(profesionalIdValue, 10)
    : null;

  return {
    q: readTextParam(params, "q"),
    page: readPageParam(params, "page", 1),
    pageSize,
    sort: readSort(params),
    direction: readDirection(params),
    estado: readTextParam(params, "estado"),
    gestion: readTextParam(params, "gestion"),
    caja: readTextParam(params, "caja"),
    zona: readTextParam(params, "zona"),
    asesor: readTextParam(params, "asesor"),
    profesionalId:
      profesionalId && Number.isFinite(profesionalId) && profesionalId > 0
        ? profesionalId
        : null,
  };
}

export type EmpresaFormInput = z.infer<typeof createEmpresaSchema>;
export type EmpresaUpdateInput = z.infer<typeof updateEmpresaSchema>;
export type EmpresaListParams = ReturnType<typeof parseEmpresaListParams>;
export type EmpresaSortField = EmpresaListParams["sort"];
