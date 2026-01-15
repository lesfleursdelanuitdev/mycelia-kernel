/**
 * usePermissionHandlers Hook
 * 
 * Provides permission management handler functions for kernel:// routes.
 * Exposes handlers for querying, granting, and revoking permissions.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object with permission handler methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import * as PermissionHandlers from '../../models/kernel-subsystem/handlers/kernel-handlers-permission.mycelia.js';

export const usePermissionHandlers = createHook({
  kind: 'permission-handlers',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'permission-handlers',
  fn: (ctx, api, subsystem) => {
    return new Facet('permissionHandlers', {
      attach: true,
      source: import.meta.url,
      contract: 'permission-handlers'
    })
    .add({
      /**
       * Query permissions for a resource
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Permission query result
       */
      queryPermissions: (message, params, options) => 
        PermissionHandlers.handleQueryPermissions(subsystem, message, params, options),

      /**
       * Grant a permission on a resource
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Grant result
       */
      grantPermission: (message, params, options) => 
        PermissionHandlers.handleGrantPermission(subsystem, message, params, options),

      /**
       * Revoke a permission on a resource
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Revoke result
       */
      revokePermission: (message, params, options) => 
        PermissionHandlers.handleRevokePermission(subsystem, message, params, options),

      /**
       * Query inherited permissions for a resource
       * @param {Message} message - The message
       * @param {Object} params - Route parameters
       * @param {Object} options - Message options
       * @returns {Promise<Object>} Inherited permissions result
       */
      queryInheritedPermissions: (message, params, options) => 
        PermissionHandlers.handleQueryInheritedPermissions(subsystem, message, params, options)
    });
  }
});

