export type FailedVisitPresetFieldGroup = {
  value: string;
  paths: readonly string[];
};

export type FailedVisitPresetConfig = {
  enabled: boolean;
  excludedPaths: readonly string[];
  fieldGroups: readonly FailedVisitPresetFieldGroup[];
};

function cloneForFailedVisitPreset<T>(value: T) {
  return structuredClone(value);
}

function setValueAtPath(target: unknown, path: string, value: string) {
  const segments = path.split(".");
  let current = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (!Number.isInteger(arrayIndex)) {
        throw new Error(`Invalid failed visit preset array path: ${path}`);
      }

      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }

      current = current[arrayIndex];
      continue;
    }

    if (!current || typeof current !== "object") {
      throw new Error(`Invalid failed visit preset path: ${path}`);
    }

    const record = current as Record<string, unknown>;
    if (isLastSegment) {
      record[segment] = value;
      return;
    }

    current = record[segment];
  }
}

export function listFailedVisitPresetPaths(config: FailedVisitPresetConfig) {
  return config.fieldGroups.flatMap((group) => group.paths);
}

export function applyFailedVisitPreset<T extends Record<string, unknown>>(
  source: T,
  config: FailedVisitPresetConfig
) {
  if (!config.enabled) {
    return source;
  }

  const excludedPaths = new Set(config.excludedPaths);
  const nextValues = cloneForFailedVisitPreset(source);

  for (const fieldGroup of config.fieldGroups) {
    for (const path of fieldGroup.paths) {
      if (excludedPaths.has(path)) {
        continue;
      }

      setValueAtPath(nextValues, path, fieldGroup.value);
    }
  }

  return nextValues;
}
