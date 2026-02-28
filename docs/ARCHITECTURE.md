# NotifyFlow Architecture

This document describes the architectural foundations of NotifyFlow, a multi-tenant notification delivery system. It establishes the principles, patterns, and boundaries that guide development.

## Overview

NotifyFlow is built on **Clean Architecture** principles with a focus on:

- **Domain-Driven Design:** Core business logic isolated from framework implementations.
- **Dependency Inversion:** Inner layers depend on abstractions, not concrete implementations.
- **Result Pattern:** Explicit error handling without exceptions for business logic.
- **Multi-Tenancy:** Strict isolation of user data at every layer.

### Technology Stack

- **Framework:** Next.js 14 (API routes)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Queue:** BullMQ with Redis
- **Authentication:** NextAuth.js
- **Validation:** Zod
- **Testing:** Vitest

## Project Structure

```
src/
├── server/
│   ├── core/               # Domain layer (framework-free)
│   │   ├── domain/
│   │   │   ├── entities/   # Core business objects
│   │   │   ├── errors/     # Domain errors
│   │   │   ├── interfaces/ # Contracts
│   │   │   └── result/     # Result<T, E> type
│   │   ├── services/       # Business logic orchestration
│   │   ├── channels/       # Channel implementations (adapters)
│   │   └── repositories/   # Repository interfaces & Prisma adapters
│   ├── lib/                # Infrastructure & utilities
│   │   ├── env.ts          # Centralized env validation (Zod)
│   │   ├── prisma.ts       # Database client singleton
│   │   ├── redis.ts        # Redis client singleton
│   │   ├── queue.ts        # BullMQ queue setup
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── container.ts    # Dependency injection wiring
│   │   ├── logger.ts       # Logging utility
│   │   ├── correlationId.ts # Request tracing
│   │   └── rateLimit.ts    # Sliding window rate limiter
│   └── workers/
│       └── notificationWorker.ts # Background job processor
├── app/                    # Next.js app layer
│   ├── api/                # API routes
│   │   ├── notifications/
│   │   ├── analytics/
│   │   ├── channels/
│   │   └── templates/
│   ├── (dashboard)/        # Protected routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [feature]/
│   ├── auth/              # Authentication pages
│   └── layout.tsx
├── client/                 # Client-side code
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   └── [feature]/     # Feature-specific components
│   ├── hooks/             # React hooks
│   └── lib/
│       ├── queryClient.ts
│       └── queryKeys.ts
├── lib/
│   └── utils.ts
├── types/
│   └── next-auth.d.ts    # Type extensions
└── tests/
    ├── unit/            # Domain logic tests
    ├── integration/     # API integration tests
    └── components/      # React component tests
```

## Architectural Layers

### 1. Domain Layer (`src/server/core/`)

**Purpose:** Encapsulate business logic completely independent of frameworks or infrastructure.

**Core Principles:**
- ✅ Domain entities, interfaces, errors, and value objects
- ❌ NO framework imports (`next`, `@prisma/client`, `ioredis`, etc.)
- ❌ NO infrastructure code
- ✅ All logic expressed through `Result<T, E>` (no exceptions for business errors)

**Key Components:**

#### Entities
Pure TypeScript objects representing domain concepts.

```typescript
// src/server/core/domain/entities/Notification.ts
export interface Notification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly channel: NotificationChannel;
  readonly status: NotificationStatus;
  readonly userId: string; // Multi-tenancy requirement
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

#### Interfaces (Ports)
Contracts that infrastructure adapters must implement.

```typescript
// src/server/core/domain/interfaces/INotificationChannel.ts
export interface INotificationChannel {
  readonly name: NotificationChannel;
  isAvailable(): boolean;
  send(notification: Notification): Promise<Result<void, DomainError>>;
}
```

#### Services
Orchestrate domain logic using injected repositories and channels.

```typescript
// src/server/core/services/NotificationService.ts
export class NotificationService {
  constructor(
    private readonly channels: INotificationChannel[],
    private readonly writer: INotificationWriter,
    private readonly reader: INotificationReader,
  ) {}

