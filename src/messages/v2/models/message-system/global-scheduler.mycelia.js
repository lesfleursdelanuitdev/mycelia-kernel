import { 
  getStrategyNames
} from './utils/global-scheduling-strategies.utils.mycelia.js';
import {
  createStrategyRegistry,
  registerStrategy as registerStrategyUtil,
  unregisterStrategy as unregisterStrategyUtil,
  setStrategy as setStrategyUtil,
  selectNextSubsystem as selectNextSubsystemUtil
} from './utils/global-scheduler-strategy.utils.mycelia.js';
import {
  createStatistics,
  getStatistics as getStatisticsUtil,
  getSubsystemStatistics,
  clearStatistics
} from './utils/global-scheduler-statistics.utils.mycelia.js';
import {
  calculateAverageUtilization,
  allocateTimeSlice
} from './utils/global-scheduler-processing.utils.mycelia.js';

/**
 * GlobalScheduler Class
 * 
 * Manages time allocation between subsystems using configurable scheduling strategies.
 * Coordinates the overall system scheduling by allocating time slices to subsystems
 * and ensuring fair resource distribution across the entire message processing pipeline.
 * Uses a pluggable strategy system for flexible scheduling algorithms.
 * 
 * @example
 * // Create scheduler with round-robin strategy
 * const scheduler = new GlobalScheduler(messageSystem, {
 *   timeSliceDuration: 50,
 *   schedulingStrategy: 'round-robin',
 *   debug: true
 * });
 * 
 * @example
 * // Use different core strategies
 * scheduler.setStrategy('priority');     // Priority-based allocation
 * scheduler.setStrategy('load-based');    // Workload-based allocation
 * scheduler.setStrategy('adaptive');      // Dynamic strategy switching
 * 
 * @example
 * // Monitor scheduling performance
 * const stats = scheduler.getStatistics();
 * console.log('Scheduling stats:', stats);
 */
export class GlobalScheduler {
  /**
   * Create a new GlobalScheduler instance
   * 
   * @param {MessageSystem} messageSystem - The MessageSystem instance to schedule subsystems for
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.timeSliceDuration=50] - Duration of each time slice in milliseconds
   * @param {string} [options.schedulingStrategy='round-robin'] - Scheduling strategy
   *   - 'round-robin': Equal time allocation in circular order (default)
   *   - 'priority': Allocate time based on subsystem priority
   *   - 'load-based': Allocate more time to subsystems with more work
   *   - 'adaptive': Dynamically switches strategies based on system utilization
   * @param {boolean} [options.debug=false] - Enable debug logging
   * 
   * @example
   * // Basic scheduler
   * const scheduler = new GlobalScheduler(messageSystem);
   * 
   * @example
   * // Configured scheduler with priority-based scheduling
   * const scheduler = new GlobalScheduler(messageSystem, {
   *   timeSliceDuration: 100,
   *   schedulingStrategy: 'priority',
   *   debug: true
   * });
   * 
   * @example
   * // Load-based scheduler for high-throughput systems
   * const scheduler = new GlobalScheduler(messageSystem, {
   *   timeSliceDuration: 25,
   *   schedulingStrategy: 'load-based',
   *   debug: false
   * });
   */
  constructor(messageSystem, options = {}) {
    this.messageSystem = messageSystem;
    this.options = {
      timeSliceDuration: options.timeSliceDuration || 50, // ms per subsystem
      schedulingStrategy: options.schedulingStrategy || 'round-robin',
      debug: options.debug || false,
      ...options
    };
    
    this.debug = options.debug || false;
    
    // Strategy registry - start with default strategies
    this.strategies = createStrategyRegistry();
    
    // Scheduling state
    this.isRunning = false;
    this.currentSubsystemIndex = 0;
    this.schedulingCycle = 0;
    this.lastScheduled = {}; // For LRU strategy
    
    // Statistics
    this.stats = createStatistics();
    
    if (this.debug) {
      console.log(`GlobalScheduler: Initialized with ${this.options.timeSliceDuration}ms time slices`);
      console.log(`GlobalScheduler: Available strategies:`, getStrategyNames());
    }
  }

  /**
   * Start the global scheduling loop
   */
  start() {
    if (this.isRunning) {
      if (this.debug) {
        console.warn('GlobalScheduler: Already running');
      }
      return;
    }
    
    this.isRunning = true;
    this.scheduleNext();
    
    if (this.debug) {
      console.log('GlobalScheduler: Started scheduling');
    }
  }

