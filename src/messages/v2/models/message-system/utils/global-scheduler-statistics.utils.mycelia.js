/**
 * Global Scheduler Statistics Utilities
 * 
 * Handles statistics tracking and reporting for global scheduling.
 */

/**
 * Initialize global scheduler statistics
 * 
 * @returns {Object} Statistics object
 */
export function createStatistics() {
  return {
    cyclesCompleted: 0,
    totalTimeAllocated: 0,
    subsystemsScheduled: 0,
    schedulingErrors: 0
  };
}

/**
 * Get global scheduler statistics
 * 
 * @param {Object} stats - Statistics object
 * @param {boolean} isRunning - Whether scheduler is running
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {string} currentStrategy - Current strategy name
 * @param {Array<string>} availableStrategies - Available strategy names
 * @param {number} averageUtilization - Average system utilization
 * @param {Object} options - Scheduler options
 * @returns {Object} Statistics object
 */
export function getStatistics(stats, isRunning, messageSystem, currentStrategy, availableStrategies, averageUtilization, options) {
  const subsystems = messageSystem.getSubsystems();
  return {
    ...stats,
    isRunning,
    registeredSubsystems: subsystems.map(s => s.name),
    subsystemCount: subsystems.length,
    currentStrategy,
    availableStrategies,
    averageUtilization,
    options
  };
}

/**
 * Get statistics for all registered subsystems
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @returns {Object} Subsystem statistics
 */
export function getSubsystemStatistics(messageSystem) {
  const stats = {};
  const subsystems = messageSystem.getSubsystems();
  for (const subsystem of subsystems) {
    stats[subsystem.name] = subsystem.getStatistics();
  }
  return stats;
}

/**
 * Clear all statistics and reset state
 * 
 * @param {Object} stats - Statistics object (will be reset)
 * @param {Object} state - State object with currentIndex, schedulingCycle, and lastScheduled (will be reset)
 * @param {boolean} debug - Enable debug logging
 */
export function clearStatistics(stats, state, debug) {
  stats.cyclesCompleted = 0;
  stats.totalTimeAllocated = 0;
  stats.subsystemsScheduled = 0;
  stats.schedulingErrors = 0;
  state.currentSubsystemIndex = 0;
  state.schedulingCycle = 0;
  state.lastScheduled = {};
  
  if (debug) {
    console.log('GlobalScheduler: Cleared all statistics');
  }
}





