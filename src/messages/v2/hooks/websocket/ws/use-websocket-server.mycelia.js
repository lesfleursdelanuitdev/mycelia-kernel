/**
 * useWebSocketServer Hook
 * 
 * Provides WebSocket server functionality using the ws library.
 * Implements the WebSocketContract interface.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.config?.websocket - WebSocket configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} WebSocket facet with all required methods
 * 
 * @requires ws - ws must be installed: npm install ws
 */
import { Facet } from '../../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../../create-hook.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../../utils/logger.utils.mycelia.js';
import { WebSocketConnection } from '../../../models/websocket/websocket-connection.mycelia.js';
import { loadWebSocketServer, createWebSocketMessageHandler } from './use-websocket-server.utils.mycelia.js';

export const useWebSocketServer = createHook({
  kind: 'websocket',
  version: '1.0.0',
  overwrite: false,
  required: ['router', 'messages'],  // For Mycelia integration
  attach: true,
  contract: 'websocket',
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.websocket || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useWebSocketServer ${name}`);
    
    // Get messages facet from this subsystem
    const messagesFacet = api.__facets['messages'];
    if (!messagesFacet) {
      throw new Error('useWebSocketServer requires messages facet');
    }
    
    // Use the global MessageSystem router
    const ms = ctx.ms;
    const routerFacet = ms?.find?.('messageSystemRouter');
    if (!routerFacet) {
      throw new Error('useWebSocketServer requires messageSystemRouter facet on MessageSystem');
    }
    
    // Server state
    const wsRef = { instance: null };
    const connections = new Map(); // connectionId -> WebSocketConnection
    let serverAddress = null;
    let serverPort = null;
    
    // Connection lifecycle handlers
    const connectionHandlers = [];
    const disconnectionHandlers = [];
    const errorHandlers = [];
    
    // Message handlers (path -> handler function)
    const messageHandlers = new Map();
    const defaultPath = config.routing?.defaultPath || 'websocket://message';
    
    // Create message handler
    const messageHandler = createWebSocketMessageHandler(
      routerFacet,
      messagesFacet,
      logger,
      defaultPath,
      config.routing
    );
    
    // Placeholder server for contract validation
    const placeholderServer = { _placeholder: true };
    
    return new Facet('websocket', {
      contract: 'websocket',
      attach: true,
      source: import.meta.url
    })
    .add({
      _server: placeholderServer,
      _isRunning: false,
      _connections: connections,
      
      /**
       * Start the WebSocket server
       * @param {Object} [options={}] - Start options
       * @param {number} [options.port] - Port to listen on
       * @param {string} [options.host] - Host to bind to
       * @param {string} [options.path] - WebSocket path
       * @param {Function} [options.callback] - Callback when server starts
       * @returns {Promise<void>}
       */
      async start(options = {}) {
        if (this._isRunning) {
          throw new Error('WebSocket server is already running');
        }
        
        const serverConfig = {
          ...config,
          port: options.port || config.port || 8080,
          host: options.host || config.host || '0.0.0.0',
          path: options.path || config.path || '/ws',
          ...options
        };
        
        const wss = await loadWebSocketServer(serverConfig, wsRef);
        this._server = wss;
        
        // Handle new connections
        wss.on('connection', async (socket, req) => {
          try {
            // Extract connection metadata from request
            const metadata = {
              remoteAddress: req.socket?.remoteAddress,
              headers: req.headers,
              url: req.url
            };
            
            // Create connection
            const connection = new WebSocketConnection(socket, {
              metadata
            });
            
            connections.set(connection.id, connection);
            
            // Call connection handlers
            for (const handler of connectionHandlers) {
              try {
                const result = handler(connection);
                if (result && typeof result.then === 'function') {
                  await result;
                }
              } catch (error) {
                logger.error(`Connection handler error:`, error);
              }
            }
            
            // Handle messages
            socket.on('message', async (data) => {
              try {
                connection.updateActivity();
                
                // Parse message
                const wsMessage = data.toString();
                
                // Route message
                const response = await messageHandler(connection, wsMessage);
                
                // Send response back to client
                if (response && connection.isOpen()) {
                  await connection.send(response);
                }
              } catch (error) {
                logger.error('Error handling WebSocket message:', error);
                
                // Call error handlers (non-blocking)
                for (const handler of errorHandlers) {
                  try {
                    const result = handler(connection, error);
                    if (result && typeof result.then === 'function') {
                      result.catch(handlerError => {
                        logger.error(`Error handler error:`, handlerError);
                      });
                    }
                  } catch (handlerError) {
                    logger.error(`Error handler error:`, handlerError);
                  }
                }
                
                // Send error response if connection is open
                if (connection.isOpen()) {
                  try {
                    await connection.send({
                      success: false,
                      error: error.message || 'Message handling failed',
                      correlationId: null
                    });
                  } catch (sendError) {
                    // Ignore send errors
                  }
                }
              }
            });
            
            // Handle disconnection
            socket.on('close', (code, reason) => {
              connections.delete(connection.id);
              
              // Call disconnection handlers
              for (const handler of disconnectionHandlers) {
                try {
                  handler(connection, code, reason?.toString() || '');
                } catch (error) {
                  logger.error(`Disconnection handler error:`, error);
                }
              }
            });
            
            // Handle errors
            socket.on('error', (error) => {
              logger.error(`WebSocket error for connection ${connection.id}:`, error);
              
              // Call error handlers
              for (const handler of errorHandlers) {
                try {
                  handler(connection, error);
                } catch (handlerError) {
                  logger.error(`Error handler error:`, handlerError);
                }
              }
            });
          } catch (error) {
            logger.error('Error setting up WebSocket connection:', error);
            socket.close(1011, 'Internal server error');
          }
        });
        
        // Wait for server to start
        await new Promise((resolve, reject) => {
          wss.on('listening', () => {
            serverAddress = wss.address();
            serverPort = typeof serverAddress === 'string' 
              ? parseInt(serverAddress.split(':').pop() || '8080', 10)
              : serverAddress?.port || serverConfig.port;
            
            if (options.callback) {
              options.callback();
            }
            resolve();
          });
          
          wss.on('error', reject);
        });
        
        this._isRunning = true;
        
        if (debug) {
          logger.log(`WebSocket server started on ${serverConfig.host}:${serverPort}${serverConfig.path}`);
        }
      },
      
      /**
       * Stop the WebSocket server
       * @returns {Promise<void>}
       */
      async stop() {
        if (!this._isRunning) {
          return;
        }
        
        // Close all connections
        const closePromises = Array.from(connections.values()).map(connection => {
          return new Promise((resolve) => {
            connection.close(1001, 'Server shutting down');
            resolve();
          });
        });
        
        await Promise.all(closePromises);
        connections.clear();
        
        // Close server
        if (this._server && typeof this._server.close === 'function') {
          await new Promise((resolve) => {
            this._server.close(() => {
              resolve();
            });
          });
        }
        
        this._isRunning = false;
        this._server = placeholderServer;
        serverAddress = null;
        serverPort = null;
        
        if (debug) {
          logger.log('WebSocket server stopped');
        }
      },
      
      /**
       * Check if server is running
       * @returns {boolean}
       */
      isRunning() {
        return this._isRunning;
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
       * Get connection by ID
       * @param {string} connectionId - Connection ID
       * @returns {WebSocketConnection|null}
       */
      getConnection(connectionId) {
        return connections.get(connectionId) || null;
      },
      
      /**
       * Get all connections
       * @returns {WebSocketConnection[]}
       */
      getAllConnections() {
        return Array.from(connections.values());
      },
      
      /**
       * Get connection count
       * @returns {number}
       */
      getConnectionCount() {
        return connections.size;
      },
      
      /**
       * Close a specific connection
       * @param {string} connectionId - Connection ID
       * @param {number} [code=1000] - Close code
       * @param {string} [reason=''] - Close reason
       * @returns {Promise<void>}
       */
      async closeConnection(connectionId, code = 1000, reason = '') {
        const connection = connections.get(connectionId);
        if (connection) {
          connection.close(code, reason);
          connections.delete(connectionId);
        }
      },
      
      /**
       * Send message to specific connection
       * @param {string} connectionId - Connection ID
       * @param {any} message - Message to send
       * @returns {Promise<void>}
       */
      async send(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection) {
          throw new Error(`Connection ${connectionId} not found`);
        }
        
        await connection.send(message);
      },
      
      /**
       * Broadcast message to all or filtered connections
       * @param {any} message - Message to broadcast
       * @param {Function} [filter] - Optional filter function
       * @returns {Promise<void>}
       */
      async broadcast(message, filter) {
        const targetConnections = filter
          ? Array.from(connections.values()).filter(filter)
          : Array.from(connections.values());
        
        const promises = targetConnections
          .filter(conn => conn.isOpen())
          .map(conn => conn.send(message).catch(error => {
            logger.error(`Error broadcasting to connection ${conn.id}:`, error);
          }));
        
        await Promise.all(promises);
      },
      
      /**
       * Register connection handler
       * @param {Function} handler - Handler function
       */
      onConnection(handler) {
        if (typeof handler !== 'function') {
          throw new Error('Connection handler must be a function');
        }
        connectionHandlers.push(handler);
      },
      
      /**
       * Register disconnection handler
       * @param {Function} handler - Handler function
       */
      onDisconnection(handler) {
        if (typeof handler !== 'function') {
          throw new Error('Disconnection handler must be a function');
        }
        disconnectionHandlers.push(handler);
      },
      
      /**
       * Register error handler
       * @param {Function} handler - Handler function
       */
      onError(handler) {
        if (typeof handler !== 'function') {
          throw new Error('Error handler must be a function');
        }
        errorHandlers.push(handler);
      },
      
      /**
       * Register message handler for specific path
       * @param {string} path - Message path
       * @param {Function} handler - Handler function
       */
      registerMessageHandler(path, handler) {
        if (typeof handler !== 'function') {
          throw new Error('Message handler must be a function');
        }
        messageHandlers.set(path, handler);
      },
      
      /**
       * Route incoming WebSocket message to Mycelia
       * @param {string} connectionId - Connection ID
       * @param {Object} wsMessage - WebSocket message
       * @returns {Promise<Object>} Response
       */
      async routeMessage(connectionId, wsMessage) {
        const connection = connections.get(connectionId);
        if (!connection) {
          throw new Error(`Connection ${connectionId} not found`);
        }
        
        return messageHandler(connection, wsMessage);
      }
    });
  }
});

