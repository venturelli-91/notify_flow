/**
 * Redis sliding-window rate limiter.
 *
 * Algorithm: sliding window using sorted sets (ZADD + ZREMRANGEBYSCORE).
 *   - Key: `rl:{key}` (TTL = WINDOW_S + buffer)
 *   - Score: timestamp in milliseconds
 *   - Member: `{timestamp}-{random}` to ensure uniqueness
 *   - Remove expired entries, add current request, count total in window
 *   - True sliding window → precise rate limiting across time boundaries
 *
 * Falls back to the in-memory store when Redis is unavailable so that
 * local dev without a running Redis container still works.
 */

import { redis } from "./redis";
import { env } from "./env";

const MAX = env.RATE_LIMIT_MAX;
const WINDOW_S = env.RATE_LIMIT_WINDOW_S;
const WINDOW_MS = WINDOW_S * 1_000;

// ── Fallback in-memory store (used when Redis is unreachable) ─────────────────

// In-memory sliding window: store array of timestamps
const memStore = new Map<string, number[]>();

function memIsRateLimited(key: string): boolean {
	const now = Date.now();
	const windowStart = now - WINDOW_MS;

	// Get or initialize timestamps array
	let timestamps = memStore.get(key) ?? [];

	// Remove expired timestamps
	timestamps = timestamps.filter((ts) => ts > windowStart);

	// Add current timestamp
	timestamps.push(now);
	memStore.set(key, timestamps);

	return timestamps.length > MAX;
}

function memGetState(key: string): { remaining: number; resetAt: number } {
	const now = Date.now();
	const windowStart = now - WINDOW_MS;

	let timestamps = memStore.get(key) ?? [];

	// Remove expired timestamps
	timestamps = timestamps.filter((ts) => ts > windowStart);
	memStore.set(key, timestamps);

	const count = timestamps.length;
	// resetAt = when the oldest request in window expires
	const oldestTimestamp = timestamps[0] ?? now;
	const resetAt = oldestTimestamp + WINDOW_MS;

	return {
		remaining: Math.max(0, MAX - count),
		resetAt,
	};
}

// ── Redis helpers ─────────────────────────────────────────────────────────────

/** Key for sorted set storing request timestamps. */
function redisKey(key: string): string {
	return `rl:${key}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the caller has exceeded the rate limit.
 * Uses sliding window algorithm with Redis sorted sets.
 */
export async function isRateLimited(key: string): Promise<boolean> {
	try {
		const rk = redisKey(key);
		const now = Date.now();
		const windowStart = now - WINDOW_MS;

		// Pipeline multiple Redis commands for efficiency
		const pipeline = redis.pipeline();

		// 1. Remove expired entries (older than window)
		pipeline.zremrangebyscore(rk, 0, windowStart);

		// 2. Add current request timestamp
		// Member format: timestamp-random ensures uniqueness
		const member = `${now}-${Math.random().toString(36).slice(2)}`;
		pipeline.zadd(rk, now, member);

		// 3. Count total requests in window
		pipeline.zcard(rk);

		// 4. Set TTL to auto-cleanup old keys
		pipeline.expire(rk, WINDOW_S + 10);

		const results = await pipeline.exec();

		// ZCARD result is at index 2 (third command)
		const count = results?.[2]?.[1] as number;

		return count > MAX;
	} catch {
		// Redis unavailable — degrade gracefully to in-memory limiter.
		return memIsRateLimited(key);
	}
}

/** Returns remaining requests and resetAt timestamp for Retry-After headers. */
export async function getRateLimitState(
	key: string,
): Promise<{ remaining: number; resetAt: number }> {
	try {
		const rk = redisKey(key);
		const now = Date.now();
		const windowStart = now - WINDOW_MS;

		// Remove expired entries and get count + oldest timestamp
		const pipeline = redis.pipeline();
		pipeline.zremrangebyscore(rk, 0, windowStart);
		pipeline.zcard(rk);
		pipeline.zrange(rk, 0, 0, "WITHSCORES"); // Get oldest entry with score

		const results = await pipeline.exec();

		const count = (results?.[1]?.[1] as number) ?? 0;
		const oldestEntry = results?.[2]?.[1] as string[];

		// Parse oldest timestamp from score
		const oldestTimestamp = oldestEntry?.[1] ? Number(oldestEntry[1]) : now;

		// resetAt = when the oldest request expires from the window
		const resetAt = oldestTimestamp + WINDOW_MS;

		return {
			remaining: Math.max(0, MAX - count),
			resetAt,
		};
	} catch {
		return memGetState(key);
	}
}
