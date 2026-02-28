import { type Result } from "../result/Result";
import { type DomainError } from "../errors/DomainError";
import {
	type Template,
	type CreateTemplateInput,
} from "../entities/Template";

/**
 * ITemplateWriter — ISP: used exclusively by write-side consumers.
 */
export interface ITemplateWriter {
	create(input: CreateTemplateInput): Promise<Result<Template, DomainError>>;
	delete(id: string): Promise<Result<void, DomainError>>;
}
