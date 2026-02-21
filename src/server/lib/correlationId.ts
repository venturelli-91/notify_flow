import { AsyncLocalStorage } from "async_hooks";

/**
 * AsyncLocalStorage that carries the correlationId for the current
 * request context. Set once per request in the API route middleware,
 * then readable anywhere in the call stack without prop-drilling.
 */
export const correlationStorage = new AsyncLocalStorage<string>();

/**
 * Run `fn` inside a new correlationId context.
 * Prefers the value from the X-Correlation-ID request header;
 * falls back to a freshly generated UUID.
 */
export function withCorrelationId<T>(
	idFromHeader: string | null,
	fn: () => T,
): T {
	const id = idFromHeader ?? crypto.randomUUID();
	return correlationStorage.run(id, fn);
}

/** Returns the correlationId for the current async context, or 'no-context'. */
export function getCorrelationId(): string {
	return correlationStorage.getStore() ?? "no-context";
}
