import { describe, expect, it } from "vitest";
import {
  induccionOperativaFinalizeRequestSchema,
  induccionOperativaSchema,
} from "@/lib/validations/induccionOperativa";
import {
  buildValidInduccionOperativaValues,
  INDUCCION_OPERATIVA_TEST_EMPRESA,
} from "@/lib/testing/induccionOperativaFixtures";

describe("induccionOperativa schema", () => {
  it("accepts a fully populated operational induction", () => {
    const values = buildValidInduccionOperativaValues();

    expect(induccionOperativaSchema.safeParse(values).success).toBe(true);
  });

  it("rejects a linked person with numero distinto de 1", () => {
    const values = buildValidInduccionOperativaValues({
      vinculado: {
        numero: "1",
        nombre_oferente: "Ana Perez",
        cedula: "123456",
        telefono_oferente: "3001234567",
        cargo_oferente: "Analista",
      },
    });

    expect(
      induccionOperativaSchema.safeParse({
        ...values,
        vinculado: {
          ...values.vinculado,
          numero: "9",
        },
      }).success
    ).toBe(false);
  });

  it("parses the finalize request envelope", () => {
    const values = buildValidInduccionOperativaValues();

    expect(
      induccionOperativaFinalizeRequestSchema.safeParse({
        empresa: INDUCCION_OPERATIVA_TEST_EMPRESA,
        formData: values,
        finalization_identity: {
          local_draft_session_id: "session-1",
        },
      }).success
    ).toBe(true);
  });

  it("requires at least one meaningful attendee and preserves per-row errors", () => {
    const withoutMeaningfulAttendees = buildValidInduccionOperativaValues({
      asistentes: [
        { nombre: "", cargo: "" },
        { nombre: "", cargo: "" },
      ],
    });
    const withoutMeaningfulParsed = induccionOperativaSchema.safeParse(
      withoutMeaningfulAttendees
    );

    expect(withoutMeaningfulParsed.success).toBe(false);
    if (!withoutMeaningfulParsed.success) {
      expect(
        withoutMeaningfulParsed.error.issues.some(
          (issue) => issue.message === "Agrega al menos un asistente significativo."
        )
      ).toBe(true);
    }

    const partialAttendees = buildValidInduccionOperativaValues({
      asistentes: [
        { nombre: "", cargo: "" },
        { nombre: "Marta Ruiz", cargo: "" },
      ],
    });

    const parsed = induccionOperativaSchema.safeParse(partialAttendees);

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(
      parsed.error.issues.some(
        (issue) =>
          issue.message === "El cargo es requerido" &&
          issue.path.join(".") === "asistentes.1.cargo"
      )
    ).toBe(true);
  });

  it("accepts empty notes and observations across the induction matrices", () => {
    const values = buildValidInduccionOperativaValues({
      section_3: {
        funciones_corresponden_perfil: { ejecucion: "Si", observaciones: "" },
        explicacion_funciones: { ejecucion: "Si", observaciones: "" },
        instrucciones_claras: { ejecucion: "Si", observaciones: "" },
        sistema_medicion: { ejecucion: "Si", observaciones: "" },
        induccion_maquinas: { ejecucion: "Si", observaciones: "" },
        presentacion_companeros: { ejecucion: "Si", observaciones: "" },
        presentacion_jefes: { ejecucion: "Si", observaciones: "" },
        uso_epp: { ejecucion: "Si", observaciones: "" },
        conducto_regular: { ejecucion: "Si", observaciones: "" },
        puesto_trabajo: { ejecucion: "Si", observaciones: "" },
        otros: { ejecucion: "Si", observaciones: "" },
      },
      section_4: {
        items: {
          reconoce_instrucciones: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          proceso_atencion: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          identifica_funciones: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          importancia_calidad: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          relacion_companeros: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          recibe_sugerencias: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          objetivos_grupales: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          reconoce_entorno: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          ajuste_cambios: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          identifica_problema_laboral: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          respeto_companeros: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          lenguaje_corporal: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          reporte_novedades: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          organiza_actividades: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          cumple_horario: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          identifica_horarios: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
          reporta_finalizacion: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "",
          },
        },
        notes: {
          comprension_instrucciones: "",
          autonomia_tareas: "",
          trabajo_equipo: "",
          adaptacion_flexibilidad: "",
          solucion_problemas: "",
          comunicacion_asertiva: "",
          manejo_tiempo: "",
          iniciativa_proactividad: "",
        },
      },
      section_5: {
        condiciones_medicas_salud: {
          nivel_apoyo_requerido: "0. No requiere apoyo.",
          observaciones: "",
        },
        habilidades_basicas_vida_diaria: {
          nivel_apoyo_requerido: "0. No requiere apoyo.",
          observaciones: "",
        },
        habilidades_socioemocionales: {
          nivel_apoyo_requerido: "0. No requiere apoyo.",
          observaciones: "",
        },
      },
      observaciones_recomendaciones: "",
    });

    expect(induccionOperativaSchema.safeParse(values).success).toBe(true);
  });
});
