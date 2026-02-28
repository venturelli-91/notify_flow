# Code Patterns and Development Guidelines

This document defines coding standards, static analysis tools, and development practices for NotifyFlow. The goal is to maintain clean, consistent, and error-free code aligned with modern TypeScript and architectural best practices.

## TypeScript Standards

We enforce strict TypeScript configuration to catch errors at development time.

### Configuration (`tsconfig.json`)

```json
{
	"compilerOptions": {
		"strict": true,
		"noImplicitAny": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"resolveJsonModule": true,
		"isolatedModules": true,
		"jsx": "preserve",
		"moduleResolution": "bundler"
	}
}
```

### Best Practices

1. **Explicit Types:** Always specify return types for functions.

   ```typescript
   // ✅ Correct
   function getUserById(id: string): Promise<Result<User>> { ... }

   // ❌ Wrong (implicit any)
   function getUserById(id: string) { ... }
   ```

2. **No `any`:** Avoid `any` unless dealing with truly dynamic external data. Use `unknown` instead.

   ```typescript
   // ✅ Correct
   function parse(data: unknown): Result<Notification> {
     if (typeof data === "object" && data !== null) { ... }
   }

   // ❌ Wrong
   function parse(data: any): Notification { ... }
   ```

3. **Readonly Properties:** Use `readonly` for immutable objects, especially domain entities.

   ```typescript
   export interface Notification {
   	readonly id: string;
   	readonly userId: string;
   	readonly createdAt: Date;
   }
   ```

4. **Union and Discriminated Unions:** Use for finite state representation.

   ```typescript
   // ✅ Discriminated union for type safety
   type Result<T, E> =
     | { readonly ok: true; readonly value: T }
     | { readonly ok: false; readonly error: E };

   const result: Result<string> = ...;
   if (result.ok) {
     console.log(result.value); // ✅ Automatically knows value exists
   } else {
     console.log(result.error); // ✅ Automatically knows error exists
   }
   ```

## Code Quality Tools

### ESLint

We use ESLint with TypeScript parser and Next.js recommended rules.

**Key Rules:**

- `@typescript-eslint/no-unused-vars` — Enforce unused variable removal
- `boundaries/element-types` — Prevent architectural violations
- `no-restricted-imports` — Block framework imports in domain layer

**Run Locally:**

```bash
npm run lint
```

### Prettier (Auto-Formatting)

Prettier is configured via `.prettierrc` for automatic code formatting.

```json
{
	"semi": true,
	"trailingComma": "all",
	"singleQuote": false,
	"printWidth": 80,
	"useTabs": true,
	"tabWidth": 4
}
```

**Enable editor integration:**

- VS Code: Install Prettier extension, enable "Format on Save"

## Naming Conventions

### TypeScript/JavaScript

- **Files:** `camelCase` for utilities, `PascalCase` for classes/components/types
  - `src/server/lib/env.ts` ✅
  - `src/server/core/services/NotificationService.ts` ✅
  - `src/client/components/NotificationCard.tsx` ✅

- **Variables & Functions:** `camelCase`

  ```typescript
  const notificationId = "notif-123";
  function createNotification(input: CreateNotificationInput): Result<Notification> { ... }
  ```

- **Constants:** `UPPER_SNAKE_CASE`

  ```typescript
  const MAX_RETRIES = 3;
  const NOTIFICATION_QUEUE = "notifications";
  ```

- **Types & Interfaces:** `PascalCase`

  ```typescript
  interface Notification { ... }
  type NotificationStatus = "pending" | "sent" | "failed";
  ```

- **Enums:** `PascalCase` for the enum, `UPPER_SNAKE_CASE` for values
  ```typescript
  enum NotificationChannel {
  	EMAIL = "email",
  	WEBHOOK = "webhook",
  	IN_APP = "in-app",
  }
  ```

### Routes & APIs

- API routes: Kebab-case `/api/notifications`, `/api/channels`
- Database tables: Snake-case `notification`, `user`

## Architectural Patterns

### Services (Business Logic)

Service classes encapsulate business logic and are injectected into routes/workers/tests.

**Rules:**

