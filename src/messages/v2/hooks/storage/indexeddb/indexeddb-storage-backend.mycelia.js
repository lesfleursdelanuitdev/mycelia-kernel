/**
 * IndexedDB Storage Backend
 * 
 * IndexedDB-based storage implementation using native IndexedDB API.
 * Provides persistent, browser-based storage with transaction support.
 */

import { isIndexedDBSupported, openDatabase } from './indexeddb-utils.mycelia.js';
import { get, put, deleteKey, has, count, getAllKeys } from './indexeddb-utils.mycelia.js';
import { handleUpgrade, getCurrentSchemaVersion, initializeDefaultNamespace } from './indexeddb-schema.mycelia.js';
import { IndexedDBQueryHandler } from './indexeddb-query-handler.mycelia.js';
import { IndexedDBBatchOperations } from './indexeddb-batch-operations.mycelia.js';
import { IndexedDBTransactionManager } from './indexeddb-transaction-manager.mycelia.js';
import { IndexedDBNamespaceManager } from './indexeddb-namespace-manager.mycelia.js';
import { IndexedDBClearManager } from './indexeddb-clear-manager.mycelia.js';

export class IndexedDBStorageBackend {
  #db;
  #dbName;
  #dbVersion;
  #config;
  #queryHandler;
  #batchOperations;
  #transactionManager;
  #namespaceManager;
  #clearManager;

  /**
   * Create a new IndexedDBStorageBackend
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.dbName='mycelia-storage'] - Database name
   * @param {number} [options.dbVersion=1] - Database version
   * @param {boolean} [options.migrate=true] - Run migrations on startup
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options = {}) {
    if (!isIndexedDBSupported()) {
      throw new Error('IndexedDB is not supported in this browser');
    }

    this.#dbName = options.dbName || 'mycelia-storage';
    this.#dbVersion = options.dbVersion || getCurrentSchemaVersion();
    this.#config = options;
    this.#db = null; // Will be initialized asynchronously

    // Initialize components (will set db later)
    this.#queryHandler = new IndexedDBQueryHandler(this);
    this.#batchOperations = new IndexedDBBatchOperations(this);
    this.#transactionManager = new IndexedDBTransactionManager(this);
    this.#namespaceManager = new IndexedDBNamespaceManager(this);
    this.#clearManager = new IndexedDBClearManager(this);
  }

  /**
   * Initialize database connection
   * Must be called before using the backend
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#db) {
      return; // Already initialized
    }

    this.#db = await openDatabase(this.#dbName, this.#dbVersion, handleUpgrade);
    
    // Initialize default namespace
    await initializeDefaultNamespace(this.#db);
  }

  /**
   * Get database instance (internal use)
   * Ensures database is initialized
   * @returns {Promise<IDBDatabase>}
   */
  async _getDatabase() {
    if (!this.#db) {
      await this.initialize();
    }
    if (!this.#db) {
      throw new Error('Failed to initialize IndexedDB database');
    }
    return this.#db;
  }

  /**
   * Get an object store
   * @private
   */
  async _getObjectStore(storeName, mode = 'readonly') {
    const db = await this._getDatabase();
    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
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
      const store = await this._getObjectStore('storage_entries', 'readonly');
      const compositeKey = [namespace, key];
      const entry = await get(store, compositeKey);

      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      return { success: true, data: entry.value };
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
      const compositeKey = [namespace, key];

      if (!overwrite) {
        // Check if exists first
        const hasResult = await this.has(key, { namespace });
        if (hasResult.exists) {
          return { success: false, error: new Error(`Key "${key}" already exists in namespace "${namespace}"`) };
        }
      }

      const store = await this._getObjectStore('storage_entries', 'readwrite');
      const entry = {
        namespace,
        key,
        value,
        metadata,
        createdAt: now,
        updatedAt: now
      };

      await put(store, entry, compositeKey);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.#handleError(error, 'set') };
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
      const store = await this._getObjectStore('storage_entries', 'readwrite');
      const compositeKey = [namespace, key];
      await deleteKey(store, compositeKey);
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
      const store = await this._getObjectStore('storage_entries', 'readonly');
      const compositeKey = [namespace, key];
      const exists = await has(store, compositeKey);
      return { success: true, exists };
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
   * @param {string} [options.pattern] - Pattern to match
   * @param {number} [options.limit] - Maximum number of keys
   * @param {number} [options.offset=0] - Number of keys to skip
   * @returns {Promise<{success: boolean, keys: string[], error?: Error}>}
   */
  async list(options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const db = await this._getDatabase();
      const transaction = db.transaction(['storage_entries'], 'readonly');
      const store = transaction.objectStore('storage_entries');
      const index = store.index('namespace');

      // Use cursor to get all keys in namespace
      const keys = [];
      const range = IDBKeyRange.only(namespace);
      
      await new Promise((resolve, reject) => {
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const key = cursor.value.key[1]; // Second part of composite key
            
            // Apply pattern matching
            if (!options.pattern || this.#matchesPattern(key, options.pattern)) {
              keys.push(key);
            }
            
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });

      // Sort keys
      keys.sort();

      // Apply offset and limit
      const offset = options.offset || 0;
      const limit = options.limit;
      
      let result = keys.slice(offset);
      if (limit !== undefined) {
        result = result.slice(0, limit);
      }

      return { success: true, keys: result };
    } catch (error) {
      return { success: false, keys: [], error };
    }
  }

