/**
 * Thread-Safe Cache Implementation
 * LRU (Least Recently Used) cache with concurrent access safety
 * Uses a simple lock mechanism for write operations
 */
export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    accessCount: number;
    lastAccessTime: number;
}
export declare class ThreadSafeCache<K extends string | number = string, V = any> {
    private cache;
    private maxSize;
    private defaultTTL;
    private isWriteLocked;
    private writeWaitQueue;
    private hitCount;
    private missCount;
    private evictionCount;
    constructor(maxSize?: number, defaultTTL?: number);
    /**
     * Get a value from cache
     * Thread-safe for reads (no lock needed)
     */
    get(key: K): V | undefined;
    /**
     * Set a value in cache (thread-safe with write lock)
     */
    set(key: K, value: V, ttl?: number): Promise<void>;
    /**
     * Set multiple values atomically
     */
    setMultiple(entries: Array<[K, V, number?]>, globalTTL?: number): Promise<void>;
    /**
     * Delete a key from cache
     */
    delete(key: K): Promise<boolean>;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        utilizationPercent: number;
        totalEntries: number;
        expiredEntries: number;
        hitCount: number;
        missCount: number;
        hitRate: number;
        evictionCount: number;
    };
    /**
     * Clean up expired entries
     */
    cleanup(): Promise<number>;
    /**
     * Acquire write lock with queueing
     */
    private acquireWriteLock;
    /**
     * Release write lock and process queue
     */
    private releaseWriteLock;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Get all cache entries (for debugging/monitoring)
     */
    getAll(): Promise<Array<[K, V]>>;
}
export declare function getCache<V = any>(maxSize?: number, ttl?: number): ThreadSafeCache<string, V>;
//# sourceMappingURL=cache.d.ts.map