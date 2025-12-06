/**
 * useExpressServer Utilities
 * 
 * Utility functions for the useExpressServer hook.
 * Provides Express loading and Mycelia handler creation.
 */

import { extractTraceIdFromHeaders, injectTraceIdIntoHeaders } from '../../../utils/trace.utils.mycelia.js';

/**
 * Load and configure Express application
 * 
 * @param {Object} config - Server configuration
 * @param {Object} expressAppRef - Reference to store the Express app instance
 * @returns {Promise<Object>} Express application instance
 * @throws {Error} If Express is not installed
 */
export async function loadExpress(config, expressAppRef) {
  if (expressAppRef.app) {
    return expressAppRef.app;
  }
  
  try {
    const expressModule = await import('express');
    const express = expressModule.default || expressModule;
    const app = express();
    
    // Apply Express configuration
    if (config.express?.json !== false) {
      app.use(express.json());
    }
    if (config.express?.urlencoded !== false) {
      app.use(express.urlencoded({ extended: true }));
    }
    
    expressAppRef.app = app;
    return app;
  } catch (error) {
    throw new Error(`Express is not installed. Please install it: npm install express. Original error: ${error.message}`);
  }
}

/**
 * Create a Mycelia message handler for Express routes
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
 * @returns {Function} Express route handler function
 */
export function createMyceliaHandler(routerFacet, messagesFacet, logger, routePath, httpMethod, options = {}) {
  return async (req, res, next) => {
    try {
      // Extract trace ID from HTTP headers (if present)
      const traceId = extractTraceIdFromHeaders(req.headers, options.traceIdHeader || 'X-Trace-Id');
      
      // Transform HTTP request to Mycelia message
      const transformRequest = options.transformRequest || ((req) => req.body || {});
      const body = transformRequest(req);
      
      // Create message with concrete Mycelia path (substitute params into routePath)
      const pathWithParams = routePath.replace(/\{([^}]+)\}/g, (_, name) => {
        return (req.params && req.params[name] != null) ? String(req.params[name]) : `{${name}}`;
      });

      const message = messagesFacet.create(pathWithParams, body, {
        meta: {
          traceId: traceId || undefined, // Use extracted trace ID or let MessageFactory generate one
          httpMethod,
          params: req.params || {},
          query: req.query || {},
          headers: req.headers || {},
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
          res.status(404).json({ error: 'Route not found' });
          return;
        }
      } catch (error) {
        // Router throws if there's an error during routing or handler execution
        logger.error('Error routing message:', error);
        res.status(500).json({ error: error.message || 'Routing failed' });
        return;
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
      const transformResponse = options.transformResponse || ((resBody) => resBody);
      const responseBody = transformResponse(handlerResult);
      
      // Determine status code from handlerResult
      // Handlers typically return objects with success flag
      const statusCode = handlerResult?.statusCode || (handlerResult?.success === false ? 400 : 200);
      
      // Inject trace ID into response headers
      if (messageTraceId) {
        res.setHeader('X-Trace-Id', messageTraceId);
      }
      
      res.status(statusCode).json(responseBody);
    } catch (error) {
      logger.error('Error in Mycelia route handler:', error);
      if (next) {
        next(error);
      } else {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  };
}





