/**
 * SQLite Query Handler
 * 
 * Handles query/filter operations for SQLite storage.
 * Currently uses in-memory filtering, but can be optimized with SQL-based filtering.
 */

import { StorageQuery } from '../../../models/storage/storage-query.mycelia.js';

export class SQLiteQueryHandler {
  #backend;

  /**
   * Create a new SQLiteQueryHandler
   * 
   * @param {Object} backend - SQLiteStorageBackend instance (for accessing data)
   */
  constructor(backend) {
    this.#backend = backend;
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
      const query = filter instanceof StorageQuery 
        ? filter 
        : new StorageQuery(Array.isArray(filter) ? filter : [filter], options);

      // Load all entries in namespace and filter in memory
      // TODO: Implement SQL-based filtering using JSON functions for better performance
      const listResult = await this.#backend.list({ namespace });
      if (!listResult.success) {
        return { success: false, results: [], error: listResult.error };
      }

      const results = [];
      for (const key of listResult.keys) {
        const getResult = await this.#backend.get(key, { namespace });
        if (getResult.success) {
          const metadataResult = await this.#backend.getMetadata(key, { namespace });
          const metadata = metadataResult.success ? metadataResult.metadata : {};

          if (query.matches(getResult.data, { ...metadata, key })) {
            results.push({
              key,
              value: getResult.data,
              metadata
            });
          }
        }
      }

      // Apply sorting
      const sortedResults = this.#applySorting(results, query);

      // Apply offset and limit
      const finalResults = this.#applyPagination(sortedResults, query);

      return { success: true, results: finalResults };
    } catch (error) {
      return { success: false, results: [], error };
    }
  }

  /**
   * Apply sorting to results
   * @private
   */
  #applySorting(results, query) {
    const sort = query.getSort();
    if (!sort) {
      return results;
    }

    const { field, order } = sort;
    return [...results].sort((a, b) => {
      const aVal = field === 'key' ? a.key : (a.value?.[field] ?? a.metadata?.[field]);
      const bVal = field === 'key' ? b.key : (b.value?.[field] ?? b.metadata?.[field]);

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Apply pagination (offset and limit) to results
   * @private
   */
  #applyPagination(results, query) {
    const offset = query.getOffset() || 0;
    const limit = query.getLimit();

    let finalResults = results;
    if (offset > 0) {
      finalResults = finalResults.slice(offset);
    }
    if (limit !== undefined) {
      finalResults = finalResults.slice(0, limit);
    }

    return finalResults;
  }
}

