import { DomainError } from "./DomainError";

/**
 * Thrown when a notification cannot be found by the given identifier.
 */
export class NotificationNotFound extends DomainError {
	readonly code = "NOTIFICATION_NOT_FOUND" as const;
	readonly statusCode = 404;

	constructor(id: string) {
		super(`Notification with id "${id}" was not found.`);
	}
}

/**
 * Thrown when a template cannot be found by the given identifier.
 */
export class TemplateNotFound extends DomainError {
	readonly code = "TEMPLATE_NOT_FOUND" as const;
	readonly statusCode = 404;

	constructor(idOrName: string) {
		super(`Template "${idOrName}" was not found.`);
	}
}

/**
 * Thrown when the requested delivery channel is not available
 * (e.g. missing config, external service unreachable, delivery failed).
 *
 * @param channelName - canonical channel identifier ("email", "webhook", …)
 * @param reason      - optional human-readable failure detail
 */
export class ChannelUnavailable extends DomainError {
	readonly code = "CHANNEL_UNAVAILABLE" as const;
	readonly statusCode = 503;

	constructor(channelName: string, reason?: string) {
		super(
			reason
				? `Channel "${channelName}" is not available: ${reason}`
				: `Channel "${channelName}" is not available.`,
		);
	}
}

/**
 * Thrown when the incoming payload fails schema validation.
 */
export class InvalidPayload extends DomainError {
	readonly code = "INVALID_PAYLOAD" as const;
	readonly statusCode = 422;

	constructor(details: string) {
		super(`Invalid payload: ${details}`);
	}
}

/**
 * Thrown when a caller exceeds the allowed request rate.
 */
export class RateLimitExceeded extends DomainError {
	readonly code = "RATE_LIMIT_EXCEEDED" as const;
	readonly statusCode = 429;

	constructor() {
		super("Rate limit exceeded. Please slow down and try again later.");
	}
}

/**
 * Thrown when template variable substitution cannot be completed
 * because a required variable is missing from the context.
 */
export class TemplateMissingVariable extends DomainError {
	readonly code = "TEMPLATE_MISSING_VARIABLE" as const;
	readonly statusCode = 422;

	constructor(variable: string) {
		super(`Template variable "{{${variable}}}" is missing from context.`);
	}
}

/**
 * Wraps an unexpected infrastructure error (e.g. database unreachable).
 * statusCode 500 — never expose raw DB errors to the client.
 */
export class DatabaseError extends DomainError {
	readonly code = "DATABASE_ERROR" as const;
	readonly statusCode = 500;

	constructor(cause: unknown) {
		const message =
			cause instanceof Error ? cause.message : "Unexpected database error";
		super(message);
	}
}