1. Single Responsibility — One service, one reason to change
2. Dependency Injection — All dependencies in constructor
3. Typed Inputs/Outputs — No ambiguous signatures
4. Result Pattern — Return `Result<T, E>` for explicit error handling

**Template:**

```typescript
// src/server/core/services/NotificationService.ts
import { Result, ok, fail } from "../domain/result/Result";
import type { Notification } from "../domain/entities/Notification";

export class NotificationService {
	constructor(
		private readonly channels: INotificationChannel[],
		private readonly writer: INotificationWriter,
		private readonly reader: INotificationReader,
	) {}

	async deliver(
		notification: Notification,
	): Promise<Result<Notification, DomainError>> {
		const channel = this.channels.find((c) => c.name === notification.channel);

		if (!channel?.isAvailable()) {
			return fail(new ChannelUnavailable(notification.channel));
		}

		const sendResult = await channel.send(notification);
		if (!sendResult.ok) return sendResult;

		const updateResult = await this.writer.updateStatus(
			notification.id,
			"sent",
			notification.userId,
		);

		return updateResult.ok ? ok(updateResult.value) : updateResult;
	}
}
```

### Repositories (Data Access)

Repository classes implement domain interfaces and handle database operations.

**Rules:**

1. Implement domain interfaces (e.g., `INotificationReader`, `INotificationWriter`)
2. Return `Result<T, DomainError>` for error handling
3. Include userId in where clauses (multi-tenancy enforcement)
4. Use atomic operations to prevent race conditions

**Template:**

```typescript
// src/server/core/repositories/PrismaNotificationRepository.ts
export class PrismaNotificationRepository
	implements INotificationReader, INotificationWriter
{
	constructor(private readonly prisma: PrismaClient) {}

	async findById(
		id: string,
		userId: string,
	): Promise<Result<Notification, DomainError>> {
		try {
			const row = await this.prisma.notification.findFirst({
				where: { id, userId }, // ✅ Multi-tenant isolation
			});

			if (!row) return fail(new NotificationNotFound(id));
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async updateStatus(
		id: string,
		status: NotificationStatus,
		userId: string,
	): Promise<Result<Notification, DomainError>> {
		try {
			// ✅ Atomic update with where clause
			const updated = await this.prisma.notification.update({
				where: { id, userId },
				data: { status },
			});
			return ok(toDomain(updated));
		} catch (err) {
			if (err instanceof Prisma.PrismaClientKnownRequestError) {
				if (err.code === "P2025") {
					return fail(new NotificationNotFound(id));
				}
			}
			return fail(new DatabaseError(err));
		}
	}
}
```

### Result Pattern

Explicit error handling using discriminated unions. No exceptions for business errors.

**Benefits:**

- ✅ Explicit error paths (visible in code)
- ✅ Type-safe error handling
- ✅ Composable error chains
- ✅ Easier testing

**Usage:**

```typescript
// Calling a service that returns Result
const result = await notificationService.deliver(notification);

if (!result.ok) {
	// ✅ TypeScript knows result.error exists
	logger.error("Delivery failed", { error: result.error.message });
	return NextResponse.json(
		{ error: result.error.code },
		{ status: result.error.statusCode },
	);
}

// ✅ TypeScript knows result.value exists
logger.info("Delivery succeeded", { notificationId: result.value.id });
return ok(result.value);
```

## Error Handling

### Domain Errors

Domain errors are explicit, structured, and never thrown (except for unexpected failures).

```typescript
// src/server/core/domain/errors/NotificationErrors.ts
import { DomainError } from "./DomainError";

export class NotificationNotFound extends DomainError {
	readonly code = "NOT_FOUND";
	readonly statusCode = 404;

	constructor(id: string) {
		super(`Notification ${id} not found or access denied`);
	}
}

export class ChannelUnavailable extends DomainError {
	readonly code = "CHANNEL_UNAVAILABLE";
	readonly statusCode = 503;

	constructor(channel: string) {
		super(`Channel ${channel} is not available`);
	}
}
```

### HTTP Error Responses

API routes map domain errors to HTTP responses.

```typescript
// src/app/api/notifications/[id]/route.ts
const result = await notificationService.findById(id, userId);

if (!result.ok) {
	return NextResponse.json(
		{
			error: result.error.code,
			message: result.error.message,
		},
		{ status: result.error.statusCode },
	);
}

return NextResponse.json({ data: result.value });
```

