# Route Handlers

## Overview

Route handlers are functions that process messages matched to specific route patterns. They are registered with the router using `registerRoute()` and are executed when a message's path matches the route pattern.

## Handler Function Signature

All route handlers must follow this signature:

```javascript
async (message, params, options) => result
```

### Parameters

#### `message` (Message, required)

The message object being routed. Contains:
- **Path**: The message path used for routing (via `message.getPath()`)
- **Body**: The message payload (via `message.getBody()`)
- **Type**: Message type (command, query, event) (via `message.getType()`)
- **Metadata**: Message metadata (via `message.getMetadata()`)
- **ID**: Unique message identifier (via `message.getId()`)

**Example:**
```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const path = message.getPath();        // 'user/123'
  const body = message.getBody();        // { name: 'John' }
  const type = message.getType();        // 'command'
  const messageId = message.getId();     // 'msg-abc123'
  
  // Process message...
});
```

#### `params` (Object, required)

Extracted route parameters from the message path. For static routes, this is an empty object `{}`. For parameterized routes, this contains the captured values.

**Example - Parameterized Route:**
```javascript
// Route pattern: 'user/{id}/profile/{section}'
// Message path: 'user/123/profile/settings'
// params: { id: '123', section: 'settings' }

subsystem.router.registerRoute('user/{id}/profile/{section}', async (message, params, options) => {
  const userId = params.id;           // '123'
  const section = params.section;     // 'settings'
  
  // Use params to process message...
});
```

**Example - Static Route:**
```javascript
// Route pattern: 'admin/users'
// Message path: 'admin/users'
// params: {}

subsystem.router.registerRoute('admin/users', async (message, params, options) => {
  // params is empty object for static routes
  // Process message...
});
```

#### `options` (Object, required)

Options object passed to the handler. This object is **frozen** to prevent tampering and contains:

- **`callerId`** (Symbol/PKR, optional): The identity of the calling subsystem. Set by the kernel when using `sendProtected()`. This is the caller's Public Key Record (PKR) as a Symbol. **Available to handlers** for logging, auditing, or additional permission checks.
- **Custom options**: Any additional options passed when routing the message (e.g., `skipAuth`, `timeout`, etc.)

**Security Note:** 
- The `options` object is frozen by the MessageSystem to prevent tampering. You cannot modify `callerId` after the message is routed.
- `callerIdSetBy` is **not available** to handlers - it is sanitized before handler execution. It is only used internally by the authentication wrapper for kernel validation.

**Example - Accessing callerId:**
```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  // Check if callerId is present (set by kernel via sendProtected)
  if (options.callerId) {
    const callerIdentity = options.callerId;  // Symbol representing caller's PKR
    
    // Use callerIdentity for logging, auditing, or additional checks
    console.log('Request from caller:', callerIdentity);
    // Note: callerIdSetBy is not available (sanitized before handler execution)
  }
  
  // Process message...
});
```

**Example - Custom Options:**
```javascript
// Route a message with custom options
const message = messageFactory.createCommand('user/123');
await subsystem.router.route(message, { 
  skipAuth: true,
  timeout: 5000 
});

// Handler receives custom options
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const skipAuth = options.skipAuth || false;
  const timeout = options.timeout || 3000;
  
  if (!skipAuth) {
    // Perform authentication...
  }
  
  // Process with timeout...
});
```

### Return Value

Route handlers can return any value. Common patterns include:

- **Result Object**: `{ success: true, data: ... }` or `{ success: false, error: ... }`
- **Plain Object**: `{ userId: '123', name: 'John' }`
- **Primitive Values**: `true`, `'ok'`, `42`
- **Promise**: The handler is already async, but can return a Promise for additional async operations

**Example:**
```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const userId = params.id;
  const body = message.getBody();
  
  // Process user operation
  const user = await getUser(userId);
  
  // Return result object
  return {
    success: true,
    userId,
    user,
    timestamp: Date.now()
  };
});
```

## Handler Execution Flow

