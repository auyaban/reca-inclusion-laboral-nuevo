import { z } from "zod";
import { getMeaningfulAsistentes, normalizeAsistenteLike } from "@/lib/asistentes";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import {
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
  type InduccionOperativaSection3ItemId,
  type InduccionOperativaSection4BlockId,
  type InduccionOperativaSection4ItemId,
  type InduccionOperativaSection5RowId,
  type InduccionOperativaValues as DomainInduccionOperativaValues,
} from "@/lib/induccionOperativa";
import {
  INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS,
  INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS,
} from "@/lib/induccionOperativaPrefixedDropdowns";
import {
  empresaPayloadSchema,
  finalizationIdentitySchema,
} from "@/lib/validations/finalization";

export { MODALIDAD_OPTIONS };

export const INDUCCION_OPERATIVA_SECTION_3_EJECUCION_OPTIONS = [
  "Si",
  "No",
  "No aplica",
] as const;

export type InduccionOperativaValues = DomainInduccionOperativaValues;

function optionalEnumString<const TOptions extends readonly string[]>(
  options: TOptions,
  invalidMessage: string
) {
  return z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || options.includes(value as TOptions[number]),
      invalidMessage
    );
}

const SECTION_3_ITEM_IDS = Object.keys(
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS
) as InduccionOperativaSection3ItemId[];

const SECTION_4_ITEM_IDS = INDUCCION_OPERATIVA_SECTION_4_BLOCKS.flatMap(
  (block) => block.items
) as InduccionOperativaSection4ItemId[];

const SECTION_4_BLOCK_IDS = INDUCCION_OPERATIVA_SECTION_4_BLOCKS.map(
  (block) => block.id
) as InduccionOperativaSection4BlockId[];

const SECTION_5_ROW_IDS = INDUCCION_OPERATIVA_SECTION_5_ROWS.map(
  (row) => row.id
) as InduccionOperativaSection5RowId[];

const vinculadSchema = z
  .object({
    numero: z.literal("1"),
    nombre_oferente: z.string().trim().min(1, "El nombre es requerido"),
    cedula: z.string().trim().min(1, "La cedula es requerida"),
    telefono_oferente: z.string().trim().min(1, "El telefono es requerido"),
    cargo_oferente: z.string().trim().min(1, "El cargo es requerido"),
  })
  .strict();

const section3RowSchema = z
  .object({
    ejecucion: z.enum(INDUCCION_OPERATIVA_SECTION_3_EJECUCION_OPTIONS, {
      required_error: "Selecciona una opcion",
    }),
    observaciones: z.string().trim(),
  })
  .strict();

const section4ItemSchema = z
  .object({
    nivel_apoyo: z.enum(INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS, {
      required_error: "Selecciona una opcion",
    }),
    observaciones: optionalEnumString(
      INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS,
      "Selecciona una opcion valida"
    ),
  })
  .strict();

const section5RowSchema = z
  .object({
    nivel_apoyo_requerido: z.enum(INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS, {
      required_error: "Selecciona una opcion",
    }),
    observaciones: z.string().trim(),
  })
  .strict();

export const induccionOperativaSchema = z.object({
  fecha_visita: z.string().trim().min(1, "La fecha es requerida"),
  modalidad: z.enum(MODALIDAD_OPTIONS, {
    required_error: "Selecciona la modalidad",
  }),
  nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
  vinculado: vinculadSchema,
  section_3: z.object(
    Object.fromEntries(
      SECTION_3_ITEM_IDS.map((itemId) => [itemId, section3RowSchema])
    ) as Record<InduccionOperativaSection3ItemId, typeof section3RowSchema>
  ),
  section_4: z.object({
    items: z.object(
      Object.fromEntries(
        SECTION_4_ITEM_IDS.map((itemId) => [itemId, section4ItemSchema])
      ) as Record<InduccionOperativaSection4ItemId, typeof section4ItemSchema>
    ),
    notes: z.object(
      Object.fromEntries(
        SECTION_4_BLOCK_IDS.map((blockId) => [
          blockId,
          z.string().trim(),
        ])
      ) as Record<InduccionOperativaSection4BlockId, z.ZodString>
    ),
  }),
  section_5: z.object(
    Object.fromEntries(
      SECTION_5_ROW_IDS.map((rowId) => [rowId, section5RowSchema])
    ) as Record<InduccionOperativaSection5RowId, typeof section5RowSchema>
  ),
  ajustes_requeridos: z
    .string()
    .trim()
    .min(1, "Los ajustes requeridos son obligatorios"),
  fecha_primer_seguimiento: z
    .string()
    .trim()
    .min(1, "La fecha de primer seguimiento es obligatoria"),
  observaciones_recomendaciones: z.string().trim(),
  asistentes: z.array(z.object({ nombre: z.string(), cargo: z.string() })).superRefine(
    (rows, ctx) => {
      rows.forEach((row, index) => {
        const normalized = normalizeAsistenteLike(row);
        if (!normalized.nombre && !normalized.cargo) {
          return;
        }

        if (!normalized.nombre) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El nombre es requerido",
            path: [index, "nombre"],
          });
        }

        if (!normalized.cargo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El cargo es requerido",
            path: [index, "cargo"],
          });
        }
      });

      if (getMeaningfulAsistentes(rows).length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Agrega al menos un asistente significativo.",
        });
      }
    }
  ),
});

export const induccionOperativaFinalizeRequestSchema = z.object({
  empresa: empresaPayloadSchema,
  formData: induccionOperativaSchema,
  finalization_identity: finalizationIdentitySchema,
});

export type InduccionOperativaFinalizeRequest = z.infer<
  typeof induccionOperativaFinalizeRequestSchema
>;
