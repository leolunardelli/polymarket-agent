"use strict";
/**
 * Trading Dashboard Server
 * Real-time monitoring with kawaii anime theme ✨
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
const logger_1 = require("./logger");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
// Serve static files
app.use(express_1.default.static(path.join(__dirname, '../public')));
// Health check endpoint for monitoring/Railway
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// API endpoint for real-time data
app.get('/api/status', (req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json(data);
        }
        else {
            res.json({ error: 'No test data available yet' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to read test data' });
    }
});
// API endpoint for trade history from logs
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
// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ Dashboard running at http://0.0.0.0:${PORT}`);
    console.log('🎀 Open in browser to view your kawaii trading dashboard!\n');
    logger_1.logger.info('Dashboard server started', { port: PORT });
}).on('error', (err) => {
    console.error('Dashboard server error:', err);
    logger_1.logger.error('Dashboard server failed to start', { error: err.message });
    process.exit(1);
});
//# sourceMappingURL=dashboard-server.js.map