# Security Integration Solution

## Problem Statement

`useRouterWithScopes` is not working because there's **no connection** between:
- **PKRs/Principals** (identity layer)
- **Roles/SecurityProfiles** (permission layer)

The router needs to map: `PKR → Role → SecurityProfile → Permissions`

## Current Infrastructure

### Layer 1: Identity (PKR/Principal)
- **Principal**: Represents an entity (kernel, subsystem, friend, resource)
- **PrincipalRegistry**: Manages all principals
- **PKR**: Public Key Record for authentication

### Layer 2: Permissions (RWS)
- **ReaderWriterSet (RWS)**: Per-principal permission checking (read/write/grant)
- **createIdentity**: Wraps PKR with RWS and permission helpers

### Layer 3: Role-Based Security (Profiles)
- **SecurityProfile**: Role definitions with scoped permissions (e.g., "student" → { "workspace:create": "rw" })
- **ProfileRegistry**: Manages profiles and applies them to principals
- **useProfiles**: Hook for managing profiles

### Layer 4: Router Security
- **useRouter**: Basic routing with RWS checks
- **useRouterWithScopes**: Adds role-based scope checking (NOT WORKING)

## The Missing Link

**Gap:** No way to map `PKR → role name → SecurityProfile`

`useRouterWithScopes` requires:
```javascript
const getUserRole = (pkr) => string | null;  // THIS DOESN'T EXIST
```

## Solution: Bridge Identity and Roles

### 1. Store Roles in Principal Metadata

When creating principals, store the role in metadata:

```javascript
// In AccessControlSubsystem or when creating principals
const pkr = principalsFacet.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
  name: 'Alice',
  instance: friend,
  metadata: {
    role: 'student',  // ← Store role here
    email: 'alice@example.com'
  }
});
```

### 2. Add Role Helpers to PrincipalRegistry

Add methods to retrieve role from PKR:

```javascript
// In PrincipalRegistry class
/**
 * Get the role for a principal by PKR
 * @param {PKR} pkr - Principal's Public Key Record
 * @returns {string|null} Role name or null if not set
 */
getRoleForPKR(pkr) {
  if (!pkr || typeof pkr.uuid !== 'string') {
    return null;
  }
  
  const principal = this.#byUuid.get(pkr.uuid);
  if (!principal) {
    return null;
  }
  
  return principal.metadata?.role || null;
}

/**
 * Set the role for a principal by PKR
 * @param {PKR} pkr - Principal's Public Key Record
 * @param {string} role - Role name
 * @returns {boolean} True if role was set successfully
 */
setRoleForPKR(pkr, role) {
  if (!pkr || typeof pkr.uuid !== 'string') {
    return false;
  }
  
  if (typeof role !== 'string' || !role.trim()) {
    throw new Error('setRoleForPKR: role must be a non-empty string');
  }
  
  const principal = this.#byUuid.get(pkr.uuid);
  if (!principal) {
    return false;
  }
  
  if (!principal.metadata) {
    principal.metadata = {};
  }
  
  principal.metadata.role = role;
  return true;
}
```

### 3. Add Role to Identity Wrapper

Expose role information through the identity wrapper:

```javascript
// In createIdentity.js
function getRole() {
  return principals.getRoleForPKR(ownerPkr);
}

function setRole(role) {
  return principals.setRoleForPKR(ownerPkr, role);
}

// Return in identity object
return {
  pkr: ownerPkr,
  // ... existing methods ...
  getRole,
  setRole,
};
```

### 4. Update createFriendIdentity to Support Roles

```javascript
// In AccessControlSubsystem.createFriend
createFriend(name, options = {}) {
  const { endpoint = null, metadata = {}, sessionKey = null, role = null } = options;
  
  // Merge role into metadata if provided
  const friendMetadata = { ...metadata };
  if (role) {
    friendMetadata.role = role;
  }
  
  const friend = new Friend({
    name,
    endpoint,
    metadata: friendMetadata,
    sessionKey
  });
  
  const principalsFacet = this.find('principals');
  const pkr = principalsFacet.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
    name,
    instance: friend,
    metadata: friendMetadata  // ← Role included here
  });
  
  friend.identity = principalsFacet.createFriendIdentity(pkr);
  return friend;
}
```

### 5. Create Standard getUserRole Function

Create a reusable getUserRole function for useRouterWithScopes:

