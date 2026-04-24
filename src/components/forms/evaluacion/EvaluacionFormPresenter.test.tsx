import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  EvaluacionFormPresenter,
  type EvaluacionFormPresenterProps,
} from "@/components/forms/evaluacion/EvaluacionFormPresenter";
import {
  calculateEvaluacionAccessibilitySummary,
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
} from "@/lib/evaluacion";
import { EVALUACION_QUESTION_SECTION_IDS } from "@/lib/evaluacionSections";
import type { Empresa } from "@/lib/store/empresaStore";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

const empresa: Empresa = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@acme.com",
  caja_compensacion: "Compensar",
};

function useSectionRefs() {
  return {
    company: useRef<HTMLElement | null>(null),
    section_2_1: useRef<HTMLElement | null>(null),
    section_2_2: useRef<HTMLElement | null>(null),
    section_2_3: useRef<HTMLElement | null>(null),
    section_2_4: useRef<HTMLElement | null>(null),
    section_2_5: useRef<HTMLElement | null>(null),
    section_2_6: useRef<HTMLElement | null>(null),
    section_3: useRef<HTMLElement | null>(null),
    section_4: useRef<HTMLElement | null>(null),
    section_5: useRef<HTMLElement | null>(null),
    section_6: useRef<HTMLElement | null>(null),
    section_7: useRef<HTMLElement | null>(null),
    section_8: useRef<HTMLElement | null>(null),
  };
}

