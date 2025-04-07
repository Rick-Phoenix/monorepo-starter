/* eslint-disable ts/strict-boolean-expressions */
// eslint-disable no-redeclare
type Success<T> = [T, null];
type Failure<E> = [null, E];
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * tryCatch - Performs an action (awaiting a promise) and attaches a description to it.
 *
 * @param action A promise to be awaited.
 * @param description A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns [result, null] if the action is successful. Otherwise, it returns [null, error].
 */
export async function tryCatch<T>(
	action: Promise<T>,
	description?: string,
): Promise<Result<T, Error>> {
	try {
		const result = await action;
		return [result, null];
	} catch (rawError: unknown) {
		const processedError =
			rawError instanceof Error ? rawError : new Error(String(rawError));
		if (description) {
			processedError.message = `(while ${description})\n ${processedError.message}`;
		}
		Error.captureStackTrace(processedError, tryCatch);
		return [null, processedError];
	}
}

/**
 * tryCatchSync - Performs an action (a synchronous callback) and attaches a description to it.
 *
 * @param action A synchronous function returning a value.
 * @param description A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns [result, null] if the action is successful. Otherwise, it returns [null, error].
 */
export function tryCatchSync<T>(
	action: () => T,
	description?: string,
): Result<T, Error> {
	try {
		const result = action();
		return [result, null];
	} catch (rawError: unknown) {
		const processedError =
			rawError instanceof Error ? rawError : new Error(String(rawError));
		if (description) {
			processedError.message = `(while ${description})\n ${processedError.message}`;
		}
		Error.captureStackTrace(processedError, tryCatchSync);
		return [null, processedError];
	}
}

/**
 * tryThrowSync - Performs an action (a synchronous callback) and attaches a description to it.
 *
 * @param action A callback function.
 * @param description A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns If the action is successful, it returns the result.
 * Otherwise, it throws an error with the description attached to it.
 */
export function tryThrowSync<T>(action: () => T, description?: string): T {
	const [result, error] = tryCatchSync(action, description);
	if (error) {
		Error.captureStackTrace(error, tryThrowSync);
		throw error;
	}

	return result;
}

/**
 * tryThrow - Performs an action (awaiting a promise) and attaches a description to it.
 *
 * @param action A promise to be awaited.
 * @param description A description for the procedure, like "querying the database". This will populate the message accordingly like "Error: (while querying the database)".
 * @returns If the action is successful, it returns the result.
 * Otherwise, it throws an error with the description attached to it.
 */
export async function tryThrow<T>(
	action: Promise<T>,
	description?: string,
): Promise<T> {
	const [result, error] = await tryCatch(action, description);

	if (error) {
		Error.captureStackTrace(error, tryThrow);
		throw error;
	}
	return result;
}

type AsyncProcedure<T> = readonly [Promise<T>, description: string];

type AsyncTryThrowPipelineResults<
	P extends ReadonlyArray<AsyncProcedure<unknown>>,
> = {
	[K in keyof P]: P[K] extends AsyncProcedure<infer R> ? R : never;
};

/**
 * tryThrowPipeline - Performs a series of asynchronous operations and attaches a description to them.
 * if one of them fails, it throws specifying which step went wrong.
 * Requires marking the procedures (or the array of procedures if inlining them) "as const" to retain type information.
 *
 * @param procedures An array of tuples made of actions (promises to await) and their descriptions.
 * @returns An array of all results if successful, otherwise it throws an error.
 */
export async function tryThrowPipeline<
	// P captures the specific readonly tuple type passed in
	P extends ReadonlyArray<AsyncProcedure<unknown>>,
>(procedures: P): Promise<AsyncTryThrowPipelineResults<P>> {
	const results: unknown[] = [];

	for (const [action, description] of procedures) {
		// oxlint-disable-next-line no-await-in-loop
		const [result, error] = await tryCatch(action, description);
		if (error) {
			Error.captureStackTrace(error, tryThrowPipeline);
			throw error;
		}
		results.push(result);
	}

	// Cast the collected results
	return results as AsyncTryThrowPipelineResults<P>;
}

