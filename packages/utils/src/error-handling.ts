/* eslint-disable ts/strict-boolean-expressions */
// eslint-disable no-redeclare
type Success<T> = [T, null];
type Failure<E> = [null, E];
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * tryCatch - Receives information about the action being performed, attaches that info to the caught error and returns the result or the error.
 *
 * @param action A promise or a synchronous function returning a value.
 * @param procedureDescription A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns The result of the action or the caught error.
 */
export function tryCatch<T>(action: () => T, procedureDescription?: string): Result<T, Error>;
export function tryCatch<T>(
  action: Promise<T>,
  procedureDescription?: string
): Promise<Result<T, Error>>;
export function tryCatch<T>(
  action: (() => T) | Promise<T>,
  procedureDescription?: string
): Result<T, Error> | Promise<Result<T, Error>> {
  try {
    const result = action instanceof Promise ? action : action();
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

/**
 * tryThrow - Receives information about the action being performed and attaches that info to the error for more precise debugging.
 *
 * @param action A promise or a synchronous function returning a value.
 * @param procedureDescription A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns The result of the action. Throws an error with the procedure description if it catches one.
 */
export function tryThrow<T>(action: () => T, procedureDescription?: string): T;
export function tryThrow<T>(action: Promise<T>, procedureDescription?: string): Promise<T>;
export function tryThrow<T>(
  action: (() => T) | Promise<T>,
  procedureDescription?: string
): T | Promise<T> {
  if (typeof action === "function") {
    const [result, error] = tryCatch(action, procedureDescription);

    if (error) {
      Error.captureStackTrace(error, tryThrow);
      throw error;
    }

    return result;
  } else {
    const promiseResult = tryCatch(action, procedureDescription);

    return promiseResult.then(([result, error]) => {
      if (error) {
        Error.captureStackTrace(error, tryThrow);
        throw error;
      }
      return result;
    });
  }
}
