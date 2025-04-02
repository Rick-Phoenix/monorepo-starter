/* eslint-disable ts/strict-boolean-expressions */
// eslint-disable no-redeclare
type Success<T> = [T, null];
type Failure<E> = [null, E];
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * tryCatch - Error handling that can be synchronous or asynchronous
 * based on the input function.
 *
 * @param fn Function to execute.
 * @param procedureDescription A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns A Result, or a Promise resolving to a Result, depending on fn.
 */
export function tryCatch<T>(fn: () => T, procedureDescription?: string): Result<T, Error>;
export function tryCatch<T>(
  fn: () => Promise<T>,
  procedureDescription?: string
): Promise<Result<T, Error>>;
export function tryCatch<T>(
  fn: () => T | Promise<T>,
  procedureDescription?: string
): Result<T, Error> | Promise<Result<T, Error>> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then((data): Success<T> => [data, null])
        .catch((rawError: unknown) => {
          const processedError = rawError instanceof Error ? rawError : new Error(String(rawError));

          if (procedureDescription) {
            processedError.message = `(while ${procedureDescription})\n ${processedError.message}`;
          }
          Error.captureStackTrace(processedError, tryCatch);
          return [null, processedError];
        });
    } else {
      return [result, null];
    }
  } catch (rawError: unknown) {
    const processedError = rawError instanceof Error ? rawError : new Error(String(rawError));
    if (procedureDescription) {
      processedError.message = `(while ${procedureDescription})\n ${processedError.message}`;
    }
    Error.captureStackTrace(processedError, tryCatch);
    return [null, processedError];
  }
}

export function tryThrow<T>(fn: () => T, procedureDescription?: string): T;
export function tryThrow<T>(fn: () => Promise<T>, procedureDescription?: string): Promise<T>;
export function tryThrow<T>(
  fn: () => T | Promise<T>,
  procedureDescription?: string
): T | Promise<T> {
  const [result, error] = tryCatch(fn, procedureDescription);
  if (error) {
    Error.captureStackTrace(error, tryThrow);
    throw error;
  }
  return result;
}
