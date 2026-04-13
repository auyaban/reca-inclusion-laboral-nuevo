import { describe, expect, it } from "vitest";
import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
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
          fecha_visita: new Date().toISOString().split("T")[0],
          modalidad: "Presencial",
          nit_empresa: "9001",
          motivacion: [],
          acuerdos_observaciones: "",
          asistentes: [
            { nombre: "Laura", cargo: "" },
            { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
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
            { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
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
        { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
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
            { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
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
            { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
          ],
        },
        lastCheckpointHash: syncedHash,
      })
    ).toBe(true);
  });
});
