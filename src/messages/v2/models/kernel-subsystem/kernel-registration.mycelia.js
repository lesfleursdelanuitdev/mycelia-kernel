/**
 * KernelRegistration
 * 
 * Handles subsystem registration with access control.
 * Wires subsystem principals and registers child subsystems.
 * 
 * @example
 * const registration = new KernelRegistration(kernelSubsystem);
 * const wrapper = registration.registerSubsystem(subsystemInstance, options);
 */
export class KernelRegistration {
  /**
   * Create a new KernelRegistration instance
   * 
   * @param {KernelSubsystem} kernel - The kernel subsystem instance
   */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /**
   * Register a subsystem with access control.
   * 
   * Wires a subsystem principal and attaches identity to the subsystem instance
   * by delegating to the AccessControlSubsystem's wireSubsystem method.
   * Subsystems registered through the kernel are always registered as 'topLevel'.
   * 
   * Returns a wrapper object that exposes limited subsystem methods.
   * 
   * @param {BaseSubsystem} subsystemInstance - The subsystem instance to register
   * @param {object} [options={}] - Optional options
   * @param {object} [options.metadata={}] - Optional metadata for the subsystem
   * @returns {Object} - A wrapper object exposing limited subsystem methods
   * @throws {Error} If access control subsystem is not found, or if wireSubsystem fails
   */
  registerSubsystem(subsystemInstance, options = {}) {
    const accessControl = this.kernel.getAccessControl();
    if (!accessControl) {
      throw new Error('KernelRegistration.registerSubsystem: AccessControlSubsystem not found. Ensure kernel is bootstrapped.');
    }
    
    const result = accessControl.wireSubsystem('topLevel', subsystemInstance, options);
    const subsystem = result.subsystem;
    
    // Register all child subsystems in the hierarchy
    this.registerChildSubsystems(subsystem, options);
    
    // Return wrapper is created by caller
    return subsystem;
  }

  /**
   * Register all child subsystems in the parent's hierarchy with access control.
   * 
   * @param {BaseSubsystem} parent - Parent subsystem to traverse
   * @param {Object} [options={}] - Optional options to pass to wireSubsystem
   * @throws {Error} If access control subsystem is not found or parent lacks identity
   */
  registerChildSubsystems(parent, options = {}) {
    // Get access control subsystem
    const accessControl = this.kernel.getAccessControl();
    if (!accessControl) {
      throw new Error('KernelRegistration.registerChildSubsystems: AccessControlSubsystem not found. Ensure kernel is bootstrapped.');
    }

    // Get parent's hierarchy facet
    const parentHierarchy = parent.find('hierarchy');
    if (!parentHierarchy) {
      // Parent doesn't have hierarchy facet, so no children to register
      return;
    }

    // Validate parent has identity with PKR
    if (!parent.identity || !parent.identity.pkr) {
      throw new Error('KernelRegistration.registerChildSubsystems: Parent subsystem must have an identity with PKR.');
    }

    // Traverse all children and register them
    parentHierarchy.traverse((child) => {
      // Merge options with owner information from parent
      const wireOptions = {
        ...options,
      };
      
      // Wire the child subsystem with access control
      accessControl.wireSubsystem('child', child, wireOptions);
    });
  }
}

