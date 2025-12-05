/**
 * PendingResponse
 * ---------------
 * Internal record for a response-required command.
 * 
 * Tracks pending responses with correlation IDs, owner PKRs, reply-to paths, and timeouts.
 */
export class PendingResponse {
  /**
   * Create a new PendingResponse
   * 
   * @param {Object} params - Pending response parameters
   * @param {string} params.correlationId - Correlation ID (typically message ID)
   * @param {PKR} params.ownerPkr - Owner's Public Key Record
   * @param {string} params.replyTo - Reply-to path for the response
   * @param {number} [params.timeoutMs=null] - Timeout in milliseconds (optional)
   */
  constructor({ correlationId, ownerPkr, replyTo, timeoutMs = null }) {
    if (typeof correlationId !== 'string' || !correlationId.trim()) {
      throw new Error('PendingResponse: correlationId must be a non-empty string.');
    }
    if (!ownerPkr) {
      throw new Error('PendingResponse: ownerPkr is required.');
    }
    if (typeof replyTo !== 'string' || !replyTo.trim()) {
      throw new Error('PendingResponse: replyTo must be a non-empty string.');
    }

    this.correlationId = correlationId;
    this.ownerPkr = ownerPkr;
    this.replyTo = replyTo;
    this.timeoutMs = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : null;
    this.timerId = null;
    this.createdAt = Date.now();
    this.resolved = false;
    this.timedOut = false;
  }

  /**
   * Start the timeout timer
   * 
   * @param {Function} onTimeout - Callback to invoke when timeout occurs
   */
  startTimeout(onTimeout) {
    if (!this.timeoutMs || this.timerId) return;
    this.timerId = setTimeout(() => {
      if (typeof onTimeout === 'function') {
        onTimeout(this);
      }
    }, this.timeoutMs);
  }

  /**
   * Clear the timeout timer
   */
  clearTimeout() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Get a snapshot of the pending response state
   * 
   * @returns {Object} Snapshot object with pending response data
   */
  snapshot() {
    return {
      correlationId: this.correlationId,
      ownerPkr: this.ownerPkr,
      replyTo: this.replyTo,
      timeoutMs: this.timeoutMs,
      createdAt: this.createdAt,
      resolved: this.resolved,
      timedOut: this.timedOut
    };
  }
}




