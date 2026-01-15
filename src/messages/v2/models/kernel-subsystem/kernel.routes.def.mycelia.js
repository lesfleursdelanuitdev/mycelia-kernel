/**
 * Kernel Route Definitions
 * 
 * Defines the route paths used by KernelSubsystem to handle kernel:// messages.
 * These routes are registered internally by KernelSubsystem and handle privileged
 * operations like resource/friend creation, permission management, profile management,
 * and system information queries.
 */

export const KERNEL_ROUTES = {
  // === Resource Management Routes ===
  'createResource': {
    path: 'kernel://create/resource',
    description: 'Create a new resource',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'create'
    },
    handler: 'handleCreateResource'
  },
  'queryResource': {
    path: 'kernel://query/resource/:name',
    description: 'Query a resource by name',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'query'
    },
    handler: 'handleQueryResource'
  },
  'queryResourcesByOwner': {
    path: 'kernel://query/resources/by-owner',
    description: 'List resources owned by caller',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'query'
    },
    handler: 'handleQueryResourcesByOwner'
  },
  'queryResourcesByType': {
    path: 'kernel://query/resources/by-type/:type',
    description: 'List resources by type',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'query'
    },
    handler: 'handleQueryResourcesByType'
  },
  'updateResource': {
    path: 'kernel://update/resource/:name',
    description: 'Update resource metadata',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'update'
    },
    handler: 'handleUpdateResource'
  },
  'deleteResource': {
    path: 'kernel://delete/resource/:name',
    description: 'Delete a resource',
    metadata: {
      type: 'route',
      purpose: 'resource-management',
      operation: 'delete'
    },
    handler: 'handleDeleteResource'
  },

  // === Friend Management Routes ===
  'createFriend': {
    path: 'kernel://create/friend',
    description: 'Create a new friend',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'create'
    },
    handler: 'handleCreateFriend'
  },
  'queryFriend': {
    path: 'kernel://query/friend/:name',
    description: 'Query a friend by name',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'query'
    },
    handler: 'handleQueryFriend'
  },
  'queryFriendByPkr': {
    path: 'kernel://query/friend/by-pkr/:pkrUuid',
    description: 'Query a friend by PKR UUID',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'query'
    },
    handler: 'handleQueryFriendByPkr'
  },
  'queryFriends': {
    path: 'kernel://query/friends',
    description: 'List all friends',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'query'
    },
    handler: 'handleQueryFriends'
  },
  'updateFriend': {
    path: 'kernel://update/friend/:name',
    description: 'Update friend metadata',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'update'
    },
    handler: 'handleUpdateFriend'
  },
  'deleteFriend': {
    path: 'kernel://delete/friend/:name',
    description: 'Delete a friend',
    metadata: {
      type: 'route',
      purpose: 'friend-management',
      operation: 'delete'
    },
    handler: 'handleDeleteFriend'
  },

  // === Permission Management Routes ===
  'queryPermissions': {
    path: 'kernel://query/permissions/:resourceName',
    description: 'Query permissions for a resource',
    metadata: {
      type: 'route',
      purpose: 'permission-management',
      operation: 'query'
    },
    handler: 'handleQueryPermissions'
  },
  'grantPermission': {
    path: 'kernel://grant/permission/:resourceName',
    description: 'Grant permission on a resource',
    metadata: {
      type: 'route',
      purpose: 'permission-management',
      operation: 'grant'
    },
    handler: 'handleGrantPermission'
  },
  'revokePermission': {
    path: 'kernel://revoke/permission/:resourceName',
    description: 'Revoke permission on a resource',
    metadata: {
      type: 'route',
      purpose: 'permission-management',
      operation: 'revoke'
    },
    handler: 'handleRevokePermission'
  },
  'queryInheritedPermissions': {
    path: 'kernel://query/permissions/inherited/:resourceName',
    description: 'Query inherited permissions for a resource',
    metadata: {
      type: 'route',
      purpose: 'permission-management',
      operation: 'query'
    },
    handler: 'handleQueryInheritedPermissions'
  },

  // === Profile Management Routes ===
  'createProfile': {
    path: 'kernel://create/profile',
    description: 'Create a new security profile',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'create'
    },
    handler: 'handleCreateProfile'
  },
  'queryProfile': {
    path: 'kernel://query/profile/:name',
    description: 'Query a profile by name',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'query'
    },
    handler: 'handleQueryProfile'
  },
  'queryProfiles': {
    path: 'kernel://query/profiles',
    description: 'List all profiles',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'query'
    },
    handler: 'handleQueryProfiles'
  },
  'applyProfile': {
    path: 'kernel://apply/profile/:name',
    description: 'Apply a profile to a principal',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'apply'
    },
    handler: 'handleApplyProfile'
  },
  'removeProfile': {
    path: 'kernel://remove/profile/:name',
    description: 'Remove a profile from a principal',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'remove'
    },
    handler: 'handleRemoveProfile'
  },
  'deleteProfile': {
    path: 'kernel://delete/profile/:name',
    description: 'Delete a profile',
    metadata: {
      type: 'route',
      purpose: 'profile-management',
      operation: 'delete'
    },
    handler: 'handleDeleteProfile'
  },

  // === System Information Routes ===
  'querySubsystems': {
    path: 'kernel://query/subsystems',
    description: 'List all registered subsystems',
    metadata: {
      type: 'route',
      purpose: 'system-information',
      operation: 'query'
    },
    handler: 'handleQuerySubsystems'
  },
  'querySubsystem': {
    path: 'kernel://query/subsystem/:name',
    description: 'Query a subsystem by name',
    metadata: {
      type: 'route',
      purpose: 'system-information',
      operation: 'query'
    },
    handler: 'handleQuerySubsystem'
  },
  'queryStatus': {
    path: 'kernel://query/status',
    description: 'Get kernel/system status',
    metadata: {
      type: 'route',
      purpose: 'system-information',
      operation: 'query'
    },
    handler: 'handleQueryStatus'
  },
  'queryStatistics': {
    path: 'kernel://query/statistics',
    description: 'Get system statistics',
    metadata: {
      type: 'route',
      purpose: 'system-information',
      operation: 'query'
    },
    handler: 'handleQueryStatistics'
  },
  'queryRoutes': {
    path: 'kernel://query/routes',
    description: 'List all registered kernel routes',
    metadata: {
      type: 'route',
      purpose: 'system-information',
      operation: 'query'
    },
    handler: 'handleQueryRoutes'
  }
};

