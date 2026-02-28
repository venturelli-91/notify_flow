import { Queue } from "bullmq";
import { env } from "./env";
import type { NotificationChannel } from "@server/core/domain/entities/Notification";

// ── Job payload ───────────────────────────────────────────────────────────────

export interface NotificationJobData {
	readonly notificationId: string;
	readonly title: string;
	readonly body: string;
	readonly channel: NotificationChannel;
	readonly metadata?: Record<string, unknown>;
	readonly correlationId: string;
}

// ── Queue name ────────────────────────────────────────────────────────────────

export const NOTIFICATION_QUEUE = "notifications" as const;

// ── BullMQ connection ─────────────────────────────────────────────────────────
//
// BullMQ bundles its own ioredis internally. Passing a plain options object
// (instead of a top-level IORedis instance) avoids the dual-ioredis type
// conflict while still setting maxRetriesPerRequest: null as required.

export function parseBullMQConnection() {
	const raw = env.REDIS_URL;
	const url = new URL(raw);
	return {
		host: url.hostname,
		port: Number(url.port || 6379),
		...(url.password ? { password: decodeURIComponent(url.password) } : {}),
		...(url.protocol === "rediss:" ? { tls: {} } : {}),
		// Required by BullMQ — disables ioredis's default 3-retry limit so
		// that long-running workers don't abort mid-stream.
		maxRetriesPerRequest: null as null,
		enableReadyCheck: false as const,
	};
}

// ── Queue singleton ───────────────────────────────────────────────────────────
//
// Singleton prevents extra connections during Next.js hot-reloads.

const globalForQueue = globalThis as unknown as {
	notificationQueue: Queue<NotificationJobData> | undefined;
};

export const notificationQueue: Queue<NotificationJobData> =
	globalForQueue.notificationQueue ??
	new Queue<NotificationJobData>(NOTIFICATION_QUEUE, {
		connection: parseBullMQConnection(),
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 1_000 },
			removeOnComplete: { count: 500 },
			removeOnFail: { count: 200 },
		},
	});

if (process.env["NODE_ENV"] !== "production") {
	globalForQueue.notificationQueue = notificationQueue;
}
