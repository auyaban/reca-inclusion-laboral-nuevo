import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { CondicionesVacanteFormPresenter } from "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter";
import { getDefaultCondicionesVacanteValues } from "@/lib/condicionesVacante";
import type { Empresa } from "@/lib/store/empresaStore";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";

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

function PresenterHarness() {
  const companyRef = useRef<HTMLElement | null>(null);
  const vacancyRef = useRef<HTMLElement | null>(null);
  const educationRef = useRef<HTMLElement | null>(null);
  const capabilitiesRef = useRef<HTMLElement | null>(null);
  const posturesRef = useRef<HTMLElement | null>(null);
  const risksRef = useRef<HTMLElement | null>(null);
  const disabilitiesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CondicionesVacanteValues>({
    defaultValues: getDefaultCondicionesVacanteValues(empresa),
  });
  const values = getValues();

  return (
    <CondicionesVacanteFormPresenter
      shell={{
        title: "Condiciones de la Vacante",
        companyName: empresa.nombre_empresa,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          { id: "vacancy", label: "Vacante", status: "idle" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: "Error de prueba",
        submitAction: (
          <>
            <button type="button">Duplicar acta</button>
            <button type="submit">Finalizar</button>
          </>
        ),
        formProps: {
          onSubmit: vi.fn(),
          noValidate: true,
        },
      }}
      draftStatus={<div>Estado del borrador</div>}
      notice={<div>Banner de lock</div>}
      sections={{
        company: {
          empresa,
          fechaVisita: values.fecha_visita,
          modalidad: values.modalidad,
          nitEmpresa: values.nit_empresa,
          register,
          errors,
          onSelectEmpresa: vi.fn(),
          collapsed: false,
          status: "active",
          sectionRef: companyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        vacancy: {
          isDocumentEditable: true,
          register,
          errors,
          competencias: values.competencias,
          collapsed: false,
          status: "idle",
          sectionRef: vacancyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        education: {
          isDocumentEditable: true,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: educationRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        capabilities: {
          isDocumentEditable: true,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: capabilitiesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        postures: {
          isDocumentEditable: true,
          register,
          errors,
          collapsed: false,
          status: "idle",
          sectionRef: posturesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        risks: {
          isDocumentEditable: true,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: risksRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        disabilities: {
          isDocumentEditable: true,
          control,
          errors,
          setValue,
          catalogs: undefined,
          catalogError: null,
          catalogStatus: "ready",
          onRetryCatalog: vi.fn(),
          collapsed: false,
          status: "idle",
          sectionRef: disabilitiesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        recommendations: {
          isDocumentEditable: true,
          register,
          errors,
          recommendations: values.observaciones_recomendaciones,
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: recommendationsRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        attendees: {
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
          sectionRef: attendeesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
      }}
      submitDialog={{
        open: true,
        description: "Confirma el envío del acta.",
        loading: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }}
    />
  );
}

function PresenterWithoutEmpresaHarness() {
  const companyRef = useRef<HTMLElement | null>(null);
  const vacancyRef = useRef<HTMLElement | null>(null);
  const educationRef = useRef<HTMLElement | null>(null);
  const capabilitiesRef = useRef<HTMLElement | null>(null);
  const posturesRef = useRef<HTMLElement | null>(null);
  const risksRef = useRef<HTMLElement | null>(null);
  const disabilitiesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CondicionesVacanteValues>({
    defaultValues: getDefaultCondicionesVacanteValues(null),
  });
  const values = getValues();

  return (
    <CondicionesVacanteFormPresenter
      shell={{
        title: "Condiciones de la Vacante",
        companyName: undefined,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          { id: "vacancy", label: "Vacante", status: "disabled" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: null,
        submitAction: <button type="submit">Finalizar</button>,
        formProps: {
          onSubmit: vi.fn(),
          noValidate: true,
        },
      }}
      draftStatus={<div>Estado del borrador</div>}
      notice={null}
      sections={{
        company: {
          empresa: null,
          fechaVisita: values.fecha_visita,
          modalidad: values.modalidad,
          nitEmpresa: values.nit_empresa,
          register,
          errors,
          onSelectEmpresa: vi.fn(),
          collapsed: false,
          status: "active",
          sectionRef: companyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        vacancy: {
          isDocumentEditable: false,
          register,
          errors,
          competencias: values.competencias,
          collapsed: false,
          status: "disabled",
          sectionRef: vacancyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        education: {
          isDocumentEditable: false,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "disabled",
          sectionRef: educationRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        capabilities: {
          isDocumentEditable: false,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "disabled",
          sectionRef: capabilitiesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        postures: {
          isDocumentEditable: false,
          register,
          errors,
          collapsed: false,
          status: "disabled",
          sectionRef: posturesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        risks: {
          isDocumentEditable: false,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: false,
          status: "disabled",
          sectionRef: risksRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        disabilities: {
          isDocumentEditable: false,
          control,
          errors,
          setValue,
          catalogs: undefined,
          catalogError: null,
          catalogStatus: "error",
          onRetryCatalog: vi.fn(),
          collapsed: false,
          status: "disabled",
          sectionRef: disabilitiesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        recommendations: {
          isDocumentEditable: false,
          register,
          errors,
          recommendations: values.observaciones_recomendaciones,
          getValues,
          setValue,
          collapsed: false,
          status: "disabled",
          sectionRef: recommendationsRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        attendees: {
          isDocumentEditable: false,
          control,
          register,
          setValue,
          errors,
          profesionales: [],
          profesionalAsignado: null,
          collapsed: false,
          status: "disabled",
          sectionRef: attendeesRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
      }}
      submitDialog={{
        open: false,
        description: "Confirma el envío del acta.",
        loading: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }}
    />
  );
}

describe("CondicionesVacanteFormPresenter", () => {
  it("renders the long-form shell, sections and confirm dialog", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toContain("Condiciones de la Vacante");
    expect(html).toContain("ACME SAS");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Banner de lock");
    expect(html).toContain("Empresa");
    expect(html).toContain("Características de la vacante");
    expect(html).toContain("Formación, horarios y experiencia");
    expect(html).toContain("Habilidades y capacidades");
    expect(html).toContain("Posturas y movimientos");
    expect(html).toContain("Peligros y riesgos");
    expect(html).toContain("Discapacidades compatibles");
    expect(html).toContain("Observaciones y recomendaciones");
    expect(html).toContain("Asistentes");
    expect(html).toContain("Duplicar acta");
    expect(html).toContain("Finalizar");
    expect(html).toContain("Confirmar envío");
  });

  it("renders the add row button after the rendered disability rows", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toContain('data-testid="condiciones-discapacidades-add-button"');
    expect(html.indexOf("Fila 1")).toBeLessThan(
      html.indexOf('data-testid="condiciones-discapacidades-add-button"')
    );
  });

  it("renders disabled placeholders before selecting a company", () => {
    const html = renderToStaticMarkup(<PresenterWithoutEmpresaHarness />);

    expect(html).toContain(
      "Selecciona una empresa para habilitar esta sección del documento."
    );
  });
});
