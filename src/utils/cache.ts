import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  enabled?: boolean;
}

export class Cache {
  private cache: LRUCache<string, any>;
  private enabled: boolean;

  constructor(options: CacheOptions = {}) {
    const {
      maxSize = 1000,
      ttlMs = 5 * 60 * 1000, // 5 minutes default
      enabled = true
    } = options;

    this.enabled = enabled;
    this.cache = new LRUCache({
      max: maxSize,
      ttl: ttlMs,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get(key) as T;
  }

  set<T>(key: string, value: T): void {
    if (!this.enabled) return;
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    if (!this.enabled) return false;
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    if (!this.enabled) return false;
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      enabled: this.enabled
    };
  }

  // Helper method to create cache keys
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }
}
