import { describe, expect, it } from "vitest";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD } from "@/lib/validations/presentacion";
import {
  buildCanonicalFinalizationPayload,
  buildCondicionesVacanteRequestHash,
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
  buildRequestHash,
} from "./idempotency";

describe("finalization idempotency helpers", () => {
  const empresa = {
    id: "empresa-1",
    nombre_empresa: "ACME SAS",
    nit_empresa: "900123456",
    direccion_empresa: "Calle 1 # 2-3",
    ciudad_empresa: "Bogota",
    sede_empresa: "Principal",
    zona_empresa: null,
    correo_1: "contacto@acme.com",
    contacto_empresa: "Laura Gomez",
    telefono_empresa: "3000000000",
    cargo: "Gerente",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@reca.com",
    asesor: "Carlos Ruiz",
    correo_asesor: "carlos@reca.com",
    caja_compensacion: "Compensar",
  };

  it("normalizes presentacion payloads into a stable canonical shape", () => {
    const payload = buildCanonicalFinalizationPayload("presentacion", {
      tipo_visita: "Reactivación",
      fecha_visita: " 2026-04-14 ",
      modalidad: "Mixto",
      nit_empresa: " 9001 ",
      motivacion: [
        "Ventaja en licitaciones públicas",
        "Responsabilidad Social Empresarial",
        "Objetivos y metas para la diversidad, equidad e inclusión.",
        "Responsabilidad Social Empresarial",
      ],
      acuerdos_observaciones: "  Acuerdo final  ",
      [PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD]: 20,
      asistentes: [
        { nombre: "  Ana Perez  ", cargo: "  Profesional  " },
        { nombre: "", cargo: "" },
        { nombre: "  Marta Ruiz", cargo: "Asesora  " },
      ],
    });

    expect(payload).toEqual({
      tipo_visita: "Reactivación",
      fecha_visita: "2026-04-14",
      modalidad: "Mixta",
      nit_empresa: "9001",
      motivacion: [
        "Objetivos y metas para la diversidad, equidad e inclusión.",
        "Responsabilidad Social Empresarial",
        "Ventaja en licitaciones públicas",
      ],
      acuerdos_observaciones: "Acuerdo final",
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional" },
        { nombre: "Marta Ruiz", cargo: "Asesora" },
      ],
    });
  });

  it("ignores the presentacion prewarm estimate when building request hashes", () => {
    const basePayload = {
      tipo_visita: "PresentaciÃ³n",
      fecha_visita: "2026-04-14",
      modalidad: "Presencial",
      nit_empresa: "9001",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Acuerdo final",
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional" },
        { nombre: "Marta Ruiz", cargo: "Asesora" },
      ],
    };

    expect(
      buildFinalizationRequestHash("presentacion", {
        ...basePayload,
        [PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD]: 2,
      })
    ).toBe(
      buildFinalizationRequestHash("presentacion", {
        ...basePayload,
        [PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD]: 20,
      })
    );
  });

  it("builds the same request hash for equivalent sensibilizacion payloads", () => {
    const base = {
      fecha_visita: "2026-04-14",
      modalidad: "Mixta",
      nit_empresa: "9001",
      observaciones: "Observación",
      asistentes: [
        { nombre: "Ana", cargo: "Profesional" },
        { nombre: "Juan", cargo: "Asesor" },
      ],
    };

    const variant = {
      fecha_visita: " 2026-04-14 ",
      modalidad: "Mixto",
      nit_empresa: " 9001 ",
      observaciones: "  Observación  ",
      asistentes: [
        { nombre: "  Ana  ", cargo: "  Profesional  " },
        { nombre: "Juan", cargo: "Asesor" },
      ],
    };

    expect(buildFinalizationRequestHash("sensibilizacion", base)).toBe(
      buildFinalizationRequestHash("sensibilizacion", variant)
    );
  });

  it("builds the same raw request hash for equivalent payloads regardless of key order", () => {
    const base = {
      vinculados: [
        { nombre: "Ana", cedula: "123", telefono: undefined },
        { nombre: "Luis", cedula: "456" },
      ],
      empresa: {
        nit: "900123456",
        nombre: "ACME SAS",
      },
    };

    const variant = {
      empresa: {
        nombre: "ACME SAS",
        nit: "900123456",
      },
      vinculados: [
        { telefono: undefined, cedula: "123", nombre: "Ana" },
        { cedula: "456", nombre: "Luis" },
      ],
    };

    expect(buildRequestHash(base)).toBe(buildRequestHash(variant));
  });

  it("derives a stable idempotency key from identity and request hash", () => {
    const requestHash = buildFinalizationRequestHash("presentacion", {
      tipo_visita: "Presentación",
      fecha_visita: "2026-04-14",
      modalidad: "Presencial",
      nit_empresa: "9001",
      motivacion: [],
      acuerdos_observaciones: "",
      asistentes: [],
    });

    const first = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        draft_id: "  draft-1  ",
        local_draft_session_id: "session-1",
      },
      requestHash,
    });

    const second = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "  session-1  ",
      },
      requestHash,
    });

    const third = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        local_draft_session_id: "session-1",
      },
      requestHash,
    });

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  it("keeps condiciones-vacante normalization idempotent", () => {
    const once = normalizeCondicionesVacanteValues({}, empresa as never);
    const twice = normalizeCondicionesVacanteValues(once, empresa as never);

    expect(twice).toEqual(once);
  });

  it("builds the same condiciones-vacante hash from raw and already-normalized payloads", () => {
    const rawPayload = {
      fecha_visita: " 2026-04-14 ",
      modalidad: "Mixto",
      nit_empresa: " 900123456 ",
      nombre_vacante: "  Operario de bodega ",
      numero_vacantes: " 2 ",
      experiencia_meses: "Dos Años",
      horario_asignados: undefined,
      asistentes: [
        { nombre: "  Marta Ruiz  ", cargo: "  Profesional RECA  " },
        { nombre: "Carlos Ruiz", cargo: "Asesor agencia" },
      ],
      discapacidades: [
        { discapacidad: " Auditiva ", descripcion: "  Parcial " },
      ],
    };

    const normalizedPayload = normalizeCondicionesVacanteValues(
      rawPayload,
      empresa as never
    );

    expect(
      buildFinalizationRequestHash("condiciones-vacante", rawPayload)
    ).toBe(buildCondicionesVacanteRequestHash(normalizedPayload));
  });

  it("builds the same evaluation hash for equivalent normalized payloads", () => {
    const base = {
      fecha_visita: "2026-04-17",
      modalidad: "Mixta",
      nit_empresa: "900123456",
      nombre_empresa: "ACME SAS",
      direccion_empresa: "Calle 1 # 2-3",
      correo_1: "contacto@acme.com",
      contacto_empresa: "Laura Gomez",
      caja_compensacion: "Compensar",
      asesor: "Carlos Ruiz",
      ciudad_empresa: "Bogota",
      telefono_empresa: "3000000000",
      cargo: "Gerente",
      sede_empresa: "Principal",
      profesional_asignado: "Marta Ruiz",
      section_2_1: {
        transporte_publico: {
          accesible: "Si",
          respuesta: "",
          secundaria: "",
          terciaria: "",
          cuaternaria: "",
          quinary: "",
          observaciones: "Ruta accesible",
          detalle: "",
        },
      },
      section_2_2: {},
      section_2_3: {},
      section_2_4: {},
      section_2_5: {},
      section_2_6: {},
      section_3: {},
      section_4: {
        nivel_accesibilidad: "Alto",
        descripcion: "La empresa cuenta con un alto nivel de accesibilidad.",
      },
      section_5: {
        discapacidad_fisica: {
          aplica: "Aplica",
          nota: "Codigo",
          ajustes: "Ajuste sugerido",
        },
      },
      observaciones_generales: "Observacion final",
      cargos_compatibles: "Analista",
      asistentes: [
        { nombre: " Marta Ruiz ", cargo: " Profesional RECA " },
        { nombre: "Carlos Ruiz", cargo: "Asesor Agencia" },
      ],
    };

    const variant = {
      ...base,
      modalidad: "Mixto",
      nit_empresa: " 900123456 ",
      section_2_1: {
        transporte_publico: {
          ...base.section_2_1.transporte_publico,
          observaciones: " Ruta accesible ",
        },
      },
      observaciones_generales: " Observacion final ",
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: " Carlos Ruiz ", cargo: " Asesor Agencia " },
      ],
    };

    expect(buildFinalizationRequestHash("evaluacion", base)).toBe(
      buildFinalizationRequestHash("evaluacion", variant)
    );
  });

  it("fails explicitly when a non-shared slug tries to use shared canonical payload builders", () => {
    expect(() =>
      buildCanonicalFinalizationPayload(
        "induccion-organizacional" as never,
        {}
      )
    ).toThrow(
      "El formulario induccion-organizacional no usa buildCanonicalFinalizationPayload()."
    );
  });
});
