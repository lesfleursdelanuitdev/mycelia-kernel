/**
 * Global Scheduler Processing Utilities
 * 
 * Handles scheduling loop and time slice allocation for global scheduling.
 */

/**
 * Calculate average system utilization
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @returns {number} Average utilization (0-1)
 */
export function calculateAverageUtilization(messageSystem) {
  const subsystems = messageSystem.getSubsystems();
  if (subsystems.length === 0) return 0;
  
  let totalUtilization = 0;
  for (const subsystem of subsystems) {
    const queueStatus = subsystem.getQueueStatus();
    // Get capacity from queue status or use a default
    const capacity = queueStatus.capacity || 1000;
    const utilization = capacity > 0 ? queueStatus.size / capacity : 0;
    totalUtilization += utilization;
  }
  
  return totalUtilization / subsystems.length;
}

/**
 * Allocate time slice to a subsystem
 * 
 * @param {BaseSubsystem} subsystem - Subsystem to schedule
 * @param {number} timeSliceDuration - Duration of time slice in milliseconds
 * @param {Object} stats - Statistics object (will be updated)
 * @param {Object} lastScheduled - Last scheduled tracking object (will be updated)
 * @param {boolean} debug - Enable debug logging
 * @returns {Promise<void>}
 */
export async function allocateTimeSlice(subsystem, timeSliceDuration, stats, lastScheduled, debug) {
  try {
    stats.subsystemsScheduled++;
    stats.totalTimeAllocated += timeSliceDuration;
    
    // Track scheduling for LRU strategy
    lastScheduled[subsystem.name] = Date.now();
    
    if (debug) {
      console.log(`GlobalScheduler: Allocating ${timeSliceDuration}ms to ${subsystem.name}`);
    }
    
    const result = await subsystem.process(timeSliceDuration);
    
    if (debug && result) {
      console.log(`GlobalScheduler: ${subsystem.name} processed ${result.processed || 0} messages`);
    }
    
  } catch (error) {
    stats.schedulingErrors++;
    if (debug) {
      console.error(`GlobalScheduler: Error scheduling ${subsystem.name}:`, error);
    }
  }
}




