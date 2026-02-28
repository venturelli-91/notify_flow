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
		userId: string,
	): Promise<Result<Notification, DomainError>>;

	markAllRead(userId: string): Promise<Result<void, DomainError>>;
	markAllUnread(userId: string): Promise<Result<void, DomainError>>;
	delete(id: string, userId: string): Promise<Result<void, DomainError>>;
}
