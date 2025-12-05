import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { PendingResponse } from './pending-response.mycelia.js';
import { createSubsystemLogger } from '../../../utils/logger.utils.mycelia.js';
import { deriveCorrelationIdFromMessage } from './response-correlation.utils.mycelia.js';
import { handleTimeout } from './response-timeout.utils.mycelia.js';
import { finalizeEntry, registerPending } from './response-registry.utils.mycelia.js';

/**
 * ResponseManagerSubsystem
 * ------------------------
 * Kernel child subsystem responsible for tracking "response-required" commands.
 *
 * Responsibilities:
 * - Register commands that expect a response (correlationId + replyTo + timeout)
 * - On timeout, emit a synthetic *response* via the kernel
 * - Accept / reject incoming responses based on correlation state
 *
 * It does NOT route messages itself; routing is handled by the kernel.
 */
export class ResponseManagerSubsystem extends BaseSubsystem {
  #pendingByCorrelation = new Map(); // correlationId -> PendingResponse
  #pendingByOwner = new Map(); // ownerPkr -> Set<PendingResponse>

  /**
   * Create a new ResponseManagerSubsystem
   * 
   * @param {string} name - Subsystem name (default: 'response-manager')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'response-manager', options = {}) {
    super(name, options);
  }

  // ---------------------------------------------------------------------------
  // Registration API (called by Kernel for commands)
  // ---------------------------------------------------------------------------

  /**
   * Register that a given command message requires a response.
   *
   * Called from KernelSubsystem.sendProtected when options.responseRequired === true.
   * 
   * @param {PKR} ownerPkr - Owner's Public Key Record
   * @param {Message} message - Command message with a valid id
   * @param {Object} [options={}] - Response options
   * @param {string} options.replyTo - Reply-to path for the response
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @returns {PendingResponse} The created pending response entry
   * @throws {Error} If parameters are invalid or entry already exists
   */
  registerResponseRequiredFor(ownerPkr, message, { replyTo, timeout } = {}) {
    if (!ownerPkr) {
      throw new Error(
        'ResponseManagerSubsystem.registerResponseRequiredFor: ownerPkr is required.'
      );
    }
    if (!message || !message.id) {
      throw new Error(
        'ResponseManagerSubsystem.registerResponseRequiredFor: message with a valid id is required.'
      );
    }
    if (typeof replyTo !== 'string' || !replyTo.trim()) {
      throw new Error(
        'ResponseManagerSubsystem.registerResponseRequiredFor: replyTo must be a non-empty string.'
      );
    }

    const correlationId = String(message.id);
    if (this.#pendingByCorrelation.has(correlationId)) {
      throw new Error(
        `ResponseManagerSubsystem.registerResponseRequiredFor: pending entry already exists for correlationId "${correlationId}".`
      );
    }

    const pending = new PendingResponse({
      correlationId,
      ownerPkr,
      replyTo,
      timeoutMs: timeout
    });

    registerPending(pending, this.#pendingByCorrelation, this.#pendingByOwner);

    const logger = createSubsystemLogger(this);
    logger.log(
      `Registered pending response for correlationId "${correlationId}", ` +
      `replyTo "${replyTo}", timeout: ${pending.timeoutMs}ms`
    );

    // Single canonical timeout; on expiry we emit a synthetic response via kernel.
    pending.startTimeout((entry) => this.#onTimeout(entry));

    return pending;
  }

  /**
   * Cancel a pending entry by correlationId (optional, if you ever support explicit cancels).
   * 
   * @param {string} correlationId - Correlation ID to cancel
   * @returns {boolean} True if entry was found and cancelled, false otherwise
   * @throws {Error} If correlationId is invalid
   */
  cancel(correlationId) {
    if (typeof correlationId !== 'string' || !correlationId.trim()) {
      throw new Error(
        'ResponseManagerSubsystem.cancel: correlationId must be a non-empty string.'
      );
    }

    const pending = this.#pendingByCorrelation.get(correlationId);
    if (!pending) return false;

    finalizeEntry(pending, this.#pendingByCorrelation, this.#pendingByOwner);

    const logger = createSubsystemLogger(this);
    logger.log(`Cancelled pending response "${correlationId}".`);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Timeout → synthetic response
  // ---------------------------------------------------------------------------

  /**
   * Handle timeout for a pending response entry
   * 
   * @param {PendingResponse} entry - The pending response entry that timed out
   * @private
   */
  async #onTimeout(entry) {
    await handleTimeout(entry, this);
  }

  // ---------------------------------------------------------------------------
  // Response handling API (called by Kernel for messages with isResponse=true)
  // ---------------------------------------------------------------------------

  /**
   * Handle an incoming response message.
   *
   * Kernel calls this *before* routing a response. This method:
   * - Looks up the correlationId
   * - Verifies that there is a pending entry
   * - Marks it resolved and finalizes it
   *
   * @param {Message} message - Response message
   * @param {Object} [options={}] - Options
   * @param {string} [options.correlationId] - Explicit correlation ID (overrides message extraction)
   * @returns {Object} Result object with ok flag and pending entry or reason
   * @returns {boolean} result.ok - True if response was handled successfully
   * @returns {PendingResponse|undefined} result.pending - Pending entry if ok
   * @returns {string|undefined} result.reason - Error reason if not ok
   */
  handleResponse(message, { correlationId } = {}) {
    const id =
      correlationId ||
      deriveCorrelationIdFromMessage(message);

    if (!id) {
      const reason = 'Unable to derive correlationId from response message.';
      const logger = createSubsystemLogger(this);
      logger.warn(`handleResponse: ${reason}`);
      return { ok: false, reason };
    }

    const key = String(id);
    const pending = this.#pendingByCorrelation.get(key);

    if (!pending) {
      const reason = `No pending entry for correlationId "${key}".`;
      const logger = createSubsystemLogger(this);
      logger.warn(`handleResponse: ${reason}`);
      return { ok: false, reason };
    }

    if (pending.resolved) {
      const reason = `Pending entry for correlationId "${key}" already resolved.`;
      const logger = createSubsystemLogger(this);
      logger.warn(`handleResponse: ${reason}`);
      return { ok: false, reason };
    }

    pending.resolved = true;
    pending.clearTimeout();
    finalizeEntry(pending, this.#pendingByCorrelation, this.#pendingByOwner);

    const logger = createSubsystemLogger(this);
    logger.log(
      `Resolved pending correlationId "${key}" (replyTo: "${pending.replyTo}").`
    );

    return { ok: true, pending };
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  /**
   * List all pending responses
   * 
   * @returns {Array<Object>} Array of pending response snapshots
   */
  listAllPending() {
    return Array.from(this.#pendingByCorrelation.values()).map((entry) =>
      entry.snapshot()
    );
  }

  /**
   * List pending responses for a specific owner
   * 
   * @param {PKR} ownerPkr - Owner's Public Key Record
   * @returns {Array<Object>} Array of pending response snapshots
   * @throws {Error} If ownerPkr is not provided
   */
  listPendingFor(ownerPkr) {
    if (!ownerPkr) {
      throw new Error(
        'ResponseManagerSubsystem.listPendingFor: ownerPkr is required.'
      );
    }

    const set = this.#pendingByOwner.get(ownerPkr);
    if (!set) return [];

    return Array.from(set).map((entry) => entry.snapshot());
  }

  /**
   * Get the replyTo path for a pending response by correlationId
   * 
   * Used by useResponses hook to retrieve the replyTo path that was stored
   * when a request was sent with `responseRequired: { replyTo, timeout }`.
   * 
   * @param {string} correlationId - Correlation ID (typically message.id)
   * @returns {string|null} Reply-to path or null if not found
   * 
   * @example
   * // When a request was sent with:
   * await identity.sendProtected(message, {
   *   responseRequired: { replyTo: 'subsystem://replies', timeout: 5000 }
   * });
   * 
   * // Later, when replying:
   * const replyTo = responseManager.getReplyTo(message.getId());
   * // Returns: 'subsystem://replies'
   */
  getReplyTo(correlationId) {
    if (typeof correlationId !== 'string' || !correlationId.trim()) {
      return null;
    }
    
    const pending = this.#pendingByCorrelation.get(String(correlationId));
    return pending?.replyTo || null;
  }

  /**
   * Get status information
   * 
   * @returns {Object} Status object with count and owners
   */
  getStatus() {
    return {
      count: this.#pendingByCorrelation.size,
      owners: this.#pendingByOwner.size
    };
  }

  // ---------------------------------------------------------------------------
  // Disposal
  // ---------------------------------------------------------------------------

  /**
   * Dispose the subsystem and clean up all pending responses
   * 
   * @returns {Promise<void>}
   */
  async dispose() {
    for (const entry of this.#pendingByCorrelation.values()) {
      entry.clearTimeout();
    }

    this.#pendingByCorrelation.clear();
    this.#pendingByOwner.clear();

    const logger = createSubsystemLogger(this);
    logger.log('Disposed; all pending cleared.');

    if (typeof super.dispose === 'function') {
      await super.dispose();
    }
  }
}
