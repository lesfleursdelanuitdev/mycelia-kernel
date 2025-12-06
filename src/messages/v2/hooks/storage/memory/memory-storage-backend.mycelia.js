/**
 * Memory Storage Backend
 * 
 * In-memory storage implementation using Map for fast lookups.
 * Suitable for testing, caching, and temporary data storage.
 */

import { StorageEntry } from '../../../models/storage/storage-entry.mycelia.js';
import { StorageQuery } from '../../../models/storage/storage-query.mycelia.js';

export class MemoryStorageBackend {
  #data; // Map<namespace, Map<key, StorageEntry>>
  #namespaces; // Set<string>
  #capacity;
  #maxCapacity;

  /**
   * Create a new MemoryStorageBackend
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.capacity=10000] - Maximum number of entries
   */
  constructor(options = {}) {
    this.#data = new Map(); // namespace -> Map<key, StorageEntry>
    this.#namespaces = new Set(['default']); // Always have default namespace
    this.#capacity = 0;
    this.#maxCapacity = options.capacity || 10000;
    
    // Initialize default namespace
    this.#data.set('default', new Map());
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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const entry = namespaceMap.get(key);
      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      return { success: true, data: entry.getValue() };
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

      // Ensure namespace exists
      if (!this.#data.has(namespace)) {
        this.#namespaces.add(namespace);
        this.#data.set(namespace, new Map());
      }

      const namespaceMap = this.#data.get(namespace);
      const existing = namespaceMap.get(key);

      if (existing && !overwrite) {
        return { success: false, error: new Error(`Key "${key}" already exists in namespace "${namespace}"`) };
      }

      // Check capacity
      if (!existing && this.#capacity >= this.#maxCapacity) {
        return { success: false, error: new Error(`Storage capacity exceeded (${this.#maxCapacity})`) };
      }

      const entry = existing || new StorageEntry(key, value, { ...metadata, namespace });
      if (!existing) {
        this.#capacity++;
      } else {
        entry.setValue(value);
        entry.setMetadata({ ...metadata, namespace });
      }

      namespaceMap.set(key, entry);
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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const existed = namespaceMap.delete(key);
      if (existed) {
        this.#capacity--;
      }

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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, exists: false, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const exists = namespaceMap.has(key);
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
    const results = new Map();
    const errors = new Map();

    for (const key of keys) {
      const result = await this.get(key, options);
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
   * @param {Array<{key: string, value: any}>} entries - Key-value pairs
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>}
   */
  async setMany(entries, options = {}) {
    const results = new Map();
    const errors = [];

    for (const entry of entries) {
      const result = await this.set(entry.key, entry.value, { ...options, ...entry.options });
      results.set(entry.key, { success: result.success, ...(result.error && { error: result.error }) });
      if (!result.success) {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0,
      results,
      ...(errors.length > 0 && { errors })
    };
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

    for (const key of keys) {
      const result = await this.delete(key, options);
      results.set(key, { success: result.success, ...(result.error && { error: result.error }) });
      if (!result.success) {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0,
      results,
      ...(errors.length > 0 && { errors })
    };
  }

  /**
   * List all keys
   * 
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @param {string} [options.pattern] - Pattern to match (simple prefix/suffix matching)
   * @param {number} [options.limit] - Maximum number of keys
   * @param {number} [options.offset=0] - Number of keys to skip
   * @returns {Promise<{success: boolean, keys: string[], error?: Error}>}
   */
  async list(options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, keys: [], error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      let keys = Array.from(namespaceMap.keys());

      // Apply pattern matching (simple prefix/suffix)
      if (options.pattern) {
        const pattern = options.pattern;
        if (pattern.startsWith('*') && pattern.endsWith('*')) {
          const substr = pattern.slice(1, -1);
          keys = keys.filter(k => k.includes(substr));
        } else if (pattern.startsWith('*')) {
          const suffix = pattern.slice(1);
          keys = keys.filter(k => k.endsWith(suffix));
        } else if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          keys = keys.filter(k => k.startsWith(prefix));
        } else {
          keys = keys.filter(k => k === pattern);
        }
      }

      // Apply offset and limit
      const offset = options.offset || 0;
      const limit = options.limit;
      
      if (offset > 0) {
        keys = keys.slice(offset);
      }
      
      if (limit !== undefined) {
        keys = keys.slice(0, limit);
      }

      return { success: true, keys };
    } catch (error) {
      return { success: false, keys: [], error };
    }
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
    try {
      const namespace = options.namespace || 'default';
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, results: [], error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const query = filter instanceof StorageQuery ? filter : new StorageQuery(Array.isArray(filter) ? filter : [filter], options);
      const results = [];

      for (const [key, entry] of namespaceMap.entries()) {
        const value = entry.getValue();
        const metadata = { ...entry.getMetadata(), key };
        
        if (query.matches(value, metadata)) {
          results.push({
            key,
            value,
            metadata: entry.getMetadata()
          });
        }
      }

      // Apply sorting
      const sort = query.getSort();
      if (sort) {
        const { field, order } = sort;
        results.sort((a, b) => {
          const aVal = field === 'key' ? a.key : (a.value?.[field] ?? a.metadata?.[field]);
          const bVal = field === 'key' ? b.key : (b.value?.[field] ?? b.metadata?.[field]);
          
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;
          
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return order === 'desc' ? -comparison : comparison;
        });
      }

      // Apply offset and limit
      const offset = query.getOffset() || 0;
      const limit = query.getLimit();
      
      let finalResults = results;
      if (offset > 0) {
        finalResults = finalResults.slice(offset);
      }
      if (limit !== undefined) {
        finalResults = finalResults.slice(0, limit);
      }

      return { success: true, results: finalResults };
    } catch (error) {
      return { success: false, results: [], error };
    }
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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, count: 0, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      if (options.filter) {
        const queryResult = await this.query(options.filter, { namespace });
        return { success: true, count: queryResult.results.length };
      }

      return { success: true, count: namespaceMap.size };
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
      if (this.#namespaces.has(name)) {
        return { success: false, error: new Error(`Namespace "${name}" already exists`) };
      }

      this.#namespaces.add(name);
      this.#data.set(name, new Map());
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

      if (!this.#namespaces.has(name)) {
        return { success: false, error: new Error(`Namespace "${name}" does not exist`) };
      }

      const namespaceMap = this.#data.get(name);
      const deletedCount = namespaceMap.size;
      
      this.#namespaces.delete(name);
      this.#data.delete(name);
      this.#capacity -= deletedCount;

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
      const namespaces = Array.from(this.#namespaces);
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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const entry = namespaceMap.get(key);
      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      return { success: true, metadata: entry.getMetadata() };
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
      const namespaceMap = this.#data.get(namespace);
      
      if (!namespaceMap) {
        return { success: false, error: new Error(`Namespace "${namespace}" does not exist`) };
      }

      const entry = namespaceMap.get(key);
      if (!entry) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      const merge = options.merge !== false;
      if (merge) {
        entry.setMetadata(metadata);
      } else {
        // Replace metadata (but preserve namespace)
        const currentMetadata = entry.getMetadata();
        entry.setMetadata({ ...metadata, namespace: currentMetadata.namespace });
      }

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
        const namespaceMap = this.#data.get(options.namespace);
        if (namespaceMap) {
          const deletedCount = namespaceMap.size;
          namespaceMap.clear();
          this.#capacity -= deletedCount;
        }
      } else {
        // Clear all namespaces
        for (const namespaceMap of this.#data.values()) {
          namespaceMap.clear();
        }
        this.#capacity = 0;
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
      let totalSize = 0;
      for (const namespaceMap of this.#data.values()) {
        totalSize += namespaceMap.size;
      }

      return {
        success: true,
        status: {
          healthy: true,
          size: totalSize,
          capacity: this.#maxCapacity,
          namespaces: this.#namespaces.size
        }
      };
    } catch (error) {
      return { success: false, status: { healthy: false }, error };
    }
  }
}




