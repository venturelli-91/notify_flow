import { type Result } from "../result/Result";
import { type DomainError } from "../errors/DomainError";

/**
 * ITemplateRenderer — ISP: used exclusively by TemplateService.
 *
 * Decouples the rendering algorithm ({{variable}} substitution today,
 * Handlebars/Liquid tomorrow) from the rest of the domain.
 */
export interface ITemplateRenderer {
	/**
	 * Render `template` by replacing all {{key}} tokens with values from `context`.
	 * Returns fail(TemplateMissingVariable) if any token has no matching key.
	 */
	render(
		template: string,
		context: Record<string, string>,
	): Result<string, DomainError>;
}
