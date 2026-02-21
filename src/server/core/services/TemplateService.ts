import { type Result, ok, fail } from "../domain/result/Result";
import { type DomainError } from "../domain/errors/DomainError";
import { TemplateMissingVariable } from "../domain/errors/NotificationErrors";
import { type ITemplateRenderer } from "../domain/interfaces/ITemplateRenderer";
import { type Template } from "../domain/entities/Template";

/**
 * TemplateService — renders Template bodies using {{variable}} substitution.
 *
 * SRP: only responsible for template rendering logic.
 * DIP: delegates the rendering algorithm to ITemplateRenderer.
 *
 * No throws — every code path returns Result<T, DomainError>.
 */
export class TemplateService implements ITemplateRenderer {
	constructor(private readonly renderer: ITemplateRenderer) {}

	/**
	 * Render a raw template string, replacing all {{key}} tokens.
	 * Returns fail(TemplateMissingVariable) if any token is unresolvable.
	 */
	render(
		template: string,
		context: Record<string, string>,
	): Result<string, DomainError> {
		return this.renderer.render(template, context);
	}

	/**
	 * Render both `subject` and `body` of a Template entity.
	 * Returns the first failure encountered, or the fully rendered pair.
	 */
	renderTemplate(
		tmpl: Template,
		context: Record<string, string>,
	): Result<{ subject: string; body: string }, DomainError> {
		const subjectResult = this.render(tmpl.subject, context);
		if (!subjectResult.ok) return subjectResult;

		const bodyResult = this.render(tmpl.body, context);
		if (!bodyResult.ok) return bodyResult;

		return ok({ subject: subjectResult.value, body: bodyResult.value });
	}
}

/**
 * SimpleTemplateRenderer — default ITemplateRenderer implementation.
 *
 * Replaces {{variable}} tokens using a plain string scan.
 * Lives here (not in channels/) because it is pure domain logic with
 * no infrastructure dependency.
 */
export class SimpleTemplateRenderer implements ITemplateRenderer {
	render(
		template: string,
		context: Record<string, string>,
	): Result<string, DomainError> {
		// Collect all {{token}} occurrences
		const tokens = Array.from(template.matchAll(/\{\{(\w+)\}\}/g));

		for (const match of tokens) {
			const variable = match[1];
			if (!(variable in context)) {
				return fail(new TemplateMissingVariable(variable));
			}
		}

		const rendered = template.replace(
			/\{\{(\w+)\}\}/g,
			(_, key: string) => context[key] ?? "",
		);

		return ok(rendered);
	}
}
