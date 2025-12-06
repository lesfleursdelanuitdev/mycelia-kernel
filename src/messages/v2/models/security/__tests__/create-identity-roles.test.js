/**
 * createIdentity Role Management Tests
 * 
 * Tests for the role management methods added to identity objects:
 * - getRole()
 * - setRole(role)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createIdentity } from '../create-identity.mycelia.js';
import { PrincipalRegistry } from '../principal-registry.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

describe('createIdentity - Role Management', () => {
  let registry;
  let mockKernel;

  beforeEach(() => {
    mockKernel = {
      identity: null,
      sendProtected: () => Promise.resolve(),
      getAccessControl: () => null,
      getChannelManager: () => null
    };
    
    registry = new PrincipalRegistry({ kernel: mockKernel });
  });

  describe('getRole', () => {
    it('should return null when no role is set', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'TestSubsystem'
      });

      const identity = registry.createIdentity(pkr);
      expect(identity.getRole()).toBeNull();
    });

    it('should return role when set via metadata during principal creation', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      const identity = registry.createIdentity(pkr);
      expect(identity.getRole()).toBe('student');
    });

    it('should return updated role after setRole', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);
      
      // Initially no role
      expect(identity.getRole()).toBeNull();

      // Set role via identity
      identity.setRole('teacher');

      // Get role via identity
      expect(identity.getRole()).toBe('teacher');
    });

    it('should reflect role changes made via PrincipalRegistry', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);

      // Set role via registry
      registry.setRoleForPKR(pkr, 'admin');

      // Should be accessible via identity
      expect(identity.getRole()).toBe('admin');
    });
  });

  describe('setRole', () => {
    it('should set role successfully', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);
      const result = identity.setRole('student');

      expect(result).toBe(true);
      expect(identity.getRole()).toBe('student');
    });

    it('should update existing role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      const identity = registry.createIdentity(pkr);
      
      // Verify initial role
      expect(identity.getRole()).toBe('student');

      // Update role
      identity.setRole('teacher');

      // Verify updated role
      expect(identity.getRole()).toBe('teacher');
    });

    it('should throw error for invalid role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);

      expect(() => {
        identity.setRole('');
      }).toThrow('role must be a non-empty string');

      expect(() => {
        identity.setRole(123);
      }).toThrow('role must be a non-empty string');
    });

    it('should be accessible via PrincipalRegistry after setting via identity', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);
      identity.setRole('admin');

      // Should be accessible via registry
      expect(registry.getRoleForPKR(pkr)).toBe('admin');
    });
  });

  describe('Role management with PKR in identity', () => {
    it('should access PKR from identity', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      const identity = registry.createIdentity(pkr);

      // Identity should have PKR
      expect(identity.pkr).toBe(pkr);
      expect(identity.pkr.uuid).toBe(pkr.uuid);

      // Role should be accessible
      expect(identity.getRole()).toBe('student');
    });

    it('should maintain role consistency across identity and registry', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity = registry.createIdentity(pkr);

      // Set via identity
      identity.setRole('teacher');
      expect(registry.getRoleForPKR(pkr)).toBe('teacher');

      // Update via registry
      registry.setRoleForPKR(pkr, 'admin');
      expect(identity.getRole()).toBe('admin');

      // Both should be consistent
      expect(identity.getRole()).toBe(registry.getRoleForPKR(pkr));
    });
  });

  describe('Multiple identities for same principal', () => {
    it('should share role across multiple identity instances', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const identity1 = registry.createIdentity(pkr);
      const identity2 = registry.createIdentity(pkr);

      // Set role via first identity
      identity1.setRole('teacher');

      // Should be visible in second identity
      expect(identity2.getRole()).toBe('teacher');

      // Update via second identity
      identity2.setRole('admin');

      // Should be visible in first identity
      expect(identity1.getRole()).toBe('admin');
    });
  });

  describe('Integration with other identity methods', () => {
    it('should work alongside permission methods', () => {
      const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Owner',
        metadata: { role: 'admin' }
      });

      const identity = registry.createIdentity(ownerPkr);

      // Role methods should work
      expect(identity.getRole()).toBe('admin');
      identity.setRole('superadmin');
      expect(identity.getRole()).toBe('superadmin');

      // Permission methods should still work
      expect(typeof identity.canRead).toBe('function');
      expect(typeof identity.canWrite).toBe('function');
      expect(typeof identity.canGrant).toBe('function');
      expect(typeof identity.sendProtected).toBe('function');
    });

    it('should preserve role when using other identity features', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Subsystem',
        metadata: { role: 'service' }
      });

      const identity = registry.createIdentity(pkr);

      // Set subsystem
      const mockSubsystem = { name: 'test' };
      identity.setSubsystem(mockSubsystem);

      // Role should still be accessible
      expect(identity.getRole()).toBe('service');

      // Get subsystem
      expect(identity.getSubsystem()).toBe(mockSubsystem);

      // Role should still be accessible
      expect(identity.getRole()).toBe('service');
    });
  });

  describe('Role with different principal types', () => {
    it('should work with TOP_LEVEL principals', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'TopLevel',
        metadata: { role: 'admin' }
      });

      const identity = registry.createIdentity(pkr);
      expect(identity.getRole()).toBe('admin');
    });

    it('should work with CHILD principals', () => {
      const parentPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Parent'
      });

      const childPkr = registry.createPrincipal(PRINCIPAL_KINDS.CHILD, {
        name: 'Child',
        owner: parentPkr,
        metadata: { role: 'service' }
      });

      const identity = registry.createIdentity(childPkr);
      expect(identity.getRole()).toBe('service');
    });

    it('should work with FRIEND principals', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'Friend',
        metadata: { role: 'student' }
      });

      const identity = registry.createIdentity(pkr);
      expect(identity.getRole()).toBe('student');
    });

    it('should work with RESOURCE principals', () => {
      const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Owner'
      });

      const resourcePkr = registry.createPrincipal(PRINCIPAL_KINDS.RESOURCE, {
        name: 'Resource',
        owner: ownerPkr,
        metadata: { role: 'data' }
      });

      const identity = registry.createIdentity(resourcePkr);
      expect(identity.getRole()).toBe('data');
    });
  });
});


