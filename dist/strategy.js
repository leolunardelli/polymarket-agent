"use strict";
/**
 * Strategy Abstraction Layer (P1-HIGH #11)
 *
 * Provides a pluggable Strategy interface so trading logic can be
 * swapped, A/B tested, or composed without rewriting week-test.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultStrategy = exports.DefaultStrategy = void 0;
class DefaultStrategy {
    constructor(cfg) {
        this.cfg = cfg;
        this.name = 'DefaultComposite';
    }
    analyze(market) {
        const price = market.outcomePrices[0];
        // ── Gate filters ──
        if (price < this.cfg.minProbability || price > this.cfg.maxProbability) {
            return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: 'extreme probability', confidence: 0 };
        }
        if (market.volume < this.cfg.minVolume) {
            return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `low volume: $${market.volume}`, confidence: 0 };
        }
        if (market.liquidity < this.cfg.minLiquidity) {
            return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `low liquidity: $${market.liquidity}`, confidence: 0 };
        }
        if (market.endDate) {
            const daysToExpiry = (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysToExpiry < this.cfg.minDaysToExpiry) {
                return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `expires in ${daysToExpiry.toFixed(0)} days`, confidence: 0 };
            }
        }
        // ── Spread gate (P0 #3) — relaxed for safe bets ──
        const isSafeBet = price >= this.cfg.safeBetThreshold;
        const spreadLimit = isSafeBet ? 15 : 12; // prediction markets have wider spreads
        if (market.spread !== undefined && market.spread > spreadLimit) {
            return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `spread too wide: ${market.spread.toFixed(1)}% (limit ${spreadLimit}%)`, confidence: 0 };
        }
        // ── Momentum gate (P0 #2) — relaxed for safe bets ──
        const momentumFloor = isSafeBet ? -25 : -15; // only block severe declines
        if (market.momentum !== undefined && market.momentum < momentumFloor) {
            return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `declining momentum: ${market.momentum.toFixed(1)}%`, confidence: 0 };
        }
        // ── Scoring ──
        const volumeScore = Math.min(market.volume / 100000, 1);
        const liquidityScore = Math.min(market.liquidity / 25000, 1);
        const vlRatio = market.liquidity > 0 ? Math.min(market.volume / market.liquidity / 10, 1) : 0;
        let confidence;
        if (isSafeBet) {
            // ── Safe Bet Tier (price >= 0.80) ──
            // High probability markets are likely to resolve YES.
            // Confidence based on how high the probability is + volume/liquidity.
            const safetyScore = (price - this.cfg.safeBetThreshold) / (this.cfg.maxProbability - this.cfg.safeBetThreshold);
            confidence = (safetyScore * 0.35 + // higher price = more certain
                volumeScore * 0.25 + // high volume confirms market conviction
                liquidityScore * 0.20 + // good liquidity means easy entry/exit
                vlRatio * 0.10) * 100;
            // Flat bonus: safe bets start at a higher baseline
            confidence += 15;
        }
        else {
            // ── Standard Tier (price 0.15–0.90) ──
            // Price sweet-spot: 0.20-0.80 is good, outside that gets penalized less harshly
            const priceScore = price >= 0.25 && price <= 0.75
                ? 1 - Math.abs(price - 0.5) * 1.5 // gentle penalty near 0.5
                : Math.max(0.15, (1 - Math.abs(price - 0.5) * 2) * 0.6);
            confidence = (volumeScore * 0.28 +
                liquidityScore * 0.22 +
                priceScore * 0.15 +
                vlRatio * 0.10) * 100;
            // High-volume bonus: markets with > $1M volume get a flat boost
            if (market.volume >= 1000000)
                confidence += 10;
            else if (market.volume >= 500000)
                confidence += 5;
        }
        // Momentum bonus (P0 #2)
        if (market.momentum !== undefined) {
            const momentumBonus = Math.max(-10, Math.min(10, market.momentum)) / 100 * 15;
            confidence += momentumBonus;
        }
        // Spread bonus (P0 #3) — tight spread is good
        if (market.spread !== undefined) {
            const spreadBonus = Math.max(0, (5 - market.spread) / 5) * 10;
            confidence += spreadBonus;
        }
        // Sentiment bonus (P1 #1)
        if (market.sentimentScore !== undefined) {
            confidence += market.sentimentScore * 10; // ±10
        }
        // Smart money bonus (P1 #2)
        if (market.smartMoneyActive) {
            confidence += 8;
        }
        confidence = Math.max(0, Math.min(100, confidence));
        if (confidence >= this.cfg.minConfidence) {
            if (isSafeBet) {
                // Safe bet: always BUY the YES outcome (index 0) — we're betting it resolves YES
                return {
                    shouldTrade: true,
                    side: 'BUY',
                    outcomeIndex: 0,
                    reason: `🛡️ Safe bet (price=${price.toFixed(3)}, vol=$${market.volume.toFixed(0)})`,
                    confidence,
                };
            }
            // SELL signal for overpriced markets (P1 #3) — only in standard tier
            if (price > 0.70 && (market.momentum ?? 0) < -3) {
                return {
                    shouldTrade: true,
                    side: 'SELL',
                    outcomeIndex: 0,
                    reason: `Overpriced + declining (price=${price.toFixed(2)}, momentum=${(market.momentum ?? 0).toFixed(1)}%)`,
                    confidence,
                };
            }
            // For low-probability markets (< 15%), buy NO (outcome 1) since
            // the event is unlikely — we profit when it stays low and resolves NO.
            // For mid-range, buy YES if < 0.5, NO if >= 0.5 (contrarian on high side).
            let outcomeIndex;
            let side = 'BUY';
            if (price < 0.15) {
                outcomeIndex = 1; // Buy NO — event is unlikely
            }
            else if (price < 0.5) {
                outcomeIndex = 0; // Buy YES — undervalued
            }
            else {
                outcomeIndex = 1; // Buy NO — overvalued
            }
            return {
                shouldTrade: true,
                side,
                outcomeIndex,
                reason: `High confidence (vol=$${market.volume.toFixed(0)}, liq=$${market.liquidity.toFixed(0)}, dir=${price < 0.15 ? 'NO-longshot' : price < 0.5 ? 'YES' : 'NO'})`,
                confidence,
            };
        }
        return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: 'low confidence', confidence };
    }
    shouldExit(pos, market) {
        const currentPrice = market.outcomePrices[0]; // simplified
        const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
        // EXIT 1: Take profit — partial at half-target, full at target (P1 #4)
        if (pnlPercent >= this.cfg.targetProfitPercent) {
            return { shouldExit: true, exitQuantityPercent: 100, reason: `Take profit: ${pnlPercent.toFixed(2)}%` };
        }
        if (pnlPercent >= this.cfg.targetProfitPercent / 2) {
            return { shouldExit: true, exitQuantityPercent: 50, reason: `Partial TP: ${pnlPercent.toFixed(2)}%` };
        }
        // EXIT 2: Stop loss
        if (pnlPercent <= -this.cfg.stopLossPercent) {
            return { shouldExit: true, exitQuantityPercent: 100, reason: `Stop loss: ${pnlPercent.toFixed(2)}%` };
        }
        // EXIT 3: Trailing stop
        if (pos.peakPrice && pos.peakPrice > pos.entryPrice) {
            const dropFromPeak = ((pos.peakPrice - currentPrice) / pos.peakPrice) * 100;
            if (dropFromPeak >= this.cfg.trailingStopPercent && pnlPercent > 0) {
                return { shouldExit: true, exitQuantityPercent: 100, reason: `Trailing stop: dropped ${dropFromPeak.toFixed(2)}% from peak` };
            }
        }
        // EXIT 4: Time-based
        const ageMs = Date.now() - pos.createdAt.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays >= this.cfg.maxPositionAgeDays && pnlPercent < this.cfg.maxPositionAgeMinGain) {
            return { shouldExit: true, exitQuantityPercent: 100, reason: `Time exit: ${ageDays.toFixed(1)} days, ${pnlPercent.toFixed(2)}% gain` };
        }
        // EXIT 5: Market expiring soon
        if (market.endDate) {
            const daysToExpiry = (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysToExpiry < 2) {
                return { shouldExit: true, exitQuantityPercent: 100, reason: `Expiry exit: ${daysToExpiry.toFixed(1)} days left` };
            }
        }
        return { shouldExit: false, exitQuantityPercent: 0, reason: '' };
    }
}
exports.DefaultStrategy = DefaultStrategy;
function createDefaultStrategy(cfg) {
    return new DefaultStrategy(cfg);
}
exports.createDefaultStrategy = createDefaultStrategy;
//# sourceMappingURL=strategy.js.map