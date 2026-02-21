/**
 * Result<T, E> — typed success/failure without exceptions.
 *
 * Mirrors patterns from Rust (Result), Go (error tuple), and
 * functional TypeScript. Errors become first-class citizens of
 * the function signature instead of invisible control flow.
 *
 * Usage:
 *   const result = someService.doWork()
 *   if (!result.ok) {
 *     // TypeScript narrows to Failure<E> here
 *     console.error(result.error.code)
 *     return
 *   }
 *   // TypeScript narrows to Success<T> here
 *   console.log(result.value)
 */

export type Success<T> = { readonly ok: true; readonly value: T }
export type Failure<E> = { readonly ok: false; readonly error: E }
export type Result<T, E> = Success<T> | Failure<E>

export const ok = <T>(value: T): Success<T> => ({ ok: true, value })
export const fail = <E>(error: E): Failure<E> => ({ ok: false, error })
