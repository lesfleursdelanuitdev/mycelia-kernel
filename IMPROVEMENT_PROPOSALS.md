# Mycelia Kernel Improvement Proposals

Based on real-world integration experience with `ligneous-gedcom-gateway`, here are concrete improvement proposals.

## 1. More Intuitive Initialization (Less Debug Mode Dependency)

### Problem
- `getKernel()` only works in debug mode
- Profile initialization requires kernel access
- Forces developers to enable debug mode for legitimate initialization tasks

### Proposed Solutions

#### Option A: Production-Safe Kernel Access Methods
```javascript
// Add to MessageSystem
class MessageSystem {
  /**
   * Get kernel for initialization purposes (production-safe)
   * Returns kernel for legitimate initialization tasks
   */
  getKernelForInit() {
    return this.#kernel; // Always available for initialization
  }
  
  /**
   * Initialize security profiles (production-safe helper)
   */
  async initializeProfiles(profiles) {
    const kernel = this.getKernelForInit();
    const profileRegistry = kernel.getProfileRegistry();
    // ... initialize profiles
  }
}
```

#### Option B: Initialization Hooks
```javascript
// Add initialization hook system
messageSystem.onInit(async (kernel) => {
  // Initialize profiles, setup, etc.
  const profileRegistry = kernel.getProfileRegistry();
  await profileRegistry.createProfile('user', {...});
});
```

#### Option C: Bootstrap Configuration
```javascript
// Enhanced bootstrap with initialization config
await messageSystem.bootstrap({
  init: {
    profiles: {
      'user': { 'scope:read': 'r', 'scope:write': 'rw' },
      'admin': { 'scope:*': 'rwg' }
    },
    // Other initialization tasks
  }
});
```

**Recommendation**: Option A + Option C (provide both direct access and configuration-based)

---

## 2. Better Export Strategy

### Problem
- Common classes not exported from main entry
- Forces deep imports or subpath exports
- Inconsistent developer experience

### Proposed Solution

**File**: `src/messages/v2/index.js`

```javascript
// Core Classes (already done ✅)
export { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
export { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
export { Message } from './models/message/message.mycelia.js';

// Kernel Subsystems (add these)
export { KernelSubsystem } from './models/kernel-subsystem/kernel.subsystem.mycelia.js';
export { ProfileRegistrySubsystem } from './models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js';
export { AccessControlSubsystem } from './models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js';

// Security Models (add these)
export { SecurityProfile } from './models/security/security-profile.mycelia.js';
export { Principal } from './models/security/principal.mycelia.js';
export { PKR } from './models/security/pkr.mycelia.js';

// Common Utilities (add these)
export { createGetUserRole, createScopeMapper } from './utils/router-security-utils.mycelia.js';
export { createTestMessageSystem, createMockPkr } from './utils/test-utils.mycelia.js';
```

**Benefits**:
- One-stop import: `import { MessageSystem, KernelSubsystem, SecurityProfile } from 'mycelia-kernel'`
- Better IDE autocomplete
- Consistent developer experience

---

## 3. Clearer Production vs. Development Patterns

### Problem
- Unclear when to use debug mode
- No clear guidance on production-safe patterns
- Confusion about kernel access

### Proposed Solutions

#### A. Documented Patterns

**File**: `docs/PRODUCTION-PATTERNS.md`

```markdown
# Production vs Development Patterns

## Kernel Access

### ❌ Don't Do This (Production)
```javascript
const kernel = messageSystem.getKernel(); // Returns null in production
kernel.getProfileRegistry(); // Fails
```

### ✅ Do This (Production)
```javascript
// Use message-based initialization
await messageSystem.send(new Message('kernel://profiles/create', {
  name: 'user',
  scopes: { 'scope:read': 'r' }
}));

// Or use initialization config
await messageSystem.bootstrap({
  init: { profiles: {...} }
});
```

### ✅ Do This (Development/Testing)
```javascript
const messageSystem = new MessageSystem('app', { debug: true });
const kernel = messageSystem.getKernel(); // Available in debug mode
const profileRegistry = kernel.getProfileRegistry();
```

## Initialization Patterns

### Production Pattern
- Use message-based initialization
- Use bootstrap configuration
- Use initialization hooks

### Development Pattern
- Direct kernel access (debug mode)
- Direct subsystem access
- Test utilities
```

#### B. Production-Safe Initialization API

```javascript
// Add to MessageSystem
class MessageSystem {
  /**
   * Production-safe profile initialization
   */
  async initializeProfiles(profiles) {
    // Uses internal kernel access (production-safe)
    const kernel = this.#kernel;
    const profileRegistry = kernel.getProfileRegistry();
    
    for (const [name, scopes] of Object.entries(profiles)) {
      await profileRegistry.createProfile(name, scopes);
    }
  }
  
  /**
   * Production-safe subsystem registration with initialization
   */
  async registerSubsystemWithInit(subsystem, initFn) {
    await this.registerSubsystem(subsystem);
    if (initFn) {
      // Call init function with safe kernel access
      await initFn(this.#kernel);
    }
  }
}
```

---

## 4. Simplified Setup for Common Use Cases

### Problem
- Too many steps for common scenarios
- Unclear what's required vs optional
- No "quick start" path

### Proposed Solutions

#### A. Bootstrap Helper Function

**File**: `src/messages/v2/utils/quick-bootstrap.mycelia.js` (new)

```javascript
/**
 * Quick bootstrap for common use cases
 * 
 * @example
 * // Simple API gateway
 * const { messageSystem, apiSubsystem } = await quickBootstrap({
 *   appName: 'my-api',
 *   subsystems: {
 *     api: {
 *       hooks: [useRouter, useRouterWithScopes],
 *       routes: [...]
 *     }
 *   },
 *   profiles: {
 *     user: { 'api:read': 'r', 'api:write': 'rw' },
 *     admin: { 'api:*': 'rwg' }
 *   }
 * });
 */
export async function quickBootstrap(config) {
  const { appName, subsystems = {}, profiles = {}, debug = false } = config;
  
  // Create message system
  const messageSystem = new MessageSystem(appName, { debug });
  await messageSystem.bootstrap();
  
  // Initialize profiles if provided
  if (Object.keys(profiles).length > 0) {
    const kernel = messageSystem.getKernelForInit?.() || messageSystem.getKernel();
    if (kernel) {
      const profileRegistry = kernel.getProfileRegistry();
      for (const [name, scopes] of Object.entries(profiles)) {
        await profileRegistry.createProfile(name, scopes);
      }
    }
  }
  
  // Create and register subsystems
  const registeredSubsystems = {};
  for (const [name, subsystemConfig] of Object.entries(subsystems)) {
    const SubsystemClass = subsystemConfig.class || BaseSubsystem;
    const subsystem = new SubsystemClass(name, {
      ms: messageSystem,
      ...subsystemConfig.options
    });
    
    // Install hooks
    if (subsystemConfig.hooks) {
      for (const hook of subsystemConfig.hooks) {
        subsystem.use(hook, subsystemConfig.hookConfigs?.[hook.name]);
      }
    }
    
    await subsystem.build();
    await messageSystem.registerSubsystem(subsystem);
    
    // Register routes if provided
    if (subsystemConfig.routes && subsystem.router) {
      for (const route of subsystemConfig.routes) {
        subsystem.router.registerRoute(route.path, route.handler, route.options);
      }
    }
    
    registeredSubsystems[name] = subsystem;
  }
  
  return {
    messageSystem,
    kernel: messageSystem.getKernel(),
    subsystems: registeredSubsystems
  };
}
```

#### B. Gateway-Specific Bootstrap

**File**: `src/messages/v2/utils/gateway-bootstrap.mycelia.js` (new)

