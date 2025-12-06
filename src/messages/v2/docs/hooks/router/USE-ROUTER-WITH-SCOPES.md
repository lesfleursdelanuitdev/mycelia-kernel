# useRouterWithScopes Hook

## Overview

The **useRouterWithScopes** hook extends `useRouter` to add scope-based permission checking on top of Mycelia's built-in RWS (ReaderWriterSet) checks. This provides a two-layer security model:

1. **Layer 1 (Scope Check)**: Validates Security Profile scopes before handler execution
2. **Layer 2 (RWS Check)**: Validates RWS permissions (Mycelia's built-in check)

## Key Features

- ✅ **Flexible Scope Mapping**: Supports any user-defined scope names
- ✅ **Security Profile Integration**: Automatically integrates with ProfileRegistrySubsystem
- ✅ **Backward Compatible**: Routes without scopes fall back to RWS-only checking
- ✅ **Configurable**: Apps provide their own scope mapping and user role resolution
- ✅ **Two-Layer Security**: Scope check + RWS check = defense in depth

## Installation

```javascript
import { useRouter, useRouterWithScopes } from 'mycelia-kernel-v2';

subsystem
  .use(useRouter)              // Mycelia core hook (required)
  .use(useRouterWithScopes)    // Enhanced router with scope checking
  .build();
```

## Configuration

The hook requires configuration to work:

```javascript
subsystem.use(useRouterWithScopes, {
  config: {
    router: {
      // Function to map route path to permission scope
      // If not provided, uses metadata.scope from route registration
      scopeMapper: (routePath) => {
        // Example: 'workspace://create' → 'workspace:create'
        if (routePath === 'workspace://create') return 'workspace:create';
        if (routePath.startsWith('workspace://') && routePath.endsWith('/read')) {
          return 'workspace:read';
        }
        return null; // No scope mapping
      },
      
      // Function to get user role from PKR
      // REQUIRED for scope checking to work
      getUserRole: (callerPkr) => {
        // Example: Look up user role from PKR mapping
        const userInfo = userPkrMapping.getUserFromPkr(callerPkr);
        return userInfo?.role || null;
      },
      
      // Enable debug logging
      debug: process.env.NODE_ENV === 'development'
    }
  }
});
```

## Usage

### Register Route with Scope

```javascript
// Register route with scope in metadata
subsystem.router.registerRoute('workspace://create', async (message, params, options) => {
  // Handler implementation
  return { success: true };
}, {
  metadata: {
    required: 'write',           // RWS check (Layer 2)
    scope: 'workspace:create'     // Scope check (Layer 1)
  }
});
```

### Using Scope Mapper

If you prefer to define scope mappings centrally:

```javascript
// Define route-to-scope mapping
const ROUTE_SCOPE_MAPPING = {
  'workspace://create': 'workspace:create',
  'workspace://{id}/read': 'workspace:read',
  'workspace://{id}/update': 'workspace:manage',
};

// Configure scope mapper
subsystem.use(useRouterWithScopes, {
  config: {
    router: {
      scopeMapper: (routePath) => {
        // Try exact match
        if (ROUTE_SCOPE_MAPPING[routePath]) {
          return ROUTE_SCOPE_MAPPING[routePath];
        }
        
        // Try pattern matching
        for (const [pattern, scope] of Object.entries(ROUTE_SCOPE_MAPPING)) {
          if (matchPattern(pattern, routePath)) {
            return scope;
          }
        }
        
        return null;
      },
      getUserRole: (pkr) => getUserRoleFromPkr(pkr)
    }
  }
});

// Register route (scope will be resolved via scopeMapper)
subsystem.router.registerRoute('workspace://create', handler, {
  metadata: {
    required: 'write'
    // scope will be resolved from scopeMapper
  }
});
```

## How It Works

### Permission Flow

```
Message Arrives with callerId (PKR)
    │
    ▼
┌─────────────────────────────────────┐
│ Layer 1: Scope Check                │
│ - Get scope from route metadata     │
│   or scopeMapper function           │
│ - Get user role from PKR             │
│ - Get Security Profile for role     │
│ - Check if profile has scope with    │
│   required permission level          │
│ - If NO: Deny (throw error)         │
│ - If YES: Continue                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Layer 2: RWS Check (Mycelia Core)   │
│ - Check if caller has required      │
│   permission on subsystem's RWS      │
│ - Uses identity.requireAuth()       │
│ - If NO: Deny (throw error)         │
│ - If YES: Execute handler           │
└─────────────────────────────────────┘
    │
    ▼
Handler Executes
```

### Permission Hierarchy

Scopes use permission levels that map to required permissions:

- **'r'** (read) → satisfies `'read'` requirement
- **'rw'** (read/write) → satisfies `'read'` and `'write'` requirements
- **'rwg'** (read/write/grant) → satisfies `'read'`, `'write'`, and `'grant'` requirements

**Example:**
- Route requires: `'write'`
- Profile has: `'rw'` for scope `'workspace:create'`
- Result: ✅ **Allowed** (rw >= write)

## Security Profile Setup

Security Profiles must be registered with ProfileRegistrySubsystem:

```javascript
import { SecurityProfile } from 'mycelia-kernel-v2';

// Create profile
const studentProfile = new SecurityProfile('student', {
  'workspace:read': 'r',
  'workspace:create': null,  // Not allowed
  'whiteboard:draw': 'rw',
  'whiteboard:create': null, // Not allowed
});

// Register profile
const profilesFacet = profileRegistry.find('profiles');
await profilesFacet.createProfile('student', studentProfile);

// Apply profile to user's principal PKR
await profilesFacet.applyProfileToPrincipal('student', userPkr);
```

## Error Handling

### Permission Denied

If scope check fails, an error is thrown:

```javascript
try {
  await subsystem.router.route(message, { callerId: userPkr });
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    console.error(`Permission denied: scope="${error.scope}" requires="${error.required}"`);
  }
}
```

### Missing Configuration

If `getUserRole` is not provided, scope checking is disabled and a warning is logged:

```
useRouterWithScopes: getUserRole function not provided in config. Scope checking will be disabled.
```

Routes will still work but will only use RWS checks (Layer 2).

## Backward Compatibility

Routes without scope metadata work normally:

```javascript
// Route without scope - only RWS check (Layer 2)
subsystem.router.registerRoute('api://public/status', handler, {
  metadata: {
    required: 'read'
    // No scope - falls back to RWS-only checking
  }
});
```

## Best Practices

1. **Centralize Scope Mappings**: Use a `scopeMapper` function for consistent mapping
2. **Store User Roles**: Maintain PKR → user role mapping (e.g., in memory or database)
3. **Apply Profiles on Login**: Apply Security Profiles to user PKRs when they log in
4. **Use Descriptive Scopes**: Use clear scope names like `'workspace:create'` instead of `'create'`
5. **Test Both Layers**: Test scope checking and RWS checking independently

## Examples

### Example 1: Simple Scope Mapping

```javascript
subsystem.use(useRouterWithScopes, {
  config: {
    router: {
      getUserRole: (pkr) => {
        // Simple lookup
        return userRoleMap.get(pkr.uuid) || null;
      }
    }
  }
});

// Register route with explicit scope
subsystem.router.registerRoute('workspace://create', handler, {
  metadata: {
    required: 'write',
    scope: 'workspace:create'
  }
});
```

### Example 2: Pattern-Based Scope Mapping

```javascript
const scopeMapping = {
  'workspace://create': 'workspace:create',
  'workspace://{id}/read': 'workspace:read',
  'workspace://{id}/update': 'workspace:manage',
};

subsystem.use(useRouterWithScopes, {
  config: {
    router: {
      scopeMapper: (path) => {
        // Pattern matching logic
        for (const [pattern, scope] of Object.entries(scopeMapping)) {
          if (matchesPattern(pattern, path)) {
            return scope;
          }
        }
        return null;
      },
      getUserRole: getUserRoleFromPkr
    }
  }
});
```

### Example 3: Integration with AuthSubsystem

```javascript
// Store PKR → role mapping on login
function handleLogin(user, friend) {
  const userPkr = friend.identity.pkr;
  userRoleMap.set(userPkr.uuid, user.role);
  
  // Apply Security Profile
  const profilesFacet = kernel.find('hierarchy').getChild('profile-registry').find('profiles');
  profilesFacet.applyProfileToPrincipal(user.role, userPkr);
}

// Configure router
subsystem.use(useRouterWithScopes, {
  config: {
    router: {
      getUserRole: (pkr) => userRoleMap.get(pkr.uuid) || null
    }
  }
});
```

## Related Documentation

- [useRouter](./USE-ROUTER.md) - Base router hook
- [Security Profiles](../security/README.md) - Security Profile system
- [ReaderWriterSet](../security/READER-WRITER-SET.md) - RWS permission model
- [Route Metadata](./ROUTE-METADATA.md) - Route metadata structure


