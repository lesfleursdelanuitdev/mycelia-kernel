/**
 * ProfileTestContext
 * 
 * Utilities for testing security profiles and profile application.
 * 
 * @example
 * const profileCtx = new ProfileTestContext(kernel);
 * 
 * // Create and apply profile
 * const profile = profileCtx.createProfile('teacher', {
 *   'workspace:create': 'rwg',
 *   'workspace:read': 'rwg'
 * });
 * 
 * const result = profileCtx.applyProfileToPrincipal('teacher', userPkr);
 * expect(result.success).toBe(true);
 */

export class ProfileTestContext {
  #kernel = null;
  #profileRegistry = null;
  #principalsRegistry = null;

  /**
   * Create a ProfileTestContext
   * 
   * @param {KernelSubsystem} kernel - Kernel subsystem instance
   */
  constructor(kernel) {
    if (!kernel) {
      throw new Error('ProfileTestContext: kernel is required');
    }
    this.#kernel = kernel;
  }

  /**
   * Get ProfileRegistrySubsystem
   * @returns {ProfileRegistrySubsystem} Profile registry subsystem
   */
  get profileRegistry() {
    if (!this.#profileRegistry) {
      this.#profileRegistry = this.#kernel.getProfileRegistry?.();
      if (!this.#profileRegistry) {
        throw new Error('ProfileTestContext: ProfileRegistrySubsystem not found. Ensure kernel is bootstrapped.');
      }
    }
    return this.#profileRegistry;
  }

  /**
   * Get principals registry
   * @returns {PrincipalRegistry} Principals registry
   */
  get principalsRegistry() {
    if (!this.#principalsRegistry) {
      const accessControl = this.#kernel.getAccessControl?.();
      if (!accessControl) {
        throw new Error('ProfileTestContext: AccessControlSubsystem not found.');
      }
      const principalsFacet = accessControl.find('principals');
      if (!principalsFacet) {
        throw new Error('ProfileTestContext: Principals facet not found.');
      }
      this.#principalsRegistry = principalsFacet.registry;
      if (!this.#principalsRegistry) {
        throw new Error('ProfileTestContext: Principals registry not available.');
      }
    }
    return this.#principalsRegistry;
  }

  /**
   * Create a security profile
   * 
   * @param {string} name - Profile name
   * @param {Object|Map} grants - Profile grants (scope -> permission mapping)
   * @param {Object} [metadata={}] - Profile metadata
   * @returns {SecurityProfile} Created profile
   */
  createProfile(name, grants, metadata = {}) {
    return this.profileRegistry.createProfile(name, grants, metadata);
  }

  /**
   * Get a security profile
   * 
   * @param {string} name - Profile name
   * @returns {SecurityProfile|null} Profile or null if not found
   */
  getProfile(name) {
    return this.profileRegistry.getProfile(name);
  }

  /**
   * List all profile names
   * 
   * @returns {string[]} Array of profile names
   */
  listProfiles() {
    return this.profileRegistry.listProfiles();
  }

  /**
   * Apply a profile to a principal
   * 
   * @param {string} profileName - Profile name
   * @param {PKR} principalPkr - Principal's PKR
   * @returns {Object} Application result with success status and details
   */
  applyProfileToPrincipal(profileName, principalPkr) {
    return this.profileRegistry.applyProfileToPrincipal(profileName, principalPkr);
  }

  /**
   * Remove a profile from a principal
   * 
   * @param {string} profileName - Profile name
   * @param {PKR} principalPkr - Principal's PKR
   * @returns {Object} Removal result with success status and details
   */
  removeProfileFromPrincipal(profileName, principalPkr) {
    return this.profileRegistry.removeProfileFromPrincipal(profileName, principalPkr);
  }

  /**
   * Verify a profile exists
   * 
   * @param {string} name - Profile name
   * @returns {boolean} True if profile exists
   */
  verifyProfileExists(name) {
    const profile = this.getProfile(name);
    return profile !== null && profile !== undefined;
  }

  /**
   * Verify a profile has a specific scope grant
   * 
   * @param {string} profileName - Profile name
   * @param {string} scope - Scope to check
   * @returns {string|null} Permission level ('r', 'rw', 'rwg') or null if not found
   */
  verifyProfileGrants(profileName, scope) {
    const profile = this.getProfile(profileName);
    if (!profile) {
      return null;
    }
    return profile.getPermission(scope);
  }

  /**
   * Verify a profile has been applied to a principal
   * 
   * This checks if the principal has the permissions from the profile
   * by verifying RWS permissions on subsystems.
   * 
   * @param {string} profileName - Profile name
   * @param {PKR} principalPkr - Principal's PKR
   * @returns {boolean} True if profile appears to be applied
   */
  verifyProfileApplied(profileName, principalPkr) {
    const profile = this.getProfile(profileName);
    if (!profile) {
      return false;
    }

    // Get grants from profile
    const grants = profile.getGrants();
    if (!grants || grants.size === 0) {
      return true; // Profile has no grants, so "applied" is trivially true
    }

    // Check if principal has permissions on at least one subsystem
    // This is a heuristic - we check if the principal can access any subsystem
    // that the profile grants permissions on
    const accessControl = this.#kernel.getAccessControl?.();
    if (!accessControl) {
      return false;
    }

    const principalsFacet = accessControl.find('principals');
    if (!principalsFacet) {
      return false;
    }

    // Get message system registry to find subsystems
    const messageSystem = this.#kernel.messageSystem;
    if (!messageSystem) {
      return false;
    }

    const registry = messageSystem.find('messageSystemRegistry');
    if (!registry) {
      return false;
    }

    // Check if principal has permissions on at least one subsystem
    // that the profile grants access to
    for (const [scope] of grants) {
      const subsystemName = scope.split(':')[0];
      const subsystem = registry.get(subsystemName);
      
      if (subsystem && subsystem.identity && subsystem.identity.pkr) {
        const rws = principalsFacet.createRWS(subsystem.identity.pkr);
        const permission = grants.get(scope);
        
        // Check if principal has the expected permission
        if (permission === 'r' && rws.canRead(principalPkr)) {
          return true; // At least one permission is applied
        }
        if ((permission === 'rw' || permission === 'rwg') && rws.canWrite(principalPkr)) {
          return true; // At least one permission is applied
        }
      }
    }

    return false;
  }
}


