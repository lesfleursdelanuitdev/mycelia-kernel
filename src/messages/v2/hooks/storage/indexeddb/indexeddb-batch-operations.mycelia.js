/**
 * IndexedDB Batch Operations
 * 
 * Handles batch operations (getMany, setMany, deleteMany) with transaction support.
 */

import { put, deleteKey, get } from './indexeddb-utils.mycelia.js';
import { waitForTransaction } from './indexeddb-utils.mycelia.js';

export class IndexedDBBatchOperations {
  #backend;

  /**
   * Create a new IndexedDBBatchOperations instance
   * 
   * @param {Object} backend - IndexedDBStorageBackend instance
   */
  constructor(backend) {
    this.#backend = backend;
  }

  /**
   * Get multiple values by keys
   * 
   * @param {Array<string>} keys - Storage keys
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {Function} getSingle - Function to get a single value
   * @returns {Promise<{success: boolean, data: Map<string, any>, errors?: Map<string, Error>}>}
   */
  async getMany(keys, options, getSingle) {
    const results = new Map();
    const errors = new Map();

    for (const key of keys) {
      const result = await getSingle(key, options);
      if (result.success) {
        results.set(key, result.data);
      } else {
        errors.set(key, result.error);
      }
    }

    return {
      success: errors.size === 0,
      data: results,
      ...(errors.size > 0 && { errors })
    };
  }

  /**
   * Set multiple key-value pairs
   * 
   * @param {Array<{key: string, value: any, options?: Object}>} entries - Key-value pairs
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>}
   */
  async setMany(entries, options = {}) {
    const results = new Map();
    const errors = [];

    try {
      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_entries'], 'readwrite');
      const store = transaction.objectStore('storage_entries');
      const namespace = options.namespace || 'default';
      const now = Date.now();

      for (const entry of entries) {
        try {
          const entryNamespace = entry.options?.namespace || namespace;
          const metadata = entry.options?.metadata || options.metadata || {};
          const compositeKey = [entryNamespace, entry.key];
          
          const value = {
            namespace: entryNamespace,
            key: entry.key,
            value: entry.value,
            metadata,
            createdAt: now,
            updatedAt: now
          };

          await put(store, value, compositeKey);
          results.set(entry.key, { success: true });
        } catch (error) {
          errors.push(error);
          results.set(entry.key, { success: false, error });
        }
      }

      // Wait for transaction to complete
      await waitForTransaction(transaction);

      return {
        success: errors.length === 0,
        results,
        ...(errors.length > 0 && { errors })
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: [error, ...errors]
      };
    }
  }

  /**
   * Delete multiple keys
   * 
   * @param {Array<string>} keys - Storage keys
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>}
   */
  async deleteMany(keys, options = {}) {
    const results = new Map();
    const errors = [];

    try {
      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_entries'], 'readwrite');
      const store = transaction.objectStore('storage_entries');
      const namespace = options.namespace || 'default';

      for (const key of keys) {
        try {
          const compositeKey = [namespace, key];
          await deleteKey(store, compositeKey);
          results.set(key, { success: true });
        } catch (error) {
          errors.push(error);
          results.set(key, { success: false, error });
        }
      }

      // Wait for transaction to complete
      await waitForTransaction(transaction);

      return {
        success: errors.length === 0,
        results,
        ...(errors.length > 0 && { errors })
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: [error, ...errors]
      };
    }
  }
}