1. **Message Routing**: Message is routed to subsystem via MessageSystem
2. **Route Matching**: Router matches message path to registered route pattern
3. **Parameter Extraction**: Route parameters are extracted from the path
4. **Options Preparation**: Options object is prepared with `callerId` (if using `sendProtected`) and any custom options
5. **Options Freezing**: Options object is frozen to prevent tampering
6. **Handler Execution**: Handler is called with `(message, params, options)`
7. **Result Return**: Handler result is returned to the caller

## Security Considerations

### Caller Identity

When using `kernel.sendProtected()`, the kernel sets:
- `options.callerId`: The identity of the calling subsystem (from the provided PKR) - **available to handlers**
- `options.callerIdSetBy`: The kernel's own identity (for verification) - **sanitized before handler execution**

The `callerId` value is **frozen** and cannot be modified by route handlers. This ensures that:
- Caller identity cannot be spoofed
- Handlers can trust the `callerId` value
- Handlers can use `callerId` for logging, auditing, or additional permission checks
- `callerIdSetBy` is only used internally by the authentication wrapper for kernel validation

### Options Freezing

The `options` object is frozen by the MessageSystem before being passed to handlers. This means:
- You cannot modify `callerId`
- You cannot add new properties to the options object
- You can read all properties, but cannot write to them

**Example - Attempting to Modify Options (Will Fail):**
```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  // This will throw an error (options is frozen)
  options.callerId = someOtherIdentity;  // ❌ TypeError: Cannot assign to read only property
  
  // This will also fail
  options.newProperty = 'value';  // ❌ TypeError: Cannot add property newProperty
});
```

## Common Patterns

### Pattern 1: Basic Handler

```javascript
subsystem.router.registerRoute('ping', async (message, params, options) => {
  return { success: true, message: 'pong' };
});
```

### Pattern 2: Parameterized Handler

```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const userId = params.id;
  const body = message.getBody();
  
  const user = await getUser(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  return { success: true, user };
});
```

### Pattern 3: Handler with Caller Identity

```javascript
subsystem.router.registerRoute('admin/*', async (message, params, options) => {
  // Verify caller identity
  if (!options.callerId) {
    return { success: false, error: 'Unauthorized: No caller identity' };
  }
  
  // Use caller identity for logging or additional permission checks
  const callerIdentity = options.callerId;
  // Note: callerIdSetBy is not available (sanitized before handler execution)
  
  // Log admin operation with caller identity
  console.log('Admin operation by:', callerIdentity);
  
  // Process admin operation...
  return { success: true };
});
```

### Pattern 4: Handler with Custom Options

```javascript
subsystem.router.registerRoute('data/process', async (message, params, options) => {
  const timeout = options.timeout || 5000;
  const retryCount = options.retryCount || 0;
  const skipCache = options.skipCache || false;
  
  // Process with custom options...
  return { success: true, processed: true };
});
```

## Error Handling

Route handlers should handle errors appropriately:

```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  try {
    const userId = params.id;
    const user = await getUser(userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { success: true, user };
  } catch (error) {
    // Log error
    console.error('Error processing user request:', error);
    
    // Return error result
    return { 
      success: false, 
      error: error.message,
      code: 'INTERNAL_ERROR'
    };
  }
});
```

## Best Practices

1. **Always Validate Input**: Check that required parameters are present
2. **Handle Errors Gracefully**: Return error results instead of throwing (unless it's a critical error)
3. **Use Caller Identity**: Check `options.callerId` for security-sensitive operations
4. **Document Custom Options**: If your handler expects custom options, document them
5. **Return Consistent Results**: Use a consistent result format (e.g., `{ success: boolean, ... }`)
6. **Don't Modify Options**: Remember that options are frozen - read only
7. **Extract Parameters Early**: Extract route parameters at the start of the handler
8. **Handle Missing Values**: Check for undefined/null values before using them

## See Also

- [useRouter](../hooks/router/USE-ROUTER.md) - Router hook documentation
- [Message](../message/MESSAGE.md) - Message class documentation
- [Kernel Subsystem](../KERNEL-SUBSYSTEM.md) - Kernel subsystem and sendProtected method
- [createIdentity](../security/CREATE-IDENTITY.md) - Identity system for permission checking

