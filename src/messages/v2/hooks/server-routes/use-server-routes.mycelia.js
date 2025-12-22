/**
 * useServerRoutes Hook
 * 
 * Helper hook for other subsystems to register routes on the ServerSubsystem.
 * Constructs and sends messages to the ServerSubsystem to register routes.
 * Does NOT handle route registration itself - only constructs messages.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.config?.serverRoutes - ServerRoutes configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} ServerRoutes facet with helper methods
 * 
 * @example
 * // In a subsystem that wants to register routes
 * const userSubsystem = new BaseSubsystem('user', {
 *   ms: messageSystem,
 *   config: {
 *     serverRoutes: {
 *       debug: true
 *     }
 *   }
 * });
 * 
 * await userSubsystem
 *   .use(useRouter)
 *   .use(useMessages)
 *   .use(useServerRoutes)
 *   .onInit(async () => {
 *     // Register routes via messages (sends to ServerSubsystem)
 *     await userSubsystem.serverRoutes.registerMyceliaRoute(
 *       'user://get/{id}',
 *       'GET',
 *       '/api/users/:id'
 *     );
 *   })
 *   .build();
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { SERVER_ROUTES } from '../../models/server-subsystem/server.routes.def.mycelia.js';

export const useServerRoutes = createHook({
  kind: 'serverRoutes',
  version: '1.0.0',
  overwrite: false,
  required: ['router', 'messages'],  // For constructing and sending messages
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const router = api.__facets['router'];
    const messages = api.__facets['messages'];
    
    // Get config (server name is always 'server')
    const config = ctx.config?.serverRoutes || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useServerRoutes ${name}`);
    
    // Create facet with helper methods that construct and send messages
    return new Facet('serverRoutes', {
      attach: true,
      source: import.meta.url
    })
    .add({
      /**
       * Register a Mycelia route as HTTP endpoint
       * Constructs and sends message to ServerSubsystem
       * 
       * @param {string} myceliaPath - Mycelia route path (e.g., 'user://get/{id}')
       * @param {string} httpMethod - HTTP method ('GET', 'POST', etc.)
       * @param {string} httpPath - HTTP path (e.g., '/api/users/:id')
       * @param {Object} [options={}] - Optional transformation and middleware options
       * @returns {Promise<Object>} Result from ServerSubsystem route handler
       */
      async registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options = {}) {
        const msg = messages.create(SERVER_ROUTES.registerMycelia.path, {
          myceliaPath,
          httpMethod,
          httpPath,
          options
        });
        
        if (debug) {
          logger.log(`Registering route: ${myceliaPath} -> ${httpMethod} ${httpPath}`);
        }
        
        // Route message to ServerSubsystem
        // Message will be accepted by ServerSubsystem and processed
        // ServerSubsystem's route handler will call server.registerMyceliaRoute()
        const result = await router.route(msg);
        
        // Extract result from routing
        if (result && result.success !== false) {
          return { success: true, ...result };
        }
        
        return { success: false, error: result?.error || 'Route registration failed' };
      },
      
      /**
       * Register a Mycelia command as HTTP endpoint
       * Constructs and sends message to ServerSubsystem
       * 
       * @param {string} commandName - Command name
       * @param {string} httpMethod - HTTP method
       * @param {string} httpPath - HTTP path
       * @param {Object} [options={}] - Optional options
       * @returns {Promise<Object>} Result from ServerSubsystem route handler
       */
      async registerMyceliaCommand(commandName, httpMethod, httpPath, options = {}) {
        const msg = messages.create(SERVER_ROUTES.registerCommand.path, {
          commandName,
          httpMethod,
          httpPath,
          options
        });
        
        if (debug) {
          logger.log(`Registering command: ${commandName} -> ${httpMethod} ${httpPath}`);
        }
        
        const result = await router.route(msg);
        
        if (result && result.success !== false) {
          return { success: true, ...result };
        }
        
        return { success: false, error: result?.error || 'Command registration failed' };
      },
      
      /**
       * Register a Mycelia query as HTTP endpoint
       * Constructs and sends message to ServerSubsystem
       * 
       * @param {string} queryName - Query name
       * @param {string} httpMethod - HTTP method
       * @param {string} httpPath - HTTP path
       * @param {Object} [options={}] - Optional options
       * @returns {Promise<Object>} Result from ServerSubsystem route handler
       */
      async registerMyceliaQuery(queryName, httpMethod, httpPath, options = {}) {
        const msg = messages.create(SERVER_ROUTES.registerQuery.path, {
          queryName,
          httpMethod,
          httpPath,
          options
        });
        
        if (debug) {
          logger.log(`Registering query: ${queryName} -> ${httpMethod} ${httpPath}`);
        }
        
        const result = await router.route(msg);
        
        if (result && result.success !== false) {
          return { success: true, ...result };
        }
        
        return { success: false, error: result?.error || 'Query registration failed' };
      },
      
      /**
       * Register multiple Mycelia routes/commands/queries at once
       * Constructs and sends batch message to ServerSubsystem
       * 
       * @param {Array} routes - Array of route definitions
       *   Each route: { type: 'route'|'command'|'query', ... }
       * @returns {Promise<Object>} Result from ServerSubsystem route handler
       */
      async registerMyceliaRoutes(routes) {
        if (!Array.isArray(routes)) {
          throw new Error('registerMyceliaRoutes() requires an array of route definitions');
        }
        
        const msg = messages.create(SERVER_ROUTES.registerBatch.path, {
          routes
        });
        
        if (debug) {
          logger.log(`Registering ${routes.length} routes in batch`);
        }
        
        const result = await router.route(msg);
        
        if (result && result.success !== false) {
          return { success: true, ...result };
        }
        
        return { success: false, error: result?.error || 'Batch registration failed' };
      }
    });
  }
});

