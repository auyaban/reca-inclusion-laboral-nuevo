import { z } from "zod";

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

export const INTERPRETE_LSC_MAX_OFERENTES = 10;
export const INTERPRETE_LSC_MAX_INTERPRETES = 5;
export const INTERPRETE_LSC_MAX_ASISTENTES = 10;
export const INTERPRETE_LSC_MIN_SIGNIFICANT_ATTENDEES = 2;

export const INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS = [
  "Presencial",
  "Virtual",
  "Mixta",
] as const;

export const INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS = [
  "Presencial",
  "Virtual",
  "No aplica",
] as const;

export const interpreteLscOferenteSchema = z.object({
  nombre_oferente: z.string().default(""),
  cedula: z.string().default(""),
  proceso: z.string().default(""),
});

export const interpreteLscInterpreteSchema = z.object({
  nombre: z.string().default(""),
  hora_inicial: z.string().default(""),
  hora_final: z.string().default(""),
  total_tiempo: z.string().default(""),
});

export const interpreteLscSabanaSchema = z.object({
  activo: z.boolean().default(false),
  horas: z.number().min(0, "Las horas de Sabana no pueden ser negativas"),
});

export const interpreteLscAsistenteSchema = z.object({
  nombre: z.string().default(""),
  cargo: z.string().default(""),
});

function hasMeaningfulOferente(
  oferente: z.infer<typeof interpreteLscOferenteSchema>
) {
  return Boolean(
    oferente.nombre_oferente.trim() || oferente.cedula.trim() || oferente.proceso.trim()
  );
}

function hasMeaningfulInterprete(
  interprete: z.infer<typeof interpreteLscInterpreteSchema>
) {
  return Boolean(
    interprete.nombre.trim() ||
      interprete.hora_inicial.trim() ||
      interprete.hora_final.trim() ||
      interprete.total_tiempo.trim()
  );
}

function hasMeaningfulAsistente(
  asistente: z.infer<typeof interpreteLscAsistenteSchema>
) {
  return Boolean(asistente.nombre.trim() || asistente.cargo.trim());
}

export const interpreteLscSchema = z
  .object({
    fecha_visita: requiredText("La fecha de visita es obligatoria."),
    modalidad_interprete: z.enum(INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS, {
      required_error: "La modalidad del interprete es obligatoria.",
      invalid_type_error: "La modalidad del interprete es obligatoria.",
    }),
    modalidad_profesional_reca: z.enum(
      INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS,
      {
        required_error: "La modalidad del profesional RECA es obligatoria.",
        invalid_type_error: "La modalidad del profesional RECA es obligatoria.",
      }
    ),
    nit_empresa: requiredText("La empresa es obligatoria."),
    oferentes: z
      .array(interpreteLscOferenteSchema)
      .max(
        INTERPRETE_LSC_MAX_OFERENTES,
        `Solo puedes agregar hasta ${INTERPRETE_LSC_MAX_OFERENTES} oferentes.`
      ),
    interpretes: z
      .array(interpreteLscInterpreteSchema)
      .max(
        INTERPRETE_LSC_MAX_INTERPRETES,
        `Solo puedes agregar hasta ${INTERPRETE_LSC_MAX_INTERPRETES} interpretes.`
      ),
    sabana: interpreteLscSabanaSchema,
    sumatoria_horas: z.string().default(""),
    asistentes: z
      .array(interpreteLscAsistenteSchema)
      .max(
        INTERPRETE_LSC_MAX_ASISTENTES,
        `Solo puedes agregar hasta ${INTERPRETE_LSC_MAX_ASISTENTES} asistentes.`
      ),
  })
  .superRefine((value, ctx) => {
    let meaningfulOferentes = 0;

    value.oferentes.forEach((oferente, index) => {
      if (!hasMeaningfulOferente(oferente)) {
        return;
      }

      meaningfulOferentes += 1;

      if (!oferente.nombre_oferente.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del oferente es obligatorio.",
          path: ["oferentes", index, "nombre_oferente"],
        });
      }

      if (!oferente.cedula.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La cedula del oferente es obligatoria.",
          path: ["oferentes", index, "cedula"],
        });
      }

      if (!oferente.proceso.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El proceso del oferente es obligatorio.",
          path: ["oferentes", index, "proceso"],
        });
      }
    });

    if (meaningfulOferentes === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega al menos 1 oferente significativo.",
        path: ["oferentes"],
      });
    }

    let meaningfulInterpretes = 0;

    value.interpretes.forEach((interprete, index) => {
      if (!hasMeaningfulInterprete(interprete)) {
        return;
      }

      meaningfulInterpretes += 1;

      if (!interprete.nombre.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del interprete es obligatorio.",
          path: ["interpretes", index, "nombre"],
        });
      }

      if (!interprete.hora_inicial.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La hora inicial es obligatoria.",
          path: ["interpretes", index, "hora_inicial"],
        });
      }

      if (!interprete.hora_final.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La hora final es obligatoria.",
          path: ["interpretes", index, "hora_final"],
        });
      }

      if (
        interprete.hora_inicial.trim() &&
        interprete.hora_final.trim() &&
        !interprete.total_tiempo.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Revisa las horas: la duracion no puede superar 16 horas.",
          path: ["interpretes", index, "hora_final"],
        });
      }
    });

    if (meaningfulInterpretes === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega al menos 1 interprete significativo.",
        path: ["interpretes"],
      });
    }

    value.asistentes.forEach((asistente, index) => {
      if (!hasMeaningfulAsistente(asistente)) {
        return;
      }

      if (!asistente.nombre.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del asistente es obligatorio.",
          path: ["asistentes", index, "nombre"],
        });
      }

      if (!asistente.cargo.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El cargo del asistente es obligatorio.",
          path: ["asistentes", index, "cargo"],
        });
      }
    });
  });

export type InterpreteLscValues = z.infer<typeof interpreteLscSchema>;
