# ResponseBuilder Class

## Overview

The `ResponseBuilder` class provides a fluent interface for building and sending response messages. It enables subsystems to construct responses with status, data, and metadata, then send them to the kernel's ResponseManager for forwarding to the original caller.

**Key Features:**
- **Fluent API**: Chain response configuration with builder methods
- **Status Management**: Set response status (ok, error, or custom)
- **Data Payload**: Attach any data to the response
- **Metadata Support**: Add custom metadata for debugging and tracing
- **Error Normalization**: Automatically normalizes error objects, Error instances, and primitives
- **Message Building**: Builds complete Message instances ready to send
- **Static Helpers**: Convenience static methods for one-shot responses

## Class Definition

```javascript
class ResponseBuilder {
  constructor({ subsystem, request })
  withStatus(status) => ResponseBuilder
  withData(data) => ResponseBuilder
  withMeta(meta) => ResponseBuilder
  ok(data) => ResponseBuilder
  error(errorLike) => ResponseBuilder
  buildPayload() => Object
  buildMessage() => Message
  send(options) => Promise<any>
  
  static for(subsystem, request) => ResponseBuilder
  static ok(subsystem, request, data, options) => Promise<any>
  static error(subsystem, request, errorLike, options) => Promise<any>
}
```

## Constructor

### `ResponseBuilder({ subsystem, request })`

Create a new ResponseBuilder instance.

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem sending the response
- `request` (Message, required) - Original request message

**Throws:**
- `Error` - If subsystem is missing
- `Error` - If request is missing

**Example:**
```javascript
const builder = new ResponseBuilder({ 
  subsystem: mySubsystem, 
  request: requestMessage 
});
```

## Instance Methods

### `withStatus(status)`

Set explicit status string.

**Signature:**
```javascript
withStatus(status) => ResponseBuilder
```

**Parameters:**
- `status` (string, required) - Status string (e.g., 'ok', 'error', 'pending')

**Returns:** `ResponseBuilder` - This builder instance for chaining

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .withStatus('ok')
  .withData({ result: 'success' });
```

### `withData(data)`

Set data payload.

**Signature:**
```javascript
withData(data) => ResponseBuilder
```

**Parameters:**
- `data` (any, required) - Response data payload

**Returns:** `ResponseBuilder` - This builder instance for chaining

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .withData({ userId: '123', name: 'John' });
```

### `withMeta(meta)`

Merge additional meta into response.meta (not required for kernel; mostly for debugging / tracing).

**Signature:**
```javascript
withMeta(meta) => ResponseBuilder
```

**Parameters:**
- `meta` (Object, required) - Additional metadata to merge

**Returns:** `ResponseBuilder` - This builder instance for chaining

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .withMeta({ traceId: 'abc123', debug: true });
```

### `ok(data)`

Convenience: mark response as ok and attach data.

**Signature:**
```javascript
ok(data) => ResponseBuilder
```

**Parameters:**
- `data` (any, required) - Response data payload

**Returns:** `ResponseBuilder` - This builder instance for chaining

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .ok({ result: 'success', data: { ... } });
```

### `error(errorLike)`

Convenience: mark response as error and normalize error payload.

**Signature:**
```javascript
error(errorLike) => ResponseBuilder
```

**Parameters:**
- `errorLike` (any, required) - Error object, Error instance, or error-like value

**Returns:** `ResponseBuilder` - This builder instance for chaining

**Example:**
```javascript
// With Error instance
const builder = ResponseBuilder.for(subsystem, request)
  .error(new Error('Something went wrong'));

// With error object
const builder = ResponseBuilder.for(subsystem, request)
  .error({ code: 'INVALID_INPUT', message: 'Invalid input provided' });
```

### `buildPayload()`

Build the response payload (body of the Message).

**Signature:**
```javascript
buildPayload() => Object
```

**Returns:** `Object` - Response payload with status, data, and originalMessageId

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .ok({ result: 'success' });

const payload = builder.buildPayload();
// { status: 'ok', data: { result: 'success' }, originalMessageId: 'msg-123' }
```

### `buildMessage()`

Build the Message instance to send to the kernel ResponseManager.

**Signature:**
```javascript
buildMessage() => Message
```

**Returns:** `Message` - Response message ready to send

**Message Details:**
- **Path**: `kernel://response/receive`
- **Body**: Response payload (from `buildPayload()`)
- **Metadata**:
  - `isResponse: true`
  - `originalMessageId: string` - ID of the original request
  - `requestPath: string` - Path of the original request message
  - Custom metadata (from `withMeta()`)

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .ok({ result: 'success' });

const message = builder.buildMessage();
// Message with path 'kernel://response/receive' and response payload
```

### `send(options)`

Send the response via `subsystem.identity.sendProtected()`.

**Signature:**
```javascript
send(options = {}) => Promise<any>
```

**Parameters:**
- `options` (Object, optional) - Options passed through to `identity.sendProtected()`

**Returns:** `Promise<any>` - Result of `sendProtected()`

**Throws:**
- `Error` - If identity or sendProtected is not available

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .ok({ result: 'success' });

await builder.send();

// With options
await builder.send({ skipAuth: false });
```

## Static Methods

### `ResponseBuilder.for(subsystem, request)`

Factory: create a builder for this subsystem + request.