  async deliver(notification: Notification): Promise<Result<Notification>> {
    // Find appropriate channel
    // Dispatch notification
    // Update status
    // Return Result<Notification> or Result.fail(error)
  }
}
```

#### Result Pattern
Explicit, type-safe error handling.

```typescript
// src/server/core/domain/result/Result.ts
export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Why not exceptions?** Exceptions hide code paths and make error handling implicit. Results are explicit and traceable.

### 2. Infrastructure Layer (`src/server/lib/`)

**Purpose:** Bridge domain logic to external services (database, queue, HTTP, etc.).

**Key Responsibilities:**
- Implement domain interfaces
- Configure external services
- Handle concrete error scenarios

#### Repositories
Prisma implementations of `INotificationReader` and `INotificationWriter`.

```typescript
// src/server/core/repositories/PrismaNotificationRepository.ts
export class PrismaNotificationRepository 
  implements INotificationReader, INotificationWriter
{
  async findById(id: string, userId: string): Promise<Result<Notification>> {
    try {
      const row = await this.prisma.notification.findFirst({
        where: { id, userId }, // Auto-isolation
      });
      return row ? ok(toDomain(row)) : fail(new NotificationNotFound(id));
    } catch (err) {
      return fail(new DatabaseError(err));
    }
  }
}
```

#### Channels (Adapters)
Concrete implementations of `INotificationChannel`.

```typescript
// src/server/core/channels/EmailChannel.ts
export class EmailChannel implements INotificationChannel {
  readonly name = "email";
  
  async send(notification: Notification): Promise<Result<void>> {
    try {
      await this.transport.sendMail({ /* ... */ });
      return ok(undefined);
    } catch (err) {
      return fail(new SendError(err));
    }
  }
}
```

#### Environment Validation
Centralized, typed configuration via Zod.

```typescript
// src/server/lib/env.ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RATE_LIMIT_MAX: z.coerce.number().default(20),
  NEXTAUTH_SECRET: z.string().min(32),
  // ...
});

export const env = EnvSchema.parse(process.env);
```

**Benefits:**
- Type-safe across the app (import `env` instead of `process.env`)
- Fails at startup if config is invalid
- Single source of truth for all variables

#### Queue (BullMQ)
Background job processing.

```typescript
// src/server/workers/notificationWorker.ts
const worker = new Worker<NotificationJobData>(NOTIFICATION_QUEUE, async (job) => {
  const notification = await notificationService.findByIdInternal(job.data.notificationId);
  if (!notification.ok) {
    logger.error("Notification not found", { jobId: job.id });
    return;
  }
  
  await notificationService.deliver(notification.value);
});
```

### 3. Application Layer (`src/app/`)

**Purpose:** Handle HTTP requests and responses. Thin layer that delegates to domain logic.

#### API Routes (Next.js)
Receive requests → Validate → Call service → Return response.

```typescript
// src/app/api/notifications/route.ts
export async function POST(req: NextRequest) {
  // 1. Authenticate & extract userId
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // 2. Parse & validate input
  const parsed = SendNotificationSchema.safeParse(await req.json());

  // 3. Call service
  const createResult = await notificationService.createPending({
    title: parsed.data.title,
    body: parsed.data.body,
    channel: parsed.data.channel,
    userId, // Multi-tenancy isolation
    correlationId,
  });

  if (!createResult.ok) {
    return NextResponse.json(
      { error: createResult.error.code },
      { status: createResult.error.statusCode },
    );
  }

  // 4. Enqueue delivery
  try {
    await notificationQueue.add("send", { notificationId: createResult.value.id });
  } catch (err) {
    // Rollback on enqueue failure
    await notificationService.markAsDeleted(createResult.value.id, userId);
    return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
  }

  return NextResponse.json({ jobId, correlationId }, { status: 202 });
}
```

