/**
 * useFriendHandlers Hook
 * 
 * Provides friend management handler functions for kernel:// routes.
 * Exposes handlers for querying, updating, and deleting friends.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object with friend handler methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import * as FriendHandlers from '../../models/kernel-subsystem/handlers/kernel-handlers-friend.mycelia.js';

export const useFriendHandlers = createHook({
  kind: 'friend-handlers',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'friend-handlers',
  fn: (ctx, api, subsystem) => {
    return new Facet('friendHandlers', {
      attach: true,
      source: import.meta.url,
      contract: 'friend-handlers'
    })
    .add({
      /**
       * Query a friend by name
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Friend query result
       */
      queryFriend: (message, params, options) => 
        FriendHandlers.handleQueryFriend(subsystem, message, params, options),

      /**
       * Query a friend by PKR UUID
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Friend query result
       */
      queryFriendByPkr: (message, params, options) => 
        FriendHandlers.handleQueryFriendByPkr(subsystem, message, params, options),

      /**
       * Query all friends
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} List of all friends
       */
      queryFriends: (message, params, options) => 
        FriendHandlers.handleQueryFriends(subsystem, message, params, options),

      /**
       * Update a friend's metadata
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Updated friend
       */
      updateFriend: (message, params, options) => 
        FriendHandlers.handleUpdateFriend(subsystem, message, params, options),

      /**
       * Delete a friend
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Deletion result
       */
      deleteFriend: (message, params, options) => 
        FriendHandlers.handleDeleteFriend(subsystem, message, params, options)
    });
  }
});

