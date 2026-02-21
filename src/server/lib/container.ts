/**
 * container.ts — Dependency Injection wiring.
 *
 * THE ONLY FILE allowed to import concrete infrastructure classes.
 * Every other module depends exclusively on interfaces.
 *
 * DIP : NotificationService receives INotificationChannel[], INotificationWriter
 *       and INotificationReader — never the concrete implementations.
 * SRP : wiring is the sole responsibility of this file; no business logic here.
 */

import { PrismaNotificationRepository } from "@server/core/repositories/PrismaNotificationRepository";
import { NotificationService } from "@server/core/services/NotificationService";
import { EmailChannel } from "@server/core/channels/EmailChannel";
import { InAppChannel } from "@server/core/channels/InAppChannel";
import { WebhookChannel } from "@server/core/channels/WebhookChannel";
import { prisma } from "@server/lib/prisma";

// ── Repository ────────────────────────────────────────────────────────────────
// Single instance implements both INotificationReader and INotificationWriter.

const repository = new PrismaNotificationRepository(prisma);

// ── Channels ──────────────────────────────────────────────────────────────────
// isAvailable() on each channel guards against missing env vars at runtime.

const emailChannel = new EmailChannel({
	host: process.env["SMTP_HOST"] ?? "",
	port: Number(process.env["SMTP_PORT"] ?? "587"),
	user: process.env["SMTP_USER"] ?? "",
	pass: process.env["SMTP_PASS"] ?? "",
	from: process.env["SMTP_FROM"] ?? "",
});

const webhookChannel = new WebhookChannel({
	url: process.env["WEBHOOK_URL"] ?? "",
	secret: process.env["WEBHOOK_SECRET"],
});

const inAppChannel = new InAppChannel();

// ── Service ───────────────────────────────────────────────────────────────────

export const notificationService = new NotificationService(
	[emailChannel, webhookChannel, inAppChannel],
	repository, // INotificationWriter
	repository, // INotificationReader — same instance, two interfaces
);
