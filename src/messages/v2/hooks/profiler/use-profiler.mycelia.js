/**
 * useProfiler Hook
 * 
 * Provides performance profiling functionality to subsystems.
 * Tracks execution times, identifies bottlenecks, and generates performance reports.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Profiler facet
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { PerformanceEntry } from '../../models/profiler/performance-entry.mycelia.js';
import { PerformanceReport } from '../../models/profiler/performance-report.mycelia.js';
import { timeAsync, timeSync as timeSyncUtil, generateTextReport } from '../../models/profiler/profiler.utils.mycelia.js';

export const useProfiler = createHook({
  kind: 'profiler',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.profiler || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useProfiler ${name}`);

    // Performance entries storage
    const entries = []; // Array<PerformanceEntry>
    const activeEntries = new Map(); // Map<string, PerformanceEntry> for in-progress entries
    const maxEntries = config.maxEntries || 10000; // Maximum entries to keep
    let enabled = config.enabled !== false; // Enabled by default (mutable)

    /**
     * Start timing an operation
     * @param {string} operationName - Operation name
     * @param {Object} [metadata={}] - Optional metadata
     * @param {string} [category='operation'] - Entry category
     * @returns {string} Entry ID for finishing the operation
     */
    function start(operationName, metadata = {}, category = 'operation') {
      if (!enabled) {
        return null;
      }

      const entryId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const entry = new PerformanceEntry(operationName, Date.now(), null, metadata, category);
      activeEntries.set(entryId, entry);
      
      if (debug) {
        logger.log(`Started profiling: ${operationName} [${entryId}]`);
      }
      
      return entryId;
    }

    /**
     * Finish timing an operation
     * @param {string} entryId - Entry ID returned from start()
     * @param {Object} [metadata={}] - Additional metadata to add
     * @returns {PerformanceEntry|null} Performance entry or null if not found
     */
    function finish(entryId, metadata = {}) {
      if (!enabled || !entryId) {
        return null;
      }

      const entry = activeEntries.get(entryId);
      if (!entry) {
        if (debug) {
          logger.warn(`Profiler entry not found: ${entryId}`);
        }
        return null;
      }

      entry.finish();
      entry.updateMetadata(metadata);
      activeEntries.delete(entryId);
      
      // Add to entries array
      entries.push(entry);
      
      // Trim entries if over limit
      if (entries.length > maxEntries) {
        entries.shift(); // Remove oldest entries
      }
      
      if (debug) {
        logger.log(`Finished profiling: ${entry.getName()} - ${entry.getDuration()}ms [${entryId}]`);
      }
      
      return entry;
    }

    /**
     * Time an async function
     * @param {string} operationName - Operation name
     * @param {Function} fn - Async function to time
     * @param {Object} [metadata={}] - Optional metadata
     * @param {string} [category='operation'] - Entry category
     * @returns {Promise<*>} Function result
     */
    async function time(operationName, fn, metadata = {}, category = 'operation') {
      if (!enabled) {
        return await fn();
      }

      const { result, entry } = await timeAsync(operationName, fn, metadata, category);
      entries.push(entry);
      
      // Trim entries if over limit
      if (entries.length > maxEntries) {
        entries.shift();
      }
      
      if (debug) {
        logger.log(`Timed operation: ${operationName} - ${entry.getDuration()}ms`);
      }
      
      return result;
    }

    /**
     * Time a synchronous function
     * @param {string} operationName - Operation name
     * @param {Function} fn - Function to time
     * @param {Object} [metadata={}] - Optional metadata
     * @param {string} [category='operation'] - Entry category
     * @returns {*} Function result
     */
    function timeSync(operationName, fn, metadata = {}, category = 'operation') {
      if (!enabled) {
        return fn();
      }

      const { result, entry } = timeSyncUtil(operationName, fn, metadata, category);
      entries.push(entry);
      
      // Trim entries if over limit
      if (entries.length > maxEntries) {
        entries.shift();
      }
      
      if (debug) {
        logger.log(`Timed sync operation: ${operationName} - ${entry.getDuration()}ms`);
      }
      
      return result;
    }

    /**
     * Get current performance report
     * @param {Object} [options={}] - Report options
     * @returns {PerformanceReport} Performance report
     */
    function getReport(options = {}) {
      return new PerformanceReport(entries, {
        subsystem: name,
        ...options
      });
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    function getStats() {
      const report = getReport();
      return report.getSummary();
    }

    /**
     * Identify bottlenecks
     * @param {number} [limit=10] - Maximum number of bottlenecks
     * @param {number} [threshold] - Minimum duration threshold
     * @returns {Array<Object>} Bottleneck information
     */
    function getBottlenecks(limit = 10, threshold = null) {
      const report = getReport();
      return report.identifyBottlenecks(limit, threshold);
    }

    /**
     * Generate text report
     * @param {Object} [options={}] - Report options
     * @returns {string} Text report
     */
    function getTextReport(options = {}) {
      const report = getReport();
      return generateTextReport(report, options);
    }

    /**
     * Clear all performance entries
     */
    function clear() {
      entries.length = 0;
      activeEntries.clear();
      if (debug) {
        logger.log('Cleared all performance entries');
      }
    }

    /**
     * Get all entries
     * @returns {Array<PerformanceEntry>} All performance entries
     */
    function getEntries() {
      return [...entries];
    }

    /**
     * Get entries by name
     * @param {string} operationName - Operation name
     * @returns {Array<PerformanceEntry>} Matching entries
     */
    function getEntriesByName(operationName) {
      return entries.filter(entry => entry.getName() === operationName);
    }

    /**
     * Get entries by category
     * @param {string} category - Entry category
     * @returns {Array<PerformanceEntry>} Matching entries
     */
    function getEntriesByCategory(category) {
      return entries.filter(entry => entry.getCategory() === category);
    }

    /**
     * Check if profiler is enabled
     * @returns {boolean} True if enabled
     */
    function isEnabled() {
      return enabled;
    }

    /**
     * Enable or disable profiler
     * @param {boolean} value - Enable/disable flag
     */
    function setEnabled(value) {
      enabled = value;
      config.enabled = value;
      if (debug) {
        logger.log(`Profiler ${value ? 'enabled' : 'disabled'}`);
      }
    }

    return new Facet('profiler', { attach: true, source: import.meta.url })
      .add({
        start,
        finish,
        time,
        timeSync,
        getReport,
        getStats,
        getBottlenecks,
        getTextReport,
        clear,
        getEntries,
        getEntriesByName,
        getEntriesByCategory,
        isEnabled,
        setEnabled
      });
  }
});

