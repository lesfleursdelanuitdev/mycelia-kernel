# Security Integration Complete ✅

## Summary

The security system integration is now complete! All pieces work together to provide a coherent **two-layer security model**:

1. **Layer 1 - Role-Based Scopes** (SecurityProfile + useRouterWithScopes)
2. **Layer 2 - Fine-Grained Permissions** (ReaderWriterSet + useRouter)

## Changes Implemented

### 1. PrincipalRegistry (`principal-registry.mycelia.js`)

Added role management methods:

```javascript
/**
 * Get the role for a principal by PKR
 */
getRoleForPKR(pkr)

/**
 * Set the role for a principal by PKR
 */
setRoleForPKR(pkr, role)
```

**How it works:** Roles are stored in `principal.metadata.role`

### 2. Identity Wrapper (`create-identity.mycelia.js`)

Added role access to identity objects:

```javascript
/**
 * Get the role for this identity's principal
 */
identity.getRole()

/**
 * Set the role for this identity's principal
 */
identity.setRole(role)
```

**Usage:**
```javascript
// Get role
const role = subsystem.identity.getRole(); // → 'student'

// Set role
subsystem.identity.setRole('teacher');
```

### 3. AccessControlSubsystem (`access-control.subsystem.mycelia.js`)

Updated `createFriend` to accept role:

```javascript
createFriend(name, options = {})
// options.role = 'student' | 'teacher' | any role name
```

Updated `wireSubsystem` to accept role:

```javascript
wireSubsystem(type, subsystemInstance, options = {})
// options.role = 'admin' | 'service' | any role name
```

**Usage:**
```javascript
// Create friend with role
const alice = accessControl.createFriend('Alice', {
  role: 'student',
  endpoint: 'ws://alice.example.com'
});

// Wire subsystem with role
accessControl.wireSubsystem('child', mySubsystem, {
  role: 'admin'
});
```

### 4. Router Security Utilities (`router-security-utils.mycelia.js`) ⭐ NEW

Created standard utilities for router security:

```javascript
/**
 * Create getUserRole function for useRouterWithScopes
 */
createGetUserRole(kernel)

/**
 * Create scope mapper for routes without scope metadata
 */
createScopeMapper(mappings)

/**
 * Helper to check role permissions
 */
getRolePermissionForScope(kernel, role, scope)
```

### 5. Exports (`index.js`)

Added exports for router security utilities:

```javascript
export { 
  createGetUserRole, 
  createScopeMapper, 
  getRolePermissionForScope 
} from './utils/router-security-utils.mycelia.js';
```

## Complete Working Example

### Step 1: Create Security Profiles

```javascript
import { MessageSystem, createGetUserRole } from '@mycelia/kernel';

// Bootstrap message system
const messageSystem = new MessageSystem('app', { debug: true });
await messageSystem.bootstrap();

const kernel = messageSystem.getKernel();
const profileRegistry = kernel.find('profile-registry');

// Create student profile
profileRegistry.createProfile('student', {
  'workspace:read': 'r',       // Can read workspaces
  'workspace:create': 'rw',    // Can create workspaces
  'project:read': 'r'          // Can read projects
});

// Create teacher profile
profileRegistry.createProfile('teacher', {
  'workspace:read': 'r',
  'workspace:create': 'rw',
  'workspace:delete': 'rw',    // Can delete workspaces
  'project:read': 'r',
  'project:create': 'rw',      // Can create projects
  'project:delete': 'rw',      // Can delete projects
  'student:read': 'r'          // Can view student info
});

// Create admin profile
profileRegistry.createProfile('admin', {
  'admin:manage': 'rwg',       // Full admin access
  '*': 'rwg'                   // Wildcard: all permissions
});
```

### Step 2: Create Principals with Roles

```javascript
const accessControl = kernel.getAccessControl();

// Create a student friend
const alice = accessControl.createFriend('Alice', {
  role: 'student',
  endpoint: 'ws://alice.example.com',
  metadata: {
    email: 'alice@example.com',
    grade: 10
  }
});

// Create a teacher friend
const bob = accessControl.createFriend('Bob', {
  role: 'teacher',
  endpoint: 'ws://bob.example.com',
  metadata: {
    email: 'bob@example.com',
    department: 'Science'
  }
});

console.log(alice.identity.getRole()); // → 'student'
console.log(bob.identity.getRole());   // → 'teacher'
```

### Step 3: Apply Profiles to Principals

```javascript
// Apply student profile to Alice
profileRegistry.applyProfileToPrincipal('student', alice.identity.pkr);

// Apply teacher profile to Bob
profileRegistry.applyProfileToPrincipal('teacher', bob.identity.pkr);

// Now Alice and Bob have permissions from their profiles applied to their RWS
```

### Step 4: Setup Subsystem with useRouterWithScopes

```javascript
import { 
  BaseSubsystem, 
  useRouter, 
  useRouterWithScopes, 
  createGetUserRole 
} from '@mycelia/kernel';

// Create subsystem
const workspace = new BaseSubsystem('workspace', { 
  ms: messageSystem,
  config: {
    router: {
      getUserRole: createGetUserRole(kernel),  // ← Standard getUserRole function
      debug: true
    }
  }
});

// Install router hooks
workspace
  .use(useRouter)           // Layer 2: RWS checks
  .use(useRouterWithScopes) // Layer 1: Scope checks
  .build();

await messageSystem.registerSubsystem(workspace);
```

