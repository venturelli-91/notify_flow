import type {
	PrismaClient,
	Notification as PrismaNotification,
} from "@prisma/client";
import { type Result, ok, fail } from "../domain/result/Result";
import { type DomainError } from "../domain/errors/DomainError";
import {
	NotificationNotFound,
	DatabaseError,
} from "../domain/errors/NotificationErrors";
import { type INotificationReader } from "../domain/interfaces/INotificationReader";
import { type INotificationWriter } from "../domain/interfaces/INotificationWriter";
import {
	type Notification,
	type NotificationChannel,
	type NotificationStatus,
	type CreateNotificationInput,
} from "../domain/entities/Notification";

/**
 * PrismaNotificationRepository — infrastructure adapter.
 *
 * Implements both INotificationReader and INotificationWriter so that
 * container.ts can inject a single instance where either interface is needed.
 *
 * SRP : only responsibility is translating between DB rows and domain entities.
 * DIP : NotificationService never imports this class — only the interfaces.
 */
export class PrismaNotificationRepository
	implements INotificationReader, INotificationWriter
{
	constructor(private readonly prisma: PrismaClient) {}

	// ── INotificationReader ──────────────────────────────────────────────────

	async findAll(): Promise<Result<Notification[], DomainError>> {
		try {
			const rows = await this.prisma.notification.findMany({
				orderBy: { createdAt: "desc" },
			});
			return ok(rows.map(toDomain));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async findById(id: string): Promise<Result<Notification, DomainError>> {
		try {
			const row = await this.prisma.notification.findUnique({ where: { id } });
			if (!row) return fail(new NotificationNotFound(id));
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	// ── INotificationWriter ──────────────────────────────────────────────────

	async create(
		input: CreateNotificationInput,
	): Promise<Result<Notification, DomainError>> {
		try {
			const row = await this.prisma.notification.create({
				data: {
					title: input.title,
					body: input.body,
					channel: input.channel,
					status: "pending",
					metadata: input.metadata ?? undefined,
					correlationId: input.correlationId ?? null,
				},
			});
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async updateStatus(
		id: string,
		status: NotificationStatus,
	): Promise<Result<Notification, DomainError>> {
		try {
			const row = await this.prisma.notification.update({
				where: { id },
				data: { status },
			});
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDomain(row: PrismaNotification): Notification {
	return {
		id: row.id,
		title: row.title,
		body: row.body,
		channel: row.channel as NotificationChannel,
		status: row.status as NotificationStatus,
		metadata: row.metadata as Record<string, unknown> | null,
		correlationId: row.correlationId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
