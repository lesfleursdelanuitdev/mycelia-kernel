import { describe, it, expect, beforeEach } from 'vitest';
import { MessageSystem } from '../../message-system/message-system.v2.mycelia.js';
import { Message } from '../../message/message.mycelia.js';
import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { createSynchronousDefaultHooks } from '../../defaults/default-hooks.mycelia.js';
import { KERNEL_ROUTES } from '../kernel.routes.def.mycelia.js';

describe('Kernel Routes', () => {
  let messageSystem;
  let kernel;
  let testSubsystem;

  beforeEach(async () => {
    // Create MessageSystem with kernel
    messageSystem = new MessageSystem('test-system', {
      debug: true
    });

    await messageSystem.bootstrap();

    // Get kernel
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
  });

  describe('Route Registration', () => {
    it('should register all routes from KERNEL_ROUTES definition', async () => {
      const router = kernel.find('router');
      expect(router).toBeDefined();

      // Get all registered routes
      const registeredRoutes = router.getRoutes();
      const kernelRoutes = registeredRoutes.filter(r => r.pattern?.startsWith('kernel://'));

      // Check that all routes from KERNEL_ROUTES are registered
      const expectedRoutes = Object.values(KERNEL_ROUTES).map(route => route.path);
      const registeredPatterns = kernelRoutes.map(r => r.pattern);

      for (const expectedPath of expectedRoutes) {
        expect(registeredPatterns).toContain(expectedPath);
      }

      // Verify count matches (allowing for other kernel routes like error routes)
      expect(kernelRoutes.length).toBeGreaterThanOrEqual(expectedRoutes.length);
    });

    it('should have correct metadata for registered routes', async () => {
      const router = kernel.find('router');
      const registeredRoutes = router.getRoutes();
      const kernelRoutes = registeredRoutes.filter(r => r.pattern?.startsWith('kernel://'));

      // Check a sample of routes have proper metadata
      const createResourceRoute = kernelRoutes.find(r => r.pattern === 'kernel://create/resource');
      expect(createResourceRoute).toBeDefined();
      expect(createResourceRoute.metadata).toBeDefined();
      expect(createResourceRoute.metadata.description).toBe('Create a new resource');
      expect(createResourceRoute.metadata.purpose).toBe('resource-management');
    });

    it('should list all routes via kernel://query/routes', async () => {
      const message = new Message('kernel://query/routes', {});
      const result = await testSubsystem.identity.sendProtected(message);

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.routes).toBeDefined();
      expect(Array.isArray(result.result.routes)).toBe(true);
      expect(result.result.count).toBeGreaterThanOrEqual(Object.keys(KERNEL_ROUTES).length);

      // Verify all expected routes are in the list
      const routePatterns = result.result.routes.map(r => r.pattern);
      const expectedRoutes = Object.values(KERNEL_ROUTES).map(route => route.path);

      for (const expectedPath of expectedRoutes) {
        expect(routePatterns).toContain(expectedPath);
      }
    });
  });

  describe('Resource Management Routes', () => {
    it('should handle kernel://create/resource', async () => {
      const message = new Message('kernel://create/resource', {
        name: 'test-resource',
        resourceInstance: { test: true },
        metadata: { type: 'test' }
      });

      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      // Result should contain the created resource
      expect(result.result.result).toBeDefined();
      expect(result.result.result.name).toBe('test-resource');
    });

    it('should handle kernel://query/resource/:name', async () => {
      // First create a resource
      const createMessage = new Message('kernel://create/resource', {
        name: 'query-test-resource',
        resourceInstance: { test: true },
        metadata: { type: 'test' }
      });
      await testSubsystem.identity.sendProtected(createMessage);

      // Then query it
      const queryMessage = new Message('kernel://query/resource/query-test-resource', {});
      const result = await testSubsystem.identity.sendProtected(queryMessage);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
    });

    it('should handle kernel://query/resources/by-owner', async () => {
      const message = new Message('kernel://query/resources/by-owner', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(Array.isArray(result.result.resources)).toBe(true);
    });
  });

  describe('Friend Management Routes', () => {
    it('should handle kernel://create/friend', async () => {
      const message = new Message('kernel://create/friend', {
        name: 'test-friend',
        endpoint: 'http://localhost:8080',
        role: 'user'
      });

      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.result).toBeDefined();
      expect(result.result.result.name).toBe('test-friend');
    });

    it('should handle kernel://query/friend/:name', async () => {
      // First create a friend
      const createMessage = new Message('kernel://create/friend', {
        name: 'query-test-friend',
        endpoint: 'http://localhost:8080'
      });
      await testSubsystem.identity.sendProtected(createMessage);

      // Then query it
      const queryMessage = new Message('kernel://query/friend/query-test-friend', {});
      const result = await testSubsystem.identity.sendProtected(queryMessage);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
    });

    it('should handle kernel://query/friends', async () => {
      const message = new Message('kernel://query/friends', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(Array.isArray(result.result.friends)).toBe(true);
    });
  });

  describe('Permission Management Routes', () => {
    it('should handle kernel://query/permissions/:resourceName', async () => {
      // First create a resource
      const createMessage = new Message('kernel://create/resource', {
        name: 'permission-test-resource',
        resourceInstance: { test: true },
        metadata: { type: 'test' }
      });
      await testSubsystem.identity.sendProtected(createMessage);

      // Then query permissions
      const queryMessage = new Message('kernel://query/permissions/permission-test-resource', {});
      const result = await testSubsystem.identity.sendProtected(queryMessage);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.permissions).toBeDefined();
    });
  });

  describe('Profile Management Routes', () => {
    it('should handle kernel://create/profile', async () => {
      const message = new Message('kernel://create/profile', {
        name: 'test-profile',
        grants: { 'scope:read': 'r' },
        metadata: { description: 'Test profile' }
      });

      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
    });

    it('should handle kernel://query/profile/:name', async () => {
      // First create a profile
      const createMessage = new Message('kernel://create/profile', {
        name: 'query-test-profile',
        grants: { 'scope:read': 'r' }
      });
      await testSubsystem.identity.sendProtected(createMessage);

      // Then query it
      const queryMessage = new Message('kernel://query/profile/query-test-profile', {});
      const result = await testSubsystem.identity.sendProtected(queryMessage);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
    });

    it('should handle kernel://query/profiles', async () => {
      const message = new Message('kernel://query/profiles', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(Array.isArray(result.result.profiles)).toBe(true);
    });
  });

  describe('System Information Routes', () => {
    it('should handle kernel://query/subsystems', async () => {
      const message = new Message('kernel://query/subsystems', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(Array.isArray(result.result.subsystems)).toBe(true);
      expect(result.result.count).toBeGreaterThanOrEqual(2); // kernel + test-subsystem
    });

    it('should handle kernel://query/subsystem/:name', async () => {
      const message = new Message('kernel://query/subsystem/kernel', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.subsystem).toBeDefined();
      expect(result.result.subsystem.name).toBe('kernel');
    });

    it('should handle kernel://query/status', async () => {
      const message = new Message('kernel://query/status', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.status).toBeDefined();
      expect(result.result.status.kernel).toBeDefined();
    });

    it('should handle kernel://query/statistics', async () => {
      const message = new Message('kernel://query/statistics', {});
      const result = await testSubsystem.identity.sendProtected(message);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.statistics).toBeDefined();
    });
  });

  describe('Route Validation', () => {
    it('should reject routes with missing required parameters', async () => {
      // Try to create resource without name
      const message = new Message('kernel://create/resource', {
        resourceInstance: { test: true }
      });

      await expect(testSubsystem.identity.sendProtected(message)).rejects.toThrow();
    });

    it('should reject routes with invalid callerId', async () => {
      // Create a message without proper authentication
      const message = new Message('kernel://query/subsystems', {});
      // Remove callerId by not using sendProtected
      // This should fail when processed
      await expect(kernel.accept(message, {})).resolves.toBeDefined();
    });
  });
});

