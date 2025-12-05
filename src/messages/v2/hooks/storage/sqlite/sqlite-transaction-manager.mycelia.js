/**
 * SQLite Transaction Manager
 * 
 * Manages SQLite transactions with transaction ID tracking.
 */

export class SQLiteTransactionManager {
  #db;
  #activeTransactions;

  /**
   * Create a new SQLiteTransactionManager
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   */
  constructor(db) {
    this.#db = db;
    this.#activeTransactions = new Map();
  }

  /**
   * Begin a transaction
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, transactionId?: string, error?: Error}>}
   */
  async beginTransaction(options = {}) {
    try {
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.#db.exec('BEGIN TRANSACTION');
      this.#activeTransactions.set(transactionId, true);
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
      if (!this.#activeTransactions.has(transactionId)) {
        return { success: false, error: new Error('Invalid transaction ID') };
      }

      this.#db.exec('COMMIT');
      this.#activeTransactions.delete(transactionId);
      return { success: true };
    } catch (error) {
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
      if (!this.#activeTransactions.has(transactionId)) {
        return { success: false, error: new Error('Invalid transaction ID') };
      }

      this.#db.exec('ROLLBACK');
      this.#activeTransactions.delete(transactionId);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Check if a transaction is active
   * 
   * @param {string} transactionId - Transaction ID
   * @returns {boolean} True if transaction is active
   */
  isActive(transactionId) {
    return this.#activeTransactions.has(transactionId);
  }

  /**
   * Create a transaction wrapper for batch operations
   * 
   * @param {Function} fn - Function to execute within transaction
   * @returns {Function} Transaction-wrapped function
   */
  transaction(fn) {
    return this.#db.transaction(fn);
  }
}

