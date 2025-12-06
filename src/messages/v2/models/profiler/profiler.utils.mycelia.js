import { PerformanceEntry } from './performance-entry.mycelia.js';
import { PerformanceReport } from './performance-report.mycelia.js';

/**
 * Profiler Utilities
 * 
 * Utility functions for performance profiling, bottleneck identification,
 * and report generation.
 */

/**
 * Calculate percentile from sorted array
 * @param {Array<number>} sortedArray - Sorted array of numbers
 * @param {number} percentile - Percentile (0-100)
 * @returns {number} Percentile value
 */
export function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) {
    return 0;
  }
  if (percentile <= 0) {
    return sortedArray[0];
  }
  if (percentile >= 100) {
    return sortedArray[sortedArray.length - 1];
  }
  
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(2);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generate a performance report from entries
 * @param {Array<PerformanceEntry>} entries - Performance entries
 * @param {Object} [options={}] - Report options
 * @returns {PerformanceReport} Performance report
 */
export function generateReport(entries, options = {}) {
  return new PerformanceReport(entries, options);
}

/**
 * Identify performance bottlenecks from entries
 * @param {Array<PerformanceEntry>} entries - Performance entries
 * @param {Object} [options={}] - Options
 * @param {number} [options.limit=10] - Maximum number of bottlenecks
 * @param {number} [options.threshold] - Minimum duration threshold
 * @returns {Array<Object>} Bottleneck information
 */
export function identifyBottlenecks(entries, options = {}) {
  const { limit = 10, threshold = null } = options;
  const report = new PerformanceReport(entries);
  return report.identifyBottlenecks(limit, threshold);
}

/**
 * Create a performance entry for timing an operation
 * @param {string} name - Operation name
 * @param {Object} [metadata={}] - Entry metadata
 * @param {string} [category='operation'] - Entry category
 * @returns {PerformanceEntry} Performance entry (not started)
 */
export function createEntry(name, metadata = {}, category = 'operation') {
  const startTime = Date.now();
  return new PerformanceEntry(name, startTime, null, metadata, category);
}

/**
 * Time an async function execution
 * @param {string} name - Operation name
 * @param {Function} fn - Async function to time
 * @param {Object} [metadata={}] - Entry metadata
 * @param {string} [category='operation'] - Entry category
 * @returns {Promise<{result: *, entry: PerformanceEntry}>} Result and performance entry
 */
export async function timeAsync(name, fn, metadata = {}, category = 'operation') {
  const entry = createEntry(name, metadata, category);
  try {
    const result = await fn();
    entry.finish();
    return { result, entry };
  } catch (error) {
    entry.finish();
    entry.updateMetadata({ error: error.message, errorType: error.constructor.name });
    throw error;
  }
}

/**
 * Time a synchronous function execution
 * @param {string} name - Operation name
 * @param {Function} fn - Function to time
 * @param {Object} [metadata={}] - Entry metadata
 * @param {string} [category='operation'] - Entry category
 * @returns {{result: *, entry: PerformanceEntry}} Result and performance entry
 */
export function timeSync(name, fn, metadata = {}, category = 'operation') {
  const entry = createEntry(name, metadata, category);
  try {
    const result = fn();
    entry.finish();
    return { result, entry };
  } catch (error) {
    entry.finish();
    entry.updateMetadata({ error: error.message, errorType: error.constructor.name });
    throw error;
  }
}

/**
 * Generate a text report from performance data
 * @param {PerformanceReport} report - Performance report
 * @param {Object} [options={}] - Report options
 * @returns {string} Text report
 */
export function generateTextReport(report, options = {}) {
  const { includeEntries = false, includeSlowest = true } = options;
  const summary = report.getSummary();
  const bottlenecks = report.identifyBottlenecks(10);
  const slowest = report.getSlowestEntries(5);

  let text = '=== Performance Report ===\n\n';
  text += `Time Range: ${new Date(summary.timeRange.start).toISOString()} - ${new Date(summary.timeRange.end).toISOString()}\n`;
  text += `Total Duration: ${formatDuration(summary.timeRange.duration)}\n`;
  text += `Total Entries: ${summary.totalEntries} (${summary.completedEntries} completed, ${summary.incompleteEntries} incomplete)\n`;
  text += `Operations Tracked: ${summary.operationCount}\n\n`;

  if (bottlenecks.length > 0) {
    text += '=== Top Bottlenecks ===\n';
    bottlenecks.forEach((bottleneck, index) => {
      text += `${index + 1}. ${bottleneck.operation}\n`;
      text += `   Average: ${formatDuration(bottleneck.averageDuration)}\n`;
      text += `   Max: ${formatDuration(bottleneck.maxDuration)}\n`;
      text += `   Count: ${bottleneck.count}\n`;
      text += `   Total: ${formatDuration(bottleneck.totalDuration)} (${bottleneck.percentage.toFixed(2)}%)\n`;
      text += `   P95: ${formatDuration(bottleneck.p95)}, P99: ${formatDuration(bottleneck.p99)}\n\n`;
    });
  }

  if (includeSlowest && slowest.length > 0) {
    text += '=== Slowest Individual Operations ===\n';
    slowest.forEach((entry, index) => {
      text += `${index + 1}. ${entry.getName()} (${entry.getCategory()})\n`;
      text += `   Duration: ${formatDuration(entry.getDuration())}\n`;
      text += `   Time: ${new Date(entry.getStartTime()).toISOString()}\n`;
      const metadata = entry.getMetadata();
      if (Object.keys(metadata).length > 0) {
        text += `   Metadata: ${JSON.stringify(metadata)}\n`;
      }
      text += '\n';
    });
  }

  if (includeEntries) {
    text += '=== All Entries ===\n';
    report.getEntries().forEach((entry, index) => {
      text += `${index + 1}. ${entry.getName()} - ${formatDuration(entry.getDuration() || 0)} - ${entry.isComplete() ? 'complete' : 'incomplete'}\n`;
    });
  }

  return text;
}




