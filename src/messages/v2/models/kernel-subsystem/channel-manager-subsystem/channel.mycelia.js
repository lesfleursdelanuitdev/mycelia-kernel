/**
 * Channel Class
 * 
 * Represents a communication channel with owner-based access control and participant management.
 * 
 * Channels are used for multi-party communication where:
 * - An owner (PKR) controls the channel
 * - Participants (PKRs) can use the channel
 * - Metadata can store additional channel information
 * 
 * @example
 * const channel = new Channel({
 *   route: 'canvas://channel/layout',
 *   ownerPkr: canvasPkr,
 *   participants: [userPkr1, userPkr2],
 *   metadata: { name: 'layout', description: 'Layout channel' }
 * });
 * 
 * // Add participant
 * channel.addParticipant(userPkr3);
 * 
 * // Check access
 * const canUse = channel.canUse(userPkr1); // true
 * 
 * // Get snapshot
 * const snapshot = channel.snapshot();
 */
export class Channel {
  /**
   * Create a new Channel instance
   * 
   * @param {Object} params - Channel parameters
   * @param {string} params.route - Channel route/path
   * @param {PKR} params.ownerPkr - Owner's Public Key Record
   * @param {Array<PKR>} [params.participants=[]] - Initial participants
   * @param {Object} [params.metadata={}] - Channel metadata
   */
  constructor({ route, ownerPkr, participants = [], metadata = {} }) {
    if (typeof route !== 'string' || !route.trim()) {
      throw new Error('Channel: route must be a non-empty string.');
    }
    if (!ownerPkr) {
      throw new Error('Channel: ownerPkr is required.');
    }
    if (!Array.isArray(participants)) {
      throw new Error('Channel: participants must be an array.');
    }
    if (metadata && typeof metadata !== 'object') {
      throw new Error('Channel: metadata must be an object.');
    }

    this.route = route.trim();
    this.ownerPkr = ownerPkr;
    this.participants = new Set(participants);
    this.metadata = { ...metadata };
  }

  /**
   * Add a participant to the channel
   * 
   * @param {PKR} pkr - Participant's Public Key Record
   * @returns {boolean} True if participant was added (wasn't already a participant), false otherwise
   */
  addParticipant(pkr) {
    if (!pkr) {
      throw new Error('Channel.addParticipant: pkr is required.');
    }
    
    // Returns true if added (wasn't already a participant)
    if (this.participants.has(pkr)) {
      return false;
    }
    
    this.participants.add(pkr);
    return true;
  }

  /**
   * Remove a participant from the channel
   * 
   * @param {PKR} pkr - Participant's Public Key Record
   * @returns {boolean} True if participant was removed (was a participant), false otherwise
   */
  removeParticipant(pkr) {
    if (!pkr) {
      throw new Error('Channel.removeParticipant: pkr is required.');
    }
    
    // Returns true if removed (was a participant)
    return this.participants.delete(pkr);
  }

  /**
   * Check if a caller can use this channel
   * 
   * Access rules:
   * - Owner can always use the channel
   * - Participants can use the channel
   * - Others cannot use the channel
   * 
   * @param {PKR} callerPkr - Caller's Public Key Record
   * @returns {boolean} True if caller can use the channel, false otherwise
   */
  canUse(callerPkr) {
    if (!callerPkr) {
      return false;
    }
    
    // Owner can always use
    if (callerPkr === this.ownerPkr) {
      return true;
    }
    
    // Participants can use
    return this.participants.has(callerPkr);
  }

  /**
   * Get a snapshot of the channel state
   * 
   * @returns {Object} Snapshot object with channel data
   */
  snapshot() {
    return {
      route: this.route,
      ownerPkr: this.ownerPkr,
      participants: Array.from(this.participants),
      metadata: { ...this.metadata }
    };
  }
}