```javascript
// In a utility file: security-utils.mycelia.js or router-security-utils.mycelia.js

/**
 * Standard getUserRole function for useRouterWithScopes
 * Gets the role from a PKR by looking up the principal in AccessControlSubsystem
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @returns {Function} getUserRole function: (pkr) => string | null
 */
export function createGetUserRole(kernel) {
  return function getUserRole(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return null;
    }
    
    // Get AccessControlSubsystem
    const accessControl = kernel.getAccessControl?.();
    if (!accessControl) {
      return null;
    }
    
    // Get principals facet
    const principalsFacet = accessControl.find('principals');
    if (!principalsFacet) {
      return null;
    }
    
    // Get role from principal metadata
    return principalsFacet.getRoleForPKR(pkr);
  };
}
```

### 6. Configure useRouterWithScopes

Use the standard getUserRole function when installing the router:

```javascript
// In subsystem setup
import { createGetUserRole } from './utils/router-security-utils.mycelia.js';

subsystem
  .use(useRouter)
  .use(useRouterWithScopes);

// After build, configure router with getUserRole
await subsystem.build();

// Get kernel for getUserRole
const kernel = subsystem.getRoot();
const getUserRole = createGetUserRole(kernel);

// Store getUserRole in config or pass it when needed
subsystem.ctx.config.router = {
  ...subsystem.ctx.config.router,
  getUserRole
};
```

**Better approach:** Configure getUserRole during build:

```javascript
// In subsystem setup
import { createGetUserRole } from './utils/router-security-utils.mycelia.js';

const kernel = messageSystem.getKernel();

subsystem
  .use(useRouter)
  .use(useRouterWithScopes)
  .build({
    config: {
      router: {
        getUserRole: createGetUserRole(kernel),
        debug: true
      }
    }
  });
```

## Complete Integration Flow

### 1. Create Security Profiles

```javascript
// In ProfileRegistrySubsystem setup
const profileRegistry = kernel.find('profile-registry');

// Create student profile
profileRegistry.createProfile('student', {
  'workspace:read': 'r',
  'workspace:create': 'rw',
  'project:read': 'r'
});

// Create teacher profile
profileRegistry.createProfile('teacher', {
  'workspace:read': 'r',
  'workspace:create': 'rw',
  'workspace:delete': 'rw',
  'project:read': 'r',
  'project:create': 'rw',
  'project:delete': 'rw',
  'student:read': 'r'
});
```

### 2. Create Principals with Roles

```javascript
// Create a friend with a role
const accessControl = kernel.getAccessControl();

const studentFriend = accessControl.createFriend('Alice', {
  endpoint: 'ws://alice.example.com',
  role: 'student',  // ← Assign role
  metadata: {
    email: 'alice@example.com'
  }
});

// Create a resource with owner's role
const workspace = subsystem.identity.createResourceIdentity(
  'my-workspace',
  workspaceInstance,
  { role: 'workspace-owner' }
);
```

### 3. Apply Profile to Principal

```javascript
// Apply student profile to Alice's principal
const alicePkr = studentFriend.identity.pkr;
profileRegistry.applyProfileToPrincipal('student', alicePkr);

// This grants Alice read/write permissions based on the student profile
```

### 4. Register Routes with Scopes

```javascript
// Register routes with scope metadata
subsystem.router.registerRoute('workspace://create', async (message, params, options) => {
  // Handler logic
  return { success: true };
}, {
  metadata: {
    required: 'write',  // RWS permission level
    scope: 'workspace:create'  // SecurityProfile scope
  }
});

subsystem.router.registerRoute('workspace://{id}/read', async (message, params, options) => {
  // Handler logic
  return { workspaceId: params.id };
}, {
  metadata: {
    required: 'read',
    scope: 'workspace:read'
  }
});
```

### 5. Send Messages (Scope Check Happens Automatically)

```javascript
// Alice sends a message
await studentFriend.identity.sendProtected(
  new Message('workspace://create', { name: 'My Project' })
);

// Flow:
// 1. kernel.sendProtected(alicePkr, message, options)
// 2. router.route(message, { callerId: alicePkr })
// 3. useRouterWithScopes checks:
//    a. getUserRole(alicePkr) → 'student'
//    b. getProfile('student') → SecurityProfile
//    c. profile.getPermission('workspace:create') → 'rw'
//    d. meetsPermissionRequirement('rw', 'write') → true ✓
// 4. useRouter checks RWS permissions (Layer 2) ✓
// 5. Handler executes ✓
```

## Implementation Checklist

### Phase 1: Core Infrastructure ✓ (Already Exists)
- [x] SecurityProfile class
- [x] ProfileRegistry subsystem
- [x] Principal & PrincipalRegistry
- [x] useRouter with RWS checks
- [x] useRouterWithScopes scaffold

