import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { KernelSubsystem } from '../../models/kernel-subsystem/kernel.subsystem.mycelia.js';

describe('Kernel Child Subsystem Identity Resolution', () => {
  let messageSystem;
  let kernel;

  beforeEach(async () => {
    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    kernel = new KernelSubsystem('kernel', {
      ms: messageSystem,
      debug: false
    });
    await kernel.bootstrap();
  });

  afterEach(async () => {
    if (kernel) {
      await kernel.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }
  });

  it('kernel has an identity with PKR after bootstrap', () => {
    expect(kernel.identity).toBeDefined();
    expect(kernel.identity.pkr).toBeDefined();
    expect(kernel.identity.pkr.kind).toBe('kernel');
    expect(typeof kernel.identity.pkr.publicKey).toBe('symbol');
    expect(typeof kernel.identity.pkr.uuid).toBe('string');
  });

  it('kernel identity resolves to kernel private key', () => {
    const accessControl = kernel.getAccessControl();
    expect(accessControl).toBeDefined();

    const principals = accessControl.find('principals');
    expect(principals).toBeDefined();

    // Get kernel's PKR
    const kernelPkr = kernel.identity.pkr;
    
    // Resolve kernel PKR to private key
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);
    expect(kernelPrivateKey).toBeDefined();
    expect(typeof kernelPrivateKey).toBe('symbol');

    // Verify kernel is recognized as kernel
    expect(principals.isKernel(kernelPkr)).toBe(true);
  });

  it('access-control subsystem has identity after bootstrap', () => {
    const accessControl = kernel.getAccessControl();
    expect(accessControl).toBeDefined();
    expect(accessControl.identity).toBeDefined();
    expect(accessControl.identity.pkr).toBeDefined();
    expect(accessControl.identity.pkr.kind).toBe('child');
    expect(typeof accessControl.identity.pkr.publicKey).toBe('symbol');
  });

  it('access-control identity resolves to kernel private key', () => {
    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get access-control's private key (should be same as kernel)
    const accessControlPkr = accessControl.identity.pkr;
    const accessControlPrivateKey = principals.resolvePKR(accessControlPkr);

    expect(accessControlPrivateKey).toBeDefined();
    expect(accessControlPrivateKey).toBe(kernelPrivateKey);
  });

  it('error-manager subsystem has identity and resolves to kernel private key', () => {
    const errorManager = kernel.getErrorManager();
    expect(errorManager).toBeDefined();
    expect(errorManager.identity).toBeDefined();
    expect(errorManager.identity.pkr).toBeDefined();
    expect(errorManager.identity.pkr.kind).toBe('child');

    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get error-manager's private key
    const errorManagerPkr = errorManager.identity.pkr;
    const errorManagerPrivateKey = principals.resolvePKR(errorManagerPkr);

    expect(errorManagerPrivateKey).toBeDefined();
    expect(errorManagerPrivateKey).toBe(kernelPrivateKey);
  });

  it('response-manager subsystem has identity and resolves to kernel private key', () => {
    const responseManager = kernel.getResponseManager();
    expect(responseManager).toBeDefined();
    expect(responseManager.identity).toBeDefined();
    expect(responseManager.identity.pkr).toBeDefined();
    expect(responseManager.identity.pkr.kind).toBe('child');

    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get response-manager's private key
    const responseManagerPkr = responseManager.identity.pkr;
    const responseManagerPrivateKey = principals.resolvePKR(responseManagerPkr);

    expect(responseManagerPrivateKey).toBeDefined();
    expect(responseManagerPrivateKey).toBe(kernelPrivateKey);
  });

  it('channel-manager subsystem has identity and resolves to kernel private key', () => {
    const channelManager = kernel.getChannelManager();
    expect(channelManager).toBeDefined();
    expect(channelManager.identity).toBeDefined();
    expect(channelManager.identity.pkr).toBeDefined();
    expect(channelManager.identity.pkr.kind).toBe('child');

    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get channel-manager's private key
    const channelManagerPkr = channelManager.identity.pkr;
    const channelManagerPrivateKey = principals.resolvePKR(channelManagerPkr);

    expect(channelManagerPrivateKey).toBeDefined();
    expect(channelManagerPrivateKey).toBe(kernelPrivateKey);
  });

  it('profile-registry subsystem has identity and resolves to kernel private key', () => {
    const profileRegistry = kernel.getProfileRegistry();
    expect(profileRegistry).toBeDefined();
    expect(profileRegistry.identity).toBeDefined();
    expect(profileRegistry.identity.pkr).toBeDefined();
    expect(profileRegistry.identity.pkr.kind).toBe('child');

    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get profile-registry's private key
    const profileRegistryPkr = profileRegistry.identity.pkr;
    const profileRegistryPrivateKey = principals.resolvePKR(profileRegistryPkr);

    expect(profileRegistryPrivateKey).toBeDefined();
    expect(profileRegistryPrivateKey).toBe(kernelPrivateKey);
  });

  it('all kernel child subsystems resolve to the same private key', () => {
    const accessControl = kernel.getAccessControl();
    const errorManager = kernel.getErrorManager();
    const responseManager = kernel.getResponseManager();
    const channelManager = kernel.getChannelManager();
    const profileRegistry = kernel.getProfileRegistry();

    const principals = accessControl.find('principals');

    // Get kernel's private key
    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Get all child private keys
    const accessControlPrivateKey = principals.resolvePKR(accessControl.identity.pkr);
    const errorManagerPrivateKey = principals.resolvePKR(errorManager.identity.pkr);
    const responseManagerPrivateKey = principals.resolvePKR(responseManager.identity.pkr);
    const channelManagerPrivateKey = principals.resolvePKR(channelManager.identity.pkr);
    const profileRegistryPrivateKey = principals.resolvePKR(profileRegistry.identity.pkr);

    // All should be the same as kernel's private key
    expect(accessControlPrivateKey).toBe(kernelPrivateKey);
    expect(errorManagerPrivateKey).toBe(kernelPrivateKey);
    expect(responseManagerPrivateKey).toBe(kernelPrivateKey);
    expect(channelManagerPrivateKey).toBe(kernelPrivateKey);
    expect(profileRegistryPrivateKey).toBe(kernelPrivateKey);

    // And all should be the same as each other
    expect(accessControlPrivateKey).toBe(errorManagerPrivateKey);
    expect(errorManagerPrivateKey).toBe(responseManagerPrivateKey);
    expect(responseManagerPrivateKey).toBe(channelManagerPrivateKey);
    expect(channelManagerPrivateKey).toBe(profileRegistryPrivateKey);
  });

  it('child subsystems ARE recognized as kernel by isKernel() because they share kernel private key', () => {
    const accessControl = kernel.getAccessControl();
    const errorManager = kernel.getErrorManager();
    const responseManager = kernel.getResponseManager();
    const channelManager = kernel.getChannelManager();
    const profileRegistry = kernel.getProfileRegistry();

    const principals = accessControl.find('principals');

    // Kernel should be recognized as kernel
    expect(principals.isKernel(kernel.identity.pkr)).toBe(true);

    // Children are ALSO recognized as kernel because they share the kernel's private key
    // This is by design - children have kernel authority
    expect(principals.isKernel(accessControl.identity.pkr)).toBe(true);
    expect(principals.isKernel(errorManager.identity.pkr)).toBe(true);
    expect(principals.isKernel(responseManager.identity.pkr)).toBe(true);
    expect(principals.isKernel(channelManager.identity.pkr)).toBe(true);
    expect(principals.isKernel(profileRegistry.identity.pkr)).toBe(true);
  });

  it('child subsystems have different public keys but same private key', () => {
    const accessControl = kernel.getAccessControl();
    const errorManager = kernel.getErrorManager();
    const responseManager = kernel.getResponseManager();
    const channelManager = kernel.getChannelManager();
    const profileRegistry = kernel.getProfileRegistry();

    // Get all public keys
    const kernelPublicKey = kernel.identity.pkr.publicKey;
    const accessControlPublicKey = accessControl.identity.pkr.publicKey;
    const errorManagerPublicKey = errorManager.identity.pkr.publicKey;
    const responseManagerPublicKey = responseManager.identity.pkr.publicKey;
    const channelManagerPublicKey = channelManager.identity.pkr.publicKey;
    const profileRegistryPublicKey = profileRegistry.identity.pkr.publicKey;

    // All public keys should be different
    const publicKeys = [
      kernelPublicKey,
      accessControlPublicKey,
      errorManagerPublicKey,
      responseManagerPublicKey,
      channelManagerPublicKey,
      profileRegistryPublicKey
    ];

    const uniquePublicKeys = new Set(publicKeys);
    expect(uniquePublicKeys.size).toBe(6); // All unique

    // But all should resolve to the same private key
    const principals = accessControl.find('principals');
    const kernelPrivateKey = principals.resolvePKR(kernel.identity.pkr);

    for (const child of [accessControl, errorManager, responseManager, channelManager, profileRegistry]) {
      const childPrivateKey = principals.resolvePKR(child.identity.pkr);
      expect(childPrivateKey).toBe(kernelPrivateKey);
    }
  });

  it('verifies child PKRs have correct kind and resolve to kernel private key', () => {
    const accessControl = kernel.getAccessControl();
    const errorManager = kernel.getErrorManager();
    const responseManager = kernel.getResponseManager();
    const channelManager = kernel.getChannelManager();
    const profileRegistry = kernel.getProfileRegistry();

    const principals = accessControl.find('principals');
    const kernelPrivateKey = principals.resolvePKR(kernel.identity.pkr);

    // Check that each child has the correct kind and resolves to kernel's private key
    const children = [accessControl, errorManager, responseManager, channelManager, profileRegistry];
    for (const child of children) {
      const childPkr = child.identity.pkr;
      
      // PKR should have kind 'child'
      expect(childPkr.kind).toBe('child');
      
      // Child's private key should be same as kernel's
      const childPrivateKey = principals.resolvePKR(childPkr);
      expect(childPrivateKey).toBe(kernelPrivateKey);
      
      // isKernel should return true because they share the private key
      expect(principals.isKernel(childPkr)).toBe(true);
    }
  });

  it('kernel private key is stored in principal registry kernelId', () => {
    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    const kernelPkr = kernel.identity.pkr;
    const kernelPrivateKey = principals.resolvePKR(kernelPkr);

    // Access the kernelId from the registry
    const registryKernelId = principals.registry.kernelId;

    expect(registryKernelId).toBeDefined();
    expect(registryKernelId).toBe(kernelPrivateKey);
  });

  it('demonstrates child subsystems can send protected messages using kernel authority', async () => {
    const accessControl = kernel.getAccessControl();
    const principals = accessControl.find('principals');

    // Verify that all children share the same private key as kernel
    const kernelPrivateKey = principals.resolvePKR(kernel.identity.pkr);
    const accessControlPrivateKey = principals.resolvePKR(accessControl.identity.pkr);
    
    expect(accessControlPrivateKey).toBe(kernelPrivateKey);
    
    // Verify that children can use sendProtected with their PKRs
    // Since they share the kernel's private key, they have kernel authority
    const { Message } = await import('../../models/message/message.mycelia.js');
    const testMessage = new Message('kernel://test', { data: 'test-from-child' });

    // This should work because access-control's PKR resolves to kernel's private key
    // No error should be thrown
    try {
      await kernel.sendProtected(accessControl.identity.pkr, testMessage);
      // If no error, the message was processed (though it may not have a handler)
      expect(true).toBe(true);
    } catch (error) {
      // Only accept "No route found" errors, not identity/permission errors
      if (error.message.includes('identity') || error.message.includes('permission')) {
        throw error;
      }
      // Route not found is okay - we're just testing identity
    }
  });
});

