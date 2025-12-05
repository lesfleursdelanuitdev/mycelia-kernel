# CommandManager Class

## Overview

The `CommandManager` class manages command/response operations using channels. It tracks pending commands by correlationId and resolves promises when replies arrive on channel routes. Unlike one-shot requests, command requests use persistent channels and rely on ResponseManagerSubsystem for timeout handling.

**Key Features:**
- **Channel-Based**: Uses persistent channels for replies (not temporary routes)
- **Correlation Tracking**: Tracks pending commands by correlationId
- **No Local Timeout**: Relies on ResponseManagerSubsystem for timeout handling
- **Promise-Based**: Returns Promises that resolve with response messages
- **Automatic Cleanup**: Disposes pending commands on disposal

## Class Definition

```javascript
class CommandManager {
  constructor(subsystem)
  sendCommand({ message, options }) => Promise<Message>
  handleCommandReply(responseMessage) => boolean
  dispose() => void
  getStatus() => Object
}
```

## Constructor

### `CommandManager(subsystem)`

Create a new CommandManager instance.

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem instance

**Throws:**
- `Error` - If subsystem is not provided

**Example:**
```javascript
const commandManager = new CommandManager(subsystem);
```

**Note:** CommandManager instances are typically created automatically by `useRequests` hook and accessed via `subsystem.requests.commandManager`.

## Methods

### `sendCommand({ message, options })`

Send a command and return a Promise that resolves when the first reply for this correlationId arrives on the reply channel.

**Signature:**
```javascript
sendCommand({ message, options }) => Promise<Message>
```

**Parameters:**
- `message` (Message, required) - Message to send (must have an ID)
- `options` (Object, optional, default: `{}`) - Send options:
  - `path` (string, optional) - Override message path
  - `replyTo` (string, required) - Reply channel route
  - `timeout` (number, optional) - Timeout in milliseconds
  - `...sendOptions` (Object, optional) - Additional options passed to `sendProtected()`

**Returns:** `Promise<Message>` - Promise that resolves with the response message

**Throws:**
- `Error` - If identity is not available
- `Error` - If path is invalid
- `Error` - If replyTo is missing
- `Error` - If message doesn't have an ID

**Important Notes:**
- No local timeout is used. Timeouts are handled exclusively by ResponseManagerSubsystem
- ResponseManagerSubsystem emits synthetic timeout responses if timeout occurs
- The message must have an ID (set during creation via MessageFactory)
- Uses `responseRequired: { replyTo, timeout }` format for v2 compatibility

**Example:**
```javascript
const commandMessage = subsystem.messages.create('processor://task/execute', { taskId: '123' });

const responsePromise = subsystem.requests.commandManager.sendCommand({
  message: commandMessage,
  options: {
    replyTo: 'processor://channel/replies',
    timeout: 30000
  }
});

// Register channel route handler
subsystem.registerRoute('processor://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Wait for response
const response = await responsePromise;
console.log('Command completed:', response.getBody());
```

### `handleCommandReply(responseMessage)`

Called when a reply arrives on the reply channel. Uses correlationId to resolve the local Promise.

**Signature:**
```javascript
handleCommandReply(responseMessage) => boolean
```

**Parameters:**
- `responseMessage` (Message, required) - Response message received on channel

**Returns:** `boolean` - `true` if reply was handled (matched a pending command), `false` otherwise

**Behavior:**
- Extracts correlationId from response message (tries multiple sources)
- Looks up pending command by correlationId
- Resolves the pending promise with the response message
- Returns `true` if handled, `false` if no matching pending command

**Correlation ID Extraction Priority:**
1. Message body (`responseMessage.body.inReplyTo` or `correlationId`)
2. Message metadata (`meta.getCustomField('inReplyTo')` or `correlationId`)
3. Legacy fallback (direct properties)

**Example:**
```javascript
// In a channel route handler
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  const handled = subsystem.requests.commandManager.handleCommandReply(responseMessage);
  if (!handled) {
    console.warn('Reply received but no matching pending command');
  }
});
```

### `dispose()`

Dispose the CommandManager and clean up all pending commands. Best-effort cleanup: rejects any still-pending promises.

**Signature:**
```javascript
dispose() => void
```

**Behavior:**
- Rejects all pending promises with disposal error
- Clears pending commands map
- Logs disposal message

**Example:**
```javascript
// Typically called automatically when subsystem is disposed
commandManager.dispose();
```

### `getStatus()`

Get status information about the CommandManager.

**Signature:**
```javascript
getStatus() => Object
```

**Returns:** `Object` - Status object with:
- `pendingCount` (number) - Number of pending commands

**Example:**
```javascript
const status = commandManager.getStatus();
console.log(`Pending commands: ${status.pendingCount}`);
```

## Usage Patterns

### Pattern 1: Basic Command Request

```javascript
// Send command
const commandMessage = subsystem.messages.create('processor://task/execute', { taskId: '123' });

const responsePromise = subsystem.requests.commandManager.sendCommand({
  message: commandMessage,
  options: {
    replyTo: 'processor://channel/replies',
    timeout: 30000
  }
});

// Register channel route
subsystem.registerRoute('processor://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Wait for response
const response = await responsePromise;
```

### Pattern 2: Command with Error Handling

```javascript
try {
  const commandMessage = subsystem.messages.create('processor://task/execute', { taskId: '123' });
  
  const responsePromise = subsystem.requests.commandManager.sendCommand({
    message: commandMessage,
    options: {
      replyTo: 'processor://channel/replies',
      timeout: 30000
    }
  });

  // Register channel route
  subsystem.registerRoute('processor://channel/replies', (responseMessage) => {
    subsystem.requests.commandManager.handleCommandReply(responseMessage);
  });

  const response = await responsePromise;
  console.log('Command completed:', response.getBody());
} catch (error) {
  console.error('Command failed:', error);
}
```

