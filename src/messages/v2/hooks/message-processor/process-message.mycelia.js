import { createLogger } from '../../utils/logger.utils.mycelia.js';

/**
 * Create a processMessageCore function with the given dependencies
 * 
 * @param {Object} dependencies - Dependencies for message processing
 * @param {Function} [dependencies.getRouterFacet] - Function to get router facet at runtime: () => routerFacet
 * @param {Object} [dependencies.routerFacet] - Router facet (deprecated - use getRouterFacet instead)
 * @param {SubsystemRouter} dependencies.routeRegistry - Route registry (SubsystemRouter instance) - fallback if routerFacet not provided
 * @param {Object} dependencies.ms - MessageSystem instance (for error reporting)
 * @param {Object} dependencies.statisticsFacet - Statistics facet (for recording statistics)
 * @param {boolean} dependencies.debug - Debug flag
 * @param {string} dependencies.subsystemName - Subsystem name for logging
 * @returns {Function} processMessageCore function: (message, options) => Promise<Object>
 */
export function createProcessMessageCore(dependencies) {
  const { getRouterFacet, routerFacet, routeRegistry, ms, statisticsFacet, debug, subsystemName } = dependencies;
  
  /**
   * Core message processing logic
   * @param {Message} message - Message to process
   * @param {Object} [options={}] - Processing options
   * @param {Symbol} [options.callerId] - Secret identity Symbol of the calling subsystem
   * @returns {Promise<Object>} Processing result
   */
  return async function processMessageCore(message, options = {}) {
    return await processMessage(
      {
        routeRegistry,
        errorReporter: async (message, authResult) => {
          // Send auth failure to error system
          if (ms) {
            try {
              await ms.sendError(
                'kernel://error/record/auth_failed',
                message,
                {
                  meta: {
                    authFailure: {
                      type: authResult.type,
                      message: authResult.message,
                      details: authResult.details
                    }
                  }
                }
              );
            } catch (error) {
              // Use runtime debug flag from options, fallback to hook debug
              const runtimeDebug = options.debug !== undefined ? options.debug : debug;
              if (runtimeDebug) {
                const runtimeLogger = createLogger(runtimeDebug, `useMessageProcessor ${subsystemName}`);
                runtimeLogger.error('Failed to send auth failure to error system:', error);
              }
            }
          }
        },
        statisticsRecorder: (processingTime) => {
          if (statisticsFacet?._statistics) {
            statisticsFacet._statistics.recordProcessed(processingTime);
          }
        },
        errorRecorder: () => {
          if (statisticsFacet?._statistics) {
            statisticsFacet._statistics.recordError();
          }
        },
        debug: options.debug || false,
        subsystemName
      },
      message,
      options
    );
  };
}

