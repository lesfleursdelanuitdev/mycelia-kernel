/**
 * Scheduler Processing Utilities
 * 
 * Handles message processing logic for the scheduler.
 */

/**
 * Get available messages from the subsystem queue
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Array<Message>} Available messages
 * @throws {Error} If queue facet is not found
 */
export function getAvailableMessages(subsystem) {
  const queueFacet = subsystem.find('queue');
  if (!queueFacet) {
    throw new Error(`SubsystemScheduler ${subsystem.name}: queue facet not found. useQueue must be added before useScheduler.`);
  }
  
  // Get all messages from the queue without removing them
  // (we'll remove them as we process them)
  return queueFacet.queue.peekAll();
}

/**
 * Calculate current queue utilization
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {number} Queue utilization (0-1)
 */
export function calculateQueueUtilization(subsystem) {
  const queueFacet = subsystem.find('queue');
  if (!queueFacet) {
    return 0; // Return 0 if queue facet not found
  }
  
  const queueStatus = queueFacet.getQueueStatus();
  const capacity = queueFacet.queue.capacity;
  return capacity > 0 ? queueStatus.size / capacity : 0;
}

/**
 * Process a single message-options pair
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @param {{msg: Message, options: Object}} pair - Message-options pair to process
 * @param {boolean} debug - Enable debug logging
 * @throws {Error} If queue or processor facet is not found
 */
export async function processMessage(subsystem, pair, debug) {
  // Remove the specific selected pair from queue
  // (may not be the first item if using priority/load-based strategies)
  const queueFacet = subsystem.find('queue');
  if (!queueFacet) {
    throw new Error(`SubsystemScheduler ${subsystem.name}: queue facet not found. useQueue must be added before useScheduler.`);
  }
  
  const removed = queueFacet.queue.remove(pair);
  if (!removed) {
    if (debug) {
      console.warn(`SubsystemScheduler ${subsystem.name}: Failed to remove message ${pair.msg.getId()} from queue`);
    }
  }
  
  // Delegate to processor facet for actual processing (extracts msg and options from pair)
  const processorFacet = subsystem.find('processor');
  if (!processorFacet) {
    throw new Error(`SubsystemScheduler ${subsystem.name}: processor facet not found. useMessageProcessor must be added before useScheduler.`);
  }
  
  await processorFacet.processMessage(pair);
}




