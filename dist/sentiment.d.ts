interface SentimentResult {
    score: number;
    magnitude: number;
    label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
}
interface SocialData {
    source: 'twitter' | 'reddit' | 'news';
    text: string;
    timestamp: number;
    engagement: number;
    author_influence: number;
}
interface AggregatedSentiment {
    overall_score: number;
    confidence: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    volume: number;
    sources: {
        twitter: number;
        reddit: number;
        news: number;
    };
    temporal_decay: number;
}
export declare class SentimentAnalyzer {
    private positiveWords;
    private negativeWords;
    private intensifiers;
    private negators;
    analyzeSentiment(text: string): SentimentResult;
    private tokenize;
    aggregateSentiment(data: SocialData[], decay_hours?: number): AggregatedSentiment;
    private getSourceWeight;
    calculateSentimentMomentum(historical: AggregatedSentiment[]): {
        momentum: number;
        acceleration: number;
        direction: 'IMPROVING' | 'DECLINING' | 'STABLE';
    };
    detectAnomalies(historical: AggregatedSentiment[]): {
        is_anomaly: boolean;
        z_score: number;
        significance: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    generateSentimentSignal(current: AggregatedSentiment, historical: AggregatedSentiment[]): {
        signal: 'BUY' | 'SELL' | 'HOLD';
        strength: number;
        rationale: string[];
    };
}
export { SentimentResult, SocialData, AggregatedSentiment };
//# sourceMappingURL=sentiment.d.ts.map