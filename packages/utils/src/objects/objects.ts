export function keyValue<T extends object>(object: T) {
  return Object.entries(object) as T[keyof T];
}

export function objectIsEmpty<T extends object>(object: T) {
  return Object.keys(object).length === 0;
}

export function getValue(source: unknown, field: string) {
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

  return targetField;
}