### Pattern 3: Multiple Commands on Same Channel

```javascript
// Register channel route once
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Send multiple commands
const command1 = subsystem.messages.create('task://execute', { id: '1' });
const command2 = subsystem.messages.create('task://execute', { id: '2' });

const response1Promise = subsystem.requests.commandManager.sendCommand({
  message: command1,
  options: { replyTo: 'subsystem://channel/replies', timeout: 5000 }
});

const response2Promise = subsystem.requests.commandManager.sendCommand({
  message: command2,
  options: { replyTo: 'subsystem://channel/replies', timeout: 5000 }
});

// Wait for both responses
const [response1, response2] = await Promise.all([response1Promise, response2Promise]);
```

### Pattern 4: Using RequestBuilder for Commands

```javascript
// Use RequestBuilder fluent API
const response = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  })
  .forMessage(commandMessage)
  .send();

// Still need to register channel route
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## Command Flow

1. **Command Sending**: `sendCommand()` is called with message and options
2. **Correlation Tracking**: Message ID is used as correlationId and stored in pending map
3. **Message Sending**: Message is sent via `identity.sendProtected()` with `responseRequired: { replyTo, timeout }`
4. **ResponseManager Registration**: ResponseManagerSubsystem registers pending response
5. **Reply Arrival**: When reply arrives on channel route:
   - Route handler calls `handleCommandReply(responseMessage)`
   - CommandManager extracts correlationId from response
   - CommandManager looks up pending command
   - Promise is resolved with response message
6. **Timeout Handling**: If timeout occurs:
   - ResponseManagerSubsystem emits synthetic timeout response
   - CommandManager resolves promise with timeout response

## Timeout Handling

CommandManager does NOT use local timeouts. Timeout handling is delegated to ResponseManagerSubsystem:

- **Timeout Registration**: Timeout is passed in `responseRequired: { replyTo, timeout }`
- **Timeout Expiry**: ResponseManagerSubsystem emits synthetic response with `isResponse: true, success: false, error: timeout`
- **Timeout Response**: CommandManager receives timeout response and resolves promise normally
- **No Local Cleanup**: No timeout timers to clean up in CommandManager

## Correlation ID Matching

CommandManager matches responses to pending commands using correlationId:

**Extraction Priority:**
1. `responseMessage.body.inReplyTo` or `responseMessage.body.correlationId`
2. `responseMessage.meta.getCustomField('inReplyTo')` or `correlationId`
3. Legacy: `responseMessage.inReplyTo` or `responseMessage.correlationId`

**Matching:**
- Uses `message.id` (from original command) as correlationId
- Looks up in `#pending` map by correlationId
- Resolves matching promise with response message

## Error Handling

### Missing Identity

```javascript
try {
  await commandManager.sendCommand({ message, options });
} catch (error) {
  // Error: "CommandManager.sendCommand: subsystem.identity.sendProtected() is required."
}
```

### Missing ReplyTo

```javascript
try {
  await commandManager.sendCommand({
    message: commandMessage,
    options: {} // Missing replyTo
  });
} catch (error) {
  // Error: "CommandManager.sendCommand: replyTo must be a non-empty string."
}
```

### Missing Message ID

```javascript
try {
  const message = new Message('path', {}); // No ID set
  await commandManager.sendCommand({ message, options });
} catch (error) {
  // Error: "CommandManager.sendCommand: message must have an id property..."
}
```

### Unmatched Reply

```javascript
// If reply arrives but no matching pending command
subsystem.registerRoute('channel://replies', (responseMessage) => {
  const handled = commandManager.handleCommandReply(responseMessage);
  if (!handled) {
    // Could be late response after timeout, or not tracked locally
    console.warn('Unmatched reply received');
  }
});
```

## Best Practices

1. **Register Channel Routes**: Always register channel routes before sending commands
2. **Handle Replies**: Call `handleCommandReply()` in channel route handlers
3. **Use Message IDs**: Ensure messages have IDs set during creation
4. **Handle Timeouts**: ResponseManagerSubsystem handles timeouts, but check response for timeout indicators
5. **Dispose Properly**: CommandManager is disposed automatically, but can be called manually
6. **Check Status**: Use `getStatus()` to monitor pending commands
7. **Error Handling**: Wrap `sendCommand()` in try-catch blocks

## Integration with ResponseManagerSubsystem

CommandManager integrates seamlessly with ResponseManagerSubsystem:

- **Registration**: Commands are registered via `responseRequired: { replyTo, timeout }`
- **Tracking**: ResponseManagerSubsystem tracks pending responses by correlationId
- **Timeout**: ResponseManagerSubsystem emits synthetic timeout responses
- **Response Handling**: Responses are sent with `isResponse: true` flag

## Comparison with One-Shot Requests

| Aspect | CommandManager | performRequest (One-Shot) |
|--------|----------------|---------------------------|
| **Route Type** | Persistent channel | Temporary route |
| **Route Management** | Manual registration | Automatic cleanup |
| **Timeout** | ResponseManagerSubsystem | Local timeout |
| **Correlation** | By correlationId | By route path |
| **Use Case** | Long-running commands | Simple queries |
| **Handler** | Raw response message | Handler function |

## See Also

- [useRequests](./USE-REQUESTS.md) - Requests hook documentation
- [RequestBuilder](./REQUEST-BUILDER.md) - Request builder class documentation
- [Request Core](./REQUEST-CORE.md) - performRequest function documentation
- [ResponseManagerSubsystem](../../models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Response manager documentation
- [useRouter](../router/USE-ROUTER.md) - Router hook documentation
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management




