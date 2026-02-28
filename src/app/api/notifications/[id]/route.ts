import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { notificationService } from "@server/lib/container";
import { withCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import { env } from "@server/lib/env";

// ── POST /api/notifications/[id]/retry ────────────────────────────────────────

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const { id } = await params;
		const start = Date.now();

		logger.info("POST /api/notifications/[id]/retry", { id });

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

		// Verify notification exists and belongs to user
		const findResult = await notificationService.findById(id, userId);
		if (!findResult.ok) {
			return NextResponse.json(
				{ error: findResult.error.code },
				{ status: findResult.error.statusCode },
			);
		}

		const updateResult = await notificationService.retry(id, userId);

		if (!updateResult.ok) {
			return NextResponse.json(
				{ error: updateResult.error.code },
				{ status: updateResult.error.statusCode },
			);
		}

		const ms = Date.now() - start;
		logger.info("Notification retried", { id, ms });

		return NextResponse.json({ ok: true });
	});
}

// ── DELETE /api/notifications/[id] ────────────────────────────────────────────

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const { id } = await params;
		const start = Date.now();

		logger.info("DELETE /api/notifications/[id]", { id });

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

		// Verify notification exists and belongs to user
		const findResult = await notificationService.findById(id, userId);
		if (!findResult.ok) {
			return NextResponse.json(
				{ error: findResult.error.code },
				{ status: findResult.error.statusCode },
			);
		}

		const deleteResult = await notificationService.markAsDeleted(id, userId);

		if (!deleteResult.ok) {
			return NextResponse.json(
				{ error: deleteResult.error.code },
				{ status: deleteResult.error.statusCode },
			);
		}

		const ms = Date.now() - start;
		logger.info("Notification deleted", { id, ms });

		return NextResponse.json({ ok: true });
	});
}
