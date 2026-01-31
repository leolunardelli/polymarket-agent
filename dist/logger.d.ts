export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export interface StructuredLog {
    timestamp: string;
    level: LogLevel;
    requestId: string;
    message: string;
    meta?: Record<string, any>;
}
export declare class Logger {
    private static instance;
    private logLevel;
    private requestId;
    private constructor();
    static getInstance(): Logger;
    private generateRequestId;
    setRequestId(id: string): void;
    private shouldLog;
    private format;
    private log;
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, meta?: Record<string, any>): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map