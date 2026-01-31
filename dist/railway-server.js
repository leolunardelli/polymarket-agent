"use strict";
/**
 * Railway Combined Server
 * Runs both the dashboard AND week-test on Railway
 *
 * - Dashboard serves on PORT (Railway-assigned)
 * - Week-test runs as child process, updating test-results.json
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
const PORT = parseInt(process.env.PORT || '3001', 10);
// ============== DASHBOARD SERVER ==============
const app = (0, express_1.default)();
app.use(express_1.default.static(path.join(__dirname, '../public')));
let weekTestProcess = null;
let weekTestRunning = false;
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        weekTestRunning
    });
});
app.get('/api/status', (req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json(data);
        }
        else {
            res.json({
                message: 'Waiting for test data...',
                weekTestRunning,
                hint: 'The week-test will start automatically and create data'
            });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to read test data' });
    }
});
app.get('/api/trades', (req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json({
                positions: data.positions || [],
                activity: data.activity || {},
            });
        }
        else {
            res.json({ positions: [], activity: {} });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to read trade data' });
    }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
// ============== WEEK TEST SPAWNER ==============
function startWeekTest() {
    console.log('🚀 Starting week-test process...');
    // Run week-test.js with --resume flag to continue if data exists
    weekTestProcess = (0, child_process_1.spawn)('node', [path.join(__dirname, 'week-test.js'), '--resume'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
    });
    weekTestRunning = true;
    weekTestProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output)
            console.log(`[week-test] ${output}`);
    });
    weekTestProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output)
            console.error(`[week-test ERROR] ${output}`);
    });
    weekTestProcess.on('close', (code) => {
        weekTestRunning = false;
        console.log(`[week-test] Process exited with code ${code}`);
        // Restart if it crashed (not if completed normally)
        if (code !== 0 && code !== null) {
            console.log('⚠️ Week-test crashed, restarting in 30 seconds...');
            setTimeout(startWeekTest, 30000);
        }
    });
    weekTestProcess.on('error', (err) => {
        weekTestRunning = false;
        console.error('[week-test] Failed to start:', err.message);
    });
}
// ============== GRACEFUL SHUTDOWN ==============
function shutdown() {
    console.log('\n⚠️ Shutting down gracefully...');
    if (weekTestProcess) {
        weekTestProcess.kill('SIGTERM');
    }
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// ============== START EVERYTHING ==============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ Railway Dashboard running at http://0.0.0.0:${PORT}`);
    console.log('🎀 Poly-chan is ready!\n');
    logger_1.logger.info('Railway server started', { port: PORT });
    // Start week-test after a small delay
    setTimeout(() => {
        startWeekTest();
    }, 3000);
}).on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
//# sourceMappingURL=railway-server.js.map