### Phase 2: Bridge Identity and Roles (NEEDED)
- [ ] Add `getRoleForPKR` to PrincipalRegistry
- [ ] Add `setRoleForPKR` to PrincipalRegistry
- [ ] Add `getRole` / `setRole` to createIdentity
- [ ] Update `AccessControlSubsystem.createFriend` to accept role option
- [ ] Update `AccessControlSubsystem.wireSubsystem` to accept role option
- [ ] Create `createGetUserRole` utility function

### Phase 3: Router Integration (NEEDED)
- [ ] Fix `useRouterWithScopes` to use role properly
- [ ] Add getUserRole configuration to subsystem setup
- [ ] Test scope checking flow end-to-end

### Phase 4: Documentation & Examples (NEEDED)
- [ ] Document role-based security model
- [ ] Create example: student/teacher permissions
- [ ] Document best practices for assigning roles

## Code Changes Required

### File 1: `principal-registry.mycelia.js`

Add methods after line 369:

```javascript
  // ---- Role Management ----

  /**
   * Get the role for a principal by PKR
   * @param {PKR} pkr - Principal's Public Key Record
   * @returns {string|null} Role name or null if not set
   */
  getRoleForPKR(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return null;
    }
    
    const principal = this.#byUuid.get(pkr.uuid);
    if (!principal) {
      return null;
    }
    
    return principal.metadata?.role || null;
  }

  /**
   * Set the role for a principal by PKR
   * @param {PKR} pkr - Principal's Public Key Record
   * @param {string} role - Role name
   * @returns {boolean} True if role was set successfully
   */
  setRoleForPKR(pkr, role) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return false;
    }
    
    if (typeof role !== 'string' || !role.trim()) {
      throw new Error('setRoleForPKR: role must be a non-empty string');
    }
    
    const principal = this.#byUuid.get(pkr.uuid);
    if (!principal) {
      return false;
    }
    
    if (!principal.metadata) {
      principal.metadata = {};
    }
    
    principal.metadata.role = role;
    return true;
  }
```

### File 2: `create-identity.mycelia.js`

Add methods before the return statement (around line 330):

```javascript
  /**
   * Get the role for this identity's principal
   * @returns {string|null} Role name or null if not set
   */
  function getRole() {
    return principals.getRoleForPKR(ownerPkr);
  }

  /**
   * Set the role for this identity's principal
   * @param {string} role - Role name
   * @returns {boolean} True if role was set successfully
   */
  function setRole(role) {
    return principals.setRoleForPKR(ownerPkr, role);
  }
```

Then add to return object:

```javascript
  return {
    pkr: ownerPkr,
    // ... existing methods ...
    // Role management
    getRole,
    setRole
  };
```

### File 3: `access-control.subsystem.mycelia.js`

Update `createFriend` method (line 109):

```javascript
  createFriend(name, options = {}) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('AccessControlSubsystem.createFriend: name must be a non-empty string.');
    }

    const { endpoint = null, metadata = {}, sessionKey = null, role = null } = options;

    // Merge role into metadata if provided
    const friendMetadata = { ...metadata };
    if (role) {
      friendMetadata.role = role;
    }

    // 1) Create the Friend object
    const friend = new Friend({
      name,
      endpoint,
      metadata: friendMetadata,
      sessionKey
    });

    // 2) Register a corresponding principal
    const principalsFacet = this.find('principals');
    if (!principalsFacet) {
      throw new Error('AccessControlSubsystem.createFriend: principals facet not found. Ensure usePrincipals hook is used.');
    }
    
    const pkr = principalsFacet.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
      name,
      instance: friend,
      metadata: friendMetadata  // ← Role included here
    });

    // 3) Create friend identity and attach to the Friend instance
    friend.identity = principalsFacet.createFriendIdentity(pkr);

    return friend;
  }
```

Update `wireSubsystem` method (line 161) to accept role:

```javascript
  wireSubsystem(type, subsystemInstance, options = {}) {
    // ... existing validation ...

    const { metadata = {}, role = null } = options;

    // Merge role into metadata if provided
    const subsystemMetadata = { ...metadata };
    if (role) {
      subsystemMetadata.role = role;
    }

    // ... existing code ...

    const pkr = principalsFacet.createPrincipal(type, {
      name,
      instance: subsystemInstance,
      owner,
      metadata: subsystemMetadata  // ← Use merged metadata
    });

    // ... rest of method ...
  }
```

### File 4: `router-security-utils.mycelia.js` (NEW FILE)

Create new file: `src/messages/v2/utils/router-security-utils.mycelia.js`

