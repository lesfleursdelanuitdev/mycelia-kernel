/**
 * KernelTestContext
 * 
 * Provides validated, consistent access to kernel and its services for testing.
 * 
 * This class ensures:
 * - Single kernel instance access
 * - Validated kernel identity
 * - Access to kernel tools (AccessControl, ProfileRegistry, etc.)
 * - Helper methods for common test operations
 * 
 * @example
 * const kernelContext = KernelTestContext.fromMessageSystem(messageSystem);
 * const validation = kernelContext.verifyIdentity();
 * expect(validation.success).toBe(true);
 * 
 * // Grant permission on a subsystem
 * const success = kernelContext.grantPermissionOnSubsystem('workspace', userPkr, 'rw');
 * 
 * // Get subsystem RWS
 * const rws = kernelContext.getSubsystemRWS('workspace');
 */

export class KernelTestContext {
  #kernel = null;
  #messageSystem = null;
  #accessControl = null;
  #principalsRegistry = null;
  #profileRegistry = null;

  /**
   * Create a KernelTestContext from a bootstrapped MessageSystem
   * 
   * @param {MessageSystem} messageSystem - Bootstrapped MessageSystem
   * @returns {KernelTestContext} Context with kernel access
   * @throws {Error} If kernel is not found
   */
  static fromMessageSystem(messageSystem) {
    if (!messageSystem) {
      throw new Error('KernelTestContext.fromMessageSystem: messageSystem is required');
    }

    // Try multiple ways to get kernel
    let kernel = null;
    
    // First, try getKernel() method (if available and in debug mode)
    if (typeof messageSystem.getKernel === 'function') {
      kernel = messageSystem.getKernel();
    }
    
    // If not available via getKernel, try registry lookup
    if (!kernel) {
      const registry = messageSystem.find('messageSystemRegistry');
      if (registry) {
        kernel = registry.get('kernel');
      }
    }
    
    // Last resort: try router (though router doesn't expose getKernel)
    if (!kernel) {
      const router = messageSystem.find('messageSystemRouter');
      // MessageRouter stores kernel in private #kernel field
      // We can't access it directly, but if router has a getKernel method, use it
      if (router && typeof router.getKernel === 'function') {
        kernel = router.getKernel();
      }
    }

    if (!kernel) {
      throw new Error('KernelTestContext: Kernel not found. Ensure MessageSystem is bootstrapped and kernel is registered in MessageSystemRegistry.');
    }

    return new KernelTestContext(kernel, messageSystem);
  }

  /**
   * Private constructor - use fromMessageSystem() instead
   * 
   * @param {KernelSubsystem} kernel - Kernel subsystem instance
   * @param {MessageSystem} messageSystem - MessageSystem instance
   */
  constructor(kernel, messageSystem) {
    this.#kernel = kernel;
    this.#messageSystem = messageSystem;
  }

  /**
   * Get the kernel subsystem instance
   * @returns {KernelSubsystem} The kernel instance
   */
  get kernel() {
    return this.#kernel;
  }

  /**
   * Get the kernel's identity (validated)
   * @returns {Object} Identity wrapper with pkr, canRead, canWrite, etc.
   * @throws {Error} If identity is not set
   */
  get identity() {
    if (!this.#kernel.identity) {
      throw new Error('KernelTestContext: Kernel identity is not set. Ensure kernel is bootstrapped.');
    }
    return this.#kernel.identity;
  }

  /**
   * Get the kernel's PKR (validated)
   * 
   * IMPORTANT: This gets the kernel PKR from the AccessControl PrincipalRegistry,
   * not from kernel.identity.pkr, because the kernel might have been registered
   * in a different PrincipalRegistry instance.
   * 
   * @returns {PKR} Kernel's Public Key Record from AccessControl registry
   * @throws {Error} If PKR is not available
   */
  get pkr() {
    // Try to get kernel PKR from AccessControl registry first
    // The kernel principal is registered in the registry with kind 'kernel'
    try {
      const principalsRegistry = this.principalsRegistry;
      const allPrincipals = principalsRegistry.list();
      const kernelPrincipal = allPrincipals.find(p => p.kind === 'kernel');
      
      if (kernelPrincipal) {
        return kernelPrincipal.pkr;
      }
    } catch (err) {
      // Fall through to use kernel.identity.pkr
    }
    
    // Fallback to kernel.identity.pkr
    const identity = this.identity;
    if (!identity.pkr) {
      throw new Error('KernelTestContext: Kernel PKR is not available.');
    }
    return identity.pkr;
  }

