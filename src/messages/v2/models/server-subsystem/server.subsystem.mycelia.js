/**
 * ServerSubsystem
 * 
 * A dedicated subsystem that manages the HTTP server and handles route registration messages.
 * Uses either useFastifyServer or useExpressServer based on configuration.
 * 
 * @example
 * const serverSubsystem = new ServerSubsystem('server', {
 *   ms: messageSystem,
 *   config: {
 *     server: {
 *       type: 'fastify',  // or 'express'
 *       port: 3000,
 *       host: '0.0.0.0'
 *     }
 *   }
 * });
 * 
 * await serverSubsystem.build();
 */
import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../defaults/default-hooks.mycelia.js';
import { useFastifyServer } from '../../hooks/server/fastify/use-fastify-server.mycelia.js';
import { useExpressServer } from '../../hooks/server/express/use-express-server.mycelia.js';
import { useHonoServer } from '../../hooks/server/hono/use-hono-server.mycelia.js';
import { useHealthCheck } from '../../hooks/health/use-health-check.mycelia.js';
import { SERVER_ROUTES } from './server.routes.def.mycelia.js';
import { getSystemHealth, getReadinessStatus, getLivenessStatus } from '../health/health-aggregator.utils.mycelia.js';

/**
 * ServerSubsystem
 * 
 * Manages HTTP server and handles route registration messages from other subsystems.
 * Always named 'server'.
 */
export class ServerSubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (must be 'server')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
     * @param {string} [options.config.server.type='fastify'] - Server type: 'fastify', 'express', or 'hono'
   * @param {number} [options.config.server.port=3000] - Server port
   * @param {string} [options.config.server.host='0.0.0.0'] - Server host
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'server', options = {}) {
    if (name !== 'server') {
      throw new Error('ServerSubsystem: name must be "server"');
    }

    super(name, options);
    
    // Use canonical defaults (includes router, messages, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Add health check hook if enabled (default: enabled)
    const healthCheckEnabled = options.config?.healthCheck?.enabled !== false;
    if (healthCheckEnabled) {
      this.use(useHealthCheck);
    }
    
    // Select server hook based on config
    const serverType = (options.config?.server?.type || 'fastify').toLowerCase();
    
    if (serverType === 'express') {
      this.use(useExpressServer);
    } else if (serverType === 'fastify') {
      this.use(useFastifyServer);
    } else if (serverType === 'hono') {
      this.use(useHonoServer);
    } else {
      throw new Error(`ServerSubsystem: Invalid server type "${serverType}". Must be 'fastify', 'express', or 'hono'`);
    }
    
    // Register routes that handle route registration messages from other subsystems
    this.onInit(() => {
      // Register all routes from SERVER_ROUTES definitions
      for (const routeDef of Object.values(SERVER_ROUTES)) {
        // eslint-disable-next-line no-unused-vars
        this.registerRoute(routeDef.path, async (message, params, routeOptions) => {
          const server = this.find('server');
          if (!server) {
            return { success: false, error: 'Server facet not found' };
          }
          
          const data = routeDef.extractData(message.body);
          
          // Run validation if provided
          if (routeDef.validate) {
            const validationError = routeDef.validate(data);
            if (validationError) {
              return validationError;
            }
          }
          
          // Call the appropriate server method
          const methodArgs = routeDef.serverMethod === 'registerMyceliaRoutes' 
            ? [data.routes]
            : [data.myceliaPath || data.commandName || data.queryName, data.httpMethod, data.httpPath, data.options || {}];
          
          await server[routeDef.serverMethod](...methodArgs);
          
          return { success: true, registered: routeDef.buildResponse(data) };
        });
      }

      // Register health check Mycelia routes if health check is enabled
      if (healthCheckEnabled) {
        this.registerHealthRoutes();
      }
    });

    // Register HTTP health endpoints after build (server facet will be available)
    if (healthCheckEnabled) {
      this.onInit(async () => {
        await this.registerHealthHttpEndpoints();
      });
    }
  }

  /**
   * Register health check Mycelia routes
   * @private
   */
  registerHealthRoutes() {
    const messageSystem = this.ctx?.ms;
    if (!messageSystem) {
      return;
    }

    // Health endpoint - full system health
    this.registerRoute('server://health', async (message) => {
      const health = await getSystemHealth(messageSystem, {
        systemName: messageSystem.name || 'system'
      });
      return {
        success: true,
        ...health.toJSON()
      };
    });

    // Readiness endpoint - is system ready to accept traffic?
    this.registerRoute('server://health/ready', async (message) => {
      const readiness = await getReadinessStatus(messageSystem, {
        systemName: messageSystem.name || 'system'
      });
      const json = readiness.toJSON();
      return {
        success: readiness.isHealthy(),
        statusCode: readiness.isHealthy() ? 200 : 503,
        ...json
      };
    });

    // Liveness endpoint - is system alive?
    this.registerRoute('server://health/live', async (message) => {
      const liveness = await getLivenessStatus(messageSystem, {
        systemName: messageSystem.name || 'system'
      });
      const json = liveness.toJSON();
      return {
        success: liveness.isHealthy(),
        statusCode: liveness.isHealthy() ? 200 : 503,
        ...json
      };
    });
  }

  /**
   * Register health check HTTP endpoints
   * @private
   */
  async registerHealthHttpEndpoints() {
    const server = this.find('server');
    if (!server || typeof server.registerMyceliaRoute !== 'function') {
      // Server facet not available or doesn't support route registration yet
      return;
    }

    // Register HTTP endpoints that route to the Mycelia routes above
    await server.registerMyceliaRoute('server://health', 'GET', '/health');
    await server.registerMyceliaRoute('server://health/ready', 'GET', '/ready');
    await server.registerMyceliaRoute('server://health/live', 'GET', '/live');
  }
}

