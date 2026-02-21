/**
 * Integration tests — POST /api/notifications
 *
 * Runs against a real Prisma client connected to TEST_DATABASE_URL.
 * Requires a running Postgres instance (see docker-compose.yml).
 *
 * Start the test DB before running:
 *   docker compose up -d postgres
 *   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *   npx vitest run src/tests/integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/notifications/route";
import { prisma } from "@server/lib/prisma";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostRequest(
	body: unknown,
	headers: Record<string, string> = {},
): NextRequest {
	return new NextRequest("http://localhost/api/notifications", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Forwarded-For": "127.0.0.1",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
	return new NextRequest("http://localhost/api/notifications", {
		method: "GET",
		headers,
	});
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
	await prisma.notification.deleteMany();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/notifications", () => {
	it("returns 201 with correct shape on valid payload", async () => {
		const req = makePostRequest({
			title: "Deploy succeeded",
			body: "main branch deployed to production",
			channel: "in-app",
		});

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.data).toMatchObject({
			title: "Deploy succeeded",
			body: "main branch deployed to production",
			channel: "in-app",
		});
		expect(json.data.id).toBeTruthy();
	});

	it("status is 'sent' after in-app delivery (always available)", async () => {
		const req = makePostRequest({
			title: "Test",
			body: "Body",
			channel: "in-app",
		});

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.data.status).toBe("sent");
	});

	it("returns 422 on invalid payload — missing title", async () => {
		const req = makePostRequest({ body: "No title here", channel: "in-app" });
		const res = await POST(req);
		expect(res.status).toBe(422);
		const json = await res.json();
		expect(json.error).toBe("INVALID_PAYLOAD");
	});

	it("returns 422 on invalid payload — unknown channel", async () => {
		const req = makePostRequest({
			title: "Test",
			body: "Body",
			channel: "sms",
		});
		const res = await POST(req);
		expect(res.status).toBe(422);
	});

	it("propagates X-Correlation-ID from header into response", async () => {
		const req = makePostRequest(
			{ title: "T", body: "B", channel: "in-app" },
			{ "X-Correlation-ID": "test-corr-id-123" },
		);

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.correlationId).toBe("test-corr-id-123");
		expect(json.data.correlationId).toBe("test-corr-id-123");
	});

	it("returns 429 after exceeding rate limit (21st request from same IP)", async () => {
		// Send 20 requests to fill the window
		for (let i = 0; i < 20; i++) {
			const req = makePostRequest(
				{ title: `T${i}`, body: "B", channel: "in-app" },
				{ "X-Forwarded-For": "10.0.0.1" },
			);
			await POST(req);
		}

		// 21st request should be rate-limited
		const req = makePostRequest(
			{ title: "Over limit", body: "B", channel: "in-app" },
			{ "X-Forwarded-For": "10.0.0.1" },
		);
		const res = await POST(req);
		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBeTruthy();
	});
});

describe("GET /api/notifications", () => {
	it("returns an empty list when no notifications exist", async () => {
		const res = await GET(makeGetRequest());
		const json = await res.json();
		expect(res.status).toBe(200);
		expect(json.data).toEqual([]);
	});

	it("returns existing notifications sorted newest-first", async () => {
		await prisma.notification.createMany({
			data: [
				{
					title: "First",
					body: "B",
					channel: "in-app",
					status: "sent",
				},
				{
					title: "Second",
					body: "B",
					channel: "in-app",
					status: "sent",
				},
			],
		});

		const res = await GET(makeGetRequest());
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data).toHaveLength(2);
		// newest first
		expect(json.data[0].title).toBe("Second");
	});
});