  /**
   * Get AccessControlSubsystem
   * @returns {AccessControlSubsystem} Access control subsystem
   */
  get accessControl() {
    if (!this.#accessControl) {
      this.#accessControl = this.#kernel.getAccessControl?.();
      if (!this.#accessControl) {
        throw new Error('KernelTestContext: AccessControlSubsystem not found. Ensure kernel is bootstrapped.');
      }
    }
    return this.#accessControl;
  }

  /**
   * Get the principals registry from AccessControlSubsystem
   * @returns {PrincipalRegistry} Principals registry
   */
  get principalsRegistry() {
    if (!this.#principalsRegistry) {
      const principalsFacet = this.accessControl.find('principals');
      if (!principalsFacet) {
        throw new Error('KernelTestContext: Principals facet not found on AccessControlSubsystem.');
      }
      this.#principalsRegistry = principalsFacet.registry;
      if (!this.#principalsRegistry) {
        throw new Error('KernelTestContext: Principals registry not available.');
      }
    }
    return this.#principalsRegistry;
  }

  /**
   * Get ProfileRegistrySubsystem
   * @returns {ProfileRegistrySubsystem} Profile registry subsystem
   */
  get profileRegistry() {
    if (!this.#profileRegistry) {
      this.#profileRegistry = this.#kernel.getProfileRegistry?.();
      if (!this.#profileRegistry) {
        throw new Error('KernelTestContext: ProfileRegistrySubsystem not found. Ensure kernel is bootstrapped.');
      }
    }
    return this.#profileRegistry;
  }

  /**
   * Verify kernel identity is properly set up
   * 
   * Checks:
   * - Identity exists
   * - PKR is registered in AccessControl registry
   * - kernelId is set
   * - PKR can be resolved
   * 
   * @returns {Object} Validation result with success status and details
   */
  verifyIdentity() {
    const result = {
      success: true,
      checks: {},
      errors: []
    };

    // Check 1: Identity exists
    if (!this.#kernel.identity) {
      result.success = false;
      result.checks.identityExists = false;
      result.errors.push('Kernel identity is not set');
      return result;
    }
    result.checks.identityExists = true;

    // Check 2: PKR exists
    let kernelPkr = this.#kernel.identity.pkr;
    if (!kernelPkr) {
      result.success = false;
      result.checks.pkrExists = false;
      result.errors.push('Kernel PKR is not set');
      return result;
    }
    result.checks.pkrExists = true;

    // Check 3: AccessControlSubsystem available
    let accessControl;
    try {
      accessControl = this.accessControl;
    } catch (err) {
      result.success = false;
      result.checks.accessControlAvailable = false;
      result.errors.push(`AccessControlSubsystem not available: ${err.message}`);
      return result;
    }
    result.checks.accessControlAvailable = true;

    // Check 4: Principals registry available
    let principalsRegistry;
    try {
      principalsRegistry = this.principalsRegistry;
    } catch (err) {
      result.success = false;
      result.checks.principalsRegistryAvailable = false;
      result.errors.push(`Principals registry not available: ${err.message}`);
      return result;
    }
    result.checks.principalsRegistryAvailable = true;

    // Check 5: Find kernel principal in registry
    let kernelPrincipal = principalsRegistry.get(kernelPkr.uuid);
    
    // If not found, try to find kernel principal by iterating
    if (!kernelPrincipal) {
      const allPrincipals = principalsRegistry.list();
      kernelPrincipal = allPrincipals.find(p => p.kind === 'kernel');
      
      if (kernelPrincipal) {
        result.checks.pkrInRegistry = true;
        result.checks.pkrUuidMismatch = true;
        result.errors.push(`Kernel PKR UUID mismatch: kernel.identity.pkr has UUID ${kernelPkr.uuid}, but registry has ${kernelPrincipal.pkr.uuid}`);
        kernelPkr = kernelPrincipal.pkr;
      } else {
        result.success = false;
        result.checks.pkrInRegistry = false;
        result.errors.push(`Kernel PKR (${kernelPkr.uuid}) is not in AccessControl PrincipalRegistry`);
        return result;
      }
    } else {
      result.checks.pkrInRegistry = true;
      result.checks.pkrUuidMismatch = false;
    }
    
    // Check 6: Kernel PKR can be resolved
    const resolvedKey = principalsRegistry.resolvePKR(kernelPkr);
    result.checks.pkrResolvable = !!resolvedKey;
    if (!resolvedKey) {
      result.success = false;
      result.errors.push('Kernel PKR cannot be resolved');
      return result;
    }

    // Check 7: Kernel is recognized as kernel
    const isKernel = principalsRegistry.isKernel(kernelPkr);
    result.checks.isKernel = isKernel;
    if (!isKernel) {
      result.success = false;
      result.errors.push('Kernel PKR is not recognized as kernel');
      return result;
    }

    // Check 8: kernelId is set
    const kernelId = principalsRegistry.kernelId;
    result.checks.kernelIdSet = !!kernelId;
    if (!kernelId) {
      result.warnings = result.warnings || [];
      result.warnings.push('kernelId is not set in registry (may be normal if using different registry)');
    }

    return result;
  }

