import { 
  getMessageStrategyNames
} from './message-scheduling-strategies.mycelia.js';
import {
  createStrategyRegistry,
  registerStrategy as registerStrategyUtil,
  unregisterStrategy as unregisterStrategyUtil,
  setStrategy as setStrategyUtil,
  getAvailableStrategies,
  selectNextMessage as selectNextMessageUtil
} from './scheduler-strategy.utils.mycelia.js';
import {
  createStatistics,
  updateStatistics,
  getStatistics as getStatisticsUtil,
  clearStatistics
} from './scheduler-statistics.utils.mycelia.js';
import {
  getAvailableMessages,
  calculateQueueUtilization,
  processMessage
} from './scheduler-processing.utils.mycelia.js';

/**
 * SubsystemScheduler Class
 * 
 * Base class for message processing within a subsystem using configurable scheduling strategies.
 * Provides a pluggable strategy system for selecting which messages to process next,
 * enabling flexible and efficient message processing within subsystems.
 * 
 * @example
 * // Create scheduler with priority strategy
 * const scheduler = new SubsystemScheduler(subsystem, {
 *   schedulingStrategy: 'priority',
 *   maxMessagesPerSlice: 10,
 *   debug: true
 * });
 * 
 * @example
 * // Use different core strategies
 * scheduler.setStrategy('fifo');        // First in, first out
 * scheduler.setStrategy('load-based');   // Simple messages first
 * scheduler.setStrategy('adaptive');    // Dynamic based on queue utilization
 * 
 * @example
 * // Process messages during time slice
 * const result = await scheduler.process(50); // 50ms time slice
 * console.log(`Processed ${result.processed} messages`);
 */
export class SubsystemScheduler {
  /**
   * Create a new SubsystemScheduler instance
   * 
   * @param {BaseSubsystem} subsystem - The subsystem this scheduler manages
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.schedulingStrategy='priority'] - Message scheduling strategy
   *   - 'priority': Atomic messages first, then by timestamp (default)
   *   - 'fifo': First in, first out (oldest messages first)
   *   - 'load-based': Simple messages first (lowest complexity)
   *   - 'adaptive': Dynamic switching based on queue utilization
   * @param {number} [options.maxMessagesPerSlice=10] - Maximum messages to process per time slice
   * @param {boolean} [options.debug=false] - Enable debug logging
   * 
   * @example
   * // Basic scheduler
   * const scheduler = new SubsystemScheduler(subsystem);
   * 
   * @example
   * // Configured scheduler
   * const scheduler = new SubsystemScheduler(subsystem, {
   *   schedulingStrategy: 'fifo',
   *   maxMessagesPerSlice: 20,
   *   debug: true
   * });
   */
  constructor(subsystem, options = {}) {
    this.subsystem = subsystem;
    this.options = {
      schedulingStrategy: options.schedulingStrategy || 'priority',
      maxMessagesPerSlice: options.maxMessagesPerSlice || 10,
      debug: options.debug || false,
      ...options
    };
    
    this.debug = options.debug || false;
    
    // Strategy registry - start with default strategies
    this.strategies = createStrategyRegistry();
    
    // Scheduling state
    this.currentIndex = 0;
    this.lastProcessed = {}; // For LRU strategy
    
    // Basic statistics
    this.stats = createStatistics();
    
    if (this.debug) {
      console.log(`SubsystemScheduler for ${subsystem.name}: Initialized with strategy '${this.options.schedulingStrategy}'`);
      console.log(`SubsystemScheduler: Available strategies:`, getMessageStrategyNames());
    }
  }

