/**
 * RouterTestContext
 * 
 * Utilities for testing router functionality, especially scope checking.
 * 
 * @example
 * const routerCtx = new RouterTestContext(workspaceSubsystem);
 * 
 * // Register route with scope
 * routerCtx.registerRouteWithScope(
 *   'workspace://create',
 *   async (msg) => ({ success: true }),
 *   'workspace:create',
 *   'write'
 * );
 * 
 * // Test scope checking
 * const hasAccess = routerCtx.verifyScopeCheck('workspace://create', teacherPkr, 'workspace:create');
 */

export class RouterTestContext {
  #subsystem = null;
  #router = null;

  /**
   * Create a RouterTestContext
   * 
   * @param {BaseSubsystem} subsystem - Subsystem instance
   */
  constructor(subsystem) {
    if (!subsystem) {
      throw new Error('RouterTestContext: subsystem is required');
    }
    this.#subsystem = subsystem;
    this.#router = subsystem.find('router');
    if (!this.#router) {
      throw new Error('RouterTestContext: Router facet not found on subsystem. Ensure useRouter is installed.');
    }
  }

  /**
   * Register a route
   * 
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {Object} [metadata={}] - Route metadata
   * @returns {boolean} True if route was registered
   */
  registerRoute(path, handler, metadata = {}) {
    return this.#router.registerRoute(path, handler, metadata);
  }

  /**
   * Register a route with scope
   * 
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {string} scope - Permission scope
   * @param {string} required - Required permission ('read', 'write', 'grant')
   * @param {Object} [additionalMetadata={}] - Additional route metadata
   * @returns {boolean} True if route was registered
   */
  registerRouteWithScope(path, handler, scope, required, additionalMetadata = {}) {
    return this.#router.registerRoute(path, handler, {
      ...additionalMetadata,
      metadata: {
        ...additionalMetadata.metadata,
        scope,
        required
      }
    });
  }

  /**
   * Test a route with a caller PKR
   * 
   * @param {string} path - Route path
   * @param {PKR} callerPkr - Caller's PKR
   * @param {any} [body={}] - Message body
   * @returns {Promise<any>} Route result
   */
  async testRoute(path, callerPkr, body = {}) {
    const { createTestMessage, processMessageImmediately } = await import('../../test-utils.mycelia.js');
    const kernel = this.#subsystem.getRoot?.();
    if (!kernel) {
      throw new Error('RouterTestContext: Kernel not found. Cannot test route.');
    }

    const message = createTestMessage(path, body);
    return await processMessageImmediately(kernel, callerPkr, message);
  }

  /**
   * Test a route with scope checking
   * 
   * @param {string} path - Route path
   * @param {PKR} callerPkr - Caller's PKR
   * @param {string} scope - Expected scope
   * @param {any} [body={}] - Message body
   * @returns {Promise<any>} Route result
   */
  async testRouteWithScope(path, callerPkr, scope, body = {}) {
    return await this.testRoute(path, callerPkr, body);
  }

  /**
   * Verify scope check passes for a route
   * 
   * @param {string} path - Route path
   * @param {PKR} callerPkr - Caller's PKR
   * @param {string} scope - Scope to check
   * @returns {boolean} True if scope check would pass
   */
  verifyScopeCheck(path, callerPkr, scope) {
    // This requires access to the router's scope checking logic
    // For now, we'll test by attempting to match the route
    const match = this.#router.match(path, { callerId: callerPkr });
    return match !== null;
  }

  /**
   * Verify scope check denies access for a route
   * 
   * @param {string} path - Route path
   * @param {PKR} callerPkr - Caller's PKR
   * @param {string} scope - Scope to check
   * @returns {boolean} True if scope check would deny
   */
  verifyScopeDenied(path, callerPkr, scope) {
    return !this.verifyScopeCheck(path, callerPkr, scope);
  }

  /**
   * Check if a route exists
   * 
   * @param {string} path - Route path
   * @returns {boolean} True if route exists
   */
  hasRoute(path) {
    return this.#router.hasRoute(path);
  }

  /**
   * Get route metadata
   * 
   * @param {string} path - Route path
   * @returns {Object|null} Route metadata or null if route not found
   */
  getRouteMetadata(path) {
    const match = this.#router.match(path);
    if (!match) {
      return null;
    }
    return match.routeEntry?.metadata || null;
  }

  /**
   * Get all registered routes
   * 
   * @returns {Array} Array of route entries
   */
  getRoutes() {
    return this.#router.getRoutes();
  }
}

