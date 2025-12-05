# Request Core Implementation

## Overview

The `request-core.mycelia.js` module provides the core implementation for performing request/response operations. It handles temporary route registration, message sending, response waiting, and automatic cleanup. This is the low-level implementation used by `RequestBuilder` to execute requests.

**Key Features:**
- **Route Registration**: Automatically registers temporary reply routes
- **Message Sending**: Sends messages via `identity.sendProtected()`
- **Response Waiting**: Waits for response messages with timeout support
- **Automatic Cleanup**: Cleans up routes and timeouts on completion or error
- **Error Handling**: Comprehensive error handling with proper cleanup
- **Metadata Management**: Sets response metadata on request messages

## Function Signature

### `performRequest(subsystem, handler, message, timeoutOrOptions)`

Perform a request/response operation by registering a temporary route, sending a message, and waiting for a response.

**Signature:**
```javascript
performRequest(subsystem, handler, message, timeoutOrOptions) => Promise<any>
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem instance
- `handler` (Function, required) - Handler function to process the response: `async (responseMessage, params, options) => result`
- `message` (Message, required) - Message to send
- `timeoutOrOptions` (number|Object, optional) - Timeout in milliseconds or options object:
  - If `number`: Timeout in milliseconds (0 = no timeout)
  - If `Object`: Options object with:
    - `timeout` (number, default: `10000`) - Timeout in milliseconds (0 = no timeout)
    - `localReplyPath` (string, optional) - Local path for reply route (auto-generated if not provided)
    - `replyPath` (string, optional) - Full reply path (auto-generated if not provided)
    - `...sendOptions` (Object, optional) - Additional options to pass to `sendProtected()`

**Returns:** `Promise<any>` - Promise that resolves with the result from the handler function

**Throws:**
- `Error` - If router facet is not available
- `Error` - If identity.sendProtected is not available
- `Error` - If route registration fails
- `Error` - If request times out
- `Error` - If message send fails
- `Error` - If handler throws an error

## Implementation Details

### Route Registration

The function registers a temporary route for receiving responses:

```javascript
// Route path format: {subsystemName}/identity/reply/{messageId}
const replyPath = `${nameString}/identity/reply/${messageId}`;
routerFacet.registerRoute(replyPath, wrappedHandler, {
  metadata: { 
    description: `Auto reply route for message ${messageId}` 
  }
});
```

**Route Path Generation:**
- **Local Path**: `identity/reply/{messageId}` (default, can be customized via `localReplyPath`)
- **Full Reply Path**: `{subsystemName}/identity/reply/{messageId}` (default, can be customized via `replyPath`)

The route is registered with the **full reply path** to match incoming response messages.

### Message Metadata

The function sets response metadata on the request message:

```javascript
message.meta.updateMutable({
  responseRequired: true,
  replyPath: 'subsystem://identity/reply/{messageId}'
});
```

This metadata is used by the remote subsystem to know where to send the response.

### Timeout Management

If a timeout is specified (timeout > 0), a timeout timer is set:

```javascript
if (timeout > 0) {
  timeoutId = setTimeout(() => {
    routerFacet.unregisterRoute(replyPath);
    reject(new Error(`Request timed out after ${timeout}ms`));
  }, timeout);
}
```

The timeout is automatically cleared when:
- Response is received
- Send fails
- Handler throws an error

### Cleanup

The function ensures proper cleanup in all scenarios:

1. **On Response**: Route and timeout are cleaned up before handler execution
2. **On Timeout**: Route is unregistered, timeout is cleared
3. **On Send Failure**: Route is unregistered, timeout is cleared
4. **On Handler Error**: Route and timeout are cleaned up before error propagation

## Usage

This function is typically used internally by `RequestBuilder`, but can be used directly:

```javascript
import { performRequest } from './request-core.mycelia.js';

// Direct usage
const result = await performRequest(
  subsystem,
  async (response) => response.getBody(),
  message,
  5000
);
```

## Request Flow

1. **Validation**: Checks for router facet and identity
2. **Options Normalization**: Converts timeout number or options object to normalized options
3. **Path Generation**: Generates local and full reply paths
4. **Metadata Setting**: Sets response metadata on request message
5. **Route Registration**: Registers temporary reply route
6. **Timeout Setup**: Sets up timeout timer (if timeout > 0)
7. **Message Sending**: Sends message via `identity.sendProtected()`
8. **Response Waiting**: Waits for response message to arrive
9. **Handler Execution**: Executes handler with response message
10. **Cleanup**: Unregisters route and clears timeout
11. **Promise Resolution**: Resolves with handler result

## Error Scenarios

### Router Not Available

```javascript
// Error: "performRequest: subsystem requires router facet. Ensure useRouter hook is installed."
```

**Solution:** Install `useRouter` hook before using requests.

### Identity Not Available

```javascript
// Error: "performRequest: subsystem requires identity.sendProtected(). Ensure usePrincipals hook is installed and identity is attached."
```

**Solution:** Install `usePrincipals` hook and ensure identity is attached.

### Route Registration Failure

```javascript
// Error: "performRequest: Failed to register reply route: ..."
```

**Possible Causes:**
- Route already exists (should not happen with unique message IDs)
- Invalid route pattern
- Router not initialized

### Timeout Error

```javascript
// Error: "Request timed out after 5000ms"
```

**Solution:** Increase timeout or check if remote subsystem is responding.

### Send Failure

```javascript
// Error: "performRequest: Failed to send message: ..."
```

**Possible Causes:**
- Message path is invalid
- Target subsystem not found
- Network/communication error
- Identity validation failed

### Handler Error

Errors thrown by the handler function are propagated:

```javascript
const result = await performRequest(
  subsystem,
  async (response) => {
    throw new Error('Handler error');
  },
  message,
  5000
);
// Promise rejects with: Error('Handler error')
```

## Options Reference

### Timeout Options

```javascript
{
  timeout: number  // Timeout in milliseconds (0 = no timeout, default: 10000)
}
```

### Reply Path Options

```javascript
{
  localReplyPath: string,  // Local path for reply route (default: "identity/reply/{messageId}")
  replyPath: string        // Full reply path (default: "{subsystemName}/identity/reply/{messageId}")
}
```

### Send Options

Any additional properties in the options object are passed to `identity.sendProtected()`:

```javascript
{
  timeout: 5000,
  // These are passed to sendProtected
  skipAuth: false,
  customOption: 'value'
}
```

## Reply Path Format

The reply path follows this format:

```
{subsystemName}/identity/reply/{messageId}
```

**Examples:**
- `canvas://identity/reply/msg-123`
- `storage://identity/reply/msg-456`
- `kernel://cache/identity/reply/msg-789` (for child subsystems)

The route is registered with the **full reply path** to match incoming response messages that have the full path format.

## Integration

This function is used by:
- **RequestBuilder**: The `.on()` method calls `performRequest()` to execute requests

## Best Practices

1. **Use RequestBuilder**: Prefer using `RequestBuilder` for a cleaner API
2. **Set Timeouts**: Always set reasonable timeouts to prevent hanging requests
3. **Handle Errors**: Wrap calls in try-catch blocks
4. **Validate Responses**: Check response validity in handler functions
5. **Unique Message IDs**: Ensure message IDs are unique to avoid route conflicts

## See Also

- [useRequests](./USE-REQUESTS.md) - Requests hook documentation
- [RequestBuilder](./REQUEST-BUILDER.md) - Request builder class documentation
- [useRouter](../router/USE-ROUTER.md) - Router hook documentation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [Route Handlers](../../routing/ROUTE-HANDLERS.md) - Route handler function signature





