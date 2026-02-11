import { z } from 'zod';
declare class APIError extends Error {
    statusCode: number;
    endpoint: string;
    retryable: boolean;
    constructor(statusCode: number, endpoint: string, message: string, retryable?: boolean);
}
declare const MarketSchema: z.ZodObject<{
    conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    gameStartTime: z.ZodOptional<z.ZodString>;
    questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    icon: z.ZodOptional<z.ZodString>;
    outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    gameStartTime: z.ZodOptional<z.ZodString>;
    questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    icon: z.ZodOptional<z.ZodString>;
    outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    gameStartTime: z.ZodOptional<z.ZodString>;
    questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    icon: z.ZodOptional<z.ZodString>;
    outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, z.ZodTypeAny, "passthrough">>;
declare const EventSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    active: z.ZodBoolean;
    closed: z.ZodBoolean;
    archived: z.ZodBoolean;
    restricted: z.ZodOptional<z.ZodBoolean>;
    markets: z.ZodArray<z.ZodObject<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    active: z.ZodBoolean;
    closed: z.ZodBoolean;
    archived: z.ZodBoolean;
    restricted: z.ZodOptional<z.ZodBoolean>;
    markets: z.ZodArray<z.ZodObject<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    active: z.ZodBoolean;
    closed: z.ZodBoolean;
    archived: z.ZodBoolean;
    restricted: z.ZodOptional<z.ZodBoolean>;
    markets: z.ZodArray<z.ZodObject<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        conditionId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        question: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        endDate: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        endDateIso: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        gameStartTime: z.ZodOptional<z.ZodString>;
        questionID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        slug: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        closed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        archived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        acceptingOrders: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        secondsDelay: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        icon: z.ZodOptional<z.ZodString>;
        outcomes: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        outcomePrices: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        clobTokenIds: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>>>;
        volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        volumeNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
        liquidityNum: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    volume: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
    liquidity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>;
}, z.ZodTypeAny, "passthrough">>;
declare const OrderbookSchema: z.ZodObject<{
    asset_id: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    bids: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    asks: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    timestamp: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    asset_id: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    bids: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    asks: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    timestamp: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    asset_id: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    bids: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    asks: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        price: z.ZodString;
        size: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        price: string;
        size: string;
    }, {
        price: string;
        size: string;
    }>, "many">>>;
    timestamp: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>>>;
}, z.ZodTypeAny, "passthrough">>;
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
    price: string;
    id: string;
    asset_id: string;
    size: string;
    timestamp: number;
    market: string;
    side: "BUY" | "SELL";
    fee_rate_bps?: number | undefined;
    status?: string | undefined;
}, {
    price: string;
    id: string;
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
    private readonly defaultTimeoutMs;
    private pendingRequests;
    constructor(config?: PolymarketConfig);
    private enforceRateLimit;
    private isRetryableError;
    private delay;
    private normalizeCacheKey;
    private fetchWithRetry;
    private fetch;
    getMarkets(params?: {
        limit?: number;
        offset?: number;
        closed?: boolean;
        archived?: boolean;
        active?: boolean;
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
        market?: string;
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