import { RouteEntry } from './route-entry.mycelia.js';
import { RouteCache } from './route-cache.mycelia.js';

/**
 * SubsystemRouter Class
 * 
 * Manages route registration and matching for subsystems.
 * Supports strict matching (one pattern = one handler).
 * If multiple routes match a path, the route with the longest pattern wins.
 * 
 * @example
 * const router = new SubsystemRouter(subsystem, { cacheCapacity: 1000, debug: false });
 * router.register('user/{id}', handler, { description: 'User route' });
 * const match = router.match('user/123');
 */
export class SubsystemRouter {
  /**
   * Create a new SubsystemRouter
   * 
   * @param {Object} subsystem - Subsystem instance
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.cacheCapacity=1000] - Maximum cache size for route matches
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(subsystem, options = {}) {
    if (!subsystem || typeof subsystem !== 'object') {
      throw new Error('SubsystemRouter: subsystem is required');
    }
    
    const { 
      cacheCapacity = 1000,
      debug = false 
    } = options;
    
    this.subsystem = subsystem;
    this.routes = new Map(); // pattern → RouteEntry (strict: one pattern = one handler)
    this.cache = new RouteCache(cacheCapacity);
    this.debug = debug;
  }
  
  /**
   * Register a route (strict: throws if pattern already exists)
   * 
   * @param {string} pattern - Route pattern (e.g., "user/{id}", "posts/*")
   * @param {Function} handler - Handler function: async (message, params, options) => result
   * @param {Object} [metadata={}] - Route metadata (description, priority, etc.)
   * @returns {RouteEntry} The created route entry
   * @throws {Error} If pattern already registered
   */
  register(pattern, handler, metadata = {}) {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('SubsystemRouter.register: pattern must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('SubsystemRouter.register: handler must be a function');
    }
    
    if (this.routes.has(pattern)) {
      throw new Error(`SubsystemRouter.register: Route pattern '${pattern}' is already registered`);
    }
    
    // Create matcher function for this pattern
    const matcher = this._createMatcher(pattern);
    
    // Create route entry
    const entry = new RouteEntry(pattern, handler, matcher, metadata);
    
    // Store route
    this.routes.set(pattern, entry);
    
    // Invalidate cache (new route might match previously unmatched paths)
    this.cache.clear();
    
    if (this.debug) {
      console.log(`SubsystemRouter: Registered route '${pattern}'`);
    }
    
    return entry;
  }
  
  /**
   * Unregister a route
   * 
   * @param {string} pattern - Pattern to unregister
   * @returns {boolean} True if route was removed, false if not found
   */
  unregister(pattern) {
    if (!this.routes.has(pattern)) {
      return false;
    }
    
    this.routes.delete(pattern);
    this.cache.invalidate(pattern);
    
    if (this.debug) {
      console.log(`SubsystemRouter: Unregistered route '${pattern}'`);
    }
    
    return true;
  }
  
  /**
   * Match a path against registered routes
   * 
   * If multiple routes match, returns the route with the longest pattern (most specific).
   * If patterns have the same length, the first registered route wins.
   * 
   * @param {string} path - Path to match (e.g., "user/123")
   * @returns {MatchResult|null} Match result or null if no match
   */
  match(path) {
    if (!path || typeof path !== 'string') {
      return null;
    }
    
    // Check cache first
    const cached = this.cache.get(path);
    if (cached) {
      return cached;
    }
    
    let bestMatch = null;
    let longestPattern = 0;
    
    // Try all routes, track longest match
    for (const entry of this.routes.values()) {
      const matchResult = entry.match(path);
      if (matchResult) {
        const patternLength = entry.pattern.length;
        
        // Longer pattern wins (more specific)
        // If tie, first registered wins (Map iteration order maintains insertion order)
        if (patternLength > longestPattern) {
          longestPattern = patternLength;
          bestMatch = matchResult;
          bestMatch.routeEntry = entry;
        }
      }
    }
    
    if (bestMatch) {
      // Cache the result
      this.cache.set(path, bestMatch);
      return bestMatch;
    }
    
    // No match found
    return null;
  }
  
  /**
   * Get all registered routes
   * 
   * @returns {Array<RouteEntry>} Array of route entries
   */
  getRoutes() {
    return Array.from(this.routes.values());
  }
  
  /**
   * Check if a pattern is registered
   * 
   * @param {string} pattern - Pattern to check
   * @returns {boolean} True if registered
   */
  hasRoute(pattern) {
    return this.routes.has(pattern);
  }
  
  /**
   * Get number of registered routes
   * 
   * @returns {number} Number of routes
   */
  size() {
    return this.routes.size;
  }
  
  /**
   * Clear all routes and cache
   */
  clear() {
    this.routes.clear();
    this.cache.clear();
    
    if (this.debug) {
      console.log('SubsystemRouter: Cleared all routes');
    }
  }
  
  /**
   * Create a matcher function for a pattern
   * 
   * Supports:
   * - Static: "user/profile" → matches exactly "user/profile"
   * - Params: "user/{id}" → matches "user/123", extracts {id: "123"}
   * - Wildcards: "posts/*" → matches "posts/anything/here"
   * 
   * @param {string} pattern - Route pattern
   * @returns {Function} Matcher function: (path) => MatchResult | null
   * @private
   */
  _createMatcher(pattern) {
    // Extract param names and build regex
    const paramNames = [];
    
    // Escape special regex characters first
    let escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace param placeholders {name} with capture groups
    escaped = escaped.replace(/\\\{(\w+)\\\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)'; // Match non-slash characters
    });
    
    // Replace wildcards * with .*
    // Note: * is not escaped in the first step, so we match * directly
    escaped = escaped.replace(/\*/g, '.*');
    
    // Anchor to start and end (strict matching)
    const regex = new RegExp(`^${escaped}$`);
    
    return (path) => {
      const match = path.match(regex);
      if (!match) {
        return null;
      }
      
      // Extract params
      const params = {};
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = match[i + 1]; // match[0] is full match
      }
      
      return {
        matched: true,
        params,
        pattern,
        // routeEntry will be set by match() method
      };
    };
  }
}

