/**
 * System Information Handlers
 * 
 * Handlers for kernel:// routes related to system information queries.
 * All handlers receive (kernel, message, params, options) and return a result.
 */

export async function handleQuerySubsystems(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.querySubsystems: callerId (PKR) required');
  }

  const messageSystem = kernel.messageSystem;
  if (!messageSystem) {
    throw new Error('KernelSubsystem.querySubsystems: MessageSystem not available');
  }

  const registry = messageSystem.find('messageSystemRegistry');
  if (!registry) {
    return { success: true, subsystems: [], count: 0 };
  }

  const subsystems = Array.from(registry.values()).map(subsystem => ({
    name: subsystem.name,
    path: subsystem.getNameString ? subsystem.getNameString() : subsystem.name,
    hasIdentity: !!subsystem.identity,
    pkrUuid: subsystem.identity?.pkr?.uuid || null
  }));

  return { success: true, subsystems, count: subsystems.length };
}

export async function handleQuerySubsystem(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.querySubsystem: callerId (PKR) required');
  }

  const subsystemName = params.name;
  if (!subsystemName) {
    throw new Error('KernelSubsystem.querySubsystem: subsystem name required');
  }

  const messageSystem = kernel.messageSystem;
  if (!messageSystem) {
    throw new Error('KernelSubsystem.querySubsystem: MessageSystem not available');
  }

  const registry = messageSystem.find('messageSystemRegistry');
  if (!registry) {
    return { success: false, error: 'Subsystem registry not available' };
  }

  const subsystem = registry.get?.(subsystemName);
  if (!subsystem) {
    return { success: false, error: 'Subsystem not found' };
  }

  return {
    success: true,
    subsystem: {
      name: subsystem.name,
      path: subsystem.getNameString ? subsystem.getNameString() : subsystem.name,
      hasIdentity: !!subsystem.identity,
      pkrUuid: subsystem.identity?.pkr?.uuid || null
    }
  };
}

export async function handleQueryStatus(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryStatus: callerId (PKR) required');
  }

  const messageSystem = kernel.messageSystem;
  const registry = messageSystem?.find('messageSystemRegistry');
  const subsystemCount = registry ? registry.size || 0 : 0;

  return {
    success: true,
    status: {
      kernel: {
        name: kernel.name,
        built: kernel._isBuilt || false
      },
      subsystems: {
        count: subsystemCount
      },
      timestamp: Date.now()
    }
  };
}

export async function handleQueryStatistics(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryStatistics: callerId (PKR) required');
  }

  const accessControl = kernel.getAccessControl();
  const principals = accessControl?.find('principals');
  const principalCount = principals?.registry?.size || 0;

  const messageSystem = kernel.messageSystem;
  const registry = messageSystem?.find('messageSystemRegistry');
  const subsystemCount = registry ? registry.size || 0 : 0;

  return {
    success: true,
    statistics: {
      principals: {
        count: principalCount
      },
      subsystems: {
        count: subsystemCount
      },
      timestamp: Date.now()
    }
  };
}

export async function handleQueryRoutes(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryRoutes: callerId (PKR) required');
  }

  const router = kernel.find('router');
  if (!router) {
    return { success: false, error: 'Router not available' };
  }

  const routes = router.getRoutes ? router.getRoutes() : [];
  const kernelRoutes = routes
    .filter(route => route.pattern && route.pattern.startsWith('kernel://'))
    .map(route => ({
      pattern: route.pattern,
      description: route.metadata?.description || '',
      purpose: route.metadata?.purpose || '',
      operation: route.metadata?.operation || ''
    }));

  return {
    success: true,
    routes: kernelRoutes,
    count: kernelRoutes.length
  };
}