```javascript
/**
 * Bootstrap helper specifically for API gateway patterns
 */
export async function bootstrapGateway(config) {
  const {
    appName,
    securityProfiles,
    routes,
    authStrategy,
    debug = false
  } = config;
  
  const messageSystem = new MessageSystem(appName, { debug });
  await messageSystem.bootstrap();
  
  // Initialize security profiles
  if (securityProfiles) {
    await messageSystem.initializeProfiles(securityProfiles);
  }
  
  // Create gateway subsystem
  const gateway = new BaseSubsystem('gateway', { ms: messageSystem });
  gateway.use(useRouter);
  gateway.use(useRouterWithScopes);
  
  if (authStrategy) {
    gateway.use(useAuthStrategies, { config: authStrategy });
  }
  
  await gateway.build();
  await messageSystem.registerSubsystem(gateway);
  
  // Register routes
  if (routes) {
    for (const route of routes) {
      gateway.router.registerRoute(route.path, route.handler, {
        metadata: {
          required: route.required || 'read',
          scope: route.scope
        }
      });
    }
  }
  
  return { messageSystem, gateway };
}
```

#### C. Configuration-Based Bootstrap

**File**: `src/messages/v2/utils/bootstrap-from-config.mycelia.js` (enhance existing)

```javascript
// Enhance existing bootstrapFromConfig with more options
export async function bootstrapFromConfig(configPath) {
  const config = await loadConfig(configPath);
  
  const messageSystem = new MessageSystem(config.app.name, {
    debug: config.app.debug || false
  });
  
  // Initialize profiles from config
  if (config.security?.profiles) {
    await messageSystem.initializeProfiles(config.security.profiles);
  }
  
  // ... rest of bootstrap
}
```

**Config file example** (`mycelia.config.json`):
```json
{
  "app": {
    "name": "my-gateway",
    "debug": false
  },
  "security": {
    "profiles": {
      "user": {
        "api:read": "r",
        "api:write": "rw"
      },
      "admin": {
        "api:*": "rwg"
      }
    }
  },
  "subsystems": {
    "api": {
      "hooks": ["useRouter", "useRouterWithScopes"],
      "routes": [...]
    }
  }
}
```

---

## Implementation Priority

### High Priority (Immediate Impact)
1. ✅ **Export Strategy** - Already done (MessageSystem, Message)
2. **Production-Safe Kernel Access** - Add `getKernelForInit()` method
3. **Profile Initialization Helper** - Add `initializeProfiles()` to MessageSystem

### Medium Priority (Better DX)
4. **Quick Bootstrap Helper** - Create `quickBootstrap()` utility
5. **Enhanced Documentation** - Production vs Development patterns guide
6. **Export More Classes** - KernelSubsystem, SecurityProfile, etc.

### Low Priority (Nice to Have)
7. **Configuration-Based Bootstrap** - Enhance existing bootstrap-from-config
8. **Gateway-Specific Bootstrap** - Specialized helper for gateway patterns
9. **Initialization Hooks** - Event-based initialization system

---

## Example: Improved Gateway Bootstrap

### Before (Current)
```javascript
const messageSystem = new MessageSystem('gateway', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel(); // Only works in debug mode
const profileRegistry = kernel.getProfileRegistry();
// ... manual profile initialization
```

### After (Proposed)
```javascript
// Option 1: Quick bootstrap
const { messageSystem, gateway } = await quickBootstrap({
  appName: 'gateway',
  profiles: SECURITY_PROFILES,
  subsystems: {
    gateway: {
      hooks: [useRouter, useRouterWithScopes],
      routes: [...]
    }
  }
});

// Option 2: Helper method
const messageSystem = new MessageSystem('gateway');
await messageSystem.bootstrap();
await messageSystem.initializeProfiles(SECURITY_PROFILES); // Production-safe

// Option 3: Configuration
await bootstrapFromConfig('./mycelia.config.json');
```

---

## Benefits

1. **Less Debug Mode Dependency**: Production-safe initialization methods
2. **Better Exports**: One-stop imports for common classes
3. **Clearer Patterns**: Documented production vs development approaches
4. **Simplified Setup**: Quick bootstrap for common use cases

---

## Migration Path

These improvements can be added incrementally:
- Phase 1: Add production-safe methods (backward compatible)
- Phase 2: Add quick bootstrap helpers (optional, doesn't break existing code)
- Phase 3: Enhance exports (backward compatible, old imports still work)
- Phase 4: Add documentation and examples

All changes maintain backward compatibility!