#### Multi-Tenancy Enforcement
Every query filters by `userId`:

```typescript
// ✅ Correct: findAll filtered by userId
const notifications = await notificationService.findAll(userId);

// ❌ Never: unfiltered queries
const allNotifications = await notificationService.findAll();
```

### 4. Client Layer (`src/client/`)

**Purpose:** React components and hooks for the dashboard.

#### Data Fetching (TanStack Query)
React Query handles caching and synchronization.

```typescript
// src/client/hooks/useNotifications.ts
export function useNotifications(userId: string) {
  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => fetch(`/api/notifications?userId=${userId}`).then(r => r.json()),
  });
}
```

#### Components
TypeScript-first, no logic in JSX.

```typescript
// src/client/components/NotificationList.tsx
export function NotificationList({ userId }: { userId: string }) {
  const { data, isLoading } = useNotifications(userId);

  if (isLoading) return <LoadingSkeleton />;
  return <ul>{data?.map(n => <NotificationCard key={n.id} notification={n} />)}</ul>;
}
```

## Architectural Decisions (ADRs)

### ADR 001: Manual DI over Framework
**Decision:** Use manual dependency injection instead of decorators.
**Rationale:** Explicit, testable, framework-agnostic.
**Impact:** Container wiring in `src/server/lib/container.ts`.

### ADR 002: Result Pattern instead of Exceptions
**Decision:** Return `Result<T, E>` from service methods, not throw.
**Rationale:** Explicit error paths, easier testing, type safety.
**Impact:** All domain services return Result types. No exception handling in business tests.

### ADR 003: Domain Isolation from Next.js
**Decision:** `src/server/core/` has zero framework imports.
**Rationale:** Extract business logic to standalone packages. Test without environments.
**Enforcement:** ESLint `boundaries` plugin blocks framework imports in core.
**Impact:** Domain is framework-agnostic and maximally testable.

## Enforcement Mechanisms

### ESLint Boundaries
Prevent architectural violations at development time.

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
            "disallow": [["lib"], ["app"], ["client"]],
            "message": "Core domain cannot depend on infrastructure. See ADR 003."
          }
        ]
      }
    ]
  }
}
```

Run `npm run lint` to verify compliance.

### Sliding Window Rate Limiting
Per-IP rate limiting using Redis sorted sets.

```typescript
// src/server/lib/rateLimit.ts
export async function isRateLimited(key: string): Promise<boolean> {
  const rk = redisKey(key);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(rk, 0, windowStart); // Remove expired
  pipeline.zadd(rk, now, uniqueMember); // Add current
  pipeline.zcard(rk); // Count in window
  pipeline.expire(rk, WINDOW_S + 10); // Auto-cleanup

  const results = await pipeline.exec();
  const count = results[2][1] as number;
  
  return count > MAX;
}
```

**Why Sliding Window?** Fixed windows allow bursts at boundaries. Sliding window provides true rate limiting.

### Request Correlation
Trace requests end-to-end via `correlationId`.

```typescript
// src/server/lib/correlationId.ts
export function withCorrelationId(
  id: string | null | undefined,
  fn: () => Promise<Response>
): Promise<Response> {
  return AsyncLocalStorage.run(id, fn);
}

// Later, in any layer:
const correlationId = getCorrelationId(); // Returns current context ID
logger.info("Processing", { correlationId });
```

## Best Practices

### 1. Dependency Injection
Inject into constructors, resolve in one place (container).

```typescript
// ✅ Correct
class NotificationService {
  constructor(
    private reader: INotificationReader,
    private writer: INotificationWriter,
  ) {}
}

// ❌ Wrong
class NotificationService {
  async findById(id: string) {
    const prisma = await getPrisma(); // Service locator
  }
}
```

### 2. Error Handling
Domain errors via Result, HTTP errors via NextResponse.

```typescript
// Domain layer
const result = await service.deliver(notification);
if (!result.ok) {
  return { error: result.error.code, status: result.error.statusCode };
}

