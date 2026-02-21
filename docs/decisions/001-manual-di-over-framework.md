# ADR 001 — Manual DI over Framework

**Date:** 2025-01-01
**Status:** Accepted

## Context

NotifyFlow needs Dependency Injection so that `NotificationService` can depend
on `INotificationChannel[]` and `INotificationRepository` without being coupled
to any concrete implementation.

Popular DI frameworks for TypeScript (InversifyJS, TSyringe, NestJS) rely on
decorators and `reflect-metadata` to achieve this. Next.js runs both a
TypeScript compiler (tsc) and an SWC-based bundler in the same project, and the
decorator/metadata pipeline has historically caused subtle incompatibilities
between these two compile steps.

## Decision

All dependency injection is done **manually via constructor parameters**.
`src/server/lib/container.ts` is the single file that imports concrete classes
and wires the dependency graph. Everything else receives its dependencies
through its constructor and depends only on interfaces.

## Consequences

**Positive**

- Zero runtime overhead — no reflection, no metadata, no IoC container to
  initialise.
- Explicit dependency graph: reading `container.ts` tells you exactly what the
  application is wired to. No magic.
- Constructor injection is the easiest pattern to test: pass a mock, done.
- No decorator or `experimentalDecorators` flag in `tsconfig.json`.

**Negative**

- More verbose as the codebase grows — each new service requires a manual
  registration in `container.ts`.
- No automatic lifecycle management (singletons, scoped, transient).

## Files

- [`src/server/lib/container.ts`](../../src/server/lib/container.ts) — the only
  concrete-import zone
- All `src/server/core/domain/interfaces/` — the abstractions the service layer
  depends on
