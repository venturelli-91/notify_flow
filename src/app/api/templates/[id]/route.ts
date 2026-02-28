import { NextRequest, NextResponse } from "next/server";
import { templateReader, templateWriter } from "@server/lib/container";
import { withCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";

// ── GET /api/templates/[id] ───────────────────────────────────────────────────

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const { id } = await params;
		const start = Date.now();

		logger.info("GET /api/templates/[id]", { id });

		const result = await templateReader.findById(id);

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error.code },
				{ status: result.error.statusCode },
			);
		}

		const ms = Date.now() - start;
		logger.info("Template retrieved", { id, ms });

		return NextResponse.json({ data: result.value });
	});
}

// ── DELETE /api/templates/[id] ────────────────────────────────────────────────

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const { id } = await params;
		const start = Date.now();

		logger.info("DELETE /api/templates/[id]", { id });

		// Verify template exists
		const findResult = await templateReader.findById(id);
		if (!findResult.ok) {
			return NextResponse.json(
				{ error: findResult.error.code },
				{ status: findResult.error.statusCode },
			);
		}

		const deleteResult = await templateWriter.delete(id);

		if (!deleteResult.ok) {
			return NextResponse.json(
				{ error: deleteResult.error.code },
				{ status: deleteResult.error.statusCode },
			);
		}

		const ms = Date.now() - start;
		logger.info("Template deleted", { id, ms });

		return NextResponse.json({ ok: true });
	});
}
