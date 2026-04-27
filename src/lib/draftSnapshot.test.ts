import { describe, expect, it } from "vitest";
import {
  resolveHasLocalDirtyChanges,
  shouldPersistSnapshot,
} from "@/lib/draftSnapshot";
import { buildDraftSnapshotHash } from "@/lib/drafts/shared";

const empresa = {
  id: "empresa-1",
  nit_empresa: "9001",
  nombre_empresa: "Empresa Uno",
  direccion_empresa: null,
  ciudad_empresa: null,
  sede_empresa: null,
  zona_empresa: null,
  correo_1: null,
  contacto_empresa: null,
  telefono_empresa: null,
  cargo: null,
  profesional_asignado: "Laura",
  correo_profesional: null,
  asesor: null,
  correo_asesor: null,
  caja_compensacion: null,
};

describe("draftSnapshot", () => {
  it("does not persist presentacion defaults for a new session", () => {
    expect(
      shouldPersistSnapshot({
        slug: "presentacion",
        empresa,
        data: {
          tipo_visita: "Presentación",
          fecha_visita: "",
          modalidad: "",
          nit_empresa: "9001",
          motivacion: [],
          acuerdos_observaciones: "",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: "Asesor Agencia" },
          ],
        },
      })
    ).toBe(false);
  });

  it("persists presentacion once the user adds meaningful content", () => {
    expect(
      shouldPersistSnapshot({
        slug: "presentacion",
        empresa,
        data: {
          tipo_visita: "Presentación",
          fecha_visita: new Date().toISOString().split("T")[0],
          modalidad: "Presencial",
          nit_empresa: "9001",
          motivacion: ["Beneficios Tributarios"],
          acuerdos_observaciones: "",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: "Asesor Agencia" },
          ],
        },
      })
    ).toBe(true);
  });

  it("persists interprete-lsc defaults because the RECA attendee row is preseeded", () => {
    expect(
      shouldPersistSnapshot({
        slug: "interprete-lsc",
        empresa,
        data: {
          fecha_visita: new Date().toISOString().split("T")[0],
          modalidad_interprete: "Presencial",
          modalidad_profesional_reca: "Presencial",
          nit_empresa: "9001",
          oferentes: [{ nombre_oferente: "", cedula: "", proceso: "" }],
          interpretes: [
            {
              nombre: "",
              hora_inicial: "",
              hora_final: "",
              total_tiempo: "",
            },
          ],
          sabana: { activo: false, horas: 1 },
          sumatoria_horas: "0:00",
          asistentes: [
            { nombre: "Laura", cargo: "Profesional RECA" },
            { nombre: "", cargo: "" },
          ],
        },
      })
    ).toBe(true);
  });

  it("tracks local dirtiness against the last remote checkpoint hash", () => {
    const syncedHash = buildDraftSnapshotHash(2, {
      fecha_visita: "2026-04-13",
      modalidad: "Presencial",
      nit_empresa: "9001",
      observaciones: "ok",
      asistentes: [
        { nombre: "Laura", cargo: "" },
        { nombre: "", cargo: "" },
      ],
    });

    expect(
      resolveHasLocalDirtyChanges({
        slug: "sensibilizacion",
        empresa,
        step: 2,
        data: {
          fecha_visita: "2026-04-13",
          modalidad: "Presencial",
          nit_empresa: "9001",
          observaciones: "ok",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: "" },
          ],
        },
        lastCheckpointHash: syncedHash,
      })
    ).toBe(false);

    expect(
      resolveHasLocalDirtyChanges({
        slug: "sensibilizacion",
        empresa,
        step: 2,
        data: {
          fecha_visita: "2026-04-13",
          modalidad: "Presencial",
          nit_empresa: "9001",
          observaciones: "cambio local",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: "" },
          ],
        },
        lastCheckpointHash: syncedHash,
      })
    ).toBe(true);
  });

  it("treats legacy checkpoint hashes as synced when the only delta is failed_visit_applied_at: null", () => {
    const legacyHash = buildDraftSnapshotHash(2, {
      fecha_visita: "2026-04-13",
      modalidad: "Presencial",
      nit_empresa: "9001",
      observaciones: "ok",
      asistentes: [
        { nombre: "Laura", cargo: "" },
        { nombre: "", cargo: "" },
      ],
    });

    expect(
      resolveHasLocalDirtyChanges({
        slug: "sensibilizacion",
        empresa,
        step: 2,
        data: {
          fecha_visita: "2026-04-13",
          modalidad: "Presencial",
          nit_empresa: "9001",
          observaciones: "ok",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: "" },
          ],
          failed_visit_applied_at: null,
        },
        lastCheckpointHash: legacyHash,
      })
    ).toBe(false);
  });
});
