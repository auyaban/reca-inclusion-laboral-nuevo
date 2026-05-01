import type { ReactNode } from "react";
import {
  BackofficeBadge,
  BackofficeSectionCard,
} from "@/components/backoffice";
import LifecycleCollapsible from "@/components/empresas/LifecycleCollapsible";
import type {
  EmpresaLifecycleCompanyType,
  EmpresaLifecycleEvidenceSummary,
  EmpresaLifecyclePersonBranch,
  EmpresaLifecycleProfileBranch,
  EmpresaLifecycleTree,
  EmpresaLifecycleWarning,
  EmpresaLifecycleWarningCode,
} from "@/lib/empresas/lifecycle-tree";
import { cn } from "@/lib/utils";

const COMPANY_TYPE_LABELS: Record<EmpresaLifecycleCompanyType, string> = {
  compensar: "Compensar",
  no_compensar: "No Compensar",
  unknown: "Sin clasificar",
};

const PERSON_STATUS_LABELS: Record<EmpresaLifecyclePersonBranch["status"], string> = {
  seleccionada: "Seleccionada",
  contratada: "Contratada",
  en_seguimiento: "En seguimiento",
  archivada: "Archivada",
};

const WARNING_COPY: Record<EmpresaLifecycleWarningCode, string> = {
  unknown_company_type:
    "No se pudo identificar si la empresa es Compensar o No Compensar.",
  evidence_limit_reached:
    "La vista puede estar incompleta porque se alcanzó el límite seguro de evidencias; requiere revisión técnica.",
  matched_by_name_fallback:
    "Esta evidencia se asoció por nombre porque no tenía NIT confiable.",
  missing_company_key:
    "Hay evidencia sin NIT ni nombre de empresa confiable.",
  missing_date:
    "Hay evidencia sin fecha operativa confiable.",
  missing_profile:
    "Hay condiciones de vacante sin cargo objetivo.",
  missing_person_key:
    "Hay evidencia de persona sin cédula confiable.",
  contract_without_selection:
    "Hay una contratación sin selección previa detectada.",
  unclassified_format:
    "Hay un formato fuera del ciclo de vida inicial.",
};

function safeHttpHref(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(parsed);
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-4 py-3 shadow-sm",
        tone === "warning" && value > 0
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function EmptyInline({
  children = "Sin registros para mostrar.",
}: {
  children?: ReactNode;
}) {
  return (
    <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {children}
    </p>
  );
}

function TimelineLane({ children }: { children: ReactNode }) {
  return (
    <div className="relative space-y-4 pl-7 sm:pl-9">
      <div
        aria-hidden="true"
        className="absolute left-3 top-2 h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-reca-300 via-gray-200 to-gray-100 sm:left-4"
      />
      {children}
    </div>
  );
}

function TimelinePoint({
  tone = "reca",
}: {
  tone?: "reca" | "info" | "warning" | "neutral";
}) {
  const toneClassName = {
    reca: "bg-reca",
    info: "bg-sky-600",
    warning: "bg-amber-500",
    neutral: "bg-gray-400",
  }[tone];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -left-[1.62rem] top-4 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm sm:-left-[2.1rem]",
        toneClassName
      )}
    />
  );
}

function TimelineStep({
  children,
  tone = "reca",
}: {
  children: ReactNode;
  tone?: "reca" | "info" | "warning" | "neutral";
}) {
  return (
    <div className="relative">
      <TimelinePoint tone={tone} />
      {children}
    </div>
  );
}

