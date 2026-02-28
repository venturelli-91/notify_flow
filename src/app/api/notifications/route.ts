import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@server/lib/auth";
import {
	notificationService,
	templateReader,
	templateService,
} from "@server/lib/container";
import { notificationQueue } from "@server/lib/queue";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import { isRateLimited, getRateLimitState } from "@server/lib/rateLimit";

// ── Validation schema ─────────────────────────────────────────────────────────

const SendNotificationSchema = z.object({
	title: z.string().min(1).max(100).optional(),
	body: z.string().min(1).max(1000).optional(),
	channel: z.enum(["email", "webhook", "in-app"]),
	metadata: z.record(z.string(), z.unknown()).optional(),
	templateId: z.string().optional(),
	templateContext: z.record(z.string(), z.string()).optional(),
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

		// Get userId from session or API header
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id ?? req.headers.get("x-user-id");

		if (!userId) {
			return NextResponse.json(
				{ error: "UNAUTHORIZED", message: "User ID required" },
				{ status: 401 },
			);
		}

		const result = await notificationService.findAll(userId);
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

		// Get userId from session or API header
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id ?? req.headers.get("x-user-id");

		if (!userId) {
			return NextResponse.json(
				{ error: "UNAUTHORIZED", message: "User ID required" },
				{ status: 401 },
			);
		}

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
				? await notificationService.markAllRead(userId)
				: await notificationService.markAllUnread(userId);

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

		// Get userId from session or API header
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id ?? req.headers.get("x-user-id");

		if (!userId) {
			return NextResponse.json(
				{ error: "UNAUTHORIZED", message: "User ID required" },
				{ status: 401 },
			);
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
		let requestBody: unknown;
		try {
			requestBody = await req.json();
		} catch {
			return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
		}

		// Validate
		const parsed = SendNotificationSchema.safeParse(requestBody);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "INVALID_PAYLOAD",
					details: parsed.error.flatten().fieldErrors,
				},
				{ status: 422 },
			);
		}

		// Either (title + body) OR templateId must be provided
		if (!parsed.data.templateId && (!parsed.data.title || !parsed.data.body)) {
			return NextResponse.json(
				{
					error: "INVALID_PAYLOAD",
					message: "Either provide title+body or templateId",
				},
				{ status: 422 },
			);
		}

		let title = parsed.data.title ?? "";
		let body = parsed.data.body ?? "";
		const templateId: string | undefined = parsed.data.templateId;

		// If templateId provided, render the template
		if (parsed.data.templateId) {
			const templateResult = await templateReader.findById(
				parsed.data.templateId,
			);
			if (!templateResult.ok) {
				logger.error("Template not found", {
					templateId: parsed.data.templateId,
					error: templateResult.error.message,
				});
				return NextResponse.json(
					{ error: templateResult.error.code },
					{ status: templateResult.error.statusCode },
				);
			}

			const template = templateResult.value;
			const context = parsed.data.templateContext ?? {};

			const renderResult = templateService.renderTemplate(template, context);
			if (!renderResult.ok) {
				logger.error("Template rendering failed", {
					templateId: parsed.data.templateId,
					error: renderResult.error.message,
				});
				return NextResponse.json(
					{ error: renderResult.error.code },
					{ status: renderResult.error.statusCode },
				);
			}

			title = renderResult.value.subject;
			body = renderResult.value.body;
		}

		// Persist the record immediately so it appears in the dashboard as "pending"
		const createResult = await notificationService.createPending({
			title,
			body,
			channel: parsed.data.channel,
			metadata: parsed.data.metadata,
			correlationId,
			userId,
			templateId,
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
				title,
				body,
				channel: parsed.data.channel,
				metadata: parsed.data.metadata,
				correlationId,
			});
			jobId = job.id;
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Queue unavailable";
			logger.error("Failed to enqueue notification", {
				error: msg,
				ip,
				notificationId: notification.id,
			});

			// Rollback: delete the orphaned record since it will never be processed
			const deleteResult = await notificationService.softDelete(
				notification.id,
				userId,
			);
			if (!deleteResult.ok) {
				logger.error("Failed to rollback notification after enqueue failure", {
					notificationId: notification.id,
					error: deleteResult.error.message,
				});
			}

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
