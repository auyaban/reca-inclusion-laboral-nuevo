import { describe, expect, it } from "vitest";
import {
  buildEmpresaMutationEvents,
  describeEmpresaEvent,
  diffEmpresaChanges,
  summarizeEmpresaEvent,
} from "@/lib/empresas/events";
import { EMPRESA_EVENT_TYPES } from "@/lib/empresas/constants";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

describe("empresa events", () => {
  it("supports lifecycle event types for E3", () => {
    expect(EMPRESA_EVENT_TYPES).toEqual(
      expect.arrayContaining(["reclamada", "soltada", "quitada", "nota"])
    );
  });

  it("builds separate events for general edits, status changes and assignment", () => {
    const before = {
      nombre_empresa: "ACME",
      estado: "Activa",
      profesional_asignado_id: null,
      profesional_asignado: null,
      correo_profesional: null,
    };
    const after = {
      nombre_empresa: "ACME SAS",
      estado: "Cerrada",
      profesional_asignado_id: 12,
      profesional_asignado: "Marta Ruiz",
      correo_profesional: "marta@reca.test",
    };

    const events = buildEmpresaMutationEvents({
      actor,
      before,
      after,
      comentario: "Cierre validado con gerencia",
    });

    expect(events.map((event) => event.tipo)).toEqual([
      "edicion",
      "cambio_estado",
      "asignacion_gerente",
    ]);
    expect(events[0].payload).toEqual({
      campos_cambiados: ["nombre_empresa"],
      antes: { nombre_empresa: "ACME" },
      despues: { nombre_empresa: "ACME SAS" },
      comentario: "Cierre validado con gerencia",
    });
  });

  it("keeps the previous professional snapshot when reassigning", () => {
    const events = buildEmpresaMutationEvents({
      actor,
      before: {
        estado: "Activa",
        profesional_asignado_id: 8,
        profesional_asignado: "Pedro Gomez",
      },
      after: {
        estado: "Activa",
        profesional_asignado_id: 12,
        profesional_asignado: "Marta Ruiz",
      },
      comentario: "Redistribucion de carga",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      tipo: "asignacion_gerente",
      payload: {
        asignado_a_profesional_id: 12,
        asignado_a_nombre: "Marta Ruiz",
        anterior_profesional_id: 8,
        anterior_nombre: "Pedro Gomez",
        comentario: "Redistribucion de carga",
      },
    });
  });

  it("does not include unchanged nullable fields in the edit diff", () => {
    expect(
      diffEmpresaChanges(
        { ciudad_empresa: null, asesor: "Ana" },
        { ciudad_empresa: "", asesor: "Ana" }
      )
    ).toEqual({
      campos_cambiados: [],
      antes: {},
      despues: {},
    });
  });

  it("summarizes recent events for the UI", () => {
    expect(
      summarizeEmpresaEvent({
        tipo: "cambio_estado",
        payload: { desde: "Activa", hacia: "Cerrada" },
      })
    ).toBe("Estado: Activa -> Cerrada");
  });

  it("summarizes observation edits with useful detail", () => {
    expect(
      summarizeEmpresaEvent({
        tipo: "edicion",
        payload: {
          campos_cambiados: ["observaciones"],
          despues: { observaciones: "Cliente solicita seguimiento en mayo." },
        },
      })
    ).toBe("Observación registrada: Cliente solicita seguimiento en mayo.");
  });

  it("describes deletion events with a useful fallback", () => {
    expect(
      describeEmpresaEvent({
        tipo: "eliminacion",
        payload: { comentario: "Empresa duplicada en el registro." },
      })
    ).toBe("Empresa eliminada: Empresa duplicada en el registro.");

    expect(
      describeEmpresaEvent({
        tipo: "eliminacion",
        payload: {},
      })
    ).toBe("Empresa eliminada.");
  });

  it("summarizes lifecycle events with user-facing detail", () => {
    expect(
      summarizeEmpresaEvent({
        tipo: "reclamada",
        payload: {
          profesional_nombre: "Laura Perez",
          comentario: "Apoyo por carga operativa.",
        },
      })
    ).toBe("Empresa reclamada por Laura Perez");

    expect(
      describeEmpresaEvent({
        tipo: "quitada",
        payload: {
          anterior_nombre: "Marta Ruiz",
          tomada_por_nombre: "Laura Perez",
          comentario: "Redistribucion autorizada.",
        },
      })
    ).toBe(
      "Laura Perez reclamo la empresa que tenia Marta Ruiz: Redistribucion autorizada."
    );

    expect(
      describeEmpresaEvent({
        tipo: "soltada",
        payload: { comentario: "Empresa queda disponible para el equipo." },
      })
    ).toBe("Empresa soltada: Empresa queda disponible para el equipo.");

    expect(
      summarizeEmpresaEvent({
        tipo: "nota",
        payload: { contenido: "Cliente solicita llamada el viernes." },
      })
    ).toBe("Nota: Cliente solicita llamada el viernes.");
  });
});
