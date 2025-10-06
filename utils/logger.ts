import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (!config.debugMode && level === 'debug') {
      return false;
    }
    return true;
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, data } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data && Object.keys(data).length > 0) {
      formatted += `\nData: ${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
        console.log(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        if (error) {
          console.error('Error stack:', error.stack);
        }
        break;
    }

    // In production, you would send errors to a service like Sentry here
    if (level === 'error' && config.appEnv === 'production') {
      // TODO: Send to error tracking service
      // Sentry.captureException(error || new Error(message));
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }
}

export const logger = new Logger();
