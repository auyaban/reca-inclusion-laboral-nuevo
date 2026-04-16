"use client";

import { useMemo, useState } from "react";
import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import {
  appendSeleccionAdjustmentHelper,
  appendSeleccionAdjustmentStatements,
  getSeleccionAdjustmentStatementsByHelperId,
  getSeleccionDisabilityProfileLabel,
  getSeleccionDisabilityProfilesFromRows,
  getSeleccionRecommendationHelperPreview,
  getSuggestedSeleccionAdjustmentStatementsByProfiles,
  getUniversalSeleccionAdjustmentStatements,
  groupSeleccionHelpersByCategory,
  groupSeleccionStatementsByCategory,
  type SeleccionAdjustmentStatement,
} from "@/lib/seleccion";
import type { SeleccionValues } from "@/lib/validations/seleccion";
import { SeleccionNarrativeSection } from "./SeleccionNarrativeSection";

type Props = {
  ajustesValue: string;
  notaValue: string;
  oferentes: SeleccionValues["oferentes"];
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  getValues: UseFormGetValues<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
};

type HelperGroup = ReturnType<typeof groupSeleccionHelpersByCategory>[number];
type StatementGroup = ReturnType<typeof groupSeleccionStatementsByCategory>[number];

const DISPLAY_CATEGORY_GROUPS = [
  {
    id: "base_process",
    label: "Proceso base",
    description:
      "Bloques para preparar el proceso, ordenar el contacto y dar contexto desde el inicio.",
    sourceCategoryIds: ["base_process"],
  },
  {
    id: "respectful_treatment",
    label: "Trato y comunicación",
    description:
      "Ayudas sobre lenguaje, sesgos, claridad del proceso y cierre respetuoso.",
    sourceCategoryIds: ["respectful_treatment"],
  },
  {
    id: "interview_accessibility",
    label: "Entrevista y accesibilidad",
    description:
      "Incluye accesibilidad del espacio, formatos alternativos y apoyos de comprensión o lectura.",
    sourceCategoryIds: ["interview_accessibility", "document_accessibility"],
  },
  {
    id: "selection_tests",
    label: "Pruebas de selección",
    description:
      "Recomendaciones sobre pruebas psicotécnicas, entrevistas y alternativas de evaluación.",
    sourceCategoryIds: ["selection_tests"],
  },
  {
    id: "family_context",
    label: "Familia y contexto",
    description:
      "Sugerencias para casos donde el contexto familiar requiere límites o acuerdos claros.",
    sourceCategoryIds: ["family_context"],
  },
] as const;

