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
import { PrismaTemplateRepository } from "@server/core/repositories/PrismaTemplateRepository";
import { NotificationService } from "@server/core/services/NotificationService";
import {
	TemplateService,
	SimpleTemplateRenderer,
} from "@server/core/services/TemplateService";
import { EmailChannel } from "@server/core/channels/EmailChannel";
import { InAppChannel } from "@server/core/channels/InAppChannel";
import { WebhookChannel } from "@server/core/channels/WebhookChannel";
import { prisma } from "@server/lib/prisma";
import { env } from "@server/lib/env";

// ── Repository ────────────────────────────────────────────────────────────────
// Single instance implements both INotificationReader and INotificationWriter.

const notificationRepository = new PrismaNotificationRepository(prisma);
const templateRepository = new PrismaTemplateRepository(prisma);

// ── Template Service ──────────────────────────────────────────────────────────

const templateRenderer = new SimpleTemplateRenderer();
export const templateService = new TemplateService(templateRenderer);

// ── Channels ──────────────────────────────────────────────────────────────────
// isAvailable() on each channel guards against missing env vars at runtime.

const emailChannel = new EmailChannel({
	host: env.SMTP_HOST ?? "",
	port: env.SMTP_PORT,
	user: env.SMTP_USER ?? "",
	pass: env.SMTP_PASS ?? "",
	from: env.SMTP_FROM ?? "",
});

const webhookChannel = new WebhookChannel({
	url: env.WEBHOOK_URL ?? "",
	secret: env.WEBHOOK_SECRET,
});

const inAppChannel = new InAppChannel();

// ── Service ───────────────────────────────────────────────────────────────────

export const notificationService = new NotificationService(
	[emailChannel, webhookChannel, inAppChannel],
	notificationRepository, // INotificationWriter
	notificationRepository, // INotificationReader — same instance, two interfaces
);

export const templateReader = templateRepository; // ITemplateReader
export const templateWriter = templateRepository; // ITemplateWriter
