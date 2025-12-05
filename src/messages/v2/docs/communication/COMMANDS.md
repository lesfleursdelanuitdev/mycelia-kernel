# Commands

## Overview

Commands are asynchronous operations that execute long-running tasks and return responses via channels. They use a fire-and-forget pattern where the command is sent immediately, and the response arrives asynchronously on a reply channel.

## Characteristics

### Asynchronous Execution
- Commands are sent immediately without waiting for completion
- Responses arrive asynchronously on reply channels
- No blocking of the sending subsystem

### Channel-Based Replies
- Commands use long-lived channels for replies (not temporary routes)
- Reply channels are created and managed via the `useChannels` hook
- Multiple commands can share the same reply channel

### Timeout Handling
- Timeouts are handled by ResponseManagerSubsystem (not locally)
- Timeout responses are synthetic messages sent via the kernel
- Timeout responses include error metadata indicating timeout

### One-to-One Pattern
- Each command expects a single response
- Correlation IDs match responses to commands
- First response received resolves the command promise

## How Commands Work

### 1. Command Registration

Commands can be registered with logical names for easier usage:

```javascript
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  createChannel: true,  // Automatically create reply channel
  timeout: 10000,
  meta: { description: 'Process data asynchronously' }
});
```

### 2. Command Execution

Commands are sent using the registered name or a direct path:

```javascript
// Using registered name
const result = await subsystem.commands.send('processData', {
  data: [1, 2, 3, 4, 5],
  operation: 'sum'
});

// Using direct path (requires replyChannel in options)
const result = await subsystem.commands.send('processor://data/process', {
  data: [1, 2, 3, 4, 5]
}, {
  replyChannel: 'ui://channel/data-replies',
  timeout: 5000
});
```

### 3. Underlying Mechanism

Commands use the `useRequests` hook with the `command` type:

```javascript
// Internally, commands use:
subsystem.requests
  .command()
  .with({
    replyTo: replyChannel,
    timeout: timeout
  })
  .forMessage(commandMessage)
  .send();
```

### 4. Response Handling

Responses arrive on the reply channel:

1. **Command Sent**: Message sent via `identity.sendProtected()` with `responseRequired: { replyTo, timeout }`
2. **ResponseManager Registration**: ResponseManagerSubsystem registers pending response
3. **Reply Arrival**: Response arrives on reply channel route
4. **Correlation Matching**: CommandManager matches response to pending command using correlationId
5. **Promise Resolution**: Promise resolves with response message

### 5. Timeout Handling

If a timeout occurs:

1. **Timeout Detection**: ResponseManagerSubsystem detects timeout
2. **Synthetic Response**: Creates timeout response message with:
   - `isResponse: true`
   - `success: false`
   - `error: { kind: 'timeout', message: '...', timeoutMs: ... }`
3. **Response Delivery**: Sends timeout response via kernel to reply channel
4. **Promise Resolution**: CommandManager resolves promise with timeout response

## Integration with Channels

Commands rely heavily on channels for reply handling:

### Channel Creation

Channels can be created automatically or explicitly:

```javascript
// Automatic channel creation
subsystem.commands.register('saveFile', {
  path: 'storage://file/save',
  createChannel: true,
  channelOptions: {
    participants: [clientPkr],
    metadata: { description: 'File save replies' }
  }
});

// Explicit channel creation
const replyChannel = subsystem.channels.create('file-save-replies', {
  participants: [clientPkr]
});

subsystem.commands.register('saveFile', {
  path: 'storage://file/save',
  replyChannel: replyChannel.route
});
```

### Channel Route Registration

Reply channels must have route handlers registered:

```javascript
// Register route handler for reply channel
subsystem.registerRoute('ui://channel/data-replies', (responseMessage) => {
  // CommandManager handles correlation and promise resolution
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## Command Lifecycle

```
1. Command Registration
   └─> Register name, path, replyChannel, timeout

2. Command Execution
   ├─> Create command message
   ├─> Use RequestBuilder (command type)
   └─> Send via identity.sendProtected()

3. ResponseManager Registration
   └─> Register pending response with timeout

4. Command Processing
   └─> Destination subsystem processes command

5. Response Sending
   ├─> Response sent to reply channel
   └─> ResponseManager validates correlation

6. Response Handling
   ├─> Route handler receives response
   ├─> CommandManager matches correlationId
   └─> Promise resolves with response

7. Timeout (if applicable)
   ├─> ResponseManager detects timeout
   ├─> Emits synthetic timeout response
   └─> Promise resolves with timeout response
```

## Best Practices

### 1. Use Named Commands
Register commands with logical names for better ergonomics:

```javascript
// Good: Named command
subsystem.commands.register('processData', { ... });
await subsystem.commands.send('processData', payload);

// Less ideal: Direct path
await subsystem.commands.send('processor://data/process', payload, {
  replyChannel: '...',
  timeout: 5000
});
```

### 2. Set Appropriate Timeouts
Always set timeouts that match operation duration:

```javascript
subsystem.commands.register('quickOperation', {
  path: 'processor://quick',
  timeout: 1000  // 1 second for quick operations
});

subsystem.commands.register('longOperation', {
  path: 'processor://long',
  timeout: 60000  // 60 seconds for long operations
});
```

### 3. Handle Timeout Responses
Always check for timeout errors:

```javascript
const response = await subsystem.commands.send('processData', payload);

if (response.meta?.isResponse && !response.meta?.success) {
  if (response.body?.error?.kind === 'timeout') {
    console.error('Command timed out:', response.body.error);
  }
}
```

### 4. Use Channel Options
Configure channels appropriately:

```javascript
subsystem.commands.register('secureOperation', {
  path: 'processor://secure',
  createChannel: true,
  channelOptions: {
    participants: [authorizedPkr],  // Restrict access
    metadata: { 
      description: 'Secure operation replies',
      priority: 'high'
    }
  }
});
```

## Error Handling

Commands handle errors at multiple levels:

### Send Errors
Errors during command sending (before delivery):

```javascript
try {
  await subsystem.commands.send('processData', payload);
} catch (error) {
  // Command never reached destination
  console.error('Failed to send command:', error);
}
```

### Processing Errors
Errors during command processing (returned in response):

```javascript
const response = await subsystem.commands.send('processData', payload);

if (response.meta?.isResponse && !response.meta?.success) {
  // Command was processed but failed
  console.error('Command failed:', response.body?.error);
}
```

### Timeout Errors
Timeout errors (synthetic responses):

```javascript
const response = await subsystem.commands.send('processData', payload);

if (response.body?.error?.kind === 'timeout') {
  console.error('Command timed out after', response.body.error.timeoutMs, 'ms');
}
```

## Commands vs Queries

| Aspect | Commands | Queries |
|--------|----------|---------|
| **Execution** | Asynchronous | Synchronous |
| **Response** | Channel-based | Immediate |
| **Timeout** | ResponseManager | Local |
| **Use Case** | Long operations | Read operations |
| **Queue** | Goes through queue | Bypasses queue |
| **Pattern** | Fire-and-forget | Request-response |

For more details, see [When to Use What](./WHEN-TO-USE-WHAT.md).

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [sendProtected](./SEND-PROTECTED.md) - Secure messaging mechanism used by all communication types
- [useCommands Hook](../hooks/commands/USE-COMMANDS.md) - Hook API documentation
- [Requests Guide](./REQUESTS.md) - How commands use requests
- [Channels Guide](./CHANNELS.md) - Channel-based communication
- [Responses Guide](./RESPONSES.md) - Response handling
- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide

