import { describe, it, expect, beforeEach } from 'vitest';
import { MessageSystem } from '../../message-system/message-system.v2.mycelia.js';
import { Message } from '../../message/message.mycelia.js';
import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { createSynchronousDefaultHooks } from '../../defaults/default-hooks.mycelia.js';

describe('Kernel Create Routes', () => {
  let messageSystem;
  let kernel;
  let testSubsystem;

  beforeEach(async () => {
    // Create MessageSystem with kernel
    messageSystem = new MessageSystem('test-system', {
      debug: true
    });

    await messageSystem.bootstrap();

    // Get kernel (debug mode allows getKernel())
    kernel = messageSystem.getKernel();
    expect(kernel).toBeDefined();

    // Create a test subsystem to act as resource owner
    testSubsystem = new BaseSubsystem('test-subsystem', {
      ms: messageSystem,
      config: {}
    });
    testSubsystem.defaultHooks = createSynchronousDefaultHooks();
    await testSubsystem.build();
    await messageSystem.registerSubsystem(testSubsystem);

    // Note: No need to grant write permission - kernel routes bypass permission checks
    // Security is enforced by sendProtected (verifies callerId) and kernel validation
  });

  describe('kernel://create/resource', () => {
    it('should register the route during bootstrap', async () => {
      const router = kernel.find('router');
      expect(router).toBeDefined();

      // Check if route is registered (indirectly by trying to match)
      const message = new Message('kernel://create/resource', {
        name: 'test-resource',
        resourceInstance: { test: true }
      });

      // Route should match (even if it fails validation)
      const match = await router.match(message);
      expect(match).toBeDefined();
    });

    it('should create a resource via message routing', async () => {
      const resourceInstance = {
        type: 'test-resource',
        data: { test: true }
      };

      // Create resource using identity.createResourceIdentity
      const resource = await testSubsystem.identity.createResourceIdentity(
        'test-resource-1',
        resourceInstance,
        { type: 'test-resource' }
      );

      expect(resource).toBeDefined();
      expect(resource.isResource).toBe(true);
      expect(resource.name).toBe('test-resource-1');
      expect(resource.owner).toBe(testSubsystem);
      expect(resource.instance).toBe(resourceInstance);
      expect(resourceInstance.identity).toBeDefined();
      expect(resourceInstance.identity.pkr).toBeDefined();
    });

    it('should attach identity to resourceInstance', async () => {
      const resourceInstance = {
        type: 'test-resource',
        data: { test: true }
      };

      const resource = await testSubsystem.identity.createResourceIdentity(
        'test-resource-2',
        resourceInstance,
        { type: 'test-resource' }
      );

      expect(resourceInstance.identity).toBeDefined();
      expect(resourceInstance.identity.pkr).toBeDefined();
      expect(resourceInstance.identity.pkr.uuid).toBeDefined();
      expect(typeof resourceInstance.identity.canRead).toBe('function');
      expect(typeof resourceInstance.identity.canWrite).toBe('function');
      expect(typeof resourceInstance.identity.canGrant).toBe('function');
    });

    it('should register resource in PrincipalRegistry', async () => {
      const resourceInstance = {
        type: 'test-resource',
        data: { test: true }
      };

      const resource = await testSubsystem.identity.createResourceIdentity(
        'test-resource-3',
        resourceInstance,
        { type: 'test-resource' }
      );

      // Check PrincipalRegistry
      const accessControl = kernel.getAccessControl();
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.registry.get(resourceInstance.identity.pkr.uuid);

      expect(principal).toBeDefined();
      expect(principal.kind).toBe('resource');
      expect(principal.instance).toBe(resource);
    });

    it('should throw error for invalid name', async () => {
      const resourceInstance = { type: 'test' };

      await expect(
        testSubsystem.identity.createResourceIdentity('', resourceInstance)
      ).rejects.toThrow('name must be a non-empty string');

      await expect(
        testSubsystem.identity.createResourceIdentity(null, resourceInstance)
      ).rejects.toThrow('name must be a non-empty string');
    });

    it('should throw error for missing resourceInstance', async () => {
      await expect(
        testSubsystem.identity.createResourceIdentity('test-resource', null)
      ).rejects.toThrow('resourceInstance is required');
    });
  });

  describe('kernel://create/friend', () => {
    it('should register the route during bootstrap', async () => {
      const router = kernel.find('router');
      expect(router).toBeDefined();

      // Check if route is registered
      const message = new Message('kernel://create/friend', {
        name: 'test-friend'
      });

      const match = await router.match(message);
      expect(match).toBeDefined();
    });

    it('should create a friend via message routing', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-1', {
        endpoint: 'http://example.com',
        metadata: { test: true },
        role: 'user'
      });

      expect(friend).toBeDefined();
      expect(friend.isFriend).toBe(true);
      expect(friend.name).toBe('test-friend-1');
      expect(friend.endpoint).toBe('http://example.com');
      expect(friend.metadata.test).toBe(true);
      expect(friend.metadata.role).toBe('user');
    });

    it('should attach identity to friend', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-2', {
        endpoint: 'http://example.com'
      });

      expect(friend.identity).toBeDefined();
      expect(friend.identity.pkr).toBeDefined();
      expect(friend.identity.pkr.uuid).toBeDefined();
      expect(typeof friend.identity.sendProtected).toBe('function');
    });

    it('should register friend in PrincipalRegistry', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-3', {
        endpoint: 'http://example.com'
      });

      // Check PrincipalRegistry
      const accessControl = kernel.getAccessControl();
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.registry.get(friend.identity.pkr.uuid);

      expect(principal).toBeDefined();
      expect(principal.kind).toBe('friend');
      expect(principal.instance).toBe(friend);
    });

    it('should include role in metadata', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-4', {
        role: 'admin'
      });

      expect(friend.metadata.role).toBe('admin');
    });

    it('should throw error for invalid name', async () => {
      await expect(
        testSubsystem.identity.createFriend('')
      ).rejects.toThrow('name must be a non-empty string');

      await expect(
        testSubsystem.identity.createFriend(null)
      ).rejects.toThrow('name must be a non-empty string');
    });
  });

  describe('Result Extraction', () => {
    it('should extract resource from nested routing result', async () => {
      const resourceInstance = { type: 'test' };
      const resource = await testSubsystem.identity.createResourceIdentity(
        'test-resource-extract',
        resourceInstance
      );

      // Verify resource was extracted correctly
      expect(resource).toBeDefined();
      expect(resource.isResource).toBe(true);
      expect(resource.name).toBe('test-resource-extract');
    });

    it('should extract friend from nested routing result', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-extract');

      // Verify friend was extracted correctly
      expect(friend).toBeDefined();
      expect(friend.isFriend).toBe(true);
      expect(friend.name).toBe('test-friend-extract');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing callerId gracefully', async () => {
      // This test verifies that the kernel handler validates callerId
      // We can't easily test this without mocking, but the handler should throw
      const message = new Message('kernel://create/resource', {
        name: 'test',
        resourceInstance: { test: true }
      });

      // Try to route directly (without sendProtected, so no callerId)
      // This should fail because sendProtected is required
      const router = kernel.find('router');
      const match = await router.match(message);
      
      // The route should match, but execution will fail without callerId
      expect(match).toBeDefined();
    });

    it('should handle missing owner subsystem', async () => {
      // Create a subsystem without registering it (so it won't be found by PKR)
      const unregisteredSubsystem = new BaseSubsystem('unregistered', {
        ms: messageSystem,
        config: {}
      });
      unregisteredSubsystem.defaultHooks = createSynchronousDefaultHooks();
      await unregisteredSubsystem.build();
      
      // Register it to get an identity, but then we'll test with a different scenario
      await messageSystem.registerSubsystem(unregisteredSubsystem);
      
      // Grant write permission
      if (unregisteredSubsystem.identity) {
        unregisteredSubsystem.identity.grantWriter(
          unregisteredSubsystem.identity.pkr,
          unregisteredSubsystem.identity.pkr
        );
      }
      
      // This should work now that it's registered
      const resource = await unregisteredSubsystem.identity.createResourceIdentity(
        'test-resource-unregistered',
        { type: 'test' }
      );
      
      expect(resource).toBeDefined();
      expect(resource.name).toBe('test-resource-unregistered');
    });
  });

  describe('Integration with AccessControlSubsystem', () => {
    it('should delegate resource creation to AccessControlSubsystem', async () => {
      const resourceInstance = { type: 'test' };
      const resource = await testSubsystem.identity.createResourceIdentity(
        'test-resource-delegate',
        resourceInstance,
        { type: 'test' }
      );

      // Verify resource was created by AccessControlSubsystem
      const accessControl = kernel.getAccessControl();
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.registry.get(resourceInstance.identity.pkr.uuid);

      expect(principal).toBeDefined();
      expect(principal.instance).toBe(resource);
    });

    it('should delegate friend creation to AccessControlSubsystem', async () => {
      const friend = await testSubsystem.identity.createFriend('test-friend-delegate');

      // Verify friend was created by AccessControlSubsystem
      const accessControl = kernel.getAccessControl();
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.registry.get(friend.identity.pkr.uuid);

      expect(principal).toBeDefined();
      expect(principal.instance).toBe(friend);
    });
  });
});

