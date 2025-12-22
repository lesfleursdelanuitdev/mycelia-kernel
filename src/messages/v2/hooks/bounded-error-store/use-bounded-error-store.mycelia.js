/**
 * useBoundedErrorStore Hook
 * 
 * Provides bounded error store functionality to subsystems.
 * Wraps BoundedErrorStore and exposes error storage and querying methods.
 * 
 * @param {Object} ctx - Context object containing config.boundedErrorStore for store configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with error store methods
 */
import { BoundedErrorStore } from '../../models/kernel-subsystem/error-manager-subsystem/bounded-error-store.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';

export const useBoundedErrorStore = createHook({
  kind: 'boundedErrorStore',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, _subsystem) => {
    const config = ctx.config?.boundedErrorStore || {};
    
    // Get capacity from config or use default
    const capacity = config.capacity || 1000;
    
    // Create bounded error store instance
    const store = new BoundedErrorStore(capacity);
    
    return new Facet('boundedErrorStore', { attach: true, source: import.meta.url })
      .add({
        /**
         * Add an error record to the store
         * @param {ErrorRecord|Object} recordOrParams - ErrorRecord instance or constructor params
         * @returns {ErrorRecord} The stored ErrorRecord instance
         */
        add(recordOrParams) {
          return store.add(recordOrParams);
        },
        
        /**
         * Get an error record by ID
         * @param {string} id - Error record ID
         * @returns {ErrorRecord|null} Error record or null if not found
         */
        get(id) {
          return store.get(id);
        },
        
        /**
         * List error records with optional filtering
         * @param {Object} [options={}] - Filter options
         * @param {string|string[]} [options.type] - Error type(s) to include
         * @param {string|string[]} [options.severity] - Severity level(s) to include
         * @param {string|string[]} [options.subsystem] - Subsystem name(s) to include
         * @param {Date|string|number} [options.since] - Only include records at or after this timestamp
         * @param {number} [options.limit] - Max number of records to return
         * @returns {ErrorRecord[]} Matching records, oldest → newest
         */
        list(options = {}) {
          return store.list(options);
        },
        
        /**
         * Get the N most recent error records
         * @param {number} [limit=50] - Maximum number of records to return
         * @returns {ErrorRecord[]} Recent records, oldest → newest
         */
        recent(limit = 50) {
          return store.recent(limit);
        },
        
        /**
         * Get a summary of errors
         * @param {Object} [options={}] - Summary options
         * @param {Date|string|number} [options.since] - Only summarize errors at or after this timestamp
         * @returns {Object} Summary object with total, byType, bySeverity, timestamps
         */
        summarize(options = {}) {
          return store.summarize(options);
        },
        
        /**
         * Clear all error records
         */
        clear() {
          store.clear();
        },
        
        /**
         * Get current store size
         * @returns {number} Number of stored error records
         */
        get size() {
          return store.size;
        },
        
        /**
         * Get store capacity
         * @returns {number} Maximum capacity of the store
         */
        get capacity() {
          return store.capacity;
        },
        
        /**
         * Get all error records (copy)
         * @returns {ErrorRecord[]} All records, oldest → newest
         */
        get all() {
          return store.all;
        },
        
        // Expose store instance for internal use by other hooks
        _store: store
      });
  }
});