// Define the type for a procedure tuple as READONLY
type SyncProcedure<T> = readonly [action: () => T, description: string];

// Helper type to extract results from a tuple of readonly procedures
type SyncTryThrowPipelineResults<
	P extends ReadonlyArray<SyncProcedure<unknown>>,
> = {
	[K in keyof P]: P[K] extends SyncProcedure<infer R> ? R : never;
};

/**
 * tryThrowPipelineSync - Performs a series of synchronous operations and attaches a description to them.
 * if one of them fails, it throws specifying which step went wrong.
 * Requires marking the procedures (or the array of procedures if inlining them) "as const" to retain type information.
 *
 * @param procedures An array of tuples made of actions (callbacks) and their descriptions.
 * @returns An array of all results if successful, otherwise it throws an error.
 */
export function tryThrowPipelineSync<
	// P captures the specific readonly tuple type passed in
	P extends ReadonlyArray<SyncProcedure<unknown>>,
>(procedures: P): SyncTryThrowPipelineResults<P> {
	const results: unknown[] = [];

	for (const [action, description] of procedures) {
		// oxlint-disable-next-line no-await-in-loop
		const [result, error] = tryCatchSync(action, description);
		if (error) {
			Error.captureStackTrace(error, tryThrowPipelineSync);
			throw error;
		}
		results.push(result);
	}

	return results as SyncTryThrowPipelineResults<P>;
}

type SyncTryCatchPipelineResults<
	P extends ReadonlyArray<SyncProcedure<unknown>>,
	E = Error, // Allow overriding the error type if needed, defaults to Error
> = {
	[K in keyof P]: P[K] extends SyncProcedure<infer R> ? Result<R, E> : never;
};

/**
 * Runs a sequence of synchronous procedures using tryCatchSync for each.
 * Collects the Result<T, Error> tuple ([value, null] or [null, error]) from each step.
 * Does not throw an error itself if a step fails, but captures it in the result tuple.
 * Requires marking the procedures (or the array of procedures if inlining them) "as const" to retain type information.
 *
 * @param procedures A tuple (or array) of procedure tuples [action, description].
 * @returns A tuple containing the Result<T, Error> of each action in order.
 */
export function tryCatchPipelineSync<
	P extends ReadonlyArray<SyncProcedure<unknown>>,
>(procedures: P): SyncTryCatchPipelineResults<P> {
	const results: Result<unknown, Error>[] = [];

	for (const [action, description] of procedures) {
		const resultTuple = tryCatchSync(action, description);
		results.push(resultTuple);
	}

	return results as SyncTryCatchPipelineResults<P>;
}

type AsyncTryCatchPipelineResults<
	P extends ReadonlyArray<AsyncProcedure<unknown>>,
	E = Error, // Allow overriding the error type if needed, defaults to Error
> = {
	[K in keyof P]: P[K] extends AsyncProcedure<infer R> ? Result<R, E> : never;
};

/**
 * Runs a sequence of asynchronous procedures using tryCatch for each.
 * Collects the Result<T, Error> tuple ([value, null] or [null, error]) from each step.
 * Does not throw an error itself if a step fails, but captures it in the result tuple.
 * Requires marking the procedures (or the array of procedures if inlining them) "as const" to retain type information.
 *
 * @param procedures A tuple (or array) of procedure tuples [action, description].
 * @returns A tuple containing the Result<T, Error> of each action in order.
 */
export async function tryCatchPipeline<
	P extends ReadonlyArray<AsyncProcedure<unknown>>,
>(procedures: P): Promise<AsyncTryCatchPipelineResults<P>> {
	const results: Result<unknown, Error>[] = [];

	for (const [action, description] of procedures) {
		// oxlint-disable-next-line no-await-in-loop
		const resultTuple = await tryCatch(action, description);
		results.push(resultTuple);
	}

	return results as AsyncTryCatchPipelineResults<P>;
}
