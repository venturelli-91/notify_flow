import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notificationService } from "@server/lib/container";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import { isRateLimited, getRateLimitState } from "@server/lib/rateLimit";

// ── Validation schema ─────────────────────────────────────────────────────────

const SendNotificationSchema = z.object({
	title: z.string().min(1).max(100),
	body: z.string().min(1).max(1000),
	channel: z.enum(["email", "webhook", "in-app"]),
	metadata: z.record(z.unknown()).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientIp(req: NextRequest): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
	);
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

		// Dispatch
		const result = await notificationService.send({
			...parsed.data,
			correlationId,
		});

		const ms = Date.now() - start;

		if (!result.ok) {
			logger.error("Failed to send notification", {
				error: result.error.message,
				ms,
			});
			return NextResponse.json(
				{ error: result.error.code },
				{ status: result.error.statusCode },
			);
		}

		logger.info("Notification sent", { id: result.value.id, ms });
		return NextResponse.json({ data: result.value, correlationId }, { status: 201 });
	});
}
