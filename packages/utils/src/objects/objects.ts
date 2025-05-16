export function objEntries<T extends object>(object: T) {
  return Object.entries(object) as T[keyof T];
}

export function objectIsEmpty<T extends object>(object: T) {
  return Object.keys(object).length === 0;
}

export function getValue<T = unknown>(source: unknown, field: string) {
  const fieldSegments = field.split(".");

  let targetField = source;

  for (const segment of fieldSegments) {
    if (!targetField || typeof targetField !== "object") {
      targetField = undefined;
      break;
    }

    if (!segment.startsWith("[")) {
      const stringPart = segment.split("[")[0];
      // @ts-expect-error Cannot know the exact type structure in advance
      targetField = targetField[stringPart];
    }

    const numIndices = segment.match(/(?<=\[.*)\d/g);
    if (numIndices) {
      numIndices.forEach((i) => {
        // @ts-expect-error Cannot know the exact type structure in advance
        targetField = targetField[+i];
      });
    }
  }

  return targetField as T;
}

export function ensureObjectProperty<T extends Record<string, unknown>>(
  object: Record<string, T | null | undefined>,
  property: string,
): T {
  object[property] = ensureObject(object[property]);
  return object[property];
}

export function ensureObject<T extends Record<string, unknown>>(
  maybeObject: T | null | undefined,
): T {
  return (maybeObject || {}) as T;
}
