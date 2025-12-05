/**
 * AccessControlSubsystem Role Management Tests
 * 
 * Tests for role support in AccessControlSubsystem:
 * - createFriend with role option
 * - wireSubsystem with role option
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControlSubsystem } from '../access-control.subsystem.mycelia.js';
import { MessageSystem } from '../../../message-system/message-system.v2.mycelia.js';

describe('AccessControlSubsystem - Role Management', () => {
  let messageSystem;
  let accessControl;

  beforeEach(async () => {
    // Create MessageSystem and bootstrap (debug: true is required for getKernel())
    messageSystem = new MessageSystem('test', { debug: true });
    await messageSystem.bootstrap();

    // Get AccessControlSubsystem from kernel
    const kernel = messageSystem.getKernel();
    accessControl = kernel.getAccessControl();
  });

  describe('createFriend with role', () => {
    it('should create friend without role', () => {
      const friend = accessControl.createFriend('TestFriend', {
        endpoint: 'ws://test.example.com'
      });

      expect(friend).toBeDefined();
      expect(friend.identity).toBeDefined();
      expect(friend.identity.pkr).toBeDefined();
      expect(friend.identity.getRole()).toBeNull();
    });

    it('should create friend with role', () => {
      const friend = accessControl.createFriend('Student', {
        role: 'student',
        endpoint: 'ws://student.example.com'
      });

      expect(friend).toBeDefined();
      expect(friend.identity).toBeDefined();
      expect(friend.identity.getRole()).toBe('student');
    });

    it('should preserve role with other metadata', () => {
      const friend = accessControl.createFriend('Teacher', {
        role: 'teacher',
        metadata: {
          email: 'teacher@example.com',
          department: 'Science'
        },
        endpoint: 'ws://teacher.example.com'
      });

      expect(friend.identity.getRole()).toBe('teacher');
      
      // Get principal to check metadata
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.get(friend.identity.pkr.uuid);
      
      expect(principal.metadata.role).toBe('teacher');
      expect(principal.metadata.email).toBe('teacher@example.com');
      expect(principal.metadata.department).toBe('Science');
    });

    it('should allow role to be changed after creation', () => {
      const friend = accessControl.createFriend('User', {
        role: 'student'
      });

      expect(friend.identity.getRole()).toBe('student');

      // Change role
      friend.identity.setRole('teacher');
      expect(friend.identity.getRole()).toBe('teacher');
    });

    it('should create multiple friends with different roles', () => {
      const student = accessControl.createFriend('Student1', {
        role: 'student'
      });

      const teacher = accessControl.createFriend('Teacher1', {
        role: 'teacher'
      });

      const admin = accessControl.createFriend('Admin1', {
        role: 'admin'
      });

      expect(student.identity.getRole()).toBe('student');
      expect(teacher.identity.getRole()).toBe('teacher');
      expect(admin.identity.getRole()).toBe('admin');
    });

    it('should handle role in metadata correctly', () => {
      // Create friend with role in options (not in metadata)
      const friend1 = accessControl.createFriend('Friend1', {
        role: 'student',
        metadata: { email: 'friend1@example.com' }
      });

      // Role should be merged into metadata
      const principalsFacet = accessControl.find('principals');
      const principal1 = principalsFacet.get(friend1.identity.pkr.uuid);
      
      expect(principal1.metadata.role).toBe('student');
      expect(principal1.metadata.email).toBe('friend1@example.com');

      // Create friend with role already in metadata (should not duplicate)
      const friend2 = accessControl.createFriend('Friend2', {
        role: 'teacher',
        metadata: { role: 'student', email: 'friend2@example.com' }
      });

      // Role from options should override role in metadata
      const principal2 = principalsFacet.get(friend2.identity.pkr.uuid);
      expect(principal2.metadata.role).toBe('teacher');
    });
  });

  describe('wireSubsystem with role', () => {
    it('should wire subsystem without role', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      const subsystem = new BaseSubsystem('test-subsystem', {
        ms: messageSystem
      });

      const result = accessControl.wireSubsystem('topLevel', subsystem);

      expect(result).toBeDefined();
      expect(result.pkr).toBeDefined();
      expect(result.subsystem).toBe(subsystem);
      expect(subsystem.identity).toBeDefined();
      expect(subsystem.identity.getRole()).toBeNull();
    });

    it('should wire subsystem with role', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      const subsystem = new BaseSubsystem('admin-subsystem', {
        ms: messageSystem
      });

      const result = accessControl.wireSubsystem('topLevel', subsystem, {
        role: 'admin'
      });

      expect(result).toBeDefined();
      expect(subsystem.identity).toBeDefined();
      expect(subsystem.identity.getRole()).toBe('admin');
    });

    it('should preserve role with other metadata', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      const subsystem = new BaseSubsystem('service-subsystem', {
        ms: messageSystem
      });

      const result = accessControl.wireSubsystem('topLevel', subsystem, {
        role: 'service',
        metadata: {
          version: '1.0.0',
          type: 'background'
        }
      });

      expect(subsystem.identity.getRole()).toBe('service');
      
      // Get principal to check metadata
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.get(subsystem.identity.pkr.uuid);
      
      expect(principal.metadata.role).toBe('service');
      expect(principal.metadata.version).toBe('1.0.0');
      expect(principal.metadata.type).toBe('background');
    });

    it('should work with child subsystems', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      // Use unique names to avoid conflicts
      const uniqueId = `role-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      // Create and register parent subsystem
      // registerSubsystem will call wireSubsystem internally, so we don't call it manually
      const parent = new BaseSubsystem(`parent-${uniqueId}`, {
        ms: messageSystem
      });
      
      // Register parent - this will wire it automatically with topLevel type
      await messageSystem.registerSubsystem(parent);
      
      // Set role on parent after registration
      parent.identity.setRole('parent-service');

      // Create child subsystem
      const child = new BaseSubsystem(`child-${uniqueId}`, {
        ms: messageSystem
      });

      // Set parent before wiring
      child.setParent(parent);

      // Wire child with role - this is separate from registration
      const result = accessControl.wireSubsystem('child', child, {
        role: 'child-service'
      });

      expect(result).toBeDefined();
      expect(child.identity).toBeDefined();
      expect(child.identity.getRole()).toBe('child-service');
      
      // Parent role should be unchanged
      expect(parent.identity.getRole()).toBe('parent-service');
    });

    it('should allow role to be changed after wiring', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      const subsystem = new BaseSubsystem('test-subsystem', {
        ms: messageSystem
      });

      accessControl.wireSubsystem('topLevel', subsystem, {
        role: 'service'
      });

      expect(subsystem.identity.getRole()).toBe('service');

      // Change role
      subsystem.identity.setRole('admin');
      expect(subsystem.identity.getRole()).toBe('admin');
    });

    it('should wire multiple subsystems with different roles', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      const sub1 = new BaseSubsystem('subsystem-1', { ms: messageSystem });
      const sub2 = new BaseSubsystem('subsystem-2', { ms: messageSystem });
      const sub3 = new BaseSubsystem('subsystem-3', { ms: messageSystem });

      accessControl.wireSubsystem('topLevel', sub1, { role: 'worker' });
      accessControl.wireSubsystem('topLevel', sub2, { role: 'service' });
      accessControl.wireSubsystem('topLevel', sub3, { role: 'admin' });

      expect(sub1.identity.getRole()).toBe('worker');
      expect(sub2.identity.getRole()).toBe('service');
      expect(sub3.identity.getRole()).toBe('admin');
    });
  });

  describe('Integration - Friends and Subsystems', () => {
    it('should maintain different roles for friends and subsystems', async () => {
      const { BaseSubsystem } = await import('../../../base-subsystem/base.subsystem.mycelia.js');
      
      // Create friend with student role
      const student = accessControl.createFriend('Student', {
        role: 'student'
      });

      // Create subsystem with admin role
      const adminSub = new BaseSubsystem('admin-subsystem', {
        ms: messageSystem
      });
      
      accessControl.wireSubsystem('topLevel', adminSub, {
        role: 'admin'
      });

      // Roles should be independent
      expect(student.identity.getRole()).toBe('student');
      expect(adminSub.identity.getRole()).toBe('admin');

      // Change one role
      student.identity.setRole('teacher');

      // Should not affect the other
      expect(student.identity.getRole()).toBe('teacher');
      expect(adminSub.identity.getRole()).toBe('admin');
    });

    it('should allow same role for different principal types', () => {
      const friend = accessControl.createFriend('User1', {
        role: 'admin'
      });

      const principalsFacet = accessControl.find('principals');
      const sub = new (require('../../../base-subsystem/base.subsystem.mycelia.js').BaseSubsystem)('User2', {
        ms: messageSystem
      });
      
      accessControl.wireSubsystem('topLevel', sub, {
        role: 'admin'
      });

      // Both can have same role
      expect(friend.identity.getRole()).toBe('admin');
      expect(sub.identity.getRole()).toBe('admin');

      // But they should be different principals
      expect(friend.identity.pkr.uuid).not.toBe(sub.identity.pkr.uuid);
    });
  });

  describe('Role validation', () => {
    it('should handle empty string role gracefully', () => {
      const friend = accessControl.createFriend('User', {
        role: ''
      });

      // Empty role should be set as empty string in metadata (merged as-is)
      const principalsFacet = accessControl.find('principals');
      const principal = principalsFacet.get(friend.identity.pkr.uuid);
      
      // Role might be empty string or undefined depending on how metadata merge works
      // The important thing is getRoleForPKR handles it
      const role = principalsFacet.getRoleForPKR(friend.identity.pkr);
      
      // Empty string role is falsy, so getRoleForPKR returns null or empty string
      expect(role === '' || role === null).toBe(true);
    });

    it('should handle special characters in role names', () => {
      const roles = [
        'admin-super',
        'user_basic',
        'teacher.science',
        'role:special'
      ];

      roles.forEach(role => {
        const friend = accessControl.createFriend(`User-${role}`, { role });
        expect(friend.identity.getRole()).toBe(role);
      });
    });
  });
});

