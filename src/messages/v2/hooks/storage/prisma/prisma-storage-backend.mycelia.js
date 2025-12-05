/**
 * Prisma Storage Backend
 * 
 * Prisma-based storage implementation using Prisma Client.
 * Provides persistent, database-backed storage with Prisma ORM.
 * 
 * Note: This requires @prisma/client to be installed and Prisma schema to be generated.
 * 
 * Prisma Schema Requirements:
 * - Model with fields: id, namespace, key, value, metadata, createdAt, updatedAt
 * - Composite unique constraint on [namespace, key] (optional, but recommended)
 */

export class PrismaStorageBackend {
  #prisma;
  #modelName;
  #config;

  /**
   * Create a new PrismaStorageBackend
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.prisma] - Prisma Client instance (required)
   * @param {string} [options.modelName='StorageEntry'] - Prisma model name for storage entries
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options = {}) {
    if (!options.prisma) {
      throw new Error('PrismaStorageBackend: prisma client instance is required');
    }

    this.#prisma = options.prisma;
    this.#modelName = options.modelName || 'StorageEntry';
    this.#config = options;

    // Validate that the model exists in Prisma
    if (!this.#prisma[this.#modelName]) {
      throw new Error(`PrismaStorageBackend: Model "${this.#modelName}" not found in Prisma Client. Ensure your Prisma schema includes this model.`);
    }
  }

  /**
   * Get Prisma Client instance
   * @returns {Object} Prisma Client
   */
  getPrisma() {
    return this.#prisma;
  }

