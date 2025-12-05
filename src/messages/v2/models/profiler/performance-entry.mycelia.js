/**
 * PerformanceEntry
 * 
 * Represents a single performance measurement entry.
 * Tracks execution time, operation name, and metadata for performance profiling.
 */
export class PerformanceEntry {
  #name;
  #startTime;
  #endTime;
  #duration;
  #metadata;
  #category;

  /**
   * Create a new PerformanceEntry
   * 
   * @param {string} name - Operation name (e.g., "message.process", "route.handler")
   * @param {number} startTime - Start timestamp in milliseconds
   * @param {number} [endTime] - End timestamp in milliseconds (optional for in-progress entries)
   * @param {Object} [metadata={}] - Optional metadata (traceId, subsystem, etc.)
   * @param {string} [category='operation'] - Entry category (operation, message, route, etc.)
   */
  constructor(name, startTime, endTime = null, metadata = {}, category = 'operation') {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('PerformanceEntry: name must be a non-empty string');
    }
    if (typeof startTime !== 'number' || startTime < 0) {
      throw new Error('PerformanceEntry: startTime must be a non-negative number');
    }

    this.#name = name.trim();
    this.#startTime = startTime;
    this.#endTime = endTime;
    this.#duration = endTime !== null ? endTime - startTime : null;
    this.#metadata = { ...metadata };
    this.#category = category;
  }

  /**
   * Get the operation name
   * @returns {string} Operation name
   */
  getName() {
    return this.#name;
  }

  /**
   * Get the start time
   * @returns {number} Start timestamp in milliseconds
   */
  getStartTime() {
    return this.#startTime;
  }

  /**
   * Get the end time
   * @returns {number|null} End timestamp in milliseconds or null if not finished
   */
  getEndTime() {
    return this.#endTime;
  }

  /**
   * Get the duration
   * @returns {number|null} Duration in milliseconds or null if not finished
   */
  getDuration() {
    return this.#duration;
  }

  /**
   * Check if the entry is complete
   * @returns {boolean} True if entry has both start and end times
   */
  isComplete() {
    return this.#endTime !== null;
  }

  /**
   * Finish the entry (set end time and calculate duration)
   * @param {number} [endTime] - End timestamp (defaults to current time)
   */
  finish(endTime = null) {
    if (this.#endTime !== null) {
      throw new Error('PerformanceEntry: entry is already finished');
    }
    this.#endTime = endTime !== null ? endTime : Date.now();
    this.#duration = this.#endTime - this.#startTime;
  }

  /**
   * Get metadata
   * @returns {Object} Metadata object
   */
  getMetadata() {
    return { ...this.#metadata };
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to merge
   */
  updateMetadata(metadata) {
    this.#metadata = { ...this.#metadata, ...metadata };
  }

  /**
   * Get category
   * @returns {string} Entry category
   */
  getCategory() {
    return this.#category;
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.#name,
      category: this.#category,
      startTime: this.#startTime,
      endTime: this.#endTime,
      duration: this.#duration,
      metadata: this.#metadata,
      isComplete: this.isComplete()
    };
  }
}