  /**
   * Convert pattern to matching function
   * @private
   */
  #matchesPattern(key, pattern) {
    // Convert pattern to regex-like matching
    // '*prefix' -> 'prefix%'
    // 'suffix*' -> '%suffix'
    // '*middle*' -> '%middle%'
    const regexPattern = pattern
      .replace(/^\*/, '.*')
      .replace(/\*$/, '.*')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
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

      const db = await this._getDatabase();
      const transaction = db.transaction(['storage_entries'], 'readonly');
      const store = transaction.objectStore('storage_entries');
      const index = store.index('namespace');
      const range = IDBKeyRange.only(namespace);
      
      const entryCount = await count(index, range);
      return { success: true, count: entryCount };
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
    return await this.#namespaceManager.createNamespace(name, options);
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
    return await this.#namespaceManager.deleteNamespace(name, options);
  }

  /**
   * List all namespaces
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, namespaces: string[], error?: Error}>}
   */
  async listNamespaces(options = {}) {
    return await this.#namespaceManager.listNamespaces(options);
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
      const store = await this._getObjectStore('storage_entries', 'readonly');
      const compositeKey = [namespace, key];
      const entry = await get(store, compositeKey);

      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      return { success: true, metadata: entry.metadata || {} };
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
      const compositeKey = [namespace, key];

      if (merge) {
        // Get existing entry and merge
        const getResult = await this.getMetadata(key, { namespace });
        if (!getResult.success) {
          return { success: false, error: getResult.error };
        }
        metadata = { ...getResult.metadata, ...metadata };
      }

      // Get existing entry to preserve other fields
      const store = await this._getObjectStore('storage_entries', 'readwrite');
      const entry = await get(store, compositeKey);
      
      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      // Update metadata
      entry.metadata = metadata;
      entry.updatedAt = Date.now();
      await put(store, entry, compositeKey);

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
    return await this.#clearManager.clear(options);
  }

  /**
   * Get storage status
   * 
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, status: {healthy: boolean, size?: number, capacity?: number, namespaces?: number}, error?: Error}>}
   */
  async getStatus(options = {}) {
    try {
      const db = await this._getDatabase();
      
      // Get total size
      const transaction = db.transaction(['storage_entries'], 'readonly');
      const store = transaction.objectStore('storage_entries');
      const totalSize = await count(store);

      // Get namespace count
      const nsStore = await this._getObjectStore('storage_namespaces', 'readonly');
      const nsKeys = await getAllKeys(nsStore);

      return {
        success: true,
        status: {
          healthy: true,
          size: totalSize,
          namespaces: nsKeys.length
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
   * @param {Array<string>} [options.stores] - Object store names
   * @param {string} [options.mode='readwrite'] - Transaction mode
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
   * Handle IndexedDB errors
   * @private
   */
  #handleError(error, operation) {
    if (error.name === 'QuotaExceededError') {
      return new Error(`Storage quota exceeded. Please free up space. Operation: ${operation}`);
    }
    
    if (error.name === 'InvalidStateError') {
      return new Error(`Database connection lost. Please retry. Operation: ${operation}`);
    }
    
    return error;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }
}

