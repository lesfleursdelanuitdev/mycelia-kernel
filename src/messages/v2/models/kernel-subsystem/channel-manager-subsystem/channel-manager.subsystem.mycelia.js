/**
 * ChannelManagerSubsystem
 * ------------------------
 * Kernel child subsystem responsible for managing communication channels.
 *
 * Responsibilities:
 * - Register and unregister channels
 * - Manage channel participants
 * - Verify channel access (owner and participants)
 * - Provide owner-scoped channel lookup
 *
 * Channels are used for multi-party communication where an owner controls access
 * and can add/remove participants.
 */
import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { Channel } from './channel.mycelia.js';
import { createSubsystemLogger } from '../../../utils/logger.utils.mycelia.js';

export class ChannelManagerSubsystem extends BaseSubsystem {
  #channels = new Map(); // route -> Channel
  #channelsByOwner = new Map(); // ownerPkr -> Set<Channel>
  #logger;

  /**
   * Create a new ChannelManagerSubsystem
   * 
   * @param {string} name - Subsystem name (default: 'channel-manager')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'channel-manager', options = {}) {
    super(name, options);
    this.#logger = createSubsystemLogger(this);
  }

  // ---------------------------------------------------------------------------
  // Registration API
  // ---------------------------------------------------------------------------

  /**
   * Register a new channel
   * 
   * @param {Object} params - Channel parameters
   * @param {string} params.route - Channel route/path
   * @param {PKR} params.ownerPkr - Owner's Public Key Record
   * @param {Array<PKR>} [params.participants=[]] - Initial participants
   * @param {Object} [params.metadata={}] - Channel metadata
   * @returns {Channel} The created channel instance
   * @throws {Error} If parameters are invalid or channel already exists
   */
  registerChannel({ route, ownerPkr, participants = [], metadata = {} } = {}) {
    if (typeof route !== 'string' || !route.trim()) {
      throw new Error('ChannelManagerSubsystem.registerChannel: route must be a non-empty string.');
    }
    if (!ownerPkr) {
      throw new Error('ChannelManagerSubsystem.registerChannel: ownerPkr is required.');
    }
    if (this.#channels.has(route)) {
      throw new Error(
        `ChannelManagerSubsystem.registerChannel: channel already exists for route "${route}".`
      );
    }

    const channel = new Channel({ route, ownerPkr, participants, metadata });
    this.#channels.set(route, channel);

    // Index by owner
    let ownedSet = this.#channelsByOwner.get(ownerPkr);
    if (!ownedSet) {
      ownedSet = new Set();
      this.#channelsByOwner.set(ownerPkr, ownedSet);
    }
    ownedSet.add(channel);

    this.#logger.log(
      `Registered channel "${route}" with ${channel.participants.size} participant(s).`
    );