### Step 5: Register Routes with Scopes

```javascript
// Register workspace creation route
workspace.router.registerRoute('workspace://create', async (message, params, options) => {
  const { name, description } = message.getPayload();
  
  // Create workspace logic
  const workspaceId = Date.now().toString();
  
  return {
    success: true,
    workspaceId,
    name,
    description,
    createdBy: options.callerId?.uuid
  };
}, {
  metadata: {
    required: 'write',              // Layer 2: RWS permission
    scope: 'workspace:create'       // Layer 1: Profile scope
  }
});

// Register workspace read route
workspace.router.registerRoute('workspace://{id}/read', async (message, params, options) => {
  const { id } = params;
  
  // Read workspace logic
  return {
    success: true,
    workspaceId: id,
    name: 'Sample Workspace',
    readBy: options.callerId?.uuid
  };
}, {
  metadata: {
    required: 'read',
    scope: 'workspace:read'
  }
});

// Register workspace deletion route (teachers only)
workspace.router.registerRoute('workspace://{id}/delete', async (message, params, options) => {
  const { id } = params;
  
  // Delete workspace logic
  return {
    success: true,
    workspaceId: id,
    deletedBy: options.callerId?.uuid
  };
}, {
  metadata: {
    required: 'write',
    scope: 'workspace:delete'       // Only teachers have this scope
  }
});
```

### Step 6: Send Messages (Security Checks Happen Automatically)

```javascript
import { Message } from '@mycelia/kernel';

// ✅ Alice (student) creates a workspace - SHOULD SUCCEED
try {
  const result = await alice.identity.sendProtected(
    new Message('workspace://create', {
      name: 'My Project',
      description: 'Science fair project'
    })
  );
  console.log('✅ Alice created workspace:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// ✅ Bob (teacher) creates a workspace - SHOULD SUCCEED
try {
  const result = await bob.identity.sendProtected(
    new Message('workspace://create', {
      name: 'Class Materials',
      description: 'Science class resources'
    })
  );
  console.log('✅ Bob created workspace:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// ❌ Alice (student) tries to delete - SHOULD FAIL
try {
  const result = await alice.identity.sendProtected(
    new Message('workspace://123/delete', {})
  );
  console.log('✅ Alice deleted workspace:', result);
} catch (error) {
  console.error('❌ Alice denied (expected):', error.message);
  // Error: "Permission denied: scope "workspace:delete" requires "write" permission"
}

// ✅ Bob (teacher) deletes a workspace - SHOULD SUCCEED
try {
  const result = await bob.identity.sendProtected(
    new Message('workspace://123/delete', {})
  );
  console.log('✅ Bob deleted workspace:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}
```

## Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Message Sent                           │
│  alice.identity.sendProtected(message)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         kernel.sendProtected(alicePkr, message)             │
│  • Injects callerId (alicePkr)                             │
│  • Sets callerIdSetBy (kernel PKR)                         │
│  • Routes to messageSystemRouter                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              router.route(message, options)                 │
│  options.callerId = alicePkr                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│      LAYER 1: useRouterWithScopes (Role-Based)             │
│  1. getUserRole(alicePkr) → 'student'                      │
│  2. getProfile('student') → SecurityProfile                │
│  3. profile.getPermission('workspace:create') → 'rw'       │
│  4. meetsRequirement('rw', 'write') → ✓ TRUE              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│       LAYER 2: useRouter (Fine-Grained RWS)                │
│  1. Wrap handler with requireAuth('write')                 │
│  2. Check RWS permissions                                   │
│  3. rws.canWrite(alicePkr) → ✓ TRUE                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Handler Executes                           │
│  handler(message, params, options)                          │
│  → Returns result                                           │
└─────────────────────────────────────────────────────────────┘
```

## Testing the Integration

### Test 1: Role Assignment

```javascript
// Test role storage and retrieval
const alice = accessControl.createFriend('Alice', { role: 'student' });

assert.equal(alice.identity.getRole(), 'student');

// Change role
alice.identity.setRole('teacher');
assert.equal(alice.identity.getRole(), 'teacher');
```

### Test 2: Profile Application

```javascript
// Create profile
profileRegistry.createProfile('test-role', {
  'test:read': 'r',
  'test:write': 'rw'
});

// Apply to principal
const result = profileRegistry.applyProfileToPrincipal('test-role', alice.identity.pkr);
assert.equal(result.success, true);
assert.equal(result.applied, 2); // Two grants applied
```

### Test 3: Scope Checking

```javascript
// Register route with scope
workspace.router.registerRoute('test://action', handler, {
  metadata: {
    required: 'write',
    scope: 'test:write'
  }
});

