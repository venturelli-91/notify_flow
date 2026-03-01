# NotifyFlow

A self-hosted, multi-tenant notification delivery engine with multi-channel support (email, webhook, in-app). Built with Clean Architecture principles, strict TypeScript, and comprehensive testing.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis)
![Vitest](https://img.shields.io/badge/Vitest-tested-6e9f18?logo=vitest)

---

## 📋 About

NotifyFlow is a production-ready notification system designed for reliability, testability, and scalability. It separates domain logic from infrastructure, enforces strict multi-tenancy isolation, and provides explicit error handling via the Result pattern.

### Core Features

- **Multi-Channel Delivery:** Email (SMTP), Webhooks, In-App notifications
- **Domain-Driven Design:** Business logic completely isolated from Next.js
- **Result Pattern:** Explicit error handling without exceptions
- **Multi-Tenancy:** Strict per-user data isolation at every layer
- **Background Processing:** BullMQ + Redis for async delivery
- **Rate Limiting:** Sliding window per IP
- **Request Correlation:** End-to-end tracing with correlation IDs
- **Comprehensive Testing:** Unit + Integration tests with full coverage
- **Environment Validation:** Centralized Zod schema for all config
- **Architectural Enforcement:** ESLint boundaries prevent framework imports in core

## 🏗️ Technology Stack

## 🏗️ Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Next.js 14 (API routes)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 15 (Prisma ORM)
- **Cache:** Redis 7 (BullMQ, rate limiting)
- **Queue:** BullMQ (background jobs)
- **Authentication:** NextAuth.js (JWT)
- **Validation:** Zod
- **Testing:** Vitest + React Testing Library
- **HTTP Client:** TanStack Query v5 (client-side)

### Docker Services

```yaml
services:
  postgres: # Main database (port 5433)
  redis: # Queue & cache (port 6379)
  app: # Next.js server (port 3000)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js:** 18+ (or use `asdf` / `nvm`)
- **Docker + Docker Compose**
- **Git**

#### Windows

On Windows, use **WSL2** (Ubuntu recommended) + Docker Desktop with WSL2 backend:

- WSL2: https://learn.microsoft.com/windows/wsl/install
- Docker Desktop + WSL2: https://docs.docker.com/desktop/features/wsl/

Keep the repo inside WSL filesystem (e.g., `/home/<user>/...`) to avoid I/O slowness.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/venturelli-91/notify_flow.git
   cd notify_flow
   ```

2. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

3. **Start services**

   ```bash
   docker compose up -d
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Run migrations**

   ```bash
   npm run migrations
   ```

6. **Seed database (optional)**

   ```bash
   npm run seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

Access the app at http://localhost:3000

## 🛠️ Development

### Project Structure

```
src/
├── server/
│   ├── core/                         # Domain layer (ZERO framework imports)
│   │   ├── domain/
│   │   │   ├── entities/             # Notification, User, etc.
│   │   │   ├── errors/               # Domain-specific errors
│   │   │   ├── interfaces/           # INotificationChannel, IRepository
│   │   │   └── result/               # Result<T, E> type
│   │   ├── services/                 # Business logic
│   │   │   ├── NotificationService.ts
│   │   │   └── TemplateService.ts
│   │   ├── channels/                 # Channel implementations (adapters)
│   │   │   ├── EmailChannel.ts
│   │   │   ├── WebhookChannel.ts
│   │   │   └── InAppChannel.ts
│   │   └── repositories/             # Prisma adapters
│   │       └── PrismaNotificationRepository.ts
│   ├── lib/                          # Infrastructure & utilities
│   │   ├── env.ts                    # ✅ Centralized env validation
│   │   ├── prisma.ts                 # Database client
│   │   ├── redis.ts                  # Redis client
│   │   ├── queue.ts                  # BullMQ setup
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── container.ts              # Dependency injection
│   │   ├── logger.ts                 # Logging
│   │   ├── correlationId.ts          # Request tracing
│   │   └── rateLimit.ts              # Rate limiting
│   └── workers/
│       └── notificationWorker.ts     # BullMQ processor
├── app/                              # Next.js app layer
│   ├── api/
│   │   ├── notifications/            # Create, list, update
│   │   ├── channels/                 # Available channels
│   │   ├── analytics/                # Stats & metrics
│   │   └── auth/                     # NextAuth routes
│   ├── (dashboard)/                  # Protected routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── analytics/
│   │   ├── channels/
│   │   ├── send/
│   │   ├── team/
│   │   └── help/
│   ├── login/
│   └── layout.tsx
├── client/                           # Client-side code
│   ├── components/
│   │   ├── ui/                       # Reusable components
│   │   └── notifications/            # Feature components
│   ├── hooks/
│   │   ├── useNotifications.ts
│   │   ├── useChannels.ts
│   │   └── useAnalytics.ts
│   └── lib/
│       ├── queryClient.ts
│       └── queryKeys.ts
├── lib/
│   └── utils.ts                      # Shared utilities
├── types/
│   └── next-auth.d.ts                # Type extensions
└── tests/
    ├── unit/                         # Domain logic tests
    ├── integration/                  # API integration tests
    └── components/                   # React tests
```

## 📦 Environment Variables

See [docs/environment-variables.md](docs/environment-variables.md) for complete reference.

**Critical variables:**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/notifyflow

# Redis & Queue
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters

# Email (SMTP) - optional
SMTP_HOST=
SMTP_USER=
SMTP_PASS=

# Webhook - optional
WEBHOOK_URL=

# Rate Limiting
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_S=60
```

## 💻 Commands

### Development

```bash
# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint & format
npm run lint
npm run lint --fix

# Testing
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test              # All tests
```

### Database

```bash
# Run migrations
npm run migrations

# Seed database
npm run seed

# Reset database
npm run db:reset
```

### Docker

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis

# Access database
docker compose exec postgres psql -U postgres -d notifyflow

# Access Redis
docker compose exec redis redis-cli
```

## 🏗️ Architecture Principles

### 1. **Domain Isolation** (ADR 003)

The `src/server/core/` directory contains **zero framework imports**.

```typescript
// ✅ Correct (in domain layer)
import { Result } from "../domain/result/Result";
import type { Notification } from "../domain/entities/Notification";

// ❌ Wrong (would trigger ESLint error)
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
```

### 2. **Result Pattern** (ADR 002)

All operations return explicit `Result<T, E>` types instead of throwing exceptions.

```typescript
// Domain layer
const result = await notificationService.deliver(notification);

if (!result.ok) {
	logger.error("Delivery failed", { error: result.error.message });
	return { error: result.error.code, status: result.error.statusCode };
}

// result.value is guaranteed to exist
return { data: result.value };
```

### 3. **Dependency Injection** (ADR 001)

No service locators. All dependencies explicitly injected via constructor.

```typescript
class NotificationService {
	constructor(
		private readonly channels: INotificationChannel[],
		private readonly writer: INotificationWriter,
		private readonly reader: INotificationReader,
	) {}
}

// Wired in container.ts, resolved once per app
```

### 4. **Multi-Tenancy**

**Every** query filters by `userId`:

```typescript
// ✅ Correct
const notifications = await repo.findAll(userId);

// ❌ Never (data leak)
const notifications = await repo.findAll();
```

## 🧪 Testing

### Unit Tests (Domain Logic)

```bash
npm run test:unit
```

Test domain services in isolation with mocked dependencies — no database, no HTTP.

```typescript
describe("NotificationService.deliver()", () => {
	it("dispatches to correct channel and updates status", async () => {
		const mockChannel = { send: vi.fn().mockResolvedValue(ok(undefined)) };
		const service = new NotificationService([mockChannel], writer, reader);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(true);
		expect(mockChannel.send).toHaveBeenCalledWith(notification);
	});
});
```

### Integration Tests (API Routes)

```bash
npm run test:integration
```

Test API routes with real database (test DB) and queue.

```typescript
it("POST /api/notifications enqueues delivery", async () => {
	const response = await POST(req);
	expect(response.status).toBe(202);

	const json = await response.json();
	const job = await notificationQueue.getJob(json.jobId);
	expect(job?.data.notificationId).toBeDefined();
});
```

## 🔒 Security

- ✅ **Multi-tenancy:** Strict `userId` isolation in all queries
- ✅ **Rate Limiting:** Sliding window per IP (Redis)
- ✅ **Input Validation:** Zod schemas for all external inputs
- ✅ **Authentication:** JWT via NextAuth.js
- ✅ **Environment Validation:** Config validation at startup
- ✅ **Correlation Tracking:** Request-level tracing
- ✅ **Atomic Operations:** No race conditions
- ✅ **Structured Logging:** Full audit trail

## 📈 Performance

- **Atomic Updates:** Single DB operation instead of fetch + update
- **Slide Window Rate Limiting:** O(1) Redis operations with pipelines
- **Pagination:** Prevent unbounded queries
- **Eager Loading:** Fetch required relations upfront
- **Connection Pooling:** Optimized Prisma + PostgreSQL settings
- **Redis Caching:** Session + object cache

## 📚 Documentation

- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) — Detailed architecture & ADRs
- [**CODE_PATTERNS.md**](docs/CODE_PATTERNS.md) — Coding standards & patterns
- [**environment-variables.md**](docs/environment-variables.md) — Configuration reference

