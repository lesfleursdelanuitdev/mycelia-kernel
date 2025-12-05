# useRequests Hook

## Overview

The `useRequests` hook provides request/response functionality to subsystems. It enables subsystems to send messages and wait for responses using a fluent, promise-based API. The hook supports two request types: one-shot requests (temporary routes) and command requests (channel-based).

**Key Features:**
- **Fluent API**: Chain request configuration with `.oneShot().with().forMessage().send()` or `.command().with().forMessage().send()`
- **Multiple Request Types**: Supports one-shot requests (temporary routes) and command requests (channels)
- **Automatic Route Management**: Creates and cleans up temporary reply routes automatically (one-shot)
- **Channel Support**: Uses channels for command requests with ResponseManagerSubsystem timeout handling
- **Timeout Support**: Configurable timeout with automatic cleanup
- **Identity Integration**: Uses `identity.sendProtected()` for secure messaging
- **Error Handling**: Proper cleanup on errors, timeouts, or send failures
- **CommandManager Integration**: Built-in CommandManager for channel-based commands

## Hook Metadata

```javascript
{
  kind: 'requests',
  overwrite: false,
  required: ['router'],
  attach: true,
  source: import.meta.url,
  contract: null
}
```

### Properties

- **`kind`**: `'requests'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing requests facet
- **`required`**: `['router']` - Requires router facet (from `useRouter` hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.requests`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `null` - No contract implementation

## Dependencies

The `useRequests` hook requires:
- **`router` facet**: Must be installed via `useRouter` hook before `useRequests`
- **`identity` with `sendProtected()`**: Must be available at runtime (from `usePrincipals` hook)

**Example:**
```javascript
subsystem
  .use(useRouter)      // Must be installed first
  .use(usePrincipals)  // Required for identity.sendProtected()
  .use(useRequests)    // Can now use requests
  .build();
```

## Configuration

The hook reads configuration from `ctx.config.requests`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const subsystem = useBase('my-subsystem', { ms: messageSystem })
  .withConfig({
    requests: {
      debug: true
    }
  })
  .build();
```

## Facet Methods

### `oneShot()`

Create a one-shot request builder. One-shot requests register a temporary route, send a message, and wait for a response.

**Signature:**
```javascript
oneShot() => RequestBuilder
```

**Returns:** `RequestBuilder` - Request builder instance for one-shot requests

**Example:**
```javascript
const result = await subsystem.requests
  .oneShot()
  .with({ handler: async (response) => response.getBody(), timeout: 5000 })
  .forMessage(message)
  .send();
```

### `command()`

Create a command request builder. Command requests use channels for replies and rely on ResponseManagerSubsystem for timeout handling.

**Signature:**
```javascript
command() => RequestBuilder
```

**Returns:** `RequestBuilder` - Request builder instance for command requests

**Example:**
```javascript
const response = await subsystem.requests
  .command()
  .with({ replyTo: 'subsystem://channel/replies', timeout: 5000 })
  .forMessage(commandMessage)
  .send();

// Handle reply on channel route
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

### `commandManager`

Get the CommandManager instance for direct channel-based command operations.

**Type:** `CommandManager` (read-only property)

**Example:**
```javascript
// Send a command via channel
const response = await subsystem.requests.commandManager.sendCommand({
  message: commandMessage,
  options: {
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  }
});

// Handle reply on channel route
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## Request Types

### One-Shot Requests

One-shot requests are designed for simple request/response patterns:
- Register a temporary reply route
- Send the message
- Wait for response on the temporary route
- Automatically clean up route and timeout

**Use Cases:**
- Simple queries that need immediate responses
- Operations that return a single result
- Requests where you don't need persistent channels

**Example:**
```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (responseMessage, params, options) => {
      return responseMessage.getBody();
    },
    timeout: 5000
  })
  .forMessage(requestMessage)
  .send();
```

### Command Requests

Command requests use channels for replies:
- Send command to a channel route
- ResponseManagerSubsystem handles timeout
- Replies arrive on the channel route
- CommandManager tracks pending commands by correlationId

**Use Cases:**
- Commands that may take longer to process
- Operations where you want to reuse channels
- Requests where timeout is handled by ResponseManagerSubsystem

**Example:**
```javascript
// Send command
const responsePromise = subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 10000
  })
  .forMessage(commandMessage)
  .send();