function PresenterHarness() {
  const refs = useSectionRefs();
  const defaultValues = useMemo(() => {
    const values = createEmptyEvaluacionValues(empresa);
    values.section_2_1.transporte_publico.accesible = "Si";
    values.section_2_1.transporte_publico.observaciones = "Ruta en buen estado";
    values.section_2_2.linea_purpura.respuesta = "Canal de denuncia activo";
    values.section_4.nivel_accesibilidad = "Medio";
    values.section_4.descripcion = deriveEvaluacionSection4Description("Medio");
    values.section_5.discapacidad_fisica.aplica = "Aplica";
    values.section_5.discapacidad_fisica.ajustes =
      values.section_5.discapacidad_fisica.ajustes || "Ajuste sugerido";
    values.observaciones_generales = "Observaciones iniciales";
    values.cargos_compatibles = "Analista de soporte";
    values.asistentes[0].cargo = "Profesional RECA";
    values.asistentes[1] = {
      nombre: "Persona Invitada",
      cargo: "Talento humano",
    };
    values.asistentes[2] = {
      nombre: "Carlos Ruiz",
      cargo: "Asesor Agencia",
    };
    return values;
  }, []);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<EvaluacionValues>({
    defaultValues,
  });

  const summary = calculateEvaluacionAccessibilitySummary(defaultValues);

  return (
    <EvaluacionFormPresenter
      shell={{
        title: "Evaluacion de Accesibilidad",
        companyName: empresa.nombre_empresa,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "completed" },
          {
            type: "group",
            id: "section_2_group",
            label: "Sección 2",
            shortLabel: "2",
            children: [
              { id: "section_2_1", label: "2.1", shortLabel: "2.1", status: "active" },
              { id: "section_2_2", label: "2.2", shortLabel: "2.2", status: "idle" },
              { id: "section_2_3", label: "2.3", shortLabel: "2.3", status: "idle" },
              { id: "section_2_4", label: "2.4", shortLabel: "2.4", status: "idle" },
              { id: "section_2_5", label: "2.5", shortLabel: "2.5", status: "idle" },
              { id: "section_2_6", label: "2.6", shortLabel: "2.6", status: "idle" },
            ],
          },
          { id: "section_4", label: "4", status: "idle" },
          { id: "section_5", label: "5", status: "idle" },
          { id: "section_6", label: "6", status: "idle" },
          { id: "section_7", label: "7", status: "idle" },
          { id: "section_8", label: "8", status: "idle" },
        ],
        activeSectionId: "section_2_1",
        onSectionSelect: vi.fn(),
        serverError: "Error de prueba",
        submitAction: <button type="submit">Finalizar</button>,
      }}
      draftStatus={<div>Estado del borrador</div>}
      notice={<div>Banner de lock</div>}
      sections={{
        company: {
          empresa,
          fechaVisita: "2026-04-17",
          modalidad: "Presencial",
          nitEmpresa: empresa.nit_empresa ?? "",
          register,
          errors,
          onSelectEmpresa: vi.fn(),
          disabled: false,
          collapsed: false,
          status: "completed",
          sectionRef: refs.company,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        questionSections: Object.fromEntries(
          EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => [
            sectionId,
            {
              isDocumentEditable: true,
              sectionId,
              values: defaultValues[sectionId],
              register,
              errors,
              getValues,
              setValue,
              collapsed: false,
              status: sectionId === "section_2_1" ? "active" : "idle",
              sectionRef: refs[sectionId],
              onToggle: vi.fn(),
              onFocusCapture: vi.fn(),
            },
          ])
        ) as unknown as EvaluacionFormPresenterProps["sections"]["questionSections"],
        section_4: {
          isDocumentEditable: true,
          values: defaultValues.section_4,
          summary,
          register,
          errors,
          collapsed: false,
          status: "idle",
          sectionRef: refs.section_4,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_5: {
          isDocumentEditable: true,
          values: defaultValues.section_5,
          register,
          errors,
          collapsed: false,
          status: "idle",
          sectionRef: refs.section_5,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_6: {
          isDocumentEditable: true,
          fieldName: "observaciones_generales",
          label: "Observaciones generales",
          value: defaultValues.observaciones_generales,
          required: false,
          register,
          errors,
          getValues,
          setValue,
          placeholder: "Observaciones",
          collapsed: false,
          status: "idle",
          sectionRef: refs.section_6,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_7: {
          isDocumentEditable: true,
          fieldName: "cargos_compatibles",
          label: "Cargos compatibles",
          value: defaultValues.cargos_compatibles,
          required: true,
          register,
          errors,
          getValues,
          setValue,
          placeholder: "Cargos",
          collapsed: false,
          status: "idle",
          sectionRef: refs.section_7,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_8: {
          isDocumentEditable: true,
          control,
          register,
          setValue,
          errors,
          profesionales: [
            {
              nombre_profesional: "Marta Ruiz",
              cargo_profesional: "Profesional RECA",
            },
          ],
          profesionalAsignado: empresa.profesional_asignado,
          collapsed: false,
          status: "idle",
          sectionRef: refs.section_8,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
      }}
      submitDialog={{
        open: false,
        description: "Confirma el envio",
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }}
    />
  );
}

function PresenterWithoutEmpresaHarness() {
  const refs = useSectionRefs();
  const defaultValues = useMemo(() => createEmptyEvaluacionValues(null), []);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<EvaluacionValues>({
    defaultValues,
  });

  return (
    <EvaluacionFormPresenter
      shell={{
        title: "Evaluacion de Accesibilidad",
        companyName: undefined,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          {
            type: "group",
            id: "section_2_group",
            label: "Sección 2",
            shortLabel: "2",
            children: [
              {
                id: "section_2_1",
                label: "2.1",
                shortLabel: "2.1",
                status: "disabled",
              },
              {
                id: "section_2_2",
                label: "2.2",
                shortLabel: "2.2",
                status: "disabled",
              },
              {
                id: "section_2_3",
                label: "2.3",
                shortLabel: "2.3",
                status: "disabled",
              },
              {
                id: "section_2_4",
                label: "2.4",
                shortLabel: "2.4",
                status: "disabled",
              },
              {
                id: "section_2_5",
                label: "2.5",
                shortLabel: "2.5",
                status: "disabled",
              },
              {
                id: "section_2_6",
                label: "2.6",
                shortLabel: "2.6",
                status: "disabled",
              },
            ],
          },
          { id: "section_4", label: "4", status: "disabled" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: null,
        submitAction: <button type="submit">Finalizar</button>,
      }}
      draftStatus={<div>Estado del borrador</div>}
      notice={null}
      sections={{
        company: {
          empresa: null,
          fechaVisita: undefined,
          modalidad: undefined,
          nitEmpresa: undefined,
          register,
          errors,
          onSelectEmpresa: vi.fn(),
          disabled: false,
          collapsed: false,
          status: "active",
          sectionRef: refs.company,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        questionSections: Object.fromEntries(
          EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => [
            sectionId,
            {
              isDocumentEditable: false,
              sectionId,
              values: defaultValues[sectionId],
              register,
              errors,
              getValues,
              setValue,
              collapsed: false,
              status: "disabled",
              sectionRef: refs[sectionId],
              onToggle: vi.fn(),
              onFocusCapture: vi.fn(),
            },
          ])
        ) as unknown as EvaluacionFormPresenterProps["sections"]["questionSections"],
        section_4: {
          isDocumentEditable: false,
          values: defaultValues.section_4,
          summary: calculateEvaluacionAccessibilitySummary(defaultValues),
          register,
          errors,
          collapsed: false,
          status: "disabled",
          sectionRef: refs.section_4,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_5: {
          isDocumentEditable: false,
          values: defaultValues.section_5,
          register,
          errors,
          collapsed: false,
          status: "disabled",
          sectionRef: refs.section_5,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_6: {
          isDocumentEditable: false,
          fieldName: "observaciones_generales",
          label: "Observaciones generales",
          value: "",
          required: false,
          register,
          errors,
          getValues,
          setValue,
          placeholder: "Observaciones",
          collapsed: false,
          status: "disabled",
          sectionRef: refs.section_6,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_7: {
          isDocumentEditable: false,
          fieldName: "cargos_compatibles",
          label: "Cargos compatibles",
          value: "",
          required: true,
          register,
          errors,
          getValues,
          setValue,
          placeholder: "Cargos",
          collapsed: false,
          status: "disabled",
          sectionRef: refs.section_7,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        section_8: {
          isDocumentEditable: false,
          control,
          register,
          setValue,
          errors,
          profesionales: [],
          profesionalAsignado: null,
          collapsed: false,
          status: "disabled",
          sectionRef: refs.section_8,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
      }}
      submitDialog={{
        open: false,
        description: "Confirma el envio",
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }}
    />
  );
}

describe("EvaluacionFormPresenter", () => {
  it("renders active question sections, section 4 and editable section 5", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toContain("Evaluacion de Accesibilidad");
    expect(html).toContain("ACME SAS");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Banner de lock");
    expect(html).toContain("Sección 2");
    expect(html).toContain("2.1 Condiciones de movilidad y urbanisticas");
    expect(html).toContain(
      "¿Existe transporte público para ingresar y salir de la empresa?"
    );
    expect(html).toContain("data-testid=\"section_2_1.transporte_publico.accesible\"");
    expect(html).toContain("data-testid=\"section_2_1.transporte_publico.observaciones\"");
    expect(html).toContain("Nivel sugerido");
    expect(html).toContain("data-testid=\"section_4.nivel_accesibilidad\"");
    expect(html).toContain("data-testid=\"section_4.descripcion\"");
    expect(html).toContain("5. Ajustes razonables");
    expect(html).toContain("data-testid=\"section_5.discapacidad_fisica.aplica\"");
    expect(html).toContain("data-testid=\"section_5.discapacidad_fisica.nota\"");
    expect(html).toContain("data-testid=\"section_5.discapacidad_fisica.ajustes\"");
    expect(html).toContain("Dictar");
    expect(html).toContain("Finalizar");
  });

  it("keeps observaciones generales optional while cargos compatibles remains required", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).not.toContain("Observaciones generales<span");
    expect(html).toMatch(/Cargos compatibles[\s\S]{0,120}ml-1 text-red-500/);
  });

  it("marks question-level observaciones as required in sections 2.1 to 3", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toMatch(/Observaciones[\s\S]{0,120}ml-1 text-red-500/);
  });

  it("keeps active sections disabled until a company is selected", () => {
    const html = renderToStaticMarkup(<PresenterWithoutEmpresaHarness />);

    expect(html).toContain("Selecciona una empresa para habilitar");
    expect(html).toContain("Sección 2");
    expect(html).toContain("5. Ajustes razonables");
  });
});
