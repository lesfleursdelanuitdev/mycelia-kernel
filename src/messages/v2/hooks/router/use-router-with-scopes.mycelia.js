/**
 * useRouterWithScopes Hook
 * 
 * Wraps useRouter to add scope-based permission checking on top of RWS checks.
 * This provides a two-layer security model:
 * 1. Scope check (Layer 1): Validates Security Profile scopes
 * 2. RWS check (Layer 2): Validates RWS permissions (Mycelia core)
 * 
 * This hook:
 * - Requires 'router' facet from useRouter
 * - Overwrites the router facet with enhanced version
 * - Adds scope checking before RWS check
 * - Falls back to RWS-only checking if no scope mapping exists
 * 
 * Configuration:
 * ```javascript
 * subsystem.use(useRouterWithScopes, {
 *   config: {
 *     router: {
 *       scopeMapper: (routePath) => string | null,  // Function to map route to scope
 *       getUserRole: (callerPkr) => string | null,   // Function to get user role from PKR
 *       debug: boolean                               // Enable debug logging
 *     }
 *   }
 * });
 * ```
 * 
 * Usage:
 * ```javascript
 * subsystem
 *   .use(useRouter)              // Mycelia core hook
 *   .use(useRouterWithScopes)    // Enhanced router with scope checking
 *   .build();
 * 
 * // Register route with scope
 * subsystem.router.registerRoute('workspace://create', handler, {
 *   metadata: {
 *     required: 'write',
 *     scope: 'workspace:create'  // Permission scope
 *   }
 * });
 * ```
 */

import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

/**
 * Check if scope permission meets required permission level
 * 
 * Permission hierarchy:
 * - 'r' (read) = level 1
 * - 'rw' (read/write) = level 2
 * - 'rwg' (read/write/grant) = level 3
 * 
 * Required permission mapping:
 * - 'read' requires level >= 1
 * - 'write' requires level >= 2
 * - 'grant' requires level >= 3
 * 
 * @param {string} scopePermission - Permission from profile ('r', 'rw', 'rwg')
 * @param {string} requiredPermission - Required permission ('read', 'write', 'grant')
 * @returns {boolean} True if scope permission meets requirement
 */
function meetsPermissionRequirement(scopePermission, requiredPermission) {
  const permissionLevels = {
    'r': 1,
    'rw': 2,
    'rwg': 3
  };

  const requiredLevels = {
    'read': 1,
    'write': 2,
    'grant': 3
  };

  const scopeLevel = permissionLevels[scopePermission] || 0;
  const requiredLevel = requiredLevels[requiredPermission] || 0;

  return scopeLevel >= requiredLevel;
}

/**
 * Get Security Profile for a role
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @param {string} role - User role (e.g., 'student', 'teacher')
 * @returns {SecurityProfile|null} Security Profile or null if not found
 */
function getProfileForRole(kernel, role) {
  if (!kernel || !role) {
    return null;
  }

  // Get ProfileRegistrySubsystem via hierarchy
  const hierarchy = kernel.find('hierarchy');
  if (!hierarchy) {
    return null;
  }

  const profileRegistry = hierarchy.getChild('profile-registry');
  if (!profileRegistry) {
    return null;
  }

  // Get profiles facet
  let profilesFacet = profileRegistry.getProfiles?.();
  if (!profilesFacet) {
    profilesFacet = profileRegistry.find('profiles');
  }
  if (!profilesFacet) {
    profilesFacet = profileRegistry.profiles;
  }

  if (!profilesFacet) {
    return null;
  }

  // Get profile by role name
  try {
    return profilesFacet.getProfile(role);
  } catch {
    return null;
  }
}

/**
 * Check if caller has required scope permission
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @param {PKR} callerPkr - Caller's Public Key Record
 * @param {string} scope - Permission scope (e.g., 'workspace:create')
 * @param {string} requiredPermission - Required permission ('read', 'write', 'grant')
 * @param {Function} getUserRole - Function to get user role from PKR: (pkr) => string | null
 * @returns {boolean} True if caller has required permission for the scope
 */
