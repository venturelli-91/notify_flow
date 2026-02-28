import { describe, it, expect, vi, type Mock } from "vitest";
import { NotificationService } from "@server/core/services/NotificationService";
import type { INotificationChannel } from "@server/core/domain/interfaces/INotificationChannel";
import type { INotificationReader } from "@server/core/domain/interfaces/INotificationReader";
import type { INotificationWriter } from "@server/core/domain/interfaces/INotificationWriter";
import { ok, fail } from "@server/core/domain/result/Result";
import type { Notification } from "@server/core/domain/entities/Notification";
import { DatabaseError } from "@server/core/domain/errors/NotificationErrors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: "notif-1",
		title: "Test",
		body: "Body",
		channel: "email",
		status: "pending",
		readAt: null,
		metadata: null,
		correlationId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeWriter(notification: Notification): INotificationWriter & {
	create: Mock;
	updateStatus: Mock;
	markAllRead: Mock;
	markAllUnread: Mock;
	delete: Mock;
} {
	return {
		create: vi.fn().mockResolvedValue(ok(notification)),
		updateStatus: vi
			.fn()
			.mockResolvedValue(ok({ ...notification, status: "sent" })),
		markAllRead: vi.fn().mockResolvedValue(ok(undefined)),
		markAllUnread: vi.fn().mockResolvedValue(ok(undefined)),
		delete: vi.fn().mockResolvedValue(ok(undefined)),
	};
}

function makeReader(
	notification: Notification = makeNotification(),
): INotificationReader & { findAll: Mock; findById: Mock } {
	return {
		findAll: vi.fn().mockResolvedValue(ok([notification])),
		findById: vi.fn().mockResolvedValue(ok(notification)),
	};
}

function makeChannel(
	name: string,
	available = true,
): INotificationChannel & { send: Mock; isAvailable: Mock } {
	return {
		name,
		isAvailable: vi.fn().mockReturnValue(available),
		send: vi.fn().mockResolvedValue(ok(undefined)),
	};
}

// ── deliver() — channel dispatch ─────────────────────────────────────────────

describe("NotificationService.deliver()", () => {
	it("dispatches to the correct channel by name", async () => {
		const notification = makeNotification({ channel: "email" });
		const emailChannel = makeChannel("email");
		const webhookChannel = makeChannel("webhook");
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[emailChannel, webhookChannel],
			writer,
			makeReader(notification),
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(true);
		expect(emailChannel.send).toHaveBeenCalledWith(notification);
		expect(webhookChannel.send).not.toHaveBeenCalled();
	});

	it("returns fail(ChannelUnavailable) when no matching channel is registered", async () => {
		const notification = makeNotification({ channel: "webhook" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[makeChannel("email")],
			writer,
			makeReader(notification),
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("CHANNEL_UNAVAILABLE");
	});

	it("returns fail(ChannelUnavailable) when channel.isAvailable() is false", async () => {
		const notification = makeNotification({ channel: "email" });
		const unavailableEmail = makeChannel("email", false);
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[unavailableEmail],
			writer,
			makeReader(notification),
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("CHANNEL_UNAVAILABLE");
	});

	it("updates status to 'sent' after successful delivery", async () => {
		const notification = makeNotification({ channel: "email" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[makeChannel("email")],
			writer,
			makeReader(notification),
		);

		const result = await service.deliver(notification);

		expect(result.ok).toBe(true);
		expect(writer.updateStatus).toHaveBeenCalledWith(notification.id, "sent");
	});

	it("updates status to 'failed' when channel.send() returns a failure", async () => {
		const notification = makeNotification({ channel: "email" });
		const brokenChannel = makeChannel("email");
		brokenChannel.send.mockResolvedValue(
			fail(new DatabaseError("SMTP timeout")),
		);
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[brokenChannel],
			writer,
			makeReader(notification),
		);

		await service.deliver(notification);

		expect(writer.updateStatus).toHaveBeenCalledWith(notification.id, "failed");
	});
});

// ── createPending() ───────────────────────────────────────────────────────────

describe("NotificationService.createPending()", () => {
	it("stores correlationId on the created notification", async () => {
		const notification = makeNotification({ correlationId: "req-xyz" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[makeChannel("email")],
			writer,
			makeReader(notification),
		);

		await service.createPending({
			title: "Test",
			body: "Body",
			channel: "email",
			correlationId: "req-xyz",
		});

		expect(writer.create).toHaveBeenCalledWith(
			expect.objectContaining({ correlationId: "req-xyz" }),
		);
	});
});

// ── read operations ───────────────────────────────────────────────────────────

describe("NotificationService.findAll()", () => {
	it("delegates to reader.findAll()", async () => {
		const notification = makeNotification();
		const reader = makeReader(notification);
		const service = new NotificationService(
			[],
			makeWriter(notification),
			reader,
		);

		const result = await service.findAll();

		expect(result.ok).toBe(true);
		expect(reader.findAll).toHaveBeenCalledOnce();
		if (result.ok) expect(result.value).toEqual([notification]);
	});
});

describe("NotificationService.findById()", () => {
	it("delegates to reader.findById()", async () => {
		const notification = makeNotification({ id: "notif-42" });
		const reader = makeReader(notification);
		const service = new NotificationService(
			[],
			makeWriter(notification),
			reader,
		);

		const result = await service.findById("notif-42");

		expect(result.ok).toBe(true);
		expect(reader.findById).toHaveBeenCalledWith("notif-42");
	});
});

// ── write operations ──────────────────────────────────────────────────────────

describe("NotificationService.markAllRead()", () => {
	it("delegates to writer.markAllRead()", async () => {
		const notification = makeNotification();
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[],
			writer,
			makeReader(notification),
		);

		const result = await service.markAllRead();

		expect(result.ok).toBe(true);
		expect(writer.markAllRead).toHaveBeenCalledOnce();
	});
});

describe("NotificationService.markAllUnread()", () => {
	it("delegates to writer.markAllUnread()", async () => {
		const notification = makeNotification();
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[],
			writer,
			makeReader(notification),
		);

		const result = await service.markAllUnread();

		expect(result.ok).toBe(true);
		expect(writer.markAllUnread).toHaveBeenCalledOnce();
	});
});

describe("NotificationService.retry()", () => {
	it("calls writer.updateStatus with 'pending'", async () => {
		const notification = makeNotification({ id: "notif-5" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[],
			writer,
			makeReader(notification),
		);

		await service.retry("notif-5");

		expect(writer.updateStatus).toHaveBeenCalledWith("notif-5", "pending");
	});
});

describe("NotificationService.markAsDeleted()", () => {
	it("calls writer.delete with the given id", async () => {
		const notification = makeNotification({ id: "notif-9" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[],
			writer,
			makeReader(notification),
		);

		const result = await service.markAsDeleted("notif-9", "user-1");

		expect(result.ok).toBe(true);
		expect(writer.delete).toHaveBeenCalledWith("notif-9");
	});
});
