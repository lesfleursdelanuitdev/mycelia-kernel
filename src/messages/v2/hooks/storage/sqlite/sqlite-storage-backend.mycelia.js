/**
 * SQLite Storage Backend
 * 
 * SQLite-based storage implementation using better-sqlite3.
 * Provides persistent, file-based storage with ACID transactions.
 */

import Database from 'better-sqlite3';
import { SQLiteSchema } from './sqlite-schema.mycelia.js';
import { SQLitePreparedStatements } from './sqlite-prepared-statements.mycelia.js';
import { SQLiteTransactionManager } from './sqlite-transaction-manager.mycelia.js';
import { SQLiteQueryHandler } from './sqlite-query-handler.mycelia.js';
import { SQLiteBatchOperations } from './sqlite-batch-operations.mycelia.js';

export class SQLiteStorageBackend {
  #db;
  #dbPath;
  #config;
  #statements;
  #transactionManager;
  #queryHandler;
  #batchOperations;

  /**
   * Create a new SQLiteStorageBackend
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.dbPath='./data/storage.db'] - Database file path
   * @param {boolean} [options.migrate=true] - Run migrations on startup
   * @param {boolean} [options.walMode=true] - Enable WAL mode
   * @param {string} [options.synchronous='NORMAL'] - Synchronous mode ('OFF', 'NORMAL', 'FULL')
   * @param {number} [options.busyTimeout=5000] - Busy timeout in milliseconds
   * @param {boolean} [options.debug=false] - Enable SQL logging
   */
  constructor(options = {}) {
    this.#dbPath = options.dbPath || './data/storage.db';
    this.#config = options;

    // Create database connection
    this.#db = new Database(this.#dbPath, {
      verbose: options.debug ? console.log : undefined
    });

    // Configure SQLite settings
    this.#configureDatabase(options);

    // Initialize schema
    SQLiteSchema.initialize(this.#db);

    // Run migrations if enabled
    if (options.migrate !== false) {
      SQLiteSchema.migrate(this.#db, SQLiteSchema.getCurrentSchemaVersion());
    }

    // Initialize components
    this.#statements = new SQLitePreparedStatements(this.#db);
    this.#transactionManager = new SQLiteTransactionManager(this.#db);
    this.#queryHandler = new SQLiteQueryHandler(this);
    this.#batchOperations = new SQLiteBatchOperations(this.#db, this.#statements, this.#transactionManager);
  }

  /**
   * Configure SQLite database settings
   * @private
   */
  #configureDatabase(options) {
    if (options.walMode !== false) {
      this.#db.pragma('journal_mode = WAL');
    }

    const synchronous = options.synchronous || 'NORMAL';
    this.#db.pragma(`synchronous = ${synchronous}`);

    const busyTimeout = options.busyTimeout || 5000;
    this.#db.pragma(`busy_timeout = ${busyTimeout}`);
  }

  /**
   * Get a value by key
   * 
   * @param {string} key - Storage key
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, data?: any, error?: Error}>}
   */
  async get(key, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const stmt = this.#statements.get('get');
      const row = stmt.get(namespace, key);

      if (!row) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      const value = JSON.parse(row.value);
      return { success: true, data: value };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Set a value by key
   * 
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {Object} [options.metadata={}] - Metadata
   * @param {boolean} [options.overwrite=true] - Overwrite if exists
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async set(key, value, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const metadata = options.metadata || {};
      const overwrite = options.overwrite !== false;
      const now = Date.now();

      const valueJson = JSON.stringify(value);
      const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

      if (overwrite) {
        const stmt = this.#statements.get('set');
        stmt.run(namespace, key, valueJson, metadataJson, now, now);
      } else {
        // Check if exists first
        const hasResult = await this.has(key, { namespace });
        if (hasResult.exists) {
          return { success: false, error: new Error(`Key "${key}" already exists in namespace "${namespace}"`) };
        }
        const stmt = this.#statements.get('setNoOverwrite');
        stmt.run(namespace, key, valueJson, metadataJson, now, now);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete a value by key
   * 
   * @param {string} key - Storage key
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async delete(key, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const stmt = this.#statements.get('delete');
      stmt.run(namespace, key);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Check if a key exists
   * 
   * @param {string} key - Storage key
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, exists: boolean, error?: Error}>}
   */
  async has(key, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const stmt = this.#statements.get('has');
      const row = stmt.get(namespace, key);
      return { success: true, exists: !!row };
    } catch (error) {
      return { success: false, exists: false, error };
    }
  }

  /**
   * Get multiple values by keys
   * 
   * @param {Array<string>} keys - Storage keys
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, data: Map<string, any>, errors?: Map<string, Error>}>}
   */
  async getMany(keys, options = {}) {
    return await this.#batchOperations.getMany(keys, options, (key, opts) => this.get(key, opts));
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
    return await this.#batchOperations.setMany(entries, options);
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
    return await this.#batchOperations.deleteMany(keys, options);
  }

  /**
   * List all keys
   * 
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {string} [options.pattern] - Pattern to match (SQL LIKE pattern)
   * @param {number} [options.limit] - Maximum number of keys
   * @param {number} [options.offset=0] - Number of keys to skip
   * @returns {Promise<{success: boolean, keys: string[], error?: Error}>}
   */
  async list(options = {}) {
    try {
      const namespace = options.namespace || 'default';
      let query = 'SELECT key FROM storage_entries WHERE namespace = ?';
      const params = [namespace];

      if (options.pattern) {
        const likePattern = this.#convertPatternToLike(options.pattern);
        query += ' AND key LIKE ?';
        params.push(likePattern);
      }

      query += ' ORDER BY key';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }

      const stmt = this.#db.prepare(query);
      const rows = stmt.all(...params);
      const keys = rows.map(r => r.key);

      return { success: true, keys };
    } catch (error) {
      return { success: false, keys: [], error };
    }
  }

  /**
   * Convert pattern to SQL LIKE format
   * @private
   */
  #convertPatternToLike(pattern) {
    // Convert pattern to SQL LIKE
    // '*prefix' -> 'prefix%'
    // 'suffix*' -> '%suffix'
    // '*middle*' -> '%middle%'
    return pattern
      .replace(/^\*/, '%')
      .replace(/\*$/, '%')
      .replace(/\*/g, '%');
  }

  /**
   * Query values by filter
   * 
   * @param {Object|StorageQuery} filter - Filter criteria
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, results: Array<{key: string, value: any, metadata?: Object}>, error?: Error}>}
   */
  async query(filter, options = {}) {
    return await this.#queryHandler.query(filter, options);
  }

  /**
   * Count entries
   * 
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {Object} [options.filter] - Filter criteria
   * @returns {Promise<{success: boolean, count: number, error?: Error}>}
   */
  async count(options = {}) {
    try {
      const namespace = options.namespace || 'default';

      if (options.filter) {
        const queryResult = await this.query(options.filter, { namespace });
        return { success: true, count: queryResult.results.length };
      }

      const stmt = this.#statements.get('count');
      const row = stmt.get(namespace);
      return { success: true, count: row.count };
    } catch (error) {
      return { success: false, count: 0, error };
    }
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
      const stmt = this.#statements.get('namespaceExists');
      const exists = stmt.get(name);

      if (exists) {
        return { success: false, error: new Error(`Namespace "${name}" already exists`) };
      }

      const metadata = options.metadata || {};
      const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
      const createStmt = this.#statements.get('createNamespace');
      createStmt.run(name, metadataJson, Date.now());

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

      const existsStmt = this.#statements.get('namespaceExists');
      const exists = existsStmt.get(name);

      if (!exists) {
        return { success: false, error: new Error(`Namespace "${name}" does not exist`) };
      }

      // Delete all entries in namespace if recursive
      if (options.recursive) {
        const clearStmt = this.#statements.get('clearNamespace');
        clearStmt.run(name);
      }

      // Delete namespace
      const deleteStmt = this.#statements.get('deleteNamespace');
      deleteStmt.run(name);

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * List all namespaces
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, namespaces: string[], error?: Error}>}
   */
  async listNamespaces(options = {}) {
    try {
      const stmt = this.#statements.get('listNamespaces');
      const rows = stmt.all();
      const namespaces = rows.map(r => r.name);
      return { success: true, namespaces };
    } catch (error) {
      return { success: false, namespaces: [], error };
    }
  }

  /**
   * Get metadata for a key
   * 
   * @param {string} key - Storage key
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, metadata?: Object, error?: Error}>}
   */
  async getMetadata(key, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const stmt = this.#statements.get('getMetadata');
      const row = stmt.get(namespace, key);

      if (!row) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      const metadata = row.metadata ? JSON.parse(row.metadata) : {};
      return { success: true, metadata };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Set metadata for a key
   * 
   * @param {string} key - Storage key
   * @param {Object} metadata - Metadata to set
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {boolean} [options.merge=true] - Merge with existing metadata
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async setMetadata(key, metadata, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const merge = options.merge !== false;

      if (merge) {
        // Get existing metadata and merge
        const existingResult = await this.getMetadata(key, { namespace });
        if (!existingResult.success) {
          return { success: false, error: existingResult.error };
        }
        metadata = { ...existingResult.metadata, ...metadata };
      }

      const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
      const stmt = this.#statements.get('setMetadata');
      stmt.run(metadataJson, Date.now(), namespace, key);

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
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
        const stmt = this.#statements.get('clearNamespace');
        stmt.run(options.namespace);
      } else {
        const stmt = this.#statements.get('clearAll');
        stmt.run();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Get storage status
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, status: {healthy: boolean, size?: number, capacity?: number, namespaces?: number}, error?: Error}>}
   */
  async getStatus(options = {}) {
    try {
      // Get total size
      const sizeStmt = this.#db.prepare('SELECT COUNT(*) as count FROM storage_entries');
      const sizeRow = sizeStmt.get();

      // Get namespace count
      const nsStmt = this.#statements.get('listNamespaces');
      const nsRows = nsStmt.all();

      return {
        success: true,
        status: {
          healthy: true,
          size: sizeRow.count,
          namespaces: nsRows.length
        }
      };
    } catch (error) {
      return { success: false, status: { healthy: false }, error };
    }
  }

  /**
   * Begin a transaction
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, transactionId?: string, error?: Error}>}
   */
  async beginTransaction(options = {}) {
    return await this.#transactionManager.beginTransaction(options);
  }

  /**
   * Commit a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async commit(transactionId, options = {}) {
    return await this.#transactionManager.commit(transactionId, options);
  }

  /**
   * Rollback a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async rollback(transactionId, options = {}) {
    return await this.#transactionManager.rollback(transactionId, options);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.#db) {
      this.#db.close();
    }
  }
}
