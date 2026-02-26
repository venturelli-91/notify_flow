/**
 * notificationWorker — BullMQ worker for async notification dispatch.
 *
 * Run as a standalone process alongside the Next.js server:
 *   npm run worker
 *
 * Responsibilities:
 *   1. Dequeue NotificationJobData from the "notifications" queue.
 *   2. Fetch the already-persisted notification by ID.
 *   3. Call notificationService.deliver() — dispatches the channel and
 *      updates the final status ("sent" | "failed").
 *   4. On failure, BullMQ retries up to 3× with exponential back-off
 *      (configured in queue.ts defaultJobOptions).
 *
 * Note: the DB record is created by the API route (status "pending") so
 * it is immediately visible in the dashboard regardless of worker state.
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
	parseBullMQConnection,
	type NotificationJobData,
} from "@server/lib/queue";

const connection = parseBullMQConnection();

const worker = new Worker<NotificationJobData>(
	NOTIFICATION_QUEUE,
	async (job) => {
		const { notificationId, correlationId, channel } = job.data;

		await withCorrelationId(correlationId, async () => {
			logger.info("Processing notification job", {
				jobId: job.id,
				notificationId,
				channel,
				attempt: job.attemptsMade + 1,
			});

			// Fetch the existing DB record created by the API route
			const fetchResult = await notificationService.findById(notificationId);
			if (!fetchResult.ok) {
				logger.error("Notification not found in DB", {
					jobId: job.id,
					notificationId,
					error: fetchResult.error.message,
				});
				throw new Error(fetchResult.error.message);
			}

			const result = await notificationService.deliver(fetchResult.value);

			if (!result.ok) {
				logger.error("Notification delivery failed", {
					jobId: job.id,
					notificationId,
					error: result.error.message,
					code: result.error.code,
				});
				// Throwing causes BullMQ to retry the job (up to attempts limit).
				throw new Error(result.error.message);
			}

			logger.info("Notification delivered", {
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
