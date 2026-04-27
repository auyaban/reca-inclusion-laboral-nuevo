"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  type ArrayPath,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFieldArrayReplace,
  type UseFieldArrayUpdate,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createRepeatedPeopleRowForInsert,
  getRepeatedPeopleCardSubtitle,
  getRepeatedPeopleCardTitle,
  getRepeatedPeopleCollapsedStateAfterAppend,
  getRepeatedPeopleCollapsedStateAfterRemove,
  resolveRepeatedPeopleRowRemoval,
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
  createRowForAppend?: (index: number) => TRow;
  renderRow: (options: {
    index: number;
    row: TRow;
    cardTitle: string;
    rowKey: string;
  }) => ReactNode;
};

type RenderRowOptions<TRow extends RepeatedPeopleRow> = {
  index: number;
  row: TRow;
  cardTitle: string;
  rowKey: string;
};

type RenderRowCallback<TRow extends RepeatedPeopleRow> = (
  options: RenderRowOptions<TRow>
) => ReactNode;

type RenderRowStore<TRow extends RepeatedPeopleRow> = {
  current: RenderRowCallback<TRow>;
  version: number;
  listeners: Set<() => void>;
};

type MemoizedSectionProps<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
> = Omit<Props<TValues, TRow>, "renderRow"> & {
  renderRowStoreRef: { current: RenderRowStore<TRow> };
};

type RowCardProps<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
> = {
  control: Control<TValues>;
  name: ArrayPath<TValues>;
  index: number;
  rowCount: number;
  rowKey: string;
  config: RepeatedPeopleConfig<TRow>;
  collapsed: boolean;
  setCollapsedRows: Dispatch<SetStateAction<Record<number, boolean>>>;
  remove: (index: number) => void;
  replace: UseFieldArrayReplace<TValues, ArrayPath<TValues>>;
  update: UseFieldArrayUpdate<TValues, ArrayPath<TValues>>;
  rowErrors: unknown;
  renderRowStoreRef: { current: RenderRowStore<TRow> };
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

function RepeatedPeopleRowCardInner<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
>({
  control,
  name,
  index,
  rowCount,
  rowKey,
  config,
  collapsed,
  setCollapsedRows,
  remove,
  replace,
  update,
  rowErrors,
  renderRowStoreRef,
}: RowCardProps<TValues, TRow>) {
  const rowPath = `${name}.${index}` as Path<TValues>;
  const watchedRow =
    (useWatch({
      control,
      name: rowPath,
    }) as TRow | undefined) ?? null;

  const row = {
    ...config.createEmptyRow(),
    ...(watchedRow ?? {}),
  } as TRow;
  const cardTitle = getRepeatedPeopleCardTitle(row, index, config);
  const cardSubtitle = getRepeatedPeopleCardSubtitle(row, index, config);
  const rowError = getValueAtPath(rowErrors, String(index));
  const hasRowLevelError = hasNestedError(rowError);
  const isSingleVisibleRow = rowCount <= 1;
  const renderRow = useSyncExternalStore(
    (listener) => {
      renderRowStoreRef.current.listeners.add(listener);
      return () => {
        renderRowStoreRef.current.listeners.delete(listener);
      };
    },
    () => renderRowStoreRef.current.current,
    () => renderRowStoreRef.current.current
  );

  useEffect(() => {
    if (!config.orderField) {
      return;
    }

    const nextRow = {
      ...config.createEmptyRow(),
      ...(watchedRow ?? {}),
    } as TRow;
    const expectedOrder = String(index + 1);
    const nextCurrentOrder = String(nextRow[config.orderField] ?? "");
    if (nextCurrentOrder === expectedOrder) {
      return;
    }

    const nextUpdatedRow = {
      ...nextRow,
      [config.orderField]: expectedOrder,
    } as Parameters<typeof update>[1];

    update(index, nextUpdatedRow);
  }, [config, index, update, watchedRow]);

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
          {cardSubtitle ? (
            <p className="mt-1 text-xs text-gray-500">{cardSubtitle}</p>
          ) : null}
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
                const resetRows = [
                  createRepeatedPeopleRowForInsert(config, 0),
                ] as Parameters<typeof replace>[0];
                replace(resetRows);
                setCollapsedRows({ 0: false });
                return;
              }

              remove(index);
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
}

