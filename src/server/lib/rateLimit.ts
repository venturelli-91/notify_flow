/**
 * Redis sliding-window rate limiter.
 *
 * Algorithm: fixed window using INCR + EXPIRE atomic pair.
 *   - Key: `rl:{key}:{window_bucket}` (TTL = WINDOW_S)
 *   - On first increment Redis sets TTL automatically → window resets cleanly.
 *   - All counters are stored in Redis → safe across multiple Next.js instances.
 *
 * Falls back to the in-memory store when Redis is unavailable so that
 * local dev without a running Redis container still works.
 */

import { redis } from "./redis";

const MAX = Number(process.env["RATE_LIMIT_MAX"] ?? 20);
const WINDOW_S = Number(process.env["RATE_LIMIT_WINDOW_S"] ?? 60);
const WINDOW_MS = WINDOW_S * 1_000;

// ── Fallback in-memory store (used when Redis is unreachable) ─────────────────

interface WindowEntry {
	count: number;
	resetAt: number;
}
const memStore = new Map<string, WindowEntry>();

function memIsRateLimited(key: string): boolean {
	const now = Date.now();
	const entry = memStore.get(key);
	if (!entry || now >= entry.resetAt) {
		memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}
	entry.count += 1;
	return entry.count > MAX;
}

function memGetState(key: string): { remaining: number; resetAt: number } {
	const now = Date.now();
	const entry = memStore.get(key);
	if (!entry || now >= entry.resetAt)
		return { remaining: MAX, resetAt: now + WINDOW_MS };
	return {
		remaining: Math.max(0, MAX - entry.count),
		resetAt: entry.resetAt,
	};
}

// ── Redis helpers ─────────────────────────────────────────────────────────────

/** Bucket key changes every WINDOW_S seconds → automatic window rotation. */
function redisKey(key: string): string {
	const bucket = Math.floor(Date.now() / WINDOW_MS);
	return `rl:${key}:${bucket}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the caller has exceeded the rate limit.
 * Always async — callers must await.
 */
export async function isRateLimited(key: string): Promise<boolean> {
	try {
		const rk = redisKey(key);
		// INCR is atomic. On the first call for this key/window the value is 1.
		const count = await redis.incr(rk);
		if (count === 1) {
			// First request in this window — set TTL so Redis auto-cleans old keys.
			await redis.expire(rk, WINDOW_S + 1);
		}
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
		const [countStr, ttlSec] = await Promise.all([
			redis.get(rk),
			redis.ttl(rk),
		]);
		const count = Number(countStr ?? 0);
		const ttl = ttlSec > 0 ? ttlSec : WINDOW_S;
		return {
			remaining: Math.max(0, MAX - count),
			resetAt: Date.now() + ttl * 1_000,
		};
	} catch {
		return memGetState(key);
	}
}

