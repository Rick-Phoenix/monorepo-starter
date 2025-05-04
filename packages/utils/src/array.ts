export function maybeArrayIncludes(array: unknown, item: unknown) {
  return Array.isArray(array) && array.includes(item);
}
