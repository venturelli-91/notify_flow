/**
 * Notification — core domain entity.
 *
 * Pure TypeScript — no Prisma, no Next.js, no framework imports.
 * This type is the single source of truth for a notification across
 * the entire application (API, repository, channels, UI).
 */

export type NotificationChannel = "email" | "webhook" | "in-app";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface Notification {
	readonly id: string;
	readonly title: string;
	readonly body: string;
	readonly channel: NotificationChannel;
	readonly status: NotificationStatus;
	readonly readAt: Date | null;
	readonly metadata: Record<string, unknown> | null;
	readonly correlationId: string | null;
	readonly userId: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

/**
 * Input required to create a new Notification.
 * `id`, `status`, `createdAt` and `updatedAt` are assigned by the repository.
 */
export interface CreateNotificationInput {
	readonly title: string;
	readonly body: string;
	readonly channel: NotificationChannel;
	readonly metadata?: Record<string, unknown>;
	readonly correlationId?: string;
	readonly userId: string;
}