### Unexpected Errors

Errors that are truly unexpected (not domain-level) should be logged and a generic 500 returned.

```typescript
try {
	// Database or external service call
	const result = await someUnexpectedOperation();
} catch (err) {
	logger.error("Unexpected error", {
		error: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
	});
	return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}
```

## Data Transfer & Validation

### Input Validation with Zod

All external inputs must be validated using Zod schemas.

```typescript
// src/app/api/notifications/route.ts
const SendNotificationSchema = z.object({
	title: z.string().min(1).max(200),
	body: z.string().min(1).max(2000),
	channel: z.enum(["email", "webhook", "in-app"]),
	metadata: z.record(z.unknown()).optional(),
	templateId: z.string().optional(),
});

const parsed = SendNotificationSchema.safeParse(await req.json());

if (!parsed.success) {
	return NextResponse.json(
		{ error: "INVALID_PAYLOAD", details: parsed.error.flatten() },
		{ status: 422 },
	);
}

// parsed.data is now type-safe
```

### Environment Variables

All environment variables must be validated at startup using Zod.

```typescript
// src/server/lib/env.ts
const EnvSchema = z.object({
	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url().default("redis://localhost:6379"),
	RATE_LIMIT_MAX: z.coerce.number().int().default(20),
	NEXTAUTH_SECRET: z.string().min(32),
});

export const env = EnvSchema.parse(process.env);
```

**Never access `process.env` directly.** Import `env` from `src/server/lib/env.ts`.

```typescript
// ✅ Correct
import { env } from "@server/lib/env";
const redisUrl = env.REDIS_URL;

// ❌ Wrong
const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
```

## Testing Patterns

### Unit Tests (Domain Logic)

Test domain logic in isolation using mocked dependencies.

```typescript
// src/tests/unit/NotificationService.test.ts
describe("NotificationService.deliver()", () => {
	it("dispatches to the correct channel and updates status", async () => {
		const mockChannel = {
			isAvailable: vi.fn().mockReturnValue(true),
			send: vi.fn().mockResolvedValue(ok(undefined)),
		};

		const service = new NotificationService(
			[mockChannel],
			mockWriter,
			mockReader,
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(true);
		expect(mockChannel.send).toHaveBeenCalledWith(notification);
		expect(mockWriter.updateStatus).toHaveBeenCalledProperly();
	});

	it("returns fail(ChannelUnavailable) when channel is unavailable", async () => {
		const unavailableChannel = {
			isAvailable: vi.fn().mockReturnValue(false),
			send: vi.fn(),
		};

		const service = new NotificationService(
			[unavailableChannel],
			mockWriter,
			mockReader,
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("CHANNEL_UNAVAILABLE");
		}
	});
});
```

**Run:**

```bash
npm run test:unit
```

### Integration Tests (API Layer)

Test API routes with real database (test DB) and queue.

```typescript
// src/tests/integration/notifications.test.ts
it("POST /api/notifications enqueues delivery and returns 202", async () => {
	const req = new NextRequest("http://localhost/api/notifications", {
		method: "POST",
		body: JSON.stringify({
			title: "Test",
			body: "Body",
			channel: "email",
		}),
	});

	const response = await POST(req);

	expect(response.status).toBe(202);
	const json = await response.json();
	expect(json.jobId).toBeDefined();

	// Verify job was queued
	const job = await notificationQueue.getJob(json.jobId);
	expect(job?.data.notificationId).toBeDefined();
});
```

**Run:**

```bash
npm run test:integration
```

## Multi-Tenancy & Security

### Strict User Isolation

**Every** read/write operation must filter by `userId`.

```typescript
// ✅ Correct: filtered by userId
const notifications = await notificationService.findAll(userId);

// ❌ Wrong: leaks cross-tenant data
const allNotifications = await notificationService.findAll();
```

### Rate Limiting

Applied per IP using sliding window Redis operations.

```typescript
// src/server/lib/rateLimit.ts
const isLimited = await isRateLimited(ipAddress);
if (isLimited) {
	return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
}
```

## Import Organization

