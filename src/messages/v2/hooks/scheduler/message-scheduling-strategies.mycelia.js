/**
 * Message Scheduling Strategies
 * 
 * A collection of core scheduling strategy functions for SubsystemScheduler.
 * Each strategy is a pure function that takes messages and options,
 * and returns the selected message to process next within a subsystem.
 * 
 * @fileoverview Core message scheduling strategy implementations for subsystem-level processing
 */

/**
 * Priority-based message scheduling strategy
 * 
 * Selects messages based on priority: atomic messages first, then by timestamp.
 * 
 * @param {Array<{msg: Message, options: Object}>} pairs - Available message-options pairs to process
 * @param {Object} [options={}] - Strategy options
 * @returns {{msg: Message, options: Object}} Pair with highest priority message
 * 
 * @example
 * const selected = messagePriority(pairs);
 */
export function messagePriority(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  return pairs.reduce((highest, current) => {
    const highestMsg = highest.msg || highest; // Handle backward compatibility
    const currentMsg = current.msg || current;
    
    // Atomic messages have highest priority
    if (currentMsg.isAtomic() && !highestMsg.isAtomic()) return current;
    if (!currentMsg.isAtomic() && highestMsg.isAtomic()) return highest;
    
    // If both atomic or both non-atomic, use timestamp (older = higher priority)
    return currentMsg.getTimestamp() < highestMsg.getTimestamp() ? current : highest;
  });
}

/**
 * FIFO (First In, First Out) message scheduling strategy
 * 
 * Selects the oldest message based on timestamp.
 * 
 * @param {Array<{msg: Message, options: Object}>} pairs - Available message-options pairs to process
 * @param {Object} [options={}] - Strategy options
 * @returns {{msg: Message, options: Object}} Pair with oldest message
 * 
 * @example
 * const selected = messageFIFO(pairs);
 */
export function messageFIFO(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  return pairs.reduce((oldest, current) => {
    const oldestMsg = oldest.msg || oldest; // Handle backward compatibility
    const currentMsg = current.msg || current;
    return currentMsg.getTimestamp() < oldestMsg.getTimestamp() ? current : oldest;
  });
}

/**
 * Load-based message scheduling strategy
 * 
 * Selects messages based on estimated processing complexity.
 * 
 * @param {Array<{msg: Message, options: Object}>} pairs - Available message-options pairs to process
 * @param {Object} [options={}] - Strategy options
 * @param {Function} [options.complexityEstimator] - Function to estimate message complexity
 * @returns {{msg: Message, options: Object}} Pair with lowest estimated complexity message
 * 
 * @example
 * const selected = messageLoadBased(pairs, {
 *   complexityEstimator: (msg) => msg.getBody().operations?.length || 1
 * });
 */
export function messageLoadBased(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  const complexityEstimator = options.complexityEstimator || defaultComplexityEstimator;
  
  return pairs.reduce((fastest, current) => {
    const currentMsg = current.msg || current; // Handle backward compatibility
    const fastestMsg = fastest.msg || fastest;
    const currentComplexity = complexityEstimator(currentMsg);
    const fastestComplexity = complexityEstimator(fastestMsg);
    return currentComplexity < fastestComplexity ? current : fastest;
  });
}

/**
 * Default complexity estimator for messages
 * 
 * @param {Message} message - Message to estimate complexity for
 * @returns {number} Estimated complexity score
 */
function defaultComplexityEstimator(message) {
  const body = message.getBody();
  
  // Simple heuristics for complexity estimation
  let baseComplexity = 1;
  
  if (typeof body === 'object' && body !== null) {
    // Count properties as a rough complexity measure
    const propertyCount = Object.keys(body).length;
    
    // Check for arrays (more operations = more complex)
    const arrayOperations = Object.values(body).filter(Array.isArray).length;
    
    baseComplexity = propertyCount + (arrayOperations * 2);
  }
  
  // Atomic messages are slightly more complex (require transaction handling)
  // Add a small penalty so non-atomic messages are preferred when complexity is equal
  if (message.isAtomic()) {
    baseComplexity += 0.1;
  }
  
  return baseComplexity;
}

/**
 * Adaptive message scheduling strategy
 * 
 * Dynamically switches between strategies based on subsystem load and message characteristics.
 * 
 * @param {Array<{msg: Message, options: Object}>} pairs - Available message-options pairs to process
 * @param {Object} [options={}] - Strategy options
 * @param {number} [options.queueUtilization=0] - Current queue utilization (0-1)
 * @param {Object} [options.subsystemStats={}] - Subsystem performance statistics
 * @returns {{msg: Message, options: Object}} Selected pair based on adaptive logic
 * 
 * @example
 * const selected = messageAdaptive(pairs, {
 *   queueUtilization: 0.8,
 *   subsystemStats: { averageProcessingTime: 5.2 }
 * });
 */
export function messageAdaptive(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  const queueUtilization = options.queueUtilization || 0;
  const subsystemStats = options.subsystemStats || {};
  
  // High utilization: prioritize simple messages for throughput
  if (queueUtilization > 0.8) {
    return messageLoadBased(pairs, options);
  }
  
  // Medium utilization: use priority-based for balanced processing
  if (queueUtilization > 0.4) {
    return messagePriority(pairs, options);
  }
  
  // Low utilization: use FIFO for fairness
  return messageFIFO(pairs, options);
}

/**
 * Default strategy registry for message scheduling
 * 
 * Contains the core message scheduling strategies.
 */
export const DEFAULT_MESSAGE_STRATEGIES = new Map([
  ['priority', messagePriority],
  ['fifo', messageFIFO],
  ['load-based', messageLoadBased],
  ['adaptive', messageAdaptive]
]);

/**
 * Get a message strategy function by name
 * 
 * @param {string} name - Strategy name
 * @returns {Function|null} Strategy function or null if not found
 * 
 * @example
 * const strategy = getMessageStrategy('priority');
 * if (strategy) {
 *   const selected = strategy(messages, options);
 * }
 */
export function getMessageStrategy(name) {
  return DEFAULT_MESSAGE_STRATEGIES.get(name) || null;
}

/**
 * Get all available message strategy names
 * 
 * @returns {Array<string>} Array of strategy names
 * 
 * @example
 * const names = getMessageStrategyNames();
 * console.log('Available message strategies:', names);
 */
export function getMessageStrategyNames() {
  return Array.from(DEFAULT_MESSAGE_STRATEGIES.keys());
}

/**
 * Validate message strategy options
 * 
 * @param {string} strategyName - Name of the strategy
 * @param {Object} options - Options to validate
 * @returns {Object} Validation result
 * 
 * @example
 * const result = validateMessageStrategyOptions('adaptive', { queueUtilization: 0.7 });
 * if (!result.valid) {
 *   console.error('Invalid options:', result.errors);
 * }
 */
export function validateMessageStrategyOptions(strategyName, options) {
  const errors = [];
  
  switch (strategyName) {
    case 'load-based':
      if (options.complexityEstimator && typeof options.complexityEstimator !== 'function') {
        errors.push('complexityEstimator must be a function');
      }
      break;
      
    case 'adaptive':
      if (options.queueUtilization !== undefined) {
        const util = options.queueUtilization;
        if (typeof util !== 'number' || util < 0 || util > 1) {
          errors.push('queueUtilization must be a number between 0 and 1');
        }
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

