/**
 * CommandManager
 * 
 * Manages command/response operations using channels.
 * Tracks pending commands and resolves promises when replies arrive.
 * 
 * Key differences from performRequest:
 * - Uses channels for replies (not temporary routes)
 * - No local timeout (relies on ResponseManagerSubsystem)
 * - Tracks multiple pending commands by correlationId
 * - Handles replies via handleCommandReply() method
 */
import { createSubsystemLogger } from '../../utils/logger.utils.mycelia.js';

export class CommandManager {
  #subsystem;
  #pending = new Map(); // correlationId -> { resolve, reject }
  #logger;

  /**
   * Create a new CommandManager instance
   * 
   * @param {BaseSubsystem} subsystem - Subsystem instance
   */
  constructor(subsystem) {
    if (!subsystem) {
      throw new Error('CommandManager: subsystem is required');
    }
    this.#subsystem = subsystem;
    this.#logger = createSubsystemLogger(subsystem);
  }

  /**
   * Send a command and return a Promise that resolves
   * when the first reply for this correlationId arrives
   * on the reply channel.
   * 
   * NOTE: No local timeout is used here. Timeouts are handled
   * *exclusively* by the kernel/ResponseManager, which
   * emits a synthetic response (isResponse=true, success=false, error=timeout).
   * 
   * @param {Object} params - Command parameters
   * @param {Message} params.message - Message to send
   * @param {Object} [params.options={}] - Send options
   * @param {string} [params.options.path] - Override message path
   * @param {string} params.options.replyTo - Reply channel route (required)
   * @param {number} [params.options.timeout] - Timeout in milliseconds
   * @param {Object} [params.options.sendOptions] - Additional sendProtected options
   * @returns {Promise<Message>} Promise that resolves with the response message
   * @throws {Error} If identity is not available, path is invalid, or replyTo is missing
   */
  sendCommand({ message, options }) {
    const subsystem = this.#subsystem;
    const identity = subsystem.identity;

    if (!identity || typeof identity.sendProtected !== 'function') {
      throw new Error('CommandManager.sendCommand: subsystem.identity.sendProtected() is required.');
    }

    const {
      path = message.path,
      replyTo,
      timeout,
      ...sendOptions
    } = options || {};

    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('CommandManager.sendCommand: path must be a non-empty string.');
    }

    if (typeof replyTo !== 'string' || !replyTo.trim()) {
      throw new Error('CommandManager.sendCommand: replyTo must be a non-empty string.');
    }

    // Ensure message has an id (correlationId)
    // v2: Messages should always have an ID set during creation
    // ResponseManagerSubsystem requires message.id to exist
    let correlationId = message.id || message.getId?.();
    if (!correlationId) {
      throw new Error(
        'CommandManager.sendCommand: message must have an id property. ' +
        'Messages in v2 should always have IDs set during creation via MessageFactory.'
      );
    }
    correlationId = String(correlationId);

    return new Promise((resolve, reject) => {
      // Track pending promise
      this.#pending.set(correlationId, { resolve, reject });

      // Send the actual command through identity → kernel
      // v2: Use responseRequired object format
      identity.sendProtected(message, {
        ...sendOptions,
        path,
        responseRequired: {
          replyTo,
          timeout
        }
      }).catch((err) => {
        // If send fails immediately, reject the promise and clean up
        const entry = this.#pending.get(correlationId);
        if (entry) {
          this.#pending.delete(correlationId);
          entry.reject(err);
        }
      });
    });
  }

  /**
   * Called when a reply arrives on the reply channel.
   * Uses correlationId to resolve the local Promise.
   * 
   * @param {Message} responseMessage - Response message
   * @returns {boolean} True if reply was handled (matched a pending command), false otherwise
   */
  handleCommandReply(responseMessage) {
    if (!responseMessage) return false;

    // v2: Extract correlationId from message
    // Try multiple sources in priority order
    let candidate = null;

    // 1. Try message body (if inReplyTo/correlationId stored there)
    if (responseMessage.body && typeof responseMessage.body === 'object') {
      candidate = responseMessage.body.inReplyTo || responseMessage.body.correlationId;
    }

    // 2. Try message metadata (v2 MessageMetadata)
    if (!candidate && responseMessage.meta) {
      const meta = responseMessage.meta;
      
      // Try custom field accessors
      if (typeof meta.getCustomField === 'function') {
        candidate = meta.getCustomField('inReplyTo') || meta.getCustomField('correlationId');
      }
    }

    // 3. Try message ID (fallback)
    if (!candidate && responseMessage.getId) {
      // Note: This would be the response message ID, not the original correlationId
      // Only use as last resort if we can't find inReplyTo
    }

    // 4. Legacy fallback (if message has direct properties)
    if (!candidate) {
      candidate = responseMessage.inReplyTo || responseMessage.correlationId;
    }

    if (!candidate) {
      this.#logger.warn(
        'CommandManager.handleCommandReply: Unable to derive correlationId from response.'
      );
      return false;
    }

    const correlationId = String(candidate);
    const entry = this.#pending.get(correlationId);

    if (!entry) {
      // Could be a late response after timeout or something not tracked locally
      this.#logger.warn(
        `CommandManager.handleCommandReply: No pending command for correlationId "${correlationId}".`
      );
      return false;
    }

    this.#pending.delete(correlationId);

    // For now, we always resolve with the raw responseMessage.
    // Callers can inspect responseMessage/meta/options to decide
    // whether to treat it as success or failure.
    entry.resolve(responseMessage);
    return true;
  }

  /**
   * Dispose the CommandManager and clean up all pending commands
   * 
   * Best-effort cleanup: reject any still-pending promises
   * 
   * @returns {void}
   */
  dispose() {
    // Best-effort cleanup: reject any still-pending promises
    for (const [correlationId, entry] of this.#pending.entries()) {
      try {
        entry.reject(
          new Error(
            `CommandManager.dispose: pending command "${correlationId}" rejected due to disposal.`
          )
        );
      } catch {
        // ignore
      }
    }

    this.#pending.clear();
    this.#logger.log('CommandManager disposed; all pending commands cleared.');
  }

  /**
   * Get status information
   * 
   * @returns {Object} Status object with pending count
   */
  getStatus() {
    return {
      pendingCount: this.#pending.size
    };
  }
}

