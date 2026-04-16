function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isFieldErrorLike(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return "message" in value || "type" in value || "ref" in value;
}

export function hasNestedError(value: unknown): boolean {
  if (isFieldErrorLike(value)) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  const entries = Array.isArray(value)
    ? Array.from(value.entries(), ([index, entry]) => [String(index), entry] as const)
    : Object.entries(value);

  for (const [key, nestedValue] of entries) {
    if (key === "root") {
      continue;
    }

    if (hasNestedError(nestedValue)) {
      return true;
    }
  }

  return false;
}

export function getFirstErroredField(
  errors: Record<string, unknown>,
  orderedFields: readonly string[]
) {
  return (
    orderedFields.find((fieldName) => isFieldErrorLike(errors[fieldName])) ?? null
  );
}

export function getFirstNestedErrorPath(
  value: unknown,
  prefix = ""
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const entries = Array.isArray(value)
    ? Array.from(value.entries(), ([index, entry]) => [String(index), entry] as const)
    : Object.entries(value);

  for (const [key, nestedValue] of entries) {
    if (key === "root") {
      continue;
    }

    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (isFieldErrorLike(nestedValue)) {
      return nextPath;
    }

    const nestedPath = getFirstNestedErrorPath(nestedValue, nextPath);
    if (nestedPath) {
      return nestedPath;
    }
  }

  return null;
}

export function getRepeatedArrayValidationFieldName(
  value: unknown,
  arrayName: string,
  fallbackFieldName: string
) {
  return (
    getFirstNestedErrorPath(value, arrayName) ??
    `${arrayName}.0.${fallbackFieldName}`
  );
}
