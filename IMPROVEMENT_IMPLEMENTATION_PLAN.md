# Mycelia Kernel Improvement Implementation Plan

## Quick Wins (Can implement immediately)

### 1. Add Production-Safe Kernel Access Method

**File**: `src/messages/v2/models/message-system/message-system.v2.mycelia.js`

```javascript
/**
 * Get kernel for initialization purposes (production-safe)
 * Unlike getKernel(), this always returns the kernel for legitimate initialization tasks
 * 
 * @returns {KernelSubsystem} Kernel subsystem instance
 */
getKernelForInit() {
  return this.#kernel;
}

/**
 * Initialize security profiles (production-safe helper)
 * 
 * @param {Object} profiles - Map of profile names to scope permissions
 * @example
 * await messageSystem.initializeProfiles({
 *   'user': { 'api:read': 'r', 'api:write': 'rw' },
 *   'admin': { 'api:*': 'rwg' }
 * });
 */
async initializeProfiles(profiles) {
  const kernel = this.getKernelForInit();
  const profileRegistry = kernel.getProfileRegistry();
  
  if (!profileRegistry) {
    throw new Error('ProfileRegistrySubsystem not available. Ensure kernel is bootstrapped.');
  }
  
  for (const [name, scopes] of Object.entries(profiles)) {
    try {
      await profileRegistry.createProfile(name, scopes);
    } catch (error) {
      console.error(`Failed to create profile ${name}:`, error);
      throw error;
    }
  }
}
```

**Impact**: ✅ Solves the ProfileRegistrySubsystem warning issue
**Breaking**: ❌ None - additive only

---

### 2. Export More Common Classes

**File**: `src/messages/v2/index.js`

```javascript
// Add to existing exports
export { KernelSubsystem } from './models/kernel-subsystem/kernel.subsystem.mycelia.js';
export { ProfileRegistrySubsystem } from './models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js';
export { AccessControlSubsystem } from './models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js';
export { SecurityProfile } from './models/security/security-profile.mycelia.js';
```

**Impact**: ✅ Better developer experience
**Breaking**: ❌ None - additive only

---

### 3. Quick Bootstrap Helper

**File**: `src/messages/v2/utils/quick-bootstrap.mycelia.js` (new)

```javascript
import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';

/**
 * Quick bootstrap for common use cases
 * Simplifies setup for typical scenarios
 */
export async function quickBootstrap(config) {
  const {
    appName,
    subsystems = {},
    profiles = {},
    debug = false
  } = config;
  
  const messageSystem = new MessageSystem(appName, { debug });
  await messageSystem.bootstrap();
  
  // Initialize profiles if provided
  if (Object.keys(profiles).length > 0) {
    await messageSystem.initializeProfiles(profiles);
  }
  
  // Create and register subsystems
  const registered = {};
  for (const [name, cfg] of Object.entries(subsystems)) {
    const SubsystemClass = cfg.class || BaseSubsystem;
    const subsystem = new SubsystemClass(name, { ms: messageSystem, ...cfg.options });
    
    if (cfg.hooks) {
      for (const hook of cfg.hooks) {
        subsystem.use(hook, cfg.hookConfigs?.[hook.name]);
      }
    }
    
    await subsystem.build();
    await messageSystem.registerSubsystem(subsystem);
    registered[name] = subsystem;
  }
  
  return { messageSystem, subsystems: registered };
}
```

**Impact**: ✅ Dramatically simplifies common setups
**Breaking**: ❌ None - new utility, doesn't affect existing code

---

## Documentation Improvements

### 1. Production Patterns Guide

**File**: `docs/PRODUCTION-PATTERNS.md` (new)

Document:
- When to use debug mode vs production patterns
- How to initialize profiles in production
- Best practices for kernel access
- Common pitfalls and solutions

### 2. Quick Start Guide

**File**: `docs/QUICK-START.md` (new)

Provide:
- 5-minute setup guide
- Common use case examples
- Copy-paste templates

---

## Testing Strategy

For each improvement:
1. Add unit tests
2. Add integration tests
3. Update existing tests if needed
4. Verify backward compatibility

---

## Version Strategy

- **v1.5.1** (patch): Add production-safe methods (getKernelForInit, initializeProfiles)
- **v1.6.0** (minor): Add quick bootstrap helpers + more exports
- **v1.7.0** (minor): Enhanced documentation + configuration-based bootstrap

---

## Example: Updated Gateway Bootstrap

### Current (v1.5.0)
```javascript
const messageSystem = new MessageSystem('gateway', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel(); // Only in debug mode
// Manual profile initialization...
```

### With Improvements (v1.6.0)
```javascript
// Option 1: Quick bootstrap
const { messageSystem, subsystems } = await quickBootstrap({
  appName: 'gateway',
  profiles: SECURITY_PROFILES,
  subsystems: {
    api: {
      hooks: [useRouter, useRouterWithScopes],
      routes: [...]
    }
  }
});

// Option 2: Production-safe helper
const messageSystem = new MessageSystem('gateway');
await messageSystem.bootstrap();
await messageSystem.initializeProfiles(SECURITY_PROFILES); // Works in production!
```

