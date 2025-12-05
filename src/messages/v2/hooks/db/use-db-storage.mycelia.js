/**
 * useDBStorage Hook
 * 
 * Provides database storage functionality by wrapping the appropriate storage backend.
 * Automatically selects the best storage backend based on environment and configuration.
 * 
 * @param {Object} ctx - Context object containing config.storage for storage configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with storage methods
 */
import { selectStorageBackend } from './db-storage-selector.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';

export const useDBStorage = createHook({
  kind: 'storage',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'storage',
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.storage || {};
    
    // Select the appropriate storage backend hook
    const storageHook = selectStorageBackend(config, ctx);
    
    // Execute the selected storage hook to get the storage facet
    const storageFacet = storageHook(ctx, api, subsystem);
    
    // Return the storage facet (it will be attached automatically)
    return storageFacet;
  }
});