// Application layer
return NextResponse.json(
  { error: "NOT_FOUND", message: result.error.message },
  { status: result.error.statusCode }
);
```

### 3. Transactions & Rollback
Ensure consistency on partial failures.

```typescript
// When enqueue fails after DB insert, rollback:
try {
  await queue.add("send", { notificationId: notification.id });
} catch (err) {
  await notificationService.markAsDeleted(notification.id, userId);
  return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
}
```

### 4. Multi-Tenancy
**Every** read/write must filter by userId.

```typescript
// ✅ Correct
const notifications = await repo.findAll(userId);
  
// ❌ Wrong
const notifications = await repo.findAll(); // Leaks cross-tenant data
```

## Testing Strategy

### Unit Tests (Domain Logic)
Mock interfaces. No database, no HTTP.

```typescript
// src/tests/unit/NotificationService.test.ts
const mockChannel = {
  isAvailable: vi.fn().mockReturnValue(true),
  send: vi.fn().mockResolvedValue(ok(undefined)),
};

const result = await service.deliver(notification);
expect(mockChannel.send).toHaveBeenCalledWith(notification);
```

### Integration Tests (API Routes)
Real database (test DB), real queue.

```typescript
// src/tests/integration/notifications.test.ts
const response = await POST(req);
expect(response.status).toBe(202);

// Verify job was queued
const job = await queue.getJob(jobId);
expect(job.data.notificationId).toBe(expectedId);
```

## Environment Variables

See [Environment Variables Documentation](./environment-variables.md).

**Critical Variables:**
- `DATABASE_URL` — PostgreSQL connection (required)
- `NEXTAUTH_SECRET` — JWT signing key, min 32 chars (required)
- `REDIS_URL` — Redis connection (default: `redis://localhost:6379`)

## Performance Considerations

### Sliding Window Rate Limiting
O(1) Redis operations using sorted sets and pipelines.

### Atomic Updates
Use `update()` instead of `updateMany() + findFirst()` for single-record changes.

```typescript
// ✅ Atomic
const updated = await prisma.notification.update({
  where: { id, userId },
  data: { status: "sent" },
});

// ❌ Race condition
const result = await prisma.notification.updateMany({
  where: { id, userId },
  data: { status: "sent" },
});
const updated = await prisma.notification.findFirst({ where: { id } });
```

### Eager Loading
Fetch required relations upfront to avoid N+1 queries.

```typescript
// ✅ Correct
const notifications = await prisma.notification.findMany({
  where: { userId },
  include: { template: true }, // Eager load if needed
});
```

## Monitoring & Debugging

### Logging
Structured JSON logs with correlation IDs.

```typescript
logger.info("Notification sent", {
  notificationId: notification.id,
  userId: notification.userId,
  correlationId: getCorrelationId(),
  durationMs: Date.now() - startTime,
});
```

### Analytics
Count notifications by status and channel, aggregated per user.

```typescript
// src/app/api/analytics/route.ts
const [byStatus, byChannel] = await Promise.all([
  prisma.notification.groupBy({
    by: ["status"],
    where: { userId },
    _count: { status: true },
  }),
  // ...
]);
```

## Security

### Input Validation
Zod schemas validate all inputs before reaching domain logic.

```typescript
const SendNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  channel: z.enum(["email", "webhook", "in-app"]),
});
```

### Authentication
NextAuth with JWT session + userId injection into all domain operations.

### Rate Limiting
Sliding window per IP prevents abuse.

## Future Improvements

- [ ] Event sourcing for notification history
- [ ] WebSocket subscriptions for real-time updates
- [ ] Template versioning and rollback
- [ ] Multi-region delivery and failover
- [ ] Webhook retry policies and exponential backoff
- [ ] Analytics dashboards (Grafana/Metabase)