  /**
   * Process messages during a time slice using the configured strategy
   * 
   * @param {number} timeSlice - Available processing time in ms
   * @returns {Promise<Object>} Processing result
   * @returns {number} result.processed - Number of messages processed
   * @returns {number} result.processingTime - Time spent processing
   * @returns {number} result.errors - Number of processing errors
   * 
   * @example
   * const result = await scheduler.process(50);
   * console.log(`Processed ${result.processed} messages in ${result.processingTime}ms`);
   */
  async process(timeSlice) {
    const startTime = Date.now();
    let processed = 0;
    let errors = 0;
    
    try {
      // Get messages from subsystem queue
      let messages = getAvailableMessages(this.subsystem);
      if (messages.length === 0) {
        return { processed: 0, processingTime: 0, errors: 0 };
      }
      
      // Limit messages per slice (use initial count)
      const maxMessages = Math.min(messages.length, this.options.maxMessagesPerSlice);
      
      for (let i = 0; i < maxMessages; i++) {
        // Check if we have time remaining
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeSlice) {
          if (this.debug) {
            console.log(`SubsystemScheduler ${this.subsystem.name}: Time slice exhausted after ${elapsed}ms`);
          }
          break;
        }
        
        // Refresh messages list to get current queue state
        messages = getAvailableMessages(this.subsystem);
        if (messages.length === 0) break;
        
        // Select next message-options pair using strategy
        const pair = this.selectNextMessage(messages);
        if (!pair || !pair.msg) break;
        
        // Remove selected pair from the messages array to avoid selecting it again
        const pairIndex = messages.indexOf(pair);
        if (pairIndex !== -1) {
          messages.splice(pairIndex, 1);
        }
        
        try {
          // Process the pair (extracts msg and options)
          await processMessage(this.subsystem, pair, this.debug);
          
          // Track processing for LRU strategy
          this.lastProcessed[pair.msg.getId()] = Date.now();
          
          processed++;
          
          if (this.debug) {
            console.log(`SubsystemScheduler ${this.subsystem.name}: Processed message ${pair.msg.getId()}`);
          }
        } catch (error) {
          errors++;
          this.stats.processingErrors++;
          
          if (this.debug) {
            console.error(`SubsystemScheduler ${this.subsystem.name}: Error processing message ${pair.msg.getId()}:`, error);
          }
        }
      }
      
      // Update statistics
      const processingTime = Date.now() - startTime;
      updateStatistics(this.stats, processed, processingTime);
      
      return { processed, processingTime, errors };
      
    } catch (error) {
      this.stats.processingErrors++;
      if (this.debug) {
        console.error(`SubsystemScheduler ${this.subsystem.name}: Error in process():`, error);
      }
      throw error;
    }
  }

  /**
   * Select next message using the configured strategy
   * @param {Array<Message>} messages - Available messages
   * @returns {Message|null} Selected message
   */
  selectNextMessage(messages) {
    return selectNextMessageUtil(
      this.strategies,
      this.options.schedulingStrategy,
      messages,
      this.getStrategyOptions(),
      this.debug,
      this.subsystem.name,
      this.stats
    );
  }

  /**
   * Get options object for strategy functions
   * @returns {Object} Strategy options
   */
  getStrategyOptions() {
    return {
      currentIndex: this.currentIndex,
      maxMessagesPerSlice: this.options.maxMessagesPerSlice,
      queueUtilization: calculateQueueUtilization(this.subsystem),
      subsystemStats: this.getStatistics(),
      lastProcessed: this.lastProcessed,
      onSelection: (newIndex) => { this.currentIndex = newIndex; }
    };
  }

  /**
   * Register a new message scheduling strategy
   * @param {string} name - Strategy name
   * @param {Function} strategyFunction - Strategy function
   * @example
   * scheduler.registerStrategy('my-custom', (messages, options) => {
   *   // Custom strategy logic
   *   return messages[0];
   * });
   */
  registerStrategy(name, strategyFunction) {
    registerStrategyUtil(this.strategies, name, strategyFunction, this.debug, this.subsystem.name);
  }

  /**
   * Unregister a message scheduling strategy
   * @param {string} name - Strategy name
   * @example
   * scheduler.unregisterStrategy('my-custom');
   */
  unregisterStrategy(name) {
    return unregisterStrategyUtil(this.strategies, name, this.debug, this.subsystem.name);
  }

  /**
   * Set the current message scheduling strategy
   * @param {string} name - Strategy name
   * @param {Object} [options={}] - Strategy-specific options
   * @example
   * scheduler.setStrategy('load-based', { complexityEstimator: (msg) => msg.getBody().size });
   */
  setStrategy(name, options = {}) {
    setStrategyUtil(this.strategies, this.options, name, options, this.debug, this.subsystem.name);
  }

  /**
   * Get available strategy names
   * @returns {Array<string>} Array of strategy names
   * @example
   * const strategies = scheduler.getAvailableStrategies();
   * console.log('Available strategies:', strategies);
   */
  getAvailableStrategies() {
    return getAvailableStrategies(this.strategies);
  }

  /**
   * Get current strategy name
   * @returns {string} Current strategy name
   * @example
   * const current = scheduler.getCurrentStrategy();
   * console.log('Current strategy:', current);
   */
  getCurrentStrategy() {
    return this.options.schedulingStrategy;
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return getStatisticsUtil(
      this.stats,
      this.subsystem,
      this.options.schedulingStrategy,
      this.getAvailableStrategies(),
      calculateQueueUtilization(this.subsystem),
      this.options
    );
  }

  /**
   * Clear statistics and reset state
   */
  clear() {
    clearStatistics(this.stats, { currentIndex: this.currentIndex, lastProcessed: this.lastProcessed }, this.debug, this.subsystem.name);
    this.currentIndex = 0;
    this.lastProcessed = {};
  }
}