## 🤝 Contributing

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and test:

   ```bash
   npm run test
   npm run lint --fix
   ```

3. Commit with semantic messages:

   ```bash
   git commit -m "feat: add email template support"
   ```

4. Push and create a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Code Quality

- ✅ **TypeScript:** Strict mode enforced
- ✅ **ESLint:** Boundaries plugin prevents architectural violations
- ✅ **Testing:** Unit + integration coverage
- ✅ **Formatting:** Prettier auto-format on save
- ✅ **Pre-commit:** Lint checks before commit

## 📝 Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for scheduled notifications
fix: prevent race condition in updateStatus
docs: update architecture guide
test: improve NotificationService coverage
chore: upgrade dependencies
refactor: extract TemplateRenderer logic
```

## 🚨 Troubleshooting

### Port already in use

Change ports in `.env`:

```bash
APP_PORT=3001
```

### Database connection error

Check PostgreSQL is running:

```bash
docker compose ps
docker compose logs postgres
```

### Redis queue not processing

Verify worker is running and Redis accessible:

```bash
docker compose logs app
redis-cli ping
```

### Tests failing

Clean and reinstall:

```bash
rm -rf node_modules .next
npm install
npm run migrations
npm run test
```

## 🔗 Useful Links

**Documentation:**

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [CODE_PATTERNS.md](docs/CODE_PATTERNS.md)
- [environment-variables.md](docs/environment-variables.md)

**Stack:**

- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Zod Validation](https://zod.dev/)
- [Vitest Testing](https://vitest.dev/)
- [NextAuth.js](https://next-auth.js.org/)
- [TanStack Query](https://tanstack.com/query/latest)

**Tools:**

- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/documentation)
- [Docker](https://docs.docker.com/)

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

## 🆘 Support

For issues, questions, or suggestions:

- Open an [issue on GitHub](https://github.com/venturelli-91/notify_flow/issues)
- Check existing [documentation](docs/)

---

**Built by [Venturelli](https://github.com/venturelli-91)**
