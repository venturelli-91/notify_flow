# ADR 002 — Result Pattern over Exceptions

**Date:** 2025-01-01
**Status:** Accepted

## Context

Service methods need to communicate failure to their callers. The classic
approach is to `throw` an exception and `catch` it higher up. The problem is
that throws are invisible in function signatures: TypeScript has no checked
exceptions, so there is no compile-time guarantee that a caller handles all
possible failures.

This becomes a real issue in API route handlers: if a service throws and the
handler doesn't catch it, Next.js returns a 500 with no structured body.

## Decision

Every public method in `src/server/core/services/` returns
`Result<T, DomainError>` and **never throws**.

```ts
// core/domain/result/Result.ts
type Success<T> = { ok: true; value: T }
type Failure<E> = { ok: false; error: E }
export type Result<T, E> = Success<T> | Failure<E>
```

API route handlers branch on `result.ok` and map `DomainError.statusCode` to
the HTTP status. No try/catch needed in the route layer.

## Consequences

**Positive**

- Errors are part of the function signature. TypeScript's discriminated union
  forces callers to handle both branches before accessing `.value`.
- Mirrors idiomatic patterns in Rust (`Result<T, E>`), Go (multiple return
  values) and functional TypeScript (`Either`).
- Unit tests can assert on `result.ok` and `result.error.code` without
  wrapping anything in `expect(() => fn()).toThrow()`.
- API routes always return a structured JSON error — no accidental 500s.

**Negative**

- More verbose than try/catch for simple cases.
- Requires discipline: one `throw` anywhere in a call chain breaks the contract.

## Files

- [`src/server/core/domain/result/Result.ts`](../../src/server/core/domain/result/Result.ts)
- [`src/server/core/domain/errors/DomainError.ts`](../../src/server/core/domain/errors/DomainError.ts)
- [`src/server/core/domain/errors/NotificationErrors.ts`](../../src/server/core/domain/errors/NotificationErrors.ts)
