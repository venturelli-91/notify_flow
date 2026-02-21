import { type Result } from '../result/Result'
import { type DomainError } from '../errors/DomainError'
import { type Notification } from '../entities/Notification'

/**
 * INotificationReader — ISP: used exclusively by read-side consumers
 * (dashboard, list view). Never exposes write operations.
 */
export interface INotificationReader {
  findAll(): Promise<Result<Notification[], DomainError>>
  findById(id: string): Promise<Result<Notification, DomainError>>
}