function LifecycleTimelineNode({
  title,
  latestAt,
  count,
  children,
}: {
  title: string;
  latestAt: string | null;
  count: number;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm text-gray-700">
            Última evidencia: {formatDisplayDate(latestAt)}
          </p>
        </div>
        <BackofficeBadge tone="info">
          {count} evidencia{count === 1 ? "" : "s"}
        </BackofficeBadge>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function EvidenceLinks({ evidence }: { evidence: EmpresaLifecycleEvidenceSummary }) {
  const pdfLink = safeHttpHref(evidence.pdfLink);
  const sheetLink = safeHttpHref(evidence.sheetLink);
  const linkLabel = evidence.sourceFormat ?? evidence.label;

  if (!pdfLink && !sheetLink) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {pdfLink ? (
        <a
          aria-label={`Abrir PDF de ${linkLabel}`}
          className="text-sm font-bold text-reca underline-offset-4 hover:underline"
          href={pdfLink}
          rel="noreferrer noopener"
          target="_blank"
        >
          PDF
        </a>
      ) : null}
      {sheetLink ? (
        <a
          aria-label={`Abrir hoja de ${linkLabel}`}
          className="text-sm font-bold text-reca underline-offset-4 hover:underline"
          href={sheetLink}
          rel="noreferrer noopener"
          target="_blank"
        >
          Hoja
        </a>
      ) : null}
    </div>
  );
}

function EvidenceItem({ evidence }: { evidence: EmpresaLifecycleEvidenceSummary }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold text-gray-950">
            {evidence.sourceFormat ?? evidence.label}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {evidence.label} · {formatDisplayDate(evidence.date)}
          </p>
          {evidence.professionalName ? (
            <p className="mt-1 text-sm text-gray-700">
              Profesional: {evidence.professionalName}
            </p>
          ) : null}
          {evidence.actaRef ? (
            <p className="mt-1 text-sm text-gray-700">Acta: {evidence.actaRef}</p>
          ) : null}
          <EvidenceLinks evidence={evidence} />
        </div>
        <BackofficeBadge tone="neutral">{evidence.type}</BackofficeBadge>
      </div>
      {evidence.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-amber-900">
          {evidence.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function EvidenceList({
  evidence,
  empty,
}: {
  evidence: EmpresaLifecycleEvidenceSummary[];
  empty?: ReactNode;
}) {
  if (evidence.length === 0) {
    return <EmptyInline>{empty}</EmptyInline>;
  }

  return (
    <ul className="space-y-3">
      {evidence.map((item) => (
        <EvidenceItem evidence={item} key={item.id} />
      ))}
    </ul>
  );
}

function PersonBranch({ person }: { person: EmpresaLifecyclePersonBranch }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-bold text-gray-950">{person.nombre ?? "Sin nombre"}</h4>
          <p className="mt-1 text-sm text-gray-700">CC {person.cedula}</p>
          {person.cargo ? (
            <p className="mt-1 text-sm text-gray-700">Cargo: {person.cargo}</p>
          ) : null}
        </div>
        <BackofficeBadge
          tone={person.status === "archivada" ? "warning" : "success"}
        >
          {PERSON_STATUS_LABELS[person.status]}
        </BackofficeBadge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="text-sm text-gray-700">
          Selección: {formatDisplayDate(person.selectedAt)}
        </p>
        <p className="text-sm text-gray-700">
          Contratación: {formatDisplayDate(person.contractedAt)}
        </p>
      </div>
      {person.evidence.length > 0 ? (
        <div className="mt-4 border-l-2 border-sky-100 pl-3">
          <p className="mb-2 text-sm font-bold text-gray-900">Evidencia</p>
          <EvidenceList evidence={person.evidence} />
        </div>
      ) : null}
      {person.seguimientos.length > 0 ? (
        <div className="mt-4 border-l-2 border-reca-100 pl-3">
          <p className="mb-2 text-sm font-bold text-gray-900">Seguimientos</p>
          <EvidenceList evidence={person.seguimientos} />
        </div>
      ) : null}
      {person.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-amber-900">
          {person.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ProfileBranch({ profile }: { profile: EmpresaLifecycleProfileBranch }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-950">{profile.cargo}</h3>
          <p className="mt-1 text-sm text-gray-700">
            Última evidencia: {formatDisplayDate(profile.latestAt)}
          </p>
        </div>
        <BackofficeBadge tone="info">
          {profile.people.length} persona{profile.people.length === 1 ? "" : "s"}
        </BackofficeBadge>
      </div>
      <div className="mt-4 border-l-2 border-reca-100 pl-3">
        <p className="mb-2 text-sm font-bold text-gray-900">Perfil</p>
        <EvidenceList evidence={profile.evidence} />
      </div>
      <div className="mt-4 space-y-3 border-l-2 border-sky-100 pl-3">
        <p className="text-sm font-bold text-gray-900">Personas relacionadas</p>
        {profile.people.length > 0 ? (
          profile.people.map((person) => (
            <PersonBranch key={person.cedula} person={person} />
          ))
        ) : (
          <EmptyInline>
            Este perfil aún no tiene personas relacionadas con seguridad.
          </EmptyInline>
        )}
      </div>
    </article>
  );
}

function WarningItem({ warning }: { warning: EmpresaLifecycleWarning }) {
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <p>{WARNING_COPY[warning.code]}</p>
      {warning.evidenceId ? (
        <p className="mt-1 text-amber-900">Evidencia: {warning.evidenceId}</p>
      ) : null}
    </li>
  );
}

function hasLifecycleEvidence(tree: EmpresaLifecycleTree) {
  return (
    tree.companyStages.length > 0 ||
    tree.profileBranches.length > 0 ||
    tree.peopleWithoutProfile.length > 0 ||
    tree.archivedBranches.length > 0 ||
    tree.unclassifiedEvidence.length > 0
  );
}

export default function EmpresaLifecycleTreeView({
  tree,
}: {
  tree: EmpresaLifecycleTree;
}) {
  const companyTypeLabel = COMPANY_TYPE_LABELS[tree.empresa.companyType];

  return (
    <div className="space-y-6">
      <BackofficeSectionCard
        title={tree.empresa.nombreEmpresa ?? "Empresa sin nombre"}
        description="Ciclo de vida read-only construido desde evidencia finalizada."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <BackofficeBadge tone="neutral">
              NIT {tree.empresa.nitEmpresa ?? "Sin NIT"}
            </BackofficeBadge>
            <BackofficeBadge tone={tree.empresa.companyType === "unknown" ? "warning" : "reca"}>
              {companyTypeLabel}
            </BackofficeBadge>
          </div>
          <p className="text-sm text-gray-700">
            Generado: {formatDisplayDate(tree.generatedAt)}
          </p>
        </div>
      </BackofficeSectionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Etapas de empresa" value={tree.summary.companyStages} />
        <SummaryCard label="Perfiles" value={tree.summary.profiles} />
        <SummaryCard label="Personas" value={tree.summary.people} />
        <SummaryCard label="Archivadas" value={tree.summary.archivedBranches} />
        <SummaryCard
          label="Evidencia sin clasificar"
          tone="warning"
          value={tree.summary.unclassifiedEvidence}
        />
        <SummaryCard
          label="Alertas de calidad"
          tone="warning"
          value={tree.summary.dataQualityWarnings}
        />
      </div>

      {!hasLifecycleEvidence(tree) ? (
        <BackofficeSectionCard accent="gray">
          <p className="text-sm font-bold text-gray-800">
            Aún no hay evidencia finalizada para construir el ciclo de vida.
          </p>
        </BackofficeSectionCard>
      ) : null}

      <section
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        data-testid="lifecycle-timeline"
      >
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-reca">
            Recorrido operativo
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-950">
            Ciclo de vida de la empresa
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            Lee de arriba hacia abajo: primero las etapas de empresa, luego los
            perfiles y personas relacionadas.
          </p>
        </div>

        <TimelineLane>
          <TimelineStep>
            <LifecycleCollapsible
              count={tree.companyStages.length}
              defaultOpen
              description="Etapas transversales asociadas a la empresa."
              testId="lifecycle-company-stages"
              title="Etapas de empresa"
              variant="timeline"
            >
              {tree.companyStages.length > 0 ? (
                <div className="space-y-4">
                  {tree.companyStages.map((stage) => (
                    <LifecycleTimelineNode
                      count={stage.evidence.length}
                      key={stage.type}
                      latestAt={stage.latestAt}
                      title={stage.label}
                    >
                      <EvidenceList evidence={stage.evidence} />
                    </LifecycleTimelineNode>
                  ))}
                </div>
              ) : (
                <EmptyInline>Sin etapas de empresa.</EmptyInline>
              )}
            </LifecycleCollapsible>
          </TimelineStep>

          <TimelineStep tone="info">
            <LifecycleCollapsible
              count={tree.profileBranches.length}
              defaultOpen
              description="Ramas por cargo y personas vinculadas con seguridad."
              testId="lifecycle-profiles"
              title="Perfiles y personas"
              variant="timeline"
            >
              {tree.profileBranches.length > 0 ? (
                <div className="space-y-4">
                  {tree.profileBranches.map((profile) => (
                    <ProfileBranch key={profile.id} profile={profile} />
                  ))}
                </div>
              ) : (
                <EmptyInline>Sin perfiles construidos.</EmptyInline>
              )}
            </LifecycleCollapsible>
          </TimelineStep>
        </TimelineLane>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Excepciones y calidad de datos
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Esta evidencia queda visible, pero separada del flujo principal para
            no mezclar datos ambiguos con ramas confiables.
          </p>
        </div>

        <LifecycleCollapsible
          count={tree.peopleWithoutProfile.length}
          testId="lifecycle-people-without-profile"
          title="Personas sin perfil"
          tone="warning"
          variant="subtle"
        >
          {tree.peopleWithoutProfile.length > 0 ? (
            <div className="space-y-3">
              {tree.peopleWithoutProfile.map((person) => (
                <PersonBranch key={person.cedula} person={person} />
              ))}
            </div>
          ) : (
            <EmptyInline>Sin personas pendientes por perfil.</EmptyInline>
          )}
        </LifecycleCollapsible>

        <LifecycleCollapsible
          count={tree.archivedBranches.length}
          testId="lifecycle-archived-branches"
          title="Ramas archivadas"
          tone="neutral"
          variant="subtle"
        >
          {tree.archivedBranches.length > 0 ? (
            <div className="space-y-3">
              {tree.archivedBranches.map((person) => (
                <PersonBranch key={person.cedula} person={person} />
              ))}
            </div>
          ) : (
            <EmptyInline>Sin ramas archivadas.</EmptyInline>
          )}
        </LifecycleCollapsible>

        <LifecycleCollapsible
          count={tree.unclassifiedEvidence.length}
          testId="lifecycle-unclassified-evidence"
          title="Evidencia sin clasificar"
          tone="warning"
          variant="subtle"
        >
          <EvidenceList
            empty="Sin evidencia fuera del ciclo inicial."
            evidence={tree.unclassifiedEvidence}
          />
        </LifecycleCollapsible>

        <LifecycleCollapsible
          count={tree.dataQualityWarnings.length}
          defaultOpen={tree.dataQualityWarnings.length > 0}
          testId="lifecycle-quality-warnings"
          title="Alertas de calidad"
          tone={tree.dataQualityWarnings.length > 0 ? "warning" : "neutral"}
          variant="subtle"
        >
          {tree.dataQualityWarnings.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {tree.dataQualityWarnings.map((warning, index) => (
                <WarningItem
                  key={`${warning.code}:${warning.evidenceId ?? index}`}
                  warning={warning}
                />
              ))}
            </ul>
          ) : (
            <EmptyInline>Sin alertas de calidad.</EmptyInline>
          )}
        </LifecycleCollapsible>
      </section>
    </div>
  );
}
