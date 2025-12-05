# RequestBuilder Class

## Overview

The `RequestBuilder` class provides a fluent interface for creating and executing request/response operations. It supports two request types: one-shot requests (temporary routes) and command requests (channel-based).

**Key Features:**
- **Fluent API**: Chain configuration with `.with()` → `.forMessage()` → `.send()`
- **Multiple Types**: Supports 'oneShot' and 'command' request types
- **Incremental Building**: Can call `.with()` multiple times to build options incrementally
- **Type-Specific Behavior**: Different execution paths based on request type
- **Promise-Based**: Returns a Promise that resolves with the result

## Class Definition

```javascript
class RequestBuilder {
  constructor({ type, subsystem, performRequest, commandManager })
  with(options) => RequestBuilder
  forMessage(message) => RequestBuilder
  send() => Promise<any>
}
```

## Constructor

### `RequestBuilder({ type, subsystem, performRequest, commandManager })`

Create a new RequestBuilder instance. The constructor uses dependency injection to receive required dependencies.

**Parameters:**
- `type` (string, required) - Request type: `'oneShot'` or `'command'`
- `subsystem` (BaseSubsystem, required) - Subsystem instance
- `performRequest` (Function, required for 'oneShot') - performRequest function reference
- `commandManager` (CommandManager, required for 'command') - CommandManager instance

**Throws:**
- `Error` - If type is not 'oneShot' or 'command'
- `Error` - If subsystem is missing
- `Error` - If performRequest is missing (oneShot type)
- `Error` - If commandManager is missing (command type)

**Note:** RequestBuilder instances are typically created via `subsystem.requests.oneShot()` or `subsystem.requests.command()`, not directly.

## Methods

### `with(options)`

Add or merge options into the builder. Can be called multiple times to incrementally build options.

**Signature:**
```javascript
with(options = {}) => RequestBuilder
```

**Parameters:**
- `options` (Object, optional, default: `{}`) - Options to merge into builder state

**Returns:** `RequestBuilder` - This builder instance for chaining

**Behavior:**
- Merges new options with existing options (later calls override earlier ones)
- Returns `this` for method chaining

**Example:**
```javascript
const builder = subsystem.requests
  .oneShot()
  .with({ timeout: 5000 })
  .with({ handler: async (r) => r.getBody() }); // Can chain multiple with() calls
```

### `forMessage(message)`

Set the message to send. Must be called before `send()`.

**Signature:**
```javascript
forMessage(message) => RequestBuilder
```

**Parameters:**
- `message` (Message, required) - Message to send

**Returns:** `RequestBuilder` - This builder instance for chaining

**Throws:**
- `Error` - If message is not provided (validation happens in `send()`)

**Example:**
```javascript
const builder = subsystem.requests
  .oneShot()
  .with({ handler: async (r) => r.getBody(), timeout: 5000 })
  .forMessage(message);
```

### `send()`

Execute the request. Validates that message is set, then executes based on type.

**Signature:**
```javascript
send() => Promise<any>
```

**Returns:** `Promise<any>` - Promise that resolves with the result (varies by type)

**Throws:**
- `Error` - If message is not set (must call `forMessage()` first)
- `Error` - If handler is missing (oneShot type)
- `Error` - If CommandManager is unavailable (command type)
- `Error` - If request times out (oneShot type)
- `Error` - If route registration fails (oneShot type)
- `Error` - If message send fails

**Execution Flow:**

**For 'oneShot' type:**
1. Validates handler is provided in options
2. Extracts `timeout` and `replyTo` from options
3. Delegates to `performRequest(subsystem, handler, message, { timeout, replyTo, ...sendOptions })`
4. Returns Promise from performRequest

**For 'command' type:**
1. Validates CommandManager is available
2. Delegates to `commandManager.sendCommand({ message, options })`
3. Returns Promise from sendCommand

**Example - One-Shot:**
```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (responseMessage, params, options) => {
      return responseMessage.getBody();
    },
    timeout: 5000
  })
  .forMessage(message)
  .send();
```

**Example - Command:**
```javascript
const response = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  })
  .forMessage(commandMessage)
  .send();
```

## Options Reference

### One-Shot Options

```javascript
{
  handler: Function,        // Required: Handler function to process response
  timeout: number,          // Optional: Timeout in milliseconds (default: 10000)
  replyTo: string,          // Optional: Custom reply path (auto-generated if not provided)
  ...sendOptions: Object    // Optional: Additional options passed to sendProtected()
}
```

**Handler Function Signature:**
```javascript
async (responseMessage, params, options) => result
```

- `responseMessage` (Message) - The response message received
- `params` (Object) - Route parameters (empty for reply routes)
- `options` (Object) - Options object (sanitized, without `callerIdSetBy`)

### Command Options

```javascript
{
  replyTo: string,          // Required: Channel route for replies
  timeout: number,          // Optional: Timeout in milliseconds
  path: string,             // Optional: Override message path
  ...sendOptions: Object    // Optional: Additional options passed to sendProtected()
}
```

## Usage Patterns

### Pattern 1: Simple One-Shot Request

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 5000
  })
  .forMessage(message)
  .send();
