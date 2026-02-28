# ADR 003 — Domain Isolation from Next.js

**Date:** 2025-01-01
**Status:** Accepted

## Context

Next.js is the application framework, but the core business logic (what a
notification is, how delivery is dispatched, what template rendering means)
should not depend on it. Mixing domain logic with framework imports creates
several problems:

- Unit tests require a Next.js environment to run.
- The domain cannot be extracted into a shared package without untangling
  framework calls.
- Framework upgrades risk breaking business logic indirectly.

## Decision

`src/server/core/` is a **framework-free zone**. It contains only:

- Domain entities (`Notification`, `Template`)
- Domain errors (`DomainError`, `NotificationErrors`)
- Domain interfaces (`INotificationChannel`, `INotificationReader`, …)
- The `Result<T, E>` type
- Services (`NotificationService`, `TemplateService`)

No file under `src/server/core/` may import from `next`, `@tanstack/*`,
React, Prisma, ioredis, or any other framework or infrastructure library.

Infrastructure (Prisma, nodemailer, ioredis) lives in `src/server/core/repositories/`
and `src/server/core/channels/` but only against the domain interfaces. The
concrete instances are assembled in `src/server/lib/container.ts`.

## Consequences

**Positive**

- Unit tests for the domain run in plain Node — no jsdom, no Next.js setup,
  no database.
- The domain could be extracted to a separate npm package with zero changes.
- Mirrors Clean Architecture's dependency rule: inner layers know nothing of
  outer layers.
- **Automated enforcement**: ESLint with `eslint-plugin-boundaries` prevents
  violations at development time and in CI/CD.

**Negative**

- Requires developer discipline (and ideally an ESLint boundary rule) to
  prevent accidental framework imports into `src/server/core/`.

## Enforcement

This architectural boundary is enforced automatically via ESLint:

```json
// .eslintrc.json
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/element-types": [
      "error",
      {
        "rules": [
          {
            "from": ["core"],
            "disallow": [["lib"], ["app"], ["client"], ["workers"]],
            "message": "Core domain must not depend on infrastructure, framework, UI, or workers. See ADR 003."
          }
        ]
      }
    ]
  },
  "overrides": [
    {
      "files": ["src/server/core/**/*"],
      "excludedFiles": ["src/server/core/repositories/**/*", "src/server/core/channels/**/*"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              { "group": ["next", "next/*"], "message": "Next.js not allowed in core domain. See ADR 003." },
              { "group": ["@prisma/*"], "message": "Prisma not allowed in core domain. See ADR 003." },
              { "group": ["ioredis", "bullmq", "nodemailer"], "message": "Infrastructure libs not allowed. See ADR 003." }
            ]
          }
        ]
      }
    }
  ]
}
```

Run `npm run lint` to verify compliance. Any violation will fail the build.

## Files

- `src/server/core/` — the isolated domain
- [`src/server/lib/container.ts`](../../src/server/lib/container.ts) — the
  outermost wiring layer that is allowed to cross the boundary
