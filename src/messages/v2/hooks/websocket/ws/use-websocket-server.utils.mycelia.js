/**
 * useWebSocketServer Utilities
 * 
 * Utility functions for the useWebSocketServer hook.
 * Provides WebSocket server loading and message handling.
 */

import { extractTraceIdFromHeaders } from '../../../utils/trace.utils.mycelia.js';

/**
 * Load and configure WebSocket server (ws library)
 * 
 * @param {Object} config - WebSocket configuration
 * @param {Object} wsRef - Reference to store the WebSocket server instance
 * @returns {Promise<Object>} WebSocket server instance
 * @throws {Error} If ws is not installed
 */
export async function loadWebSocketServer(config, wsRef) {
  if (wsRef.instance) {
    return wsRef.instance;
  }
  
  try {
    const wsModule = await import('ws');
    const { WebSocketServer } = wsModule;
    
    const serverOptions = {
      port: config.port || 8080,
      host: config.host || '0.0.0.0',
      path: config.path || '/ws',
      perMessageDeflate: config.options?.perMessageDeflate !== false,
      maxPayload: config.options?.maxPayload || 1024 * 1024, // 1MB default
      clientTracking: true,
      ...(config.options || {})
    };
    
    const instance = new WebSocketServer(serverOptions);
    
    wsRef.instance = instance;
    return instance;
  } catch (error) {
    throw new Error(`ws is not installed. Please install it: npm install ws. Original error: ${error.message}`);
  }
}

/**
 * Create a message handler for WebSocket connections
 * 
 * Transforms WebSocket messages to Mycelia messages, routes them through the Mycelia system,
 * and transforms the results back to WebSocket messages.
 * 
 * @param {Object} routerFacet - Router facet for routing messages
 * @param {Object} messagesFacet - Messages facet for creating messages
 * @param {Object} logger - Logger instance for error logging
 * @param {string} defaultPath - Default Mycelia path for messages
 * @param {Object} [options={}] - Handler options
 * @returns {Function} WebSocket message handler function
 */
export function createWebSocketMessageHandler(routerFacet, messagesFacet, logger, defaultPath, options = {}) {
  return async (connection, wsMessage) => {
    try {
      // Parse WebSocket message
      let messageData;
      if (typeof wsMessage === 'string') {
        try {
          messageData = JSON.parse(wsMessage);
        } catch (error) {
          return {
            success: false,
            error: 'Invalid JSON message format',
            correlationId: null
          };
        }
      } else if (typeof wsMessage === 'object') {
        messageData = wsMessage;
      } else {
        return {
          success: false,
          error: 'Message must be JSON string or object',
          correlationId: null
        };
      }

      // Extract path, body, and metadata
      const path = messageData.path || defaultPath;
      const body = messageData.body || {};
      const correlationId = messageData.correlationId || null;
      const traceId = messageData.metadata?.traceId || extractTraceIdFromHeaders(messageData.headers || {});

      // Create Mycelia message
      // processImmediately goes into mutable metadata (not a standard fixed key)
      const message = messagesFacet.create(path, body, {
        meta: {
          traceId: traceId || undefined,
          correlationId,
          connectionId: connection.id,
          websocket: true,
          processImmediately: true  // Goes into mutable metadata, accessible via getCustomMutableField
        }
      });

      // Route message through Mycelia
      let result;
      try {
        result = await routerFacet.route(message);
        
        // If no route matched, router.route() returns null
        if (result === null) {
          return {
            success: false,
            error: 'Route not found',
            correlationId
          };
        }
      } catch (error) {
        logger.error('Error routing WebSocket message:', error);
        return {
          success: false,
          error: error.message || 'Routing failed',
          correlationId
        };
      }

      // Normalize result shape when using MessageSystem router
      // The router returns { success, subsystem, messageId, result: { accepted, processed, result: handlerResult } }
      let handlerResult = result;
      if (result && typeof result === 'object' && 'result' in result && 'subsystem' in result && 'messageId' in result) {
        // MessageSystem router: unwrap inner route result
        const routeResult = result.result;
        if (routeResult && typeof routeResult === 'object' && 'result' in routeResult) {
          handlerResult = routeResult.result;
        }
      }

      // Transform result to WebSocket response format
      const response = {
        success: handlerResult?.success !== false,
        data: handlerResult?.data || handlerResult,
        correlationId,
        error: handlerResult?.success === false ? (handlerResult?.error || 'Handler failed') : null,
        metadata: {
          traceId: message.getMeta?.()?.getTraceId?.() || traceId,
          timestamp: Date.now()
        }
      };

      return response;
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      return {
        success: false,
        error: error.message || 'Message handling failed',
        correlationId: null
      };
    }
  };
}

