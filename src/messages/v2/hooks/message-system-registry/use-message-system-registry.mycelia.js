/**
 * useMessageSystemRegistry Hook
 * 
 * Provides subsystem registry functionality to subsystems using MessageSystemRegistry.
 * Manages subsystem instances by name with special handling for kernel subsystem.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.config?.messageSystemRegistry - Registry configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with registry methods
 */
import { MessageSystemRegistry } from '../../models/message-system/message-system-registry.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useMessageSystemRegistry = createHook({
  kind: 'messageSystemRegistry',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, _subsystem) => {
    const { name } = api;
    const config = ctx.config?.messageSystemRegistry || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useMessageSystemRegistry ${name}`);
    
    // Reserved names that cannot be used for subsystem registration
    const reservedNames = new Set(['kernel', 'query', 'channel', 'request', 'event']);
    
    // Create MessageSystemRegistry instance
    const registry = new MessageSystemRegistry();
    
    if (debug) {
      logger.log('Initialized MessageSystemRegistry');
    }
    
    return new Facet('messageSystemRegistry', { attach: true, source: import.meta.url })
      .add({
        /**
         * Find a subsystem by name
         * Does not return kernel subsystem (kernel is hidden from find operations)
         * @param {string} name - Subsystem name
         * @returns {BaseSubsystem|undefined} Subsystem instance or undefined if not found
         * 
         * @example
         * const subsystem = subsystem.messageSystemRegistry.find('canvas');
         */
        find(subsystemName) {
          return registry.find(subsystemName);
        },

        /**
         * Get a subsystem by name
         * Does not return kernel subsystem (kernel is hidden from get operations)
         * @param {string} name - Subsystem name
         * @returns {BaseSubsystem|undefined} Subsystem instance or undefined if not found
         * 
         * @example
         * const subsystem = subsystem.messageSystemRegistry.get('canvas');
         */
        get(subsystemName) {
          return registry.get(subsystemName);
        },

        /**
         * Get all subsystem names (excluding kernel)
         * @returns {string[]} Array of subsystem names
         * 
         * @example
         * const names = subsystem.messageSystemRegistry.getNames();
         * console.log('Registered subsystems:', names);
         */
        getNames() {
          return registry.getNames();
        },

        /**
         * Set a subsystem in the registry
         * Kernel can only be set if it doesn't already exist
         * @param {string} name - Subsystem name
         * @param {BaseSubsystem} subsystem - Subsystem instance
         * @returns {boolean} True if successfully set, false if kernel already exists
         * @throws {Error} If name is invalid, subsystem is missing, or name is reserved
         * 
         * @example
         * const success = subsystem.messageSystemRegistry.set('canvas', canvasSubsystem);
         */
        set(subsystemName, subsystemInstance) {
          // Check for reserved names
          if (reservedNames.has(subsystemName)) {
            const error = new Error(`useMessageSystemRegistry ${name}: Cannot register subsystem with reserved name '${subsystemName}'. Reserved names: ${Array.from(reservedNames).join(', ')}`);
            logger.error(error.message);
            throw error;
          }

          const result = registry.set(subsystemName, subsystemInstance);
          if (debug) {
            if (result) {
              logger.log(`Registered subsystem '${subsystemName}'`);
            } else {
              logger.warn(`Failed to register subsystem '${subsystemName}' (kernel already exists)`);
            }
          }
          return result;
        },

        /**
         * Check if a subsystem exists in the registry
         * @param {string} name - Subsystem name
         * @returns {boolean} True if subsystem exists
         * 
         * @example
         * if (subsystem.messageSystemRegistry.has('canvas')) {
         *   console.log('Canvas subsystem is registered');
         * }
         */
        has(subsystemName) {
          return registry.has(subsystemName);
        },

        /**
         * Delete a subsystem from the registry
         * @param {string} name - Subsystem name
         * @returns {boolean} True if subsystem was deleted, false if not found
         * 
         * @example
         * const deleted = subsystem.messageSystemRegistry.delete('canvas');
         */
        delete(subsystemName) {
          const result = registry.delete(subsystemName);
          if (debug && result) {
            logger.log(`Deleted subsystem '${subsystemName}'`);
          }
          return result;
        },

        /**
         * Clear all subsystems from the registry
         * @returns {void}
         * 
         * @example
         * subsystem.messageSystemRegistry.clear();
         */
        clear() {
          registry.clear();
          if (debug) {
            logger.log('Cleared all subsystems from registry');
          }
        },

        /**
         * Get the number of subsystems in the registry (including kernel)
         * @returns {number} Number of subsystems
         * 
         * @example
         * const count = subsystem.messageSystemRegistry.size;
         */
        get size() {
          return registry.size;
        },

        /**
         * Get all subsystems as an array (including kernel)
         * @returns {BaseSubsystem[]} Array of subsystem instances
         * 
         * @example
         * const allSubsystems = subsystem.messageSystemRegistry.values();
         */
        values() {
          return registry.values();
        },

        /**
         * Get all subsystem names as an array (including kernel)
         * @returns {string[]} Array of subsystem names
         * 
         * @example
         * const allNames = subsystem.messageSystemRegistry.keys();
         */
        keys() {
          return registry.keys();
        },

        /**
         * Get iterator for all subsystems (including kernel)
         * Allows use in for...of loops
         * @returns {Iterator<[string, BaseSubsystem]>} Iterator of [name, subsystem] pairs
         * 
         * @example
         * for (const [name, subsystem] of subsystem.messageSystemRegistry) {
         *   console.log(`Subsystem: ${name}`);
         * }
         */
        [Symbol.iterator]() {
          return registry[Symbol.iterator]();
        },

        // Expose registry instance for internal use (if needed by other hooks)
        _registry: registry
      });
  }
});

