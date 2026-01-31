"use strict";
/**
 * Application Entry Point
 * Complete production setup with all dependencies initialized
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApplication = void 0;
const logger_1 = require("./logger");
const env_config_1 = require("./env-config");
const server_1 = require("./server");
/**
 * Initialize application in correct order
 */
async function initializeApplication() {
    try {
        // 1. Validate environment
        logger_1.logger.info('Starting application initialization');
        (0, env_config_1.validateNoHardcodedSecrets)();
        // 2. Load and validate config
        const config = (0, env_config_1.getConfig)();
        logger_1.logger.info('Configuration loaded successfully', {
            environment: config.environment,
            port: config.port,
        });
        // 3. Start HTTP server
        logger_1.logger.info('Starting HTTP server');
        const server = (0, server_1.getServer)();
        await server.start();
        logger_1.logger.info('Application initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize application', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
exports.initializeApplication = initializeApplication;
// Start application if run directly
if (require.main === module) {
    initializeApplication().catch((error) => {
        logger_1.logger.error('Unhandled initialization error', {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map