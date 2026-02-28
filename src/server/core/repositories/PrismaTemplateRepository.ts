import type {
	PrismaClient,
	Template as PrismaTemplate,
} from "@prisma/client";
import { type Result, ok, fail } from "../domain/result/Result";
import { type DomainError } from "../domain/errors/DomainError";
import {
	TemplateNotFound,
	DatabaseError,
} from "../domain/errors/NotificationErrors";
import { type ITemplateReader } from "../domain/interfaces/ITemplateReader";
import { type ITemplateWriter } from "../domain/interfaces/ITemplateWriter";
import {
	type Template,
	type CreateTemplateInput,
} from "../domain/entities/Template";

/**
 * PrismaTemplateRepository — infrastructure adapter for Template persistence.
 *
 * Implements both ITemplateReader and ITemplateWriter.
 *
 * SRP : only responsibility is translating between DB rows and domain entities.
 * DIP : TemplateService never imports this class — only the interfaces.
 */
export class PrismaTemplateRepository
	implements ITemplateReader, ITemplateWriter
{
	constructor(private readonly prisma: PrismaClient) {}

	// ── ITemplateReader ──────────────────────────────────────────────────────

	async findAll(): Promise<Result<Template[], DomainError>> {
		try {
			const rows = await this.prisma.template.findMany({
				orderBy: { createdAt: "desc" },
			});
			return ok(rows.map(toDomain));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async findById(id: string): Promise<Result<Template, DomainError>> {
		try {
			const row = await this.prisma.template.findUnique({ where: { id } });
			if (!row) return fail(new TemplateNotFound(id));
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async findByName(name: string): Promise<Result<Template, DomainError>> {
		try {
			const row = await this.prisma.template.findUnique({ where: { name } });
			if (!row) return fail(new TemplateNotFound(name));
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	// ── ITemplateWriter ──────────────────────────────────────────────────────

	async create(
		input: CreateTemplateInput,
	): Promise<Result<Template, DomainError>> {
		try {
			const row = await this.prisma.template.create({
				data: {
					name: input.name,
					subject: input.subject,
					body: input.body,
				},
			});
			return ok(toDomain(row));
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}

	async delete(id: string): Promise<Result<void, DomainError>> {
		try {
			await this.prisma.template.delete({
				where: { id },
			});
			return ok(undefined);
		} catch (err) {
			return fail(new DatabaseError(err));
		}
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDomain(row: PrismaTemplate): Template {
	return {
		id: row.id,
		name: row.name,
		subject: row.subject,
		body: row.body,
		createdAt: row.createdAt,
	};
}