// Send message as Alice (who has test:write = 'rw')
const result = await alice.identity.sendProtected(
  new Message('test://action', {})
);
assert.equal(result.success, true);
```

### Test 4: Permission Denial

```javascript
// Create a scope Alice doesn't have
workspace.router.registerRoute('admin://action', handler, {
  metadata: {
    required: 'write',
    scope: 'admin:manage'
  }
});

// Try to send - should fail
try {
  await alice.identity.sendProtected(new Message('admin://action', {}));
  assert.fail('Should have thrown permission error');
} catch (error) {
  assert.equal(error.code, 'PERMISSION_DENIED');
  assert.equal(error.scope, 'admin:manage');
}
```

## Benefits of This Integration

### 1. Two-Layer Security

- **Coarse-grained (Roles)**: Group users by role, assign permissions via profiles
- **Fine-grained (RWS)**: Per-resource permission checking

### 2. Flexible Role Management

```javascript
// Roles can be assigned at creation
const user = accessControl.createFriend('User', { role: 'student' });

// Or changed later
user.identity.setRole('teacher');

// Profiles can be applied dynamically
profileRegistry.applyProfileToPrincipal('admin', user.identity.pkr);
```

### 3. Standard getUserRole Function

No need to write custom getUserRole implementations:

```javascript
import { createGetUserRole } from '@mycelia/kernel';

const getUserRole = createGetUserRole(kernel);
// Works with all subsystems, all router configurations
```

### 4. Backward Compatible

- Roles are optional (stored in metadata)
- Systems without roles fall back to RWS-only
- Existing code continues to work
- No breaking changes

### 5. Coherent Architecture

```
Identity (PKR + Principal)
    ↓
Role (metadata.role)
    ↓
Profile (SecurityProfile)
    ↓
Scopes (permission grants)
    ↓
Router (useRouterWithScopes + useRouter)
    ↓
Permissions (RWS checks)
```

## Advanced Usage

### Custom Scope Mappers

```javascript
import { createScopeMapper } from '@mycelia/kernel';

// Map routes to scopes automatically
const scopeMapper = createScopeMapper({
  'workspace://create': 'workspace:create',
  'workspace://{id}/read': 'workspace:read',
  'workspace://{id}/update': 'workspace:write',
  'workspace://{id}/delete': 'workspace:delete',
  'admin/*': 'admin:manage'  // Wildcard pattern
});

// Use in router config
workspace.ctx.config.router.scopeMapper = scopeMapper;
```

### Dynamic Profile Updates

```javascript
// Update profile grants
profileRegistry.updateProfile('student', {
  'newFeature:access': 'rw'  // Add new permission
}, false); // false = merge with existing

// Re-apply to all students
const students = getAllStudents(); // Your function to get student principals
for (const student of students) {
  profileRegistry.applyProfileToPrincipal('student', student.identity.pkr);
}
```

### Role-Based Resource Creation

```javascript
// Create resources with role-based naming
const role = subsystem.identity.getRole();
const resourceName = `${role}-resource-${Date.now()}`;

const resource = subsystem.identity.createResourceIdentity(
  resourceName,
  resourceInstance,
  { role, createdBy: subsystem.identity.pkr.uuid }
);
```

## Troubleshooting

### useRouterWithScopes not working?

**Check:**
1. Is `getUserRole` configured? `workspace.ctx.config.router.getUserRole`
2. Are roles assigned to principals? `principal.identity.getRole()`
3. Are profiles created? `profileRegistry.listProfiles()`
4. Are profiles applied? `profileRegistry.applyProfileToPrincipal()`
5. Do routes have scope metadata? `metadata.scope` and `metadata.required`

### Permissions not working?

**Check:**
1. Layer 1 (Scopes): Does the role have the scope? `profile.getPermission(scope)`
2. Layer 2 (RWS): Does the principal have RWS permissions? `rws.canWrite(pkr)`
3. Are both layers passing? Enable debug: `config.router.debug = true`

### getUserRole returns null?

**Check:**
1. Is kernel available? `createGetUserRole(kernel)`
2. Is AccessControlSubsystem registered? `kernel.getAccessControl()`
3. Does principal have role? `principal.metadata.role`
4. Is principals facet available? `accessControl.find('principals')`

## Next Steps

1. **Create default profiles** for your application (e.g., guest, user, admin)
2. **Assign roles** when creating principals
3. **Apply profiles** to principals based on their roles
4. **Register routes with scopes** using `metadata.scope`
5. **Configure getUserRole** in your subsystem setup
6. **Test security** thoroughly with different roles

## Documentation References

- [Security Integration Solution](./SECURITY-INTEGRATION-SOLUTION.md) - Detailed implementation plan
- [Plugin System Analysis](./PLUGIN-SYSTEM-ANALYSIS.md) - Understanding the hook/facet architecture
- [useRouterWithScopes](./src/messages/v2/hooks/router/use-router-with-scopes.mycelia.js) - Router scope checking
- [SecurityProfile](./src/messages/v2/models/security/security-profile.mycelia.js) - Role-based profiles
- [PrincipalRegistry](./src/messages/v2/models/security/principal-registry.mycelia.js) - Identity management

---

**Status:** ✅ Complete and working!

The security integration is now fully functional. All pieces work together to provide a robust, two-layer security model that's both flexible and easy to use.

