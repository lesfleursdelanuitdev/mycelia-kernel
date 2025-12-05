/**
 * Router Security Utilities
 * 
 * Utilities for integrating role-based security with useRouterWithScopes.
 * Provides standard functions for mapping PKRs to roles and profiles.
 */

/**
 * Create a standard getUserRole function for useRouterWithScopes
 * Gets the role from a PKR by looking up the principal in AccessControlSubsystem
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @returns {Function} getUserRole function: (pkr) => string | null
 * 
 * @example
 * import { createGetUserRole } from './utils/router-security-utils.mycelia.js';
 * 
 * const kernel = messageSystem.getKernel();
 * const getUserRole = createGetUserRole(kernel);
 * 
 * subsystem.use(useRouterWithScopes).build({
 *   config: {
 *     router: {
 *       getUserRole,
 *       debug: true
 *     }
 *   }
 * });
 */
export function createGetUserRole(kernel) {
  if (!kernel) {
    throw new Error('createGetUserRole: kernel is required');
  }

  return function getUserRole(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return null;
    }
    
    try {
      // Get AccessControlSubsystem
      const accessControl = kernel.getAccessControl?.();
      if (!accessControl) {
        console.warn('createGetUserRole: AccessControlSubsystem not found');
        return null;
      }
      
      // Get principals facet
      const principalsFacet = accessControl.find('principals');
      if (!principalsFacet || typeof principalsFacet.getRoleForPKR !== 'function') {
        console.warn('createGetUserRole: principals facet not found or missing getRoleForPKR');
        return null;
      }
      
      // Get role from principal metadata
      return principalsFacet.getRoleForPKR(pkr);
    } catch (error) {
      console.error('createGetUserRole: error getting role:', error);
      return null;
    }
  };
}

/**
 * Create a scope mapper function that maps route paths to permission scopes
 * This is a helper for useRouterWithScopes when routes don't have scope metadata
 * 
 * @param {Object} mappings - Object mapping path patterns to permission scopes
 * @returns {Function} scopeMapper function: (routePath) => string | null
 * 
 * @example
 * import { createScopeMapper } from './utils/router-security-utils.mycelia.js';
 * 
 * const scopeMapper = createScopeMapper({
 *   'workspace://create': 'workspace:create',
 *   'workspace://{id}/read': 'workspace:read',
 *   'workspace://{id}/delete': 'workspace:delete',
 *   'admin/*': 'admin:manage'
 * });
 * 
 * subsystem.use(useRouterWithScopes).build({
 *   config: {
 *     router: {
 *       scopeMapper,
 *       getUserRole: createGetUserRole(kernel),
 *       debug: true
 *     }
 *   }
 * });
 */
export function createScopeMapper(mappings) {
  if (!mappings || typeof mappings !== 'object') {
    throw new Error('createScopeMapper: mappings object is required');
  }

  return function scopeMapper(routePath) {
    if (!routePath || typeof routePath !== 'string') {
      return null;
    }

    // Try exact match first
    if (mappings[routePath]) {
      return mappings[routePath];
    }

    // Try pattern matching (simple wildcard support)
    for (const [pattern, scope] of Object.entries(mappings)) {
      // Convert pattern to regex
      // Replace {param} with [^/]+ and * with .*
      const regexPattern = pattern
        .replace(/\{[^}]+\}/g, '[^/]+')
        .replace(/\*/g, '.*');
      
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(routePath)) {
        return scope;
      }
    }

    return null;
  };
}

/**
 * Helper function to check if a role has a specific scope permission
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @param {string} role - Role name (e.g., 'student', 'teacher')
 * @param {string} scope - Permission scope (e.g., 'workspace:create')
 * @returns {string|null} Permission level ('r', 'rw', 'rwg') or null if not found
 * 
 * @example
 * import { getRolePermissionForScope } from './utils/router-security-utils.mycelia.js';
 * 
 * const permission = getRolePermissionForScope(kernel, 'student', 'workspace:create');
 * if (permission === 'rw') {
 *   console.log('Student can read and write to workspace:create');
 * }
 */
export function getRolePermissionForScope(kernel, role, scope) {
  if (!kernel || !role || !scope) {
    return null;
  }

  try {
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
    const profile = profilesFacet.getProfile(role);
    if (!profile) {
      return null;
    }

    // Get permission for scope
    return profile.getPermission(scope);
  } catch (error) {
    console.error('getRolePermissionForScope: error:', error);
    return null;
  }
}

