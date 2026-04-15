import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { SensibilizacionFormPresenter } from "@/components/forms/sensibilizacion/SensibilizacionFormPresenter";
import { getDefaultSensibilizacionValues } from "@/lib/sensibilizacion";
import type { Empresa } from "@/lib/store/empresaStore";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";

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
  const visitRef = useRef<HTMLElement | null>(null);
  const observationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SensibilizacionValues>({
    defaultValues: getDefaultSensibilizacionValues(empresa),
  });

  return (
    <SensibilizacionFormPresenter
      shell={{
        title: "Sensibilización",
        companyName: empresa.nombre_empresa,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          { id: "visit", label: "Datos de la visita", status: "idle" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: "Error de prueba",
        submitAction: (<button type="submit">Finalizar</button>),
        formProps: {
          onSubmit: vi.fn(),
          noValidate: true,
        },
      }}
      draftStatus={(<div>Estado del borrador</div>)}
      notice={(<div>Banner de lock</div>)}
      sections={{
        company: {
          empresa,
          fechaVisita: "2026-04-15",
          modalidad: "Presencial",
          nitEmpresa: "900123456",
          onSelectEmpresa: vi.fn(),
          collapsed: false,
          status: "active",
          sectionRef: companyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        visit: {
          isDocumentEditable: true,
          register,
          errors,
          collapsed: false,
          status: "idle",
          sectionRef: visitRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        observations: {
          isDocumentEditable: true,
          register,
          errors,
          observaciones: "",
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: observationsRef,
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
  const visitRef = useRef<HTMLElement | null>(null);
  const observationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SensibilizacionValues>({
    defaultValues: getDefaultSensibilizacionValues(null),
  });

  return (
    <SensibilizacionFormPresenter
      shell={{
        title: "Sensibilizacion",
        companyName: undefined,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          { id: "visit", label: "Datos de la visita", status: "disabled" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: null,
        submitAction: (<button type="submit">Finalizar</button>),
        formProps: {
          onSubmit: vi.fn(),
          noValidate: true,
        },
      }}
      draftStatus={(<div>Estado del borrador</div>)}
      notice={null}
      sections={{
        company: {
          empresa: null,
          fechaVisita: undefined,
          modalidad: undefined,
          nitEmpresa: undefined,
          onSelectEmpresa: vi.fn(),
          collapsed: false,
          status: "active",
          sectionRef: companyRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        visit: {
          isDocumentEditable: false,
          register,
          errors,
          collapsed: false,
          status: "disabled",
          sectionRef: visitRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        observations: {
          isDocumentEditable: false,
          register,
          errors,
          observaciones: "",
          getValues,
          setValue,
          collapsed: false,
          status: "disabled",
          sectionRef: observationsRef,
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
        description: "Confirma el envio del acta.",
        loading: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }}
    />
  );
}

describe("SensibilizacionFormPresenter", () => {
  it("renders the long-form shell, sections and confirm dialog", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toContain("Sensibilización");
    expect(html).toContain("ACME SAS");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Banner de lock");
    expect(html).toContain("Empresa");
    expect(html).toContain("Datos de la visita");
    expect(html).toContain("Observaciones");
    expect(html).toContain("Asistentes");
    expect(html).toContain("Finalizar");
    expect(html).toContain("Confirmar envío");
    expect(html).toContain("Confirma el envío del acta.");
  });

  it("renders disabled placeholders before selecting a company", () => {
    const html = renderToStaticMarkup(<PresenterWithoutEmpresaHarness />);

    expect(html).toContain(
      "Selecciona una empresa para habilitar esta sección del documento."
    );
  });
});