/**
 * Utility function to process a message through the complete processing pipeline
 * Handles route matching, handler execution, and error handling
 * 
 * @param {Object} context - Context object with subsystem dependencies
 * @param {Function} [context.getRouterFacet] - Function to get router facet at runtime: () => routerFacet
 * @param {Object} [context.routerFacet] - Router facet (deprecated - use getRouterFacet instead)
 * @param {SubsystemRouter} [context.routeRegistry] - Route registry (SubsystemRouter instance) for pattern matching (fallback)
 * @param {Function} context.statisticsRecorder - Function to record successful processing: (processingTime) => void
 * @param {Function} context.errorRecorder - Function to record errors: () => void
 * @param {boolean} context.debug - Debug flag
 * @param {string} context.subsystemName - Subsystem name for logging
 * @param {Message} message - Message to process
 * @param {Object} [options={}] - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processMessage(context, message, options = {}) {
  const { getRouterFacet, routerFacet, routeRegistry, statisticsRecorder, errorRecorder, debug, subsystemName } = context;
  
  // Get router facet at runtime (after all facets are attached)
  const runtimeRouterFacet = getRouterFacet ? getRouterFacet() : routerFacet;
  
  if (debug) {
    console.log(`processMessage: getRouterFacet=${!!getRouterFacet}, runtimeRouterFacet=${!!runtimeRouterFacet}, hasRoute=${runtimeRouterFacet && typeof runtimeRouterFacet.route === 'function'}, routeRegistry=${!!routeRegistry}`);
  }
  
  try {
    // PREFERRED: Use router facet's route() method if available
    // This ensures scope checking from useRouterWithScopes (or other router enhancements) is executed
    // Router facet methods are attached directly to the facet object
    if (runtimeRouterFacet && typeof runtimeRouterFacet.route === 'function') {
      const startTime = Date.now();
      let result;
      
      console.log(`[PROCESS MESSAGE] Using router facet route() method for ${subsystemName}`, {
        hasRoute: typeof runtimeRouterFacet.route === 'function',
        routerFacetSource: runtimeRouterFacet.getSource?.() || 'unknown'
      });
      
      if (debug) {
        console.log(`processMessage: Using router facet route() method for ${subsystemName}`);
      }
      
      try {
        // Router.route() handles scope checking, RWS checking, and handler execution
        result = await runtimeRouterFacet.route(message, options);
        
        // Record statistics if result indicates success
        if (result && result.success !== false) {
          const processingTime = Date.now() - startTime;
          statisticsRecorder(processingTime);
        }
        
        return result;
      } catch (error) {
        errorRecorder();
        if (debug) {
          console.error(`BaseSubsystem ${subsystemName}: Error routing message ${message.getId()}:`, error);
        }
        throw error;
      }
    }
    
    // FALLBACK: Use route registry directly (bypasses scope checking)
    // This is for backward compatibility but should be avoided
    if (routeRegistry) {
      if (debug) {
        console.warn(`processMessage: Falling back to routeRegistry.match() for ${subsystemName} (scope checking will be bypassed)`);
      }
      
      // Step 1: Match route
      const match = matchRoute(routeRegistry, message, options);
      if (!match) {
        errorRecorder();
        
        if (debug) {
          console.warn(`BaseSubsystem ${subsystemName}: No route handler found for path: ${message.getPath()}`);
        }
        
        return {
          success: false,
          error: `No route handler found for path: ${message.getPath()}`,
          subsystem: subsystemName,
          availableRoutes: routeRegistry.getRoutes().map(r => r.pattern)
        };
      }
      
      // Step 2: Execute handler
      const result = await executeHandler(match, message, statisticsRecorder, options);
      
      return result;
    }
    
    // No router available
    errorRecorder();
    throw new Error(`BaseSubsystem ${subsystemName}: No router facet or route registry available`);
    
  } catch (error) {
    errorRecorder();
    
    if (debug) {
      console.error(`BaseSubsystem ${subsystemName}: Error processing message ${message.getId()}:`, error);
    }
    
    throw error;
  }
}

/**
 * Match a route for the message
 * 
 * @param {SubsystemRouter} routeRegistry - Route registry (SubsystemRouter instance)
 * @param {Message} message - Message to match
 * @returns {Object|null} Route match object with { handler, params, routeEntry } or null if no match
 */
function matchRoute(routeRegistry, message, options = {}) {
  // Get path from message
  const path = message.getPath();
  
  // Match route using SubsystemRouter (expects string path)
  // SubsystemRouter.match() returns: { matched: true, params, pattern, routeEntry } or null
  // The handler is in routeEntry.handler, not directly in the match result
  const matchResult = routeRegistry.match(path, options);
  if (!matchResult) {
    return null;
  }
  
  // Extract handler from routeEntry and return in expected format
  return {
    handler: matchResult.routeEntry.handler,
    params: matchResult.params,
    routeEntry: matchResult.routeEntry
  };
}

/**
 * Execute the matched handler
 * 
 * @param {Object} match - Route match object from matchRoute
 * @param {Message} message - Message being processed
 * @param {Function} statisticsRecorder - Function to record processing time: (processingTime) => void
 * @param {Object} [options={}] - Processing options (callerIdSetBy will be sanitized)
 * @returns {Promise<Object>} Handler execution result
 */
async function executeHandler(match, message, statisticsRecorder, options = {}) {
  // Sanitize options: remove callerIdSetBy before passing to handler
  // callerIdSetBy is used by the auth wrapper for kernel validation but should not be exposed to handlers
  const { callerIdSetBy: _callerIdSetBy, ...sanitizedOptions } = options;
  
  // Execute matched handler (authorization passed)
  // Handler signature: async (message, params, options) => result
  const startTime = Date.now();
  const result = await match.handler(
    message,
    match.params,
    sanitizedOptions
  );
  const processingTime = Date.now() - startTime;
  
  // Record processing statistics if result indicates success
  if (result && result.success !== false) {
    statisticsRecorder(processingTime);
  }
  
  return result;
}

