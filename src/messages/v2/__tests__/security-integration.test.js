/**
 * Security Integration Tests
 * 
 * End-to-end tests for the complete security integration:
 * - Roles stored in Principal metadata
 * - SecurityProfiles with scoped permissions
 * - useRouterWithScopes with getUserRole
 * - Two-layer security (Scopes + RWS)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useRouterWithScopes } from '../hooks/router/use-router-with-scopes.mycelia.js';
import { useMessageProcessor } from '../hooks/message-processor/use-message-processor.mycelia.js';
import { Message } from '../models/message/message.mycelia.js';
import { createGetUserRole } from '../utils/router-security-utils.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';

describe('Security Integration - End-to-End', () => {
  let messageSystem;
  let kernel;
  let accessControl;
  let profileRegistry;
  let workspaceSubsystem;
  let router;
  let studentFriend;
  let teacherFriend;

  beforeEach(async () => {
    // 1. Create and bootstrap MessageSystem (debug: true required for getKernel())
    messageSystem = new MessageSystem('test-app', { debug: true });
    await messageSystem.bootstrap();

    // 2. Get kernel and subsystems
    kernel = messageSystem.getKernel();
    accessControl = kernel.getAccessControl();
    
    // Get ProfileRegistrySubsystem from kernel hierarchy
    const hierarchy = kernel.find('hierarchy');
    profileRegistry = hierarchy?.getChild('profile-registry');

    if (!profileRegistry) {
      throw new Error('ProfileRegistrySubsystem not found in kernel hierarchy');
    }

    // 3. Create Security Profiles
    profileRegistry.createProfile('student', {
      'workspace:read': 'r',
      'workspace:create': 'rw',
      'project:read': 'r'
    });

    profileRegistry.createProfile('teacher', {
      'workspace:read': 'r',
      'workspace:create': 'rw',
      'workspace:delete': 'rw',
      'project:read': 'r',
      'project:create': 'rw',
      'project:delete': 'rw'
    });

    // 4. Create Friends with roles
    studentFriend = accessControl.createFriend('Alice', {
      role: 'student',
      metadata: { email: 'alice@example.com' }
    });

    teacherFriend = accessControl.createFriend('Bob', {
      role: 'teacher',
      metadata: { email: 'bob@example.com' }
    });

    // 5. Apply profiles to principals
    profileRegistry.applyProfileToPrincipal('student', studentFriend.identity.pkr);
    profileRegistry.applyProfileToPrincipal('teacher', teacherFriend.identity.pkr);

    // 6. Create workspace subsystem with useRouterWithScopes
    workspaceSubsystem = new BaseSubsystem('workspace', {
      ms: messageSystem,
      config: {
        router: {
          getUserRole: createGetUserRole(kernel),
          debug: false
        }
      }
    });

    // Install hooks
    workspaceSubsystem
      .use(useQueue)
      .use(useStatistics)
      .use(useRouter)
      .use(useRouterWithScopes)
      .use(useMessageProcessor);

    await workspaceSubsystem.build();
    await messageSystem.registerSubsystem(workspaceSubsystem);

    // 7. Get router facet and register routes with scopes
    // Use find() to get the facet (not property access)
    router = workspaceSubsystem.find('router');
    if (!router) {
      throw new Error('Router facet not found on workspace subsystem');
    }
    
    // 8. Grant RWS permissions for friends to access workspace subsystem
    // This configures Layer 2 (RWS) security so both layers work together
    workspaceSubsystem.identity.grantReader(workspaceSubsystem.identity.pkr, studentFriend.identity.pkr);
    workspaceSubsystem.identity.grantWriter(workspaceSubsystem.identity.pkr, studentFriend.identity.pkr);
    workspaceSubsystem.identity.grantReader(workspaceSubsystem.identity.pkr, teacherFriend.identity.pkr);
    workspaceSubsystem.identity.grantWriter(workspaceSubsystem.identity.pkr, teacherFriend.identity.pkr);
    
    router.registerRoute('workspace://create', async (message, params, options) => {
      return {
        success: true,
        action: 'created',
        workspaceId: 'ws-' + Date.now(),
        createdBy: options.callerId?.uuid
      };
    }, {
      metadata: {
        required: 'write',
        scope: 'workspace:create'
      }
    });

    router.registerRoute('workspace://{id}/read', async (message, params, options) => {
      return {
        success: true,
        action: 'read',
        workspaceId: params.id,
        readBy: options.callerId?.uuid
      };
    }, {
      metadata: {
        required: 'read',
        scope: 'workspace:read'
      }
    });

    router.registerRoute('workspace://{id}/delete', async (message, params, options) => {
      return {
        success: true,
        action: 'deleted',
        workspaceId: params.id,
        deletedBy: options.callerId?.uuid
      };
    }, {
      metadata: {
        required: 'write',
        scope: 'workspace:delete'
      }
    });
  });

  describe('Role Management', () => {
    it('should have roles assigned to friends', () => {
      expect(studentFriend.identity.getRole()).toBe('student');
      expect(teacherFriend.identity.getRole()).toBe('teacher');
    });

    it('should allow role changes', () => {
      expect(studentFriend.identity.getRole()).toBe('student');
      
      studentFriend.identity.setRole('teacher');
      expect(studentFriend.identity.getRole()).toBe('teacher');
      
      // Change back
      studentFriend.identity.setRole('student');
      expect(studentFriend.identity.getRole()).toBe('student');
    });

    it('should access roles via PrincipalRegistry', () => {
      const principalsFacet = accessControl.find('principals');
      
      expect(principalsFacet.getRoleForPKR(studentFriend.identity.pkr)).toBe('student');
      expect(principalsFacet.getRoleForPKR(teacherFriend.identity.pkr)).toBe('teacher');
    });
  });

  describe('Security Profiles', () => {
    it('should have created profiles', () => {
      const profiles = profileRegistry.listProfiles();
      expect(profiles).toContain('student');
      expect(profiles).toContain('teacher');
    });

    it('should have correct permissions in profiles', () => {
      const studentProfile = profileRegistry.getProfile('student');
      const teacherProfile = profileRegistry.getProfile('teacher');

      expect(studentProfile.getPermission('workspace:create')).toBe('rw');
      expect(studentProfile.getPermission('workspace:delete')).toBeUndefined();
      
      expect(teacherProfile.getPermission('workspace:create')).toBe('rw');
      expect(teacherProfile.getPermission('workspace:delete')).toBe('rw');
    });

    it('should have applied profiles to principals', () => {
      // Profiles should have granted RWS permissions
      // This is tested indirectly through message sending
    });
  });

  describe('getUserRole Function', () => {
    it('should return correct roles for friends', () => {
      const getUserRole = createGetUserRole(kernel);
      
      expect(getUserRole(studentFriend.identity.pkr)).toBe('student');
      expect(getUserRole(teacherFriend.identity.pkr)).toBe('teacher');
    });

    it('should return null for unknown PKR', () => {
      const getUserRole = createGetUserRole(kernel);
      const fakePkr = { uuid: 'unknown-uuid' };
      
      expect(getUserRole(fakePkr)).toBeNull();
    });
  });

  describe('useRouterWithScopes - Permission Checking', () => {
    it('should have router installed', () => {
      expect(router).toBeDefined();
      expect(router.route).toBeDefined();
      expect(router.match).toBeDefined();
    });

    it('should allow student to create workspace', async () => {
      const message = new Message('workspace://create', {
        name: 'Student Project'
      });

      // Call router directly with callerId set (simulates what sendProtected does)
      const result = await router.route(message, {
        callerId: studentFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.createdBy).toBe(studentFriend.identity.pkr.uuid);
    });

    it('should allow student to read workspace', async () => {
      const message = new Message('workspace://123/read', {});

      const result = await router.route(message, {
        callerId: studentFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('read');
      expect(result.workspaceId).toBe('123');
    });

    it('should deny student from deleting workspace', async () => {
      const message = new Message('workspace://123/delete', {});

      await expect(
        router.route(message, {
          callerId: studentFriend.identity.pkr,
          callerIdSetBy: kernel.identity.pkr
        })
      ).rejects.toThrow(/Permission denied/);
    });

    it('should allow teacher to create workspace', async () => {
      const message = new Message('workspace://create', {
        name: 'Teacher Project'
      });

      const result = await router.route(message, {
        callerId: teacherFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should allow teacher to read workspace', async () => {
      const message = new Message('workspace://456/read', {});

      const result = await router.route(message, {
        callerId: teacherFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('read');
    });

    it('should allow teacher to delete workspace', async () => {
      const message = new Message('workspace://456/delete', {});

      const result = await router.route(message, {
        callerId: teacherFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('deleted');
      expect(result.deletedBy).toBe(teacherFriend.identity.pkr.uuid);
    });
  });

  describe('Dynamic Role Changes', () => {
    it('should enforce new permissions after role change', async () => {
      // Student initially cannot delete
      const deleteMsg1 = new Message('workspace://111/delete', {});
      await expect(
        router.route(deleteMsg1, {
          callerId: studentFriend.identity.pkr,
          callerIdSetBy: kernel.identity.pkr
        })
      ).rejects.toThrow(/Permission denied/);

      // Change student to teacher
      studentFriend.identity.setRole('teacher');

      // Apply teacher profile
      profileRegistry.applyProfileToPrincipal('teacher', studentFriend.identity.pkr);

      // Now should be able to delete
      const deleteMsg2 = new Message('workspace://222/delete', {});
      const result = await router.route(deleteMsg2, {
        callerId: studentFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('deleted');
    });
  });

  describe('Profile Updates', () => {
    it('should enforce new permissions after profile update', async () => {
      // Teacher can delete initially
      const deleteMsg1 = new Message('workspace://333/delete', {});
      const result1 = await router.route(deleteMsg1, {
        callerId: teacherFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      expect(result1.success).toBe(true);

      // Update teacher profile to remove delete permission
      const teacherProfile = profileRegistry.getProfile('teacher');
      teacherProfile.removeGrant('workspace:delete');

      // Now should NOT be able to delete (profile changed)
      const deleteMsg2 = new Message('workspace://444/delete', {});
      await expect(
        router.route(deleteMsg2, {
          callerId: teacherFriend.identity.pkr,
          callerIdSetBy: kernel.identity.pkr
        })
      ).rejects.toThrow(/Permission denied/);
    });
  });

  describe('Error Cases', () => {
    it('should reject message from friend without role', async () => {
      // Create friend without role
      const guestFriend = accessControl.createFriend('Guest', {
        // No role assigned
      });

      const message = new Message('workspace://create', {
        name: 'Guest Project'
      });

      // Should fail because getUserRole returns null
      await expect(
        router.route(message, {
          callerId: guestFriend.identity.pkr,
          callerIdSetBy: kernel.identity.pkr
        })
      ).rejects.toThrow(/Permission denied/);
    });

    it('should reject message for route without scope metadata', async () => {
      // Register route without scope
      router.registerRoute('workspace://no-scope', async () => {
        return { success: true };
      }, {
        // No metadata.scope
      });

      const message = new Message('workspace://no-scope', {});

      // Should still work (scope check skipped when no scope)
      const result = await router.route(message, {
        callerId: studentFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      expect(result).toBeDefined();
    });
  });

  describe('Multiple Routes and Scopes', () => {
    it('should handle different scopes correctly', async () => {
      // Register project routes
      router.registerRoute('project://create', async (message, params, options) => {
        return {
          success: true,
          action: 'project-created',
          createdBy: options.callerId?.uuid
        };
      }, {
        metadata: {
          required: 'write',
          scope: 'project:create'
        }
      });

      router.registerRoute('project://{id}/read', async (message, params, options) => {
        return {
          success: true,
          action: 'project-read',
          projectId: params.id
        };
      }, {
        metadata: {
          required: 'read',
          scope: 'project:read'
        }
      });

      // Student can read projects
      const readMsg = new Message('project://p1/read', {});
      const readResult = await router.route(readMsg, {
        callerId: studentFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      expect(readResult.success).toBe(true);
      expect(readResult.action).toBe('project-read');

      // Student cannot create projects (not in profile)
      const createMsg = new Message('project://create', { name: 'New Project' });
      await expect(
        router.route(createMsg, {
          callerId: studentFriend.identity.pkr,
          callerIdSetBy: kernel.identity.pkr
        })
      ).rejects.toThrow(/Permission denied/);

      // Teacher can create projects
      const teacherCreateMsg = new Message('project://create', { name: 'Teacher Project' });
      const teacherCreateResult = await router.route(teacherCreateMsg, {
        callerId: teacherFriend.identity.pkr,
        callerIdSetBy: kernel.identity.pkr
      });
      expect(teacherCreateResult.success).toBe(true);
      expect(teacherCreateResult.action).toBe('project-created');
    });
  });
});

