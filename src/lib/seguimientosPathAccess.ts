export function getSeguimientosValueAtPath(
  source: unknown,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

export function setSeguimientosValueAtPath(
  target: unknown,
  path: string,
  value: unknown
) {
  const segments = path.split(".");
  let current = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;
    const nextSegment = segments[index + 1] ?? "";
    const nextShouldBeArray = Number.isInteger(Number.parseInt(nextSegment, 10));

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (!Number.isInteger(arrayIndex)) {
        throw new Error(`Invalid Seguimientos path: ${path}`);
      }

      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }

      if (current[arrayIndex] == null) {
        current[arrayIndex] = nextShouldBeArray ? [] : {};
      }

      current = current[arrayIndex];
      continue;
    }

    if (!current || typeof current !== "object") {
      throw new Error(`Invalid Seguimientos path: ${path}`);
    }

    const record = current as Record<string, unknown>;
    if (isLastSegment) {
      record[segment] = value;
      return;
    }

    if (record[segment] == null) {
      record[segment] = nextShouldBeArray ? [] : {};
    }

    current = record[segment];
  }
}
