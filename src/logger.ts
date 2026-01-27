export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  message: string;
  meta?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'INFO';
  private requestId: string = this.generateRequestId();

  private constructor() {
    const level = process.env.LOG_LEVEL as LogLevel;
    if (level) this.logLevel = level;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateRequestId(): string {
    const now = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `req_${now}_${random}`;
  }

  setRequestId(id: string): void {
    this.requestId = id;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private format(log: StructuredLog): string {
    return JSON.stringify(log);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      message,
      ...(meta && { meta }),
    };

    const formatted = this.format(log);
    const output = level === 'ERROR' ? console.error : console.log;
    output(formatted);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('ERROR', message, meta);
  }
}

export const logger = Logger.getInstance();