/**
 * Create handler map for kernel routes
 * 
 * Maps route handler names to actual handler functions from facets and create handlers.
 * 
 * @param {Object} resourceHandlers - Resource handlers facet
 * @param {Object} friendHandlers - Friend handlers facet
 * @param {Object} permissionHandlers - Permission handlers facet
 * @param {Object} profileHandlers - Profile handlers facet
 * @param {Object} systemHandlers - System handlers facet
 * @param {Function} createResourceHandler - Create resource handler function
 * @param {Function} createFriendHandler - Create friend handler function
 * @returns {Object} Handler map object
 */
export function createKernelHandlerMap({
  resourceHandlers,
  friendHandlers,
  permissionHandlers,
  profileHandlers,
  systemHandlers,
  createResourceHandler,
  createFriendHandler
}) {
  return {
    // Create handlers (passed as functions)
    handleCreateResource: createResourceHandler,
    handleCreateFriend: createFriendHandler,
    // Resource handlers (from resourceHandlers facet)
    handleQueryResource: (m, p, o) => resourceHandlers?.queryResource(m, p, o),
    handleQueryResourcesByOwner: (m, p, o) => resourceHandlers?.queryResourcesByOwner(m, p, o),
    handleQueryResourcesByType: (m, p, o) => resourceHandlers?.queryResourcesByType(m, p, o),
    handleUpdateResource: (m, p, o) => resourceHandlers?.updateResource(m, p, o),
    handleDeleteResource: (m, p, o) => resourceHandlers?.deleteResource(m, p, o),
    // Friend handlers (from friendHandlers facet)
    handleQueryFriend: (m, p, o) => friendHandlers?.queryFriend(m, p, o),
    handleQueryFriendByPkr: (m, p, o) => friendHandlers?.queryFriendByPkr(m, p, o),
    handleQueryFriends: (m, p, o) => friendHandlers?.queryFriends(m, p, o),
    handleUpdateFriend: (m, p, o) => friendHandlers?.updateFriend(m, p, o),
    handleDeleteFriend: (m, p, o) => friendHandlers?.deleteFriend(m, p, o),
    // Permission handlers (from permissionHandlers facet)
    handleQueryPermissions: (m, p, o) => permissionHandlers?.queryPermissions(m, p, o),
    handleGrantPermission: (m, p, o) => permissionHandlers?.grantPermission(m, p, o),
    handleRevokePermission: (m, p, o) => permissionHandlers?.revokePermission(m, p, o),
    handleQueryInheritedPermissions: (m, p, o) => permissionHandlers?.queryInheritedPermissions(m, p, o),
    // Profile handlers (from profileHandlers facet)
    handleCreateProfile: (m, p, o) => profileHandlers?.createProfile(m, p, o),
    handleQueryProfile: (m, p, o) => profileHandlers?.queryProfile(m, p, o),
    handleQueryProfiles: (m, p, o) => profileHandlers?.queryProfiles(m, p, o),
    handleApplyProfile: (m, p, o) => profileHandlers?.applyProfile(m, p, o),
    handleRemoveProfile: (m, p, o) => profileHandlers?.removeProfile(m, p, o),
    handleDeleteProfile: (m, p, o) => profileHandlers?.deleteProfile(m, p, o),
    // System handlers (from systemHandlers facet)
    handleQuerySubsystems: (m, p, o) => systemHandlers?.querySubsystems(m, p, o),
    handleQuerySubsystem: (m, p, o) => systemHandlers?.querySubsystem(m, p, o),
    handleQueryStatus: (m, p, o) => systemHandlers?.queryStatus(m, p, o),
    handleQueryStatistics: (m, p, o) => systemHandlers?.queryStatistics(m, p, o),
    handleQueryRoutes: (m, p, o) => systemHandlers?.queryRoutes(m, p, o)
  };
}

