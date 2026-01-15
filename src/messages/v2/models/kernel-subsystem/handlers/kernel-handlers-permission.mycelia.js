import { PRINCIPAL_KINDS } from '../../security/security.utils.mycelia.js';

/**
 * Permission Management Handlers
 * 
 * Handlers for kernel:// routes related to permission management.
 * All handlers receive (kernel, message, params, options) and return a result.
 */

export async function handleQueryPermissions(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryPermissions: callerId (PKR) required');
  }

  const resourceName = params.resourceName;
  if (!resourceName) {
    throw new Error('KernelSubsystem.queryPermissions: resource name required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryPermissions: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryPermissions: principals facet not available');
  }

  // Find resource by name
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === resourceName && p.kind === PRINCIPAL_KINDS.RESOURCE) {
      principal = p;
      break;
    }
  }
  if (!principal || principal.kind !== PRINCIPAL_KINDS.RESOURCE) {
    return { success: false, error: 'Resource not found' };
  }

  const resource = principal.instance;
  if (!resource || !resource.isResource) {
    return { success: false, error: 'Resource instance not found' };
  }

  // Verify ownership or read permission
  const resourceIdentity = resource.instance?.identity;
  if (!resourceIdentity) {
    return { success: false, error: 'Resource identity not found' };
  }

  // Get RWS from resource identity
  const rws = resourceIdentity.rws;
  if (!rws) {
    return { success: false, error: 'Resource RWS not found' };
  }

  // Get readers, writers, granters from RWS
  // Note: RWS doesn't expose these directly, so we'll return a summary
  return {
    success: true,
    resourceName,
    permissions: {
      canRead: rws.canRead(callerPkr),
      canWrite: rws.canWrite(callerPkr),
      canGrant: rws.canGrant(callerPkr)
    }
  };
}

export async function handleGrantPermission(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.grantPermission: callerId (PKR) required');
  }

  const resourceName = params.resourceName;
  if (!resourceName) {
    throw new Error('KernelSubsystem.grantPermission: resource name required');
  }

  const body = message.getBody();
  const { granteePkr, permission } = body; // permission: 'read', 'write', 'grant'

  if (!granteePkr || !granteePkr.uuid) {
    throw new Error('KernelSubsystem.grantPermission: granteePkr required');
  }
  if (!permission || !['read', 'write', 'grant'].includes(permission)) {
    throw new Error('KernelSubsystem.grantPermission: permission must be "read", "write", or "grant"');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.grantPermission: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.grantPermission: principals facet not available');
  }

  // Find resource by name
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === resourceName && p.kind === PRINCIPAL_KINDS.RESOURCE) {
      principal = p;
      break;
    }
  }
  if (!principal || principal.kind !== PRINCIPAL_KINDS.RESOURCE) {
    return { success: false, error: 'Resource not found' };
  }

  const resource = principal.instance;
  if (!resource || !resource.isResource) {
    return { success: false, error: 'Resource instance not found' };
  }

  const resourceIdentity = resource.instance?.identity;
  if (!resourceIdentity) {
    return { success: false, error: 'Resource identity not found' };
  }

  // Verify caller can grant permissions
  if (!resourceIdentity.canGrant(callerPkr)) {
    return { success: false, error: 'Access denied: cannot grant permissions on this resource' };
  }

  // Grant permission
  try {
    if (permission === 'read') {
      resourceIdentity.grantReader(callerPkr, granteePkr);
    } else if (permission === 'write') {
      resourceIdentity.grantWriter(callerPkr, granteePkr);
    } else if (permission === 'grant') {
      resourceIdentity.grantGranter(callerPkr, granteePkr);
    }
    return { success: true, resourceName, permission, granted: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to grant permission' };
  }
}

export async function handleRevokePermission(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.revokePermission: callerId (PKR) required');
  }

  const resourceName = params.resourceName;
  if (!resourceName) {
    throw new Error('KernelSubsystem.revokePermission: resource name required');
  }

  const body = message.getBody();
  const { granteePkr, permission } = body; // permission: 'read', 'write', 'grant'

  if (!granteePkr || !granteePkr.uuid) {
    throw new Error('KernelSubsystem.revokePermission: granteePkr required');
  }
  if (!permission || !['read', 'write', 'grant'].includes(permission)) {
    throw new Error('KernelSubsystem.revokePermission: permission must be "read", "write", or "grant"');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.revokePermission: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.revokePermission: principals facet not available');
  }

  // Find resource by name
  const allPrincipals = principals.registry?.list ? principals.registry.list() : [];
  let principal = null;
  for (const p of allPrincipals) {
    if (p.name === resourceName && p.kind === PRINCIPAL_KINDS.RESOURCE) {
      principal = p;
      break;
    }
  }
  if (!principal || principal.kind !== PRINCIPAL_KINDS.RESOURCE) {
    return { success: false, error: 'Resource not found' };
  }

  const resource = principal.instance;
  if (!resource || !resource.isResource) {
    return { success: false, error: 'Resource instance not found' };
  }

  const resourceIdentity = resource.instance?.identity;
  if (!resourceIdentity) {
    return { success: false, error: 'Resource identity not found' };
  }

  // Verify caller can grant permissions
  if (!resourceIdentity.canGrant(callerPkr)) {
    return { success: false, error: 'Access denied: cannot revoke permissions on this resource' };
  }

  // Revoke permission
  try {
    if (permission === 'read') {
      resourceIdentity.revokeReader(callerPkr, granteePkr);
    } else if (permission === 'write') {
      resourceIdentity.revokeWriter(callerPkr, granteePkr);
    } else if (permission === 'grant') {
      resourceIdentity.revokeGranter(callerPkr, granteePkr);
    }
    return { success: true, resourceName, permission, revoked: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke permission' };
  }
}

export async function handleQueryInheritedPermissions(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryInheritedPermissions: callerId (PKR) required');
  }

  const resourceName = params.resourceName;
  if (!resourceName) {
    throw new Error('KernelSubsystem.queryInheritedPermissions: resource name required');
  }

  // For now, return a placeholder - inheritance logic would need to traverse parent resources
  return {
    success: true,
    resourceName,
    inherited: false,
    message: 'Permission inheritance not yet implemented'
  };
}

