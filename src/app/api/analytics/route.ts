import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@server/lib/prisma";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";

// ── GET /api/analytics ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();

		logger.info("GET /api/analytics");

		const [byStatus, byChannel] = await Promise.all([
			prisma.notification.groupBy({
				by: ["status"],
				_count: { _all: true },
			}),
			prisma.notification.groupBy({
				by: ["channel"],
				_count: { _all: true },
			}),
		]);

		const count = (groups: typeof byStatus, key: string) =>
			groups.find((g) => g.status === key)?._count._all ?? 0;

		const countChannel = (groups: typeof byChannel, key: string) =>
			groups.find((g) => g.channel === key)?._count._all ?? 0;

		const sent = count(byStatus, "sent");
		const failed = count(byStatus, "failed");
		const pending = count(byStatus, "pending");
		const total = sent + failed + pending;
		const deliveryRate =
			sent + failed > 0
				? Math.round((sent / (sent + failed)) * 100)
				: null;

		return NextResponse.json({
			data: {
				total,
				sent,
				failed,
				pending,
				deliveryRate,
				byChannel: {
					email: countChannel(byChannel, "email"),
					webhook: countChannel(byChannel, "webhook"),
					inApp: countChannel(byChannel, "in-app"),
				},
			},
			correlationId,
		});
	});
}
