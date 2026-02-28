# Environment Variable Validation

## Overview

All environment variables are validated at application startup using Zod. This ensures type safety, clear error messages, and prevents silent failures from undefined configuration.

## Usage

**✅ DO**: Import from `@server/lib/env`

```typescript
import { env } from "@server/lib/env";

const redisUrl = env.REDIS_URL;
const maxRequests = env.RATE_LIMIT_MAX;
```

**❌ DON'T**: Access `process.env` directly

```typescript
// Bad - no type safety, no validation
const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const max = Number(process.env["RATE_LIMIT_MAX"] ?? 20);
```

## Required Variables

These must be set in your `.env` file:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5433/notifyflow
NEXTAUTH_SECRET=your-secret-at-least-32-chars
```

## Optional Variables

These have sensible defaults:

```bash
# Redis & Queue
REDIS_URL=redis://localhost:6379  # default

# Rate Limiting
RATE_LIMIT_MAX=20                 # default
RATE_LIMIT_WINDOW_S=60           # default

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=587                     # default
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Webhook
WEBHOOK_URL=
WEBHOOK_SECRET=

# Environment
NODE_ENV=development              # default
```

## Validation Behavior

**On Startup**: If validation fails, the application crashes with a clear error message:

```
ZodError: [
  {
    "code": "too_small",
    "minimum": 32,
    "type": "string",
    "path": ["NEXTAUTH_SECRET"],
    "message": "NEXTAUTH_SECRET must be at least 32 characters"
  }
]
```

This is **intentional** — it's better to fail fast than to run with misconfigured services.

## Adding New Variables

1. Update the schema in `src/server/lib/env.ts`:

```typescript
const EnvSchema = z.object({
	// ... existing vars
	MY_NEW_VAR: z.string().min(1, "MY_NEW_VAR is required"),
});
```

2. Use it anywhere:

```typescript
import { env } from "@server/lib/env";
console.log(env.MY_NEW_VAR);
```

3. TypeScript will enforce the new variable across the codebase automatically.

## Benefits

- ✅ **Type Safety**: Full TypeScript support with autocomplete
- ✅ **Fail Fast**: Errors at startup, not in production
- ✅ **Single Source of Truth**: No scattered defaults across files
- ✅ **Clear Documentation**: Schema serves as living documentation
- ✅ **Easy Refactoring**: Rename/change vars in one place
