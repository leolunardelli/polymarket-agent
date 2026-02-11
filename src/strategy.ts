/**
 * Strategy Abstraction Layer (P1-HIGH #11)
 * 
 * Provides a pluggable Strategy interface so trading logic can be
 * swapped, A/B tested, or composed without rewriting week-test.ts.
 */

import { logger } from './logger';

// ── Public types ──────────────────────────────────────────────────
export interface MarketSnapshot {
  conditionId: string;
  questionId: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  liquidity: number;
  endDate: string;
  /** Optional enrichment data added by the pipeline */
  momentum?: number;          // price change % over lookback
  spread?: number;            // best-ask − best-bid (%)
  sentimentScore?: number;    // −1 … +1
  smartMoneyActive?: boolean; // top traders hold position
  tags?: string[];
}

export interface TradeSignal {
  shouldTrade: boolean;
  side: 'BUY' | 'SELL';
  outcomeIndex: number;
  reason: string;
  confidence: number;         // 0-100
}

export interface ExitSignal {
  shouldExit: boolean;
  exitQuantityPercent: number; // 0-100  (supports partial exits)
  reason: string;
}

export interface PositionView {
  tokenId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  createdAt: Date;
  peakPrice?: number;
}

// ── Strategy Interface ────────────────────────────────────────────
export interface Strategy {
  readonly name: string;
  /** Analyse a market and produce a trade signal. */
  analyze(market: MarketSnapshot): TradeSignal;
  /** Decide whether an existing position should be (partially) closed. */
  shouldExit(position: PositionView, market: MarketSnapshot): ExitSignal;
}

// ── Default Composite Strategy ────────────────────────────────────
/**
 * The default strategy that week-test.ts uses.
 * It combines volume, liquidity, price-range, momentum, spread,
 * sentiment, and smart-money signals into a single confidence score.
 */
export interface DefaultStrategyConfig {
  minProbability: number;
  maxProbability: number;
  minVolume: number;
  minLiquidity: number;
  minConfidence: number;
  minDaysToExpiry: number;
  targetProfitPercent: number;
  stopLossPercent: number;
  trailingStopPercent: number;
  maxPositionAgeDays: number;
  maxPositionAgeMinGain: number;
}

export class DefaultStrategy implements Strategy {
  readonly name = 'DefaultComposite';

  constructor(private cfg: DefaultStrategyConfig) {}

  analyze(market: MarketSnapshot): TradeSignal {
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

    // ── Spread gate (P0 #3) ──
    if (market.spread !== undefined && market.spread > 5) {
      return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `spread too wide: ${market.spread.toFixed(1)}%`, confidence: 0 };
    }

    // ── Momentum gate (P0 #2) ──
    if (market.momentum !== undefined && market.momentum < -10) {
      return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: `declining momentum: ${market.momentum.toFixed(1)}%`, confidence: 0 };
    }

    // ── Scoring ──
    const volumeScore = Math.min(market.volume / 500000, 1);
    const liquidityScore = Math.min(market.liquidity / 100000, 1);
    const priceScore = price >= 0.30 && price <= 0.70
      ? 1 - Math.abs(price - 0.5) * 2
      : (1 - Math.abs(price - 0.5) * 2) * 0.5;
    const vlRatio = market.liquidity > 0 ? Math.min(market.volume / market.liquidity / 10, 1) : 0;

    let confidence = (
      volumeScore * 0.22 +
      liquidityScore * 0.18 +
      priceScore * 0.18 +
      vlRatio * 0.12
    ) * 100;

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

    if (confidence > this.cfg.minConfidence) {
      // SELL signal for overpriced markets (P1 #3)
      if (price > 0.75 && (market.momentum ?? 0) < -3) {
        return {
          shouldTrade: true,
          side: 'SELL',
          outcomeIndex: 0,
          reason: `Overpriced + declining (price=${price.toFixed(2)}, momentum=${(market.momentum ?? 0).toFixed(1)}%)`,
          confidence,
        };
      }

      const outcomeIndex = price < 0.5 ? 0 : 1;
      return {
        shouldTrade: true,
        side: 'BUY',
        outcomeIndex,
        reason: `High confidence (vol=$${market.volume.toFixed(0)}, liq=$${market.liquidity.toFixed(0)})`,
        confidence,
      };
    }

    return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: 'low confidence', confidence };
  }

  shouldExit(pos: PositionView, market: MarketSnapshot): ExitSignal {
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

export function createDefaultStrategy(cfg: DefaultStrategyConfig): Strategy {
  return new DefaultStrategy(cfg);
}
