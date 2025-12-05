/**
 * useMessageSystemRouter Hook
 * 
 * Provides message routing functionality to subsystems using MessageRouter.
 * Routes messages to appropriate subsystems based on message paths.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.ms - MessageSystem instance (required)
 * @param {Object} ctx.config?.messageSystemRouter - Router configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with router methods
 */
import { MessageRouter } from '../../models/message-system/message-router.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useMessageSystemRouter = createHook({
  kind: 'messageSystemRouter',
  version: '1.0.0',
  overwrite: false,
  required: ['messageSystemRegistry'],
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const { ms } = ctx;
    
    // Validate required dependencies
    if (!ms) {
      throw new Error(`useMessageSystemRouter ${name}: MessageSystem (ctx.ms) is required but not found`);
    }

    // Get registry from messageSystemRegistry facet (required dependency)
    // Use subsystem.find() to access the facet
    const registryFacet = subsystem.find('messageSystemRegistry');
    if (!registryFacet) {
      throw new Error(`useMessageSystemRouter ${name}: messageSystemRegistry facet not found. Ensure useMessageSystemRegistry hook is used and executes before useMessageSystemRouter.`);
    }

    // Get the registry instance from the facet's _registry property
    const subsystems = registryFacet._registry;
    if (!subsystems) {
      throw new Error(`useMessageSystemRouter ${name}: messageSystemRegistry facet is missing _registry property.`);
    }
    
    const config = ctx.config?.messageSystemRouter || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useMessageSystemRouter ${name}`);
    
    // Create MessageRouter instance
    const router = new MessageRouter(ms, null, subsystems, {
      debug: debug,
      ...config.options // Allow additional options
    });
    
    if (debug) {
      logger.log('Initialized MessageRouter');
    }
    
    return new Facet('messageSystemRouter', { attach: true, source: import.meta.url })
      .add({
        /**
         * Route a message to the appropriate subsystem based on its path
         * @param {Message} message - Message to route (must have valid path format)
         * @param {Object} [options={}] - Options to pass to subsystem accept()
         * @returns {Promise<Object>} Routing result object
         * @returns {boolean} result.success - Whether routing was successful
         * @returns {string} [result.subsystem] - Target subsystem name (if successful)
         * @returns {string} [result.messageId] - Message ID for tracing
         * @returns {Object} [result.result] - Subsystem acceptance result (if successful)
         * @returns {string} [result.error] - Error message (if failed)
         * 
         * @example
         * const message = new Message('canvas://layers/create', { name: 'background' });
         * const result = await subsystem.messageSystemRouter.route(message);
         * 
         * if (result.success) {
         *   console.log(`Message routed to ${result.subsystem}`);
         * } else {
         *   console.error(`Routing failed: ${result.error}`);
         * }
         */
        async route(message, options = {}) {
          const result = await router.route(message, options);
          if (debug) {
            if (result.success) {
              logger.log(`Routed message ${message.id} to ${result.subsystem}`);
            } else {
              logger.error(`Failed to route message ${message.id}: ${result.error}`);
            }
          }
          return result;
        },

        /**
         * Route message to a specific subsystem
         * @param {Message} message - Message to route
         * @param {BaseSubsystem} subsystem - Target subsystem
         * @param {Object} [options={}] - Options to pass to accept() or processImmediately()
         * @returns {Promise<Object>} Routing result
         * 
         * @example
         * const result = await subsystem.messageSystemRouter.routeToSubsystem(message, targetSubsystem);
         */
        async routeToSubsystem(message, targetSubsystem, options = {}) {
          const result = await router.routeToSubsystem(message, targetSubsystem, options);
          if (debug) {
            logger.log(`Routed message ${message.id} to subsystem ${targetSubsystem.name}`);
          }
          return result;
        },

        /**
         * Get router statistics
         * @returns {Object} Statistics object
         * 
         * @example
         * const stats = subsystem.messageSystemRouter.getStatistics();
         * console.log('Messages routed:', stats.messagesRouted);
         */
        getStatistics() {
          return router.getStatistics();
        },

        /**
         * Set the kernel subsystem.
         * Only sets the kernel if it is currently null.
         * 
         * @param {KernelSubsystem} kernel - The kernel subsystem instance
         * @returns {boolean} True if kernel was set, false if it was already set
         * 
         * @example
         * const wasSet = subsystem.messageSystemRouter.setKernel(kernelSubsystem);
         * if (wasSet) {
         *   console.log('Kernel was set');
         * } else {
         *   console.log('Kernel was already set');
         * }
         */
        setKernel(kernel) {
          const wasSet = router.setKernel(kernel);
          if (debug) {
            if (wasSet) {
              logger.log('Kernel set on router');
            } else {
              logger.warn('Kernel was already set on router');
            }
          }
          return wasSet;
        },

        /**
         * Clear all statistics
         * @returns {void}
         * 
         * @example
         * subsystem.messageSystemRouter.clear();
         */
        clear() {
          router.clear();
          if (debug) {
            logger.log('Cleared router statistics');
          }
        },

        // Expose router instance for internal use (if needed by other hooks)
        _router: router
      });
  }
});

