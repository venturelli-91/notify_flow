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
		metadata: null,
		correlationId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeWriter(
	notification: Notification,
): INotificationWriter & { create: Mock; updateStatus: Mock } {
	return {
		create: vi.fn().mockResolvedValue(ok(notification)),
		updateStatus: vi
			.fn()
			.mockResolvedValue(ok({ ...notification, status: "sent" })),
	};
}

function makeReader(): INotificationReader {
	return {
		findAll: vi.fn().mockResolvedValue(ok([])),
		findById: vi.fn().mockResolvedValue(ok(makeNotification())),
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotificationService", () => {
	it("dispatches to the correct channel by name", async () => {
		const notification = makeNotification({ channel: "email" });
		const emailChannel = makeChannel("email");
		const webhookChannel = makeChannel("webhook");
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[emailChannel, webhookChannel],
			writer,
			makeReader(),
		);

		const result = await service.send({
			title: "Test",
			body: "Body",
			channel: "email",
		});

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
			makeReader(),
		);

		const result = await service.send({
			title: "Test",
			body: "Body",
			channel: "webhook",
		});

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
			makeReader(),
		);

		const result = await service.send({
			title: "Test",
			body: "Body",
			channel: "email",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("CHANNEL_UNAVAILABLE");
	});

	it("stores correlationId on the created notification", async () => {
		const notification = makeNotification({ correlationId: "req-xyz" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[makeChannel("email")],
			writer,
			makeReader(),
		);

		await service.send({
			title: "Test",
			body: "Body",
			channel: "email",
			correlationId: "req-xyz",
		});

		expect(writer.create).toHaveBeenCalledWith(
			expect.objectContaining({ correlationId: "req-xyz" }),
		);
	});

	it("updates status to 'sent' after successful delivery", async () => {
		const notification = makeNotification({ channel: "email" });
		const writer = makeWriter(notification);
		const service = new NotificationService(
			[makeChannel("email")],
			writer,
			makeReader(),
		);

		const result = await service.send({
			title: "Test",
			body: "Body",
			channel: "email",
		});

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
			makeReader(),
		);

		await service.send({ title: "Test", body: "Body", channel: "email" });

		expect(writer.updateStatus).toHaveBeenCalledWith(notification.id, "failed");
	});
});