  /**
   * Stop the global scheduling loop
   */
  stop() {
    this.isRunning = false;
    
    if (this.debug) {
      console.log('GlobalScheduler: Stopped scheduling');
    }
  }

  /**
   * Schedule the next subsystem
   */
  async scheduleNext() {
    if (!this.isRunning) return;
    
    // Get subsystems from MessageSystem
    const subsystems = this.messageSystem.getSubsystems();
    if (subsystems.length === 0) {
      // No subsystems, schedule next cycle
      setTimeout(() => this.scheduleNext(), this.options.timeSliceDuration);
      return;
    }
    
    // Get next subsystem based on strategy
    const subsystem = this.selectNextSubsystem(subsystems);
    
    if (subsystem) {
      await allocateTimeSlice(
        subsystem,
        this.options.timeSliceDuration,
        this.stats,
        this.lastScheduled,
        this.debug
      );
    }
    
    // Schedule next cycle
    setTimeout(() => this.scheduleNext(), this.options.timeSliceDuration);
  }

  /**
   * Select next subsystem based on scheduling strategy
   * @param {Array<BaseSubsystem>} subsystems - Available subsystems
   * @returns {BaseSubsystem} Selected subsystem
   */
  selectNextSubsystem(subsystems) {
    return selectNextSubsystemUtil(
      this.strategies,
      this.options.schedulingStrategy,
      subsystems,
      this.getStrategyOptions(),
      this.debug,
      this.stats
    );
  }

  /**
   * Get options object for strategy functions
   * @returns {Object} Strategy options
   */
  getStrategyOptions() {
    return {
      currentIndex: this.currentSubsystemIndex,
      schedulerStats: this.getStatistics(),
      averageUtilization: calculateAverageUtilization(this.messageSystem),
      lastScheduled: this.lastScheduled,
      onSelection: (newIndex) => { this.currentSubsystemIndex = newIndex; },
      onScheduled: (subsystemName) => { this.lastScheduled[subsystemName] = Date.now(); }
    };
  }

  /**
   * Register a new scheduling strategy
   * @param {string} name - Strategy name
   * @param {Function} strategyFunction - Strategy function
   * @example
   * scheduler.registerStrategy('my-custom', (subsystems, options) => {
   *   // Custom strategy logic
   *   return subsystems[0];
   * });
   */
  registerStrategy(name, strategyFunction) {
    registerStrategyUtil(this.strategies, name, strategyFunction, this.debug);
  }

  /**
   * Unregister a scheduling strategy
   * @param {string} name - Strategy name
   * @example
   * scheduler.unregisterStrategy('my-custom');
   */
  unregisterStrategy(name) {
    return unregisterStrategyUtil(this.strategies, name, this.debug);
  }

  /**
   * Set the current scheduling strategy
   * @param {string} name - Strategy name
   * @param {Object} [options={}] - Strategy-specific options
   * @example
   * scheduler.setStrategy('adaptive', { averageUtilization: 0.7 });
   */
  setStrategy(name, options = {}) {
    setStrategyUtil(this.strategies, this.options, name, options, this.debug);
  }

  /**
   * Get available strategy names
   * @returns {Array<string>} Array of strategy names
   * @example
   * const strategies = scheduler.getAvailableStrategies();
   * console.log('Available strategies:', strategies);
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
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
   * Get global scheduler statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return getStatisticsUtil(
      this.stats,
      this.isRunning,
      this.messageSystem,
      this.options.schedulingStrategy,
      this.getAvailableStrategies(),
      calculateAverageUtilization(this.messageSystem),
      this.options
    );
  }

  /**
   * Get statistics for all registered subsystems
   * @returns {Object} Subsystem statistics
   */
  getSubsystemStatistics() {
    return getSubsystemStatistics(this.messageSystem);
  }

  /**
   * Clear all statistics and reset state
   */
  clear() {
    clearStatistics(
      this.stats,
      {
        currentSubsystemIndex: this.currentSubsystemIndex,
        schedulingCycle: this.schedulingCycle,
        lastScheduled: this.lastScheduled
      },
      this.debug
    );
    this.currentSubsystemIndex = 0;
    this.schedulingCycle = 0;
    this.lastScheduled = {};
  }
}