**Signature:**
```javascript
static for(subsystem, request) => ResponseBuilder
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem instance
- `request` (Message, required) - Original request message

**Returns:** `ResponseBuilder` - New ResponseBuilder instance

**Example:**
```javascript
const builder = ResponseBuilder.for(subsystem, requestMessage);
```

### `ResponseBuilder.ok(subsystem, request, data, options)`

One-shot OK response.

**Signature:**
```javascript
static ok(subsystem, request, data, options = {}) => Promise<any>
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem instance
- `request` (Message, required) - Original request message
- `data` (any, required) - Response data payload
- `options` (Object, optional) - Options passed to `sendProtected()`

**Returns:** `Promise<any>` - Result of `sendProtected()`

**Example:**
```javascript
await ResponseBuilder.ok(subsystem, requestMessage, { result: 'success' });
```

### `ResponseBuilder.error(subsystem, request, errorLike, options)`

One-shot ERROR response.

**Signature:**
```javascript
static error(subsystem, request, errorLike, options = {}) => Promise<any>
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem instance
- `request` (Message, required) - Original request message
- `errorLike` (any, required) - Error object, Error instance, or error-like value
- `options` (Object, optional) - Options passed to `sendProtected()`

**Returns:** `Promise<any>` - Result of `sendProtected()`

**Example:**
```javascript
await ResponseBuilder.error(subsystem, requestMessage, new Error('Failed'));
```

## Response Payload Format

The response payload follows this structure:

```javascript
{
  status: 'ok' | 'error' | string,  // Response status
  data: any,                         // Response data or error details
  originalMessageId: string          // ID of the original request message
}
```

**OK Response:**
```javascript
{
  status: 'ok',
  data: { userId: '123', name: 'John' },
  originalMessageId: 'msg-abc123'
}
```

**Error Response:**
```javascript
{
  status: 'error',
  data: {
    name: 'Error',
    message: 'Processing failed',
    stack: '...'
  },
  originalMessageId: 'msg-abc123'
}
```

## Error Normalization

The `error()` method automatically normalizes error-like values:

### Error Instance

```javascript
builder.error(new Error('Failed'));
// Normalized to: { name: 'Error', message: 'Failed', stack: '...' }
```

### Error Object

```javascript
builder.error({ code: 'INVALID', message: 'Invalid input' });
// Normalized to: { code: 'INVALID', message: 'Invalid input' }
```

### Primitive

```javascript
builder.error('Something went wrong');
// Normalized to: { message: 'Something went wrong' }
```

## Usage Patterns

### Pattern 1: Fluent Builder

```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .withStatus('ok')
  .withData({ result: 'success', data: {...} })
  .withMeta({ traceId: 'abc123' });

await builder.send();
```

### Pattern 2: Convenience Methods

```javascript
// OK response
const builder = ResponseBuilder.for(subsystem, request)
  .ok({ result: 'success' });
await builder.send();

// Error response
const builder = ResponseBuilder.for(subsystem, request)
  .error(new Error('Failed'));
await builder.send();
```

### Pattern 3: Static Helpers

```javascript
// One-shot OK
await ResponseBuilder.ok(subsystem, request, { result: 'success' });

// One-shot error
await ResponseBuilder.error(subsystem, request, new Error('Failed'));
```

### Pattern 4: Custom Status

```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .withStatus('pending')
  .withData({ taskId: '123', status: 'processing' })
  .withMeta({ estimatedTime: 5000 });

await builder.send();
```

### Pattern 5: Error with Custom Object

```javascript
const builder = ResponseBuilder.for(subsystem, request)
  .error({
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    fields: ['email', 'password']
  });

await builder.send();
```

## Response Message Structure

When `buildMessage()` is called, it creates a Message with:

- **Path**: `kernel://response/receive`
- **Body**: Response payload (from `buildPayload()`)
- **Metadata**:
  ```javascript
  {
    isResponse: true,
    originalMessageId: 'msg-123',
    requestPath: 'canvas://layers/get',
    // ... custom metadata from withMeta()
  }
  ```

## Kernel ResponseManager Flow

1. **Response Sent**: Response is sent to `kernel://response/receive`
2. **ResponseManager Receives**: Kernel's ResponseManager receives the response
3. **Request Lookup**: ResponseManager looks up original request by `originalMessageId`
4. **Metadata Retrieval**: Retrieves stored metadata (including `replyPath`)
5. **Response Forwarding**: Forwards response to original caller using stored `replyPath`

## Error Handling

### Missing Identity

```javascript
try {
  await builder.send();
} catch (error) {
  // Error: "subsystem-name: identity with sendProtected() is required to send responses"
  console.error('Identity not available:', error.message);
}
```

**Solution:** Ensure `usePrincipals` hook is installed and identity is attached.

### Missing Subsystem or Request

```javascript
try {
  const builder = new ResponseBuilder({ subsystem: null, request: message });
} catch (error) {
  // Error: "ResponseBuilder: subsystem is required"
  console.error('Subsystem missing:', error.message);
}
```

## Best Practices

1. **Use Fluent API**: Chain methods for readable code
2. **Use Convenience Methods**: Use `ok()` and `error()` for common cases
3. **Normalize Errors**: Let the builder normalize errors automatically
4. **Add Metadata**: Use `withMeta()` for debugging and tracing
5. **Handle Errors**: Always wrap `send()` in try-catch blocks
6. **Validate Input**: Ensure request message is valid before building response

## See Also

- [useResponses](./USE-RESPONSES.md) - Responses hook documentation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem and ResponseManager
- [Route Handlers](../../routing/ROUTE-HANDLERS.md) - Route handler function signature





