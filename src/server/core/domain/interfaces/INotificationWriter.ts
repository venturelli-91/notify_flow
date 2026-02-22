import { type Result } from "../result/Result";
import { type DomainError } from "../errors/DomainError";
import {
	type Notification,
	type NotificationStatus,
	type CreateNotificationInput,
} from "../entities/Notification";

/**
 * INotificationWriter — ISP: used exclusively by write-side consumers
 * (send form, status updater). Never exposes read operations.
 */
export interface INotificationWriter {
	create(
		input: CreateNotificationInput,
	): Promise<Result<Notification, DomainError>>;

	updateStatus(
		id: string,
		status: NotificationStatus,
	): Promise<Result<Notification, DomainError>>;

	markAllRead(): Promise<Result<void, DomainError>>;
	markAllUnread(): Promise<Result<void, DomainError>>;
}
