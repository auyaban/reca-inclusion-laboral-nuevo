import { z } from "zod";
import { getMeaningfulAsistentes, isCompleteAsistente } from "@/lib/asistentes";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
} from "@/lib/failedVisitContract";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import {
  INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS,
  getInduccionOrganizacionalRecommendationForMedium,
} from "@/lib/induccionOrganizacional";
import type {
  InduccionOrganizacionalSection3ItemId,
  InduccionOrganizacionalSection4Row,
  InduccionOrganizacionalValues as InduccionOrganizacionalValuesBase,
} from "@/lib/induccionOrganizacional";
import { empresaPayloadSchema } from "@/lib/validations/finalization";

const vinculadoSchema = z
  .object({
    numero: z.literal("1"),
    nombre_oferente: z.string().trim().min(1, "El nombre del vinculado es requerido"),
    cedula: z.string().trim().min(1, "La cedula del vinculado es requerida"),
    telefono_oferente: z
      .string()
      .trim()
      .min(1, "El telefono del vinculado es requerido"),
    cargo_oferente: z.string().trim().min(1, "El cargo del vinculado es requerido"),
  })
  .strict();

const section3RowSchema = z
  .object({
    visto: z.enum(INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS, {
      required_error: "Selecciona una opcion",
    }),
    responsable: z.string().trim().min(1, "El responsable es requerido"),
    medio_socializacion: z.enum(INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS, {
      required_error: "Selecciona un medio",
    }),
    descripcion: z.string().trim().min(1, "La descripcion es requerida"),
  })
  .strict();

const section4RowSchema = z
  .object({
    medio: z.enum(INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS, {
      required_error: "Selecciona un medio",
    }),
    recomendacion: z.string().trim(),
  })
  .strict();

const section3Schema = z.object(
  Object.fromEntries(
    INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS.flatMap((group) =>
      group.items.map((item) => [item.id, section3RowSchema])
    )
  ) as Record<InduccionOrganizacionalSection3ItemId, typeof section3RowSchema>
);

const section4Schema = z
  .array(section4RowSchema)
  .length(3, "Debes completar las tres recomendaciones") as unknown as z.ZodType<
  InduccionOrganizacionalSection4Row[]
>;

const asistentesSchema = z.array(
  z.object({
    nombre: z.string(),
    cargo: z.string(),
  })
);

export type InduccionOrganizacionalValues = InduccionOrganizacionalValuesBase;

export const induccionOrganizacionalSchema: z.ZodType<InduccionOrganizacionalValues> = z
  .object({
    [FAILED_VISIT_AUDIT_FIELD]: failedVisitAuditFieldSchema,
    fecha_visita: z.string().trim().min(1, "La fecha es requerida"),
    modalidad: z.enum(MODALIDAD_OPTIONS, {
      required_error: "Selecciona la modalidad",
    }),
    nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
    vinculado: vinculadoSchema,
    section_3: section3Schema,
    section_4: section4Schema,
    section_5: z.object({
      observaciones: z.string().trim(),
    }),
    asistentes: asistentesSchema.superRefine((rows, ctx) => {
      const meaningfulRows = getMeaningfulAsistentes(rows);
      if (!meaningfulRows.some((row) => isCompleteAsistente(row))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Agrega al menos un asistente significativo.",
          path: [],
        });
      }

      rows.forEach((row, index) => {
        const normalized = {
          nombre: typeof row.nombre === "string" ? row.nombre.trim() : "",
          cargo: typeof row.cargo === "string" ? row.cargo.trim() : "",
        };

        if (normalized.nombre || normalized.cargo) {
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
        }
      });
    }),
  })
  .superRefine((values, ctx) => {
    INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS.forEach((group) => {
      group.items.forEach((item) => {
        const row = values.section_3[item.id];
        if (!row) {
          return;
        }

        const fields = [
          ["visto", row.visto],
          ["responsable", row.responsable],
          ["medio_socializacion", row.medio_socializacion],
          ["descripcion", row.descripcion],
        ] as const;

        fields.forEach(([field, fieldValue]) => {
          if (fieldValue.trim()) {
            return;
          }

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${item.label} - ${field === "visto" ? "Visto" : field === "responsable" ? "Responsable" : field === "medio_socializacion" ? "Medio de socializacion" : "Descripcion"} es requerido`,
            path: ["section_3", item.id, field],
          });
        });
      });
    });

    values.section_4.forEach((row, index) => {
      if (!row.medio.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El medio es requerido",
          path: ["section_4", index, "medio"],
        });
      }

      const expectedRecommendation = getInduccionOrganizacionalRecommendationForMedium(
        row.medio
      );
      if (row.medio === "No aplica" && row.recomendacion !== "No aplica") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La recomendacion debe ser No aplica cuando el medio es No aplica",
          path: ["section_4", index, "recomendacion"],
        });
      } else if (row.recomendacion.trim() !== expectedRecommendation.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La recomendacion derivada no coincide con el medio seleccionado",
          path: ["section_4", index, "recomendacion"],
        });
      }
    });
  }) as unknown as z.ZodType<InduccionOrganizacionalValues>;

export const induccionOrganizacionalFinalizeRequestSchema = z.object({
  empresa: empresaPayloadSchema,
  formData: induccionOrganizacionalSchema,
  finalization_identity: z.object({
    draft_id: z.string().trim().min(1).optional(),
    local_draft_session_id: z
      .string()
      .trim()
      .min(1, "La sesion local del borrador es requerida"),
  }),
});

export type InduccionOrganizacionalFinalizeRequest = z.infer<
  typeof induccionOrganizacionalFinalizeRequestSchema
>;
