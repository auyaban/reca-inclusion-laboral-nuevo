import { describe, expect, it } from "vitest";
import {
  getInduccionOperativaSectionIdForStep,
  isInduccionOperativaAttendeesSectionComplete,
  isInduccionOperativaDevelopmentSectionComplete,
  isInduccionOperativaObservationsSectionComplete,
  isInduccionOperativaSection4Complete,
} from "@/lib/induccionOperativaSections";

describe("induccionOperativaSections", () => {
  it("maps steps to section ids", () => {
    expect(getInduccionOperativaSectionIdForStep(0)).toBe("company");
    expect(getInduccionOperativaSectionIdForStep(8)).toBe("attendees");
  });

  it("detects completed matrices and attendees", () => {
    expect(
      isInduccionOperativaDevelopmentSectionComplete({
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
      })
    ).toBe(true);

    expect(
      isInduccionOperativaSection4Complete({
        items: {
          reconoce_instrucciones: { nivel_apoyo: "0", observaciones: "" },
          proceso_atencion: { nivel_apoyo: "0", observaciones: "" },
          identifica_funciones: { nivel_apoyo: "0", observaciones: "" },
          importancia_calidad: { nivel_apoyo: "0", observaciones: "" },
          relacion_companeros: { nivel_apoyo: "0", observaciones: "" },
          recibe_sugerencias: { nivel_apoyo: "0", observaciones: "" },
          objetivos_grupales: { nivel_apoyo: "0", observaciones: "" },
          reconoce_entorno: { nivel_apoyo: "0", observaciones: "" },
          ajuste_cambios: { nivel_apoyo: "0", observaciones: "" },
          identifica_problema_laboral: { nivel_apoyo: "0", observaciones: "" },
          respeto_companeros: { nivel_apoyo: "0", observaciones: "" },
          lenguaje_corporal: { nivel_apoyo: "0", observaciones: "" },
          reporte_novedades: { nivel_apoyo: "0", observaciones: "" },
          organiza_actividades: { nivel_apoyo: "0", observaciones: "" },
          cumple_horario: { nivel_apoyo: "0", observaciones: "" },
          identifica_horarios: { nivel_apoyo: "0", observaciones: "" },
          reporta_finalizacion: { nivel_apoyo: "0", observaciones: "" },
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
      })
    ).toBe(true);

    expect(
      isInduccionOperativaAttendeesSectionComplete([
        { nombre: "Ana", cargo: "Rol" },
      ])
    ).toBe(true);
  });

  it("keeps the closing observations section complete even when the note is empty", () => {
    expect(
      isInduccionOperativaObservationsSectionComplete({
        observaciones_recomendaciones: "",
      })
    ).toBe(true);
  });

  it("requires the closing observations note only when failed-visit mode marks it as required", () => {
    expect(
      isInduccionOperativaObservationsSectionComplete({
        observaciones_recomendaciones: "",
        required: true,
      })
    ).toBe(false);
    expect(
      isInduccionOperativaObservationsSectionComplete({
        observaciones_recomendaciones: "Se reprogramara la visita.",
        required: true,
      })
    ).toBe(true);
  });
});
