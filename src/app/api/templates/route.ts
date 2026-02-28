import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { templateReader, templateWriter } from "@server/lib/container";
import { withCorrelationId, getCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";

// ── Validation schema ─────────────────────────────────────────────────────────

const CreateTemplateSchema = z.object({
	name: z.string().min(1).max(100),
	subject: z.string().min(1).max(200),
	body: z.string().min(1).max(5000),
});

// ── GET /api/templates ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();
		const start = Date.now();

		logger.info("GET /api/templates");

		const result = await templateReader.findAll();
		const ms = Date.now() - start;

		if (!result.ok) {
			logger.error("Failed to list templates", {
				error: result.error.message,
				ms,
			});
			return NextResponse.json(
				{ error: result.error.code },
				{ status: result.error.statusCode },
			);
		}

		logger.info("Listed templates", { count: result.value.length, ms });
		return NextResponse.json({ data: result.value, correlationId });
	});
}

// ── POST /api/templates ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	return withCorrelationId(req.headers.get("x-correlation-id"), async () => {
		const correlationId = getCorrelationId();
		const start = Date.now();

		logger.info("POST /api/templates");

		// Parse body
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
		}

		// Validate
		const parsed = CreateTemplateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "INVALID_PAYLOAD",
					details: parsed.error.flatten().fieldErrors,
				},
				{ status: 422 },
			);
		}

		// Create template
		const createResult = await templateWriter.create(parsed.data);
		if (!createResult.ok) {
			logger.error("Failed to create template", {
				error: createResult.error.message,
			});
			return NextResponse.json(
				{ error: createResult.error.code },
				{ status: createResult.error.statusCode },
			);
		}

		const ms = Date.now() - start;
		logger.info("Template created", {
			templateId: createResult.value.id,
			name: createResult.value.name,
			ms,
		});

		return NextResponse.json(
			{ data: createResult.value, correlationId },
			{ status: 201 },
		);
	});
}