  /**
   * Get Prisma model delegate
   * @private
   */
  #getModel() {
    return this.#prisma[this.#modelName];
  }

  /**
   * Find a record by namespace and key
   * Uses findFirst to avoid dependency on composite unique constraint naming
   * @private
   */
  async #findRecord(namespace, key, select = null) {
    const model = this.#getModel();
    const where = { namespace, key };
    
    if (select) {
      return await model.findFirst({ where, select });
    }
    return await model.findFirst({ where });
  }

  /**
   * Parse JSON value safely
   * @private
   */
  #parseJson(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as-is if not valid JSON
      }
    }
    return value;
  }

  /**
   * Serialize value to JSON string
   * @private
   */
  #serializeValue(value) {
    return JSON.stringify(value);
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
      const record = await this.#findRecord(namespace, key);

      if (!record) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      const value = this.#parseJson(record.value);
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
      const now = new Date();

      const valueJson = this.#serializeValue(value);
      const metadataJson = Object.keys(metadata).length > 0 ? this.#serializeValue(metadata) : null;

      const model = this.#getModel();

      if (overwrite) {
        // Upsert: find existing or create new
        const existing = await this.#findRecord(namespace, key, { id: true });
        
        if (existing) {
          await model.update({
            where: { id: existing.id },
            data: {
              value: valueJson,
              metadata: metadataJson,
              updatedAt: now
            }
          });
        } else {
          await model.create({
            data: {
              namespace,
              key,
              value: valueJson,
              metadata: metadataJson,
              createdAt: now,
              updatedAt: now
            }
          });
        }
      } else {
        // Check if exists first
        const existing = await this.#findRecord(namespace, key, { id: true });
        if (existing) {
          return { success: false, error: new Error(`Key "${key}" already exists in namespace "${namespace}"`) };
        }
        // Create new record
        await model.create({
          data: {
            namespace,
            key,
            value: valueJson,
            metadata: metadataJson,
            createdAt: now,
            updatedAt: now
          }
        });
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
      const existing = await this.#findRecord(namespace, key, { id: true });

      if (!existing) {
        return { success: true }; // Already deleted, consider success
      }

      const model = this.#getModel();
      await model.delete({
        where: { id: existing.id }
      });

      return { success: true };
    } catch (error) {
      // Handle case where record doesn't exist
      if (error.code === 'P2025') {
        return { success: true }; // Already deleted, consider success
      }
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
      const record = await this.#findRecord(namespace, key, { id: true });
      return { success: true, exists: !!record };
    } catch (error) {
      return { success: false, exists: false, error };
    }
  }

  /**
   * Get multiple values by keys
   * Optimized to use a single query instead of multiple parallel queries
   * 
   * @param {Array<string>} keys - Storage keys
   * @param {Object} [options={}] - Options
   * @param {string} [options.namespace='default'] - Namespace
   * @returns {Promise<{success: boolean, data: Map<string, any>, errors?: Map<string, Error>}>}
   */
  async getMany(keys, options = {}) {
    try {
      const namespace = options.namespace || 'default';
      const model = this.#getModel();

      // Single query to get all records
      const records = await model.findMany({
        where: {
          namespace,
          key: { in: keys }
        }
      });

      // Build result map
      const data = new Map();
      const errors = new Map();
      const foundKeys = new Set(records.map(r => r.key));

      // Add found records
      for (const record of records) {
        const value = this.#parseJson(record.value);
        data.set(record.key, value);
      }

      // Add errors for missing keys
      for (const key of keys) {
        if (!foundKeys.has(key)) {
          errors.set(key, new Error(`Key "${key}" not found in namespace "${namespace}"`));
        }
      }

      return { success: true, data, errors: errors.size > 0 ? errors : undefined };
    } catch (error) {
      return { success: false, data: new Map(), errors: new Map() };
    }
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
    const namespace = options.namespace || 'default';
    const results = new Map();
    const errors = [];

    // Use transaction for atomicity
    try {
      await this.#prisma.$transaction(async (tx) => {
        const model = tx[this.#modelName];
        const now = new Date();

        for (const entry of entries) {
          try {
            const entryOptions = entry.options || {};
            const entryNamespace = entryOptions.namespace || namespace;
            const metadata = entryOptions.metadata || {};
            const valueJson = this.#serializeValue(entry.value);
            const metadataJson = Object.keys(metadata).length > 0 ? this.#serializeValue(metadata) : null;

            // Find existing record
            const existing = await model.findFirst({
              where: { namespace: entryNamespace, key: entry.key },
              select: { id: true }
            });

            if (existing) {
              await model.update({
                where: { id: existing.id },
                data: {
                  value: valueJson,
                  metadata: metadataJson,
                  updatedAt: now
                }
              });
            } else {
              await model.create({
                data: {
                  namespace: entryNamespace,
                  key: entry.key,
                  value: valueJson,
                  metadata: metadataJson,
                  createdAt: now,
                  updatedAt: now
                }
              });
            }

            results.set(entry.key, { success: true });
          } catch (error) {
            results.set(entry.key, { success: false, error });
            errors.push(error);
          }
        }
      });
    } catch (error) {
      return { success: false, results, errors: [error, ...errors] };
    }

    return { success: true, results, errors: errors.length > 0 ? errors : undefined };
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
    const namespace = options.namespace || 'default';
    const results = new Map();
    const errors = [];

    // Use transaction for atomicity
    try {
      await this.#prisma.$transaction(async (tx) => {
        const model = tx[this.#modelName];

        // Find all existing records in one query
        const existingRecords = await model.findMany({
          where: {
            namespace,
            key: { in: keys }
          },
          select: { id: true, key: true }
        });

        const existingMap = new Map(existingRecords.map(r => [r.key, r.id]));

        // Delete existing records
        for (const key of keys) {
          try {
            const id = existingMap.get(key);
            if (id) {
              await model.delete({ where: { id } });
            }
            // Consider success even if not found (idempotent)
            results.set(key, { success: true });
          } catch (error) {
            if (error.code === 'P2025') {
              results.set(key, { success: true }); // Already deleted
            } else {
              results.set(key, { success: false, error });
              errors.push(error);
            }
          }
        }
      });
    } catch (error) {
      return { success: false, results, errors: [error, ...errors] };
    }

    return { success: true, results, errors: errors.length > 0 ? errors : undefined };
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
      const model = this.#getModel();

      const where = { namespace };

      // Pattern matching (simple contains for now)
      if (options.pattern) {
        const pattern = options.pattern.replace(/\*/g, '');
        where.key = { contains: pattern };
      }

      const records = await model.findMany({
        where,
        select: { key: true },
        orderBy: { key: 'asc' },
        take: options.limit,
        skip: options.offset || 0
      });

      const keys = records.map(r => r.key);
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
      const model = this.#getModel();

      // Build Prisma where clause from filter
      const where = { namespace };

      // Simple filter support (can be extended)
      if (filter && typeof filter === 'object') {
        if (filter.key) {
          where.key = filter.key;
        }
        if (filter.metadata) {
          // Metadata filtering would require JSON queries (database-specific)
          // For now, we'll fetch and filter in memory
        }
      }

      const records = await model.findMany({ where });

      const results = records.map(record => {
        const value = this.#parseJson(record.value);
        const metadata = this.#parseJson(record.metadata) || {};

        return {
          key: record.key,
          value,
          metadata
        };
      });

      // Apply in-memory filtering if needed
      if (filter && filter.metadata) {
        return {
          success: true,
          results: results.filter(r => {
            for (const [key, value] of Object.entries(filter.metadata)) {
              if (r.metadata[key] !== value) {
                return false;
              }
            }
            return true;
          })
        };
      }

      return { success: true, results };
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
      const model = this.#getModel();

      if (options.filter) {
        const queryResult = await this.query(options.filter, { namespace });
        return { success: true, count: queryResult.results.length };
      }

      const count = await model.count({
        where: { namespace }
      });

      return { success: true, count };
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
      // For Prisma, namespaces are implicit (just a field in the model)
      // Namespaces are created automatically when first used
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

      const model = this.#getModel();

      if (options.recursive) {
        // Delete all entries in namespace
        await model.deleteMany({
          where: { namespace: name }
        });
      }

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
      const model = this.#getModel();

      // Get distinct namespaces
      const records = await model.findMany({
        select: { namespace: true },
        distinct: ['namespace']
      });

      const namespaces = records.map(r => r.namespace);
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
      const record = await this.#findRecord(namespace, key, { metadata: true });

      if (!record) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      const metadata = this.#parseJson(record.metadata) || {};
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
      const model = this.#getModel();

      if (merge) {
        // Get existing metadata and merge
        const existingResult = await this.getMetadata(key, { namespace });
        if (!existingResult.success) {
          return { success: false, error: existingResult.error };
        }
        metadata = { ...existingResult.metadata, ...metadata };
      }

      const metadataJson = Object.keys(metadata).length > 0 ? this.#serializeValue(metadata) : null;

      // Find existing record
      const existing = await this.#findRecord(namespace, key, { id: true });
      if (!existing) {
        return { success: false, error: new Error(`Key "${key}" not found in namespace "${namespace}"`) };
      }

      await model.update({
        where: { id: existing.id },
        data: {
          metadata: metadataJson,
          updatedAt: new Date()
        }
      });

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
      const model = this.#getModel();

      if (options.namespace) {
        await model.deleteMany({
          where: { namespace: options.namespace }
        });
      } else {
        await model.deleteMany({});
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
      const model = this.#getModel();

      // Get total size
      const totalSize = await model.count();

      // Get namespace count
      const namespaces = await this.listNamespaces();
      const namespaceCount = namespaces.success ? namespaces.namespaces.length : 0;

      return {
        success: true,
        status: {
          healthy: true,
          size: totalSize,
          namespaces: namespaceCount
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
    // Prisma transactions are handled via $transaction()
    // This is a placeholder for compatibility with storage contract
    return { success: true, transactionId: 'prisma-transaction' };
  }

  /**
   * Commit a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async commit(transactionId, options = {}) {
    // Prisma transactions are auto-committed
    return { success: true };
  }

  /**
   * Rollback a transaction
   * 
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async rollback(transactionId, options = {}) {
    // Prisma transactions auto-rollback on error
    return { success: true };
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.#prisma) {
      await this.#prisma.$disconnect();
    }
  }
}
