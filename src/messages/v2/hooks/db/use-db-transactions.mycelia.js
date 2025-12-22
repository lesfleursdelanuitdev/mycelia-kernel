/**
 * useDBTransactions Hook
 * 
 * Provides transaction management functionality for database operations.
 */

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useDBTransactions = createHook({
  kind: 'transactions',
  version: '1.0.0',
  overwrite: false,
  required: ['storage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.transactions || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useDBTransactions ${name}`);

    // Find storage facet
    const storageResult = findFacet(api.__facets, 'storage');
    if (!storageResult) {
      throw new Error(`useDBTransactions ${name}: storage facet not found. useDBStorage must be added before useDBTransactions.`);
    }

    const storage = storageResult.facet;
    const defaultTimeout = config.defaultTimeout || 30000;

    return new Facet('transactions', { attach: true, source: import.meta.url })
      .add({
        /**
         * Begin a transaction
         * 
         * @param {Object} [options={}] - Transaction options
         * @param {Array<string>} [options.stores] - Object store names (for IndexedDB)
         * @param {string} [options.mode='readwrite'] - Transaction mode
         * @returns {Promise<{success: boolean, transactionId?: string, error?: Error}>}
         */
        async begin(options = {}) {
          try {
            if (!storage.beginTransaction) {
              return { success: false, error: new Error('Storage backend does not support transactions') };
            }

            const result = await storage.beginTransaction(options);
            if (result.success && logger.debug) {
              logger.log(`Transaction begun: ${result.transactionId}`);
            }
            return result;
          } catch (error) {
            logger.error('Begin transaction error:', error);
            return { success: false, error };
          }
        },

        /**
         * Commit a transaction
         * 
         * @param {string} transactionId - Transaction ID
         * @param {Object} [options={}] - Commit options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async commit(transactionId, options = {}) {
          try {
            if (!storage.commit) {
              return { success: false, error: new Error('Storage backend does not support transactions') };
            }

            const result = await storage.commit(transactionId, options);
            if (result.success && logger.debug) {
              logger.log(`Transaction committed: ${transactionId}`);
            }
            return result;
          } catch (error) {
            logger.error('Commit transaction error:', error);
            return { success: false, error };
          }
        },

        /**
         * Rollback a transaction
         * 
         * @param {string} transactionId - Transaction ID
         * @param {Object} [options={}] - Rollback options
         * @returns {Promise<{success: boolean, error?: Error}>}
         */
        async rollback(transactionId, options = {}) {
          try {
            if (!storage.rollback) {
              return { success: false, error: new Error('Storage backend does not support transactions') };
            }

            const result = await storage.rollback(transactionId, options);
            if (result.success && logger.debug) {
              logger.log(`Transaction rolled back: ${transactionId}`);
            }
            return result;
          } catch (error) {
            logger.error('Rollback transaction error:', error);
            return { success: false, error };
          }
        },

        // Configuration
        _config: config,
        _defaultTimeout: defaultTimeout,
        logger
      });
  }
});