  /**
   * Get subsystem RWS (ReaderWriterSet) for a subsystem
   * 
   * @param {string|BaseSubsystem} subsystem - Subsystem name or instance
   * @returns {ReaderWriterSet} RWS for the subsystem's identity
   * @throws {Error} If subsystem not found or has no identity
   */
  getSubsystemRWS(subsystem) {
    const subsystemInstance = typeof subsystem === 'string' 
      ? this.getSubsystem(subsystem)
      : subsystem;
    
    if (!subsystemInstance) {
      const name = typeof subsystem === 'string' ? subsystem : subsystem?.name;
      throw new Error(`KernelTestContext: Subsystem "${name}" not found`);
    }

    if (!subsystemInstance.identity || !subsystemInstance.identity.pkr) {
      throw new Error(`KernelTestContext: Subsystem "${subsystemInstance.name}" has no identity`);
    }

    return this.principalsRegistry.createRWS(subsystemInstance.identity.pkr);
  }

  /**
   * Grant permission on a subsystem's RWS
   * 
   * @param {string|BaseSubsystem} subsystem - Subsystem name or instance
   * @param {PKR} userPkr - User's PKR to grant permission to
   * @param {string} permission - Permission level: 'r', 'rw', or 'rwg'
   * @returns {boolean} True if permission was granted successfully
   */
  grantPermissionOnSubsystem(subsystem, userPkr, permission) {
    const subsystemRws = this.getSubsystemRWS(subsystem);
    const kernelPkr = this.pkr;

    if (permission === 'r') {
      return subsystemRws.addReader(kernelPkr, userPkr);
    } else if (permission === 'rw' || permission === 'rwg') {
      return subsystemRws.addWriter(kernelPkr, userPkr);
    }

    throw new Error(`KernelTestContext: Invalid permission level "${permission}". Must be 'r', 'rw', or 'rwg'`);
  }

  /**
   * Check if a PKR can be resolved
   * 
   * @param {PKR} pkr - PKR to check
   * @returns {boolean} True if PKR can be resolved
   */
  canResolvePKR(pkr) {
    if (!pkr) return false;
    try {
      const resolved = this.principalsRegistry.resolvePKR(pkr);
      return !!resolved;
    } catch {
      return false;
    }
  }

  /**
   * Check if a PKR is the kernel
   * 
   * @param {PKR} pkr - PKR to check
   * @returns {boolean} True if PKR is the kernel
   */
  isKernel(pkr) {
    if (!pkr) return false;
    try {
      return this.principalsRegistry.isKernel(pkr);
    } catch {
      return false;
    }
  }

  /**
   * Get a subsystem by name
   * 
   * @param {string} name - Subsystem name
   * @returns {BaseSubsystem|null} Subsystem instance or null if not found
   */
  getSubsystem(name) {
    if (!this.#messageSystem) {
      return null;
    }

    const registry = this.#messageSystem.find('messageSystemRegistry');
    if (!registry) {
      return null;
    }

    return registry.get(name) || null;
  }

  /**
   * Get all top-level subsystems
   * 
   * @returns {BaseSubsystem[]} Array of top-level subsystems
   */
  getTopLevelSubsystems() {
    if (!this.#messageSystem) {
      return [];
    }

    const registry = this.#messageSystem.find('messageSystemRegistry');
    if (!registry) {
      return [];
    }

    return Array.from(registry.values());
  }
}

