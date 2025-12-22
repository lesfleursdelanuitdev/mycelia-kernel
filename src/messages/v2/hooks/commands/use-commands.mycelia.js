// hooks/commands/use-commands.mycelia.js

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';

export const useCommands = createHook({
  kind: 'commands',
  version: '1.0.0',
  required: ['requests', 'messages', 'channels'], // see below
  attach: true,
  overwrite: false,
  source: import.meta.url,
  contract: null, // could add a 'commands' contract later
  fn: (ctx, api, subsystem) => {
    const requestsFacet = api.__facets['requests'];
    const messagesFacet = api.__facets['messages'];
    const channelsFacet = api.__facets['channels'];

    if (!requestsFacet || !messagesFacet || !channelsFacet) {
      throw new Error('useCommands: requires requests, messages, and channels facets');
    }

    // In-memory registry of "named" commands for ergonomics
    const commandsByName = new Map();

    function register(name, config) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new Error('useCommands.register: name must be a non-empty string');
      }

      const {
        // The actual command *destination* path
        path,
        // Optional explicit reply channel route
        replyChannel,
        // Optionally let commands hook create/manage the channel
        createChannel = false,
        channelOptions = {},
        // Default timeout for this command (for future ResponseManager use)
        timeout,
        // Optional extra metadata for docs / introspection
        meta = {}
      } = config || {};

      if (typeof path !== 'string' || !path.trim()) {
        throw new Error('useCommands.register: path is required and must be a non-empty string');
      }

      let finalReplyChannel = replyChannel;

      // Optionally create a channel for replies if not provided
      if (!finalReplyChannel && createChannel) {
        // Create channel using channels facet
        const channel = channelsFacet.create(`command/${name}`, channelOptions);
        // Channel object has .route property
        finalReplyChannel = channel.route;
      }

      commandsByName.set(name, {
        path,
        replyChannel: finalReplyChannel,
        timeout,
        meta
      });

      return {
        name,
        path,
        replyChannel: finalReplyChannel,
        timeout,
        meta
      };
    }

    /**
     * Resolve a command by name or treat arg as a direct path.
     */
    function resolveCommand(nameOrPath, options = {}) {
      if (commandsByName.has(nameOrPath)) {
        const cfg = commandsByName.get(nameOrPath);
        return {
          path: cfg.path,
          replyChannel: cfg.replyChannel,
          timeout: options.timeout ?? cfg.timeout,
          meta: { ...cfg.meta, ...(options.meta || {}) }
        };
      }

      // Treat as direct path; replyChannel and timeout must come from options
      return {
        path: nameOrPath,
        replyChannel: options.replyChannel,
        timeout: options.timeout,
        meta: options.meta || {}
      };
    }

    /**
     * Send a command.
     *
     * - Builds a Message from payload + path
     * - Uses RequestBuilder with type 'command'
     * - reply semantics live in send options (replyTo/responseRequired)
     * - ResponseManager handles first reply & timeout
     */
    async function send(nameOrPath, payload, options = {}) {
      const {
        replyChannel,
        timeout,
        meta,
        sendOptions = {} // for passing through to identity.sendProtected
      } = options;

      const resolved = resolveCommand(nameOrPath, { replyChannel, timeout, meta });

      if (!resolved.replyChannel) {
        throw new Error(
          `useCommands.send: replyChannel is required for commands (command: "${nameOrPath}")`
        );
      }

      // Build the command message
      const msg = messagesFacet.create(resolved.path, payload, {
        // NOTE: meta stays frozen; we do NOT embed replyTo/responseRequired here
        ...(resolved.meta || {})
      });

      // Delegate to RequestBuilder(type='command')
      // Use requestsFacet.command() not .create('command')
      const builder = requestsFacet
        .command()
        .with({
          replyTo: resolved.replyChannel, // CommandManager expects 'replyTo', not 'path'
          timeout: resolved.timeout,
          ...sendOptions
        })
        .forMessage(msg);

      // For 'command', .send() is usually "fire, let responses come via channel".
      // It can resolve to the router/sendProtected result, not the business response.
      return builder.send();
    }

    /**
     * Introspection for tooling / docs
     */
    function listCommands() {
      return Array.from(commandsByName.entries()).map(([name, cfg]) => ({
        name,
        path: cfg.path,
        replyChannel: cfg.replyChannel,
        timeout: cfg.timeout,
        meta: cfg.meta
      }));
    }

    return new Facet('commands', {
      attach: true,
      source: import.meta.url
    }).add({
      register,
      send,
      list: listCommands
    });
  }
});