```

### Pattern 2: One-Shot with Custom Reply Path

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 10000,
    replyTo: 'custom://reply/path'
  })
  .forMessage(message)
  .send();
```

### Pattern 3: Incremental Option Building

```javascript
const builder = subsystem.requests
  .oneShot()
  .with({ timeout: 5000 })
  .with({ handler: async (r) => r.getBody() });

const result = await builder.forMessage(message).send();
```

### Pattern 4: Command Request

```javascript
const response = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  })
  .forMessage(commandMessage)
  .send();

// Handle reply on channel
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

### Pattern 5: One-Shot with Response Validation

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => {
      const body = response.getBody();
      if (!body.success) {
        throw new Error(`Request failed: ${body.error}`);
      }
      return body.data;
    },
    timeout: 5000
  })
  .forMessage(message)
  .send();
```

### Pattern 6: One-Shot with No Timeout

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 0  // No timeout, wait indefinitely
  })
  .forMessage(message)
  .send();
```

## Error Scenarios

### Missing Message Error

```javascript
try {
  const builder = subsystem.requests.oneShot().with({ handler: async (r) => r.getBody() });
  await builder.send(); // Error: no message provided
} catch (error) {
  // Error: "RequestBuilder.send: no message provided. Call forMessage() first."
}
```

### Missing Handler Error (One-Shot)

```javascript
try {
  await subsystem.requests
    .oneShot()
    .with({ timeout: 5000 }) // Missing handler
    .forMessage(message)
    .send();
} catch (error) {
  // Error: "RequestBuilder(oneShot).send: options.handler (function) is required."
}
```

### Missing CommandManager Error (Command)

```javascript
try {
  await subsystem.requests
    .command()
    .with({ replyTo: 'channel://replies' })
    .forMessage(message)
    .send();
} catch (error) {
  // Error: "RequestBuilder(command).send: CommandManager is not available."
}
```

### Timeout Error (One-Shot)

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({ handler: async (r) => r.getBody(), timeout: 5000 })
    .forMessage(message)
    .send();
} catch (error) {
  // Error: "Request timed out after 5000ms"
}
```

### Send Error

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({ handler: async (r) => r.getBody(), timeout: 5000 })
    .forMessage(message)
    .send();
} catch (error) {
  // Error: "performRequest: Failed to send message: ..."
}
```

### Handler Error

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({
      handler: async (response) => {
        throw new Error('Handler error');
      },
      timeout: 5000
    })
    .forMessage(message)
    .send();
} catch (error) {
  // Error: "Handler error"
}
```

## Request Execution Flow

### One-Shot Request Flow

1. **Builder Creation**: `subsystem.requests.oneShot()` creates RequestBuilder
2. **Option Building**: `.with({ handler, timeout, ... })` sets options
3. **Message Setting**: `.forMessage(message)` sets the message
4. **Execution**: `.send()` calls `performRequest()` which:
   - Registers temporary reply route
   - Sets up timeout
   - Sends message with `responseRequired: { replyTo, timeout }`
   - Waits for response
   - Executes handler
   - Cleans up route and timeout
5. **Result**: Promise resolves with handler result

### Command Request Flow

1. **Builder Creation**: `subsystem.requests.command()` creates RequestBuilder
2. **Option Building**: `.with({ replyTo, timeout, ... })` sets options
3. **Message Setting**: `.forMessage(message)` sets the message
4. **Execution**: `.send()` calls `commandManager.sendCommand()` which:
   - Sends message with `responseRequired: { replyTo, timeout }`
   - ResponseManagerSubsystem registers pending response
   - Returns Promise that resolves when reply arrives
5. **Reply Handling**: When reply arrives on channel:
   - Route handler calls `commandManager.handleCommandReply()`
   - CommandManager matches correlationId and resolves promise
6. **Result**: Promise resolves with response message

## Best Practices

1. **Always Set Message**: Call `forMessage()` before `send()`
2. **Provide Handler**: For one-shot requests, always provide a handler in options
3. **Set Timeouts**: Use reasonable timeouts to prevent hanging requests
4. **Handle Errors**: Wrap `.send()` calls in try-catch blocks
5. **Incremental Building**: Use multiple `.with()` calls for complex configurations
6. **Validate Responses**: Check response validity in handler functions
7. **Use Appropriate Type**: Use one-shot for simple requests, command for channel-based operations

## Type Comparison

| Aspect | One-Shot | Command |
|--------|----------|---------|
| **Route Type** | Temporary route | Persistent channel |
| **Route Management** | Automatic cleanup | Manual channel registration |
| **Timeout Handling** | Local timeout | ResponseManagerSubsystem |
| **Handler** | Required in options | Not used (raw response) |
| **Use Case** | Simple queries | Long-running commands |
| **Reply Path** | Auto-generated or custom | Must specify `replyTo` |

## See Also

- [useRequests](./USE-REQUESTS.md) - Requests hook documentation
- [CommandManager](./COMMAND-MANAGER.md) - CommandManager class documentation
- [Request Core](./REQUEST-CORE.md) - performRequest function documentation
- [useRouter](../router/USE-ROUTER.md) - Router hook documentation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [Route Handlers](../../routing/ROUTE-HANDLERS.md) - Route handler function signature
