/**
 * KernelChildAccessors
 * 
 * Utility functions for accessing child subsystems from the kernel.
 * Provides getter methods for access-control, error-manager, response-manager, and channel-manager.
 * 
 * @example
 * const accessors = new KernelChildAccessors(kernelSubsystem);
 * const accessControl = accessors.getAccessControl();
 */
export class KernelChildAccessors {
  /**
   * Create a new KernelChildAccessors instance
   * 
   * @param {KernelSubsystem} kernel - The kernel subsystem instance
   */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /**
   * Get the access control subsystem reference.
   * 
   * @returns {AccessControlSubsystem|null} Access control subsystem instance or null
   */
  getAccessControl() {
    const hierarchy = this.kernel.find('hierarchy');
    if (!hierarchy) {
      return null;
    }
    return hierarchy.getChild('access-control') || null;
  }

  /**
   * Get the error manager subsystem reference.
   * 
   * @returns {ErrorManagerSubsystem|null} Error manager subsystem instance or null
   */
  getErrorManager() {
    const hierarchy = this.kernel.find('hierarchy');
    if (!hierarchy) {
      return null;
    }
    return hierarchy.getChild('error-manager') || null;
  }

  /**
   * Get the response manager subsystem reference.
   * 
   * @returns {ResponseManagerSubsystem|null} Response manager subsystem instance or null
   */
  getResponseManager() {
    const hierarchy = this.kernel.find('hierarchy');
    if (!hierarchy) {
      return null;
    }
    return hierarchy.getChild('response-manager') || null;
  }

  /**
   * Get the channel manager subsystem reference.
   * 
   * @returns {ChannelManagerSubsystem|null} Channel manager subsystem instance or null
   */
  getChannelManager() {
    const hierarchy = this.kernel.find('hierarchy');
    if (!hierarchy) {
      return null;
    }
    return hierarchy.getChild('channel-manager') || null;
  }

  /**
   * Get the profile registry subsystem reference.
   * 
   * @returns {ProfileRegistrySubsystem|null} Profile registry subsystem instance or null
   */
  getProfileRegistry() {
    const hierarchy = this.kernel.find('hierarchy');
    if (!hierarchy) {
      return null;
    }
    return hierarchy.getChild('profile-registry') || null;
  }
}


