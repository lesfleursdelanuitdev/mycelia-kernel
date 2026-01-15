import { PRINCIPAL_KINDS } from '../../security/security.utils.mycelia.js';

/**
 * Resource Management Handlers
 * 
 * Handlers for kernel:// routes related to resource management.
 * All handlers receive (kernel, message, params, options) and return a result.
 */

export async function handleQueryResource(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryResource: callerId (PKR) required');
  }

  const resourceName = params.name;
  if (!resourceName) {
    throw new Error('KernelSubsystem.queryResource: resource name required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryResource: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals) {
    throw new Error('KernelSubsystem.queryResource: principals facet not available');
  }

  // Get principal by name - need to iterate through all principals
  // since get() only works with UUID, not name
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

  // Verify ownership (caller must be the owner)
  if (resource.owner?.identity?.pkr?.uuid !== callerPkr.uuid) {
    return { success: false, error: 'Access denied: not resource owner' };
  }

  return { success: true, resource: resource.toRecord ? resource.toRecord() : resource };
}

export async function handleQueryResourcesByOwner(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryResourcesByOwner: callerId (PKR) required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryResourcesByOwner: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryResourcesByOwner: principals facet not available');
  }

  // Get all principals and filter for resources owned by caller
  const allPrincipals = principals.registry.list ? principals.registry.list() : [];
  const ownedResources = [];

  for (const principal of allPrincipals) {
    if (principal.kind === PRINCIPAL_KINDS.RESOURCE && principal.instance) {
      const resource = principal.instance;
      if (resource.owner?.identity?.pkr?.uuid === callerPkr.uuid) {
        ownedResources.push(resource.toRecord ? resource.toRecord() : resource);
      }
    }
  }

  return { success: true, resources: ownedResources, count: ownedResources.length };
}

export async function handleQueryResourcesByType(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryResourcesByType: callerId (PKR) required');
  }

  const resourceType = params.type;
  if (!resourceType) {
    throw new Error('KernelSubsystem.queryResourcesByType: resource type required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.queryResourcesByType: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.queryResourcesByType: principals facet not available');
  }

  // Get all principals and filter for resources of the specified type
  const allPrincipals = principals.registry.list ? principals.registry.list() : [];
  const typedResources = [];

  for (const principal of allPrincipals) {
    if (principal.kind === PRINCIPAL_KINDS.RESOURCE && principal.instance) {
      const resource = principal.instance;
      const resourceMetadata = resource.metadata || {};
      if (resourceMetadata.type === resourceType && resource.owner?.identity?.pkr?.uuid === callerPkr.uuid) {
        typedResources.push(resource.toRecord ? resource.toRecord() : resource);
      }
    }
  }

  return { success: true, resources: typedResources, count: typedResources.length, type: resourceType };
}

export async function handleUpdateResource(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.updateResource: callerId (PKR) required');
  }

  const resourceName = params.name;
  if (!resourceName) {
    throw new Error('KernelSubsystem.updateResource: resource name required');
  }

  const body = message.getBody();
  const { metadata } = body;

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.updateResource: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.updateResource: principals facet not available');
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

  // Verify ownership
  if (resource.owner?.identity?.pkr?.uuid !== callerPkr.uuid) {
    return { success: false, error: 'Access denied: not resource owner' };
  }

  // Update metadata
  if (metadata && typeof metadata === 'object') {
    resource._metadata = { ...(resource._metadata || {}), ...metadata };
    // Also update principal metadata
    if (principal.metadata) {
      principal.metadata = { ...principal.metadata, ...metadata };
    }
  }

  return { success: true, resource: resource.toRecord ? resource.toRecord() : resource };
}

export async function handleDeleteResource(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.deleteResource: callerId (PKR) required');
  }

  const resourceName = params.name;
  if (!resourceName) {
    throw new Error('KernelSubsystem.deleteResource: resource name required');
  }

  const accessControl = kernel.getAccessControl();
  if (!accessControl) {
    throw new Error('KernelSubsystem.deleteResource: AccessControlSubsystem not available');
  }

  const principals = accessControl.find('principals');
  if (!principals || !principals.registry) {
    throw new Error('KernelSubsystem.deleteResource: principals facet not available');
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

  // Verify ownership
  if (resource.owner?.identity?.pkr?.uuid !== callerPkr.uuid) {
    return { success: false, error: 'Access denied: not resource owner' };
  }

  // Delete principal (this will clean up all mappings)
  const deleted = principals.registry.delete?.(principal.pkr.uuid);
  if (!deleted) {
    return { success: false, error: 'Failed to delete resource' };
  }

  return { success: true, deleted: true, resourceName };
}

