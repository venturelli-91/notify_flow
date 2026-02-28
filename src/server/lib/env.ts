/**
 * env.ts — Centralized environment variable validation.
 *
 * All environment variables are validated at startup using Zod.
 * This ensures:
 *   - Type safety throughout the application
 *   - Clear error messages for missing/invalid configuration
 *   - Single source of truth for all environment variables
 *   - No silent failures from undefined env vars
 *
 * Import this instead of accessing process.env directly.
 */

import { z } from "zod";

const EnvSchema = z.object({
	// ── Database ──────────────────────────────────────────────────────────────
	DATABASE_URL: z
		.string()
		.url("DATABASE_URL must be a valid database connection string"),

	// ── Redis & Queue ─────────────────────────────────────────────────────────
	REDIS_URL: z
		.string()
		.url("REDIS_URL must be a valid Redis connection string")
		.default("redis://localhost:6379"),

	// ── Rate Limiting ─────────────────────────────────────────────────────────
	RATE_LIMIT_MAX: z.coerce
		.number()
		.int()
		.positive("RATE_LIMIT_MAX must be a positive integer")
		.default(20),

	RATE_LIMIT_WINDOW_S: z.coerce
		.number()
		.int()
		.positive("RATE_LIMIT_WINDOW_S must be a positive integer")
		.default(60),

	// ── Email (SMTP) ──────────────────────────────────────────────────────────
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().int().positive().default(587),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	SMTP_FROM: z.string().email().optional(),

	// ── Webhook ───────────────────────────────────────────────────────────────
	WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
	WEBHOOK_SECRET: z.string().optional(),

	// ── Authentication ────────────────────────────────────────────────────────
	NEXTAUTH_SECRET: z
		.string()
		.min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

	// Optional API key for programmatic access (disabled when absent)
	API_KEY: z.string().optional(),

	// ── Network / Proxy ───────────────────────────────────────────────────────
	// Comma-separated list of trusted reverse proxy IPs.
	// X-Forwarded-For is only trusted when the direct peer matches this list.
	TRUSTED_PROXY_IPS: z
		.string()
		.default("127.0.0.1,::1,::ffff:127.0.0.1"),

	// ── Environment ───────────────────────────────────────────────────────────
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

/**
 * Validated environment variables.
 *
 * Throws a ZodError with clear messages if validation fails.
 * This intentionally crashes the app at startup rather than failing silently.
 */
export const env = EnvSchema.parse(process.env);

/**
 * Type-safe environment variables.
 * Use this type when you need to reference env shape in other modules.
 */
export type Env = z.infer<typeof EnvSchema>;
