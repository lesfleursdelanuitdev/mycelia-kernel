/**
 * useHonoServer Utilities
 * 
 * Utility functions for the useHonoServer hook.
 * Provides Hono loading and Mycelia handler creation.
 */

import { extractTraceIdFromHeaders, injectTraceIdIntoHeaders } from '../../../utils/trace.utils.mycelia.js';

/**
 * Load and configure Hono application
 * 
 * @param {Object} config - Server configuration
 * @param {Object} honoAppRef - Reference to store the Hono app instance
 * @returns {Promise<Object>} Hono application instance
 * @throws {Error} If Hono is not installed
 */
export async function loadHono(config, honoAppRef) {
  if (honoAppRef.app) {
    return honoAppRef.app;
  }
  
  try {
    const honoModule = await import('hono');
    const { Hono } = honoModule;
    const app = new Hono(config.hono || {});
    
    honoAppRef.app = app;
    return app;
  } catch (error) {
    throw new Error(`Hono is not installed. Please install it: npm install hono. Original error: ${error.message}`);
  }
}

/**
 * Create a Mycelia message handler for Hono routes
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
 * @returns {Function} Hono route handler function
 */
export function createMyceliaHandler(routerFacet, messagesFacet, logger, routePath, httpMethod, options = {}) {
  return async (c) => {
    try {
      // Extract trace ID from HTTP headers (if present)
      const headers = Object.fromEntries(c.req.raw.headers.entries());
      const traceId = extractTraceIdFromHeaders(headers, options.traceIdHeader || 'X-Trace-Id');
      
      // Transform HTTP request to Mycelia message
      const transformRequest = options.transformRequest || (async (c) => {
        try {
          return await c.req.json();
        } catch {
          return {};
        }
      });
      const body = await transformRequest(c);
      
      // Substitute path parameters into the Mycelia path
      let finalMyceliaPath = routePath;
      const params = c.req.param();
      if (params) {
        for (const paramName in params) {
          finalMyceliaPath = finalMyceliaPath.replace(`{${paramName}}`, params[paramName]);
        }
      }

      // Get query parameters
      const query = {};
      const url = new URL(c.req.url);
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const message = messagesFacet.create(finalMyceliaPath, body, {
        meta: {
          traceId: traceId || undefined, // Use extracted trace ID or let MessageFactory generate one
          httpMethod,
          params: params || {},
          query: query || {},
          headers: headers || {},
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
          return c.json({ error: 'Route not found' }, 404);
        }
      } catch (error) {
        // Router throws if there's an error during routing or handler execution
        logger.error('Error routing message:', error);
        return c.json({ error: error.message || 'Routing failed' }, 500);
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
        c.header('X-Trace-Id', messageTraceId);
      }
      
      return c.json(responseBody, statusCode);
    } catch (error) {
      logger.error('Error in Mycelia route handler:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  };
}




