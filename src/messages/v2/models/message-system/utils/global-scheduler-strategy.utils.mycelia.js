/**
 * Global Scheduler Strategy Utilities
 * 
 * Handles strategy registration, validation, and selection for global scheduling.
 */

import { 
  DEFAULT_STRATEGIES, 
  getStrategyNames, 
  validateStrategyOptions 
} from './global-scheduling-strategies.utils.mycelia.js';

/**
 * Create a strategy registry with default strategies
 * 
 * @returns {Map} Strategy registry
 */
export function createStrategyRegistry() {
  return new Map(DEFAULT_STRATEGIES);
}

/**
 * Register a new scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} name - Strategy name
 * @param {Function} strategyFunction - Strategy function
 * @param {boolean} debug - Enable debug logging
 * @throws {Error} If strategy is not a function
 */
export function registerStrategy(strategies, name, strategyFunction, debug) {
  if (typeof strategyFunction !== 'function') {
    throw new Error('Strategy must be a function');
  }
  
  strategies.set(name, strategyFunction);
  
  if (debug) {
    console.log(`GlobalScheduler: Registered strategy '${name}'`);
  }
}

/**
 * Unregister a scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} name - Strategy name
 * @param {boolean} debug - Enable debug logging
 * @returns {boolean} True if strategy was removed
 * @throws {Error} If trying to unregister default round-robin strategy
 */
export function unregisterStrategy(strategies, name, debug) {
  if (name === 'round-robin') {
    throw new Error('Cannot unregister default round-robin strategy');
  }
  
  const removed = strategies.delete(name);
  
  if (debug && removed) {
    console.log(`GlobalScheduler: Unregistered strategy '${name}'`);
  }
  
  return removed;
}

/**
 * Set the current scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {Object} options - Scheduler options (will be modified)
 * @param {string} name - Strategy name
 * @param {Object} strategyOptions - Strategy-specific options
 * @param {boolean} debug - Enable debug logging
 * @throws {Error} If strategy is unknown or options are invalid
 */
export function setStrategy(strategies, options, name, strategyOptions, debug) {
  if (!strategies.has(name)) {
    throw new Error(`Unknown strategy: ${name}. Available: ${Array.from(strategies.keys()).join(', ')}`);
  }
  
  // Validate strategy options
  const validation = validateStrategyOptions(name, strategyOptions);
  if (!validation.valid) {
    throw new Error(`Invalid options for strategy '${name}': ${validation.errors.join(', ')}`);
  }
  
  options.schedulingStrategy = name;
  options.strategyOptions = strategyOptions;
  
  if (debug) {
    console.log(`GlobalScheduler: Set strategy to '${name}' with options:`, strategyOptions);
  }
}

/**
 * Select next subsystem based on scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} strategyName - Current strategy name
 * @param {Array} subsystems - Available subsystems
 * @param {Object} strategyOptions - Strategy options
 * @param {boolean} debug - Enable debug logging
 * @param {Object} stats - Statistics object (for error tracking)
 * @returns {BaseSubsystem} Selected subsystem
 */
export function selectNextSubsystem(strategies, strategyName, subsystems, strategyOptions, debug, stats) {
  const strategy = strategies.get(strategyName);
  
  if (!strategy) {
    if (debug) {
      console.warn(`GlobalScheduler: Unknown strategy '${strategyName}', falling back to round-robin`);
    }
    return strategies.get('round-robin')(subsystems, strategyOptions);
  }
  
  try {
    return strategy(subsystems, strategyOptions);
  } catch (error) {
    if (stats) stats.schedulingErrors++;
    if (debug) {
      console.error(`GlobalScheduler: Error in strategy '${strategyName}':`, error);
    }
    // Fallback to round-robin
    return strategies.get('round-robin')(subsystems, strategyOptions);
  }
}





