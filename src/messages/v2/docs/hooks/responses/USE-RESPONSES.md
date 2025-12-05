# useResponses Hook

## Overview

The `useResponses` hook provides helper functions for sending responses in a consistent way. It simplifies the process of replying to request messages with proper correlation and reply path resolution.

**Key Features:**
- **Automatic Correlation**: Automatically correlates responses with original requests using message IDs
- **Reply Path Resolution**: Intelligently resolves reply paths from multiple sources (ResponseManagerSubsystem, metadata, body, config)
- **Error Handling**: Provides separate methods for success and error responses
- **Identity Integration**: Uses `identity.sendProtected()` for secure messaging
- **ResponseManager Integration**: Works seamlessly with ResponseManagerSubsystem for response tracking

## Hook Metadata

```javascript
{
  kind: 'responses',
  overwrite: false,
  required: ['messages'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'responses'` - Unique identifier for this hook
- **`overwrite`**: `false` - Does not allow overwriting existing responses facet
- **`required`**: `['messages']` - Requires messages facet for message creation
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.responses`

## Dependencies

The `useResponses` hook requires:
- **`messages` facet**: For creating response messages (from `useMessages` hook)
- **`identity` with `sendProtected()`**: Must be available at runtime (from `usePrincipals` hook)

**Example:**
```javascript
subsystem
  .use(useMessages)    // Required for messages facet
  .use(usePrincipals)  // Required for identity.sendProtected()
  .use(useResponses)   // Can now use responses
  .build();
```

## Configuration

The hook reads configuration from `ctx.config.responses`:

```javascript
{
  defaultReplyPath: string  // Default reply path if none can be inferred
}
```

### Configuration Options

- **`defaultReplyPath`** (string, optional): Default reply path to use if none can be inferred from the message or ResponseManagerSubsystem.

**Example:**
```javascript
const subsystem = useBase('my-subsystem', { ms: messageSystem })
  .use(useMessages)
  .use(usePrincipals)
  .use(useResponses)
  .withConfig({
    responses: {
      defaultReplyPath: 'my-subsystem://replies'
    }
  })
  .build();
```

## Facet Methods

### `sendResponse(params)`

Send a generic response message with explicit parameters.

**Signature:**
```javascript
sendResponse({
  path: string,
  inReplyTo: string,
  payload: any,
  success?: boolean,
  error?: any,
  options?: Object
}) => Promise<Object>
```

**Parameters:**
- `path` (string, required) - Target path (channel or one-shot reply route)
- `inReplyTo` (string, required) - Correlation ID (usually `originalMessage.getId()`)
- `payload` (any, required) - Response payload
- `success` (boolean, optional, default: `true`) - Whether this is a success response
- `error` (any, optional) - Error payload (for failure / timeout)
- `options` (Object, optional) - Extra `sendProtected()` options

**Returns:** `Promise<Object>` - Result of `sendProtected()`

**Throws:**
- `Error` - If path or inReplyTo is missing
- `Error` - If identity is not available

**Example:**
```javascript
await subsystem.responses.sendResponse({
  path: 'canvas://channel/replies',
  inReplyTo: originalMessage.getId(),
  payload: { result: 'success', data: {...} },
  success: true
});
```

### `replyTo(originalMessage, payload, options)`

Reply to a specific request message with success=true. Automatically resolves the reply path and correlation ID.

**Signature:**
```javascript
replyTo(
  originalMessage: Message,
  payload: any,
  options?: {
    replyPath?: string,
    options?: Object
  }
) => Promise<Object>
```

**Parameters:**
- `originalMessage` (Message, required) - Original request message
- `payload` (any, required) - Response payload
- `options` (Object, optional) - Reply options
  - `replyPath` (string, optional) - Explicit reply path (overrides all other sources)
  - `options` (Object, optional) - Extra `sendProtected()` options

**Returns:** `Promise<Object>` - Result of `sendProtected()`

**Throws:**
- `Error` - If originalMessage is missing
- `Error` - If correlationId cannot be derived
- `Error` - If replyPath cannot be determined

**Example:**
```javascript
// Automatic reply path resolution
await subsystem.responses.replyTo(originalMessage, {
  result: 'success',
  data: { userId: '123', name: 'John' }
});

