import { type Result } from '../result/Result'
import { type DomainError } from '../errors/DomainError'
import { type Template } from '../entities/Template'

/**
 * ITemplateReader — ISP: used exclusively by read-side consumers.
 */
export interface ITemplateReader {
  findAll(): Promise<Result<Template[], DomainError>>
  findById(id: string): Promise<Result<Template, DomainError>>
  findByName(name: string): Promise<Result<Template, DomainError>>
}
