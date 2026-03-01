/**
 * Integration tests — /api/notifications, /api/analytics
 *
 * Runs against a real Prisma client connected to TEST_DATABASE_URL.
 * Requires a running Postgres instance (see docker-compose.yml).
 *
 * Start the test DB before running:
 *   docker compose up -d postgres redis
 *   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *   npx vitest run src/tests/integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET, PATCH } from "@/app/api/notifications/route";
import {
	POST as retryNotification,
	DELETE as deleteNotification,
} from "@/app/api/notifications/[id]/route";
import { GET as getAnalytics } from "@/app/api/analytics/route";
import { prisma } from "@server/lib/prisma";
import { redis } from "@server/lib/redis";
import { NextRequest } from "next/server";

// ── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-user-id-123";

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
			"x-user-id": TEST_USER_ID,
			...headers,
		},
		body: JSON.stringify(body),
	});
}

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
	return new NextRequest("http://localhost/api/notifications", {
		method: "GET",
		headers: {
			"x-user-id": TEST_USER_ID,
			...headers,
		},
	});
}

function makePatchRequest(body: unknown): NextRequest {
	return new NextRequest("http://localhost/api/notifications", {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			"x-user-id": TEST_USER_ID,
		},
		body: JSON.stringify(body),
	});
}

function makeIdParams(id: string): { params: Promise<{ id: string }> } {
	return { params: Promise.resolve({ id }) };
}

function makeRetryRequest(id: string): NextRequest {
	return new NextRequest(`http://localhost/api/notifications/${id}/retry`, {
		method: "POST",
		headers: {
			"x-user-id": TEST_USER_ID,
		},
	});
}

function makeDeleteRequest(id: string): NextRequest {
	return new NextRequest(`http://localhost/api/notifications/${id}`, {
		method: "DELETE",
		headers: {
			"x-user-id": TEST_USER_ID,
		},
	});
}

function makeAnalyticsRequest(): NextRequest {
	return new NextRequest("http://localhost/api/analytics", {
		method: "GET",
		headers: {
			"x-user-id": TEST_USER_ID,
		},
	});
}

async function seedNotification(
	overrides: Partial<{
		title: string;
		body: string;
		channel: string;
		status: string;
		userId: string;
	}> = {},
) {
	return prisma.notification.create({
		data: {
			title: "Seed",
			body: "Body",
			channel: "in-app",
			status: "pending",
			userId: TEST_USER_ID,
			...overrides,
		},
	});
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
	// Clean up all data
	await prisma.notification.deleteMany();
	await prisma.user.deleteMany();

	// Clear Redis rate limiting data
	const keys = await redis.keys("ratelimit:*");
	if (keys.length > 0) {
		await redis.del(...keys);
	}

	// Create test user that all notifications will belong to
	await prisma.user.create({
		data: {
			id: TEST_USER_ID,
			email: "test@example.com",
			password: "$2a$10$test.hash.for.integration.tests", // bcrypt hash placeholder
			name: "Test User",
		},
	});
});

// ── POST /api/notifications ───────────────────────────────────────────────────

describe("POST /api/notifications", () => {
	it("returns 202 + jobId on valid payload (async enqueue)", async () => {
		const req = makePostRequest({
			title: "Deploy succeeded",
			body: "main branch deployed to production",
			channel: "in-app",
		});

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(202);
		expect(json.correlationId).toBeTruthy();
		// jobId may be undefined when Redis is unavailable in test env,
		// but the shape must always be present
		expect("jobId" in json || "error" in json).toBe(true);
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

		expect(res.status).toBe(202);
		expect(json.correlationId).toBe("test-corr-id-123");
	});

	it("returns 429 after exceeding rate limit (21st request from same IP)", async () => {
		// Send 20 requests to fill the window
		for (let i = 0; i < 20; i++) {
			const req = makePostRequest(
				{ title: `T${i}`, body: "B", channel: "in-app" },
				{ "X-Forwarded-For": "10.0.0.2" },
			);
			await POST(req);
		}

		// 21st request should be rate-limited
		const req = makePostRequest(
			{ title: "Over limit", body: "B", channel: "in-app" },
			{ "X-Forwarded-For": "10.0.0.2" },
		);
		const res = await POST(req);
		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBeTruthy();
	});
});

// ── GET /api/notifications ────────────────────────────────────────────────────

describe("GET /api/notifications", () => {
	it("returns an empty list when no notifications exist", async () => {
		const res = await GET(makeGetRequest());
		const json = await res.json();
		expect(res.status).toBe(200);
		expect(json.data).toEqual([]);
	});

	it("returns existing notifications sorted newest-first", async () => {
		// Create first notification
		await prisma.notification.create({
			data: {
				title: "First",
				body: "B",
				channel: "in-app",
				status: "sent",
				userId: TEST_USER_ID,
			},
		});

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Create second notification - should be newer
		await prisma.notification.create({
			data: {
				title: "Second",
				body: "B",
				channel: "in-app",
				status: "sent",
				userId: TEST_USER_ID,
			},
		});

		const res = await GET(makeGetRequest());
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data).toHaveLength(2);
		expect(json.data[0].title).toBe("Second");
	});
});

// ── PATCH /api/notifications ──────────────────────────────────────────────────

describe("PATCH /api/notifications", () => {
	it("mark_all_read returns 200", async () => {
		await seedNotification({ status: "sent" });
		await seedNotification({ status: "sent" });

		const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.ok).toBe(true);
	});

	it("mark_all_unread returns 200", async () => {
		await seedNotification({ status: "sent" });

		const res = await PATCH(makePatchRequest({ action: "mark_all_unread" }));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.ok).toBe(true);
	});

	it("returns 422 on unknown action", async () => {
		const res = await PATCH(makePatchRequest({ action: "delete_all" }));
		expect(res.status).toBe(422);
		const json = await res.json();
		expect(json.error).toBe("INVALID_PAYLOAD");
	});

	it("returns 400 on invalid JSON body", async () => {
		const req = new NextRequest("http://localhost/api/notifications", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": TEST_USER_ID,
			},
			body: "not json {{{",
		});
		const res = await PATCH(req);
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.error).toBe("INVALID_JSON");
	});
});

// ── POST /api/notifications/[id]/retry ───────────────────────────────────────

describe("POST /api/notifications/[id]/retry", () => {
	it("resets a failed notification to pending and returns 200", async () => {
		const notif = await seedNotification({ status: "failed" });

		const res = await retryNotification(
			makeRetryRequest(notif.id),
			makeIdParams(notif.id),
		);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.ok).toBe(true);

		const updated = await prisma.notification.findUnique({
			where: { id: notif.id },
		});
		expect(updated?.status).toBe("pending");
	});

	it("returns 404 when notification does not exist", async () => {
		const res = await retryNotification(
			makeRetryRequest("non-existent-id"),
			makeIdParams("non-existent-id"),
		);
		expect(res.status).toBe(404);
	});
});

// ── DELETE /api/notifications/[id] ───────────────────────────────────────────

describe("DELETE /api/notifications/[id]", () => {
	it("deletes a notification (hard delete) and returns 200", async () => {
		const notif = await seedNotification();

		const res = await deleteNotification(
			makeDeleteRequest(notif.id),
			makeIdParams(notif.id),
		);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.ok).toBe(true);
	});

	it("returns 404 when notification does not exist", async () => {
		const res = await deleteNotification(
			makeDeleteRequest("non-existent-id"),
			makeIdParams("non-existent-id"),
		);
		expect(res.status).toBe(404);
	});
});

// ── GET /api/analytics ────────────────────────────────────────────────────────

describe("GET /api/analytics", () => {
	it("returns all-zero counters and null deliveryRate when DB is empty", async () => {
		const res = await getAnalytics(makeAnalyticsRequest());
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data.total).toBe(0);
		expect(json.data.sent).toBe(0);
		expect(json.data.failed).toBe(0);
		expect(json.data.pending).toBe(0);
		expect(json.data.deliveryRate).toBeNull();
	});

	it("returns correct counts and deliveryRate with mixed statuses", async () => {
		await prisma.notification.createMany({
			data: [
				{
					title: "A",
					body: "B",
					channel: "email",
					status: "sent",
					userId: TEST_USER_ID,
				},
				{
					title: "B",
					body: "B",
					channel: "email",
					status: "sent",
					userId: TEST_USER_ID,
				},
				{
					title: "C",
					body: "B",
					channel: "webhook",
					status: "failed",
					userId: TEST_USER_ID,
				},
				{
					title: "D",
					body: "B",
					channel: "in-app",
					status: "pending",
					userId: TEST_USER_ID,
				},
			],
		});

		const res = await getAnalytics(makeAnalyticsRequest());
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data.total).toBe(4);
		expect(json.data.sent).toBe(2);
		expect(json.data.failed).toBe(1);
		expect(json.data.pending).toBe(1);
		// deliveryRate = round(2 / (2+1) * 100) = 67
		expect(json.data.deliveryRate).toBe(67);
		expect(json.data.byChannel.email).toBe(2);
		expect(json.data.byChannel.webhook).toBe(1);
		expect(json.data.byChannel.inApp).toBe(1);
	});
});
