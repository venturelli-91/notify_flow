import { NextRequest, NextResponse } from "next/server";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import { env } from "@server/lib/env";

/**
 * Channel availability is derived from environment variables, not from
 * the channel instances in container.ts. This keeps the route free of
 * concrete class imports and matches the ISP principle: the client only
 * needs name + isAvailable, not the full INotificationChannel interface.
 */
const CHANNELS = [
	{
		name: "email" as const,
		isAvailable: !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS,
	},
	{
		name: "webhook" as const,
		isAvailable: !!env.WEBHOOK_URL,
	},
	{
		name: "in-app" as const,
		isAvailable: true, // always on — no external dependency
	},
];

// ── GET /api/channels ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();

		logger.info("GET /api/channels");

		return NextResponse.json({ data: CHANNELS, correlationId });
	});
}
