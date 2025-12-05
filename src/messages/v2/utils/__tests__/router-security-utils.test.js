/**
 * Router Security Utilities Tests
 * 
 * Tests for the router security utility functions:
 * - createGetUserRole
 * - createScopeMapper
 * - getRolePermissionForScope
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGetUserRole,
  createScopeMapper,
  getRolePermissionForScope
} from '../router-security-utils.mycelia.js';

describe('router-security-utils', () => {
  describe('createGetUserRole', () => {
    it('should throw error if kernel is not provided', () => {
      expect(() => {
        createGetUserRole(null);
      }).toThrow('kernel is required');
    });

    it('should return a function', () => {
      const mockKernel = { getAccessControl: () => null };
      const getUserRole = createGetUserRole(mockKernel);
      expect(typeof getUserRole).toBe('function');
    });

    it('should return null for invalid PKR', () => {
      const mockKernel = { getAccessControl: () => null };
      const getUserRole = createGetUserRole(mockKernel);

      expect(getUserRole(null)).toBeNull();
      expect(getUserRole({})).toBeNull();
      expect(getUserRole({ uuid: null })).toBeNull();
    });

    it('should return null when AccessControlSubsystem not found', () => {
      const mockKernel = {
        getAccessControl: () => null
      };
      
      const getUserRole = createGetUserRole(mockKernel);
      const mockPkr = { uuid: 'test-uuid' };
      
      const result = getUserRole(mockPkr);
      expect(result).toBeNull();
    });

    it('should return null when principals facet not found', () => {
      const mockAccessControl = {
        find: () => null
      };
      
      const mockKernel = {
        getAccessControl: () => mockAccessControl
      };
      
      const getUserRole = createGetUserRole(mockKernel);
      const mockPkr = { uuid: 'test-uuid' };
      
      const result = getUserRole(mockPkr);
      expect(result).toBeNull();
    });

    it('should return null when getRoleForPKR method missing', () => {
      const mockPrincipalsFacet = {
        // Missing getRoleForPKR method
      };
      
      const mockAccessControl = {
        find: () => mockPrincipalsFacet
      };
      
      const mockKernel = {
        getAccessControl: () => mockAccessControl
      };
      
      const getUserRole = createGetUserRole(mockKernel);
      const mockPkr = { uuid: 'test-uuid' };
      
      const result = getUserRole(mockPkr);
      expect(result).toBeNull();
    });

    it('should return role from principals facet', () => {
      const mockPrincipalsFacet = {
        getRoleForPKR: vi.fn().mockReturnValue('student')
      };
      
      const mockAccessControl = {
        find: vi.fn().mockReturnValue(mockPrincipalsFacet)
      };
      
      const mockKernel = {
        getAccessControl: vi.fn().mockReturnValue(mockAccessControl)
      };
      
      const getUserRole = createGetUserRole(mockKernel);
      const mockPkr = { uuid: 'test-uuid' };
      
      const result = getUserRole(mockPkr);
      
      expect(result).toBe('student');
      expect(mockKernel.getAccessControl).toHaveBeenCalled();
      expect(mockAccessControl.find).toHaveBeenCalledWith('principals');
      expect(mockPrincipalsFacet.getRoleForPKR).toHaveBeenCalledWith(mockPkr);
    });

    it('should handle errors gracefully', () => {
      const mockPrincipalsFacet = {
        getRoleForPKR: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };
      
      const mockAccessControl = {
        find: vi.fn().mockReturnValue(mockPrincipalsFacet)
      };
      
      const mockKernel = {
        getAccessControl: vi.fn().mockReturnValue(mockAccessControl)
      };
      
      const getUserRole = createGetUserRole(mockKernel);
      const mockPkr = { uuid: 'test-uuid' };
      
      const result = getUserRole(mockPkr);
      expect(result).toBeNull();
    });

    it('should work with different roles', () => {
      const roles = ['student', 'teacher', 'admin', 'guest'];
      
      roles.forEach(role => {
        const mockPrincipalsFacet = {
          getRoleForPKR: vi.fn().mockReturnValue(role)
        };
        
        const mockAccessControl = {
          find: vi.fn().mockReturnValue(mockPrincipalsFacet)
        };
        
        const mockKernel = {
          getAccessControl: vi.fn().mockReturnValue(mockAccessControl)
        };
        
        const getUserRole = createGetUserRole(mockKernel);
        const mockPkr = { uuid: `test-${role}-uuid` };
        
        const result = getUserRole(mockPkr);
        expect(result).toBe(role);
      });
    });
  });

  describe('createScopeMapper', () => {
    it('should throw error if mappings not provided', () => {
      expect(() => {
        createScopeMapper(null);
      }).toThrow('mappings object is required');
    });

    it('should throw error if mappings is not an object', () => {
      expect(() => {
        createScopeMapper('not-an-object');
      }).toThrow('mappings object is required');
    });

    it('should return a function', () => {
      const scopeMapper = createScopeMapper({});
      expect(typeof scopeMapper).toBe('function');
    });

    it('should return null for invalid routePath', () => {
      const scopeMapper = createScopeMapper({});
      
      expect(scopeMapper(null)).toBeNull();
      expect(scopeMapper('')).toBeNull();
      expect(scopeMapper(123)).toBeNull();
    });

    it('should return null for unmapped routes', () => {
      const scopeMapper = createScopeMapper({
        'workspace://create': 'workspace:create'
      });
      
      const result = scopeMapper('unknown://route');
      expect(result).toBeNull();
    });

    it('should return scope for exact match', () => {
      const scopeMapper = createScopeMapper({
        'workspace://create': 'workspace:create',
        'project://read': 'project:read'
      });
      
      expect(scopeMapper('workspace://create')).toBe('workspace:create');
      expect(scopeMapper('project://read')).toBe('project:read');
    });

    it('should handle pattern matching with {param}', () => {
      const scopeMapper = createScopeMapper({
        'workspace://{id}/read': 'workspace:read',
        'project://{id}/update': 'project:update'
      });
      
      expect(scopeMapper('workspace://123/read')).toBe('workspace:read');
      expect(scopeMapper('workspace://abc/read')).toBe('workspace:read');
      expect(scopeMapper('project://456/update')).toBe('project:update');
    });

    it('should handle wildcard patterns with *', () => {
      const scopeMapper = createScopeMapper({
        'admin/*': 'admin:manage',
        'public/*': 'public:access'
      });
      
      expect(scopeMapper('admin/users')).toBe('admin:manage');
      expect(scopeMapper('admin/settings/security')).toBe('admin:manage');
      expect(scopeMapper('public/docs')).toBe('public:access');
    });

    it('should match patterns in order (first match wins)', () => {
      const scopeMapper = createScopeMapper({
        'workspace://{id}/read': 'workspace:read',
        'workspace://*': 'workspace:general'
      });
      
      // Should match first pattern (more specific)
      expect(scopeMapper('workspace://123/read')).toBe('workspace:read');
      
      // Should match second pattern (wildcard)
      expect(scopeMapper('workspace://123/update')).toBe('workspace:general');
    });

    it('should handle complex patterns', () => {
      const scopeMapper = createScopeMapper({
        'workspace://{workspaceId}/project/{projectId}/read': 'project:read',
        'user://{userId}/settings': 'user:settings',
        'api/v1/*': 'api:v1'
      });
      
      expect(scopeMapper('workspace://ws1/project/p1/read')).toBe('project:read');
      expect(scopeMapper('user://user123/settings')).toBe('user:settings');
      expect(scopeMapper('api/v1/users')).toBe('api:v1');
    });
  });

  describe('getRolePermissionForScope', () => {
    it('should return null for invalid inputs', () => {
      expect(getRolePermissionForScope(null, 'student', 'workspace:create')).toBeNull();
      expect(getRolePermissionForScope({}, null, 'workspace:create')).toBeNull();
      expect(getRolePermissionForScope({}, 'student', null)).toBeNull();
    });

    it('should return null when hierarchy not found', () => {
      const mockKernel = {
        find: () => null
      };
      
      const result = getRolePermissionForScope(mockKernel, 'student', 'workspace:create');
      expect(result).toBeNull();
    });

    it('should return null when profile registry not found', () => {
      const mockHierarchy = {
        getChild: () => null
      };
      
      const mockKernel = {
        find: vi.fn().mockReturnValue(mockHierarchy)
      };
      
      const result = getRolePermissionForScope(mockKernel, 'student', 'workspace:create');
      expect(result).toBeNull();
    });

    it('should return null when profile not found', () => {
      const mockProfile = null;
      
      const mockProfilesFacet = {
        getProfile: vi.fn().mockReturnValue(mockProfile)
      };
      
      const mockProfileRegistry = {
        find: vi.fn().mockReturnValue(mockProfilesFacet)
      };
      
      const mockHierarchy = {
        getChild: vi.fn().mockReturnValue(mockProfileRegistry)
      };
      
      const mockKernel = {
        find: vi.fn().mockReturnValue(mockHierarchy)
      };
      
      const result = getRolePermissionForScope(mockKernel, 'student', 'workspace:create');
      expect(result).toBeNull();
    });

    it('should return permission from profile', () => {
      const mockProfile = {
        getPermission: vi.fn().mockReturnValue('rw')
      };
      
      const mockProfilesFacet = {
        getProfile: vi.fn().mockReturnValue(mockProfile)
      };
      
      const mockProfileRegistry = {
        find: vi.fn().mockReturnValue(mockProfilesFacet)
      };
      
      const mockHierarchy = {
        getChild: vi.fn().mockReturnValue(mockProfileRegistry)
      };
      
      const mockKernel = {
        find: vi.fn().mockReturnValue(mockHierarchy)
      };
      
      const result = getRolePermissionForScope(mockKernel, 'student', 'workspace:create');
      
      expect(result).toBe('rw');
      expect(mockProfile.getPermission).toHaveBeenCalledWith('workspace:create');
    });

    it('should handle different permission levels', () => {
      const permissions = ['r', 'rw', 'rwg'];
      
      permissions.forEach(permission => {
        const mockProfile = {
          getPermission: vi.fn().mockReturnValue(permission)
        };
        
        const mockProfilesFacet = {
          getProfile: vi.fn().mockReturnValue(mockProfile)
        };
        
        const mockProfileRegistry = {
          find: vi.fn().mockReturnValue(mockProfilesFacet)
        };
        
        const mockHierarchy = {
          getChild: vi.fn().mockReturnValue(mockProfileRegistry)
        };
        
        const mockKernel = {
          find: vi.fn().mockReturnValue(mockHierarchy)
        };
        
        const result = getRolePermissionForScope(mockKernel, 'role', 'scope');
        expect(result).toBe(permission);
      });
    });

    it('should handle errors gracefully', () => {
      const mockKernel = {
        find: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };
      
      const result = getRolePermissionForScope(mockKernel, 'student', 'workspace:create');
      expect(result).toBeNull();
    });
  });

  describe('Integration - createGetUserRole with createScopeMapper', () => {
    it('should work together for complete security flow', () => {
      // Setup mock kernel with role mapping
      const mockPrincipalsFacet = {
        getRoleForPKR: vi.fn().mockImplementation((pkr) => {
          const roleMap = {
            'student-uuid': 'student',
            'teacher-uuid': 'teacher'
          };
          return roleMap[pkr.uuid] || null;
        })
      };
      
      const mockAccessControl = {
        find: vi.fn().mockReturnValue(mockPrincipalsFacet)
      };
      
      const mockKernel = {
        getAccessControl: vi.fn().mockReturnValue(mockAccessControl)
      };
      
      // Create getUserRole function
      const getUserRole = createGetUserRole(mockKernel);
      
      // Create scope mapper
      const scopeMapper = createScopeMapper({
        'workspace://create': 'workspace:create',
        'workspace://{id}/read': 'workspace:read',
        'admin/*': 'admin:manage'
      });
      
      // Test complete flow
      const studentPkr = { uuid: 'student-uuid' };
      const teacherPkr = { uuid: 'teacher-uuid' };
      
      expect(getUserRole(studentPkr)).toBe('student');
      expect(getUserRole(teacherPkr)).toBe('teacher');
      
      expect(scopeMapper('workspace://create')).toBe('workspace:create');
      expect(scopeMapper('workspace://123/read')).toBe('workspace:read');
      expect(scopeMapper('admin/users')).toBe('admin:manage');
    });
  });
});

