"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  type ArrayPath,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRepeatedPeopleCardTitle,
  getRepeatedPeopleCollapsedStateAfterAppend,
  getRepeatedPeopleCollapsedStateAfterRemove,
  normalizeRestoredRepeatedPeopleRows,
  resolveRepeatedPeopleRowRemoval,
  syncRepeatedPeopleRowOrder,
  syncRepeatedPeopleCollapsedState,
  type RepeatedPeopleConfig,
  type RepeatedPeopleRow,
} from "@/lib/repeatedPeople";
import { hasNestedError } from "@/lib/validationNavigation";

type Props<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
> = {
  control: Control<TValues>;
  errors: FieldErrors<TValues>;
  name: ArrayPath<TValues>;
  config: RepeatedPeopleConfig<TRow>;
  title?: string;
  helperText?: string;
  renderRow: (options: {
    index: number;
    row: TRow;
    cardTitle: string;
    rowKey: string;
  }) => ReactNode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getValueAtPath(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[segment];
  }, value);
}

function getRepeatedPeopleRootErrorMessage(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const rootMessage = isRecord(value.root) ? value.root.message : null;
  if (typeof rootMessage === "string" && rootMessage.trim()) {
    return rootMessage;
  }

  return typeof value.message === "string" && value.message.trim()
    ? value.message
    : null;
}

function getRepeatedPeopleRowError(value: unknown, index: number) {
  if (Array.isArray(value)) {
    return value[index];
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return value[String(index)];
}

function buildRenderedRepeatedPeopleRows<TRow extends RepeatedPeopleRow>({
  fields,
  watchedRows,
  config,
}: {
  fields: Array<Record<string, unknown>>;
  watchedRows: TRow[];
  config: RepeatedPeopleConfig<TRow>;
}) {
  const normalizedWatchedRows = normalizeRestoredRepeatedPeopleRows(
    watchedRows,
    config
  );

  if (fields.length === 0) {
    return normalizedWatchedRows;
  }

  return syncRepeatedPeopleRowOrder(
    fields.map((field, index) => ({
      ...config.createEmptyRow(),
      ...(field as Partial<TRow>),
      ...(normalizedWatchedRows[index] ?? {}),
    })),
    config
  );
}

export function RepeatedPeopleSection<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
>({
  control,
  errors,
  name,
  config,
  title,
  helperText,
  renderRow,
}: Props<TValues, TRow>) {
  const { fields, append, replace } = useFieldArray({
    control,
    name,
  });
  const watchedRows =
    (useWatch({
      control,
      name: name as Path<TValues>,
    }) as TRow[] | undefined) ?? [];
  const rows = buildRenderedRepeatedPeopleRows({
    fields: fields as Array<Record<string, unknown>>,
    watchedRows,
    config,
  });
  const rowCount = rows.length;
  const [collapsedRows, setCollapsedRows] = useState<Record<number, boolean>>({});
  const addButtonHidden =
    typeof config.maxRows === "number" && rowCount >= config.maxRows;
  const repeatedPeopleErrors = getValueAtPath(errors, name);
  const rootErrorMessage = getRepeatedPeopleRootErrorMessage(repeatedPeopleErrors);

  useEffect(() => {
    if (fields.length > 0) {
      return;
    }

    append(config.createEmptyRow() as never);
  }, [append, config, fields.length]);

  useEffect(() => {
    setCollapsedRows((currentState) =>
      syncRepeatedPeopleCollapsedState(currentState, rowCount)
    );
  }, [rowCount]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            {title ?? config.itemLabelPlural}
          </h2>
          {helperText ? (
            <p className="mt-1 text-xs text-gray-500">{helperText}</p>
          ) : null}
        </div>

        {!addButtonHidden ? (
          <button
            type="button"
            data-testid={`${name}-add-button`}
            onClick={() => {
              replace(
                syncRepeatedPeopleRowOrder(
                  [...rows, config.createEmptyRow()],
                  config
                ) as never
              );
              setCollapsedRows((currentState) =>
                getRepeatedPeopleCollapsedStateAfterAppend(
                  currentState,
                  rowCount
                )
              );
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-reca transition-colors hover:text-reca-dark"
          >
            <Plus className="h-4 w-4" />
            Agregar {config.itemLabelSingular.toLocaleLowerCase("es-CO")}
          </button>
        ) : null}
      </div>

      {rootErrorMessage ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {rootErrorMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row, index) => {
          const collapsed = collapsedRows[index] ?? false;
          const rowError = getRepeatedPeopleRowError(repeatedPeopleErrors, index);
          const hasRowLevelError = hasNestedError(rowError);
          const cardTitle = getRepeatedPeopleCardTitle(row, index, config);
          const isSingleVisibleRow = rowCount <= 1;
          const rowKey = fields[index]?.id ?? `${name}-${index}`;

          return (
            <section
              key={rowKey}
              data-testid={`${name}.${index}.card`}
              data-row-index={index}
              data-row-status={hasRowLevelError ? "error" : "idle"}
              data-collapsed={collapsed ? "true" : "false"}
              className={cn(
                "rounded-2xl border bg-gray-50 transition-colors",
                hasRowLevelError ? "border-red-200" : "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {config.itemLabelSingular}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-gray-900">
                    {cardTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`${name}.${index}.collapse-button`}
                    onClick={() =>
                      setCollapsedRows((currentState) => ({
                        ...currentState,
                        [index]: !(currentState[index] ?? false),
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    {collapsed ? (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Expandir
                      </>
                    ) : (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Colapsar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid={`${name}.${index}.remove-button`}
                    onClick={() => {
                      if (resolveRepeatedPeopleRowRemoval(rowCount) === "reset_last") {
                        replace(
                          syncRepeatedPeopleRowOrder(
                            [config.createEmptyRow()],
                            config
                          ) as never
                        );
                        setCollapsedRows({ 0: false });
                        return;
                      }

                      replace(
                        syncRepeatedPeopleRowOrder(
                          rows.filter((_, rowIndex) => rowIndex !== index),
                          config
                        ) as never
                      );
                      setCollapsedRows((currentState) =>
                        getRepeatedPeopleCollapsedStateAfterRemove(
                          currentState,
                          index,
                          rowCount - 1
                        )
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                    aria-label={
                      isSingleVisibleRow
                        ? `Limpiar ${config.itemLabelSingular.toLocaleLowerCase("es-CO")} ${index + 1}`
                        : `Eliminar ${config.itemLabelSingular.toLocaleLowerCase("es-CO")} ${index + 1}`
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isSingleVisibleRow ? "Limpiar" : "Eliminar"}
                  </button>
                </div>
              </div>

              {!collapsed ? (
                <div className="border-t border-gray-200 px-4 py-4">
                  {renderRow({
                    index,
                    row,
                    cardTitle,
                    rowKey,
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
