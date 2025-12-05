/**
 * IndexedDB Clear Manager
 * 
 * Handles clearing operations (clear all or clear namespace).
 */

import { clear, waitForTransaction } from './indexeddb-utils.mycelia.js';

export class IndexedDBClearManager {
  #backend;

  /**
   * Create a new IndexedDBClearManager
   * 
   * @param {Object} backend - IndexedDBStorageBackend instance
   */
  constructor(backend) {
    this.#backend = backend;
  }

  /**
   * Clear all data (or data in namespace)
   * 
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace] - Namespace to clear (clears all if not specified)
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async clear(options = {}) {
    try {
      if (options.namespace) {
        // Clear specific namespace
        await this.#clearNamespace(options.namespace);
      } else {
        // Clear all entries
        const db = await this.#backend._getDatabase();
        const transaction = db.transaction(['storage_entries'], 'readwrite');
        const store = transaction.objectStore('storage_entries');
        await clear(store);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Clear all entries in a namespace
   * @private
   */
  async #clearNamespace(namespace) {
    const db = await this.#backend._getDatabase();
    const transaction = db.transaction(['storage_entries'], 'readwrite');
    const store = transaction.objectStore('storage_entries');
    const index = store.index('namespace');
    const range = IDBKeyRange.only(namespace);

    await new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });

    await waitForTransaction(transaction);
  }
}

