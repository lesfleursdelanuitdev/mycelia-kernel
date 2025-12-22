/**
 * usePrincipals Hook
 * 
 * Provides principal registry functionality to subsystems.
 * Wraps PrincipalRegistry and exposes principal management methods.
 * 
 * @param {Object} ctx - Context object containing config.principals.kernel
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with principal management methods
 */
import { PrincipalRegistry } from '../../models/security/principal-registry.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';

export const usePrincipals = createHook({
  kind: 'principals',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: false,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, _api, _subsystem) => {
    const config = ctx.config?.principals || {};
    const kernel = config.kernel;

    if (!kernel) {
      throw new Error('usePrincipals: ctx.config.principals.kernel is required');
    }

    // Create PrincipalRegistry instance with kernel
    const registry = new PrincipalRegistry({ kernel });

    return new Facet('principals', { attach: false, source: import.meta.url })
      .add({
        /**
         * Mint a keypair for a principal kind
         * @param {string} [kind='resource'] - Principal kind
         * @returns {Object} Object with publicKey and optionally privateKey
         */
        mint(kind = 'resource') {
          return registry.mint(kind);
        },

        /**
         * Create and register a principal
         * @param {string} [kind='topLevel'] - Principal kind
         * @param {Object} [opts={}] - Principal options
         * @returns {PKR} Public Key Record of the created principal
         */
        createPrincipal(kind = 'topLevel', opts = {}) {
          return registry.createPrincipal(kind, opts);
        },

        /**
         * Resolve a PKR to its private key
         * @param {PKR} pkr - Public Key Record
         * @returns {symbol|undefined} Private key or undefined if not found
         */
        resolvePKR(pkr) {
          return registry.resolvePKR(pkr);
        },

        /**
         * Create a ReaderWriterSet for an owner PKR
         * @param {PKR} ownerPkr - Owner's Public Key Record
         * @returns {ReaderWriterSet} Access control set
         */
        createRWS(ownerPkr) {
          return registry.createRWS(ownerPkr);
        },

        /**
         * Create a full identity wrapper for an owner PKR
         * @param {PKR} ownerPkr - Owner's Public Key Record
         * @returns {Object} Identity object with permission methods
         */
        createIdentity(ownerPkr) {
          return registry.createIdentity(ownerPkr);
        },

        /**
         * Create a friend-specific identity wrapper
         * @param {PKR} friendPkr - Friend's Public Key Record
         * @returns {Object} Identity object with permission methods
         */
        createFriendIdentity(friendPkr) {
          return registry.createFriendIdentity(friendPkr);
        },

        /**
         * Check if a PKR belongs to the kernel
         * @param {PKR} pkr - Public Key Record
         * @returns {boolean} True if PKR belongs to kernel
         */
        isKernel(pkr) {
          return registry.isKernel(pkr);
        },

        /**
         * Get a principal by UUID
         * @param {string} uuid - Principal UUID
         * @returns {Principal|undefined} Principal or undefined if not found
         */
        get(uuid) {
          return registry.get(uuid);
        },

        /**
         * Check if a principal exists by UUID, name, or key
         * @param {string|symbol} id - UUID, name, or key
         * @returns {boolean} True if principal exists
         */
        has(id) {
          return registry.has(id);
        },

        /**
         * Refresh a principal's PKR (rotate keys on expiration)
         * @param {Principal|symbol} principalOrPublicKey - Principal instance or public key
         * @returns {PKR} New Public Key Record
         */
        refreshPrincipal(principalOrPublicKey) {
          return registry.refreshPrincipal(principalOrPublicKey);
        },

        /**
         * Get the role for a principal by PKR
         * @param {PKR} pkr - Principal's Public Key Record
         * @returns {string|null} Role name or null if not set
         */
        getRoleForPKR(pkr) {
          return registry.getRoleForPKR(pkr);
        },

        /**
         * Set the role for a principal by PKR
         * @param {PKR} pkr - Principal's Public Key Record
         * @param {string} role - Role name
         * @returns {boolean} True if role was set successfully
         */
        setRoleForPKR(pkr, role) {
          return registry.setRoleForPKR(pkr, role);
        },

        /**
         * Expose registry property for direct access
         */
        get registry() {
          return registry;
        }
      });
  }
});

