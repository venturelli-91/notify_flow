# ADR 004 — TanStack Query for All Server State

**Date:** 2025-01-01
**Status:** Accepted

## Context

The dashboard needs to display a live list of notifications and update it
immediately when a new one is sent. The naive approach is:

```tsx
const [notifications, setNotifications] = useState<Notification[]>([])
useEffect(() => { fetch('/api/notifications').then(...) }, [])
```

This has well-known drawbacks: no caching, no deduplication, hand-rolled loading
and error states, and optimistic updates require significant plumbing.

## Decision

TanStack Query v5 owns **all server state**. No `useState` holds remote data
anywhere in the codebase.

Key configuration decisions:

| Setting | Value | Reason |
|---|---|---|
| `staleTime` (queries) | 30 s | Prevents thundering herd on navigation |
| `staleTime` (channels) | 5 min | Config is process-bound; rarely changes |
| `retry` (queries) | 1 | One retry tolerates transient network blips |
| `retry` (mutations) | 0 | Sending a notification twice is a bug |

Optimistic updates in `useNotifications.mutation`:

1. `onMutate` — snapshot current list, inject a synthetic `Notification` with
   `status: "pending"` at the top
2. `onError` — rollback to snapshot
3. `onSettled` — `invalidateQueries` so the real server state wins

The optimistic entry's `status: "pending"` causes `<Badge>` to render with
`animate-pulse` automatically — no special-case logic needed.

## Consequences

**Positive**

- Background refetch, deduplication and cache invalidation come for free.
- Optimistic update lifecycle is declarative and testable (`onMutate`/
  `onError`/`onSettled`).
- `renderWithProviders` in tests wraps a fresh `QueryClient` per test, so
  cache isolation is guaranteed.
- Industry standard; reviewers will recognise the pattern immediately.

**Negative**

- Adds a dependency (~15 kB gzip).
- Tests that render connected components require `QueryClientProvider` (solved
  by `renderWithProviders`).

## Files

- [`src/client/lib/queryClient.ts`](../../src/client/lib/queryClient.ts) — global defaults
- [`src/client/lib/queryKeys.ts`](../../src/client/lib/queryKeys.ts) — key factory
- [`src/client/hooks/useNotifications.ts`](../../src/client/hooks/useNotifications.ts) — full optimistic update
- [`src/client/hooks/useChannels.ts`](../../src/client/hooks/useChannels.ts) — read-only with 5 min stale
- [`src/client/components/Providers.tsx`](../../src/client/components/Providers.tsx) — `QueryClientProvider` boundary
