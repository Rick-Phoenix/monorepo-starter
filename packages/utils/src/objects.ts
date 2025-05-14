export function keyValue<T extends object>(object: T) {
  return Object.entries(object);
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
    // @ts-expect-error Cannot know the exact type structure in advance
    targetField = targetField[segment];
  }

  return targetField;
}
