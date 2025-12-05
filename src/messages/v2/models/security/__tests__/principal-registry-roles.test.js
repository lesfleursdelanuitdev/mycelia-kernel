/**
 * PrincipalRegistry Role Management Tests
 * 
 * Tests for the new role management functionality added to PrincipalRegistry:
 * - getRoleForPKR
 * - setRoleForPKR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrincipalRegistry } from '../principal-registry.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

describe('PrincipalRegistry - Role Management', () => {
  let registry;
  let mockKernel;

  beforeEach(() => {
    mockKernel = {
      identity: null,
      sendProtected: () => Promise.resolve()
    };
    
    registry = new PrincipalRegistry({ kernel: mockKernel });
  });

  describe('getRoleForPKR', () => {
    it('should return null for invalid PKR', () => {
      const result = registry.getRoleForPKR(null);
      expect(result).toBeNull();
    });

    it('should return null for PKR without uuid', () => {
      const result = registry.getRoleForPKR({});
      expect(result).toBeNull();
    });

    it('should return null for unknown principal', () => {
      const fakePkr = { uuid: 'unknown-uuid' };
      const result = registry.getRoleForPKR(fakePkr);
      expect(result).toBeNull();
    });

    it('should return null when principal has no metadata', () => {
      // Create principal without metadata
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const result = registry.getRoleForPKR(pkr);
      expect(result).toBeNull();
    });

    it('should return null when principal metadata has no role', () => {
      // Create principal with metadata but no role
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { email: 'test@example.com' }
      });

      const result = registry.getRoleForPKR(pkr);
      expect(result).toBeNull();
    });

    it('should return role when set in metadata during creation', () => {
      // Create principal with role in metadata
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestStudent',
        metadata: { role: 'student', email: 'student@example.com' }
      });

      const result = registry.getRoleForPKR(pkr);
      expect(result).toBe('student');
    });

    it('should return role after setRoleForPKR', () => {
      // Create principal without role
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      // Set role
      registry.setRoleForPKR(pkr, 'teacher');

      // Get role
      const result = registry.getRoleForPKR(pkr);
      expect(result).toBe('teacher');
    });
  });

  describe('setRoleForPKR', () => {
    it('should return false for invalid PKR', () => {
      const result = registry.setRoleForPKR(null, 'student');
      expect(result).toBe(false);
    });

    it('should return false for PKR without uuid', () => {
      const result = registry.setRoleForPKR({}, 'student');
      expect(result).toBe(false);
    });

    it('should throw error for non-string role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      expect(() => {
        registry.setRoleForPKR(pkr, 123);
      }).toThrow('role must be a non-empty string');
    });

    it('should throw error for empty string role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      expect(() => {
        registry.setRoleForPKR(pkr, '');
      }).toThrow('role must be a non-empty string');
    });

    it('should throw error for whitespace-only role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      expect(() => {
        registry.setRoleForPKR(pkr, '   ');
      }).toThrow('role must be a non-empty string');
    });

    it('should return false for unknown principal', () => {
      const fakePkr = { uuid: 'unknown-uuid' };
      const result = registry.setRoleForPKR(fakePkr, 'student');
      expect(result).toBe(false);
    });

    it('should set role successfully', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      const result = registry.setRoleForPKR(pkr, 'student');
      expect(result).toBe(true);

      // Verify role was set
      const role = registry.getRoleForPKR(pkr);
      expect(role).toBe('student');
    });

    it('should create metadata object if it does not exist', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend'
      });

      // Principal may have empty metadata initially
      const principal = registry.get(pkr.uuid);
      const hadMetadata = principal.metadata && Object.keys(principal.metadata).length > 0;

      // Set role
      registry.setRoleForPKR(pkr, 'teacher');

      // Metadata should now exist with role
      expect(principal.metadata).toBeDefined();
      expect(principal.metadata.role).toBe('teacher');
    });

    it('should preserve existing metadata when setting role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { email: 'test@example.com', department: 'Science' }
      });

      // Set role
      registry.setRoleForPKR(pkr, 'teacher');

      // Existing metadata should be preserved
      const principal = registry.get(pkr.uuid);
      expect(principal.metadata.email).toBe('test@example.com');
      expect(principal.metadata.department).toBe('Science');
      expect(principal.metadata.role).toBe('teacher');
    });

    it('should update existing role', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      // Verify initial role
      expect(registry.getRoleForPKR(pkr)).toBe('student');

      // Update role
      registry.setRoleForPKR(pkr, 'teacher');

      // Verify updated role
      expect(registry.getRoleForPKR(pkr)).toBe('teacher');
    });
  });

  describe('Role management with different principal kinds', () => {
    it('should work with FRIEND principals', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'Friend'
      });

      registry.setRoleForPKR(pkr, 'friend-role');
      expect(registry.getRoleForPKR(pkr)).toBe('friend-role');
    });

    it('should work with TOP_LEVEL principals', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'TopLevel'
      });

      registry.setRoleForPKR(pkr, 'admin');
      expect(registry.getRoleForPKR(pkr)).toBe('admin');
    });

    it('should work with CHILD principals', () => {
      // Create parent first
      const parentPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Parent'
      });

      // Create child with parent as owner
      const childPkr = registry.createPrincipal(PRINCIPAL_KINDS.CHILD, {
        name: 'Child',
        owner: parentPkr
      });

      registry.setRoleForPKR(childPkr, 'service');
      expect(registry.getRoleForPKR(childPkr)).toBe('service');
    });

    it('should work with RESOURCE principals', () => {
      // Create owner first
      const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
        name: 'Owner'
      });

      // Create resource
      const resourcePkr = registry.createPrincipal(PRINCIPAL_KINDS.RESOURCE, {
        name: 'Resource',
        owner: ownerPkr
      });

      registry.setRoleForPKR(resourcePkr, 'data-resource');
      expect(registry.getRoleForPKR(resourcePkr)).toBe('data-resource');
    });
  });

  describe('Role persistence', () => {
    it('should preserve role in principal metadata', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      // Verify initial role
      expect(registry.getRoleForPKR(pkr)).toBe('student');

      // Get the principal directly
      const principal = registry.get(pkr.uuid);
      expect(principal.metadata.role).toBe('student');

      // Role is stored on principal, not PKR
      // So even if PKR changes, role persists on the principal object
      expect(principal.metadata.role).toBe('student');
    });
  });

  describe('Integration with other registry operations', () => {
    it('should maintain role after principal deletion and recreation', () => {
      // Create principal with role
      const pkr1 = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      const uuid1 = pkr1.uuid;
      expect(registry.getRoleForPKR(pkr1)).toBe('student');

      // Delete principal
      registry.delete(uuid1);

      // Role should no longer be accessible
      expect(registry.getRoleForPKR(pkr1)).toBeNull();

      // Create new principal with same name but different UUID
      const pkr2 = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'teacher' }
      });

      // New principal should have new role
      expect(registry.getRoleForPKR(pkr2)).toBe('teacher');
      expect(pkr2.uuid).not.toBe(uuid1);
    });

    it('should clear roles when registry is cleared', () => {
      const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
        name: 'TestFriend',
        metadata: { role: 'student' }
      });

      expect(registry.getRoleForPKR(pkr)).toBe('student');

      // Clear registry
      registry.clear();

      // Role should no longer be accessible
      expect(registry.getRoleForPKR(pkr)).toBeNull();
    });
  });
});

