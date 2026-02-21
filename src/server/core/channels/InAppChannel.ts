import { type Result, ok } from '../domain/result/Result'
import { type DomainError } from '../domain/errors/DomainError'
import { type INotificationChannel } from '../domain/interfaces/INotificationChannel'
import { type Notification } from '../domain/entities/Notification'

/**
 * InAppChannel — marks a notification as delivered in-app.
 *
 * The notification record is already persisted in the database before
 * this channel is called, so "delivery" means the data is available
 * for the frontend to poll via GET /api/notifications.
 *
 * isAvailable() always returns true — in-app has no external dependency.
 *
 * A future iteration can extend this to emit a Server-Sent Event or
 * publish to a Redis pub/sub channel for real-time delivery without
 * changing NotificationService (Open/Closed Principle).
 */
export class InAppChannel implements INotificationChannel {
  readonly name = 'in-app' as const

  isAvailable(): boolean {
    return true
  }

  async send(_notification: Notification): Promise<Result<void, DomainError>> {
    // Notification is already persisted — polling-based delivery is implicit.
    // No external call needed.
    return ok(undefined)
  }
}
