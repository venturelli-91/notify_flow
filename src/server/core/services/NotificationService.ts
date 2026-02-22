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
	 * Create and dispatch a notification through the requested channel.
	 * Persists the record, attempts delivery, then updates the final status.
	 */
	async send(
		input: CreateNotificationInput,
	): Promise<Result<Notification, DomainError>> {
		// 1. Persist with initial status "pending"
		const createResult = await this.writer.create(input);
		if (!createResult.ok) return createResult;

		const notification = createResult.value;

		// 2. Resolve the requested channel
		const channel = this.channels.find((c) => c.name === input.channel);
		if (!channel) {
			return fail(new ChannelUnavailable(input.channel));
		}

		// 3. Guard: channel must be available before attempting delivery
		if (!channel.isAvailable()) {
			await this.writer.updateStatus(notification.id, "failed");
			return fail(new ChannelUnavailable(channel.name));
		}

		// 4. Attempt delivery
		const sendResult = await channel.send(notification);

		// 5. Persist final status regardless of outcome
		const finalStatus = sendResult.ok ? "sent" : "failed";
		const updateResult = await this.writer.updateStatus(
			notification.id,
			finalStatus,
		);

		if (!sendResult.ok) return sendResult;
		if (!updateResult.ok) return updateResult;

		return ok(updateResult.value);
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
}
