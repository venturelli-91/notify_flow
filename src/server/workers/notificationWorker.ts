/**
 * notificationWorker — BullMQ worker for async notification dispatch.
 *
 * Run as a standalone process alongside the Next.js server:
 *   npm run worker
 *
 * Responsibilities:
 *   1. Dequeue NotificationJobData from the "notifications" queue.
 *   2. Call notificationService.send() — creates the DB record, dispatches
 *      the channel, and persists the final status.
 *   3. On failure, BullMQ retries up to 3× with exponential back-off
 *      (configured in queue.ts defaultJobOptions).
 *
 * SRP: only the wiring of job data → service call lives here.
 */

import "dotenv/config";
import { Worker } from "bullmq";
import { notificationService } from "@server/lib/container";
import { withCorrelationId } from "@server/lib/correlationId";
import { logger } from "@server/lib/logger";
import {
	NOTIFICATION_QUEUE,
	type NotificationJobData,
} from "@server/lib/queue";

// Plain options object — avoids the dual-ioredis type conflict.
// BullMQ uses its own bundled ioredis; we must not pass the top-level instance.
function parseBullMQConnection() {
	const raw = process.env["REDIS_URL"] ?? "redis://localhost:6379";
	const url = new URL(raw);
	return {
		host: url.hostname,
		port: Number(url.port || 6379),
		...(url.password ? { password: decodeURIComponent(url.password) } : {}),
		...(url.protocol === "rediss:" ? { tls: {} } : {}),
		maxRetriesPerRequest: null as null,
		enableReadyCheck: false as const,
	};
}

const connection = parseBullMQConnection();

const worker = new Worker<NotificationJobData>(
	NOTIFICATION_QUEUE,
	async (job) => {
		const { correlationId, ...input } = job.data;

		await withCorrelationId(correlationId, async () => {
			logger.info("Processing notification job", {
				jobId: job.id,
				channel: input.channel,
				attempt: job.attemptsMade + 1,
			});

			const result = await notificationService.send({
				...input,
				correlationId,
			});

			if (!result.ok) {
				logger.error("Notification job failed", {
					jobId: job.id,
					error: result.error.message,
					code: result.error.code,
				});
				// Throwing causes BullMQ to retry the job (up to attempts limit).
				throw new Error(result.error.message);
			}

			logger.info("Notification job succeeded", {
				jobId: job.id,
				notificationId: result.value.id,
				channel: result.value.channel,
				status: result.value.status,
			});
		});
	},
	{ connection, concurrency: 5 },
);

worker.on("failed", (job, err) => {
	logger.error("Job permanently failed after all retries", {
		jobId: job?.id,
		error: err.message,
	});
});

logger.info("Notification worker started", { queue: NOTIFICATION_QUEUE });

// ── Graceful shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
	logger.info(`Received ${signal}, shutting down worker…`);
	// worker.close() drains in-flight jobs and closes BullMQ's internal connection.
	await worker.close();
	logger.info("Worker shut down gracefully");
	process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
