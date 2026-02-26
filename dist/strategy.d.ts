/**
 * Strategy Abstraction Layer (P1-HIGH #11)
 *
 * Provides a pluggable Strategy interface so trading logic can be
 * swapped, A/B tested, or composed without rewriting week-test.ts.
 */
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
    momentum?: number;
    spread?: number;
    sentimentScore?: number;
    smartMoneyActive?: boolean;
    smartMoneyOutcomeIndex?: number;
    tags?: string[];
}
export interface TradeSignal {
    shouldTrade: boolean;
    side: 'BUY' | 'SELL';
    outcomeIndex: number;
    reason: string;
    confidence: number;
}
export interface ExitSignal {
    shouldExit: boolean;
    exitQuantityPercent: number;
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
export interface Strategy {
    readonly name: string;
    /** Analyse a market and produce a trade signal. */
    analyze(market: MarketSnapshot): TradeSignal;
    /** Decide whether an existing position should be (partially) closed. */
    shouldExit(position: PositionView, market: MarketSnapshot): ExitSignal;
}
/**
 * The default strategy that week-test.ts uses.
 * It combines volume, liquidity, price-range, momentum, spread,
 * sentiment, and smart-money signals into a single confidence score.
 */
export interface DefaultStrategyConfig {
    minProbability: number;
    maxProbability: number;
    safeBetThreshold: number;
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
export declare class DefaultStrategy implements Strategy {
    private cfg;
    readonly name = "DefaultComposite";
    constructor(cfg: DefaultStrategyConfig);
    analyze(market: MarketSnapshot): TradeSignal;
    shouldExit(pos: PositionView, market: MarketSnapshot): ExitSignal;
}
export declare function createDefaultStrategy(cfg: DefaultStrategyConfig): Strategy;
//# sourceMappingURL=strategy.d.ts.map