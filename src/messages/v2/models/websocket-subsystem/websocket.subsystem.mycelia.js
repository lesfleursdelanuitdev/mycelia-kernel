/**
 * WebSocketSubsystem
 * 
 * A dedicated subsystem that manages WebSocket server connections and handles WebSocket message routing.
 * Uses useWebSocketServer hook based on configuration.
 * 
 * @example
 * const websocketSubsystem = new WebSocketSubsystem('websocket', {
 *   ms: messageSystem,
 *   config: {
 *     websocket: {
 *       type: 'ws',  // 'ws' for now
 *       port: 8080,
 *       host: '0.0.0.0',
 *       path: '/ws'
 *     }
 *   }
 * });
 * 
 * await websocketSubsystem.build();
 */
import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../defaults/default-hooks.mycelia.js';
import { useWebSocketServer } from '../../hooks/websocket/ws/use-websocket-server.mycelia.js';
import { WEBSOCKET_ROUTES } from './websocket.routes.def.mycelia.js';

/**
 * WebSocketSubsystem
 * 
 * Manages WebSocket server and handles WebSocket operations from other subsystems.
 * Always named 'websocket'.
 */
export class WebSocketSubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (must be 'websocket')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   *   @param {string} [options.config.websocket.type='ws'] - WebSocket library type: 'ws'
   *   @param {number} [options.config.websocket.port=8080] - WebSocket server port
   *   @param {string} [options.config.websocket.host='0.0.0.0'] - WebSocket server host
   *   @param {string} [options.config.websocket.path='/ws'] - WebSocket path
   *   @param {Object} [options.config.websocket.options={}] - WebSocket library-specific options
   *   @param {Object} [options.config.connection={}] - Connection management options
   *   @param {Object} [options.config.routing={}] - Message routing options
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'websocket', options = {}) {
    if (name !== 'websocket') {
      throw new Error('WebSocketSubsystem: name must be "websocket"');
    }

    super(name, options);
    
    // Use canonical defaults (includes router, messages, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Select WebSocket hook based on config
    const websocketType = (options.config?.websocket?.type || 'ws').toLowerCase();
    
    if (websocketType === 'ws') {
      this.use(useWebSocketServer);
    } else {
      throw new Error(`WebSocketSubsystem: Invalid WebSocket type "${websocketType}". Must be 'ws'`);
    }
    
    // Register routes that handle WebSocket operations from other subsystems
    this.onInit(() => {
      // Register all routes from WEBSOCKET_ROUTES definitions
      for (const routeDef of Object.values(WEBSOCKET_ROUTES)) {
        // eslint-disable-next-line no-unused-vars
        this.registerRoute(routeDef.path, async (message, params, routeOptions) => {
          const websocket = this.find('websocket');
          if (!websocket) {
            return { success: false, error: 'WebSocket facet not found' };
          }
          
          const data = routeDef.extractData(message.body);
          
          // Run validation if provided
          if (routeDef.validate) {
            const validationError = routeDef.validate(data);
            if (validationError) {
              return validationError;
            }
          }
          
          // Call the appropriate WebSocket method
          if (routeDef.websocketMethod === 'send') {
            await websocket.send(data.connectionId, data.message);
          } else if (routeDef.websocketMethod === 'broadcast') {
            if (data.filter) {
              await websocket.broadcast(data.message, data.filter);
            } else {
              await websocket.broadcast(data.message);
            }
          } else if (routeDef.websocketMethod === 'closeConnection') {
            await websocket.closeConnection(data.connectionId, data.code || 1000, data.reason || '');
          }
          
          return { success: true, result: routeDef.buildResponse(data) };
        });
      }

      // Register WebSocket message handler route
      this.registerRoute('websocket://message', async (message, params, routeOptions) => {
        const websocket = this.find('websocket');
        if (!websocket) {
          return { success: false, error: 'WebSocket facet not found' };
        }
        
        const { connectionId, wsMessage } = message.body;
        if (!connectionId || !wsMessage) {
          return { success: false, error: 'connectionId and wsMessage are required' };
        }
        
        const result = await websocket.routeMessage(connectionId, wsMessage);
        return { success: true, result };
      });

      // Register connection lifecycle routes
      this.registerRoute('websocket://connect', async (message, params, routeOptions) => {
        // Connection handlers are registered via websocket.onConnection()
        // This route can be used to trigger custom connection logic
        return { success: true, message: 'Connection established' };
      });

      this.registerRoute('websocket://disconnect', async (message, params, routeOptions) => {
        // Disconnection handlers are registered via websocket.onDisconnection()
        // This route can be used to trigger custom disconnection logic
        return { success: true, message: 'Connection closed' };
      });
    });
  }
}