function applyRecommendationValue({
  currentValue,
  nextValue,
  setValue,
}: {
  currentValue: string;
  nextValue: string;
  setValue: UseFormSetValue<SeleccionValues>;
}) {
  if (currentValue === nextValue) {
    return;
  }

  setValue("ajustes_recomendaciones", nextValue, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
}

function mapHelpersToDisplayGroups(helperGroups: readonly HelperGroup[]) {
  return DISPLAY_CATEGORY_GROUPS.map((displayGroup) => ({
    ...displayGroup,
    items: displayGroup.sourceCategoryIds.flatMap((categoryId) => {
      return (
        helperGroups.find((group) => group.category.id === categoryId)?.items ?? []
      );
    }),
  })).filter((group) => group.items.length > 0);
}

function mapStatementsToDisplayGroups(statementGroups: readonly StatementGroup[]) {
  return DISPLAY_CATEGORY_GROUPS.map((displayGroup) => ({
    ...displayGroup,
    items: displayGroup.sourceCategoryIds.flatMap((categoryId) => {
      return (
        statementGroups.find((group) => group.category.id === categoryId)?.items ?? []
      );
    }),
  })).filter((group) => group.items.length > 0);
}

function RecommendationActionCard({
  title,
  summary,
  badge,
  preview,
  details,
  addLabel,
  dataTestId,
  onAdd,
}: {
  title: string;
  summary: string;
  badge: string;
  preview?: string;
  details?: readonly string[];
  addLabel: string;
  dataTestId: string;
  onAdd: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExtraContent = Boolean(preview || (details && details.length > 0));

  return (
    <article
      data-testid={dataTestId}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex rounded-full bg-reca-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-reca">
            {badge}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{summary}</p>
          </div>
        </div>

        <button
          type="button"
          data-testid={`${dataTestId}-add`}
          onClick={onAdd}
          className="rounded-full border border-reca-200 bg-white px-3 py-1.5 text-xs font-semibold text-reca transition-colors hover:border-reca-300 hover:bg-reca-50"
        >
          {addLabel}
        </button>
      </div>

      {hasExtraContent ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            data-testid={`${dataTestId}-details-toggle`}
            onClick={() => setIsExpanded((current) => !current)}
            className="text-xs font-semibold text-gray-700 underline-offset-2 transition hover:text-gray-900 hover:underline"
          >
            {isExpanded ? "Ocultar contenido" : "Ver contenido"}
          </button>

          {isExpanded ? (
            <div
              data-testid={`${dataTestId}-details-panel`}
              className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
            >
              {preview ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Que trae este bloque
                  </p>
                  <p className="text-xs leading-relaxed text-gray-600">{preview}</p>
                </div>
              ) : null}

              {details && details.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Incluye
                  </p>
                  <ul className="space-y-1 text-xs leading-relaxed text-gray-600">
                    {details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StatementDisplayGroupSection({
  title,
  helperText,
  groups,
  dataTestIdBase,
  onAddStatement,
}: {
  title: string;
  helperText: string;
  groups: ReturnType<typeof mapStatementsToDisplayGroups>;
  dataTestIdBase: string;
  onAddStatement: (statement: SeleccionAdjustmentStatement) => void;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section data-testid={dataTestIdBase} className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      </div>

      {groups.map((group) => (
        <div
          key={group.id}
          data-testid={`${dataTestIdBase}-category-${group.id}`}
          className="space-y-3"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {group.label}
            </p>
            <p className="mt-1 text-xs text-gray-500">{group.description}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {group.items.map((statement) => (
              <RecommendationActionCard
                key={statement.id}
                title={statement.title}
                summary={statement.summary}
                badge={group.label}
                preview={statement.body}
                addLabel="Agregar ajuste"
                dataTestId={`${dataTestIdBase}-${statement.id}`}
                onAdd={() => onAddStatement(statement)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function SeleccionRecommendationsSection({
  ajustesValue,
  notaValue,
  oferentes,
  register,
  errors,
  getValues,
  setValue,
}: Props) {
  const helperGroups = useMemo(
    () => mapHelpersToDisplayGroups(groupSeleccionHelpersByCategory()),
    []
  );
  const detectedProfiles = useMemo(
    () => getSeleccionDisabilityProfilesFromRows(oferentes),
    [oferentes]
  );
  const universalStatements = useMemo(
    () => getUniversalSeleccionAdjustmentStatements(),
    []
  );
  const suggestedStatements = useMemo(
    () => getSuggestedSeleccionAdjustmentStatementsByProfiles(detectedProfiles),
    [detectedProfiles]
  );
  const universalGroups = useMemo(
    () => mapStatementsToDisplayGroups(groupSeleccionStatementsByCategory(universalStatements)),
    [universalStatements]
  );
  const suggestedGroups = useMemo(
    () => mapStatementsToDisplayGroups(groupSeleccionStatementsByCategory(suggestedStatements)),
    [suggestedStatements]
  );

  return (
    <div className="space-y-6">
      <section
        data-testid="seleccion-recommendations-quick-blocks"
        className="space-y-5 rounded-3xl border border-reca-100 bg-reca-50 p-5"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Bloques rápidos</p>
            <p className="mt-1 text-xs text-gray-500">
              Empieza con un bloque amplio, revisa su contenido y úsalo como base
              para construir los ajustes razonables del caso.
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-reca-100 bg-white/80 p-3 text-xs text-gray-600 md:grid-cols-3">
            <p>
              <span className="font-semibold text-gray-900">1.</span> Agrega un
              bloque que te ahorre escritura inicial.
            </p>
            <p>
              <span className="font-semibold text-gray-900">2.</span> Complementa
              con sugerencias universales o por discapacidad.
            </p>
            <p>
              <span className="font-semibold text-gray-900">3.</span> Ajusta el
              texto final según la persona y el cargo.
            </p>
          </div>
        </div>

        <div
          data-testid="seleccion-recommendations-helpers"
          className="space-y-5"
        >
          {helperGroups.map((group) => (
            <div
              key={group.id}
              data-testid={`seleccion-helper-category-${group.id}`}
              className="space-y-3"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-reca">
                  {group.label}
                </p>
                <p className="mt-1 text-xs text-gray-500">{group.description}</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {group.items.map((helper) => (
                  <RecommendationActionCard
                    key={helper.id}
                    title={helper.label}
                    summary={helper.description}
                    badge={group.label}
                    preview={getSeleccionRecommendationHelperPreview(helper)}
                    details={getSeleccionAdjustmentStatementsByHelperId(helper.id).map(
                      (statement) => statement.title
                    )}
                    addLabel="Agregar bloque"
                    dataTestId={`seleccion-helper-${helper.id}`}
                    onAdd={() => {
                      const currentValue = getValues("ajustes_recomendaciones");
                      const nextValue = appendSeleccionAdjustmentHelper(
                        currentValue,
                        helper.id
                      );

                      applyRecommendationValue({
                        currentValue,
                        nextValue,
                        setValue,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-testid="seleccion-recommendations-library"
        className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Sugerencias para esta persona
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Estas ayudas toman como referencia la discapacidad diligenciada en
              los oferentes. Primero verás ajustes universales y luego los que
              son más pertinentes para este caso.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {detectedProfiles.length > 0 ? (
              detectedProfiles.map((profile) => (
                <span
                  key={profile}
                  data-testid={`seleccion-detected-profile-${profile}`}
                  className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                >
                  {getSeleccionDisabilityProfileLabel(profile)}
                </span>
              ))
            ) : (
              <span
                data-testid="seleccion-recommendations-empty-profile-state"
                className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
              >
                Aún no hay una discapacidad detectada. Puedes empezar por los
                ajustes universales.
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="seleccion-universal-adjustments-add-all"
              onClick={() => {
                const currentValue = getValues("ajustes_recomendaciones");
                const nextValue = appendSeleccionAdjustmentStatements(
                  currentValue,
                  universalStatements.map((statement) => statement.id)
                );

                applyRecommendationValue({
                  currentValue,
                  nextValue,
                  setValue,
                });
              }}
              className="rounded-full border border-reca-200 bg-white px-3 py-1.5 text-xs font-semibold text-reca transition-colors hover:border-reca-300 hover:bg-reca-50"
            >
              Agregar base general
            </button>

            {suggestedStatements.length > 0 ? (
              <button
                type="button"
                data-testid="seleccion-profile-adjustments-add-all"
                onClick={() => {
                  const currentValue = getValues("ajustes_recomendaciones");
                  const nextValue = appendSeleccionAdjustmentStatements(
                    currentValue,
                    suggestedStatements.map((statement) => statement.id)
                  );

                  applyRecommendationValue({
                    currentValue,
                    nextValue,
                    setValue,
                  });
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Agregar sugeridas para esta persona
              </button>
            ) : null}
          </div>
        </div>

        <StatementDisplayGroupSection
          title="Universales"
          helperText="Sirven como una base segura para la mayoría de entrevistas y procesos."
          groups={universalGroups}
          dataTestIdBase="seleccion-universal-adjustments"
          onAddStatement={(statement) => {
            const currentValue = getValues("ajustes_recomendaciones");
            const nextValue = appendSeleccionAdjustmentStatements(currentValue, [
              statement.id,
            ]);

            applyRecommendationValue({
              currentValue,
              nextValue,
              setValue,
            });
          }}
        />

        {detectedProfiles.length > 0 ? (
          <StatementDisplayGroupSection
            title="Sugeridas según la discapacidad detectada"
            helperText="Se calculan con los oferentes actuales y excluyen recomendaciones que no correspondan."
            groups={suggestedGroups}
            dataTestIdBase="seleccion-profile-adjustments"
            onAddStatement={(statement) => {
              const currentValue = getValues("ajustes_recomendaciones");
              const nextValue = appendSeleccionAdjustmentStatements(currentValue, [
                statement.id,
              ]);

              applyRecommendationValue({
                currentValue,
                nextValue,
                setValue,
              });
            }}
          />
        ) : null}
      </section>

      <section
        data-testid="seleccion-recommendations-editor"
        className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Texto final de ajustes
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Aquí consolidas el texto final. Puedes dejar lo que agregaste desde
            bloques y sugerencias, editarlo o completarlo manualmente según el
            caso.
          </p>
        </div>

        <SeleccionNarrativeSection
          fieldName="ajustes_recomendaciones"
          label="Ajustes y recomendaciones"
          required
          placeholder="Consolida las recomendaciones, compromisos y ajustes razonables sugeridos para el proceso de selección."
          value={ajustesValue}
          register={register}
          errors={errors}
          getValues={getValues}
          setValue={setValue}
        />
      </section>

      <SeleccionNarrativeSection
        fieldName="nota"
        label="Nota"
        placeholder="Agrega una nota final de cierre si necesitas dejar contexto adicional del proceso de selección."
        value={notaValue}
        register={register}
        errors={errors}
        getValues={getValues}
        setValue={setValue}
        minHeightClassName="min-h-[8rem]"
      />
    </div>
  );
}
