import { type Result } from '../result/Result'
import { type DomainError } from '../errors/DomainError'
import { type Notification, type NotificationStatus } from '../entities/Notification'

/**
 * INotificationWriter — ISP: used exclusively by write-side consumers
 * (send form, status updater). Never exposes read operations.
 */
export interface INotificationWriter {
  create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Notification, DomainError>>

  updateStatus(
    id: string,
    status: NotificationStatus
  ): Promise<Result<Notification, DomainError>>
}
