import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@server/lib/prisma";
import { env } from "@server/lib/env";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";

// ── GET /api/analytics ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();

		logger.info("GET /api/analytics");

		// x-user-id is injected by middleware from the verified JWT (spoofing-safe).
		const userId =
			req.headers.get("x-user-id") ??
			((await getToken({ req, secret: env.NEXTAUTH_SECRET }))?.id as string | undefined);

		if (!userId) {
			return NextResponse.json(
				{ error: "UNAUTHORIZED", message: "Authentication required" },
				{ status: 401 },
			);
		}

		const [byStatus, byChannel] = await Promise.all([
			prisma.notification.groupBy({
				by: ["status"],
				where: { userId },
				_count: { status: true },
			}),
			prisma.notification.groupBy({
				by: ["channel"],
				where: { userId },
				_count: { channel: true },
			}),
		]);

		const count = (groups: typeof byStatus, key: string) =>
			groups.find((g) => g.status === key)?._count.status ?? 0;

		const countChannel = (groups: typeof byChannel, key: string) =>
			groups.find((g) => g.channel === key)?._count.channel ?? 0;

		const sent = count(byStatus, "sent");
		const failed = count(byStatus, "failed");
		const pending = count(byStatus, "pending");
		const total = sent + failed + pending;
		const deliveryRate =
			sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : null;

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
