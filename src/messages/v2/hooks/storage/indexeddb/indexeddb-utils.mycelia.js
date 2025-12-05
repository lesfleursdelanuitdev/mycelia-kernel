/**
 * IndexedDB Utilities
 * 
 * Promise-based wrappers for IndexedDB operations.
 * Converts event-based IndexedDB API to async/await.
 */

/**
 * Check if IndexedDB is supported
 * @returns {boolean} True if IndexedDB is supported
 */
export function isIndexedDBSupported() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/**
 * Open an IndexedDB database
 * 
 * @param {string} name - Database name
 * @param {number} version - Database version
 * @param {Function} onUpgrade - Upgrade handler function
 * @returns {Promise<IDBDatabase>} Database instance
 */
export function openDatabase(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(name, version);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      if (onUpgrade) {
        try {
          onUpgrade(event);
        } catch (error) {
          reject(error);
        }
      }
    };
  });
}

/**
 * Get an object store from a transaction
 * 
 * @param {IDBTransaction} transaction - Transaction instance
 * @param {string} storeName - Object store name
 * @returns {IDBObjectStore} Object store
 */
export function getObjectStore(transaction, storeName) {
  return transaction.objectStore(storeName);
}

/**
 * Get a value from an object store
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {*} key - Key to retrieve
 * @returns {Promise<*>} Retrieved value or undefined
 */
export function get(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Put a value into an object store
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {*} value - Value to store
 * @param {*} [key] - Optional key (if not using keyPath)
 * @returns {Promise<*>} Key of stored value
 */
export function put(store, value, key) {
  return new Promise((resolve, reject) => {
    const request = key !== undefined ? store.put(value, key) : store.put(value);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a value from an object store
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {*} key - Key to delete
 * @returns {Promise<void>}
 */
export function deleteKey(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Check if a key exists in an object store
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {*} key - Key to check
 * @returns {Promise<boolean>} True if key exists
 */
export function has(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.count(IDBKeyRange.only(key));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result > 0);
  });
}

/**
 * Count entries in an object store (optionally with key range)
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {IDBKeyRange} [keyRange] - Optional key range
 * @returns {Promise<number>} Count of entries
 */
export function count(store, keyRange) {
  return new Promise((resolve, reject) => {
    const request = keyRange ? store.count(keyRange) : store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all keys from an object store (optionally with key range)
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {IDBKeyRange} [keyRange] - Optional key range
 * @param {number} [limit] - Optional limit
 * @returns {Promise<Array<*>>} Array of keys
 */
export function getAllKeys(store, keyRange, limit) {
  return new Promise((resolve, reject) => {
    const request = keyRange 
      ? (limit ? store.getAllKeys(keyRange, limit) : store.getAllKeys(keyRange))
      : (limit ? store.getAllKeys(null, limit) : store.getAllKeys());
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(Array.from(request.result));
  });
}

/**
 * Get all values from an object store (optionally with key range)
 * 
 * @param {IDBObjectStore} store - Object store
 * @param {IDBKeyRange} [keyRange] - Optional key range
 * @param {number} [limit] - Optional limit
 * @returns {Promise<Array<*>>} Array of values
 */
export function getAll(store, keyRange, limit) {
  return new Promise((resolve, reject) => {
    const request = keyRange
      ? (limit ? store.getAll(keyRange, limit) : store.getAll(keyRange))
      : (limit ? store.getAll(null, limit) : store.getAll());
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(Array.from(request.result));
  });
}

/**
 * Open a cursor on an object store
 * 
 * @param {IDBObjectStore|IDBIndex} storeOrIndex - Object store or index
 * @param {IDBKeyRange} [keyRange] - Optional key range
 * @param {string} [direction='next'] - Cursor direction ('next', 'prev', 'nextunique', 'prevunique')
 * @param {Function} callback - Callback function for each entry: (value, key, cursor) => boolean|void
 * @returns {Promise<void>} Resolves when cursor iteration completes
 */
export function openCursor(storeOrIndex, keyRange, direction, callback) {
  return new Promise((resolve, reject) => {
    const request = storeOrIndex.openCursor(keyRange, direction);

    request.onerror = () => reject(request.error);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const shouldContinue = callback ? callback(cursor.value, cursor.key, cursor) : true;
        
        if (shouldContinue !== false) {
          cursor.continue();
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    };
  });
}

/**
 * Clear all entries from an object store
 * 
 * @param {IDBObjectStore} store - Object store
 * @returns {Promise<void>}
 */
export function clear(store) {
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Wait for a transaction to complete
 * 
 * @param {IDBTransaction} transaction - Transaction instance
 * @returns {Promise<void>}
 */
export function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('Transaction aborted'));
  });
}

