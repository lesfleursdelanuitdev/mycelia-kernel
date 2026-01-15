/**
 * useProfileHandlers Hook
 * 
 * Provides profile management handler functions for kernel:// routes.
 * Exposes handlers for creating, querying, applying, and removing security profiles.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object with profile handler methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import * as ProfileHandlers from '../../models/kernel-subsystem/handlers/kernel-handlers-profile.mycelia.js';

export const useProfileHandlers = createHook({
  kind: 'profile-handlers',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'profile-handlers',
  fn: (ctx, api, subsystem) => {
    return new Facet('profileHandlers', {
      attach: true,
      source: import.meta.url,
      contract: 'profile-handlers'
    })
    .add({
      /**
       * Create a new security profile
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Created profile
       */
      createProfile: (message, params, options) => 
        ProfileHandlers.handleCreateProfile(subsystem, message, params, options),

      /**
       * Query a profile by name
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Profile query result
       */
      queryProfile: (message, params, options) => 
        ProfileHandlers.handleQueryProfile(subsystem, message, params, options),

      /**
       * Query all profiles
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of all profiles
       */
      queryProfiles: (message, params, options) => 
        ProfileHandlers.handleQueryProfiles(subsystem, message, params, options),

      /**
       * Apply a profile to a principal
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Apply result
       */
      applyProfile: (message, params, options) => 
        ProfileHandlers.handleApplyProfile(subsystem, message, params, options),

      /**
       * Remove a profile from a principal
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Remove result
       */
      removeProfile: (message, params, options) => 
        ProfileHandlers.handleRemoveProfile(subsystem, message, params, options),

      /**
       * Delete a profile
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Deletion result
       */
      deleteProfile: (message, params, options) => 
        ProfileHandlers.handleDeleteProfile(subsystem, message, params, options)
    });
  }
});

