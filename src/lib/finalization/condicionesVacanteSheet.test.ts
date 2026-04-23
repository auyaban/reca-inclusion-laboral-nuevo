import { describe, expect, it } from "vitest";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import {
  buildCondicionesVacanteSheetMutation,
  CONDICIONES_VACANTE_SHEET_NAME,
} from "@/lib/finalization/condicionesVacanteSheet";

function buildSection1Data() {
  return {
    fecha_visita: "2026-04-22",
    modalidad: "Presencial",
    nombre_empresa: "ACME SAS",
    ciudad_empresa: "Bogota",
    direccion_empresa: "Calle 1",
    nit_empresa: "900123456",
    correo_1: "contacto@acme.com",
    telefono_empresa: "3000000000",
    contacto_empresa: "Laura Gomez",
    cargo: "Gerente",
    caja_compensacion: "Compensar",
    sede_empresa: "Principal",
    asesor: "Carlos Ruiz",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@reca.com",
    correo_asesor: "carlos@reca.com",
  };
}

function buildFormData() {
  const values = normalizeCondicionesVacanteValues({});
  values.observaciones_recomendaciones = "Observacion final";
  return values;
}

describe("buildCondicionesVacanteSheetMutation", () => {
  it("writes both disability and description cells for the base rows", () => {
    const formData = buildFormData();
    formData.discapacidades = [
      { discapacidad: "Visual", descripcion: "Apoyo visual" },
      ...formData.discapacidades.slice(1),
    ];

    const mutation = buildCondicionesVacanteSheetMutation({
      section1Data: buildSection1Data(),
      formData,
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional RECA" },
        { nombre: "Luis Gomez", cargo: "Asesor Agencia" },
      ],
    });

    expect(mutation.writes).toEqual(
      expect.arrayContaining([
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!A150`,
          value: "Visual",
        },
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!G150`,
          value: "Apoyo visual",
        },
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!A156`,
          value: "Observacion final",
        },
      ])
    );
  });

  it("shifts following sections and writes extra disability rows in A/G", () => {
    const formData = buildFormData();
    formData.discapacidades = [
      { discapacidad: "Visual", descripcion: "Apoyo visual" },
      { discapacidad: "Auditiva", descripcion: "Apoyo auditivo" },
      { discapacidad: "Intelectual", descripcion: "Apoyo cognitivo" },
      { discapacidad: "Fisica", descripcion: "Apoyo fisico" },
      { discapacidad: "Psicosocial", descripcion: "" },
    ];

    const mutation = buildCondicionesVacanteSheetMutation({
      section1Data: buildSection1Data(),
      formData,
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional RECA" },
        { nombre: "Luis Gomez", cargo: "Asesor Agencia" },
        { nombre: "Maria Ruiz", cargo: "Apoyo" },
        { nombre: "Juan Toro", cargo: "Invitado" },
      ],
    });

    expect(mutation.writes).toEqual(
      expect.arrayContaining([
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!A154`,
          value: "Psicosocial",
        },
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!G154`,
          value: "",
        },
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!A157`,
          value: "Observacion final",
        },
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!E162`,
          value: "Juan Toro",
        },
      ])
    );
    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: CONDICIONES_VACANTE_SHEET_NAME,
        insertAtRow: 153,
        count: 1,
        templateRow: 153,
      },
      {
        sheetName: CONDICIONES_VACANTE_SHEET_NAME,
        insertAtRow: 161,
        count: 1,
        templateRow: 161,
      },
    ]);
  });
});