// Handle reply on channel
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Wait for response
const response = await responsePromise;
```

## Request Flow

### One-Shot Request Flow

1. **Builder Creation**: Call `subsystem.requests.oneShot()` to create a RequestBuilder
2. **Configuration**: Call `.with({ handler, timeout, ... })` to set options
3. **Message Setting**: Call `.forMessage(message)` to set the message
4. **Route Registration**: Call `.send()` which:
   - Registers a temporary reply route
   - Sets up timeout (if specified)
   - Sends the message via `identity.sendProtected()` with `responseRequired: { replyTo, timeout }`
5. **Response Handling**: When response arrives:
   - Temporary route is matched
   - Handler is executed with response message
   - Route and timeout are cleaned up
   - Promise resolves with handler result
6. **Error Handling**: On timeout or error:
   - Route is unregistered
   - Timeout is cleared
   - Promise rejects with error

### Command Request Flow

1. **Builder Creation**: Call `subsystem.requests.command()` to create a RequestBuilder
2. **Configuration**: Call `.with({ replyTo, timeout, ... })` to set options
3. **Message Setting**: Call `.forMessage(message)` to set the message
4. **Command Sending**: Call `.send()` which:
   - Sends the message via `identity.sendProtected()` with `responseRequired: { replyTo, timeout }`
   - ResponseManagerSubsystem registers the pending response
   - Returns a Promise that resolves when reply arrives
5. **Reply Handling**: When reply arrives on channel:
   - Route handler calls `commandManager.handleCommandReply(responseMessage)`
   - CommandManager matches correlationId and resolves the promise
6. **Timeout Handling**: If timeout occurs:
   - ResponseManagerSubsystem emits synthetic timeout response
   - CommandManager resolves promise with timeout response

## Usage Patterns

### Pattern 1: Basic One-Shot Request

```javascript
const message = subsystem.messages.create('canvas://layers/get', { layerId: '123' });

const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 5000
  })
  .forMessage(message)
  .send();

console.log('Layer data:', result);
```

### Pattern 2: One-Shot with Custom Reply Path

```javascript
const message = subsystem.messages.create('storage://files/read', { path: '/data.json' });

const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody().content,
    timeout: 10000,
    replyTo: 'custom://reply/path'
  })
  .forMessage(message)
  .send();
```

### Pattern 3: One-Shot with Error Handling

```javascript
try {
  const message = subsystem.messages.create('api://fetch', { url: 'https://api.example.com/data' });
  
  const result = await subsystem.requests
    .oneShot()
    .with({
      handler: async (response) => response.getBody(),
      timeout: 5000
    })
    .forMessage(message)
    .send();
  
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('timed out')) {
    console.error('Request timed out');
  } else {
    console.error('Request failed:', error);
  }
}
```

### Pattern 4: Command Request

```javascript
// Send command
const commandMessage = subsystem.messages.create('processor://task/execute', { taskId: '123' });

const responsePromise = subsystem.requests
  .command()
  .with({
    replyTo: 'processor://channel/replies',
    timeout: 30000
  })
  .forMessage(commandMessage)
  .send();

// Register channel route handler
subsystem.registerRoute('processor://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Wait for response
try {
  const response = await responsePromise;
  console.log('Command completed:', response.getBody());
} catch (error) {
  console.error('Command failed:', error);
}
```

### Pattern 5: Incremental Option Building

```javascript
// Build options incrementally
const builder = subsystem.requests
  .oneShot()
  .with({ timeout: 5000 })
  .with({ handler: async (r) => r.getBody() });

// Set message and send
const result = await builder.forMessage(message).send();
```

### Pattern 6: Command with Direct CommandManager

```javascript
// Use CommandManager directly
const response = await subsystem.requests.commandManager.sendCommand({
  message: commandMessage,
  options: {
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  }
});

// Handle reply
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## RequestBuilder API

The `oneShot()` and `command()` methods return a `RequestBuilder` instance. See [RequestBuilder](./REQUEST-BUILDER.md) for detailed documentation on the builder methods:

- `with(options)` - Add/merge options
- `forMessage(message)` - Set the message to send
- `send()` - Execute the request

## Integration with Other Hooks

### Router Hook

The `useRequests` hook requires the `router` facet from `useRouter`:
- Registers temporary reply routes via `routerFacet.registerRoute()` (one-shot)
- Unregisters routes via `routerFacet.unregisterRoute()` (one-shot)
- Routes are registered with the full reply path (e.g., `subsystem://request/oneShot/{messageId}`)

### Principals Hook

The `useRequests` hook requires `identity.sendProtected()` from `usePrincipals`:
- Sends messages securely via `identity.sendProtected()`
- Ensures proper caller authentication
- Handles protected message options

### Messages Hook

Works seamlessly with `useMessages` for creating request messages:
```javascript
// Create message using useMessages
const message = subsystem.messages.create('canvas://layers/get', { layerId: '123' });

// Send one-shot request using useRequests
const result = await subsystem.requests
  .oneShot()
  .with({ handler: async (r) => r.getBody(), timeout: 5000 })
  .forMessage(message)
  .send();
```

### Responses Hook

Works with `useResponses` for sending responses:
```javascript
// In a route handler
subsystem.registerRoute('canvas://layers/get', async (message) => {
  const layerId = message.getBody().layerId;
  const layer = await getLayer(layerId);
  
  // Reply using useResponses
  await subsystem.responses.replyTo(message, { layer });
});
```

## Reply Route Management

### One-Shot Routes

The hook automatically manages temporary reply routes for one-shot requests:

1. **Route Registration**: Creates a temporary route at `subsystem://request/oneShot/{messageId}`
2. **Route Matching**: Response messages are routed to this temporary route
3. **Route Cleanup**: Route is automatically unregistered when:
   - Response is received
   - Request times out
   - Send fails

**Route Path Format:**
- **Default**: `{subsystemName}://request/oneShot/{messageId}`
- **Custom**: Can be overridden with `replyTo` option

### Command Channels

Command requests use persistent channels:
- Channel route is specified via `replyTo` option
- Channel must be registered as a route handler
- Handler should call `commandManager.handleCommandReply(responseMessage)`

## ResponseManagerSubsystem Integration

Both request types integrate with ResponseManagerSubsystem:

- **One-Shot**: Uses `responseRequired: { replyTo, timeout }` format
- **Command**: Uses `responseRequired: { replyTo, timeout }` format
- **Timeout Handling**: ResponseManagerSubsystem handles timeouts and emits synthetic responses
- **Response Tracking**: ResponseManagerSubsystem tracks pending responses by correlationId

## Error Handling

The hook handles various error scenarios:

### Timeout Errors

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({ handler: async (r) => r.getBody(), timeout: 5000 })
    .forMessage(message)
    .send();
} catch (error) {
  if (error.message.includes('timed out')) {
    // Request timed out after 5000ms
  }
}
```

### Send Errors

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({ handler: async (r) => r.getBody(), timeout: 5000 })
    .forMessage(message)
    .send();
} catch (error) {
  if (error.message.includes('Failed to send message')) {
    // Message send failed
  }
}
```

