/**
 * useExpressServer Hook
 * 
 * Provides HTTP server functionality using Express.
 * Implements the ServerContract interface.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.config?.server - Server configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Server facet with all required methods
 * 
 * @requires express - Express must be installed: npm install express
 */
import { Facet } from '../../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../../create-hook.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../../utils/logger.utils.mycelia.js';
import { loadExpress, createMyceliaHandler } from './use-express-server.utils.mycelia.js';
import http from 'http';

export const useExpressServer = createHook({
  kind: 'server',
  version: '1.0.0',
  overwrite: false,
  required: ['router', 'messages'],  // For Mycelia integration
  attach: true,
  contract: 'server',
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.server || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useExpressServer ${name}`);
    
    // Get messages facet from this subsystem (for creating Mycelia messages)
    const messagesFacet = api.__facets['messages'];
    if (!messagesFacet) {
      throw new Error('useExpressServer requires messages facet');
    }
    
    // Use the global MessageSystem router to route Mycelia messages to target subsystems
    const ms = ctx.ms;
    const routerFacet = ms?.find?.('messageSystemRouter');
    if (!routerFacet) {
      throw new Error('useExpressServer requires messageSystemRouter facet on MessageSystem');
    }
    
    // Server state - use closure variables for mutable state
    const expressAppRef = { app: null }; // Use object reference for loadExpress utility
    let httpServer = null;
    let serverAddress = null;
    let serverPort = null;
    let serverInstance = null; // Store server in closure
    let isRunning = false; // Store running state in closure
    
    // Wrapper for loadExpress that uses our expressAppRef
    const loadExpressApp = async () => {
      return loadExpress(config, expressAppRef);
    };
    
    // Wrapper for createMyceliaHandler with bound dependencies
    const createMyceliaHandlerWrapper = (routePath, httpMethod, options = {}) => {
      return createMyceliaHandler(routerFacet, messagesFacet, logger, routePath, httpMethod, options);
    };
    
    // Create a placeholder server object for contract validation
    const placeholderServer = { _placeholder: true };
    serverInstance = placeholderServer; // Initialize with placeholder
    
    return new Facet('server', {
      contract: 'server',
      attach: true,
      source: import.meta.url
    })
    .add({
      // Use getters to access closure variables
      get _server() { return serverInstance; },
      get _isRunning() { return isRunning; },
      
      /**
       * Start the HTTP server
       * @param {Object} [options={}] - Start options
       * @param {number} [options.port=3000] - Port to listen on
       * @param {string} [options.host='0.0.0.0'] - Host to bind to
       * @param {Function} [options.callback] - Callback when server starts
       * @returns {Promise<void>}
       */
      async start(options = {}) {
        if (isRunning) {
          throw new Error('Server is already running');
        }
        
        // Load Express if not already loaded
        const app = await loadExpressApp();
        serverInstance = app; // Update closure variable
        
        const port = options.port ?? config.port ?? 3000;
        const host = options.host ?? config.host ?? '0.0.0.0';
        
        return new Promise((resolve, reject) => {
          try {
            httpServer = http.createServer(app);
            httpServer.listen(port, host, () => {
              isRunning = true; // Update closure variable
              serverAddress = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
              serverPort = port;
              
              if (debug) {
                logger.log(`Server started on ${serverAddress}`);
              }
              
              if (options.callback) {
                options.callback();
              }
              
              resolve();
            });
            
            httpServer.on('error', (error) => {
              logger.error('Server error:', error);
              reject(error);
            });
          } catch (error) {
            logger.error('Failed to start server:', error);
            reject(error);
          }
        });
      },
      
      /**
       * Stop the HTTP server
       * @returns {Promise<void>}
       */
      async stop() {
        if (!isRunning) {
          return;
        }
        
        return new Promise((resolve, reject) => {
          if (!httpServer) {
            isRunning = false; // Update closure variable
            resolve();
            return;
          }
          
          httpServer.close((error) => {
            if (error) {
              logger.error('Failed to stop server:', error);
              reject(error);
            } else {
              isRunning = false; // Update closure variable
              httpServer = null;
              // Note: We keep expressApp so routes remain registered if server is restarted
              // If you want to clear routes, you'd need to recreate the Express app
              serverInstance = placeholderServer; // Reset to placeholder
              serverAddress = null;
              serverPort = null;
              
              if (debug) {
                logger.log('Server stopped');
              }
              
              resolve();
            }
          });
        });
      },
      
      /**
       * Check if server is running
       * @returns {boolean}
       */
      isRunning() {
        return isRunning;
      },
      
      /**
       * Register GET route
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @param {Object} [options={}] - Route options
       * @returns {this}
       */
      async get(path, handler) {
        const app = await loadExpressApp();
        app.get(path, handler);
        return this;
      },
      
      /**
       * Register POST route
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @returns {this}
       */
      async post(path, handler) {
        const app = await loadExpressApp();
        app.post(path, handler);
        return this;
      },
      
      /**
       * Register PUT route
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @returns {this}
       */
      async put(path, handler) {
        const app = await loadExpressApp();
        app.put(path, handler);
        return this;
      },
      
      /**
       * Register PATCH route
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @returns {this}
       */
      async patch(path, handler) {
        const app = await loadExpressApp();
        app.patch(path, handler);
        return this;
      },
      
      /**
       * Register DELETE route
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @returns {this}
       */
      async delete(path, handler) {
        const app = await loadExpressApp();
        app.delete(path, handler);
        return this;
      },
      
      /**
       * Register route for all HTTP methods
       * @param {string} path - Route path
       * @param {Function} handler - Request handler
       * @returns {this}
       */
      async all(path, handler) {
        const app = await loadExpressApp();
        app.all(path, handler);
        return this;
      },
      
      /**
       * Register global middleware
       * @param {Function} middleware - Middleware function
       * @returns {this}
       */
      async use(middleware) {
        const app = await loadExpressApp();
        app.use(middleware);
        return this;
      },
      
      /**
       * Register route-specific middleware
       * @param {string} path - Route path pattern
       * @param {Function} middleware - Middleware function
       * @returns {this}
       */
      async useRoute(path, middleware) {
        const app = await loadExpressApp();
        app.use(path, middleware);
        return this;
      },
      
      /**
       * Set global error handler
       * @param {Function} handler - Error handler function
       * @returns {this}
       */
      async setErrorHandler(handler) {
        const app = await loadExpressApp();
        // Express error handlers must have 4 parameters (err, req, res, next)
        // and must be added last in the middleware stack
        app.use((err, req, res, next) => {
          handler(err, req, res, next);
        });
        return this;
      },
      
      /**
       * Get server address
       * @returns {string|null}
       */
      getAddress() {
        return serverAddress;
      },
      
      /**
       * Get server port
       * @returns {number|null}
       */
      getPort() {
        return serverPort;
      },
      
      /**
       * Register multiple routes at once
       * @param {Array} routes - Array of route definitions
       * @returns {this}
       */
      async registerRoutes(routes) {
        if (!Array.isArray(routes)) {
          throw new Error('registerRoutes() requires an array of route definitions');
        }
        
        for (const route of routes) {
          const method = route.method.toLowerCase();
          if (method === 'all') {
            await this.all(route.path, route.handler);
          } else if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            await this[method](route.path, route.handler);
          } else {
            throw new Error(`Unsupported HTTP method: ${route.method}`);
          }
        }
        
        return this;
      },
      
      /**
       * Register multiple Mycelia routes/commands/queries at once
       * @param {Array} routes - Array of Mycelia route definitions
       * @returns {this}
       */
      async registerMyceliaRoutes(routes) {
        if (!Array.isArray(routes)) {
          throw new Error('registerMyceliaRoutes() requires an array of route definitions');
        }
        
        for (const route of routes) {
          if (route.type === 'route') {
            await this.registerMyceliaRoute(route.myceliaPath, route.httpMethod, route.httpPath, route.options);
          } else if (route.type === 'command') {
            await this.registerMyceliaCommand(route.commandName || route.myceliaPath, route.httpMethod, route.httpPath, route.options);
          } else if (route.type === 'query') {
            await this.registerMyceliaQuery(route.queryName || route.myceliaPath, route.httpMethod, route.httpPath, route.options);
          } else {
            throw new Error(`Unsupported route type: ${route.type}`);
          }
        }
        
        return this;
      },
      
      /**
       * Register a Mycelia route as HTTP endpoint
       * @param {string} routePath - Mycelia route path (e.g., 'user://get/{id}')
       * @param {string} httpMethod - HTTP method ('GET', 'POST', etc.)
       * @param {string} httpPath - HTTP path (e.g., '/api/users/:id')
       * @param {Object} [options={}] - Additional options
       * @returns {this}
       */
      async registerMyceliaRoute(routePath, httpMethod, httpPath, options = {}) {
        const app = await loadExpressApp();
        const handler = createMyceliaHandlerWrapper(routePath, httpMethod, options);
        const method = httpMethod.toLowerCase();
        
        if (method === 'all') {
          app.all(httpPath, handler);
        } else if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          app[method](httpPath, handler);
        } else {
          throw new Error(`Unsupported HTTP method: ${httpMethod}`);
        }
        
        if (debug) {
          logger.log(`Registered Mycelia route: ${routePath} -> ${httpMethod} ${httpPath}`);
        }
        
        return this;
      },
      
      /**
       * Register a Mycelia command as HTTP endpoint
       * @param {string} commandName - Command name
       * @param {string} httpMethod - HTTP method
       * @param {string} httpPath - HTTP path
       * @param {Object} [options={}] - Additional options
       * @returns {this}
       */
      async registerMyceliaCommand(commandName, httpMethod, httpPath, options = {}) {
        // Allow commandName to be either a bare name or a full Mycelia path
        const commandPath = commandName.includes('://')
          ? commandName
          : `${subsystem.name}://command/${commandName}`;
        return this.registerMyceliaRoute(commandPath, httpMethod, httpPath, options);
      },
      
      /**
       * Register a Mycelia query as HTTP endpoint
       * @param {string} queryName - Query name
       * @param {string} httpMethod - HTTP method
       * @param {string} httpPath - HTTP path
       * @param {Object} [options={}] - Additional options
       * @returns {this}
       */
      async registerMyceliaQuery(queryName, httpMethod, httpPath, options = {}) {
        // Allow queryName to be either a bare name or a full Mycelia path
        const queryPath = queryName.includes('://')
          ? queryName
          : `${subsystem.name}://query/${queryName}`;
        return this.registerMyceliaRoute(queryPath, httpMethod, httpPath, options);
      }
    });
  }
});




