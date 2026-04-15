import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { PresentacionFormPresenter } from "@/components/forms/presentacion/PresentacionFormPresenter";
import { getDefaultPresentacionValues } from "@/lib/presentacion";
import type { Empresa } from "@/lib/store/empresaStore";
import type { PresentacionValues } from "@/lib/validations/presentacion";

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
  const motivationRef = useRef<HTMLElement | null>(null);
  const agreementsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<PresentacionValues>({
    defaultValues: getDefaultPresentacionValues(empresa),
  });

  return (
    <PresentacionFormPresenter
      shell={{
        title: "Presentación / Reactivación del Programa",
        companyName: empresa.nombre_empresa,
        onBack: vi.fn(),
        navItems: [
          { id: "company", label: "Empresa", status: "active" },
          { id: "visit", label: "Datos de la visita", status: "idle" },
        ],
        activeSectionId: "company",
        onSectionSelect: vi.fn(),
        serverError: "Error de prueba",
        submitAction: (<button type="button">Finalizar</button>),
      }}
      draftStatus={(<div>Estado del borrador</div>)}
      notice={(<div>Banner de lock</div>)}
      sections={{
        company: {
          empresa,
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
        motivation: {
          isDocumentEditable: true,
          register,
          errors,
          motivacion: [],
          collapsed: false,
          status: "idle",
          sectionRef: motivationRef,
          onToggle: vi.fn(),
          onFocusCapture: vi.fn(),
        },
        agreements: {
          isDocumentEditable: true,
          register,
          errors,
          acuerdos: "",
          getValues,
          setValue,
          collapsed: false,
          status: "idle",
          sectionRef: agreementsRef,
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

describe("PresentacionFormPresenter", () => {
  it("renders the long-form shell, sections and confirm dialog", () => {
    const html = renderToStaticMarkup(<PresenterHarness />);

    expect(html).toContain("Presentación / Reactivación del Programa");
    expect(html).toContain("ACME SAS");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Banner de lock");
    expect(html).toContain("Empresa");
    expect(html).toContain("Datos de la visita");
    expect(html).toContain("Motivación");
    expect(html).toContain("Acuerdos y observaciones");
    expect(html).toContain("Asistentes");
    expect(html).toContain("Finalizar");
    expect(html).toContain("Confirmar envío");
    expect(html).toContain("Confirma el envío del acta.");
  });
});