// With explicit reply path
await subsystem.responses.replyTo(originalMessage, {
  result: 'success'
}, {
  replyPath: 'custom://reply/path'
});
```

### `replyErrorTo(originalMessage, errorPayload, options)`

Reply with an error (success=false). Automatically resolves the reply path and correlation ID.

**Signature:**
```javascript
replyErrorTo(
  originalMessage: Message,
  errorPayload: any,
  options?: {
    replyPath?: string,
    options?: Object
  }
) => Promise<Object>
```

**Parameters:**
- `originalMessage` (Message, required) - Original request message
- `errorPayload` (any, required) - Error payload
- `options` (Object, optional) - Reply options
  - `replyPath` (string, optional) - Explicit reply path (overrides all other sources)
  - `options` (Object, optional) - Extra `sendProtected()` options

**Returns:** `Promise<Object>` - Result of `sendProtected()`

**Throws:**
- `Error` - If originalMessage is missing
- `Error` - If correlationId cannot be derived
- `Error` - If replyPath cannot be determined

**Example:**
```javascript
// Error response
await subsystem.responses.replyErrorTo(originalMessage, {
  code: 'VALIDATION_ERROR',
  message: 'Invalid input provided'
});

// Error response with explicit path
await subsystem.responses.replyErrorTo(originalMessage, {
  code: 'PROCESSING_FAILED',
  message: 'Processing failed'
}, {
  replyPath: 'error://replies'
});
```

### Helper Methods

#### `deriveCorrelationId(originalMessage)`

Derive a correlation ID from an original request message.

**Signature:**
```javascript
deriveCorrelationId(originalMessage: Message) => string|null
```

**Priority Order:**
1. `originalMessage.getId()` (most reliable)
2. `originalMessage.id` (fallback)
3. `meta.getCustomField('correlationId')` (from fixed metadata)
4. `originalMessage.body.correlationId` (from body)
5. `originalMessage.correlationId` (legacy fallback)

**Returns:** Correlation ID string or `null` if not found

#### `deriveReplyPath(originalMessage, subsystem)`

Derive a default reply path from an original request message.

**Signature:**
```javascript
deriveReplyPath(originalMessage: Message, subsystem: BaseSubsystem) => string|null
```

**Priority Order:**
1. **ResponseManagerSubsystem lookup** (PRIMARY) - Query `kernel.getResponseManager().getReplyTo(correlationId)` for stored `replyTo` from `options.responseRequired`
2. **Message fixed metadata** (SECONDARY) - `meta.getCustomField('replyTo')` or `meta.getCustomField('replyPath')`
3. **Message mutable metadata** (SECONDARY) - `meta.getCustomMutableField('replyPath')` or `meta.getCustomMutableField('replyTo')`
4. **Message body** (fallback) - `message.body.replyTo` or `message.body.replyPath`
5. **Configuration default** (lowest priority) - `ctx.config.responses.defaultReplyPath`

**Returns:** Reply path string or `null` if not found

## Reply Path Resolution

The hook intelligently resolves reply paths from multiple sources:

### 1. Explicit Parameter (Highest Priority)

```javascript
// Always used if provided
await subsystem.responses.replyTo(message, payload, {
  replyPath: 'explicit/path'  // ← Used first
});
```

### 2. ResponseManagerSubsystem (Primary)

When a request is sent with `responseRequired`:

```javascript
// Sender:
await identity.sendProtected(requestMessage, {
  responseRequired: {
    replyTo: 'subsystem://replies',  // ← Stored in ResponseManagerSubsystem
    timeout: 5000
  }
});

// Receiver (automatic lookup):
await subsystem.responses.replyTo(message, payload);
// Automatically retrieves 'subsystem://replies' from ResponseManagerSubsystem
```

### 3. Message Metadata (Secondary)

If `replyTo` or `replyPath` is stored in message metadata:

```javascript
// Fixed metadata (set during message creation):
const message = messages.create('path', body, {
  meta: {
    replyTo: 'subsystem://replies'  // ← Stored in fixed metadata
  }
});

// Mutable metadata (set during processing):
message.meta.updateMutable({
  replyPath: 'subsystem://replies'  // ← Stored in mutable metadata
});
```

### 4. Message Body (Fallback)

If `replyTo` or `replyPath` is stored in message body:

```javascript
const message = messages.create('path', {
  replyTo: 'subsystem://replies'  // ← Stored in body
});
```

### 5. Configuration Default (Lowest Priority)

If no other source provides a reply path:

```javascript
// From ctx.config.responses.defaultReplyPath
const subsystem = useBase('my-subsystem', { ms: messageSystem })
  .withConfig({
    responses: {
      defaultReplyPath: 'my-subsystem://replies'  // ← Used as last resort
    }
  })
  .build();
