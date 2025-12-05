# Response Manager Subsystem

## Overview

The **ResponseManagerSubsystem** is a kernel child subsystem responsible for tracking "response-required" commands. It registers commands that expect responses, handles timeouts by emitting synthetic responses, and validates incoming responses.

**Key Features:**
- **Response Registration**: Register commands that require responses
- **Timeout Handling**: Emit synthetic timeout responses when commands time out
- **Response Validation**: Accept/reject incoming responses based on correlation state
- **Correlation Tracking**: Track pending responses by correlationId and owner PKR
- **Reply Path Lookup**: Retrieve reply paths for pending responses

## What is ResponseManagerSubsystem?

`ResponseManagerSubsystem` is a kernel child subsystem that:
- Tracks commands that require responses (via `responseRequired` option)
- Manages timeouts and emits synthetic timeout responses
- Validates incoming responses before routing
- Provides reply path lookup for response routing

**Architecture:**
```
ResponseManagerSubsystem
├─ Pending Response Registry (correlationId -> PendingResponse)
├─ Owner Index (ownerPkr -> Set<PendingResponse>)
├─ Timeout Management
└─ Response Validation
```

## Constructor

### Signature

```javascript
new ResponseManagerSubsystem(name = 'response-manager', options = {})
```

### Parameters

#### `name` (string, optional)

The subsystem name. Defaults to `'response-manager'`.

**Default:** `'response-manager'`

#### `options` (object, required)

Configuration options for the response manager subsystem.

**Properties:**
- `ms` (MessageSystem, required) - MessageSystem instance
- `config` (object, optional) - Configuration object
- `debug` (boolean, optional) - Enable debug logging

**Example:**
```javascript
const responseManager = new ResponseManagerSubsystem('response-manager', {
  ms: messageSystem,
  debug: true
});
```

## Registration API

### `registerResponseRequiredFor(ownerPkr, message, { replyTo, timeout })`

Register that a given command message requires a response.

**Signature:**
```javascript
registerResponseRequiredFor(ownerPkr, message, { replyTo, timeout }) => PendingResponse
```

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record
- `message` (Message, required) - Command message with a valid id
- `options` (Object, optional) - Response options:
  - `replyTo` (string, required) - Reply-to path for the response
  - `timeout` (number, optional) - Timeout in milliseconds

**Returns:** `PendingResponse` - The created pending response entry

**Throws:**
- `Error` if ownerPkr is missing
- `Error` if message is missing or has no id
- `Error` if replyTo is invalid
- `Error` if entry already exists for correlationId

**Behavior:**
- Creates a `PendingResponse` entry
- Starts timeout timer if timeout is specified
- Indexes by correlationId and ownerPkr
- On timeout, emits synthetic timeout response via kernel

**Example:**
```javascript
const pending = responseManager.registerResponseRequiredFor(
  ownerPkr,
  commandMessage,
  {
    replyTo: 'canvas://channel/replies',
    timeout: 5000
  }
);
```

### `cancel(correlationId)`

Cancel a pending entry by correlationId.

**Signature:**
```javascript
cancel(correlationId) => boolean
```

**Parameters:**
- `correlationId` (string, required) - Correlation ID to cancel

**Returns:** `boolean` - True if entry was found and cancelled, false otherwise

**Throws:**
- `Error` if correlationId is invalid

**Example:**
```javascript
const cancelled = responseManager.cancel('msg-123');
if (cancelled) {
  console.log('Pending response cancelled');
}
```

## Response Handling API

### `handleResponse(message, { correlationId })`

Handle an incoming response message.

**Signature:**
```javascript
handleResponse(message, { correlationId }) => { ok: boolean, pending?: PendingResponse, reason?: string }
```

**Parameters:**
- `message` (Message, required) - Response message
- `options` (Object, optional) - Options:
  - `correlationId` (string, optional) - Explicit correlation ID (overrides message extraction)

**Returns:** `Object` - Result object:
- `ok` (boolean) - True if response was handled successfully
- `pending` (PendingResponse, optional) - Pending entry if ok
- `reason` (string, optional) - Error reason if not ok

**Behavior:**
- Extracts correlationId from message (body, metadata, or direct properties)
- Looks up pending entry by correlationId
- Verifies entry is not already resolved
- Marks entry as resolved and finalizes it
- Clears timeout timer

**Example:**
```javascript
const result = responseManager.handleResponse(responseMessage);
if (result.ok) {
  console.log('Response handled successfully');
} else {
  console.error('Response handling failed:', result.reason);
}
```

### `getReplyTo(correlationId)`

Get the replyTo path for a pending response by correlationId.

**Signature:**
```javascript
getReplyTo(correlationId) => string | null
```

**Parameters:**
- `correlationId` (string, required) - Correlation ID (typically message.id)

**Returns:** `string | null` - Reply-to path or null if not found

**Purpose:** Used by `useResponses` hook to retrieve the replyTo path that was stored when a request was sent with `responseRequired: { replyTo, timeout }`.

**Example:**
```javascript
// When a request was sent with:
await identity.sendProtected(message, {
  responseRequired: { replyTo: 'subsystem://replies', timeout: 5000 }
});

// Later, when replying:
const replyTo = responseManager.getReplyTo(message.getId());
// Returns: 'subsystem://replies'
```

## Introspection

### `listAllPending()`

List all pending responses.

**Signature:**
```javascript
listAllPending() => Array<Object>
```

