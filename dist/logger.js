"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    constructor() {
        this.logLevel = 'INFO';
        this.requestId = this.generateRequestId();
        const level = process.env.LOG_LEVEL;
        if (level)
            this.logLevel = level;
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    generateRequestId() {
        const now = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `req_${now}_${random}`;
    }
    setRequestId(id) {
        this.requestId = id;
    }
    shouldLog(level) {
        const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        return levels[level] >= levels[this.logLevel];
    }
    format(log) {
        return JSON.stringify(log);
    }
    log(level, message, meta) {
        if (!this.shouldLog(level))
            return;
        const log = {
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
    debug(message, meta) {
        this.log('DEBUG', message, meta);
    }
    info(message, meta) {
        this.log('INFO', message, meta);
    }
    warn(message, meta) {
        this.log('WARN', message, meta);
    }
    error(message, meta) {
        this.log('ERROR', message, meta);
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map