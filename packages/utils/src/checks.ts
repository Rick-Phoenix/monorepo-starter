export function isRunningInBrowser() {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}

/**
 * Asserts that the caught value is a non-null object.
 * If it's not (e.g., a primitive string, number, null), it throws a new Error
 * that includes the original value's string representation.
 * After calling this, TypeScript allows using optional chaining `?.` on the value.
 *
 * @param value - The value caught in a catch block (typically unknown).
 * @throws {Error} If the value is not a non-null object.
 */
export function assertIsObject(
  value: unknown,
): value is Record<keyof any, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Caught value is not an object: ${String(value)}`);
  }

  return true;
}

export function assertErrorWithMsg(
  value: unknown,
): value is { message: string } {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    throw new Error(`Caught value is not an object: ${String(value)}`);
  }

  return true;
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  if (assertIsObject(error)) return typeof error.code === "string";
  else return false;
}
