import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { useProfiles } from '../../../hooks/profiles/use-profiles.mycelia.js';

/**
 * ProfileRegistrySubsystem
 * 
 * Kernel child subsystem responsible for managing security profiles.
 * It installs `useProfiles` for managing SecurityProfile instances and
 * `usePrincipals` for accessing the principal registry.
 */
export class ProfileRegistrySubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (should be 'profile-registry')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {Object} [options.config.profiles={}] - Profiles configuration
   * @param {Object} [options.config.profiles.kernel] - Kernel instance (required for useProfiles)
   * @param {Object} [options.config.principals={}] - Principals configuration
   * @param {Object} [options.config.principals.kernel] - Kernel instance (required for usePrincipals)
   */
  constructor(name = 'profile-registry', options = {}) {
    super(name, options);

    // Install principals facet (required by useProfiles)
   // this.use(usePrincipals);

    // Install profiles facet
    this.use(useProfiles);
  }

  /**
   * Get the profiles facet
   * @returns {Object|undefined} Profiles facet or undefined if not found
   */
  getProfiles() {
    return this.find('profiles');
  }

  /**
   * Create a new security profile
   * @param {string} name - Profile name
   * @param {Object|Map<string, 'r'|'rw'|'rwg'>} grants - Grants mapping permission scopes to permission levels
   * @param {Object} [metadata={}] - Optional metadata
   * @returns {SecurityProfile} Created profile
   */
  createProfile(name, grants = {}, metadata = {}) {
    const profiles = this.getProfiles();
    if (!profiles) {
      throw new Error('ProfileRegistrySubsystem.createProfile: profiles facet not found. Ensure useProfiles hook is used.');
    }
    return profiles.createProfile(name, grants, metadata);
  }

  /**
   * Get a profile by name
   * @param {string} name - Profile name
   * @returns {SecurityProfile|undefined} Profile or undefined if not found
   */
  getProfile(name) {
    const profiles = this.getProfiles();
    if (!profiles) {
      return undefined;
    }
    return profiles.getProfile(name);
  }

  /**
   * Apply a profile to a principal
   * @param {string} profileName - Profile name
   * @param {PKR} principalPkr - Principal's Public Key Record
   * @returns {Object} Result object with success status and details
   */
  applyProfileToPrincipal(profileName, principalPkr) {
    const profiles = this.getProfiles();
    if (!profiles) {
      throw new Error('ProfileRegistrySubsystem.applyProfileToPrincipal: profiles facet not found. Ensure useProfiles hook is used.');
    }
    return profiles.applyProfileToPrincipal(profileName, principalPkr);
  }

  /**
   * Remove a profile's permissions from a principal
   * @param {string} profileName - Profile name
   * @param {PKR} principalPkr - Principal's Public Key Record
   * @returns {Object} Result object with success status and details
   */
  removeProfileFromPrincipal(profileName, principalPkr) {
    const profiles = this.getProfiles();
    if (!profiles) {
      throw new Error('ProfileRegistrySubsystem.removeProfileFromPrincipal: profiles facet not found. Ensure useProfiles hook is used.');
    }
    return profiles.removeProfileFromPrincipal(profileName, principalPkr);
  }

  /**
   * List all profile names
   * @returns {string[]} Array of profile names
   */
  listProfiles() {
    const profiles = this.getProfiles();
    if (!profiles) {
      return [];
    }
    return profiles.listProfiles();
  }
}