```javascript
/**
 * Router Security Utilities
 * 
 * Utilities for integrating role-based security with useRouterWithScopes
 */

/**
 * Create a standard getUserRole function for useRouterWithScopes
 * Gets the role from a PKR by looking up the principal in AccessControlSubsystem
 * 
 * @param {Object} kernel - Kernel subsystem instance
 * @returns {Function} getUserRole function: (pkr) => string | null
 * 
 * @example
 * import { createGetUserRole } from './utils/router-security-utils.mycelia.js';
 * 
 * const kernel = messageSystem.getKernel();
 * const getUserRole = createGetUserRole(kernel);
 * 
 * subsystem.use(useRouterWithScopes).build({
 *   config: {
 *     router: {
 *       getUserRole,
 *       debug: true
 *     }
 *   }
 * });
 */
export function createGetUserRole(kernel) {
  if (!kernel) {
    throw new Error('createGetUserRole: kernel is required');
  }

  return function getUserRole(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return null;
    }
    
    try {
      // Get AccessControlSubsystem
      const accessControl = kernel.getAccessControl?.();
      if (!accessControl) {
        console.warn('createGetUserRole: AccessControlSubsystem not found');
        return null;
      }
      
      // Get principals facet
      const principalsFacet = accessControl.find('principals');
      if (!principalsFacet || typeof principalsFacet.getRoleForPKR !== 'function') {
        console.warn('createGetUserRole: principals facet not found or missing getRoleForPKR');
        return null;
      }
      
      // Get role from principal metadata
      return principalsFacet.getRoleForPKR(pkr);
    } catch (error) {
      console.error('createGetUserRole: error getting role:', error);
      return null;
    }
  };
}
```

### File 5: Update exports

Add to `src/messages/v2/index.js`:

```javascript
// Router security utilities
export { createGetUserRole } from './utils/router-security-utils.mycelia.js';
```

## Testing the Integration

```javascript
// 1. Setup kernel with all subsystems
const kernel = messageSystem.getKernel();
const accessControl = kernel.getAccessControl();
const profileRegistry = kernel.find('profile-registry');

// 2. Create security profiles
profileRegistry.createProfile('student', {
  'workspace:read': 'r',
  'workspace:create': 'rw'
});

// 3. Create friend with role
const alice = accessControl.createFriend('Alice', {
  role: 'student'
});

// 4. Apply profile to principal
profileRegistry.applyProfileToPrincipal('student', alice.identity.pkr);

// 5. Setup subsystem with useRouterWithScopes
import { createGetUserRole } from '@mycelia/kernel';

const workspace = new BaseSubsystem('workspace', { ms: messageSystem });
workspace
  .use(useRouter)
  .use(useRouterWithScopes)
  .build();

workspace.ctx.config.router = {
  getUserRole: createGetUserRole(kernel),
  debug: true
};

// 6. Register route with scope
workspace.router.registerRoute('workspace://create', handler, {
  metadata: {
    required: 'write',
    scope: 'workspace:create'
  }
});

// 7. Send message as Alice
await alice.identity.sendProtected(
  new Message('workspace://create', { name: 'Test' })
);
// ✓ Should succeed (student has 'rw' for workspace:create)

// 8. Try unauthorized action
workspace.router.registerRoute('admin://delete', handler, {
  metadata: {
    required: 'write',
    scope: 'admin:delete'
  }
});

await alice.identity.sendProtected(
  new Message('admin://delete', { id: '123' })
);
// ✗ Should fail (student doesn't have admin:delete scope)
```

## Benefits of This Integration

1. **Two-Layer Security:**
   - **Layer 1 (Scopes):** Role-based permissions via SecurityProfile
   - **Layer 2 (RWS):** Fine-grained resource permissions

2. **Flexible:**
   - Roles can be assigned at principal creation or later
   - Profiles can be applied/removed dynamically
   - Works with all principal types (friends, subsystems, resources)

3. **Coherent:**
   - All pieces work together
   - Standard getUserRole function
   - Role stored in principal metadata (single source of truth)

4. **Backward Compatible:**
   - Roles are optional
   - Systems without roles fall back to RWS-only checking
   - Existing code continues to work

## Summary

The solution bridges the gap between identity (PKR/Principal) and roles (SecurityProfile) by:

1. **Storing roles** in Principal metadata
2. **Exposing role access** through PrincipalRegistry and Identity helpers
3. **Providing a standard getUserRole** function for useRouterWithScopes
4. **Supporting role assignment** when creating friends/subsystems

This creates a **coherent security model** where:
- **Identity**: PKR + Principal (who you are)
- **Role**: Stored in metadata (what group you belong to)
- **Profile**: SecurityProfile (what your group can do)
- **Permissions**: RWS (fine-grained access control)
- **Router**: useRouterWithScopes (enforces both role and RWS permissions)

