/**
 * SubsystemStatistics Class
 * 
 * Manages statistics tracking for subsystems. Provides a centralized,
 * consistent interface for recording and querying subsystem performance metrics.
 * 
 * @example
 * // Used internally by BaseSubsystem
 * const stats = new SubsystemStatistics(debug);
 * stats.recordAccepted();
 * stats.recordProcessed(5.2); // 5.2ms processing time
 * const avgTime = stats.getAverageProcessingTime();
 * 
 * @example
 * // Get all statistics
 * const allStats = stats.getStats();
 * console.log(`Messages processed: ${allStats.messagesProcessed}`);
 */
export class SubsystemStatistics {
  /**
   * Create a new SubsystemStatistics instance
   * 
   * @param {boolean} [debug=false] - Enable debug logging
   * 
   * @example
   * const stats = new SubsystemStatistics(true);
   */
  constructor(debug = false) {
    this.debug = debug || false;
    this.reset();
  }

  /**
   * Reset all statistics to zero
   * 
   * @example
   * stats.reset();
   */
  reset() {
    this.stats = {
      messagesAccepted: 0,
      messagesProcessed: 0,
      processingErrors: 0,
      queueFullEvents: 0,
      timeSlicesReceived: 0,
      totalProcessingTime: 0
    };
    
    if (this.debug) {
      console.log('SubsystemStatistics: Statistics reset');
    }
  }

  /**
   * Record that a message was accepted into the queue
   * 
   * @example
   * stats.recordAccepted();
   */
  recordAccepted() {
    this.stats.messagesAccepted++;
    
    if (this.debug) {
      console.log(`SubsystemStatistics: Message accepted (total: ${this.stats.messagesAccepted})`);
    }
  }

  /**
   * Record that a message was processed successfully
   * 
   * @param {number} [processingTime=0] - Processing time in milliseconds
   * 
   * @example
   * stats.recordProcessed(5.2); // Message processed in 5.2ms
   */
  recordProcessed(processingTime = 0) {
    this.stats.messagesProcessed++;
    this.stats.totalProcessingTime += processingTime;
    
    if (this.debug) {
      console.log(`SubsystemStatistics: Message processed (total: ${this.stats.messagesProcessed}, time: ${processingTime}ms)`);
    }
  }

  /**
   * Record that a processing error occurred
   * 
   * @example
   * stats.recordError();
   */
  recordError() {
    this.stats.processingErrors++;
    
    if (this.debug) {
      console.log(`SubsystemStatistics: Processing error recorded (total: ${this.stats.processingErrors})`);
    }
  }

  /**
   * Record that the queue became full
   * 
   * @example
   * stats.recordQueueFull();
   */
  recordQueueFull() {
    this.stats.queueFullEvents++;
    
    if (this.debug) {
      console.log(`SubsystemStatistics: Queue full event recorded (total: ${this.stats.queueFullEvents})`);
    }
  }

  /**
   * Record that a time slice was received
   * 
   * @example
   * stats.recordTimeSlice();
   */
  recordTimeSlice() {
    this.stats.timeSlicesReceived++;
    
    if (this.debug) {
      console.log(`SubsystemStatistics: Time slice received (total: ${this.stats.timeSlicesReceived})`);
    }
  }

  /**
   * Get all statistics as a copy
   * 
   * @returns {Object} Copy of statistics object
   * 
   * @example
   * const stats = statistics.getStats();
   * console.log(`Accepted: ${stats.messagesAccepted}, Processed: ${stats.messagesProcessed}`);
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get average processing time per message
   * 
   * @returns {number} Average processing time in milliseconds
   * 
   * @example
   * const avgTime = statistics.getAverageProcessingTime();
   * console.log(`Average processing time: ${avgTime}ms`);
   */
  getAverageProcessingTime() {
    return this.stats.messagesProcessed > 0
      ? this.stats.totalProcessingTime / this.stats.messagesProcessed
      : 0;
  }

  /**
   * Get a specific statistic value
   * 
   * @param {string} key - Statistic key (e.g., 'messagesAccepted', 'messagesProcessed')
   * @returns {number} Statistic value or 0 if not found
   * 
   * @example
   * const accepted = statistics.get('messagesAccepted');
   */
  get(key) {
    return this.stats[key] || 0;
  }

  /**
   * Increment a specific statistic
   * 
   * @param {string} key - Statistic key
   * @param {number} [amount=1] - Amount to increment by
   * 
   * @example
   * statistics.increment('messagesAccepted');
   * statistics.increment('totalProcessingTime', 5.2);
   */
  increment(key, amount = 1) {
    if (this.stats.hasOwnProperty(key)) {
      this.stats[key] += amount;
      
      if (this.debug) {
        console.log(`SubsystemStatistics: Incremented ${key} by ${amount} (now: ${this.stats[key]})`);
      }
    } else if (this.debug) {
      console.warn(`SubsystemStatistics: Unknown statistic key: ${key}`);
    }
  }

  /**
   * Set a specific statistic value
   * 
   * @param {string} key - Statistic key
   * @param {number} value - Value to set
   * 
   * @example
   * statistics.set('messagesAccepted', 100);
   */
  set(key, value) {
    if (this.stats.hasOwnProperty(key)) {
      this.stats[key] = value;
      
      if (this.debug) {
        console.log(`SubsystemStatistics: Set ${key} to ${value}`);
      }
    } else if (this.debug) {
      console.warn(`SubsystemStatistics: Unknown statistic key: ${key}`);
    }
  }

  /**
   * Check if debug logging is enabled
   * @returns {boolean} True if debug is enabled
   */
  isDebugEnabled() {
    return this.debug;
  }

  /**
   * Set debug logging
   * @param {boolean} debug - Enable or disable debug logging
   */
  setDebug(debug) {
    this.debug = debug || false;
  }
}

