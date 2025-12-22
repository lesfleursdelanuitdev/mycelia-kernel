/**
 * useRouter Hook
 * 
 * Provides route registration and matching functionality to subsystems.
 * Wraps SubsystemRouter and exposes route registration methods.
 * 
 * @param {Object} ctx - Context object containing config.router for router configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with router methods
 */
import { SubsystemRouter } from './subsystem-router.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

/**
 * Get the authentication wrapper from subsystem identity if available
 * Wraps the handler with authentication if identity is available
 * 
 * @param {Object} subsystem - Subsystem instance
 * @param {Function} handler - Handler function to wrap
 * @param {string} [required] - Required permission type ('read', 'write', 'grant')
 * @returns {Function} Wrapped handler with authentication or original handler
 */
function getAuthWrapper(subsystem, handler, required, options = {}) {
  // If no identity is attached, return handler as-is
  if (subsystem.identity === undefined) {
    return handler;
  }

  // If no required permission specified, return handler as-is
  if (!required) {
    return handler;
  }

  return subsystem.identity.requireAuth(required, handler, options);
}

export const useRouter = createHook({
  kind: 'router',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'router',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.router || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useRouter ${name}`);
    
    // Create router instance
    const router = new SubsystemRouter(subsystem, {
      cacheCapacity: config.cacheCapacity || 1000,
      debug
    });
    
    return new Facet('router', { attach: true, source: import.meta.url, contract: 'router' })
    .add({
      /**
       * Register a route pattern with a handler
       * @param {string} pattern - Route pattern (e.g., 'register/domain', '{domain}/store', 'query/*')
       * @param {Function} handler - Handler function: async (message, params, options) => result
       * @param {Object} [routeOptions={}] - Route options
       * @param {number} [routeOptions.priority=0] - Route priority
       * @param {string} [routeOptions.description] - Route description
       * @param {Object} [routeOptions.metadata] - Additional metadata
       * @returns {boolean} True if registration successful
       */
      registerRoute(pattern, handler, routeOptions = {}) {
        try {
          // If routeOptions has a metadata property, use it; otherwise use routeOptions directly
          const metadata = routeOptions.metadata || routeOptions;
          router.register(pattern, handler, metadata);
          return true;
        } catch (error) {
          logger.error('Error registering route:', pattern, error);
          throw error;
        }
      },
      
      /**
       * Register multiple routes at once
       * @param {Array<Object>} routes - Array of route definitions
       * @param {string} routes[].pattern - Route pattern
       * @param {Function} routes[].handler - Handler function
       * @param {Object} [routes[].options] - Route options
       * @returns {number} Number of routes successfully registered
       */
      registerRoutes(routes) {
        if (!Array.isArray(routes)) {
          throw new Error('registerRoutes() requires an array of route definitions');
        }
        
        let registered = 0;
        for (const route of routes) {
          if (!route.pattern || typeof route.handler !== 'function') {
            logger.warn('Invalid route definition:', route);
            continue;
          }
          
          try {
            this.registerRoute(route.pattern, route.handler, route.options || {});
            registered++;
          } catch (error) {
            logger.error('Error registering route:', route.pattern, error);
          }
        }
        
        return registered;
      },
      
      /**
       * Unregister a route pattern
       * @param {string} pattern - Route pattern to unregister
       * @returns {boolean} True if route was found and removed
       */
      unregisterRoute(pattern) {
        return router.unregister(pattern);
      },
      
      /**
       * Check if a route pattern is registered
       * @param {string} pattern - Route pattern to check
       * @returns {boolean} True if route is registered
       */
      hasRoute(pattern) {
        return router.hasRoute(pattern);
      },
      
      /**
       * Get all registered routes
       * @returns {Array<Object>} Array of route information
       */
      getRoutes() {
        return router.getRoutes();
      },
      
      /**
       * Match a path against registered routes
       * @param {string} path - Path to match (e.g., 'user/123')
       * @returns {Object|null} Match result with handler, params, and routeEntry, or null if no match
       */
      match(path, options = {}) {
        if (!path || typeof path !== 'string') {
          return null;
        }
        
        const matchResult = router.match(path);
        if (!matchResult) {
          return null;
        }

        // Wrap the handler with authentication checks if required permission is specified
        // This ensures the handler will check permissions before executing when an identity is attached
        // If no identity or no required permission is specified, the handler is returned as-is
        const handler = getAuthWrapper(
          subsystem, 
          matchResult.routeEntry.handler, 
          matchResult.routeEntry.metadata?.required,
          options
        );
        
        // Return handler, params, and routeEntry
        return {
          handler: handler,
          params: matchResult.params,
          routeEntry: matchResult.routeEntry
        };
      },
      
      /**
       * Route a message by matching its path and executing the handler
       * @param {Message} message - Message to route
       * @param {Object} [options={}] - Routing options
       * @returns {Promise<any>} Handler execution result
       * @throws {Error} If no route matches the message path
       */
      async route(message, options = {}) {
        if (!message || typeof message.getPath !== 'function') {
          throw new Error('route() requires a message with getPath() method');
        }
        
        const path = message.getPath();
        if (!path || typeof path !== 'string') {
          throw new Error('Message path must be a non-empty string');
        }
        
        // Match route
        const matchResult = router.match(path);
        if (!matchResult) {
          return null;
        }

        // Wrap the handler with authentication checks if required permission is specified
        // This ensures the handler will check permissions before executing when an identity is attached
        // If no identity or no required permission is specified, the handler is returned as-is
        const handler = getAuthWrapper(
          subsystem, 
          matchResult.routeEntry.handler, 
          matchResult.routeEntry.metadata?.required,
          options
        );
        
        // Sanitize options: remove callerIdSetBy before passing to handler
        // callerIdSetBy is used by the auth wrapper for kernel validation but should not be exposed to handlers
        const { callerIdSetBy: _callerIdSetBy, ...sanitizedOptions } = options;
        
        // Execute handler
        // Handler signature: async (message, params, options) => result
        try {
          const result = await handler(
            message,
            matchResult.params,
            sanitizedOptions
          );
          return result;
        } catch (error) {
          logger.error('Error executing route handler:', path, error);
          throw error;
        }
      },
      
      // Expose router for internal use by other hooks
      _routeRegistry: router
    });
  }
});

