export type RepeatedPeopleRow = Record<string, unknown>;

export type RepeatedPeopleConfig<TRow extends RepeatedPeopleRow> = {
  itemLabelSingular: string;
  itemLabelPlural: string;
  primaryNameField: keyof TRow & string;
  meaningfulFieldIds: readonly (keyof TRow & string)[];
  createEmptyRow: () => TRow;
  getCardTitle?: (row: TRow, index: number) => string;
  getCardSubtitle?: (row: TRow, index: number) => string | null;
  orderField?: keyof TRow & string;
  maxRows?: number;
};

export type RepeatedPeopleCollapsedState = Record<number, boolean>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isMeaningfulRepeatedPeopleValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => isMeaningfulRepeatedPeopleValue(entry));
  }

  return false;
}

export function getDefaultRepeatedPeopleRows<TRow extends RepeatedPeopleRow>(
  config: RepeatedPeopleConfig<TRow>
) {
  return [config.createEmptyRow()];
}

export function normalizeRestoredRepeatedPeopleRows<
  TRow extends RepeatedPeopleRow,
>(
  rows: unknown,
  config: RepeatedPeopleConfig<TRow>
) {
  if (!Array.isArray(rows)) {
    return getDefaultRepeatedPeopleRows(config);
  }

  const normalizedRows = rows
    .filter((row) => isRecord(row))
    .map((row) => ({
      ...config.createEmptyRow(),
      ...row,
    }));

  if (normalizedRows.length === 0) {
    return getDefaultRepeatedPeopleRows(config);
  }

  return syncRepeatedPeopleRowOrder(normalizedRows, config);
}

export function createRepeatedPeopleRowForInsert<TRow extends RepeatedPeopleRow>(
  config: RepeatedPeopleConfig<TRow>,
  index: number
) {
  const row = config.createEmptyRow();

  if (!config.orderField) {
    return row;
  }

  return {
    ...row,
    [config.orderField]: String(index + 1),
  } as TRow;
}

export function isMeaningfulRepeatedPeopleRow<TRow extends RepeatedPeopleRow>(
  row: TRow,
  config: RepeatedPeopleConfig<TRow>
) {
  return config.meaningfulFieldIds.some((fieldId) =>
    isMeaningfulRepeatedPeopleValue(row[fieldId])
  );
}

export function getMeaningfulRepeatedPeopleRows<TRow extends RepeatedPeopleRow>(
  rows: readonly TRow[],
  config: RepeatedPeopleConfig<TRow>
) {
  return rows.filter((row) => isMeaningfulRepeatedPeopleRow(row, config));
}

export function getRepeatedPeoplePrimaryName<TRow extends RepeatedPeopleRow>(
  row: TRow,
  config: RepeatedPeopleConfig<TRow>
) {
  const value = row[config.primaryNameField];
  return typeof value === "string" ? value.trim() : "";
}

export function getRepeatedPeopleCardTitle<TRow extends RepeatedPeopleRow>(
  row: TRow,
  index: number,
  config: RepeatedPeopleConfig<TRow>
) {
  if (config.getCardTitle) {
    return config.getCardTitle(row, index);
  }

  const primaryName = getRepeatedPeoplePrimaryName(row, config);
  return primaryName || `${config.itemLabelSingular} ${index + 1}`;
}

export function getRepeatedPeopleCardSubtitle<TRow extends RepeatedPeopleRow>(
  row: TRow,
  index: number,
  config: RepeatedPeopleConfig<TRow>
) {
  const subtitle = config.getCardSubtitle?.(row, index);
  if (typeof subtitle !== "string") {
    return null;
  }

  const trimmedSubtitle = subtitle.trim();
  return trimmedSubtitle.length > 0 ? trimmedSubtitle : null;
}

export function isRepeatedPeopleSectionComplete<
  TRow extends RepeatedPeopleRow,
>({
  rows,
  config,
  isRowComplete,
}: {
  rows: readonly TRow[];
  config: RepeatedPeopleConfig<TRow>;
  isRowComplete: (row: TRow) => boolean;
}) {
  const meaningfulRows = getMeaningfulRepeatedPeopleRows(rows, config);

  return meaningfulRows.length > 0 && meaningfulRows.every((row) => isRowComplete(row));
}

export function syncRepeatedPeopleCollapsedState(
  currentState: RepeatedPeopleCollapsedState,
  rowCount: number
) {
  const nextState: RepeatedPeopleCollapsedState = {};

  for (let index = 0; index < rowCount; index += 1) {
    nextState[index] = currentState[index] ?? false;
  }

  return nextState;
}

export function getRepeatedPeopleCollapsedStateAfterAppend(
  currentState: RepeatedPeopleCollapsedState,
  existingCount: number
) {
  return {
    ...syncRepeatedPeopleCollapsedState(currentState, existingCount),
    [existingCount]: false,
  };
}

export function getRepeatedPeopleCollapsedStateAfterRemove(
  currentState: RepeatedPeopleCollapsedState,
  removedIndex: number,
  nextCount: number
) {
  const nextState: RepeatedPeopleCollapsedState = {};

  for (let index = 0; index < nextCount; index += 1) {
    const sourceIndex = index < removedIndex ? index : index + 1;
    nextState[index] = currentState[sourceIndex] ?? false;
  }

  return nextState;
}

export function resolveRepeatedPeopleRowRemoval(rowCount: number) {
  return rowCount <= 1 ? "reset_last" : "remove";
}

export function syncRepeatedPeopleRowOrder<TRow extends RepeatedPeopleRow>(
  rows: readonly TRow[],
  config: RepeatedPeopleConfig<TRow>
) {
  if (!config.orderField) {
    return [...rows];
  }

  return rows.map((row, index) => ({
    ...row,
    [config.orderField as string]: String(index + 1),
  })) as TRow[];
}
