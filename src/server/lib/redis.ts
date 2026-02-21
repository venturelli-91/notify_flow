import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Redis singleton — reuses the same connection across hot-reloads
 * in Next.js development mode.
 *
 * Local : redis://localhost:6379  (Docker Compose)
 * Prod  : rediss://... (Upstash — set REDIS_URL env var)
 */

const globalForRedis = globalThis as unknown as {
	redis: Redis | undefined;
};

function createRedisClient(): Redis {
	const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";

	const client = new Redis(url, {
		maxRetriesPerRequest: 3,
		enableReadyCheck: false,
		// Upstash requires TLS — ioredis handles it automatically when
		// the URL scheme is rediss://
	});

	client.on("error", (err: unknown) => {
		// Log but don't crash — BullMQ and rate limiter will surface errors
		// through their own Result<> paths.
		logger.error("Redis client error", {
			error: err instanceof Error ? err.message : String(err),
		});
	});

	return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient();

if (process.env["NODE_ENV"] !== "production") {
	globalForRedis.redis = redis;
}
