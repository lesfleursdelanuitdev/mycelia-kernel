# Route Metadata

## Overview

Route metadata provides additional information about routes, including descriptions, priorities, and security requirements. Metadata is passed as part of the `routeOptions` parameter when registering routes with `registerRoute()`.

## Metadata Structure

Route metadata is an object that can contain:

- **`required`** (string, optional): Permission type required for the route (`'read'`, `'write'`, or `'grant'`)
- **`scope`** (string, optional): Permission scope identifier for scope-based checking (e.g., `'workspace:create'`). Used with `useRouterWithScopes` hook.
- **`description`** (string, optional): Human-readable description of the route
- **`priority`** (number, optional): Route priority for matching (default: `0`)
- **Custom properties**: Any additional metadata you want to attach to the route

## Required Permission

The `required` property specifies what permission is needed to execute the route handler. This enables automatic permission checking when the subsystem has an identity attached via the `usePrincipals` hook.

### Permission Types

- **`'read'`**: Requires read permission on the identity's PKR
- **`'write'`**: Requires write permission on the identity's PKR
- **`'grant'`**: Requires grant permission on the identity's PKR

### How It Works

When a route is matched via `router.match()` or `router.route()`, the router checks if:
1. The route's `metadata.required` field specifies a permission type
2. The subsystem has an `identity` attached (via `usePrincipals`)
3. The routing `options` contain `callerId` and `callerIdSetBy` (set by kernel via `sendProtected()`)

If all conditions are met, the handler is automatically wrapped with the appropriate permission check using `subsystem.identity.requireAuth(required, handler, options)`. The wrapped handler will:
- **Validate kernel identity**: First validates that `options.callerIdSetBy` is a kernel (ensures callerId was set by a trusted kernel)
- **Check permissions**: Checks if `options.callerId` has the required permission on the identity's PKR
- **Throw error**: Throws a `Permission denied` error if `callerIdSetBy` is not a kernel, or if the permission is not available
- **Execute handler**: Executes the handler normally if all checks pass

