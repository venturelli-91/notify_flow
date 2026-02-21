import nodemailer from "nodemailer";
import { type Result, ok, fail } from "../domain/result/Result";
import { type DomainError } from "../domain/errors/DomainError";
import { ChannelUnavailable } from "../domain/errors/NotificationErrors";
import { type INotificationChannel } from "../domain/interfaces/INotificationChannel";
import { type Notification } from "../domain/entities/Notification";

interface EmailChannelConfig {
	readonly host: string;
	readonly port: number;
	readonly user: string;
	readonly pass: string;
	readonly from: string;
}

/**
 * EmailChannel — delivers notifications via SMTP using nodemailer.
 *
 * OCP  : fulfils INotificationChannel without touching NotificationService.
 * LSP  : fully substitutable for any other INotificationChannel implementation.
 *
 * In production point SMTP_* env vars to any transactional email provider
 * (SendGrid, Resend, Postmark, AWS SES, etc.).
 */
export class EmailChannel implements INotificationChannel {
	readonly name = "email" as const;

	private readonly transporter: nodemailer.Transporter;
	private readonly config: EmailChannelConfig;

	constructor(config: EmailChannelConfig) {
		this.config = config;
		this.transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.port === 465,
			auth: { user: config.user, pass: config.pass },
		});
	}

	isAvailable(): boolean {
		return (
			this.config.host.length > 0 &&
			this.config.user.length > 0 &&
			this.config.pass.length > 0
		);
	}

	async send(notification: Notification): Promise<Result<void, DomainError>> {
		if (!this.isAvailable()) {
			return fail(new ChannelUnavailable(this.name));
		}

		const to = notification.metadata?.["to"];
		if (typeof to !== "string" || to.trim().length === 0) {
			return fail(
				new ChannelUnavailable(
					this.name,
					'metadata.to must be a non-empty string (recipient email address)',
				),
			);
		}

		try {
			await this.transporter.sendMail({
				from: this.config.from,
				to,
				subject: notification.title,
				text: notification.body,
			});
			return ok(undefined);
		} catch (err) {
			const reason =
				err instanceof Error ? err.message : "SMTP delivery failed";
			return fail(new ChannelUnavailable(this.name, reason));
		}
	}
}
