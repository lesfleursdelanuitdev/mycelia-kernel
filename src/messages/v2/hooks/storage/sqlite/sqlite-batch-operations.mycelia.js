/**
 * SQLite Batch Operations
 * 
 * Handles batch operations (getMany, setMany, deleteMany) with transaction support.
 */

export class SQLiteBatchOperations {
  #db;
  #statements;
  #transactionManager;

  /**
   * Create a new SQLiteBatchOperations instance
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   * @param {SQLitePreparedStatements} statements - Prepared statements
   * @param {SQLiteTransactionManager} transactionManager - Transaction manager
   */
  constructor(db, statements, transactionManager) {
    this.#db = db;
    this.#statements = statements;
    this.#transactionManager = transactionManager;
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

    // Use transaction for batch operations
    const transaction = this.#transactionManager.transaction(() => {
      const namespace = options.namespace || 'default';
      const now = Date.now();
      const stmt = this.#statements.get('set');

      for (const entry of entries) {
        try {
          const entryNamespace = entry.options?.namespace || namespace;
          const metadata = entry.options?.metadata || options.metadata || {};
          const valueJson = JSON.stringify(entry.value);
          const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

          stmt.run(entryNamespace, entry.key, valueJson, metadataJson, now, now);
          results.set(entry.key, { success: true });
        } catch (error) {
          errors.push(error);
          results.set(entry.key, { success: false, error });
        }
      }
    });

    try {
      transaction();
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

    const transaction = this.#transactionManager.transaction(() => {
      const namespace = options.namespace || 'default';
      const stmt = this.#statements.get('delete');

      for (const key of keys) {
        try {
          stmt.run(namespace, key);
          results.set(key, { success: true });
        } catch (error) {
          errors.push(error);
          results.set(key, { success: false, error });
        }
      }
    });

    try {
      transaction();
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

