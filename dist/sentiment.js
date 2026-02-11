"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAnalyzer = void 0;
class SentimentAnalyzer {
    constructor() {
        // P2 #9: Expanded word lists with prediction-market / political vocabulary
        this.positiveWords = new Set([
            'good', 'great', 'excellent', 'amazing', 'bullish', 'moon', 'pump', 'win',
            'success', 'profit', 'gains', 'strong', 'surge', 'rally', 'boom', 'growth',
            'optimistic', 'positive', 'confirmed', 'approved', 'passed', 'likely',
            'certain', 'unanimous', 'upgrade', 'breakthrough', 'soaring', 'outperform',
            'landslide', 'victory', 'support', 'momentum', 'rising', 'uptick',
            'favorable', 'promising', 'endorsement', 'ratified', 'signed',
        ]);
        this.negativeWords = new Set([
            'bad', 'terrible', 'awful', 'horrible', 'bearish', 'dump', 'crash', 'lose',
            'fail', 'loss', 'weak', 'decline', 'drop', 'fall', 'collapse', 'pessimistic',
            'negative', 'concern', 'denied', 'rejected', 'postponed', 'unlikely',
            'impossible', 'scandal', 'investigation', 'indictment', 'downgrade',
            'plummet', 'underperform', 'defeat', 'veto', 'opposed', 'stalled',
            'controversial', 'uncertainty', 'risk', 'default', 'recession', 'sanctions',
        ]);
        this.intensifiers = new Set(['very', 'extremely', 'highly', 'really', 'super', 'incredibly', 'absolutely', 'totally', 'completely', 'overwhelmingly', 'significantly']);
        this.negators = new Set(['not', 'no', 'never', 'neither', 'hardly', "don't", "doesn't", "can't", "couldn't", "won't", "unlikely"]);
        // P3 #3: Bigram / multi-word phrase scoring
        this.positiveBigrams = new Map([
            ['better than', 0.8], ['more likely', 0.7], ['highly likely', 0.9],
            ['strong support', 0.8], ['ahead in', 0.6], ['set to', 0.5],
            ['on track', 0.7], ['widely expected', 0.6], ['looking good', 0.7],
        ]);
        this.negativeBigrams = new Map([
            ['worse than', -0.8], ['less likely', -0.7], ['highly unlikely', -0.9],
            ['falling behind', -0.8], ['at risk', -0.6], ['unlikely to', -0.7],
            ['no chance', -0.9], ['failed to', -0.6], ['pulled out', -0.5],
        ]);
    }
    analyzeSentiment(text) {
        const lower = text.toLowerCase();
        const words = this.tokenize(lower);
        let score = 0, magnitude = 0, count = 0;
        // P3 #3: Check bigrams first
        for (const [phrase, val] of this.positiveBigrams) {
            if (lower.includes(phrase)) {
                score += val;
                magnitude += Math.abs(val);
                count++;
            }
        }
        for (const [phrase, val] of this.negativeBigrams) {
            if (lower.includes(phrase)) {
                score += val;
                magnitude += Math.abs(val);
                count++;
            }
        }
        for (let i = 0; i < words.length; i++) {
            let word_score = this.positiveWords.has(words[i]) ? 1 : this.negativeWords.has(words[i]) ? -1 : 0;
            if (word_score !== 0) {
                if (i > 0 && this.intensifiers.has(words[i - 1]))
                    word_score *= 1.5;
                if (i > 0 && this.negators.has(words[i - 1]))
                    word_score *= -1;
                score += word_score;
                magnitude += Math.abs(word_score);
                count++;
            }
        }
        const final_score = Math.max(-1, Math.min(1, count > 0 ? score / count : 0));
        const label = final_score > 0.2 ? 'POSITIVE' : final_score < -0.2 ? 'NEGATIVE' : 'NEUTRAL';
        return { score: final_score, magnitude: count > 0 ? magnitude / count : 0, label, confidence: Math.min(magnitude / Math.max(count, 1), 1) };
    }
    tokenize(text) {
        return text
            .replace(/[^\w\s']/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    aggregateSentiment(data, decay_hours = 24) {
        if (data.length === 0) {
            return {
                overall_score: 0,
                confidence: 0,
                trend: 'NEUTRAL',
                volume: 0,
                sources: { twitter: 0, reddit: 0, news: 0 },
                temporal_decay: 0,
            };
        }
        const now = Date.now();
        const decay_ms = decay_hours * 60 * 60 * 1000;
        let weighted_score = 0;
        let total_weight = 0;
        let total_confidence = 0;
        const sources = { twitter: 0, reddit: 0, news: 0 };
        for (const item of data) {
            const sentiment = this.analyzeSentiment(item.text);
            const age_ms = now - item.timestamp;
            const time_weight = Math.exp(-age_ms / decay_ms);
            const engagement_weight = Math.log1p(item.engagement) / 10;
            const influence_weight = item.author_influence;
            const source_weight = this.getSourceWeight(item.source);
            const total_item_weight = time_weight *
                (1 + engagement_weight) *
                (1 + influence_weight) *
                source_weight;
            weighted_score += sentiment.score * total_item_weight;
            total_weight += total_item_weight;
            total_confidence += sentiment.confidence * total_item_weight;
            sources[item.source]++;
        }
        const overall_score = total_weight > 0 ? weighted_score / total_weight : 0;
        const confidence = total_weight > 0 ? total_confidence / total_weight : 0;
        let trend;
        if (overall_score > 0.3) {
            trend = 'BULLISH';
        }
        else if (overall_score < -0.3) {
            trend = 'BEARISH';
        }
        else {
            trend = 'NEUTRAL';
        }
        const avg_age = data.reduce((sum, d) => sum + (now - d.timestamp), 0) / data.length;
        const temporal_decay = Math.exp(-avg_age / decay_ms);
        return {
            overall_score,
            confidence,
            trend,
            volume: data.length,
            sources,
            temporal_decay,
        };
    }
    getSourceWeight(source) {
        switch (source) {
            case 'news':
                return 1.5;
            case 'twitter':
                return 1.0;
            case 'reddit':
                return 0.8;
            default:
                return 1.0;
        }
    }
    calculateSentimentMomentum(historical) {
        if (historical.length < 2)
            return { momentum: 0, acceleration: 0, direction: 'STABLE' };
        const scores = historical.map(h => h.overall_score);
        let momentum = 0;
        for (let i = 1; i < scores.length; i++)
            momentum += scores[i] - scores[i - 1];
        momentum /= (scores.length - 1);
        let acceleration = 0;
        if (scores.length > 2) {
            for (let i = 2; i < scores.length; i++) {
                acceleration += (scores[i] - scores[i - 1]) - (scores[i - 1] - scores[i - 2]);
            }
            acceleration /= (scores.length - 2);
        }
        const direction = momentum > 0.1 ? 'IMPROVING' : momentum < -0.1 ? 'DECLINING' : 'STABLE';
        return { momentum, acceleration, direction };
    }
    detectAnomalies(historical) {
        if (historical.length < 3)
            return { is_anomaly: false, z_score: 0, significance: 'LOW' };
        const scores = historical.map(h => h.overall_score);
        const current = scores[scores.length - 1];
        const previous = scores.slice(0, -1);
        const mean = previous.reduce((s, v) => s + v, 0) / previous.length;
        const variance = previous.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / previous.length;
        const std_dev = Math.sqrt(variance);
        const z_score = std_dev > 0 ? (current - mean) / std_dev : 0;
        const is_anomaly = Math.abs(z_score) > 2;
        const significance = Math.abs(z_score) > 3 ? 'HIGH' : Math.abs(z_score) > 2 ? 'MEDIUM' : 'LOW';
        return { is_anomaly, z_score, significance };
    }
    generateSentimentSignal(current, historical) {
        const rationale = [];
        let buy_score = 0;
        let sell_score = 0;
        if (current.overall_score > 0.4) {
            buy_score += 0.3;
            rationale.push('Strong positive sentiment');
        }
        else if (current.overall_score < -0.4) {
            sell_score += 0.3;
            rationale.push('Strong negative sentiment');
        }
        if (current.confidence > 0.7) {
            const boost = 0.2;
            if (current.overall_score > 0) {
                buy_score += boost;
            }
            else {
                sell_score += boost;
            }
            rationale.push('High confidence in sentiment');
        }
        const momentum = this.calculateSentimentMomentum(historical);
        if (momentum.direction === 'IMPROVING') {
            buy_score += 0.2;
            rationale.push('Improving sentiment trend');
        }
        else if (momentum.direction === 'DECLINING') {
            sell_score += 0.2;
            rationale.push('Declining sentiment trend');
        }
        const anomaly = this.detectAnomalies(historical);
        if (anomaly.is_anomaly && anomaly.significance === 'HIGH') {
            if (anomaly.z_score > 0) {
                buy_score += 0.3;
                rationale.push('Unusual positive sentiment spike');
            }
            else {
                sell_score += 0.3;
                rationale.push('Unusual negative sentiment drop');
            }
        }
        if (current.volume > 100) {
            const boost = 0.1;
            if (current.overall_score > 0) {
                buy_score += boost;
            }
            else {
                sell_score += boost;
            }
            rationale.push('High discussion volume');
        }
        let signal;
        let strength;
        if (buy_score > sell_score && buy_score > 0.5) {
            signal = 'BUY';
            strength = Math.min(buy_score, 1);
        }
        else if (sell_score > buy_score && sell_score > 0.5) {
            signal = 'SELL';
            strength = Math.min(sell_score, 1);
        }
        else {
            signal = 'HOLD';
            strength = 0;
            rationale.push('Mixed or neutral signals');
        }
        return { signal, strength, rationale };
    }
}
exports.SentimentAnalyzer = SentimentAnalyzer;
//# sourceMappingURL=sentiment.js.map