Group imports in the following order:

```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// 2. Internal domain
import { NotificationService } from "@server/core/services/NotificationService";
import type { Notification } from "@server/core/domain/entities/Notification";

// 3. Infrastructure
import { prisma } from "@server/lib/prisma";
import { env } from "@server/lib/env";

// 4. Local
import { queryKeys } from "./queryKeys";
```

### Path Aliases

Use defined path aliases (from `tsconfig.json`) for clean imports:

- `@server/*` → `src/server/*`
- `@client/*` → `src/client/*`

```typescript
// ✅ Correct
import { env } from "@server/lib/env";

// ❌ Wrong (relative imports)
import { env } from "../../../lib/env";
```

## Logging Standards

Use structured JSON logging with correlation IDs.

```typescript
// src/server/lib/logger.ts
import { getCorrelationId } from "./correlationId";

logger.info("Notification sent", {
	notificationId: notification.id,
	userId: notification.userId,
	channel: notification.channel,
	correlationId: getCorrelationId(),
	durationMs: Date.now() - startTime,
});
```

**Key fields:**

- `correlationId` — Trace end-to-end request flow
- `userId` — Multi-tenancy context
- `durationMs` — Performance monitoring
- `error` — When logging errors

## API Design

### HTTP Methods & Status Codes

- `POST /api/notifications` — Create (202 Accepted for async)
- `GET /api/notifications` — List (200 OK)
- `GET /api/notifications/:id` — Read (200 OK)
- `DELETE /api/notifications/:id` — Delete (204 No Content or 200 OK)

### Error Responses

Consistent error format across all endpoints:

```json
{
	"error": "ERROR_CODE",
	"message": "Human-readable message",
	"details": {} // Optional, for validation errors
}
```

### Success Responses

```json
{
	"data": {
		/* entity */
	},
	"correlationId": "req-xyz-123"
}
```

For list endpoints:

```json
{
	"data": [
		/* entities */
	],
	"total": 42,
	"pageSize": 20,
	"page": 1
}
```

## Performance Optimization

### Atomic Database Operations

Use atomic update operations to prevent race conditions.

```typescript
// ✅ Atomic (one query)
const updated = await prisma.notification.update({
	where: { id, userId },
	data: { status: "sent" },
});

// ❌ Race condition (two queries)
const result = await prisma.notification.updateMany({
	where: { id, userId },
	data: { status: "sent" },
});
const updated = await prisma.notification.findFirst({
	where: { id },
});
```

### Query Optimization

Use pagination and eager loading to avoid N+1 queries.

```typescript
// ✅ Paginated with eager load
const notifications = await prisma.notification.findMany({
	where: { userId },
	include: { template: true }, // Eager load if needed
	take: pageSize,
	skip: (page - 1) * pageSize,
	orderBy: { createdAt: "desc" },
});

// ❌ Unbounded query
const allNotifications = await prisma.notification.findMany({
	where: { userId },
});
```

## Documentation

### Code Comments

Use JSDoc for public APIs:

```typescript
/**
 * Deliver a notification through its designated channel.
 *
 * @param notification - The notification entity to deliver
 * @returns Result containing the updated notification or error
 *
 * @example
 * const result = await notificationService.deliver(notification);
 * if (result.ok) {
 *   console.log("Sent:", result.value.id);
 * }
 */
async deliver(
  notification: Notification,
): Promise<Result<Notification, DomainError>> { ... }
```

### ADR (Architectural Decision Records)

Document major decisions in `docs/decisions/`:

```markdown
# ADR 003 — Domain Isolation from Next.js

**Date:** 2025-01-01  
**Status:** Accepted

## Context

Business logic should not depend on framework implementations.

## Decision

`src/server/core/` contains zero framework imports.

## Consequences

- ✅ Unit tests run in plain Node environment
- ✅ Domain can be extracted to npm package
- ❌ Requires discipline and ESLint enforcement
```

## Useful Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting (auto-fix)
npm run lint --fix

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm run test

# Build
npm run build

# Development server
npm run dev
```

## References

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Zod Validation](https://zod.dev/)
- [Vitest Testing](https://vitest.dev/)
- [ESLint Configuration](https://eslint.org/docs/rules/)
