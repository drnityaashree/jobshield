import { normalizeCompanyName, stripLegalSuffixes } from './normalizer.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  provider: string;
  query: string;
}

export class VerificationCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private maxEntries: number;

  constructor(ttlMinutes = 30, maxEntries = 500) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a normalized cache key for a company name.
   */
  public getNormalizedKey(companyName: string, prefix = 'company'): string {
    const stripped = stripLegalSuffixes(companyName);
    const normalized = normalizeCompanyName(stripped || companyName).toLowerCase();
    return `${prefix}:${normalized}`;
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(key: string, data: T, query: string, provider: string): void {
    // Prune if over max capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      query,
      provider,
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const searchResultsCache = new VerificationCache<any>(30, 500);
export const analysisCache = new VerificationCache<any>(15, 200);
