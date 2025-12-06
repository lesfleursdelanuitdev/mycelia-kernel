/**
 * Scheduler Statistics Utilities
 * 
 * Handles statistics tracking and reporting for message scheduling.
 */

/**
 * Initialize scheduler statistics
 * 
 * @returns {Object} Statistics object
 */
export function createStatistics() {
  return {
    timeSlicesProcessed: 0,
    messagesProcessed: 0,
    processingErrors: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0
  };
}

/**
 * Update scheduler statistics
 * 
 * @param {Object} stats - Statistics object (will be modified)
 * @param {number} processed - Number of messages processed
 * @param {number} processingTime - Time spent processing
 */
export function updateStatistics(stats, processed, processingTime) {
  stats.timeSlicesProcessed++;
  stats.messagesProcessed += processed;
  stats.totalProcessingTime += processingTime;
  stats.averageProcessingTime = stats.totalProcessingTime / stats.timeSlicesProcessed;
}

/**
 * Get scheduler statistics
 * 
 * @param {Object} stats - Statistics object
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @param {string} currentStrategy - Current strategy name
 * @param {Array<string>} availableStrategies - Available strategy names
 * @param {number} queueUtilization - Current queue utilization
 * @param {Object} options - Scheduler options
 * @returns {Object} Statistics object
 */
export function getStatistics(stats, subsystem, currentStrategy, availableStrategies, queueUtilization, options) {
  return {
    ...stats,
    subsystemName: subsystem.name,
    currentStrategy,
    availableStrategies,
    queueUtilization,
    options
  };
}

/**
 * Clear statistics and reset state
 * 
 * @param {Object} stats - Statistics object (will be reset)
 * @param {Object} state - State object with currentIndex and lastProcessed (will be reset)
 * @param {boolean} debug - Enable debug logging
 * @param {string} subsystemName - Subsystem name for logging
 */
export function clearStatistics(stats, state, debug, subsystemName) {
  stats.timeSlicesProcessed = 0;
  stats.messagesProcessed = 0;
  stats.processingErrors = 0;
  stats.averageProcessingTime = 0;
  stats.totalProcessingTime = 0;
  state.currentIndex = 0;
  state.lastProcessed = {};
  
  if (debug) {
    console.log(`SubsystemScheduler for ${subsystemName}: Cleared`);
  }
}





