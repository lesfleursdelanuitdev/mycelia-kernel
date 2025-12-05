/**
 * IndexedDB Namespace Manager
 * 
 * Handles namespace operations (create, delete, list).
 */

import { get, put, deleteKey, getAllKeys } from './indexeddb-utils.mycelia.js';
import { waitForTransaction } from './indexeddb-utils.mycelia.js';

export class IndexedDBNamespaceManager {
  #backend;

  /**
   * Create a new IndexedDBNamespaceManager
   * 
   * @param {Object} backend - IndexedDBStorageBackend instance
   */
  constructor(backend) {
    this.#backend = backend;
  }

  /**
   * Create a namespace
   * 
   * @param {string} name - Namespace name
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async createNamespace(name, options = {}) {
    try {
      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_namespaces'], 'readwrite');
      const store = transaction.objectStore('storage_namespaces');
      
      // Check if exists
      const existing = await get(store, name);
      if (existing) {
        return { success: false, error: new Error(`Namespace "${name}" already exists`) };
      }

      const metadata = options.metadata || {};
      await put(store, {
        name,
        metadata,
        createdAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete a namespace
   * 
   * @param {string} name - Namespace name
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.recursive=false] - Delete all keys in namespace
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async deleteNamespace(name, options = {}) {
    try {
      if (name === 'default') {
        return { success: false, error: new Error('Cannot delete default namespace') };
      }

      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_namespaces'], 'readwrite');
      const nsStore = transaction.objectStore('storage_namespaces');
      const existing = await get(nsStore, name);
      
      if (!existing) {
        return { success: false, error: new Error(`Namespace "${name}" does not exist`) };
      }

      // Delete all entries in namespace if recursive
      if (options.recursive) {
        await this.#deleteNamespaceEntries(name);
      }

      // Delete namespace
      await deleteKey(nsStore, name);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete all entries in a namespace
   * @private
   */
  async #deleteNamespaceEntries(namespace) {
    const db = await this.#backend._getDatabase();
    const transaction = db.transaction(['storage_entries'], 'readwrite');
    const store = transaction.objectStore('storage_entries');
    const index = store.index('namespace');
    const range = IDBKeyRange.only(namespace);

    // Delete all entries in namespace
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

  /**
   * List all namespaces
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, namespaces: string[], error?: Error}>}
   */
  async listNamespaces(options = {}) {
    try {
      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_namespaces'], 'readonly');
      const store = transaction.objectStore('storage_namespaces');
      const keys = await getAllKeys(store);
      const namespaces = keys.map(k => String(k));
      return { success: true, namespaces };
    } catch (error) {
      return { success: false, namespaces: [], error };
    }
  }
}

