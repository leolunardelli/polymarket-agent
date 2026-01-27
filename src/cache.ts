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

export class ThreadSafeCache<K extends string | number = string, V = any> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private defaultTTL: number;
  private isWriteLocked: boolean = false;
  private writeWaitQueue: Array<() => void> = [];

  constructor(maxSize: number = 1000, defaultTTL: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from cache
   * Thread-safe for reads (no lock needed)
   */
  public get(key: K): V | undefined {
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
  public async set(key: K, value: V, ttl: number = this.defaultTTL): Promise<void> {
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
    } finally {
      this.releaseWriteLock();
    }
  }

  /**
   * Set multiple values atomically
   */
  public async setMultiple(
    entries: Array<[K, V, number?]>,
    globalTTL?: number
  ): Promise<void> {
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
    } finally {
      this.releaseWriteLock();
    }
  }

  /**
   * Delete a key from cache
   */
  public async delete(key: K): Promise<boolean> {
    await this.acquireWriteLock();

    try {
      return this.cache.delete(key);
    } finally {
      this.releaseWriteLock();
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    await this.acquireWriteLock();

    try {
      this.cache.clear();
    } finally {
      this.releaseWriteLock();
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    totalEntries: number;
    expiredEntries: number;
  } {
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
  public async cleanup(): Promise<number> {
    await this.acquireWriteLock();

    try {
      const keysToDelete: K[] = [];

      this.cache.forEach((entry, key) => {
        if (Date.now() > entry.expiresAt) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => this.cache.delete(key));

      return keysToDelete.length;
    } finally {
      this.releaseWriteLock();
    }
  }

  /**
   * Acquire write lock with queueing
   */
  private async acquireWriteLock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isWriteLocked) {
        this.isWriteLocked = true;
        resolve();
      } else {
        this.writeWaitQueue.push(resolve);
      }
    });
  }

  /**
   * Release write lock and process queue
   */
  private releaseWriteLock(): void {
    const next = this.writeWaitQueue.shift();
    if (next) {
      // Process next queued write
      next();
    } else {
      this.isWriteLocked = false;
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const now = Date.now();
    const expiredKeys: K[] = [];
    let lruKey: K | null = null;
    let lruTime = Infinity;

    // First pass: collect expired entries
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      } else if (entry.lastAccessTime < lruTime) {
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
  public async getAll(): Promise<Array<[K, V]>> {
    await this.acquireWriteLock();

    try {
      const result: Array<[K, V]> = [];

      this.cache.forEach((entry, key) => {
        // Skip expired entries
        if (Date.now() <= entry.expiresAt) {
          result.push([key, entry.value]);
        }
      });

      return result;
    } finally {
      this.releaseWriteLock();
    }
  }
}

// Export singleton cache instance
let cacheInstance: ThreadSafeCache<string> | null = null;

export function getCache(maxSize: number = 1000, ttl: number = 60000): ThreadSafeCache<string> {
  if (!cacheInstance) {
    cacheInstance = new ThreadSafeCache<string>(maxSize, ttl);
  }
  return cacheInstance;
}
