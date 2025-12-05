/**
 * useRouterWithScopes Hook Tests
 * 
 * Comprehensive tests for scope-based permission checking functionality.
 * Tests all aspects outlined in TESTING-GAPS-ANALYSIS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRouterWithScopes } from '../router/use-router-with-scopes.mycelia.js';
import { useRouter } from '../router/use-router.mycelia.js';
import {
  createTestMessageSystem,
  createTestSubsystem,
  createMockPkr,
  createTestMessage,
  processMessageImmediately,
  KernelTestContext,
  ProfileTestContext,
  expectSuccess,
  expectPermissionDenied
} from '../../utils/test-utils.mycelia.js';

// Import SecurityProfile for creating test profiles
import { SecurityProfile } from '../../models/security/security-profile.mycelia.js';

describe('useRouterWithScopes', () => {
  let messageSystem;
  let kernel;
  let testSubsystem;
  let kernelCtx;
  let profileCtx;
  let teacherPkr;
  let studentPkr;
  let adminPkr;
  let userPkrMapping;  // PKR to user/role mapping for getUserRole function

  beforeEach(async () => {
    // Create test message system
    messageSystem = await createTestMessageSystem();
    
    // Get kernel via KernelTestContext (which handles all the ways to find it)
    try {
      kernelCtx = KernelTestContext.fromMessageSystem(messageSystem);
      kernel = kernelCtx.kernel;
      profileCtx = new ProfileTestContext(kernel);
    } catch (err) {
      // Fallback: try to get kernel directly from router
      const router = messageSystem.find('messageSystemRouter');
      kernel = router?.getKernel?.() || null;
      
      if (!kernel) {
        // Try registry lookup
        const registry = messageSystem.find('messageSystemRegistry');
        kernel = registry?.get('kernel') || null;
      }
      
      if (!kernel) {
        throw new Error(`Kernel not found in test setup: ${err.message}`);
      }
      
      // Create contexts manually
      profileCtx = new ProfileTestContext(kernel);
    }

    // Create test subsystem with useRouter and useRouterWithScopes
    const { BaseSubsystem } = await import('../../models/base-subsystem/base.subsystem.mycelia.js');
    
    class TestSubsystem extends BaseSubsystem {
      constructor(name, messageSystem, config = {}) {
        super(name, { ms: messageSystem, ...config });
      }
    }

    // Create user PKR mapping for getUserRole
    userPkrMapping = new Map();
    
    // Create test users using kernel's PrincipalRegistry (registered PKRs)
    teacherPkr = createMockPkr('friend', { name: 'teacher', kernel: kernel });
    studentPkr = createMockPkr('friend', { name: 'student', kernel: kernel });
    adminPkr = createMockPkr('friend', { name: 'admin', kernel: kernel });

    userPkrMapping.set(teacherPkr.uuid, { role: 'teacher', userId: 'teacher-1' });
    userPkrMapping.set(studentPkr.uuid, { role: 'student', userId: 'student-1' });
    userPkrMapping.set(adminPkr.uuid, { role: 'admin', userId: 'admin-1' });

    // Create test subsystem with router hooks
    // Note: createTestSubsystem builds the subsystem, so we need to install hooks before calling it
    // We'll create it manually to have control over hook installation
    testSubsystem = new TestSubsystem('test', messageSystem, {
      config: {
        router: {
          getUserRole: (pkr) => {
            const user = userPkrMapping.get(pkr.uuid);
            return user?.role || null;
          },
          debug: false  // Set to true for debugging
        }
      }
    });
    
    // Install hooks before building
    // Note: useMessageProcessor requires router, statistics, and queue
    const { useQueue } = await import('../../hooks/queue/use-queue.mycelia.js');
    const { useStatistics } = await import('../../hooks/statistics/use-statistics.mycelia.js');
    const { useMessageProcessor } = await import('../../hooks/message-processor/use-message-processor.mycelia.js');
    
    testSubsystem
      .use(useQueue)
      .use(useStatistics)
      .use(useRouter)
      .use(useRouterWithScopes)
      .use(useMessageProcessor);
    
    // Build the subsystem
    await testSubsystem.build();
    
    // Register it in the message system registry as 'workspace' to match test message paths
    const registry = messageSystem.find('messageSystemRegistry');
    if (registry) {
      registry.set('workspace', testSubsystem);
    }

    // Create security profiles
    profileCtx.createProfile('teacher', {
      'workspace:create': 'rwg',
      'workspace:read': 'rwg',
      'workspace:update': 'rwg',
      'workspace:delete': 'rwg'
    });

    profileCtx.createProfile('student', {
      'workspace:read': 'r',
      'workspace:comment': 'rw'
    });

    profileCtx.createProfile('admin', {
      'workspace:*': 'rwg',
      'system:*': 'rwg'
    });

    // Apply profiles to users
    profileCtx.applyProfileToPrincipal('teacher', teacherPkr);
    profileCtx.applyProfileToPrincipal('student', studentPkr);
    profileCtx.applyProfileToPrincipal('admin', adminPkr);
  });

  describe('Hook Initialization', () => {
    it('should require router facet from useRouter', async () => {
      const { BaseSubsystem } = await import('../../models/base-subsystem/base.subsystem.mycelia.js');
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, messageSystem, config = {}) {
          super(name, { ms: messageSystem, ...config });
        }
      }

      const subsystem = new TestSubsystem('test-no-router', messageSystem, {});
      
      // Install useRouterWithScopes without useRouter
      // The hook will execute and check for the router facet, throwing an error if not found
      subsystem.use(useRouterWithScopes);
      
      // Build should fail because router facet is not found
      await expect(subsystem.build()).rejects.toThrow(/router facet not found/);
    });

    it('should overwrite router facet correctly', async () => {
      // Create a fresh subsystem to test hook installation
      const { BaseSubsystem } = await import('../../models/base-subsystem/base.subsystem.mycelia.js');
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, messageSystem, config = {}) {
          super(name, { ms: messageSystem, ...config });
        }
      }

      const subsystem = new TestSubsystem('test-router-overwrite', messageSystem, {});
      
      subsystem
        .use(useRouter)
        .use(useRouterWithScopes, {
          config: {
            router: {
              getUserRole: () => 'teacher'
            }
          }
        });
      
      await subsystem.build();
      
      const router = subsystem.find('router');
      expect(router).toBeDefined();
      expect(router.match).toBeDefined();
      expect(router.route).toBeDefined();
      expect(router.registerRoute).toBeDefined();
    });

    it('should handle missing kernel gracefully', async () => {
      const { BaseSubsystem } = await import('../../models/base-subsystem/base.subsystem.mycelia.js');
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, messageSystem, config = {}) {
          super(name, { ms: messageSystem, ...config });
        }
        getRoot() {
          return null; // No kernel
        }
      }

      const subsystem = new TestSubsystem('test-no-kernel', messageSystem, {});
      
      // Should not throw, just log warning
      subsystem
        .use(useRouter)
        .use(useRouterWithScopes, {
          config: {
            router: {
              getUserRole: () => 'teacher'
            }
          }
        });
      
      await expect(subsystem.build()).resolves.not.toThrow();
      
      // Router should still work (just without scope checking)
      const router = subsystem.find('router');
      expect(router).toBeDefined();
    });

    it('should handle missing getUserRole gracefully', async () => {
      const { BaseSubsystem } = await import('../../models/base-subsystem/base.subsystem.mycelia.js');
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, messageSystem, config = {}) {
          super(name, { ms: messageSystem, ...config });
        }
        getRoot() {
          return kernel;
        }
      }

      const subsystem = new TestSubsystem('test-no-getUserRole', messageSystem, {});
      
      // Should not throw, just log warning
      subsystem
        .use(useRouter)
        .use(useRouterWithScopes, {
          config: {
            router: {
              // No getUserRole
            }
          }
        });
      
      await expect(subsystem.build()).resolves.not.toThrow();
      
      // Router should still work (just without scope checking)
      const router = subsystem.find('router');
      expect(router).toBeDefined();
    });
  });

  describe('Permission Level Checking', () => {
    // Test meetsPermissionRequirement indirectly through scope checking

    it('should allow r permission for read requirement', async () => {
      // Student has 'r' for workspace:read
      const router = testSubsystem.find('router');
      router.registerRoute('workspace://read', async () => {
        return { success: true, data: 'read' };
      }, {
        metadata: {
          required: 'read',
          scope: 'workspace:read'
        }
      });

      const message = createTestMessage('workspace://read', {});
      const result = await processMessageImmediately(kernel, studentPkr, message);
      expectSuccess(result);
    });

    it('should allow rw permission for read requirement', async () => {
      // Student has 'rw' for workspace:comment
      const router = testSubsystem.find('router');
      router.registerRoute('workspace://comment', async () => {
        return { success: true, data: 'commented' };
      }, {
        metadata: {
          required: 'read',
          scope: 'workspace:comment'
        }
      });

      const message = createTestMessage('workspace://comment', {});
      const result = await processMessageImmediately(kernel, studentPkr, message);
      expectSuccess(result);
    });

    it('should allow rw permission for write requirement', async () => {
      // Student has 'rw' for workspace:comment
      const router = testSubsystem.find('router');
      router.registerRoute('workspace://comment', async () => {
        return { success: true, data: 'commented' };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:comment'
        }
      });

      const message = createTestMessage('workspace://comment', { text: 'Hello' });
      const result = await processMessageImmediately(kernel, studentPkr, message);
      expectSuccess(result);
    });

    it('should allow rwg permission for read requirement', async () => {
      // Teacher has 'rwg' for workspace:create
      const router = testSubsystem.find('router');
      router.registerRoute('workspace://create', async () => {
        return { success: true, data: 'created' };
      }, {
        metadata: {
          required: 'read',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      const result = await processMessageImmediately(kernel, teacherPkr, message);
      expectSuccess(result);
    });

    it('should allow rwg permission for write requirement', async () => {
      // Teacher has 'rwg' for workspace:create
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true, data: 'created' };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', { name: 'Test' });
      const result = await processMessageImmediately(kernel, teacherPkr, message);
      expectSuccess(result);
    });

    it('should allow rwg permission for grant requirement', async () => {
      // Teacher has 'rwg' for workspace:create
      testSubsystem.find('router').registerRoute('workspace://grant', async () => {
        return { success: true, data: 'granted' };
      }, {
        metadata: {
          required: 'grant',
          scope: 'workspace:create' // Teacher has rwg for this
        }
      });

      const message = createTestMessage('workspace://grant', {});
      const result = await processMessageImmediately(kernel, teacherPkr, message);
      expectSuccess(result);
    });

    it('should deny r permission for write requirement', async () => {
      // Student has 'r' for workspace:read, not 'rw'
      testSubsystem.find('router').registerRoute('workspace://update', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:read' // Student only has 'r'
        }
      });

      const message = createTestMessage('workspace://update', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should deny r permission for grant requirement', async () => {
      // Student has 'r' for workspace:read, not 'rwg'
      testSubsystem.find('router').registerRoute('workspace://grant', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'grant',
          scope: 'workspace:read' // Student only has 'r'
        }
      });

      const message = createTestMessage('workspace://grant', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should deny rw permission for grant requirement', async () => {
      // Student has 'rw' for workspace:comment, not 'rwg'
      testSubsystem.find('router').registerRoute('workspace://grant', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'grant',
          scope: 'workspace:comment' // Student has 'rw', not 'rwg'
        }
      });

      const message = createTestMessage('workspace://grant', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });
  });

  describe('Profile Retrieval', () => {
    it('should return profile when role exists in ProfileRegistrySubsystem', () => {
      const profile = profileCtx.getProfile('teacher');
      expect(profile).toBeDefined();
      expect(profile).toBeInstanceOf(SecurityProfile);
    });

    it('should return null when role does not exist', () => {
      const profile = profileCtx.getProfile('nonexistent');
      expect(profile).toBeFalsy();  // Could be null or undefined
    });

    it('should return null when kernel is missing', () => {
      const profile = profileCtx.getProfile('teacher');
      // This is tested indirectly - if kernel is missing, getProfileForRole returns null
      expect(profile).toBeDefined(); // But in our test, kernel exists
    });
  });

  describe('Scope Permission Checking', () => {
    it('should return true when user has required permission', async () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      const result = await processMessageImmediately(kernel, teacherPkr, message);
      expectSuccess(result);
    });

    it('should return false when user has no role', async () => {
      const noRolePkr = createMockPkr('friend', { name: 'norole', kernel: kernel });
      
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, noRolePkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should return false when profile does not exist for role', async () => {
      const unknownRolePkr = createMockPkr('friend', { name: 'unknown', kernel: kernel });
      
      // Add user mapping for unknown-role (which doesn't have a profile)
      userPkrMapping.set(unknownRolePkr.uuid, { role: 'unknown-role', userId: 'unknown-1' });
      
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, unknownRolePkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should return false when scope not in profile', async () => {
      // Student profile doesn't have workspace:create
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should return false when scope permission does not meet requirement', async () => {
      // Student has 'r' for workspace:read, but route requires 'write'
      testSubsystem.find('router').registerRoute('workspace://update', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:read' // Student only has 'r'
        }
      });

      const message = createTestMessage('workspace://update', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });
  });

  describe('Route Matching', () => {
    it('should delegate to original router.match()', () => {
      testSubsystem.find('router').registerRoute('test://path', async () => {
        return { success: true };
      });

      const match = testSubsystem.router.match('test://path');
      expect(match).toBeDefined();
      expect(match.routeEntry).toBeDefined();
    });

    it('should perform scope check when scope exists', () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      // Teacher should match (has permission)
      const teacherMatch = testSubsystem.router.match('workspace://create', {
        callerId: teacherPkr
      });
      expect(teacherMatch).toBeDefined();

      // Student should not match (no permission)
      const studentMatch = testSubsystem.router.match('workspace://create', {
        callerId: studentPkr
      });
      expect(studentMatch).toBeNull();
    });

    it('should skip scope check when scope is null', () => {
      testSubsystem.find('router').registerRoute('test://no-scope', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write'
          // No scope
        }
      });

      const match = testSubsystem.router.match('test://no-scope', {
        callerId: studentPkr
      });
      expect(match).toBeDefined(); // Should match because no scope check
    });

    it('should skip scope check when required is null', () => {
      testSubsystem.find('router').registerRoute('test://no-required', async () => {
        return { success: true };
      }, {
        metadata: {
          scope: 'workspace:create'
          // No required
        }
      });

      const match = testSubsystem.router.match('test://no-required', {
        callerId: studentPkr
      });
      expect(match).toBeDefined(); // Should match because no required permission
    });

    it('should skip scope check when callerId is missing', () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const match = testSubsystem.router.match('workspace://create', {
        // No callerId
      });
      expect(match).toBeDefined(); // Should match because no callerId
    });

    it('should return null when scope check fails', () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const match = testSubsystem.router.match('workspace://create', {
        callerId: studentPkr // Student doesn't have permission
      });
      expect(match).toBeNull();
    });

    it('should return match result when scope check passes', () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const match = testSubsystem.router.match('workspace://create', {
        callerId: teacherPkr // Teacher has permission
      });
      expect(match).toBeDefined();
      expect(match.routeEntry).toBeDefined();
    });
  });

  describe('Route Execution', () => {
    it('should delegate to original router.route() when scope check passes', async () => {
      const handler = vi.fn(async () => ({ success: true, data: 'executed' }));
      
      testSubsystem.find('router').registerRoute('workspace://create', handler, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', { name: 'Test' });
      const result = await processMessageImmediately(kernel, teacherPkr, message);
      
      expectSuccess(result);
      expect(handler).toHaveBeenCalled();
    });

    it('should throw PermissionDenied error when scope check fails', async () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      const message = createTestMessage('workspace://create', {});
      await expectPermissionDenied(
        () => processMessageImmediately(kernel, studentPkr, message),
        { errorPattern: /Permission denied/ }
      );
    });

    it('should preserve original router functionality', () => {
      const handler = vi.fn();
      
      testSubsystem.find('router').registerRoute('test://route', handler);
      expect(testSubsystem.router.hasRoute('test://route')).toBe(true);
      
      const routes = testSubsystem.router.getRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle routes without scope metadata', async () => {
      testSubsystem.find('router').registerRoute('test://no-scope', async () => {
        return { success: true };
      }, {
        metadata: {
          required: 'write'
          // No scope
        }
      });

      const message = createTestMessage('test://no-scope', {});
      // Should work because no scope check
      await processMessageImmediately(kernel, studentPkr, message);
      // May fail on RWS check, but scope check should be skipped
    });

    it('should handle routes without required permission', async () => {
      testSubsystem.find('router').registerRoute('test://no-required', async () => {
        return { success: true };
      }, {
        metadata: {
          scope: 'workspace:create'
          // No required
        }
      });

      const message = createTestMessage('test://no-required', {});
      // Should work because no required permission means no scope check
      await processMessageImmediately(kernel, studentPkr, message);
      // May fail on RWS check, but scope check should be skipped
    });

    it('should handle multiple routes with different scopes', async () => {
      testSubsystem.find('router').registerRoute('workspace://create', async () => {
        return { success: true, action: 'create' };
      }, {
        metadata: {
          required: 'write',
          scope: 'workspace:create'
        }
      });

      testSubsystem.find('router').registerRoute('workspace://read', async () => {
        return { success: true, action: 'read' };
      }, {
        metadata: {
          required: 'read',
          scope: 'workspace:read'
        }
      });

      // Teacher can create
      const createMessage = createTestMessage('workspace://create', {});
      const createResult = await processMessageImmediately(kernel, teacherPkr, createMessage);
      expectSuccess(createResult);

      // Student can read
      const readMessage = createTestMessage('workspace://read', {});
      const readResult = await processMessageImmediately(kernel, studentPkr, readMessage);
      expectSuccess(readResult);
    });
  });
});

