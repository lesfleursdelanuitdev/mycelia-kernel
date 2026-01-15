import { PRINCIPAL_KINDS } from '../../security/security.utils.mycelia.js';

/**
 * Friend Management Handlers
 * 
 * Handlers for kernel:// routes related to friend management.
 * All handlers receive (kernel, message, params, options) and return a result.
 */

export async function handleQueryFriend(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryFriend: callerId (PKR) required');
  }

  const friendName = params.name;
  if (!friendName) {
    throw new Error('KernelSubsystem.queryFriend: friend name required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryFriend: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryFriend: principals facet not available');
  }

  // Get principal by name - need to iterate through all principals
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === friendName && p.kind === PRINCIPAL_KINDS.FRIEND) {
      principal = p;
      break;
    }
  }

  if (!principal || principal.kind !== PRINCIPAL_KINDS.FRIEND) {
    return { success: false, error: 'Friend not found' };
  }

  const friend = principal.instance;
  if (!friend || !friend.isFriend) {
    return { success: false, error: 'Friend instance not found' };
  }

  return { success: true, friend: friend.toRecord ? friend.toRecord() : friend };
}

export async function handleQueryFriendByPkr(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryFriendByPkr: callerId (PKR) required');
  }

  const pkrUuid = params.pkrUuid;
  if (!pkrUuid) {
    throw new Error('KernelSubsystem.queryFriendByPkr: PKR UUID required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryFriendByPkr: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryFriendByPkr: principals facet not available');
  }

  // Get principal by UUID
  const principal = principals.registry.get?.(pkrUuid);
  if (!principal || principal.kind !== PRINCIPAL_KINDS.FRIEND) {
    return { success: false, error: 'Friend not found' };
  }

  const friend = principal.instance;
  if (!friend || !friend.isFriend) {
    return { success: false, error: 'Friend instance not found' };
  }

  return { success: true, friend: friend.toRecord ? friend.toRecord() : friend };
}

export async function handleQueryFriends(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryFriends: callerId (PKR) required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryFriends: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryFriends: principals facet not available');
  }

  // Get all principals and filter for friends
  const allPrincipals = principals.registry.list ? principals.registry.list() : [];
  const friends = [];

  for (const principal of allPrincipals) {
    if (principal.kind === PRINCIPAL_KINDS.FRIEND && principal.instance) {
      const friend = principal.instance;
      if (friend.isFriend) {
        friends.push(friend.toRecord ? friend.toRecord() : friend);
      }
    }
  }

  return { success: true, friends, count: friends.length };
}

export async function handleUpdateFriend(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.updateFriend: callerId (PKR) required');
  }

  const friendName = params.name;
  if (!friendName) {
    throw new Error('KernelSubsystem.updateFriend: friend name required');
  }

  const body = message.getBody();
  const { metadata, endpoint, role } = body;

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.updateFriend: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.updateFriend: principals facet not available');
  }

  // Find friend by name
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === friendName && p.kind === PRINCIPAL_KINDS.FRIEND) {
      principal = p;
      break;
    }
  }

  if (!principal || principal.kind !== PRINCIPAL_KINDS.FRIEND) {
    return { success: false, error: 'Friend not found' };
  }

  const friend = principal.instance;
  if (!friend || !friend.isFriend) {
    return { success: false, error: 'Friend instance not found' };
  }

  // Update friend properties
  if (metadata && typeof metadata === 'object') {
    friend._metadata = { ...(friend._metadata || {}), ...metadata };
    if (principal.metadata) {
      principal.metadata = { ...principal.metadata, ...metadata };
    }
  }
  if (endpoint !== undefined) {
    friend._endpoint = endpoint;
  }
  if (role !== undefined) {
    if (friend._metadata) {
      friend._metadata.role = role;
    }
    if (principal.metadata) {
      principal.metadata.role = role;
    }
  }

  return { success: true, friend: friend.toRecord ? friend.toRecord() : friend };
}

export async function handleDeleteFriend(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.deleteFriend: callerId (PKR) required');
  }

  const friendName = params.name;
  if (!friendName) {
    throw new Error('KernelSubsystem.deleteFriend: friend name required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.deleteFriend: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.deleteFriend: principals facet not available');
  }

  // Find friend by name
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === friendName && p.kind === PRINCIPAL_KINDS.FRIEND) {
      principal = p;
      break;
    }
  }

  if (!principal || principal.kind !== PRINCIPAL_KINDS.FRIEND) {
    return { success: false, error: 'Friend not found' };
  }

  // Delete principal (this will clean up all mappings)
  const deleted = principals.registry.delete?.(principal.pkr.uuid);
  if (!deleted) {
    return { success: false, error: 'Failed to delete friend' };
  }

  return { success: true, deleted: true, friendName };
}

