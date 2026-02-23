# NotifyFlow

> Self-hosted notification engine with multi-channel delivery (email, webhook, in-app).

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-ff4154?logo=react-query)
![Vitest](https://img.shields.io/badge/Vitest-tested-6e9f18?logo=vitest)

---

## Architecture

```
  Browser (React + TanStack Query)
           │
           ▼
  Next.js Route Handlers
  (app/api/notifications, app/api/channels)
           │
           ▼
    container.ts   ← only file with concrete imports
           │
           ▼
  NotificationService
    │               │
    ▼               ▼
INotificationChannel[]   INotificationRepository
    │                           │
    ├─ EmailChannel             ▼
    ├─ WebhookChannel   PrismaNotificationRepository
    └─ InAppChannel
```

---

## SOLID in Practice

### S — Single Responsibility

| File | Responsibility |
|---|---|
| [`NotificationService`](src/server/core/services/NotificationService.ts) | Orchestrates dispatch — nothing else |
| [`PrismaNotificationRepository`](src/server/core/repositories/PrismaNotificationRepository.ts) | DB translation only |
| [`SimpleTemplateRenderer`](src/server/core/services/TemplateService.ts) | `{{token}}` substitution only |
| [`logger.ts`](src/server/lib/logger.ts) | Structured JSON output only |
| [`queryClient.ts`](src/client/lib/queryClient.ts) | TanStack Query defaults only |

### O — Open/Closed

Adding a new delivery channel requires **one new class** and **one line in `container.ts`**. Zero changes to `NotificationService`.

```ts
// INotificationChannel.ts
interface INotificationChannel {
  name: string
  isAvailable(): boolean
  send(notification: Notification): Promise<Result<void, DomainError>>
}
```

`Button` and `Badge` resolve variants via config maps — no `if/else` chains.

### L — Liskov Substitution

Any `INotificationChannel` is fully substitutable for any other. `NotificationService` calls `channel.send(n)` and handles `Result<>` — it never inspects the concrete type.

### I — Interface Segregation

| Interface | Consumer |
|---|---|
| `INotificationReader` — `findAll`, `findById` | Dashboard (read-only) |
| `INotificationWriter` — `create`, `updateStatus` | Service dispatch (write-only) |
| `INotificationChannel` — `send`, `name`, `isAvailable` | NotificationService only |

No component or service receives an interface larger than it needs.

### D — Dependency Inversion

`NotificationService` is constructed with `INotificationChannel[]`, `INotificationWriter`, `INotificationReader`. It never imports `EmailChannel`, `PrismaClient`, or any infrastructure.
[`container.ts`](src/server/lib/container.ts) is the only file allowed to cross this boundary.

---

## Observability

Every API request runs inside `correlationStorage.run(id, handler)` ([`correlationId.ts`](src/server/lib/correlationId.ts)).
The `id` is read from the `X-Correlation-ID` request header, or generated as a UUID if absent.

The structured logger reads this context from `AsyncLocalStorage` automatically:

```json
{
  "level": "info",
  "message": "Notification sent",
  "correlationId": "b3a2c1d4-...",
  "id": "clx...",
  "ms": 42,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

Every log line is valid JSON — ready for Datadog, Logtail, or any log aggregator.

---

## Server State (TanStack Query)

TanStack Query v5 owns **all server state**. No `useState` holds remote data.

```
useNotifications()
  ├─ query      → GET /api/notifications (staleTime 30 s)
  └─ mutation   → POST /api/notifications
        onMutate  → snapshot + inject optimistic entry (status "pending")
        onError   → rollback to snapshot
        onSettled → invalidateQueries → real server state wins
```

The optimistic entry carries `status: "pending"`, which `<Badge>` renders with `animate-pulse` automatically — no conditional logic needed anywhere.

See [ADR 004](docs/decisions/004-tanstack-query-for-server-state.md) for the full rationale.

---

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [001](docs/decisions/001-manual-di-over-framework.md) | Manual constructor DI over InversifyJS / TSyringe |
| [002](docs/decisions/002-result-pattern-over-exceptions.md) | `Result<T, E>` over exceptions |
| [003](docs/decisions/003-domain-isolation-from-nextjs.md) | `src/server/core/` as a framework-free zone |
| [004](docs/decisions/004-tanstack-query-for-server-state.md) | TanStack Query v5 for all server state |

---

## Running Locally

**Prerequisites:** Docker, Node.js 20+

```bash
# 1. Clone and install
git clone <repo-url> && cd notify_flow
npm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Set NEXTAUTH_SECRET: openssl rand -base64 32
# Other defaults work with docker compose

# 4. Apply migrations
npx prisma migrate dev

# 5. Seed the database (creates the admin user)
npx prisma db seed

# 6. Start dev server
npm run dev
# → http://localhost:3000
```

**Default credentials:** `admin@notifyflow.com` / `admin123`

### Running tests

```bash
# Unit + component tests (no DB needed)
npx vitest run src/tests/unit src/tests/components

# Integration tests (requires running Postgres)
docker compose up -d postgres
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
npx vitest run src/tests/integration
```

---

## Deploying for Free

| Service | Purpose | Free tier |
|---|---|---|
| [Vercel](https://vercel.com) | Next.js hosting | Hobby — unlimited |
| [Neon.tech](https://neon.tech) | PostgreSQL | 0.5 GB, 190 compute hours/month |
| [Upstash](https://upstash.com) | Redis (rate limiting, BullMQ) | 10 000 commands/day |

```bash
# Set these env vars in Vercel dashboard:
DATABASE_URL=postgresql://...   # Neon connection string
REDIS_URL=rediss://...          # Upstash URL (note: rediss://)

# Optional — enable channels:
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=noreply@yourdomain.com
WEBHOOK_URL=https://your-endpoint.com/hook
```

---

## Project Structure

```
src/
├── middleware.ts                    # NextAuth route protection
├── app/
│   ├── layout.tsx                   # Server Component — mounts <Providers>
│   ├── login/page.tsx               # Login page (credentials)
│   ├── (dashboard)/
│   │   ├── page.tsx                 # Dashboard — notification feed + search
│   │   ├── send/page.tsx            # Send form with optimistic update
│   │   ├── channels/page.tsx        # Channel status (live from env vars)
│   │   └── analytics/page.tsx       # Delivery stats + by-channel breakdown
│   └── api/
│       ├── notifications/route.ts   # GET + POST with Zod + rate limiting
│       ├── channels/route.ts        # GET — channel availability
│       ├── analytics/route.ts       # GET — aggregated delivery stats
│       └── auth/[...nextauth]/      # NextAuth handler
├── server/
│   ├── core/                        # Framework-free domain (ADR 003)
│   │   ├── domain/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── channels/
│   └── lib/
│       ├── auth.ts                  # NextAuth config (CredentialsProvider)
│       ├── container.ts             # Only file with concrete imports
│       ├── logger.ts                # Structured JSON logger
│       ├── correlationId.ts         # AsyncLocalStorage request context
│       └── rateLimit.ts             # In-memory sliding-window limiter
└── client/
    ├── components/
    │   ├── ui/                      # Button, Badge, Card
    │   └── notifications/           # NotificationCard, NotificationList
    ├── hooks/
    │   ├── useNotifications.ts      # Query + mutation with optimistic update
    │   ├── useChannels.ts           # Read-only, 5 min stale
    │   └── useAnalytics.ts          # Delivery stats, 30s stale
    └── lib/
        ├── queryClient.ts           # TanStack QueryClient singleton
        └── queryKeys.ts             # Centralised key factory
```
