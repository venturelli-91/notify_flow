import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { notificationService } from "@server/lib/container";
import { notificationQueue } from "@server/lib/queue";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import { isRateLimited, getRateLimitState } from "@server/lib/rateLimit";

// ── Validation schema ─────────────────────────────────────────────────────────

const SendNotificationSchema = z.object({
	title: z.string().min(1).max(100),
	body: z.string().min(1).max(1000),
	channel: z.enum(["email", "webhook", "in-app"]),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the real client IP.
 *
 * X-Forwarded-For is only trusted when the direct peer (REMOTE_ADDR) is a
 * known reverse proxy. Without this check an attacker can set the header
 * themselves and rotate IPs to bypass rate limiting.
 *
 * Set TRUSTED_PROXY_IPS="127.0.0.1,::1,10.0.0.1" to match your infra.
 * Defaults to loopback only (safe for local dev + single-proxy setups).
 */
const TRUSTED_PROXIES = new Set(
	(process.env["TRUSTED_PROXY_IPS"] ?? "127.0.0.1,::1,::ffff:127.0.0.1")
		.split(",")
		.map((ip) => ip.trim()),
);

function clientIp(req: NextRequest): string {
	// Next.js exposes the direct peer address here (not spoofable by the client).
	const remoteAddr = req.headers.get("x-real-ip") ?? "anonymous";

	if (TRUSTED_PROXIES.has(remoteAddr)) {
		// Request came through a trusted proxy — the first entry in
		// X-Forwarded-For is the real client IP.
		const forwarded = req.headers.get("x-forwarded-for");
		if (forwarded) return forwarded.split(",")[0]!.trim();
	}

	return remoteAddr;
}

/**
 * Returns a 401 response when API_KEY is set and the token doesn't match.
 *
 * Uses timingSafeEqual to prevent timing attacks — a plain string comparison
 * (auth !== expected) short-circuits on the first differing byte, leaking
 * information about how much of the token is correct.
 *
 * Returns null when auth passes or API_KEY is unset (local dev).
 */
function checkApiKey(req: NextRequest): NextResponse | null {
	const apiKey = process.env["API_KEY"];
	if (!apiKey) return null; // auth disabled in local dev

	const auth = req.headers.get("authorization") ?? "";
	const expected = `Bearer ${apiKey}`;

	// Buffers must be the same byte-length for timingSafeEqual.
	// Pad/truncate to expected.length so the comparison is always O(N).
	const providedBuf = Buffer.alloc(expected.length);
	providedBuf.write(auth.slice(0, expected.length));
	const expectedBuf = Buffer.from(expected);

	if (!timingSafeEqual(providedBuf, expectedBuf)) {
		return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
	}
	return null;
}

// ── GET /api/notifications ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();
		const start = Date.now();

		logger.info("GET /api/notifications");

		// ── Auth ────────────────────────────────────────────────────────────────
		const authError = checkApiKey(req);
		if (authError) {
			logger.warn("Unauthorized GET rejected", {
				ip: clientIp(req),
			});
			return authError;
		}

		const result = await notificationService.findAll();
		const ms = Date.now() - start;

		if (!result.ok) {
			logger.error("Failed to list notifications", {
				error: result.error.message,
				ms,
			});
			return NextResponse.json(
				{ error: result.error.code },
				{ status: result.error.statusCode },
			);
		}

		logger.info("Listed notifications", { count: result.value.length, ms });
		return NextResponse.json({ data: result.value, correlationId });
	});
}

// ── PATCH /api/notifications ──────────────────────────────────────────────────

const BulkActionSchema = z.object({
	action: z.enum(["mark_all_read", "mark_all_unread"]),
});

export async function PATCH(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const authError = checkApiKey(req);
		if (authError) return authError;

		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
		}

		const parsed = BulkActionSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 422 });
		}

		const result =
			parsed.data.action === "mark_all_read"
				? await notificationService.markAllRead()
				: await notificationService.markAllUnread();

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error.code },
				{ status: result.error.statusCode },
			);
		}

		return NextResponse.json({ ok: true });
	});
}

// ── POST /api/notifications ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();
		const ip = clientIp(req);
		const start = Date.now();

		logger.info("POST /api/notifications", { ip });

		// Auth
		const authError = checkApiKey(req);
		if (authError) {
			logger.warn("Unauthorized request rejected", { ip });
			return authError;
		}

		// Rate limiting
		if (await isRateLimited(ip)) {
			const { resetAt } = await getRateLimitState(ip);
			logger.warn("Rate limit exceeded", { ip, resetAt });
			return NextResponse.json(
				{ error: "RATE_LIMIT_EXCEEDED" },
				{
					status: 429,
					headers: {
						"Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
					},
				},
			);
		}

		// Parse body
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
		}

		// Validate
		const parsed = SendNotificationSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "INVALID_PAYLOAD",
					details: parsed.error.flatten().fieldErrors,
				},
				{ status: 422 },
			);
		}

		// Persist the record immediately so it appears in the dashboard as "pending"
		const createResult = await notificationService.createPending({
			...parsed.data,
			correlationId,
		});
		if (!createResult.ok) {
			logger.error("Failed to persist notification", {
				error: createResult.error.message,
				ip,
			});
			return NextResponse.json(
				{ error: createResult.error.code },
				{ status: createResult.error.statusCode },
			);
		}
		const notification = createResult.value;

		// Enqueue delivery — the worker calls notificationService.deliver()
		let jobId: string | undefined;
		try {
			const job = await notificationQueue.add("send", {
				notificationId: notification.id,
				...parsed.data,
				correlationId,
			});
			jobId = job.id;
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Queue unavailable";
			logger.error("Failed to enqueue notification", { error: msg, ip });
			// Record is already in DB as "pending" — worker retry not possible,
			// so mark it failed immediately.
			await notificationService.deliver(notification);
			return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
		}

		const ms = Date.now() - start;
		logger.info("Notification created and enqueued", {
			notificationId: notification.id,
			jobId,
			ms,
		});

		return NextResponse.json(
			{ jobId, correlationId, notificationId: notification.id },
			{ status: 202 },
		);
	});
}
