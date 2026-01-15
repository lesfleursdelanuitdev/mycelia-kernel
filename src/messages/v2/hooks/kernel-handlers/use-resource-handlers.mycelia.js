/**
 * useResourceHandlers Hook
 * 
 * Provides resource management handler functions for kernel:// routes.
 * Exposes handlers for querying, updating, and deleting resources.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object with resource handler methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import * as ResourceHandlers from '../../models/kernel-subsystem/handlers/kernel-handlers-resource.mycelia.js';

export const useResourceHandlers = createHook({
  kind: 'resource-handlers',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'resource-handlers',
  fn: (ctx, api, subsystem) => {
    return new Facet('resourceHandlers', {
      attach: true,
      source: import.meta.url,
      contract: 'resource-handlers'
    })
    .add({
      /**
       * Query a resource by name
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Resource query result
       */
      queryResource: (message, params, options) => 
        ResourceHandlers.handleQueryResource(subsystem, message, params, options),

      /**
       * Query resources owned by the caller
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of owned resources
       */
      queryResourcesByOwner: (message, params, options) => 
        ResourceHandlers.handleQueryResourcesByOwner(subsystem, message, params, options),

      /**
       * Query resources by type
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of resources of the specified type
       */
      queryResourcesByType: (message, params, options) => 
        ResourceHandlers.handleQueryResourcesByType(subsystem, message, params, options),

      /**
       * Update a resource's metadata
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Updated resource
       */
      updateResource: (message, params, options) => 
        ResourceHandlers.handleUpdateResource(subsystem, message, params, options),

      /**
       * Delete a resource
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Deletion result
       */
      deleteResource: (message, params, options) => 
        ResourceHandlers.handleDeleteResource(subsystem, message, params, options)
    });
  }
});

