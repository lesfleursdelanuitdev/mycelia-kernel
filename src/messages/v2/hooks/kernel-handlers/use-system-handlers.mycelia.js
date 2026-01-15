/**
 * useSystemHandlers Hook
 * 
 * Provides system information handler functions for kernel:// routes.
 * Exposes handlers for querying subsystems, status, and statistics.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object with system handler methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import * as SystemHandlers from '../../models/kernel-subsystem/handlers/kernel-handlers-system.mycelia.js';

export const useSystemHandlers = createHook({
  kind: 'system-handlers',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'system-handlers',
  fn: (ctx, api, subsystem) => {
    return new Facet('systemHandlers', {
      attach: true,
      source: import.meta.url,
      contract: 'system-handlers'
    })
    .add({
      /**
       * Query all registered subsystems
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of subsystems
       */
      querySubsystems: (message, params, options) => 
        SystemHandlers.handleQuerySubsystems(subsystem, message, params, options),

      /**
       * Query a subsystem by name
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Subsystem query result
       */
      querySubsystem: (message, params, options) => 
        SystemHandlers.handleQuerySubsystem(subsystem, message, params, options),

      /**
       * Query kernel/system status
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} System status
       */
      queryStatus: (message, params, options) => 
        SystemHandlers.handleQueryStatus(subsystem, message, params, options),

      /**
       * Query system statistics
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} System statistics
       */
      queryStatistics: (message, params, options) => 
        SystemHandlers.handleQueryStatistics(subsystem, message, params, options),

      /**
       * Query all registered kernel routes
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of registered routes
       */
      queryRoutes: (message, params, options) => 
        SystemHandlers.handleQueryRoutes(subsystem, message, params, options)
    });
  }
});

