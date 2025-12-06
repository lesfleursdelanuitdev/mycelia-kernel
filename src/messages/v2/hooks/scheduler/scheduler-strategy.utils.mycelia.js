/**
 * Scheduler Strategy Utilities
 * 
 * Handles strategy registration, validation, and selection for message scheduling.
 */

import { 
  DEFAULT_MESSAGE_STRATEGIES, 
  getMessageStrategyNames, 
  validateMessageStrategyOptions 
} from './message-scheduling-strategies.mycelia.js';

/**
 * Create a strategy registry with default strategies
 * 
 * @returns {Map} Strategy registry
 */
export function createStrategyRegistry() {
  return new Map(DEFAULT_MESSAGE_STRATEGIES);
}

/**
 * Register a new message scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} name - Strategy name
 * @param {Function} strategyFunction - Strategy function
 * @param {boolean} debug - Enable debug logging
 * @param {string} subsystemName - Subsystem name for logging
 * @throws {Error} If strategy is not a function
 */
export function registerStrategy(strategies, name, strategyFunction, debug, subsystemName) {
  if (typeof strategyFunction !== 'function') {
    throw new Error('Strategy must be a function');
  }
  
  strategies.set(name, strategyFunction);
  
  if (debug) {
    console.log(`SubsystemScheduler ${subsystemName}: Registered strategy '${name}'`);
  }
}

/**
 * Unregister a message scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} name - Strategy name
 * @param {boolean} debug - Enable debug logging
 * @param {string} subsystemName - Subsystem name for logging
 * @returns {boolean} True if strategy was removed
 * @throws {Error} If trying to unregister default priority strategy
 */
export function unregisterStrategy(strategies, name, debug, subsystemName) {
  if (name === 'priority') {
    throw new Error('Cannot unregister default priority strategy');
  }
  
  const removed = strategies.delete(name);
  
  if (debug && removed) {
    console.log(`SubsystemScheduler ${subsystemName}: Unregistered strategy '${name}'`);
  }
  
  return removed;
}

/**
 * Set the current message scheduling strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {Object} options - Scheduler options (will be modified)
 * @param {string} name - Strategy name
 * @param {Object} strategyOptions - Strategy-specific options
 * @param {boolean} debug - Enable debug logging
 * @param {string} subsystemName - Subsystem name for logging
 * @throws {Error} If strategy is unknown or options are invalid
 */
export function setStrategy(strategies, options, name, strategyOptions, debug, subsystemName) {
  if (!strategies.has(name)) {
    throw new Error(`Unknown strategy: ${name}. Available: ${Array.from(strategies.keys()).join(', ')}`);
  }
  
  // Validate strategy options
  const validation = validateMessageStrategyOptions(name, strategyOptions);
  if (!validation.valid) {
    throw new Error(`Invalid options for strategy '${name}': ${validation.errors.join(', ')}`);
  }
  
  options.schedulingStrategy = name;
  options.strategyOptions = strategyOptions;
  
  if (debug) {
    console.log(`SubsystemScheduler ${subsystemName}: Set strategy to '${name}' with options:`, strategyOptions);
  }
}

/**
 * Get available strategy names
 * 
 * @param {Map} strategies - Strategy registry
 * @returns {Array<string>} Array of strategy names
 */
export function getAvailableStrategies(strategies) {
  return Array.from(strategies.keys());
}

/**
 * Select next message using the configured strategy
 * 
 * @param {Map} strategies - Strategy registry
 * @param {string} strategyName - Current strategy name
 * @param {Array} messages - Available messages
 * @param {Object} strategyOptions - Strategy options
 * @param {boolean} debug - Enable debug logging
 * @param {string} subsystemName - Subsystem name for logging
 * @param {Object} stats - Statistics object (for error tracking)
 * @returns {Message|null} Selected message
 */
export function selectNextMessage(strategies, strategyName, messages, strategyOptions, debug, subsystemName, stats) {
  const strategy = strategies.get(strategyName);
  
  if (!strategy) {
    if (debug) {
      console.warn(`SubsystemScheduler ${subsystemName}: Unknown strategy '${strategyName}', falling back to priority`);
    }
    return strategies.get('priority')(messages, strategyOptions);
  }
  
  try {
    return strategy(messages, strategyOptions);
  } catch (error) {
    if (stats) stats.processingErrors++;
    if (debug) {
      console.error(`SubsystemScheduler ${subsystemName}: Error in strategy '${strategyName}':`, error);
    }
    // Fallback to priority strategy
    return strategies.get('priority')(messages, strategyOptions);
  }
}





