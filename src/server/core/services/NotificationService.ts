import { type Result, ok, fail } from "../domain/result/Result";
import { type DomainError } from "../domain/errors/DomainError";
import { ChannelUnavailable } from "../domain/errors/NotificationErrors";
import { type INotificationChannel } from "../domain/interfaces/INotificationChannel";
import { type INotificationReader } from "../domain/interfaces/INotificationReader";
import { type INotificationWriter } from "../domain/interfaces/INotificationWriter";
import {
	type Notification,
	type CreateNotificationInput,
} from "../domain/entities/Notification";

/**
 * NotificationService — orchestrates dispatch of a single notification.
 *
 * SRP  : only decides which channel to use and whether dispatch succeeded.
 * OCP  : new channels are added by implementing INotificationChannel only.
 * DIP  : depends on interfaces, never on concrete classes.
 *
 * No throws — every code path returns Result<T, DomainError>.
 */
export class NotificationService {
	constructor(
		private readonly channels: INotificationChannel[],
		private readonly writer: INotificationWriter,
		private readonly reader: INotificationReader,
	) {}

	/**
	 * Persist a notification with status "pending" — no delivery attempted.
	 * Called by the API route so the record is immediately visible in the dashboard.
	 */
	async createPending(
		input: CreateNotificationInput,
	): Promise<Result<Notification, DomainError>> {
		return this.writer.create(input);
	}

	/**
	 * Dispatch an already-persisted notification through its channel and update
	 * the final status. Called by the worker after dequeueing the job.
	 */
	async deliver(
		notification: Notification,
	): Promise<Result<Notification, DomainError>> {
		const channel = this.channels.find((c) => c.name === notification.channel);
		if (!channel) {
			await this.writer.updateStatus(notification.id, "failed");
			return fail(new ChannelUnavailable(notification.channel));
		}

		if (!channel.isAvailable()) {
			await this.writer.updateStatus(notification.id, "failed");
			return fail(new ChannelUnavailable(channel.name));
		}

		const sendResult = await channel.send(notification);
		const finalStatus = sendResult.ok ? "sent" : "failed";
		const updateResult = await this.writer.updateStatus(notification.id, finalStatus);

		if (!sendResult.ok) return sendResult;
		if (!updateResult.ok) return updateResult;

		return ok(updateResult.value);
	}

	/** @deprecated Use createPending() + deliver() separately. Kept for tests. */
	async send(
		input: CreateNotificationInput,
	): Promise<Result<Notification, DomainError>> {
		const createResult = await this.createPending(input);
		if (!createResult.ok) return createResult;
		return this.deliver(createResult.value);
	}

	async findAll(): Promise<Result<Notification[], DomainError>> {
		return this.reader.findAll();
	}

	async findById(id: string): Promise<Result<Notification, DomainError>> {
		return this.reader.findById(id);
	}

	async markAllRead(): Promise<Result<void, DomainError>> {
		return this.writer.markAllRead();
	}

	async markAllUnread(): Promise<Result<void, DomainError>> {
		return this.writer.markAllUnread();
	}

	async retry(id: string): Promise<Result<Notification, DomainError>> {
		return this.writer.updateStatus(id, "pending");
	}

	async softDelete(id: string): Promise<Result<Notification, DomainError>> {
		// Mark as failed and archived for deletion
		return this.writer.updateStatus(id, "failed");
	}
}
