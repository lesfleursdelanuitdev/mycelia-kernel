/**
 * useChannels Hook
 * 
 * Lightweight helper facet for working with long-lived channels from a subsystem.
 * 
 * Depends on:
 * - subsystem.identity with:
 *   - identity.createChannel(route, { participants, metadata })
 *   - identity.getChannel(nameOrRoute)
 *   - identity.listChannels()
 * 
 * Provides:
 * - subsystem.channels.buildRoute(localName) -> full route
 * - subsystem.channels.create(localName, { participants, metadata }) -> Channel
 * - subsystem.channels.createWithRoute(route, { participants, metadata }) -> Channel
 * - subsystem.channels.get(nameOrRoute) -> Channel | null
 * - subsystem.channels.list() -> Array<Channel>
 * 
 * NOTE:
 * - This hook NEVER touches kernel or ChannelManager directly.
 * - All access goes through identity, which is allowed to talk to kernel services.
 */
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';

export const useChannels = createHook({
  kind: 'channels',
  version: '1.0.0',
  overwrite: false,
  required: [], // identity is not a facet; checked lazily at call time
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    /**
     * Ensure identity is available and throw a helpful error if not.
     * 
     * @returns {Object} Identity object with channel methods
     * @throws {Error} If identity is not available
     */
    function ensureIdentity() {
      const id = subsystem.identity;
      if (!id) {
        throw new Error(
          'channels facet: subsystem.identity is required. ' +
          'Ensure the subsystem has been registered via AccessControl.'
        );
      }
      return id;
    }

    return new Facet('channels', {
      attach: true,
      source: import.meta.url
    }).add({
      /**
       * Build a canonical channel route for this subsystem.
       * 
       * Uses subsystem.getNameString() to build a route like:
       * - subsystem.getNameString() -> "ui://"
       * - localName = "graph-layout"
       * - => "ui://channel/graph-layout"
       * 
       * @param {string} localName - Local channel name (no scheme/prefix)
       * @returns {string} Fully qualified channel route
       * @throws {Error} If localName is not a non-empty string
       * 
       * @example
       * const route = subsystem.channels.buildRoute('graph-layout');
       * // Returns: "ui://channel/graph-layout" (if subsystem name is "ui://")
       */
      buildRoute(localName) {
        if (typeof localName !== 'string' || !localName.trim()) {
          throw new Error('channels.buildRoute: localName must be a non-empty string.');
        }

        const nameString =
          (typeof subsystem.getNameString === 'function'
            ? subsystem.getNameString()
            : null) ||
          `${subsystem.name}://`;

        const base = nameString.endsWith('://')
          ? nameString
          : `${nameString}://`;

        return `${base}channel/${localName}`;
      },

      /**
       * Create a channel using a local name (preferred ergonomic API).
       * 
       * Automatically builds the route using buildRoute() and sets metadata.name
       * to help ChannelManager.getChannelFor() find channels by short name.
       * 
       * @param {string} localName - Local channel name (no scheme/prefix)
       * @param {Object} [options={}]
       * @param {Array<any>} [options.participants=[]] - PKRs allowed to use the channel
       * @param {Object} [options.metadata={}] - Optional channel metadata
       * @returns {Channel} Channel instance
       * @throws {Error} If identity is not available
       * @throws {Error} If localName is invalid
       * 
       * @example
       * const channel = subsystem.channels.create('graph-layout', {
       *   participants: [otherPkr],
       *   metadata: { description: 'Layout updates' }
       * });
       */
      create(localName, { participants = [], metadata = {} } = {}) {
        const identity = ensureIdentity();
        const route = this.buildRoute(localName);

        // Help ChannelManager.getChannelFor by defaulting metadata.name to localName
        const mergedMetadata =
          metadata && metadata.name == null
            ? { ...metadata, name: localName }
            : metadata;

        return identity.createChannel(route, {
          participants,
          metadata: mergedMetadata
        });
      },

      /**
       * Create a channel with a fully specified route string.
       * 
       * Use this when you need to create a channel with a custom route
       * that doesn't follow the standard subsystem://channel/{name} pattern.
       * 
       * @param {string} route - Fully qualified channel route
       * @param {Object} [options={}]
       * @param {Array<any>} [options.participants=[]] - PKRs allowed to use the channel
       * @param {Object} [options.metadata={}] - Optional channel metadata
       * @returns {Channel} Channel instance
       * @throws {Error} If identity is not available
       * @throws {Error} If route is not a non-empty string
       * 
       * @example
       * const channel = subsystem.channels.createWithRoute('custom://special/channel', {
       *   participants: [otherPkr],
       *   metadata: { type: 'special' }
       * });
       */
      createWithRoute(route, { participants = [], metadata = {} } = {}) {
        if (typeof route !== 'string' || !route.trim()) {
          throw new Error('channels.createWithRoute: route must be a non-empty string.');
        }

        const identity = ensureIdentity();
        return identity.createChannel(route, {
          participants,
          metadata
        });
      },

      /**
       * Get a channel owned by this subsystem's identity by name or route.
       * 
       * nameOrRoute can be:
       * - full route: "canvas://channel/layout"
       * - short name: "layout" (searches by metadata.name or route suffix)
       * 
       * @param {string} nameOrRoute - Channel name or full route
       * @returns {Channel|null} Channel instance or null if not found
       * @throws {Error} If identity is not available
       * @throws {Error} If nameOrRoute is invalid
       * 
       * @example
       * const channel = subsystem.channels.get('graph-layout');
       * if (channel) {
       *   console.log('Channel found:', channel.route);
       * }
       */
      get(nameOrRoute) {
        const identity = ensureIdentity();
        return identity.getChannel(nameOrRoute);
      },

      /**
       * Ensure a channel exists, creating it if it doesn't.
       * 
       * First attempts to get the channel. If it doesn't exist, creates it.
       * 
       * nameOrRoute can be:
       * - full route: "canvas://channel/layout" (uses createWithRoute)
       * - short name: "layout" (uses create with local name)
       * 
       * @param {string} nameOrRoute - Channel name or full route
       * @param {Object} [options={}]
       * @param {Array<any>} [options.participants=[]] - PKRs allowed to use the channel (only used if channel is created)
       * @param {Object} [options.metadata={}] - Optional channel metadata (only used if channel is created)
       * @returns {Channel} Channel instance (existing or newly created)
       * @throws {Error} If identity is not available
       * @throws {Error} If nameOrRoute is invalid
       * 
       * @example
       * // Ensure a channel exists with a local name
       * const channel = subsystem.channels.ensureChannel('graph-layout', {
       *   participants: [otherPkr],
       *   metadata: { description: 'Layout updates' }
       * });
       * 
       * @example
       * // Ensure a channel exists with a full route
       * const channel = subsystem.channels.ensureChannel('custom://special/channel', {
       *   participants: [otherPkr]
       * });
       */
      ensureChannel(nameOrRoute, { participants = [], metadata = {} } = {}) {
        if (typeof nameOrRoute !== 'string' || !nameOrRoute.trim()) {
          throw new Error('channels.ensureChannel: nameOrRoute must be a non-empty string.');
        }

        // Try to get existing channel first
        const existing = this.get(nameOrRoute);
        if (existing) {
          return existing;
        }

        // Channel doesn't exist, create it
        // If nameOrRoute contains "://", treat it as a full route
        if (nameOrRoute.includes('://')) {
          return this.createWithRoute(nameOrRoute, { participants, metadata });
        }

        // Otherwise, treat it as a local name
        return this.create(nameOrRoute, { participants, metadata });
      },

      /**
       * List all channels owned by this subsystem's identity.
       * 
       * @returns {Array<Channel>} Array of channel instances owned by this identity
       * @throws {Error} If identity is not available
       * 
       * @example
       * const channels = subsystem.channels.list();
       * channels.forEach(ch => {
       *   console.log(`Channel: ${ch.route}, Participants: ${ch.participants.size}`);
       * });
       */
      list() {
        const identity = ensureIdentity();
        return identity.listChannels();
      }
    });
  }
});



