/**
 * useFastifyServer Utilities
 * 
 * Utility functions for the useFastifyServer hook.
 * Provides Fastify loading and Mycelia handler creation.
 */

import { extractTraceIdFromHeaders, injectTraceIdIntoHeaders } from '../../../utils/trace.utils.mycelia.js';

/**
 * Load and configure Fastify application
 * 
 * @param {Object} config - Server configuration
 * @param {Object} fastifyRef - Reference to store the Fastify instance
 * @returns {Promise<Object>} Fastify application instance
 * @throws {Error} If Fastify is not installed
 */
export async function loadFastify(config, fastifyRef) {
  if (fastifyRef.instance) {
    return fastifyRef.instance;
  }
  
  try {
    const fastifyModule = await import('fastify');
    const Fastify = fastifyModule.default || fastifyModule;
    const instance = Fastify(config.fastify || {});
    
    fastifyRef.instance = instance;
    return instance;
  } catch (error) {
    throw new Error(`Fastify is not installed. Please install it: npm install fastify. Original error: ${error.message}`);
  }
}

/**
 * Create a Mycelia message handler for Fastify routes
 * 
 * Transforms HTTP requests to Mycelia messages, routes them through the Mycelia system,
 * and transforms the results back to HTTP responses.
 * 
 * @param {Object} routerFacet - Router facet for routing messages
 * @param {Object} messagesFacet - Messages facet for creating messages
 * @param {Object} logger - Logger instance for error logging
 * @param {string} routePath - Mycelia route path (e.g., 'user://get/{id}')
 * @param {string} httpMethod - HTTP method ('GET', 'POST', etc.)
 * @param {Object} [options={}] - Handler options
 * @param {Function} [options.transformRequest] - Transform HTTP request to message body
 * @param {Function} [options.transformResponse] - Transform Mycelia result to HTTP response
 * @returns {Function} Fastify route handler function
 */
export function createMyceliaHandler(routerFacet, messagesFacet, logger, routePath, httpMethod, options = {}) {
  return async (request, reply) => {
    try {
      // Extract trace ID from HTTP headers (if present)
      const traceId = extractTraceIdFromHeaders(request.headers, options.traceIdHeader || 'X-Trace-Id');
      
      // Transform HTTP request to Mycelia message
      const transformRequest = options.transformRequest || ((req) => req.body || {});
      const body = transformRequest(request);
      
      // Create message with concrete Mycelia path (substitute params into routePath)
      const pathWithParams = routePath.replace(/\{([^}]+)\}/g, (_, name) => {
        return (request.params && request.params[name] != null) ? String(request.params[name]) : `{${name}}`;
      });

      const message = messagesFacet.create(pathWithParams, body, {
        meta: {
          traceId: traceId || undefined, // Use extracted trace ID or let MessageFactory generate one
          httpMethod,
          params: request.params || {},
          query: request.query || {},
          headers: request.headers || {},
          // Ensure immediate processing for HTTP-triggered Mycelia messages
          processImmediately: true
        }
      });
      
      // Get trace ID from message (may have been generated if not in headers)
      const messageTraceId = message.getMeta?.()?.getTraceId?.() || message.meta?.getTraceId?.() || traceId;
      
      // Route message through Mycelia
      // router.route() returns the handler result directly, or null if no route matches
      let result;
      try {
        result = await routerFacet.route(message);
        
        // If no route matched, router.route() returns null
        if (result === null) {
          reply.code(404).send({ error: 'Route not found' });
          return;
        }
      } catch (error) {
        // Router throws if there's an error during routing or handler execution
        logger.error('Error routing message:', error);
        reply.code(500).send({ error: error.message || 'Routing failed' });
        return;
      }
      
      if (result && result.success === false) {
        logger.error('Mycelia handler result indicates failure:', result);
      }

      // Normalize result shape when using MessageSystem router
      let handlerResult = result;
      if (result && typeof result === 'object' && 'result' in result && 'subsystem' in result && 'messageId' in result) {
        // MessageSystem router: unwrap inner route result
        const routeResult = result.result;
        if (routeResult && typeof routeResult === 'object' && 'result' in routeResult) {
          handlerResult = routeResult.result;
        } else {
          handlerResult = routeResult;
        }
      }
      
      // Transform Mycelia response to HTTP response
      const transformResponse = options.transformResponse || ((res) => res);
      const responseBody = transformResponse(handlerResult);
      
      // Determine status code from handlerResult
      // Handlers typically return objects with success flag
      const statusCode = handlerResult?.statusCode || (handlerResult?.success === false ? 400 : 200);
      
      // Inject trace ID into response headers
      if (messageTraceId) {
        reply.header('X-Trace-Id', messageTraceId);
      }
      
      reply.code(statusCode).send(responseBody);
    } catch (error) {
      logger.error('Error in Mycelia route handler:', error);
      reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  };
}





