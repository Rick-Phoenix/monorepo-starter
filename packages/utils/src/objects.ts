export function keyValue<T extends object>(object: T) {
  return Object.entries(object);
}

export function objectIsEmpty<T extends object>(object: T) {
  return Object.keys(object).length === 0;
}
