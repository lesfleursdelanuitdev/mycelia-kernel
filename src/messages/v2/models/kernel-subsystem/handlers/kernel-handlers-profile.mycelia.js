/**
 * Profile Management Handlers
 * 
 * Handlers for kernel:// routes related to profile management.
 * All handlers receive (kernel, message, params, options) and return a result.
 */

export async function handleCreateProfile(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.createProfile: callerId (PKR) required');
  }

  const body = message.getBody();
  const { name, grants, metadata = {} } = body;

  if (!name || typeof name !== 'string') {
    throw new Error('KernelSubsystem.createProfile: name must be a non-empty string');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.createProfile: ProfileRegistrySubsystem not available');
  }

  try {
    const profile = profileRegistry.createProfile(name, grants || {}, metadata);
    return { success: true, profile: profile.toRecord ? profile.toRecord() : profile };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to create profile' };
  }
}

export async function handleQueryProfile(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryProfile: callerId (PKR) required');
  }

  const profileName = params.name;
  if (!profileName) {
    throw new Error('KernelSubsystem.queryProfile: profile name required');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.queryProfile: ProfileRegistrySubsystem not available');
  }

  const profile = profileRegistry.getProfile(profileName);
  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  return { success: true, profile: profile.toRecord ? profile.toRecord() : profile };
}

export async function handleQueryProfiles(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.queryProfiles: callerId (PKR) required');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.queryProfiles: ProfileRegistrySubsystem not available');
  }

  const profileNames = profileRegistry.listProfiles();
  const profiles = profileNames.map(name => {
    const profile = profileRegistry.getProfile(name);
    return profile?.toRecord ? profile.toRecord() : profile;
  }).filter(Boolean);

  return { success: true, profiles, count: profiles.length };
}

export async function handleApplyProfile(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.applyProfile: callerId (PKR) required');
  }

  const profileName = params.name;
  if (!profileName) {
    throw new Error('KernelSubsystem.applyProfile: profile name required');
  }

  const body = message.getBody();
  const { principalPkr } = body;

  if (!principalPkr || !principalPkr.uuid) {
    throw new Error('KernelSubsystem.applyProfile: principalPkr required');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.applyProfile: ProfileRegistrySubsystem not available');
  }

  try {
    const result = profileRegistry.applyProfileToPrincipal(profileName, principalPkr);
    return { success: result.success !== false, ...result };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to apply profile' };
  }
}

export async function handleRemoveProfile(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.removeProfile: callerId (PKR) required');
  }

  const profileName = params.name;
  if (!profileName) {
    throw new Error('KernelSubsystem.removeProfile: profile name required');
  }

  const body = message.getBody();
  const { principalPkr } = body;

  if (!principalPkr || !principalPkr.uuid) {
    throw new Error('KernelSubsystem.removeProfile: principalPkr required');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.removeProfile: ProfileRegistrySubsystem not available');
  }

  try {
    const result = profileRegistry.removeProfileFromPrincipal(profileName, principalPkr);
    return { success: result.success !== false, ...result };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to remove profile' };
  }
}

export async function handleDeleteProfile(kernel, message, params, options) {
  const callerPkr = options.callerId;
  if (!callerPkr || !callerPkr.uuid) {
    throw new Error('KernelSubsystem.deleteProfile: callerId (PKR) required');
  }

  const profileName = params.name;
  if (!profileName) {
    throw new Error('KernelSubsystem.deleteProfile: profile name required');
  }

  const profileRegistry = kernel.getProfileRegistry();
  if (!profileRegistry) {
    throw new Error('KernelSubsystem.deleteProfile: ProfileRegistrySubsystem not available');
  }

  // Note: ProfileRegistrySubsystem doesn't have a deleteProfile method yet
  // This is a placeholder for future implementation
  return { success: false, error: 'Profile deletion not yet implemented' };
}

