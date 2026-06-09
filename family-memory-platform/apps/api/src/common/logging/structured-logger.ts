import { getRequestId } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type StructuredLogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: string;
  meta?: Record<string, unknown>;
};

export function writeStructuredLog(entry: Omit<StructuredLogEntry, 'timestamp' | 'requestId'> & { requestId?: string }) {
  const payload: StructuredLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    requestId: entry.requestId ?? getRequestId(),
  };
  const line = JSON.stringify(payload);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export class StructuredLogger {
  constructor(private readonly context: string) {}

  info(message: string, meta?: Record<string, unknown>) {
    writeStructuredLog({ level: 'info', message, context: this.context, meta });
  }

  warn(message: string, meta?: Record<string, unknown>) {
    writeStructuredLog({ level: 'warn', message, context: this.context, meta });
  }

  error(message: string, meta?: Record<string, unknown>) {
    writeStructuredLog({ level: 'error', message, context: this.context, meta });
  }

  debug(message: string, meta?: Record<string, unknown>) {
    writeStructuredLog({ level: 'debug', message, context: this.context, meta });
  }
}
