import os from "node:os";
import {
  posixUnsafePathRegex,
  windowsUnsafePathRegex,
} from "../strings/regex.js";

export function isRunningInBrowser() {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}

export function assertIsObject(
  value: unknown,
): value is Record<keyof any, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
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

export function isPermissionError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return isNodeError(error) &&
    (error.code === "EACCESS" || error.code === "EPERM");
}

export function isENOENTError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === "ENOENT";
}

export function isENOTDIRError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === "ENOTDIR";
}

export function isOnWindows() {
  return os.platform() === "win32";
}

export function isValidPathComponent(name: string): boolean {
  if (!name) {
    return false;
  }
  const unsafeCharsRegex = isOnWindows()
    ? windowsUnsafePathRegex
    : posixUnsafePathRegex;
  const hasUnsafe = unsafeCharsRegex.test(name);
  return !hasUnsafe;
}

export function getUnsafePathChar(name: string) {
  const unsafeCharsRegex = isOnWindows()
    ? windowsUnsafePathRegex
    : posixUnsafePathRegex;
  const matchResult = unsafeCharsRegex.exec(name);

  if (matchResult === null) {
    return null;
  } else {
    const unsafeChar = matchResult[0];
    const displayChar = unsafeChar === "\0" ? "NUL byte (\\0)" : unsafeChar;
    return displayChar;
  }
}

export function isNonEmptyArray<T>(
  maybeArray: T[] | unknown,
): maybeArray is Array<T> {
  return Array.isArray(maybeArray) && maybeArray.length > 0;
}
