export function maybeArrayIncludes(array: unknown, item: unknown) {
  return Array.isArray(array) && array.includes(item);
}
export function ensureArrayProperty<T extends unknown[]>(
  object: Record<string, T | null | undefined>,
  property: string,
): T {
  object[property] = ensureArray(object[property]);
  return object[property];
}

export function ensureArray<T extends unknown[]>(
  maybeArray: T | null | undefined,
): T {
  return (maybeArray || []) as T;
}
