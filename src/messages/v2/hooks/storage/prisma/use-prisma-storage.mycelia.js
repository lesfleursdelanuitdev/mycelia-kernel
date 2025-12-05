/**
 * usePrismaStorage Hook
 * 
 * Provides Prisma-based storage functionality to subsystems.
 * Uses PrismaStorageBackend for persistent, database-backed storage with Prisma ORM.
 * 
 * @param {Object} ctx - Context object containing config.storage for storage configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with storage methods
 */
import { PrismaStorageBackend } from './prisma-storage-backend.mycelia.js';
import { Facet } from '../../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../../create-hook.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';

export const usePrismaStorage = createHook({
  kind: 'storage',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'storage',
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.storage || {};
    const prismaConfig = config.prisma || {};
    
    // Get Prisma client from context or config
    let prisma = ctx.prisma || prismaConfig.client;
    
    // If Prisma not provided, try to import it
    if (!prisma) {
      try {
        // Dynamic import of Prisma Client
        // Note: This assumes @prisma/client is installed and schema is generated
        const { PrismaClient } = require('@prisma/client');
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: prismaConfig.databaseUrl || process.env.DATABASE_URL
            }
          },
          log: prismaConfig.log || ['error', 'warn']
        });
      } catch (error) {
        throw new Error(`usePrismaStorage: Prisma Client not available. Ensure @prisma/client is installed and Prisma schema is generated. Error: ${error.message}`);
      }
    }

    // Create Prisma storage backend
    const backend = new PrismaStorageBackend({
      prisma,
      modelName: prismaConfig.modelName || 'StorageEntry',
      debug: getDebugFlag(config, ctx)
    });

    // Cleanup on subsystem disposal
    if (subsystem && typeof subsystem.onDispose === 'function') {
      const originalDispose = subsystem.onDispose.bind(subsystem);
      subsystem.onDispose = async () => {
        await backend.close();
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

