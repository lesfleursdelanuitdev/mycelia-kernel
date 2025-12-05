/**
 * Utility function to accept a message into a subsystem
 * Handles message enqueueing for processing
 * 
 * @param {Object} context - Context object with subsystem dependencies
 * @param {SubsystemQueueManager|BoundedQueue} context.queueManager - Queue manager or queue for enqueueing messages (backward compatibility)
 * @param {Function} context.statisticsRecorder - Function to record accepted messages
 * @param {Function} context.errorRecorder - Function to record errors
 * @param {boolean} context.debug - Debug flag
 * @param {string} context.subsystemName - Subsystem name for logging
 * @param {Message} message - Message to accept
 * @param {Object} [options={}] - Options for message processing
 * @param {string} [options.currentPiece] - Current piece for routing context
 * @returns {Promise<boolean>} Success status
 */
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export async function acceptMessage(context, message, options = {}) {
  const { queueManager, statisticsRecorder, errorRecorder, debug, subsystemName } = context;
  const logger = createLogger(debug, `BaseSubsystem ${subsystemName}`);
  
  logger.log(`Accepting message ${message.id}`);
  
  // Store current piece context if provided
  if (options.currentPiece) {
    if (!message._runtimeMeta) {
      message._runtimeMeta = {};
    }
    message._runtimeMeta.currentPiece = options.currentPiece;
  }
  
  // Enqueue message-options pair for later retrieval in processMessage()
  try {
    const pair = { msg: message, options };
    const success = queueManager.enqueue(pair);
    
    if (success) {
      statisticsRecorder();
      logger.log(`Message accepted: ${message.id}`);
    }
    
    return success;
  } catch (error) {
    errorRecorder();
    logger.error('Error accepting message:', error);
    return false;
  }
}