```

## Usage Patterns

### Pattern 1: Simple Success Response

```javascript
// In a route handler
subsystem.registerRoute('user/{id}', async (message, params) => {
  const userId = params.id;
  const user = await getUser(userId);
  
  // Reply with success
  await subsystem.responses.replyTo(message, {
    result: 'success',
    data: { user }
  });
  
  return { processed: true };
});
```

### Pattern 2: Error Response

```javascript
// In a route handler
subsystem.registerRoute('user/{id}', async (message, params) => {
  try {
    const userId = params.id;
    const user = await getUser(userId);
    
    await subsystem.responses.replyTo(message, {
      result: 'success',
      data: { user }
    });
  } catch (error) {
    // Reply with error
    await subsystem.responses.replyErrorTo(message, {
      code: 'USER_NOT_FOUND',
      message: error.message
    });
  }
});
```

### Pattern 3: Explicit Reply Path

```javascript
// When you need to override automatic resolution
await subsystem.responses.replyTo(message, payload, {
  replyPath: 'custom://reply/path'
});
```

### Pattern 4: Generic Response

```javascript
// When you need full control
await subsystem.responses.sendResponse({
  path: 'subsystem://channel/replies',
  inReplyTo: originalMessage.getId(),
  payload: { result: 'success' },
  success: true,
  options: {
    // Additional sendProtected options
  }
});
```

### Pattern 5: Request/Response Flow

```javascript
// Sender: Send request with responseRequired
const requestMessage = subsystem.messages.create('storage://files/read', {
  path: '/data.json'
});

await identity.sendProtected(requestMessage, {
  responseRequired: {
    replyTo: 'my-subsystem://replies',
    timeout: 5000
  }
});

// Receiver: Process request and reply
subsystem.registerRoute('storage://files/read', async (message, params) => {
  const filePath = message.getBody().path;
  const content = await readFile(filePath);
  
  // Reply path automatically resolved from ResponseManagerSubsystem
  await subsystem.responses.replyTo(message, {
    content,
    path: filePath
  });
});
```

## Response Message Format

Response messages are created with:

- **Path**: Resolved from reply path sources (or explicit parameter)
- **Body**: Response payload
- **Metadata**:
  - `inReplyTo`: Correlation ID (from original message ID)
  - `correlationId`: Same as `inReplyTo` (for compatibility)
- **Send Options**:
  - `isResponse: true` - Marks message as a response
  - `success: boolean` - Whether response is successful
  - `error: any` - Error payload (if applicable)

## Integration with ResponseManagerSubsystem

The hook integrates seamlessly with ResponseManagerSubsystem:

1. **Request Registration**: When a request is sent with `responseRequired: { replyTo, timeout }`, it's registered in ResponseManagerSubsystem
2. **Response Lookup**: When replying, the hook queries ResponseManagerSubsystem for the stored `replyTo` path
3. **Response Handling**: The response is sent with `isResponse: true`, which triggers ResponseManagerSubsystem to handle and forward it

This allows automatic reply path resolution without requiring the responding subsystem to know the original caller's identity.

## Error Handling

### Missing Identity

```javascript
try {
  await subsystem.responses.replyTo(message, payload);
} catch (error) {
  // Error: "useResponses: subsystem.identity.sendProtected() is required"
  console.error('Identity not available:', error.message);
}
```

**Solution:** Install `usePrincipals` hook and ensure identity is attached.

### Missing Correlation ID

```javascript
try {
  await subsystem.responses.replyTo(message, payload);
} catch (error) {
  // Error: "responses.replyTo: unable to derive correlationId from originalMessage"
  console.error('Correlation ID missing:', error.message);
}
```

**Solution:** Ensure the original message has a valid ID (use `message.getId()` or set `message.id`).

### Missing Reply Path

```javascript
try {
  await subsystem.responses.replyTo(message, payload);
} catch (error) {
  // Error: "responses.replyTo: replyPath is required and could not be inferred"
  console.error('Reply path missing:', error.message);
}
```

**Solution:** 
- Pass explicit `replyPath` parameter
- Send request with `responseRequired: { replyTo }`
- Store `replyTo`/`replyPath` in message metadata or body
- Set `ctx.config.responses.defaultReplyPath`

## Best Practices

1. **Use `replyTo()` for Most Cases**: Use `replyTo()` for automatic reply path resolution
2. **Use `replyErrorTo()` for Errors**: Use `replyErrorTo()` for error responses
3. **Provide Explicit Path When Needed**: Use explicit `replyPath` parameter when automatic resolution isn't sufficient
4. **Store Reply Path in Request**: When sending requests, use `responseRequired: { replyTo }` to enable automatic resolution
5. **Handle Errors Gracefully**: Always wrap response sending in try-catch blocks
6. **Validate Messages**: Ensure request messages are valid before sending responses

## See Also

- [Responses Guide](../../communication/RESPONSES.md) - Response handling and ResponseManagerSubsystem integration
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [Commands Guide](../../communication/COMMANDS.md) - Command communication patterns
- [Requests Guide](../../communication/REQUESTS.md) - Request/response foundation
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [useMessages](../messages/USE-MESSAGES.md) - Messages hook for message creation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [ResponseManagerSubsystem](../../models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Response manager subsystem documentation
- [MessageMetadata](../../message/MESSAGE-METADATA.md) - Message metadata documentation
- [Kernel Subsystem](../../models/kernel-subsystem/KERNEL-SUBSYSTEM.md) - Kernel subsystem documentation
