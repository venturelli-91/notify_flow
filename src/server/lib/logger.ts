import { getCorrelationId } from './correlationId'

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  correlationId: string
  timestamp: string
  [key: string]: unknown
}

/**
 * Structured JSON logger.
 *
 * Every line is a valid JSON object — ready to be ingested by
 * Datadog, Loki, CloudWatch, or any log aggregator.
 *
 * SRP: only responsibility is formatting and writing log lines.
 * Zero dependency on Next.js, React, or any framework.
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    emit('info', message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    emit('warn', message, meta),

  error: (message: string, meta?: Record<string, unknown>) =>
    emit('error', message, meta),
}

function emit(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    correlationId: getCorrelationId(),
    timestamp: new Date().toISOString(),
    ...meta,
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry))
}
