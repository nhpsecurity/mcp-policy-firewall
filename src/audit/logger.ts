import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import type { AuditEvent, LoggingConfig } from '../types';

export interface RuntimeLogger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  audit(event: AuditEvent): void;
}

export function createRuntimeLogger(config: LoggingConfig): RuntimeLogger {
  const transports: winston.transport[] = [new winston.transports.Console()];

  if (config.filePath) {
    const directory = path.dirname(config.filePath);
    fs.mkdirSync(directory, { recursive: true });
    transports.push(
      new winston.transports.File({
        filename: config.filePath,
      }),
    );
  }

  const logger = winston.createLogger({
    level: config.level,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports,
  });

  return {
    info(message, meta) {
      logger.info(message, meta as Record<string, unknown> | undefined);
    },
    warn(message, meta) {
      logger.warn(message, meta as Record<string, unknown> | undefined);
    },
    error(message, meta) {
      logger.error(message, meta as Record<string, unknown> | undefined);
    },
    debug(message, meta) {
      logger.debug(message, meta as Record<string, unknown> | undefined);
    },
    audit(event) {
      logger.info('audit', event as unknown as Record<string, unknown>);
    },
  };
}
