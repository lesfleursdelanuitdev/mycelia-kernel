/**
 * useProfiles Hook
 * 
 * Provides profile registry functionality to subsystems.
 * Manages SecurityProfile instances and provides methods to create, retrieve,
 * update, and delete profiles, as well as apply profiles to principals.
 * 
 * @param {Object} ctx - Context object containing config.profiles
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with profile management methods
 */
import { SecurityProfile } from '../../models/security/security-profile.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';

export const useProfiles = createHook({
  kind: 'profiles',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: false,
  source: import.meta.url,
  fn: (ctx, _api, subsystem) => {
    const config = ctx.config?.profiles || {};

    // Get kernel for accessing kernel PKR (needed for granting permissions)
    const kernel = config.kernel || subsystem.getRoot?.();
    if (!kernel) {
      throw new Error('useProfiles: kernel is required. Provide config.profiles.kernel or ensure subsystem has access to root.');
    }

    // Get principals facet from AccessControlSubsystem (canonical registry for all principals)
    // This ensures we use the same PrincipalRegistry where all principals are registered
    const accessControl = kernel.getAccessControl?.();
    let principalsFacet = null;
    if (accessControl) {
      principalsFacet = accessControl.find('principals');
    }
    
    // Fallback to subsystem's own principals facet if AccessControlSubsystem not available
    if (!principalsFacet) {
      principalsFacet = subsystem.find('principals');
    }
    
    if (!principalsFacet) {
      throw new Error('useProfiles: principals facet is required but not found. Ensure usePrincipals hook is used or AccessControlSubsystem is available.');
    }

    // Profile storage: name -> SecurityProfile
    const profilesByName = new Map();
    const profilesByUuid = new Map();

    return new Facet('profiles', { attach: false, source: import.meta.url })
      .add({
        /**
         * Create a new security profile
         * @param {string} name - Profile name
         * @param {Object|Map<string, 'r'|'rw'|'rwg'>} grants - Grants mapping permission scopes to permission levels
         * @param {Object} [metadata={}] - Optional metadata
         * @returns {SecurityProfile} Created profile
         */
        createProfile(name, grants = {}, metadata = {}) {
          if (profilesByName.has(name)) {
            throw new Error(`Profile "${name}" already exists`);
          }

          const profile = new SecurityProfile(name, grants, metadata);
          profilesByName.set(name, profile);
          profilesByUuid.set(profile.getUuid(), profile);

          return profile;
        },

        /**
         * Get a profile by name
         * @param {string} name - Profile name
         * @returns {SecurityProfile|undefined} Profile or undefined if not found
         */
        getProfile(name) {
          return profilesByName.get(name);
        },

        /**
         * Get a profile by UUID
         * @param {string} uuid - Profile UUID
         * @returns {SecurityProfile|undefined} Profile or undefined if not found
         */
        getProfileByUuid(uuid) {
          return profilesByUuid.get(uuid);
        },

        /**
         * Check if a profile exists
         * @param {string} name - Profile name
         * @returns {boolean} True if profile exists
         */
        hasProfile(name) {
          return profilesByName.has(name);
        },

        /**
         * List all profile names
         * @returns {string[]} Array of profile names
         */
        listProfiles() {
          return Array.from(profilesByName.keys());
        },

        /**
         * Get all profiles
         * @returns {SecurityProfile[]} Array of all profiles
         */
        getAllProfiles() {
          return Array.from(profilesByName.values());
        },

        /**
         * Update a profile's grants (preserves UUID and timestamps)
         * @param {string} name - Profile name
         * @param {Object|Map<string, 'r'|'rw'|'rwg'>} grants - New grants to merge or replace
         * @param {boolean} [replace=false] - If true, replace all grants; if false, merge with existing
         * @returns {SecurityProfile} Updated profile (same instance, identity preserved)
         */
        updateProfile(name, grants, replace = false) {
          const profile = profilesByName.get(name);
          if (!profile) {
            throw new Error(`Profile "${name}" not found`);
          }

          // Update grants in-place to preserve UUID and timestamps
          profile.updateGrants(grants, replace);
          
          return profile;
        },

        /**
         * Delete a profile
         * @param {string} name - Profile name
         * @returns {boolean} True if profile was deleted, false if it didn't exist
         */
        deleteProfile(name) {
          const profile = profilesByName.get(name);
          if (!profile) {
            return false;
          }

          profilesByName.delete(name);
          profilesByUuid.delete(profile.getUuid());
          return true;
        },

        /**
         * Apply a profile to a principal by granting all profile permissions to the principal's RWS.
         * 
         * Note: This applies permissions to the principal's ReaderWriterSet (RWS), which is per-principal,
         * not per-resource. The permission scopes in the profile are used for organizational purposes
         * but all grants are applied to the same RWS. The principal will have the union of all permissions
         * specified in the profile's grants.
         * 
         * @param {string} profileName - Profile name
         * @param {PKR} principalPkr - Principal's Public Key Record
         * @returns {Object} Result object with success status and details
         */
        applyProfileToPrincipal(profileName, principalPkr) {
          const profile = profilesByName.get(profileName);
          if (!profile) {
            throw new Error(`Profile "${profileName}" not found`);
          }

          if (!principalPkr || typeof principalPkr.publicKey !== 'symbol') {
            throw new Error('applyProfileToPrincipal: invalid principalPkr');
          }

          // Get kernel PKR (needed as granter)
          const kernelPkr = kernel.identity?.pkr;
          if (!kernelPkr) {
            throw new Error('applyProfileToPrincipal: kernel must have an identity with a PKR');
          }

          // Get or create RWS for the principal (RWS is per-principal, not per-resource)
          const rws = principalsFacet.createRWS(principalPkr);

          // Apply each grant from the profile
          // Note: All grants are applied to the same RWS, regardless of scope name
          const grants = profile.getGrants();
          const results = {
            success: true,
            applied: 0,
            failed: 0,
            errors: []
          };

          // Track which permission levels we've successfully applied to avoid duplicates
          const appliedPermissions = new Set();

          for (const [scope, permission] of grants) {
            try {
              // Skip if we've already applied this permission level (RWS doesn't need duplicates)
              const permissionKey = permission;
              if (appliedPermissions.has(permissionKey)) {
                results.applied++;
                continue;
              }

              let success = false;
              if (permission === 'r') {
                success = rws.addReader(kernelPkr, principalPkr);
              } else if (permission === 'rw') {
                success = rws.addWriter(kernelPkr, principalPkr);
              } else if (permission === 'rwg') {
                // For 'rwg', add as writer (which includes read)
                // Note: Grant capability (canGrant) in RWS is only available to owners and kernel
                // So 'rwg' effectively grants read/write, but not the ability to grant to others
                // This is a limitation of the RWS model - grant capability cannot be delegated
                success = rws.addWriter(kernelPkr, principalPkr);
                if (success) {
                  results.errors.push(`Note: 'rwg' permission scope "${scope}" grants read/write only. Grant capability requires ownership, which cannot be delegated via RWS.`);
                }
              }

              if (success) {
                appliedPermissions.add(permissionKey);
                results.applied++;
              } else {
                results.failed++;
                results.errors.push(`Failed to apply permission "${permission}" for scope "${scope}"`);
              }
            } catch (error) {
              results.failed++;
              results.errors.push(`Error applying permission "${permission}" for scope "${scope}": ${error.message}`);
            }
          }

          if (results.failed > 0) {
            results.success = false;
          }

          return results;
        },

        /**
         * Remove a profile's permissions from a principal
         * @param {string} profileName - Profile name
         * @param {PKR} principalPkr - Principal's Public Key Record
         * @returns {Object} Result object with success status and details
         */
        removeProfileFromPrincipal(profileName, principalPkr) {
          const profile = profilesByName.get(profileName);
          if (!profile) {
            throw new Error(`Profile "${profileName}" not found`);
          }

          if (!principalPkr || typeof principalPkr.publicKey !== 'symbol') {
            throw new Error('removeProfileFromPrincipal: invalid principalPkr');
          }

          // Get kernel PKR (needed as granter)
          const kernelPkr = kernel.identity?.pkr;
          if (!kernelPkr) {
            throw new Error('removeProfileFromPrincipal: kernel must have an identity with a PKR');
          }

          // Get RWS for the principal
          const rws = principalsFacet.createRWS(principalPkr);

          // Remove each grant from the profile
          const grants = profile.getGrants();
          const results = {
            success: true,
            removed: 0,
            failed: 0,
            errors: []
          };

          for (const [scope, permission] of grants) {
            try {
              let success = false;
              if (permission === 'r' || permission === 'rw' || permission === 'rwg') {
                // Remove writer first (which also removes reader if present)
                // Note: RWS removal is not granular per-scope since RWS is per-principal
                // All permissions from the profile are removed together
                success = rws.removeWriter(kernelPkr, principalPkr);
                if (permission === 'r') {
                  // For read-only, we need to remove reader specifically
                  // But if we removed writer, reader might already be gone
                  // This is a limitation - RWS doesn't have granular removal per-scope
                  // For now, we'll just remove writer
                }
              }

              if (success) {
                results.removed++;
              } else {
                results.failed++;
                results.errors.push(`Failed to remove permission "${permission}" for scope "${scope}"`);
              }
            } catch (error) {
              results.failed++;
              results.errors.push(`Error removing permission "${permission}" for scope "${scope}": ${error.message}`);
            }
          }

          if (results.failed > 0) {
            results.success = false;
          }

          return results;
        }
      });
  }
});

