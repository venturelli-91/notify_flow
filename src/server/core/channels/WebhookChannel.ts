import { type Result, ok, fail } from '../domain/result/Result'
import { type DomainError } from '../domain/errors/DomainError'
import { ChannelUnavailable } from '../domain/errors/NotificationErrors'
import { type INotificationChannel } from '../domain/interfaces/INotificationChannel'
import { type Notification } from '../domain/entities/Notification'

interface WebhookChannelConfig {
  /** Target URL that will receive POST requests. */
  readonly url: string
  /** Optional bearer token added to the Authorization header. */
  readonly secret?: string
  /** Request timeout in milliseconds (default: 10 000). */
  readonly timeoutMs?: number
}

/**
 * WebhookChannel — delivers notifications via an outbound HTTP POST.
 *
 * Payload shape (JSON):
 * {
 *   id, title, body, channel, status,
 *   metadata, correlationId, createdAt
 * }
 */
export class WebhookChannel implements INotificationChannel {
  readonly name = 'webhook' as const

  private readonly config: Required<WebhookChannelConfig>

  constructor(config: WebhookChannelConfig) {
    this.config = {
      url: config.url,
      secret: config.secret ?? '',
      timeoutMs: config.timeoutMs ?? 10_000,
    }
  }

  isAvailable(): boolean {
    return this.config.url.startsWith('http')
  }

  async send(notification: Notification): Promise<Result<void, DomainError>> {
    if (!this.isAvailable()) {
      return fail(new ChannelUnavailable(this.name))
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.secret) {
      headers['Authorization'] = `Bearer ${this.config.secret}`
    }
    if (notification.correlationId) {
      headers['X-Correlation-ID'] = notification.correlationId
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs,
      )

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          channel: notification.channel,
          status: notification.status,
          metadata: notification.metadata,
          correlationId: notification.correlationId,
          createdAt: notification.createdAt,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        return fail(
          new ChannelUnavailable(
            `${this.name}: target responded with ${response.status}`,
          ),
        )
      }

      return ok(undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook delivery failed'
      return fail(new ChannelUnavailable(`${this.name}: ${message}`))
    }
  }
}
