"use strict";
/**
 * Thread-Safe Cache Implementation
 * LRU (Least Recently Used) cache with concurrent access safety
 * Uses a simple lock mechanism for write operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = exports.ThreadSafeCache = void 0;
class ThreadSafeCache {
    constructor(maxSize = 1000, defaultTTL = 60000) {
        this.isWriteLocked = false;
        this.writeWaitQueue = [];
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }
    /**
     * Get a value from cache
     * Thread-safe for reads (no lock needed)
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // Update access metadata (no lock needed for reads)
        entry.accessCount++;
        entry.lastAccessTime = Date.now();
        return entry.value;
    }
    /**
     * Set a value in cache (thread-safe with write lock)
     */
    async set(key, value, ttl = this.defaultTTL) {
        // Acquire write lock
        await this.acquireWriteLock();
        try {
            // Check if we need to evict entries
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                this.evictLRU();
            }
            this.cache.set(key, {
                value,
                expiresAt: Date.now() + ttl,
                accessCount: 0,
                lastAccessTime: Date.now(),
            });
        }
        finally {
            this.releaseWriteLock();
        }
    }
    /**
     * Set multiple values atomically
     */
    async setMultiple(entries, globalTTL) {
        await this.acquireWriteLock();
        try {
            for (const [key, value, ttl] of entries) {
                if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                    this.evictLRU();
                }
                this.cache.set(key, {
                    value,
                    expiresAt: Date.now() + (ttl || globalTTL || this.defaultTTL),
                    accessCount: 0,
                    lastAccessTime: Date.now(),
                });
            }
        }
        finally {
            this.releaseWriteLock();
        }
    }
    /**
     * Delete a key from cache
     */
    async delete(key) {
        await this.acquireWriteLock();
        try {
            return this.cache.delete(key);
        }
        finally {
            this.releaseWriteLock();
        }
    }
    /**
     * Clear all cache entries
     */
    async clear() {
        await this.acquireWriteLock();
        try {
            this.cache.clear();
        }
        finally {
            this.releaseWriteLock();
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        let expiredCount = 0;
        // Count expired entries
        this.cache.forEach((entry) => {
            if (Date.now() > entry.expiresAt) {
                expiredCount++;
            }
        });
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilizationPercent: (this.cache.size / this.maxSize) * 100,
            totalEntries: this.cache.size,
            expiredEntries: expiredCount,
        };
    }
    /**
     * Clean up expired entries
     */
    async cleanup() {
        await this.acquireWriteLock();
        try {
            const keysToDelete = [];
            this.cache.forEach((entry, key) => {
                if (Date.now() > entry.expiresAt) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach((key) => this.cache.delete(key));
            return keysToDelete.length;
        }
        finally {
            this.releaseWriteLock();
        }
    }
    /**
     * Acquire write lock with queueing
     */
    async acquireWriteLock() {
        return new Promise((resolve) => {
            if (!this.isWriteLocked) {
                this.isWriteLocked = true;
                resolve();
            }
            else {
                this.writeWaitQueue.push(resolve);
            }
        });
    }
    /**
     * Release write lock and process queue
     */
    releaseWriteLock() {
        const next = this.writeWaitQueue.shift();
        if (next) {
            // Process next queued write
            next();
        }
        else {
            this.isWriteLocked = false;
        }
    }
    /**
     * Evict least recently used entry
     */
    evictLRU() {
        const now = Date.now();
        const expiredKeys = [];
        let lruKey = null;
        let lruTime = Infinity;
        // First pass: collect expired entries
        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
            else if (entry.lastAccessTime < lruTime) {
                // Track LRU of non-expired entries
                lruTime = entry.lastAccessTime;
                lruKey = key;
            }
        });
        // Delete expired entries first
        if (expiredKeys.length > 0) {
            expiredKeys.forEach((key) => this.cache.delete(key));
        }
        // If still over capacity, evict LRU
        if (this.cache.size >= this.maxSize && lruKey !== null) {
            this.cache.delete(lruKey);
        }
    }
    /**
     * Get all cache entries (for debugging/monitoring)
     */
    async getAll() {
        await this.acquireWriteLock();
        try {
            const result = [];
            this.cache.forEach((entry, key) => {
                // Skip expired entries
                if (Date.now() <= entry.expiresAt) {
                    result.push([key, entry.value]);
                }
            });
            return result;
        }
        finally {
            this.releaseWriteLock();
        }
    }
}
exports.ThreadSafeCache = ThreadSafeCache;
// Export singleton cache instance
let cacheInstance = null;
function getCache(maxSize = 1000, ttl = 60000) {
    if (!cacheInstance) {
        cacheInstance = new ThreadSafeCache(maxSize, ttl);
    }
    return cacheInstance;
}
exports.getCache = getCache;
//# sourceMappingURL=cache.js.map