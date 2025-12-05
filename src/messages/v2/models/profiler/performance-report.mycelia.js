import { PerformanceEntry } from './performance-entry.mycelia.js';

/**
 * PerformanceReport
 * 
 * Aggregates performance entries and provides analysis including:
 * - Total execution time
 * - Average execution time per operation
 * - Slowest operations (bottlenecks)
 * - Operation counts
 * - Percentiles
 */
export class PerformanceReport {
  #entries; // Array<PerformanceEntry>
  #startTime;
  #endTime;
  #metadata;

  /**
   * Create a new PerformanceReport
   * 
   * @param {Array<PerformanceEntry>} [entries=[]] - Performance entries
   * @param {Object} [metadata={}] - Report metadata (subsystem, timeRange, etc.)
   */
  constructor(entries = [], metadata = {}) {
    this.#entries = Array.isArray(entries) ? [...entries] : [];
    
    // Calculate time range from entries if provided, otherwise use metadata or current time
    if (this.#entries.length > 0) {
      const startTimes = this.#entries.map(e => e.getStartTime());
      const endTimes = this.#entries.map(e => e.getEndTime() || e.getStartTime());
      this.#startTime = metadata.startTime || Math.min(...startTimes);
      this.#endTime = metadata.endTime || Math.max(...endTimes);
    } else {
      this.#startTime = metadata.startTime || Date.now();
      this.#endTime = metadata.endTime || Date.now();
    }
    
    this.#metadata = { ...metadata };
  }

  /**
   * Add a performance entry
   * @param {PerformanceEntry} entry - Performance entry to add
   */
  addEntry(entry) {
    if (!(entry instanceof PerformanceEntry)) {
      throw new Error('PerformanceReport: entry must be a PerformanceEntry instance');
    }
    this.#entries.push(entry);
    
    // Update time range
    const entryStart = entry.getStartTime();
    const entryEnd = entry.getEndTime() || entryStart;
    
    // If this is the first entry, set time range to entry times
    // Otherwise, expand time range to include this entry
    if (this.#entries.length === 1) {
      this.#startTime = entryStart;
      this.#endTime = entryEnd;
    } else {
      if (entryStart < this.#startTime) {
        this.#startTime = entryStart;
      }
      if (entryEnd > this.#endTime) {
        this.#endTime = entryEnd;
      }
    }
  }

  /**
   * Get all entries
   * @returns {Array<PerformanceEntry>} Array of performance entries
   */
  getEntries() {
    return [...this.#entries];
  }

  /**
   * Get entries by name
   * @param {string} name - Operation name
   * @returns {Array<PerformanceEntry>} Matching entries
   */
  getEntriesByName(name) {
    return this.#entries.filter(entry => entry.getName() === name);
  }

  /**
   * Get entries by category
   * @param {string} category - Entry category
   * @returns {Array<PerformanceEntry>} Matching entries
   */
  getEntriesByCategory(category) {
    return this.#entries.filter(entry => entry.getCategory() === category);
  }

  /**
   * Get total duration (time range of all entries)
   * @returns {number} Total duration in milliseconds
   */
  getTotalDuration() {
    return this.#endTime - this.#startTime;
  }

  /**
   * Get total number of entries
   * @returns {number} Entry count
   */
  getEntryCount() {
    return this.#entries.length;
  }

  /**
   * Get completed entries only
   * @returns {Array<PerformanceEntry>} Completed entries
   */
  getCompletedEntries() {
    return this.#entries.filter(entry => entry.isComplete());
  }

  /**
   * Get statistics for a specific operation name
   * @param {string} name - Operation name
   * @returns {Object|null} Statistics object or null if no entries found
   */
  getOperationStats(name) {
    const entries = this.getEntriesByName(name).filter(e => e.isComplete());
    if (entries.length === 0) {
      return null;
    }

    const durations = entries.map(e => e.getDuration()).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      name,
      count: entries.length,
      total: sum,
      average: avg,
      min,
      max,
      median,
      p95,
      p99
    };
  }

  /**
   * Get all operation statistics
   * @returns {Object<string, Object>} Map of operation name to statistics
   */
  getAllOperationStats() {
    const stats = {};
    const operationNames = new Set(this.#entries.map(e => e.getName()));
    
    for (const name of operationNames) {
      const stat = this.getOperationStats(name);
      if (stat) {
        stats[name] = stat;
      }
    }
    
    return stats;
  }

  /**
   * Identify bottlenecks (slowest operations)
   * @param {number} [limit=10] - Maximum number of bottlenecks to return
   * @param {number} [threshold] - Minimum duration threshold (optional)
   * @returns {Array<Object>} Array of bottleneck objects sorted by average duration (descending)
   */
  identifyBottlenecks(limit = 10, threshold = null) {
    const stats = this.getAllOperationStats();
    const bottlenecks = Object.values(stats)
      .filter(stat => threshold === null || stat.average >= threshold)
      .sort((a, b) => b.average - a.average)
      .slice(0, limit)
      .map(stat => ({
        operation: stat.name,
        averageDuration: stat.average,
        maxDuration: stat.max,
        count: stat.count,
        totalDuration: stat.total,
        percentage: (stat.total / this.getTotalDuration()) * 100,
        p95: stat.p95,
        p99: stat.p99
      }));

    return bottlenecks;
  }

  /**
   * Get slowest entries
   * @param {number} [limit=10] - Maximum number of entries to return
   * @returns {Array<PerformanceEntry>} Slowest entries sorted by duration (descending)
   */
  getSlowestEntries(limit = 10) {
    return this.getCompletedEntries()
      .sort((a, b) => b.getDuration() - a.getDuration())
      .slice(0, limit);
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const completed = this.getCompletedEntries();
    const totalDuration = this.getTotalDuration();
    const operationStats = this.getAllOperationStats();
    const bottlenecks = this.identifyBottlenecks(5);

    return {
      totalEntries: this.#entries.length,
      completedEntries: completed.length,
      incompleteEntries: this.#entries.length - completed.length,
      timeRange: {
        start: this.#startTime,
        end: this.#endTime,
        duration: totalDuration
      },
      operationCount: Object.keys(operationStats).length,
      topBottlenecks: bottlenecks,
      metadata: this.#metadata
    };
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      summary: this.getSummary(),
      operations: this.getAllOperationStats(),
      bottlenecks: this.identifyBottlenecks(),
      slowestEntries: this.getSlowestEntries(10).map(e => e.toJSON()),
      entries: this.#entries.map(e => e.toJSON()),
      metadata: this.#metadata
    };
  }

  /**
   * Clear all entries
   */
  clear() {
    this.#entries = [];
    this.#startTime = Date.now();
    this.#endTime = Date.now();
  }
}

