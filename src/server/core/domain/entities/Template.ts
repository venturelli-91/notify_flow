/**
 * Template — core domain entity.
 *
 * Pure TypeScript — no Prisma, no Next.js, no framework imports.
 * Templates contain {{variable}} placeholders rendered by TemplateService
 * before a notification is dispatched.
 */

export interface Template {
	readonly id: string;
	readonly name: string;
	readonly subject: string;
	readonly body: string;
	readonly createdAt: Date;
}

/**
 * Input required to create a new Template.
 */
export interface CreateTemplateInput {
	readonly name: string;
	readonly subject: string;
	readonly body: string;
}
