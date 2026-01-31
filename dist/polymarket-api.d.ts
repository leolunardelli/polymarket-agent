import { z } from 'zod';
declare class APIError extends Error {
    statusCode: number;
    endpoint: string;
    retryable: boolean;
    constructor(statusCode: number, endpoint: string, message: string, retryable?: boolean);
}
declare const MarketSchema: z.ZodObject<{
    condition_id: z.ZodString;
    question: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    end_date_iso: z.ZodString;
    game_start_time: z.ZodOptional<z.ZodString>;
    question_id: z.ZodString;
    market_slug: z.ZodString;
    min_incentive_size: z.ZodOptional<z.ZodNumber>;
    max_incentive_spread: z.ZodOptional<z.ZodNumber>;
    active: z.ZodBoolean;
    closed: z.ZodBoolean;
    archived: z.ZodBoolean;
    accepting_orders: z.ZodBoolean;
    seconds_delay: z.ZodNumber;
    icon: z.ZodOptional<z.ZodString>;
    outcomes: z.ZodArray<z.ZodObject<{
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        price: number;
    }, {
        price: number;
    }>, "many">;
    tokens: z.ZodArray<z.ZodObject<{
        token_id: z.ZodString;
        outcome: z.ZodString;
        price: z.ZodNumber;
        winner: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        price: number;
        token_id: string;
        outcome: string;
        winner?: boolean | undefined;
    }, {
        price: number;
        token_id: string;
        outcome: string;
        winner?: boolean | undefined;
    }>, "many">;
    volume: z.ZodOptional<z.ZodNumber>;
    volume_num: z.ZodOptional<z.ZodNumber>;
    liquidity: z.ZodOptional<z.ZodNumber>;
    liquidity_num: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    condition_id: string;
    question: string;
    end_date_iso: string;
    question_id: string;
    market_slug: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    accepting_orders: boolean;
    seconds_delay: number;
    outcomes: {
        price: number;
    }[];
    tokens: {
        price: number;
        token_id: string;
        outcome: string;
        winner?: boolean | undefined;
    }[];
    description?: string | undefined;
    game_start_time?: string | undefined;
    min_incentive_size?: number | undefined;
    max_incentive_spread?: number | undefined;
    icon?: string | undefined;
    volume?: number | undefined;
    volume_num?: number | undefined;
    liquidity?: number | undefined;
    liquidity_num?: number | undefined;
}, {
    condition_id: string;
    question: string;
    end_date_iso: string;
    question_id: string;
    market_slug: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    accepting_orders: boolean;
    seconds_delay: number;
    outcomes: {
        price: number;
    }[];
    tokens: {
        price: number;
        token_id: string;
        outcome: string;
        winner?: boolean | undefined;
    }[];
    description?: string | undefined;
    game_start_time?: string | undefined;
    min_incentive_size?: number | undefined;
    max_incentive_spread?: number | undefined;
    icon?: string | undefined;
    volume?: number | undefined;
    volume_num?: number | undefined;
    liquidity?: number | undefined;
    liquidity_num?: number | undefined;
}>;
declare const EventSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    start_date_iso: z.ZodOptional<z.ZodString>;
    end_date_iso: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    active: z.ZodBoolean;
    closed: z.ZodBoolean;
    archived: z.ZodBoolean;
    restricted: z.ZodOptional<z.ZodBoolean>;
    markets: z.ZodArray<z.ZodObject<{
        condition_id: z.ZodString;
        question: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        end_date_iso: z.ZodString;
        game_start_time: z.ZodOptional<z.ZodString>;
        question_id: z.ZodString;
        market_slug: z.ZodString;
        min_incentive_size: z.ZodOptional<z.ZodNumber>;
        max_incentive_spread: z.ZodOptional<z.ZodNumber>;
        active: z.ZodBoolean;
        closed: z.ZodBoolean;
        archived: z.ZodBoolean;
        accepting_orders: z.ZodBoolean;
        seconds_delay: z.ZodNumber;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodArray<z.ZodObject<{
            price: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            price: number;
        }, {
            price: number;
        }>, "many">;
        tokens: z.ZodArray<z.ZodObject<{
            token_id: z.ZodString;
            outcome: z.ZodString;
            price: z.ZodNumber;
            winner: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }, {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }>, "many">;
        volume: z.ZodOptional<z.ZodNumber>;
        volume_num: z.ZodOptional<z.ZodNumber>;
        liquidity: z.ZodOptional<z.ZodNumber>;
        liquidity_num: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        condition_id: string;
        question: string;
        end_date_iso: string;
        question_id: string;
        market_slug: string;
        active: boolean;
        closed: boolean;
        archived: boolean;
        accepting_orders: boolean;
        seconds_delay: number;
        outcomes: {
            price: number;
        }[];
        tokens: {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }[];
        description?: string | undefined;
        game_start_time?: string | undefined;
        min_incentive_size?: number | undefined;
        max_incentive_spread?: number | undefined;
        icon?: string | undefined;
        volume?: number | undefined;
        volume_num?: number | undefined;
        liquidity?: number | undefined;
        liquidity_num?: number | undefined;
    }, {
        condition_id: string;
        question: string;
        end_date_iso: string;
        question_id: string;
        market_slug: string;
        active: boolean;
        closed: boolean;
        archived: boolean;
        accepting_orders: boolean;
        seconds_delay: number;
        outcomes: {
            price: number;
        }[];
        tokens: {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }[];
        description?: string | undefined;
        game_start_time?: string | undefined;
        min_incentive_size?: number | undefined;
        max_incentive_spread?: number | undefined;
        icon?: string | undefined;
        volume?: number | undefined;
        volume_num?: number | undefined;
        liquidity?: number | undefined;
        liquidity_num?: number | undefined;
    }>, "many">;
    volume: z.ZodOptional<z.ZodNumber>;
    liquidity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    slug: string;
    title: string;
    markets: {
        condition_id: string;
        question: string;
        end_date_iso: string;
        question_id: string;
        market_slug: string;
        active: boolean;
        closed: boolean;
        archived: boolean;
        accepting_orders: boolean;
        seconds_delay: number;
        outcomes: {
            price: number;
        }[];
        tokens: {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }[];
        description?: string | undefined;
        game_start_time?: string | undefined;
        min_incentive_size?: number | undefined;
        max_incentive_spread?: number | undefined;
        icon?: string | undefined;
        volume?: number | undefined;
        volume_num?: number | undefined;
        liquidity?: number | undefined;
        liquidity_num?: number | undefined;
    }[];
    description?: string | undefined;
    start_date_iso?: string | undefined;
    end_date_iso?: string | undefined;
    image?: string | undefined;
    icon?: string | undefined;
    restricted?: boolean | undefined;
    volume?: number | undefined;
    liquidity?: number | undefined;
}, {
    id: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    slug: string;
    title: string;
    markets: {
        condition_id: string;
        question: string;
        end_date_iso: string;
        question_id: string;
        market_slug: string;
        active: boolean;
        closed: boolean;
        archived: boolean;
        accepting_orders: boolean;
        seconds_delay: number;
        outcomes: {
            price: number;
        }[];
        tokens: {
            price: number;
            token_id: string;
            outcome: string;
            winner?: boolean | undefined;
        }[];
        description?: string | undefined;
        game_start_time?: string | undefined;
        min_incentive_size?: number | undefined;
        max_incentive_spread?: number | undefined;
        icon?: string | undefined;
        volume?: number | undefined;
        volume_num?: number | undefined;
        liquidity?: number | undefined;
        liquidity_num?: number | undefined;
    }[];
    description?: string | undefined;
    start_date_iso?: string | undefined;
    end_date_iso?: string | undefined;
    image?: string | undefined;
    icon?: string | undefined;
    restricted?: boolean | undefined;
    volume?: number | undefined;
    liquidity?: number | undefined;
}>;
declare const OrderbookSchema: z.ZodObject<{
    asset_id: z.ZodString;
    bids: z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">;
    asks: z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    asset_id: string;
    bids: {
        price: string;
        size: string;
    }[];
    asks: {
        price: string;
        size: string;
    }[];
    timestamp: number;
}, {
    asset_id: string;
    bids: {
        price: string;
        size: string;
    }[];
    asks: {
        price: string;
        size: string;
    }[];
    timestamp: number;
}>;
declare const TradeSchema: z.ZodObject<{
    id: z.ZodString;
    market: z.ZodString;
    asset_id: z.ZodString;
    side: z.ZodEnum<["BUY", "SELL"]>;
    size: z.ZodString;
    price: z.ZodString;
    timestamp: z.ZodNumber;
    fee_rate_bps: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    price: string;
    asset_id: string;
    size: string;
    timestamp: number;
    market: string;
    side: "BUY" | "SELL";
    fee_rate_bps?: number | undefined;
    status?: string | undefined;
}, {
    id: string;
    price: string;
    asset_id: string;
    size: string;
    timestamp: number;
    market: string;
    side: "BUY" | "SELL";
    fee_rate_bps?: number | undefined;
    status?: string | undefined;
}>;
declare const PositionSchema: z.ZodObject<{
    asset_id: z.ZodString;
    market: z.ZodString;
    size: z.ZodString;
    average_price: z.ZodString;
    current_value: z.ZodString;
    pnl: z.ZodString;
    pnl_percentage: z.ZodString;
}, "strip", z.ZodTypeAny, {
    asset_id: string;
    size: string;
    market: string;
    average_price: string;
    current_value: string;
    pnl: string;
    pnl_percentage: string;
}, {
    asset_id: string;
    size: string;
    market: string;
    average_price: string;
    current_value: string;
    pnl: string;
    pnl_percentage: string;
}>;
type Market = z.infer<typeof MarketSchema>;
type Event = z.infer<typeof EventSchema>;
type Orderbook = z.infer<typeof OrderbookSchema>;
type Trade = z.infer<typeof TradeSchema>;
type Position = z.infer<typeof PositionSchema>;
interface PolymarketConfig {
    apiKey?: string;
    privateKey?: string;
    chainId?: number;
    baseUrls?: {
        gamma?: string;
        clob?: string;
        data?: string;
    };
    rateLimit?: {
        maxRequests: number;
        windowMs: number;
    };
    testMode?: {
        enabled: boolean;
        virtualBalance?: number;
    };
}
export declare class PolymarketAPI {
    private config;
    private requests;
    private cache;
    private readonly cacheTTL;
    private readonly urls;
    private readonly maxRequests;
    private readonly windowMs;
    private readonly retryConfig;
    private readonly testMode;
    constructor(config?: PolymarketConfig);
    private enforceRateLimit;
    private isRetryableError;
    private delay;
    private fetchWithRetry;
    private fetch;
    getMarkets(params?: {
        limit?: number;
        offset?: number;
        closed?: boolean;
        archived?: boolean;
        order?: 'id' | 'volume' | 'liquidity';
        ascending?: boolean;
    }): Promise<Market[]>;
    getMarket(slug: string): Promise<Market>;
    getEvents(params?: {
        limit?: number;
        offset?: number;
        closed?: boolean;
        archived?: boolean;
        order?: 'id' | 'volume' | 'liquidity';
        ascending?: boolean;
        tag?: string;
    }): Promise<Event[]>;
    getEvent(slug: string): Promise<Event>;
    getOrderbook(tokenId: string): Promise<Orderbook>;
    getPrice(tokenId: string, side?: 'BUY' | 'SELL'): Promise<number>;
    getMidpoint(tokenId: string): Promise<number>;
    getSpread(tokenId: string): Promise<{
        spread: number;
        spread_percent: number;
    }>;
    getTrades(params?: {
        market?: string;
        asset_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<Trade[]>;
    getPositions(address: string): Promise<Position[]>;
    searchMarkets(query: string): Promise<Market[]>;
    getPriceHistory(tokenId: string, params?: {
        startTs?: number;
        endTs?: number;
        interval?: 'minute' | 'hour' | 'day';
    }): Promise<Array<{
        timestamp: number;
        price: number;
    }>>;
    getTags(): Promise<Array<{
        label: string;
        slug: string;
    }>>;
    clearCache(): void;
    setCacheTTL(ttl: number): void;
    /**
     * Check if test mode is enabled
     */
    isTestMode(): boolean;
    /**
     * Get test mode configuration
     */
    getTestModeConfig(): {
        enabled: boolean;
        virtualBalance?: number;
    };
}
export { Market, Event, Orderbook, Trade, Position, APIError };
//# sourceMappingURL=polymarket-api.d.ts.map