### Route Registration Errors

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({ handler: async (r) => r.getBody(), timeout: 5000 })
    .forMessage(message)
    .send();
} catch (error) {
  if (error.message.includes('Failed to register reply route')) {
    // Route registration failed (e.g., route already exists)
  }
}
```

### Handler Errors

Errors thrown by the handler function are propagated:

```javascript
try {
  const result = await subsystem.requests
    .oneShot()
    .with({
      handler: async (response) => {
        if (!response.getBody().success) {
          throw new Error('Invalid response');
        }
        return response.getBody().data;
      },
      timeout: 5000
    })
    .forMessage(message)
    .send();
} catch (error) {
  // Handler error is caught here
  console.error('Handler error:', error);
}
```

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

## Best Practices

1. **Always Set Timeouts**: Use reasonable timeouts to prevent hanging requests
2. **Handle Errors**: Always wrap requests in try-catch blocks
3. **Validate Responses**: Check response validity in handler functions
4. **Use Appropriate Type**: Use one-shot for simple requests, command for channel-based operations
5. **Clean Up Resources**: The hook handles cleanup automatically, but ensure handlers don't leak resources
6. **Test Timeout Behavior**: Test timeout scenarios to ensure proper cleanup
7. **Use Identity**: Always use `usePrincipals` with `useRequests` for secure messaging
8. **Register Channel Routes**: For command requests, ensure channel routes are registered before sending

## Performance Considerations

- **Route Registration**: Temporary routes are registered and unregistered for each one-shot request
- **Timeout Management**: Timeouts are cleared automatically
- **Memory Usage**: Minimal memory overhead per request (route entry + timeout for one-shot, correlationId tracking for command)
- **Route Conflicts**: Route paths are unique per message ID, preventing conflicts
- **Channel Reuse**: Command requests can reuse channels for better performance

## Debug Logging

When debug is enabled, the hook logs:
- Initialization messages
- Route registration/unregistration (via router debug logging)
- CommandManager operations (via CommandManager logging)

**Example:**
```javascript
const subsystem = useBase('my-subsystem', { ms: messageSystem })
  .withConfig({
    requests: {
      debug: true
    }
  })
  .build();
```

## See Also

- [Requests Guide](../../communication/REQUESTS.md) - How requests work and how queries/commands use them
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [Commands Guide](../../communication/COMMANDS.md) - How commands use requests
- [Queries Guide](../../communication/QUERIES.md) - How queries use requests
- [Channels Guide](../../communication/CHANNELS.md) - Channel-based communication
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [RequestBuilder](./REQUEST-BUILDER.md) - Request builder class documentation
- [CommandManager](./COMMAND-MANAGER.md) - CommandManager class documentation
- [Request Core](./REQUEST-CORE.md) - performRequest function documentation
- [useRouter](../router/USE-ROUTER.md) - Router hook documentation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [useMessages](../messages/USE-MESSAGES.md) - Messages hook for message creation
- [useResponses](../responses/USE-RESPONSES.md) - Responses hook for sending replies
- [Kernel Subsystem](../../models/kernel-subsystem/KERNEL-SUBSYSTEM.md) - Kernel subsystem and sendProtected method
- [ResponseManagerSubsystem](../../models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Response manager documentation
