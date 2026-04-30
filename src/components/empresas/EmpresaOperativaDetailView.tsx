import type { ReactNode } from "react";
import {
  BackofficeBadge,
  BackofficePageHeader,
  BackofficeSectionCard,
} from "@/components/backoffice";
import EmpresaOperativaActions from "@/components/empresas/EmpresaOperativaActions";
import type {
  EmpresaEventoOperativoItem,
  EmpresaOperativaDetail,
} from "@/lib/empresas/lifecycle-queries";

type EmpresaOperativaDetailViewProps = {
  empresa: EmpresaOperativaDetail;
  notes: EmpresaEventoOperativoItem[];
  recentEvents: EmpresaEventoOperativoItem[];
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function estadoTone(value: string | null) {
  if (value === "Activa") {
    return "success" as const;
  }
  if (value === "En Proceso" || value === "Pausada") {
    return "warning" as const;
  }
  if (value === "Cerrada" || value === "Inactiva") {
    return "neutral" as const;
  }
  return "info" as const;
}

function assignmentLabel(value: EmpresaOperativaDetail["assignmentStatus"]) {
  if (value === "tuya") {
    return "Tuya";
  }
  if (value === "libre") {
    return "Libre";
  }
  return "Asignada";
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-gray-600">{label}</dt>
      <dd className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
        {value ? String(value) : "-"}
      </dd>
    </div>
  );
}

function EventList({
  items,
  empty,
}: {
  items: EmpresaEventoOperativoItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm font-semibold text-gray-700">{empty}</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="border-l-2 border-reca-200 pl-4">
          <p className="text-sm font-bold text-gray-900">{item.resumen}</p>
          <p className="mt-1 text-sm text-gray-700">{item.detalle}</p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            {item.actorNombre ?? "Sistema"} · {formatDateTime(item.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <summary className="cursor-pointer text-base font-bold text-gray-900">
        {title}
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

export default function EmpresaOperativaDetailView({
  empresa,
  notes,
  recentEvents,
}: EmpresaOperativaDetailViewProps) {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Detalle de empresa"
        title={empresa.nombreEmpresa ?? "Empresa sin nombre"}
        description="Vista read-only para seguimiento profesional. Los datos maestros sólo los modifica gerencia."
        action={
          <div className="flex flex-wrap gap-2">
            <BackofficeBadge tone={estadoTone(empresa.estado)}>
              {empresa.estado ?? "Sin estado"}
            </BackofficeBadge>
            <BackofficeBadge tone={empresa.assignmentStatus === "tuya" ? "success" : "info"}>
              {assignmentLabel(empresa.assignmentStatus)}
            </BackofficeBadge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <BackofficeSectionCard title="Datos principales">
            <dl className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="NIT" value={empresa.nitEmpresa} />
              <ReadOnlyField label="Ciudad" value={empresa.ciudadEmpresa} />
              <ReadOnlyField label="Dirección" value={empresa.direccionEmpresa} />
              <ReadOnlyField label="Sede" value={empresa.sedeEmpresa} />
              <ReadOnlyField label="Gestión" value={empresa.gestion} />
              <ReadOnlyField
                label="Último formato"
                value={
                  empresa.ultimoFormatoNombre
                    ? `${empresa.ultimoFormatoNombre} · ${formatDateTime(
                        empresa.ultimoFormatoAt
                      )}`
                    : "Sin formatos"
                }
              />
            </dl>
          </BackofficeSectionCard>

          <BackofficeSectionCard title="Notas">
            <EventList items={notes} empty="Aún no hay notas explícitas." />
          </BackofficeSectionCard>

          <CollapsibleSection title="Contactos">
            <div className="grid gap-3">
              {empresa.contactos.length > 0 ? (
                empresa.contactos.map((contact, index) => (
                  <dl
                    key={`${contact.nombre ?? "contacto"}-${index}`}
                    className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-4"
                  >
                    <ReadOnlyField label="Nombre" value={contact.nombre} />
                    <ReadOnlyField label="Cargo" value={contact.cargo} />
                    <ReadOnlyField label="Teléfono" value={contact.telefono} />
                    <ReadOnlyField label="Correo" value={contact.correo} />
                  </dl>
                ))
              ) : (
                <p className="text-sm font-semibold text-gray-700">
                  No hay contactos registrados.
                </p>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Compensar">
            <dl className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="Caja de compensación" value={empresa.cajaCompensacion} />
              <ReadOnlyField label="Zona Compensar" value={empresa.zonaEmpresa} />
              <ReadOnlyField label="Asesor" value={empresa.asesor} />
              <ReadOnlyField label="Correo asesor" value={empresa.correoAsesor} />
              <ReadOnlyField label="Profesional asignado" value={empresa.profesionalAsignado} />
              <ReadOnlyField label="Correo profesional" value={empresa.correoProfesional} />
            </dl>
          </CollapsibleSection>

          <CollapsibleSection title="Observaciones">
            <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-gray-800">
              {empresa.observaciones || empresa.comentariosEmpresas || "Sin observaciones."}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Bitácora reciente">
            <EventList
              items={recentEvents}
              empty="Aún no hay eventos recientes para esta empresa."
            />
          </CollapsibleSection>
        </div>

        <EmpresaOperativaActions
          empresaId={empresa.id}
          assignmentStatus={empresa.assignmentStatus}
        />
      </div>
    </main>
  );
}