function checkScopePermission(kernel, callerPkr, scope, requiredPermission, getUserRole) {
  if (!kernel || !callerPkr || !scope || !requiredPermission) {
    return false;
  }

  // Get user's role from PKR
  const role = getUserRole ? getUserRole(callerPkr) : null;
  if (!role) {
    return false; // No role = no access
  }

  // Get Security Profile for role
  const profile = getProfileForRole(kernel, role);
  if (!profile) {
    return false; // No profile = no access
  }

  // Get scope permission from profile
  const scopePermission = profile.getPermission(scope);
  if (!scopePermission) {
    return false; // Scope not in profile
  }

  // Check if scope permission meets required permission
  return meetsPermissionRequirement(scopePermission, requiredPermission);
}

export const useRouterWithScopes = createHook({
  kind: 'router',  // Same kind as useRouter - will overwrite it
  version: '2.0.0',  // Major version bump since it replaces useRouter
  overwrite: true, // Overwrite the router facet
  required: ['router'], // Requires router facet from useRouter
  attach: true,
  source: import.meta.url,
  contract: 'router',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.router || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useRouterWithScopes ${name}`);
    
    // Get the original router facet (from useRouter)
    const originalRouter = subsystem.find('router');
    if (!originalRouter) {
      throw new Error('useRouterWithScopes: router facet not found. Ensure useRouter is installed first.');
    }
    
    // Make local copies of all necessary properties and methods from original router
    // This ensures we don't lose access when we overwrite the router facet
    const originalRouteRegistry = originalRouter._routeRegistry;
    if (!originalRouteRegistry) {
      throw new Error('useRouterWithScopes: original router missing _routeRegistry. This should not happen.');
    }
    
    // Store bound methods locally
    const originalRegisterRoute = originalRouter.registerRoute?.bind(originalRouter);
    const originalRegisterRoutes = originalRouter.registerRoutes?.bind(originalRouter);
    const originalUnregisterRoute = originalRouter.unregisterRoute?.bind(originalRouter);
    const originalHasRoute = originalRouter.hasRoute?.bind(originalRouter);
    const originalGetRoutes = originalRouter.getRoutes?.bind(originalRouter);
    const originalMatch = originalRouter.match?.bind(originalRouter);
    const originalRoute = originalRouter.route?.bind(originalRouter);
    
    // Get kernel for accessing ProfileRegistrySubsystem
    // The subsystem might be a child of MessageSystem, so we need to get MS first, then kernel
    let kernel = null;
    
    // Get MessageSystem from subsystem.ctx.ms or subsystem.messageSystem
    const ms = subsystem.ctx?.ms || subsystem.messageSystem;
    
    if (ms) {
      // Try getKernel() first (works in debug mode)
      if (typeof ms.getKernel === 'function') {
        kernel = ms.getKernel();
      }
      
      // Try messageSystemRegistry
      if (!kernel && typeof ms.find === 'function') {
        const registry = ms.find('messageSystemRegistry');
        if (registry && typeof registry.get === 'function') {
          kernel = registry.get('kernel');
        }
      }
    }
    
    if (!kernel) {
      logger.warn('useRouterWithScopes: kernel not found, scope checking will be disabled');
    }
    
    // Get scope mapper function from config
    // If not provided, will use metadata.scope directly from route
    const scopeMapper = config.scopeMapper || null;
    
    // Get user role function from config
    // This is required for scope checking to work
    const getUserRole = config.getUserRole || null;
    
    if (!getUserRole && kernel) {
      logger.warn('useRouterWithScopes: getUserRole function not provided in config. Scope checking will be disabled.');
    }
    
    const version = ctx.__version || '0.0.0';
    
    // Wrap router methods to add scope checking
    return new Facet('router', { attach: true, overwrite: true, source: import.meta.url, contract: 'router', version })
      .add({
        // Delegate all non-overridden methods to original router (using local copies)
        registerRoute: originalRegisterRoute,
        registerRoutes: originalRegisterRoutes,
        unregisterRoute: originalUnregisterRoute,
        hasRoute: originalHasRoute,
        getRoutes: originalGetRoutes,
        _routeRegistry: originalRouteRegistry,
        
        /**
         * Match a path against registered routes (with scope checking)
         * 
         * @param {string} path - Path to match (e.g., 'workspace://123/read')
         * @param {Object} [options={}] - Routing options
         * @returns {Object|null} Match result or null if no match/permission denied
         */
        match(path, options = {}) {
          // Get match from original router (using local copy)
          const matchResult = originalMatch(path, options);
          
          if (!matchResult) {
            return null;
          }
          
          // Get scope from route metadata or scope mapper
          let scope = matchResult.routeEntry.metadata?.scope;
          if (!scope && scopeMapper) {
            scope = scopeMapper(path);
          }
          
          const required = matchResult.routeEntry.metadata?.required;
          
          // Check scope if scope exists, required permission is set, callerId is available, and getUserRole is configured
          if (scope && required && options.callerId && getUserRole && kernel) {
            try {
              const hasPermission = checkScopePermission(
                kernel,
                options.callerId,
                scope,
                required,
                getUserRole
              );
              
              if (!hasPermission) {
                if (debug) {
                  logger.warn(`Scope permission denied: scope="${scope}" required="${required}" callerId=${options.callerId?.uuid || 'unknown'}`);
                }
                // Return null to indicate no match (permission denied)
                return null;
              }
              
              if (debug) {
                logger.log(`Scope permission granted: scope="${scope}" required="${required}"`);
              }
            } catch (err) {
              logger.error('Error checking scope permission:', err);
              // On error, deny access (fail secure)
              return null;
            }
          }
          
          // Return match result (RWS check will happen when handler executes)
          return matchResult;
        },
        
        /**
         * Route a message by matching its path and executing the handler (with scope checking)
         * 
         * @param {Message} message - Message to route
         * @param {Object} [options={}] - Routing options
         * @returns {Promise<any>} Handler execution result
         * @throws {Error} If no route matches or permission denied
         */
        async route(message, options = {}) {
          if (!message || typeof message.getPath !== 'function') {
            throw new Error('route() requires a message with getPath() method');
          }
          
          const path = message.getPath();
          if (!path || typeof path !== 'string') {
            throw new Error('Message path must be a non-empty string');
          }
          
          // Get route match first (using local copy)
          const matchResult = originalMatch(path, options);
          
          if (!matchResult) {
            return null;
          }
          
          // Get scope from route metadata or scope mapper
          let scope = matchResult.routeEntry.metadata?.scope;
          if (!scope && scopeMapper) {
            scope = scopeMapper(path);
          }
          
          const required = matchResult.routeEntry.metadata?.required;
          
          // Check scope if scope exists, required permission is set, callerId is available, and getUserRole is configured
          if (scope && required && options.callerId && getUserRole && kernel) {
            try {
              if (debug) {
                logger.log(`[SCOPE CHECK] scope="${scope}" required="${required}" callerId=${options.callerId?.uuid || 'unknown'}`);
              }
              const hasPermission = checkScopePermission(
                kernel,
                options.callerId,
                scope,
                required,
                getUserRole
              );
              
              if (debug) {
                logger.log(`[SCOPE CHECK] hasPermission=${hasPermission} for scope="${scope}" required="${required}"`);
              }
              
              if (!hasPermission) {
                const error = new Error(`Permission denied: scope "${scope}" requires "${required}" permission`);
                error.code = 'PERMISSION_DENIED';
                error.scope = scope;
                error.required = required;
                throw error;
              }
              
              if (debug) {
                logger.log(`Scope permission granted: scope="${scope}" required="${required}"`);
              }
            } catch (err) {
              if (err.code === 'PERMISSION_DENIED') {
                throw err;
              }
              logger.error('Error checking scope permission:', err);
              // On error, deny access (fail secure)
              throw new Error(`Permission check failed: ${err.message}`);
            }
          } else if (debug) {
            // Debug why scope check is being skipped
            logger.log(`[SCOPE CHECK SKIPPED] scope=${scope} required=${required} callerId=${!!options.callerId} getUserRole=${!!getUserRole} kernel=${!!kernel}`);
          }
          
          // Scope check passed (or not needed) - delegate to original router (using local copy)
          // Original router will do RWS check (Layer 2)
          return await originalRoute(message, options);
        }
      });
  }
});