**Returns:** `Array<Object>` - Array of pending response snapshots

**Example:**
```javascript
const pending = responseManager.listAllPending();
console.log(`Found ${pending.length} pending responses`);
pending.forEach(entry => {
  console.log(`CorrelationId: ${entry.correlationId}, ReplyTo: ${entry.replyTo}`);
});
```

### `listPendingFor(ownerPkr)`

List pending responses for a specific owner.

**Signature:**
```javascript
listPendingFor(ownerPkr) => Array<Object>
```

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `Array<Object>` - Array of pending response snapshots

**Throws:**
- `Error` if ownerPkr is not provided

**Example:**
```javascript
const pending = responseManager.listPendingFor(ownerPkr);
console.log(`Found ${pending.length} pending responses for owner`);
```

### `getStatus()`

Get status information.

**Signature:**
```javascript
getStatus() => Object
```

**Returns:** `Object` - Status object with:
- `count` (number) - Total number of pending responses
- `owners` (number) - Number of unique owners with pending responses

**Example:**
```javascript
const status = responseManager.getStatus();
console.log(`Pending responses: ${status.count}, Owners: ${status.owners}`);
```

## Timeout Handling

When a command with `responseRequired` times out, the `ResponseManagerSubsystem` automatically:

1. **Detects Timeout**: Timeout timer fires for the pending entry
2. **Emits Synthetic Response**: Creates a timeout response message
3. **Sends via Kernel**: Sends the timeout response via `kernel.sendProtected()` with:
   - `isResponse: true`
   - `success: false`
   - `error: { kind: 'timeout', message: '...', timeoutMs: ... }`

**Timeout Response Format:**
```javascript
{
  path: replyTo,  // Original replyTo path
  body: {
    timeout: timeoutMs,
    correlationId: correlationId,
    reason: 'Command timed out',
    inReplyTo: correlationId
  },
  meta: {
    inReplyTo: correlationId
  }
}
```

## Integration with KernelSubsystem

The `ResponseManagerSubsystem` integrates with `KernelSubsystem.sendProtected()`:

1. **Registration**: Kernel calls `registerResponseRequiredFor()` when `responseRequired` is specified
2. **Response Validation**: Kernel calls `handleResponse()` when `isResponse: true` is specified
3. **Timeout Emission**: Subsystem emits synthetic timeout responses via kernel

**Example:**
```javascript
// Send command with responseRequired
await kernel.sendProtected(ownerPkr, commandMessage, {
  responseRequired: {
    replyTo: 'canvas://channel/replies',
    timeout: 5000
  }
});

// ResponseManagerSubsystem registers the pending response
// If timeout occurs, subsystem emits synthetic timeout response
// If response arrives, kernel validates it via handleResponse()
```

## Usage Patterns

### Pattern 1: Register and Handle Response

```javascript
// Register response-required command
const pending = responseManager.registerResponseRequiredFor(
  ownerPkr,
  commandMessage,
  {
    replyTo: 'canvas://channel/replies',
    timeout: 5000
  }
);

// Later, when response arrives
const result = responseManager.handleResponse(responseMessage);
if (result.ok) {
  console.log('Response handled');
}
```

### Pattern 2: Lookup Reply Path

```javascript
// Get reply path for a pending response
const replyTo = responseManager.getReplyTo(correlationId);
if (replyTo) {
  // Send response to this path
  await sendResponse(replyTo, responseData);
}
```

### Pattern 3: Monitor Pending Responses

```javascript
// List all pending responses
const pending = responseManager.listAllPending();
pending.forEach(entry => {
  console.log(`Pending: ${entry.correlationId}, Timeout: ${entry.timeoutMs}ms`);
});

// List pending for specific owner
const ownerPending = responseManager.listPendingFor(ownerPkr);
console.log(`Owner has ${ownerPending.length} pending responses`);
```

## Error Handling

### Duplicate Registration

```javascript
try {
  responseManager.registerResponseRequiredFor(ownerPkr, message1, { replyTo: '...' });
  // Register again with same correlationId - error
  responseManager.registerResponseRequiredFor(ownerPkr, message1, { replyTo: '...' });
} catch (error) {
  // Error: "pending entry already exists for correlationId..."
}
```

### Missing Correlation ID

```javascript
const result = responseManager.handleResponse(responseMessage);
if (!result.ok) {
  // Error: "Unable to derive correlationId from response message"
  console.error(result.reason);
}
```

### Already Resolved

```javascript
// Handle response
responseManager.handleResponse(responseMessage);

// Try to handle again - error
const result = responseManager.handleResponse(responseMessage);
if (!result.ok) {
  // Error: "Pending entry already resolved"
}
```

## Best Practices

1. **Use responseRequired**: Always specify `responseRequired` for commands that need responses
2. **Set Timeouts**: Provide reasonable timeouts to prevent hanging requests
3. **Handle Responses**: Always call `handleResponse()` for incoming responses
4. **Check Status**: Use `getStatus()` to monitor pending responses
5. **Clean Up**: Responses are automatically cleaned up when resolved or timed out

## See Also

- [Pending Response](./PENDING-RESPONSE.md) - PendingResponse class documentation
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem with response management
- [useResponses Hook](../../../hooks/responses/USE-RESPONSES.md) - Hook for sending responses
- [useRequests Hook](../../../hooks/requests/USE-REQUESTS.md) - Hook for request/response operations




