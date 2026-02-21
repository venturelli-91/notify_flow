import { type Result } from '../result/Result'
import { type DomainError } from '../errors/DomainError'
import { type Notification } from '../entities/Notification'

/**
 * INotificationChannel — ISP: used exclusively by the dispatcher.
 *
 * Adding a new channel = new class implementing this interface.
 * NotificationService never changes (Open/Closed Principle).
 */
export interface INotificationChannel {
  /** Unique channel identifier — must match the `channel` field on Notification. */
  readonly name: string

  /**
   * Returns true when the channel is configured and its
   * dependencies (SMTP, webhook endpoint, etc.) are reachable.
   */
  isAvailable(): boolean

  /**
   * Attempt delivery. Returns ok(void) on success or a typed
   * DomainError on failure — never throws.
   */
  send(notification: Notification): Promise<Result<void, DomainError>>
}
