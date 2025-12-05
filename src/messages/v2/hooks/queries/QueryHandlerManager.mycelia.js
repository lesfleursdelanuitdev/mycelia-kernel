/**
 * QueryHandlerManager
 * 
 * Manages query route registration for subsystems.
 * Provides methods to register query handlers on specific paths.
 */
export class QueryHandlerManager {
  constructor({ router, name, debug = false } = {}) {
    if (!router) throw new Error('QueryHandlerManager: router is required');
    this.router = router;
    this.name = name || 'anonymous-subsystem';
    this.debug = !!debug;
  }

  /**
   * Register a query on a path (local or full, whatever router expects).
   * options.metadata can include { kind: 'query', description, ... }.
   * 
   * @param {string} path - Route path (local or absolute, depending on router)
   * @param {Function} handler - (message, params, routeOptions) => any
   * @param {Object} [options={}] - Route options
   * @param {Object} [options.metadata={}] - Route metadata
   * @returns {*} Return value from router.registerRoute
   */
  registerRoute(path, handler, options = {}) {
    const { metadata = {}, ...rest } = options;
    if (typeof handler !== 'function') {
      throw new TypeError('QueryHandlerManager.registerRoute: handler must be a function');
    }

    const queryMetadata = {
      ...metadata,
      kind: metadata.kind || 'query'
    };

    if (this.debug) {
      console.log(
        `[QueryHandlerManager:${this.name}] registerRoute(${path}) as query`
      );
    }

    return this.router.registerRoute(path, async (message, params, routeOptions) => {
      // read-only by convention: handler should not mutate subsystem state
      return handler(message, params, routeOptions);
    }, {
      metadata: queryMetadata,
      ...rest
    });
  }

  /**
   * Helper that registers a query with a conventional path:
   * `${subsystemName}://query/${name}`
   * or, if you prefer local routes, `query/${name}`.
   * 
   * @param {string} queryName - Logical query name
   * @param {Function} handler - (message, params, routeOptions) => any
   * @param {Object} [options={}] - Route options
   * @param {string} [options.path] - Override default path (defaults to `query/${queryName}`)
   * @returns {*} Return value from router.registerRoute
   */
  registerNamedQuery(queryName, handler, options = {}) {
    if (typeof queryName !== 'string' || !queryName.trim()) {
      throw new Error('QueryHandlerManager.registerNamedQuery: queryName must be non-empty string');
    }

    const path = options.path || `query/${queryName}`;
    return this.registerRoute(path, handler, options);
  }
}



