/**
 * DomainError — abstract base for all typed domain failures.
 *
 * Every concrete error must declare:
 *   - `code`       — machine-readable identifier (logged, returned in API body)
 *   - `statusCode` — maps directly to HTTP status (used by route handlers)
 *
 * Extending Error gives us a proper stack trace while the
 * `code` / `statusCode` contract keeps API responses consistent.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
