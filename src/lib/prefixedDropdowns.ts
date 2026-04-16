type PrefixKey = "0." | "1." | "2." | "3." | "no aplica";

type BidirectionalPrefixRule<TFieldId extends string> = {
  mode: "bidirectional";
  prefixFieldIds: readonly TFieldId[];
};

type PrimaryWithDependentsRule<TFieldId extends string> = {
  mode: "primary_with_dependents";
  primaryFieldId: TFieldId;
  secondaryFieldId: TFieldId;
  dependentBooleanFieldIds: readonly TFieldId[];
};

export type PrefixedDropdownSyncRule<TFieldId extends string> =
  | BidirectionalPrefixRule<TFieldId>
  | PrimaryWithDependentsRule<TFieldId>;

function normalizeOptionValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-CO")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getPrefixedDropdownKey(value: string): PrefixKey | null {
  const normalizedValue = normalizeOptionValue(value);
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.startsWith("0.")) return "0.";
  if (normalizedValue.startsWith("1.")) return "1.";
  if (normalizedValue.startsWith("2.")) return "2.";
  if (normalizedValue.startsWith("3.")) return "3.";
  if (normalizedValue.includes("no aplica")) return "no aplica";
  return null;
}

function resolvePrefixedDropdownValue(options: readonly string[], key: PrefixKey) {
  return (
    options.find((option) => {
      const normalizedOption = normalizeOptionValue(option);
      if (key === "no aplica") {
        return normalizedOption.includes("no aplica");
      }

      return normalizedOption.startsWith(key);
    }) ?? ""
  );
}

function resolveYesNoDropdownValue(
  options: readonly string[],
  desiredState: "Si" | "No" | "No aplica"
) {
  const normalizedDesiredState = normalizeOptionValue(desiredState);
  return (
    options.find(
      (option) => normalizeOptionValue(option) === normalizedDesiredState
    ) ?? desiredState
  );
}

export function getPrefixedDropdownUpdates<TFieldId extends string>({
  rule,
  changedFieldId,
  changedValue,
  getOptions,
}: {
  rule: PrefixedDropdownSyncRule<TFieldId>;
  changedFieldId: TFieldId;
  changedValue: string;
  getOptions: (fieldId: TFieldId) => readonly string[];
}) {
  const prefixKey = getPrefixedDropdownKey(changedValue);
  if (!prefixKey) {
    return {} as Partial<Record<TFieldId, string>>;
  }

  if (rule.mode === "bidirectional") {
    if (!rule.prefixFieldIds.includes(changedFieldId)) {
      return {} as Partial<Record<TFieldId, string>>;
    }

    const updates: Partial<Record<TFieldId, string>> = {};
    for (const fieldId of rule.prefixFieldIds) {
      if (fieldId === changedFieldId) {
        continue;
      }

      const nextValue = resolvePrefixedDropdownValue(getOptions(fieldId), prefixKey);
      if (nextValue) {
        updates[fieldId] = nextValue;
      }
    }

    return updates;
  }

  if (changedFieldId !== rule.primaryFieldId) {
    return {} as Partial<Record<TFieldId, string>>;
  }

  const updates: Partial<Record<TFieldId, string>> = {};
  const secondaryValue = resolvePrefixedDropdownValue(
    getOptions(rule.secondaryFieldId),
    prefixKey
  );
  if (secondaryValue) {
    updates[rule.secondaryFieldId] = secondaryValue;
  }

  const dependentValue =
    prefixKey === "0."
      ? "No"
      : prefixKey === "no aplica"
        ? "No aplica"
        : "";

  for (const fieldId of rule.dependentBooleanFieldIds) {
    updates[fieldId] = dependentValue
      ? resolveYesNoDropdownValue(getOptions(fieldId), dependentValue)
      : "";
  }

  return updates;
}
