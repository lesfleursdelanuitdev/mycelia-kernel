/**
 * RouteCache Class
 * 
 * Bounded LRU (Least Recently Used) cache for route matches.
 * Uses Map's insertion order to track access order.
 * 
 * On get(): delete and re-insert to move to end (most recent)
 * On set(): if at capacity, delete first entry (least recent)
 * 
 * @example
 * const cache = new RouteCache(1000);
 * cache.set('user/123', matchResult);
 * const result = cache.get('user/123');
 */
export class RouteCache {
  /**
   * Create a new RouteCache
   * 
   * @param {number} [capacity=1000] - Maximum number of cached entries
   */
  constructor(capacity = 1000) {
    if (typeof capacity !== 'number' || capacity < 1) {
      throw new Error('RouteCache: capacity must be a positive number');
    }
    
    this.capacity = capacity;
    this.cache = new Map(); // path → MatchResult
  }
  
  /**
   * Get cached match for a path (updates access order)
   * 
   * @param {string} path - Path string
   * @returns {MatchResult|null} Cached match or null
   */
  get(path) {
    if (!this.cache.has(path)) {
      return null;
    }
    
    // Move to end (most recently used) by delete + re-insert
    const matchResult = this.cache.get(path);
    this.cache.delete(path);
    this.cache.set(path, matchResult);
    
    return matchResult;
  }
  
  /**
   * Cache a match result for a path (updates access order)
   * 
   * @param {string} path - Path string
   * @param {MatchResult} matchResult - Match result to cache
   */
  set(path, matchResult) {
    // If already exists, remove it first (will be re-inserted at end)
    if (this.cache.has(path)) {
      this.cache.delete(path);
    }
    // If at capacity, remove least recently used (first entry)
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Add/update at end (most recently used)
    this.cache.set(path, matchResult);
  }
  
  /**
   * Clear all cached matches
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Invalidate cache entries that match a pattern
   * 
   * @param {string} _pattern - Pattern to invalidate
   */
  // eslint-disable-next-line no-unused-vars
  invalidate(_pattern) {
    // Simple: clear all (could be smarter and only remove matching entries)
    // This is safe and simple - cache will rebuild as paths are matched
    this.cache.clear();
  }
  
  /**
   * Get cache size
   * 
   * @returns {number} Current cache size
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * Get cache capacity
   * 
   * @returns {number} Maximum capacity
   */
  getCapacity() {
    return this.capacity;
  }
}

