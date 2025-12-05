/**
 * DB Storage Backend Selector
 * 
 * Utility to select the appropriate storage backend based on environment and configuration.
 */

import { useSQLiteStorage } from '../storage/sqlite/use-sqlite-storage.mycelia.js';
import { useIndexedDBStorage } from '../storage/indexeddb/use-indexeddb-storage.mycelia.js';
import { useMemoryStorage } from '../storage/memory/use-memory-storage.mycelia.js';
import { usePrismaStorage } from '../storage/prisma/use-prisma-storage.mycelia.js';

/**
 * Check if running in Node.js environment
 * @returns {boolean} True if Node.js
 */
function isNodeJS() {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
}

/**
 * Check if running in browser environment
 * @returns {boolean} True if browser
 */
function isBrowser() {
  return typeof window !== 'undefined' && 
         typeof indexedDB !== 'undefined';
}

/**
 * Select the appropriate storage backend hook
 * 
 * @param {Object} config - Storage configuration
 * @param {string} [config.backend] - Explicit backend selection: 'sqlite', 'indexeddb', 'memory', 'prisma', or 'auto'
 * @param {Object} ctx - Context object
 * @returns {Function} Storage hook function
 */
export function selectStorageBackend(config = {}, ctx = {}) {
  const backend = config.backend || 'auto';

  // Explicit backend selection
  if (backend === 'sqlite') {
    if (!isNodeJS()) {
      throw new Error('SQLite storage backend requires Node.js environment');
    }
    return useSQLiteStorage;
  }

  if (backend === 'indexeddb') {
    if (!isBrowser()) {
      throw new Error('IndexedDB storage backend requires browser environment');
    }
    return useIndexedDBStorage;
  }

  if (backend === 'memory') {
    return useMemoryStorage;
  }

  if (backend === 'prisma') {
    if (!isNodeJS()) {
      throw new Error('Prisma storage backend requires Node.js environment');
    }
    // Check if Prisma is available in context or config
    if (!ctx.prisma && !config.prisma?.client && !process.env.DATABASE_URL) {
      throw new Error('Prisma storage backend requires Prisma Client. Provide ctx.prisma, config.prisma.client, or DATABASE_URL environment variable.');
    }
    return usePrismaStorage;
  }

  // Auto-detect based on environment
  if (backend === 'auto' || !backend) {
    // Check if Prisma is available (preferred for production)
    if (isNodeJS() && (ctx.prisma || config.prisma?.client || process.env.DATABASE_URL)) {
      return usePrismaStorage;
    }
    if (isNodeJS()) {
      return useSQLiteStorage;
    }
    if (isBrowser()) {
      return useIndexedDBStorage;
    }
    // Fallback to memory
    return useMemoryStorage;
  }

  // Invalid backend specified
  throw new Error(`Invalid storage backend: "${backend}". Must be 'sqlite', 'indexeddb', 'memory', 'prisma', or 'auto'`);
}



