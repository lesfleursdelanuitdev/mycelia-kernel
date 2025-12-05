/**
 * useSQLiteStorage Hook
 * 
 * Provides SQLite-based storage functionality to subsystems.
 * Uses SQLiteStorageBackend for persistent, file-based storage.
 * 
 * @param {Object} ctx - Context object containing config.storage for storage configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with storage methods
 */
import { SQLiteStorageBackend } from './sqlite-storage-backend.mycelia.js';
import { Facet } from '../../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../../create-hook.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';

export const useSQLiteStorage = createHook({
  kind: 'storage',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'storage',
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.storage || {};
    
    // Create SQLite storage backend
    const backend = new SQLiteStorageBackend({
      dbPath: config.dbPath || './data/storage.db',
      migrate: config.migrate !== false,
      walMode: config.walMode !== false,
      synchronous: config.synchronous || 'NORMAL',
      busyTimeout: config.busyTimeout || 5000,
      debug: getDebugFlag(config, ctx)
    });

    // Cleanup on subsystem disposal
    if (subsystem && typeof subsystem.onDispose === 'function') {
      const originalDispose = subsystem.onDispose.bind(subsystem);
      subsystem.onDispose = async () => {
        backend.close();
        await originalDispose();
      };
    }

    return new Facet('storage', { attach: true, source: import.meta.url, contract: 'storage' })
      .add({
        /**
         * Get a value by key
         * @param {string} key - Storage key
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, data?: any, error?: Error}>}
         */
        async get(key, options = {}) {
          return await backend.get(key, options);
        },

        /**
         * Set a value by key
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async set(key, value, options = {}) {
          return await backend.set(key, value, options);
        },

        /**
         * Delete a value by key
         * @param {string} key - Storage key
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async delete(key, options = {}) {
          return await backend.delete(key, options);
        },

        /**
         * Check if a key exists
         * @param {string} key - Storage key
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, exists: boolean, error?: Error}>}
         */
        async has(key, options = {}) {
          return await backend.has(key, options);
        },

        /**
         * Get multiple values by keys
         * @param {Array<string>} keys - Storage keys
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, data: Map<string, any>, errors?: Map<string, Error>}>}
         */
        async getMany(keys, options = {}) {
          return await backend.getMany(keys, options);
        },

        /**
         * Set multiple key-value pairs
         * @param {Array<{key: string, value: any}>} entries - Key-value pairs
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>}
         */
        async setMany(entries, options = {}) {
          return await backend.setMany(entries, options);
        },

        /**
         * Delete multiple keys
         * @param {Array<string>} keys - Storage keys
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>}
         */
        async deleteMany(keys, options = {}) {
          return await backend.deleteMany(keys, options);
        },

        /**
         * List all keys
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, keys: string[], error?: Error}>}
         */
        async list(options = {}) {
          return await backend.list(options);
        },

        /**
         * Query values by filter
         * @param {Object|Array} filter - Filter criteria
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, results: Array<{key: string, value: any, metadata?: Object}>, error?: Error}>}
         */
        async query(filter, options = {}) {
          return await backend.query(filter, options);
        },

        /**
         * Count entries
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, count: number, error?: Error}>}
         */
        async count(options = {}) {
          return await backend.count(options);
        },

        /**
         * Create a namespace
         * @param {string} name - Namespace name
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async createNamespace(name, options = {}) {
          return await backend.createNamespace(name, options);
        },

        /**
         * Delete a namespace
         * @param {string} name - Namespace name
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async deleteNamespace(name, options = {}) {
          return await backend.deleteNamespace(name, options);
        },

        /**
         * List all namespaces
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, namespaces: string[], error?: Error}>}
         */
        async listNamespaces(options = {}) {
          return await backend.listNamespaces(options);
        },

        /**
         * Get metadata for a key
         * @param {string} key - Storage key
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, metadata?: Object, error?: Error}>}
         */
        async getMetadata(key, options = {}) {
          return await backend.getMetadata(key, options);
        },

        /**
         * Set metadata for a key
         * @param {string} key - Storage key
         * @param {Object} metadata - Metadata to set
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async setMetadata(key, metadata, options = {}) {
          return await backend.setMetadata(key, metadata, options);
        },

        /**
         * Clear all data (or data in namespace)
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async clear(options = {}) {
          return await backend.clear(options);
        },

        /**
         * Get storage status
         * @param {Object} [options={}] - Options
         * @returns {Promise<{success: boolean, status: {healthy: boolean, size?: number, capacity?: number, namespaces?: number}, error?: Error}>}
         */
        async getStatus(options = {}) {
          return await backend.getStatus(options);
        },

        // Required properties
        _storageBackend: backend,
        _config: config,

        // Optional properties
        supportsTransactions: true,
        supportsQuery: true,
        supportsMetadata: true
      });
  }
});