const RepeatedPeopleRowCard = memo(RepeatedPeopleRowCardInner) as typeof RepeatedPeopleRowCardInner;

function RepeatedPeopleSectionInner<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
>({
  control,
  errors,
  name,
  config,
  title,
  helperText,
  createRowForAppend,
  renderRowStoreRef,
}: MemoizedSectionProps<TValues, TRow>) {
  const { fields, append, remove, replace, update } = useFieldArray({
    control,
    name,
  });
  const [collapsedRows, setCollapsedRows] = useState<Record<number, boolean>>({});
  const rowCount = fields.length;
  const addButtonHidden =
    typeof config.maxRows === "number" && rowCount >= config.maxRows;
  const repeatedPeopleErrors = getValueAtPath(errors, name);
  const rootErrorMessage = getRepeatedPeopleRootErrorMessage(repeatedPeopleErrors);
  const addButtonLabel = `Agregar ${config.itemLabelSingular.toLocaleLowerCase("es-CO")}`;

  const handleAddRow = () => {
    const nextRow =
      createRowForAppend?.(rowCount) ??
      createRepeatedPeopleRowForInsert(config, rowCount);
    append(nextRow as never);
    setCollapsedRows((currentState) =>
      getRepeatedPeopleCollapsedStateAfterAppend(currentState, rowCount)
    );
  };

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
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-sm font-semibold text-reca transition-colors hover:text-reca-dark"
          >
            <Plus className="h-4 w-4" />
            {addButtonLabel}
          </button>
        ) : null}
      </div>

      {rootErrorMessage ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {rootErrorMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <RepeatedPeopleRowCard
            key={field.id}
            control={control}
            name={name}
            index={index}
            rowCount={rowCount}
            rowKey={field.id}
            config={config}
            collapsed={collapsedRows[index] ?? false}
            setCollapsedRows={setCollapsedRows}
            remove={remove}
            replace={replace}
            update={update}
            rowErrors={repeatedPeopleErrors}
            renderRowStoreRef={renderRowStoreRef}
          />
        ))}
      </div>

      {!addButtonHidden ? (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <button
            type="button"
            data-testid={`${name}-add-button-bottom`}
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-reca transition-colors hover:text-reca-dark"
          >
            <Plus className="h-4 w-4" />
            {addButtonLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function areRepeatedPeopleSectionPropsEqual<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
>(previous: MemoizedSectionProps<TValues, TRow>, next: MemoizedSectionProps<TValues, TRow>) {
  return (
    previous.control === next.control &&
    previous.errors === next.errors &&
    previous.name === next.name &&
    previous.config === next.config &&
    previous.title === next.title &&
    previous.helperText === next.helperText &&
    previous.createRowForAppend === next.createRowForAppend
  );
}

const MemoizedRepeatedPeopleSection = memo(
  RepeatedPeopleSectionInner,
  areRepeatedPeopleSectionPropsEqual
) as typeof RepeatedPeopleSectionInner;

export function RepeatedPeopleSection<
  TValues extends FieldValues,
  TRow extends RepeatedPeopleRow,
>({ renderRow, ...props }: Props<TValues, TRow>) {
  const renderRowStoreRef = useRef<RenderRowStore<TRow>>({
    current: renderRow,
    version: 0,
    listeners: new Set(),
  });

  useEffect(() => {
    if (renderRowStoreRef.current.current === renderRow) {
      return;
    }

    renderRowStoreRef.current.current = renderRow;
    renderRowStoreRef.current.version += 1;

    // El section sigue memoizado por props estables. Cuando cambia la
    // identidad de renderRow, notificamos solo a las row cards para que
    // consuman el callback fresco sin forzar un re-render completo.
    renderRowStoreRef.current.listeners.forEach((listener) => {
      listener();
    });
  }, [renderRow]);

  return (
    <MemoizedRepeatedPeopleSection
      {...props}
      renderRowStoreRef={renderRowStoreRef}
    />
  );
}