    return channel;
  }

  /**
   * Unregister a channel
   * 
   * @param {string} route - Channel route
   * @returns {boolean} True if channel was found and unregistered, false otherwise
   * @throws {Error} If route is invalid
   */
  unregisterChannel(route) {
    if (typeof route !== 'string' || !route.trim()) {
      throw new Error('ChannelManagerSubsystem.unregisterChannel: route must be a non-empty string.');
    }

    const channel = this.#channels.get(route);
    if (!channel) {
      return false;
    }

    this.#channels.delete(route);

    // Remove from owner index
    const ownedSet = this.#channelsByOwner.get(channel.ownerPkr);
    if (ownedSet) {
      ownedSet.delete(channel);
      if (ownedSet.size === 0) {
        this.#channelsByOwner.delete(channel.ownerPkr);
      }
    }

    this.#logger.log(`Unregistered channel "${route}".`);

    return true;
  }

  /**
   * Get a channel by route
   * 
   * @param {string} route - Channel route
   * @returns {Channel|null} Channel instance or null if not found
   * @throws {Error} If route is invalid
   */
  getChannel(route) {
    if (typeof route !== 'string' || !route.trim()) {
      throw new Error('ChannelManagerSubsystem.getChannel: route must be a non-empty string.');
    }

    return this.#channels.get(route) || null;
  }

  /**
   * List all registered channels
   * 
   * @returns {Array<Channel>} Array of all channel instances
   */
  listChannels() {
    return Array.from(this.#channels.values());
  }

  // ---------------------------------------------------------------------------
  // Owner-scoped lookup
  // ---------------------------------------------------------------------------

  /**
   * Return all channels owned by a given PKR
   * 
   * @param {PKR} ownerPkr - Owner's Public Key Record
   * @returns {Array<Channel>} Array of channels owned by the PKR
   * @throws {Error} If ownerPkr is not provided
   */
  listAllChannelsFor(ownerPkr) {
    if (!ownerPkr) {
      throw new Error('ChannelManagerSubsystem.listAllChannelsFor: ownerPkr is required.');
    }

    const ownedSet = this.#channelsByOwner.get(ownerPkr);
    if (!ownedSet) return [];

    return Array.from(ownedSet);
  }

  /**
   * Get a channel for a specific owner PKR and a name/route
   * 
   * Lookup order:
   * 1. Exact route match (owner must match)
   * 2. metadata.name match among channels owned by this PKR
   * 3. suffix "/channel/<name>" match among channels owned by this PKR
   * 
   * @param {PKR} ownerPkr - Owner's Public Key Record
   * @param {string} nameOrRoute - Full route (e.g., "canvas://channel/layout") or short name (e.g., "layout")
   * @returns {Channel|null} Channel instance or null if not found
   * @throws {Error} If parameters are invalid
   */
  getChannelFor(ownerPkr, nameOrRoute) {
    if (!ownerPkr) {
      throw new Error('ChannelManagerSubsystem.getChannelFor: ownerPkr is required.');
    }
    if (typeof nameOrRoute !== 'string' || !nameOrRoute.trim()) {
      throw new Error(
        'ChannelManagerSubsystem.getChannelFor: nameOrRoute must be a non-empty string.'
      );
    }

    const key = nameOrRoute.trim();

    // 1) Exact route match (owner must match)
    const direct = this.#channels.get(key);
    if (direct && direct.ownerPkr === ownerPkr) {
      return direct;
    }

    const ownedSet = this.#channelsByOwner.get(ownerPkr);
    if (!ownedSet) return null;

    // 2) metadata.name match among channels owned by this PKR
    for (const channel of ownedSet) {
      const metaName = channel.metadata && channel.metadata.name;
      if (metaName && metaName === key) {
        return channel;
      }
    }

    // 3) suffix "/channel/<name>" match among channels owned by this PKR
    const suffix = `/channel/${key}`;
    for (const channel of ownedSet) {
      if (channel.route.endsWith(suffix)) {
        return channel;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Participant / ACL
  // ---------------------------------------------------------------------------

  /**
   * Add a participant to a channel
   * 
   * @param {string} route - Channel route
   * @param {PKR} pkr - Participant's Public Key Record
   * @returns {boolean} True if participant was added, false if channel not found or already a participant
   */
  addParticipant(route, pkr) {
    const channel = this.getChannel(route);
    if (!channel) return false;

    const changed = channel.addParticipant(pkr);
    if (changed) {
      this.#logger.log(`Added participant to channel "${route}".`);
    }

    return changed;
  }

  /**
   * Remove a participant from a channel
   * 
   * @param {string} route - Channel route
   * @param {PKR} pkr - Participant's Public Key Record
   * @returns {boolean} True if participant was removed, false if channel not found or not a participant
   */
  removeParticipant(route, pkr) {
    const channel = this.getChannel(route);
    if (!channel) return false;

    const removed = channel.removeParticipant(pkr);
    if (removed) {
      this.#logger.log(`Removed participant from channel "${route}".`);
    }

    return removed;
  }

  /**
   * Check if a caller can use a channel
   * 
   * @param {string} route - Channel route
   * @param {PKR} callerPkr - Caller's Public Key Record
   * @returns {boolean} True if caller can use the channel, false otherwise
   */
  canUseChannel(route, callerPkr) {
    const channel = this.getChannel(route);
    if (!channel) return false;

    return channel.canUse(callerPkr);
  }

  /**
   * Verify access to a channel (with logging)
   * 
   * @param {string} route - Channel route
   * @param {PKR} callerPkr - Caller's Public Key Record
   * @returns {boolean} True if caller can use the channel, false otherwise
   */
  verifyAccess(route, callerPkr) {
    const ok = this.canUseChannel(route, callerPkr);
    if (!ok) {
      this.#logger.warn(`Access denied for channel "${route}".`);
    }

    return ok;
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  /**
   * Get status information
   * 
   * @returns {Object} Status object with count and channel snapshots
   */
  getStatus() {
    return {
      count: this.#channels.size,
      channels: Array.from(this.#channels.values()).map((ch) => ch.snapshot())
    };
  }

  // ---------------------------------------------------------------------------
  // Disposal
  // ---------------------------------------------------------------------------

  /**
   * Dispose the subsystem and clean up all channels
   * 
   * @returns {Promise<void>}
   */
  async dispose() {
    // Clear all channels
    this.#channels.clear();
    this.#channelsByOwner.clear();

    this.#logger.log('Disposed; all channels cleared.');

    if (typeof super.dispose === 'function') {
      await super.dispose();
    }
  }
}




