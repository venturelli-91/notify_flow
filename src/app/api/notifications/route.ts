import { NextRequest, NextResponse } from "next/server";
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

function clientIp(req: NextRequest): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
	);
}

/**
 * Returns a 401 response when the API_KEY env var is set and the request
 * does not present a matching Bearer token. Returns null when auth passes.
 *
 * When API_KEY is unset the guard is disabled — useful for local development.
 */
function checkApiKey(req: NextRequest): NextResponse | null {
	const apiKey = process.env["API_KEY"];
	if (!apiKey) return null; // auth disabled

	const auth = req.headers.get("authorization");
	if (auth !== `Bearer ${apiKey}`) {
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
		if (isRateLimited(ip)) {
			const { resetAt } = getRateLimitState(ip);
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

		// Enqueue — the worker calls notificationService.send() asynchronously.
		let jobId: string | undefined;
		try {
			const job = await notificationQueue.add("send", {
				...parsed.data,
				correlationId,
			});
			jobId = job.id;
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Queue unavailable";
			logger.error("Failed to enqueue notification", { error: msg, ip });
			return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
		}

		const ms = Date.now() - start;
		logger.info("Notification enqueued", { jobId, ms });

		return NextResponse.json({ jobId, correlationId }, { status: 202 });
	});
}
