/**
 * useDBQueryBuilder Hook
 * 
 * Provides query builder functionality for database operations.
 * Supports both raw SQL queries and fluent query builder API.
 */

import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useDBQueryBuilder = createHook({
  kind: 'queryBuilder',
  version: '1.0.0',
  overwrite: false,
  required: ['storage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.query || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useDBQueryBuilder ${name}`);

    // Find storage facet
    const storageResult = findFacet(api.__facets, 'storage');
    if (!storageResult) {
      throw new Error(`useDBQueryBuilder ${name}: storage facet not found. useDBStorage must be added before useDBQueryBuilder.`);
    }

    const storage = storageResult.facet;
    const defaultTimeout = config.defaultTimeout || 5000;

    return new Facet('queryBuilder', { attach: true, source: import.meta.url })
      .add({
        /**
         * Execute a SELECT query
         * 
         * @param {string} query - SQL query string
         * @param {Array} [params=[]] - Query parameters
         * @param {Object} [options={}] - Query options
         * @returns {Promise<{success: boolean, results?: Array, error?: Error}>}
         */
        async executeQuery(query, params = [], options = {}) {
          try {
            // For now, use storage.query with a filter
            // In the future, this could parse SQL and convert to storage queries
            const namespace = options.namespace || 'default';
            
            // Simple query execution using storage.query
            // Note: This is a simplified implementation
            // Full SQL parsing would require a SQL parser library
            // For now, we'll use the query as a filter pattern
            const filter = Array.isArray(query) ? query : [{ field: 'key', operator: 'contains', value: query }];
            const result = await storage.query(
              filter,
              { namespace, ...options }
            );

            return result;
          } catch (error) {
            logger.error('Query execution error:', error);
            return { success: false, error };
          }
        },

        /**
         * Execute a write operation (INSERT, UPDATE, DELETE)
         * 
         * @param {string} query - SQL query string
         * @param {Array} [params=[]] - Query parameters
         * @param {Object} [options={}] - Write options
         * @returns {Promise<{success: boolean, affectedRows?: number, error?: Error}>}
         */
        async executeWrite(query, params = [], options = {}) {
          try {
            const namespace = options.namespace || 'default';
            
            // For write operations, we'll use storage.set/delete
            // This is a simplified implementation
            // Full SQL parsing would be needed for proper SQL support
            
            // Simple INSERT-like operation
            if (query.toUpperCase().trim().startsWith('INSERT')) {
              // Extract key and value from params or query
              // This is a placeholder - real implementation would parse SQL
              const key = params[0] || `record_${Date.now()}`;
              const value = params[1] || params[0];
              
              const result = await storage.set(key, value, { namespace, ...options });
              return { success: result.success, affectedRows: result.success ? 1 : 0, error: result.error };
            }
            
            // Simple DELETE-like operation
            if (query.toUpperCase().trim().startsWith('DELETE')) {
              const key = params[0];
              if (!key) {
                return { success: false, error: new Error('Key is required for DELETE operation') };
              }
              
              const result = await storage.delete(key, { namespace, ...options });
              return { success: result.success, affectedRows: result.success ? 1 : 0, error: result.error };
            }
            
            // Simple UPDATE-like operation
            if (query.toUpperCase().trim().startsWith('UPDATE')) {
              const key = params[0];
              const value = params[1];
              
              if (!key || value === undefined) {
                return { success: false, error: new Error('Key and value are required for UPDATE operation') };
              }
              
              const result = await storage.set(key, value, { namespace, ...options });
              return { success: result.success, affectedRows: result.success ? 1 : 0, error: result.error };
            }
            
            return { success: false, error: new Error('Unsupported query type') };
          } catch (error) {
            logger.error('Write execution error:', error);
            return { success: false, error };
          }
        },

        /**
         * Create a query builder instance
         * 
         * @returns {QueryBuilder} Query builder instance
         */
        builder() {
          return new QueryBuilder(this, storage, logger);
        },

        // Configuration
        _config: config,
        _defaultTimeout: defaultTimeout
      });
  }
});

/**
 * Query Builder Class
 * Provides fluent API for building queries
 */
class QueryBuilder {
  constructor(queryBuilder, storage, logger) {
    this._queryBuilder = queryBuilder;
    this._storage = storage;
    this._logger = logger;
    this._table = null;
    this._columns = null;
    this._where = [];
    this._orderBy = null;
    this._limit = null;
    this._offset = null;
  }

  /**
   * Select from a table
   * @param {string} table - Table name
   * @param {Array<string>} [columns] - Column names
   * @returns {QueryBuilder} This builder instance
   */
  select(table, columns = null) {
    this._table = table;
    this._columns = columns;
    return this;
  }

  /**
   * Add WHERE condition
   * @param {string} field - Field name
   * @param {string} operator - Operator ('=', '>', '<', etc.)
   * @param {*} value - Value to compare
   * @returns {QueryBuilder} This builder instance
   */
  where(field, operator, value) {
    this._where.push({ field, operator, value });
    return this;
  }

  /**
   * Add ORDER BY clause
   * @param {string} field - Field name
   * @param {string} [direction='ASC'] - Sort direction
   * @returns {QueryBuilder} This builder instance
   */
  orderBy(field, direction = 'ASC') {
    this._orderBy = { field, direction };
    return this;
  }

  /**
   * Add LIMIT clause
   * @param {number} limit - Maximum number of results
   * @returns {QueryBuilder} This builder instance
   */
  limit(limit) {
    this._limit = limit;
    return this;
  }

  /**
   * Add OFFSET clause
   * @param {number} offset - Number of results to skip
   * @returns {QueryBuilder} This builder instance
   */
  offset(offset) {
    this._offset = offset;
    return this;
  }

  /**
   * Execute the query
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<{success: boolean, results?: Array, error?: Error}>}
   */
  async execute(options = {}) {
    // Build filter from where conditions
    const filters = this._where.map(w => ({
      field: w.field,
      operator: w.operator === '=' ? 'eq' : 
                w.operator === '>' ? 'gt' : 
                w.operator === '<' ? 'lt' :
                w.operator === '>=' ? 'gte' :
                w.operator === '<=' ? 'lte' : 'eq',
      value: w.value
    }));

    const queryOptions = {
      namespace: options.namespace || 'default',
      limit: this._limit,
      offset: this._offset,
      sort: this._orderBy ? {
        field: this._orderBy.field,
        order: this._orderBy.direction.toLowerCase()
      } : undefined
    };

    return await this._storage.query(filters, queryOptions);
  }
}

