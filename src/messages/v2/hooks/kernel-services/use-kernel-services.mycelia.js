/**
 * useKernelServices Hook
 * 
 * Installs kernel child subsystems (access-control, error-manager, etc.).
 * Creates child subsystem instances and adds them to the hierarchy.
 * Children will be automatically built by buildChildren() after all hooks are installed.
 * 
 * @param {Object} ctx - Context object containing config.kernelServices for configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance (should be KernelSubsystem)
 * @returns {Facet} Facet object (not attached, just for consistency)
 */
import { createHook } from '../create-hook.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { AccessControlSubsystem } from '../../models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js';
import { ErrorManagerSubsystem } from '../../models/kernel-subsystem/error-manager-subsystem/error-manager.subsystem.mycelia.js';
import { ResponseManagerSubsystem } from '../../models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js';
import { ChannelManagerSubsystem } from '../../models/kernel-subsystem/channel-manager-subsystem/channel-manager.subsystem.mycelia.js';
import { ProfileRegistrySubsystem } from '../../models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js';

export const useKernelServices = createHook({
  kind: 'kernelServices',
  version: '1.0.0',
  overwrite: false,
  required: ['hierarchy'],
  attach: false,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, subsystem) => {
    // Verify hierarchy facet exists
    const hierarchy = subsystem.find('hierarchy');
    if (!hierarchy) {
      throw new Error('useKernelServices: hierarchy facet is required but not found');
    }

    // Get configuration
    const config = ctx.config?.kernelServices || {};
    const kernelServicesConfig = config.services || {};

    // Define child subsystems to create
    const childSubsystems = [
      {
        name: 'access-control',
        SubsystemClass: AccessControlSubsystem,
        config: {
          principals: {
            kernel: subsystem
          },
          ...(kernelServicesConfig['access-control'] || {})
        }
      },
      {
        name: 'error-manager',
        SubsystemClass: ErrorManagerSubsystem,
        config: {
          ...(ctx.config?.errorManager || {}),
          ...(kernelServicesConfig['error-manager'] || {})
        }
      },
      {
        name: 'response-manager',
        SubsystemClass: ResponseManagerSubsystem,
        config: {
          ...(kernelServicesConfig['response-manager'] || {})
        }
      },
      {
        name: 'channel-manager',
        SubsystemClass: ChannelManagerSubsystem,
        config: {
          ...(kernelServicesConfig['channel-manager'] || {})
        }
      },
      {
        name: 'profile-registry',
        SubsystemClass: ProfileRegistrySubsystem,
        config: {
          profiles: {
            kernel: subsystem
          },
          principals: {
            kernel: subsystem
          },
          ...(kernelServicesConfig['profile-registry'] || {})
        }
      }
    ];

    // Get messageSystem from subsystem
    // BaseSubsystem sets this.messageSystem = options.ms in constructor
    // Also check ctx.ms as fallback
    let messageSystem = subsystem.messageSystem;
    if (!messageSystem) {
      messageSystem = subsystem.ctx?.ms;
    }
    
    // If still not found, check ctx.ms directly (from hook context)
    if (!messageSystem) {
      messageSystem = ctx.ms;
    }
    
    // If still not found, try to get from root (MessageSystem is root and is its own ms)
    if (!messageSystem) {
      const root = subsystem.getRoot?.();
      if (root) {
        messageSystem = root.messageSystem || root.ctx?.ms;
        // MessageSystem is its own messageSystem
        if (root.constructor?.name === 'MessageSystem') {
          messageSystem = root;
        }
      }
    }
    
    if (!messageSystem || messageSystem === null || messageSystem === undefined) {
      throw new Error(
        `useKernelServices: cannot find messageSystem. ` +
        `subsystem.messageSystem=${subsystem.messageSystem}, ` +
        `subsystem.ctx?.ms=${subsystem.ctx?.ms}, ` +
        `subsystem.name=${subsystem.name}, ` +
        `subsystem.constructor.name=${subsystem.constructor?.name}`
      );
    }

    // Create and add each child subsystem
    for (const childDef of childSubsystems) {
      // Ensure ms is passed correctly
      if (!messageSystem) {
        throw new Error(`useKernelServices: messageSystem is null/undefined when creating ${childDef.name}`);
      }
      
      const childSubsystem = new childDef.SubsystemClass(childDef.name, {
        ms: messageSystem,
        config: childDef.config,
        debug: ctx.debug || subsystem.debug
      });
      
      // Add to hierarchy (children will be built automatically by buildChildren)
      hierarchy.addChild(childSubsystem);
    }

    // Return a facet (not attached, just for consistency with hook pattern)
    return new Facet('kernelServices', { attach: false, source: import.meta.url });
  }
});

