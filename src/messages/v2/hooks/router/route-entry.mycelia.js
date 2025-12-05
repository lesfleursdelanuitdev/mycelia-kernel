/**
 * RouteEntry Class
 * 
 * Represents a single route with pattern, handler, matcher, and metadata.
 * 
 * @example
 * const entry = new RouteEntry(
 *   'user/{id}',
 *   async (message, iterator, params) => { ... },
 *   (path) => { ... },
 *   { description: 'User route', priority: 10 }
 * );
 */
export class RouteEntry {
  /**
   * Create a new RouteEntry
   * 
   * @param {string} pattern - Route pattern (e.g., "user/{id}", "posts/*")
   * @param {Function} handler - Handler function: async (message, params, options) => result
   * @param {Function} matcher - Matcher function: (path: string) => MatchResult | null
   * @param {Object} [metadata={}] - Route metadata (description, priority, etc.)
   */
  constructor(pattern, handler, matcher, metadata = {}) {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('RouteEntry: pattern must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('RouteEntry: handler must be a function');
    }
    if (typeof matcher !== 'function') {
      throw new Error('RouteEntry: matcher must be a function');
    }
    
    this.pattern = pattern;
    this.handler = handler;
    this.matcher = matcher;
    this.metadata = metadata;
  }
  
  /**
   * Match a path against this route
   * 
   * @param {string} path - Path to match (e.g., "user/123")
   * @returns {MatchResult|null} Match result with params, or null if no match
   */
  match(path) {
    return this.matcher(path);
  }
}

