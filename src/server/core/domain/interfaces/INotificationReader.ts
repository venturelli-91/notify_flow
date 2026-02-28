import { type Result } from "../result/Result";
import { type DomainError } from "../errors/DomainError";
import { type Notification } from "../entities/Notification";

/**
 * PaginatedResult — wraps paginated data with metadata.
 */
export type PaginatedResult<T> = {
	items: T[];
	total: number;
	page: number;
	limit: number;
};

/**
 * INotificationReader — ISP: used exclusively by read-side consumers
 * (dashboard, list view). Never exposes write operations.
 */
export interface INotificationReader {
	findAll(
		userId: string,
		page?: number,
		limit?: number,
	): Promise<Result<PaginatedResult<Notification>, DomainError>>;
	findById(
		id: string,
		userId: string,
	): Promise<Result<Notification, DomainError>>;

	/**
	 * findByIdInternal — Internal method for worker/background job access.
	 * ⚠️ Bypasses userId isolation. Should ONLY be used by worker processes,
	 * never exposed through API routes.
	 */
	findByIdInternal(id: string): Promise<Result<Notification, DomainError>>;
}
