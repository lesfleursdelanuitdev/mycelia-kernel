/**
 * IndexedDB Transaction Manager
 * 
 * Manages IndexedDB transactions and provides transaction lifecycle methods.
 */

import { waitForTransaction } from './indexeddb-utils.mycelia.js';

export class IndexedDBTransactionManager {
  #backend;
  #activeTransactions;

  /**
   * Create a new IndexedDBTransactionManager
   * 
   * @param {Object} backend - IndexedDBStorageBackend instance
   */
  constructor(backend) {
    this.#backend = backend;
    this.#activeTransactions = new Map();
  }

  /**
   * Begin a transaction
   * 
   * @param {Object} [options={}] - Options
   * @param {Array<string>} [options.stores] - Object store names
   * @param {string} [options.mode='readwrite'] - Transaction mode
   * @returns {Promise<{success: boolean, transactionId?: string, error?: Error}>}
   */
  async beginTransaction(options = {}) {
    try {
      const db = await this.#backend._getDatabase();
      const storeNames = options.stores || ['storage_entries', 'storage_namespaces'];
      const mode = options.mode || 'readwrite';
      
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = db.transaction(storeNames, mode);
      
      this.#activeTransactions.set(transactionId, transaction);
      return { success: true, transactionId };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Commit a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async commit(transactionId, options = {}) {
    try {
      const transaction = this.#activeTransactions.get(transactionId);
      if (!transaction) {
        return { success: false, error: new Error('Invalid transaction ID') };
      }

      // IndexedDB transactions auto-commit when all requests complete
      // We just wait for completion
      await waitForTransaction(transaction);
      this.#activeTransactions.delete(transactionId);
      return { success: true };
    } catch (error) {
      this.#activeTransactions.delete(transactionId);
      return { success: false, error };
    }
  }

  /**
   * Rollback a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async rollback(transactionId, options = {}) {
    try {
      const transaction = this.#activeTransactions.get(transactionId);
      if (!transaction) {
        return { success: false, error: new Error('Invalid transaction ID') };
      }

      transaction.abort();
      this.#activeTransactions.delete(transactionId);
      return { success: true };
    } catch (error) {
      this.#activeTransactions.delete(transactionId);
      return { success: false, error };
    }
  }

  /**
   * Get active transaction by ID
   * 
   * @param {string} transactionId - Transaction ID
   * @returns {IDBTransaction|null} Transaction instance or null
   */
  getTransaction(transactionId) {
    return this.#activeTransactions.get(transactionId) || null;
  }

  /**
   * Check if transaction exists
   * 
   * @param {string} transactionId - Transaction ID
   * @returns {boolean} True if transaction exists
   */
  hasTransaction(transactionId) {
    return this.#activeTransactions.has(transactionId);
  }

  /**
   * Clear all active transactions
   */
  clearAll() {
    this.#activeTransactions.clear();
  }
}

