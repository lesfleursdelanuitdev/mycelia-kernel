/**
 * IndexedDB Query Handler
 * 
 * Handles query/filter operations for IndexedDB storage.
 * Uses cursors for efficient iteration and filtering.
 */

import { StorageQuery } from '../../../models/storage/storage-query.mycelia.js';
import { openCursor } from './indexeddb-utils.mycelia.js';

export class IndexedDBQueryHandler {
  #backend;

  /**
   * Create a new IndexedDBQueryHandler
   * 
   * @param {Object} backend - IndexedDBStorageBackend instance (for accessing data)
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

      const db = await this.#backend._getDatabase();
      const transaction = db.transaction(['storage_entries'], 'readonly');
      const store = transaction.objectStore('storage_entries');
      const index = store.index('namespace');

      // Use cursor to iterate over namespace entries
      const results = [];
      await openCursor(index, IDBKeyRange.only(namespace), 'next', (entry, key, cursor) => {
        // entry is the full entry object from the cursor
        // The cursor value is the stored entry with composite key [namespace, key]
        const entryKey = entry.key[1]; // Second part of composite key
        const entryValue = entry.value;
        const metadata = entry.metadata || {};

        // Apply filter
        if (query.matches(entryValue, { ...metadata, key: entryKey })) {
          results.push({
            key: entryKey,
            value: entryValue,
            metadata
          });
        }
      });

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

