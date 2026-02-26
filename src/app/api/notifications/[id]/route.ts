import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@server/lib/container";
import { withCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";

// ── POST /api/notifications/[id]/retry ────────────────────────────────────────

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const { id } = await params;
		const start = Date.now();

		logger.info("POST /api/notifications/[id]/retry", { id });

		// Verify notification exists
		const findResult = await notificationService.findById(id);
		if (!findResult.ok) {
			return NextResponse.json(
				{ error: findResult.error.code },
				{ status: findResult.error.statusCode },
			);
		}

		const updateResult = await notificationService.retry(id);

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

		// Verify notification exists
		const findResult = await notificationService.findById(id);
		if (!findResult.ok) {
			return NextResponse.json(
				{ error: findResult.error.code },
				{ status: findResult.error.statusCode },
			);
		}

		const deleteResult = await notificationService.softDelete(id);

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
