/**
 * useRequests Hook
 * 
 * Provides request/response functionality to subsystems.
 * Allows subsystems to send messages and wait for responses using a fluent API.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with request methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { RequestBuilder } from './request-builder.mycelia.js';
import { CommandManager } from './command-manager.mycelia.js';
import { performRequest } from './request-core.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useRequests = createHook({
  kind: 'requests',
  version: '1.0.0',
  overwrite: false,
  attach: true,
  required: ['router'], // needs router facet
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.requests || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useRequests ${name}`);
    
    if (debug) {
      logger.log('Initialized requests facet');
    }
    
    // Create CommandManager instance for channel-based commands
    const commandManager = new CommandManager(subsystem);

    return new Facet('requests', { attach: true, source: import.meta.url })
      .add({
        /**
         * Create a one-shot request builder
         * 
         * One-shot requests register a temporary route, send a message, and wait for a response.
         * 
         * @returns {RequestBuilder} Request builder instance for one-shot requests
         * 
         * @example
         * const result = await subsystem.requests
         *   .oneShot()
         *   .with({ handler: async (response) => response.getBody(), timeout: 5000 })
         *   .forMessage(message)
         *   .send();
         */
        oneShot() {
          return new RequestBuilder({
            type: 'oneShot',
            subsystem,
            performRequest,
            commandManager
          });
        },

        /**
         * Create a command request builder
         * 
         * Command requests use channels for replies and rely on ResponseManagerSubsystem for timeout handling.
         * 
         * @returns {RequestBuilder} Request builder instance for command requests
         * 
         * @example
         * const response = await subsystem.requests
         *   .command()
         *   .with({ replyTo: 'subsystem://channel/replies', timeout: 5000 })
         *   .forMessage(commandMessage)
         *   .send();
         * 
         * // Handle reply on channel route
         * subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
         *   subsystem.requests.commandManager.handleCommandReply(responseMessage);
         * });
         */
        command() {
          return new RequestBuilder({
            type: 'command',
            subsystem,
            performRequest,
            commandManager
          });
        },

        /**
         * Get the CommandManager instance for channel-based commands
         * 
         * @returns {CommandManager} CommandManager instance
         * 
         * @example
         * // Send a command via channel
         * const response = await subsystem.requests.commandManager.sendCommand({
         *   message: commandMessage,
         *   options: {
         *     replyTo: 'subsystem://channel/replies',
         *     timeout: 5000
         *   }
         * });
         * 
         * // Handle reply on channel route
         * subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
         *   subsystem.requests.commandManager.handleCommandReply(responseMessage);
         * });
         */
        get commandManager() {
          return commandManager;
        }
      });
  }
});