**Important Notes:**
- Permission checks use `options.callerId` (the caller's PKR) to check permissions, not the owner's PKR
- `options.callerIdSetBy` must be a kernel PKR (validated via `rws.isKernel()`) - used internally for kernel validation
- `callerId` is set by the kernel via `sendProtected()` and is **available to handlers** for logging, auditing, or additional checks
- `callerIdSetBy` is set by the kernel via `sendProtected()` but is **sanitized before handlers receive options** (only used internally for kernel validation)
- If no identity is attached, no `required` permission is specified, or `callerId`/`callerIdSetBy` are missing, the handler is returned as-is without permission checks

### Example - Protected Route with Write Permission

```javascript
// Register route with required 'write' permission
subsystem.router.registerRoute('user/{id}/update', async (message, params, options) => {
  // This handler will only execute if identity has 'write' permission
  const userId = params.id;
  const body = message.getBody();
  
  // Update user (only if write permission is available)
  return { success: true, userId, updated: true };
}, {
  metadata: { required: 'write' }
});
```

### Example - Protected Route with Read Permission

```javascript
// Register route with required 'read' permission
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  // This handler will only execute if identity has 'read' permission
  const userId = params.id;
  const user = await getUser(userId);
  
  return { success: true, user };
}, {
  metadata: { required: 'read' }
});
```

### Example - Protected Route with Scope

```javascript
// Register route with scope-based permission checking (requires useRouterWithScopes)
subsystem.router.registerRoute('workspace://create', async (message, params, options) => {
  // Handler will check scope permission before RWS check
  return { success: true };
}, {
  metadata: {
    required: 'write',           // RWS check (Layer 2)
    scope: 'workspace:create'     // Scope check (Layer 1)
  }
});
```

### Example - Protected Route with Grant Permission

```javascript
// Register route with required 'grant' permission
subsystem.router.registerRoute('admin/permissions/grant', async (message, params, options) => {
  // This handler will only execute if identity has 'grant' permission
  const body = message.getBody();
  
  // Grant permissions (only if grant permission is available)
  return { success: true, granted: true };
}, {
  metadata: { required: 'grant' }
});
```

### Example - Unprotected Route

```javascript
// Register route without required permission (no authentication check)
subsystem.router.registerRoute('public/info', async (message, params, options) => {
  // This handler executes without permission checks
  return { success: true, info: 'Public information' };
}, {
  metadata: { description: 'Public information endpoint' }
  // No 'required' property = no permission check
});
```

## Complete Metadata Example

```javascript
subsystem.router.registerRoute('user/{id}/profile', async (message, params, options) => {
  // Handler implementation
}, {
  priority: 10,
  description: 'User profile operations',
  metadata: {
    required: 'read',           // Requires read permission
    version: '1.0',             // Custom metadata
    category: 'user-management' // Custom metadata
  }
});
```

## Integration with Identity System

Route metadata's `required` property integrates with the identity system:

1. **Identity Attachment**: The subsystem must have an `identity` attached via `usePrincipals` hook
2. **Permission Checking**: The router automatically wraps handlers with permission checks
3. **Error Handling**: If permission is not available, the handler throws a `Permission denied` error

### Example - Full Integration

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { usePrincipals } from './hooks/principals/use-principals.mycelia.js';
import { useRouter } from './hooks/router/use-router.mycelia.js';

// Create subsystem with identity and router
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

subsystem
  .use(usePrincipals)  // Attaches identity
  .use(useRouter)       // Attaches router
  .build();

// Register protected route
subsystem.router.registerRoute('user/{id}/update', async (message, params, options) => {
  // Handler will check for 'write' permission before executing
  // Note: options.callerId is available, but callerIdSetBy is sanitized
  const callerId = options.callerId;  // Available for logging/auditing
  return { success: true };
}, {
  metadata: { required: 'write' }
});

// Send protected message via kernel
const callerPkr = callerSubsystem.identity.pkr;
const result = await kernel.sendProtected(
  callerPkr,
  new Message('my-subsystem://user/123/update', { name: 'John' })
);

// Flow:
// 1. Kernel sets callerId and callerIdSetBy in options
// 2. Router matches route and wraps handler with requireAuth('write', handler, options)
// 3. requireAuth validates callerIdSetBy is a kernel
// 4. requireAuth checks if callerId has 'write' permission
// 5. If checks pass, handler executes with sanitized options (callerId available, callerIdSetBy removed)
```

## Permission Checking Flow

1. **Route Registration**: Route is registered with `metadata.required` set to a permission type
2. **Message Routing**: Message is routed with options containing `callerId` and `callerIdSetBy` (set by kernel via `sendProtected()`)
3. **Route Matching**: When `router.match()` or `router.route()` is called, it matches the path to the route
4. **Identity Check**: Router checks if subsystem has an `identity` attached
5. **Permission Wrapping**: If identity exists, `required` is set, and options contain `callerId`/`callerIdSetBy`, handler is wrapped with `identity.requireAuth(required, handler, options)`
6. **Kernel Validation**: `requireAuth` validates that `options.callerIdSetBy` is a kernel (security check)
7. **Permission Check**: Wrapped handler checks if `options.callerId` has the required permission on the identity's PKR
8. **Options Sanitization**: `callerIdSetBy` is stripped from options before passing to handler (callerId remains available)
9. **Handler Execution**: Handler receives sanitized options (with `callerId` available, `callerIdSetBy` removed) and executes
10. **Permission Denied**: If `callerIdSetBy` is not a kernel or permission is not available, a `Permission denied` error is thrown
11. **Permission Granted**: If all checks pass, handler executes normally

## Best Practices

1. **Use Appropriate Permissions**: Choose the minimum permission level needed (`read` < `write` < `grant`)
2. **Use Scopes for Fine-Grained Control**: Use `scope` metadata with `useRouterWithScopes` for role-based permission checking
3. **Document Protected Routes**: Add descriptions to protected routes explaining why they need specific permissions
4. **Handle Permission Errors**: Always catch permission errors when executing protected handlers
4. **Test Permission Checks**: Test that permission checks work correctly with different identity configurations
5. **Use Consistent Patterns**: Use the same permission level for similar operations across your system
6. **Use sendProtected**: Always use `kernel.sendProtected()` to send messages to protected routes (sets `callerId` and `callerIdSetBy`)
7. **Use callerId for Logging**: Handlers receive `callerId` in options - use it for logging, auditing, or additional permission checks
8. **Don't Access callerIdSetBy**: Handlers do not receive `callerIdSetBy` (it's sanitized) - it's only used internally for kernel validation
9. **Trust the Kernel**: The kernel validation ensures only trusted kernels can set caller identity

## Error Handling

When a protected route handler is executed, it may throw errors for several reasons:

### Permission Denied Errors

```javascript
try {
  const match = subsystem.router.match('user/123/update');
  if (match) {
    // Options must contain callerId and callerIdSetBy (set by kernel via sendProtected)
    const result = await match.handler(message, match.params, options);
  }
} catch (error) {
  if (error.message.includes('Permission denied')) {
    // Could be:
    // - "Permission denied: callerIdSetBy is not a kernel"
    // - "Permission denied: read access required"
    // - "Permission denied: write access required"
    // - "Permission denied: grant access required"
    console.error('Access denied:', error.message);
  } else {
    // Handle other errors
    console.error('Error:', error);
  }
}
```

### Error Types

1. **Kernel Validation Error**: `"Permission denied: callerIdSetBy is not a kernel"`
   - Occurs when `callerIdSetBy` is not a kernel PKR
   - Indicates the callerId was not set by a trusted kernel
   - **Solution**: Ensure messages are sent via `kernel.sendProtected()`

2. **Permission Check Error**: `"Permission denied: [read|write|grant] access required"`
   - Occurs when `callerId` doesn't have the required permission
   - Indicates the caller lacks the necessary permission on the identity's PKR
   - **Solution**: Grant the required permission to the caller's PKR

3. **Missing Identity Error**: Handler executes without permission checks
   - Occurs when no identity is attached or `callerId`/`callerIdSetBy` are missing
   - Handler is returned as-is (no wrapping)
   - **Solution**: Ensure identity is attached and messages are sent via `sendProtected()`

## Security Considerations

### Permission Levels

- **Read**: Use for operations that only read data (queries, GET operations)
- **Write**: Use for operations that modify data (updates, creates, deletes)
- **Grant**: Use for operations that change permissions (granting/revoking access)

### Identity Requirements

- Protected routes require an identity to be attached to the subsystem
- If no identity is attached, protected routes will not have permission checks
- Always ensure identity is attached before registering protected routes

### Permission Verification

- **Kernel Validation**: `requireAuth` first validates that `options.callerIdSetBy` is a kernel using `rws.isKernel()`
- **Permission Check**: Permissions are checked using `options.callerId` (the caller's PKR) against the identity's PKR using the ReaderWriterSet
- **Timing**: Both kernel validation and permission checks happen before handler execution
- **Error Handling**: Errors are thrown synchronously, preventing handler execution
- **Options Sanitization**: `callerIdSetBy` is removed from options before handlers receive them (callerId remains available)

### Caller Identity Flow

Protected routes require caller identity to be set by the kernel:

1. **Message Sending**: A subsystem calls `kernel.sendProtected(callerPkr, message, options)`
2. **Kernel Sets Identity**: Kernel sets `options.callerId = callerPkr` and `options.callerIdSetBy = kernel.identity.pkr`
3. **Message Routing**: Message is routed with these protected options
4. **Route Matching**: Router matches the route and wraps handler if `metadata.required` is set
5. **Permission Validation**: `requireAuth` validates `callerIdSetBy` is a kernel and checks `callerId` permissions
6. **Options Sanitization**: `callerIdSetBy` is stripped before handler execution (callerId remains available)
7. **Handler Execution**: Handler receives sanitized options with `callerId` available (for logging/auditing) but without `callerIdSetBy`

## See Also

- [Route Handlers](./ROUTE-HANDLERS.md) - Route handler function signature and options
- [useRouter](../hooks/router/USE-ROUTER.md) - Router hook documentation
- [useRouterWithScopes](../hooks/router/USE-ROUTER-WITH-SCOPES.md) - Enhanced router with scope-based permission checking
- [usePrincipals](../hooks/principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [Kernel Subsystem](../KERNEL-SUBSYSTEM.md) - Kernel subsystem and sendProtected method
- [createIdentity](../security/CREATE-IDENTITY.md) - Identity creation and permission checking
- [ReaderWriterSet](../security/READER-WRITER-SET.md) - Fine-grained access control

