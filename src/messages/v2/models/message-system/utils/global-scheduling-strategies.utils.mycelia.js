/**
 * Global Scheduling Strategies
 * 
 * A collection of core scheduling strategy functions for the GlobalScheduler.
 * Each strategy is a pure function that takes subsystems and options,
 * and returns the selected subsystem to schedule next.
 * 
 * @fileoverview Core scheduling strategy implementations for message-driven systems
 */

/**
 * Round-robin scheduling strategy
 * 
 * Cycles through subsystems in order, ensuring equal time allocation.
 * 
 * @param {Array<BaseSubsystem>} subsystems - Available subsystems
 * @param {Object} [options={}] - Strategy options
 * @param {number} [options.currentIndex=0] - Current round-robin index
 * @param {Function} [options.onSelection] - Callback to update index after selection
 * @returns {BaseSubsystem} Selected subsystem
 * 
 * @example
 * const selected = roundRobinStrategy(subsystems, { currentIndex: 2 });
 */
export function roundRobinStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  // Handle null/undefined options
  const opts = options || {};
  
  const currentIndex = opts.currentIndex || 0;
  const selected = subsystems[currentIndex];
  
  // Update the index for next call
  if (opts.onSelection) {
    opts.onSelection((currentIndex + 1) % subsystems.length);
  }
  
  return selected;
}

/**
 * Priority-based scheduling strategy
 * 
 * Selects the subsystem with the highest priority value.
 * 
 * @param {Array<BaseSubsystem>} subsystems - Available subsystems
 * @param {Object} [options={}] - Strategy options
 * @returns {BaseSubsystem} Subsystem with highest priority
 * 
 * @example
 * const selected = priorityStrategy(subsystems);
 */
export function priorityStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  // Handle null/undefined options (for consistency, even though not used)
  void (options || {});
  
  return subsystems.reduce((highest, current) => {
    const currentPriority = current.getPriority();
    const highestPriority = highest.getPriority();
    return currentPriority > highestPriority ? current : highest;
  });
}

/**
 * Load-based scheduling strategy
 * 
 * Selects the subsystem with the most messages in its queue.
 * 
 * @param {Array<BaseSubsystem>} subsystems - Available subsystems
 * @param {Object} [options={}] - Strategy options
 * @returns {BaseSubsystem} Subsystem with highest queue load
 * 
 * @example
 * const selected = loadBasedStrategy(subsystems);
 */
export function loadBasedStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  // Handle null/undefined options (for consistency, even though not used)
  void (options || {});
  
  return subsystems.reduce((busiest, current) => {
    const currentLoad = current.getQueueStatus().size;
    const busiestLoad = busiest.getQueueStatus().size;
    return currentLoad > busiestLoad ? current : busiest;
  });
}

/**
 * Adaptive scheduling strategy
 * 
 * Dynamically switches between strategies based on system utilization.
 * 
 * @param {Array<BaseSubsystem>} subsystems - Available subsystems
 * @param {Object} [options={}] - Strategy options
 * @param {number} [options.averageUtilization=0] - Average system utilization (0-1)
 * @param {Object} [options.schedulerStats={}] - Scheduler statistics
 * @returns {BaseSubsystem} Selected subsystem based on adaptive logic
 * 
 * @example
 * const selected = adaptiveStrategy(subsystems, {
 *   averageUtilization: 0.7,
 *   schedulerStats: { cyclesCompleted: 100 }
 * });
 */
export function adaptiveStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  // Handle null/undefined options
  const opts = options || {};
  const avgUtilization = opts.averageUtilization || 0;
  
  // High utilization: use load-based to balance work
  if (avgUtilization > 0.8) {
    return loadBasedStrategy(subsystems, opts);
  }
  
  // Low utilization: use round-robin for fairness
  if (avgUtilization < 0.3) {
    return roundRobinStrategy(subsystems, opts);
  }
  
  // Medium utilization: use priority-based
  return priorityStrategy(subsystems, opts);
}

/**
 * Default strategy registry
 * 
 * Contains the core scheduling strategies.
 */
export const DEFAULT_STRATEGIES = new Map([
  ['round-robin', roundRobinStrategy],
  ['priority', priorityStrategy],
  ['load-based', loadBasedStrategy],
  ['adaptive', adaptiveStrategy]
]);

/**
 * Get a strategy function by name
 * 
 * @param {string} name - Strategy name
 * @returns {Function|null} Strategy function or null if not found
 * 
 * @example
 * const strategy = getStrategy('round-robin');
 * if (strategy) {
 *   const selected = strategy(subsystems, options);
 * }
 */
export function getStrategy(name) {
  return DEFAULT_STRATEGIES.get(name) || null;
}

/**
 * Get all available strategy names
 * 
 * @returns {Array<string>} Array of strategy names
 * 
 * @example
 * const names = getStrategyNames();
 * console.log('Available strategies:', names);
 */
export function getStrategyNames() {
  return Array.from(DEFAULT_STRATEGIES.keys());
}

/**
 * Validate strategy options
 * 
 * @param {string} strategyName - Name of the strategy
 * @param {Object} options - Options to validate
 * @returns {Object} Validation result
 * 
 * @example
 * const result = validateStrategyOptions('adaptive', { averageUtilization: 0.7 });
 * if (!result.valid) {
 *   console.error('Invalid options:', result.errors);
 * }
 */
export function validateStrategyOptions(strategyName, options) {
  const errors = [];
  
  switch (strategyName) {
    case 'adaptive':
      if (options.averageUtilization !== undefined) {
        const util = options.averageUtilization;
        if (typeof util !== 'number' || util < 0 || util > 1) {
          errors.push('averageUtilization must be a number between 0 and 1');
        }
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

