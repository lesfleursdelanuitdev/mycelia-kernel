# useCommands Hook

## Overview

The `useCommands` hook provides an ergonomic API for sending and managing command messages using channels for replies. It enables subsystems to register named commands with automatic channel management and provides a convenient interface for command execution.

**Key Features:**
- **Named Command Registry**: Register commands with logical names for easier usage
- **Automatic Channel Management**: Optionally create reply channels automatically
- **Channel-Based Replies**: Uses channels for command responses (via CommandManager)
- **Request/Response Integration**: Integrates with requests facet for command execution
- **Introspection**: List registered commands for tooling and documentation

## Hook Metadata

```javascript
{
  kind: 'commands',
  overwrite: false,
  required: ['requests', 'messages', 'channels'],
  attach: true,
  source: import.meta.url,
  contract: null
}
```

### Properties

- **`kind`**: `'commands'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing commands facet
- **`required`**: `['requests', 'messages', 'channels']` - Requires requests, messages, and channels facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.commands`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `null` - No contract implementation (can be added later)

## Dependencies

The `useCommands` hook requires the following facets:

- **`requests`**: For command execution via RequestBuilder (from `useRequests` hook)
- **`messages`**: For creating command messages (from `useMessages` hook)
- **`channels`**: For creating and managing reply channels (from `useChannels` hook)

**Example:**
```javascript
subsystem
  .use(useRequests)   // Required for command execution
  .use(useMessages)   // Required for message creation
  .use(useChannels)   // Required for channel management
  .use(useCommands)   // Can now use commands
  .build();
```

## Configuration

The `useCommands` hook does not read any configuration. It relies entirely on its required facets for functionality.

## Facet Methods

### `register(name, config)`

Register a named command with configuration options.

**Signature:**
```javascript
register(name, config) => Object
```

**Parameters:**
- `name` (string, required) - Logical command name (e.g., `'saveFile'`, `'createUser'`)
- `config` (Object, required) - Command configuration:
  - `path` (string, required) - The actual command destination path
  - `replyChannel` (string, optional) - Explicit reply channel route
  - `createChannel` (boolean, optional, default: `false`) - Automatically create a reply channel
  - `channelOptions` (Object, optional, default: `{}`) - Options for channel creation (if `createChannel` is true)
  - `timeout` (number, optional) - Default timeout for this command (for ResponseManager)
  - `meta` (Object, optional, default: `{}`) - Additional metadata for documentation/introspection

**Returns:** `Object` - Registration result with:
- `name` (string) - Command name
- `path` (string) - Command destination path
- `replyChannel` (string|null) - Reply channel route (if set)
- `timeout` (number|undefined) - Default timeout
- `meta` (Object) - Command metadata

**Throws:**
- `Error` - If name is not a non-empty string
- `Error` - If path is not provided or is not a non-empty string

**Behavior:**
- Stores command configuration in an in-memory registry
- If `createChannel` is `true` and `replyChannel` is not provided, automatically creates a channel named `command/${name}`
- Channel route is extracted from the created Channel object's `.route` property

**Example:**
```javascript
// Register command with explicit reply channel
subsystem.commands.register('saveFile', {
  path: 'storage://file/save',
  replyChannel: 'ui://channel/file-save-replies',
  timeout: 5000,
  meta: { description: 'Save a file to storage' }
});

// Register command with automatic channel creation
subsystem.commands.register('createUser', {
  path: 'auth://user/create',
  createChannel: true,
  channelOptions: {
    participants: [adminPkr],
    metadata: { description: 'User creation replies' }
  },
  timeout: 10000,
  meta: { description: 'Create a new user account' }
});
```

### `send(nameOrPath, payload, options)`

Send a command by name or direct path.

**Signature:**
```javascript
send(nameOrPath, payload, options) => Promise<any>
```

**Parameters:**
- `nameOrPath` (string, required) - Registered command name or direct command path
- `payload` (any, optional) - Command payload/data
- `options` (Object, optional, default: `{}`) - Send options:
  - `replyChannel` (string, optional) - Override reply channel (required if using direct path)
  - `timeout` (number, optional) - Override timeout
  - `meta` (Object, optional) - Additional metadata to merge with command metadata
  - `sendOptions` (Object, optional) - Additional options passed to `identity.sendProtected()`

**Returns:** `Promise<any>` - Promise that resolves with the command result (from RequestBuilder.send())

**Throws:**
- `Error` - If `replyChannel` is required but not provided
- `Error` - If command resolution fails

**Behavior:**
- If `nameOrPath` matches a registered command, uses its configuration
- If `nameOrPath` is a direct path, requires `replyChannel` in options
- Creates a command message using `messagesFacet.create()`
- Uses `requestsFacet.command()` to create a RequestBuilder
- Delegates to RequestBuilder for command execution via CommandManager
- CommandManager sends the message and waits for reply on the reply channel

**Example:**
```javascript
// Send using registered command name
const result = await subsystem.commands.send('saveFile', {
  filename: 'document.txt',
  content: 'Hello, world!'
});

// Send using direct path (requires replyChannel in options)
const result = await subsystem.commands.send('storage://file/save', {
  filename: 'document.txt',
  content: 'Hello, world!'
}, {
  replyChannel: 'ui://channel/file-save-replies',
  timeout: 5000
});

// Override timeout for registered command
const result = await subsystem.commands.send('createUser', {
  username: 'alice',
  email: 'alice@example.com'
}, {
  timeout: 15000 // Override default timeout
});
```

### `list()`

List all registered commands for introspection and tooling.

**Signature:**
```javascript
list() => Array<Object>
```

**Returns:** `Array<Object>` - Array of command configurations, each with:
- `name` (string) - Command name
- `path` (string) - Command destination path
- `replyChannel` (string|null) - Reply channel route (if set)
- `timeout` (number|undefined) - Default timeout
- `meta` (Object) - Command metadata

**Example:**
```javascript
const commands = subsystem.commands.list();
console.log('Registered commands:');
commands.forEach(cmd => {
  console.log(`  ${cmd.name}: ${cmd.path}`);
  if (cmd.meta.description) {
    console.log(`    ${cmd.meta.description}`);
  }
});
```

## Usage Patterns

### Basic Command Registration and Execution

```javascript
import { BaseSubsystem } from './base-subsystem/base.subsystem.mycelia.js';
import { useCommands } from './hooks/commands/use-commands.mycelia.js';
import { useRequests } from './hooks/requests/use-requests.mycelia.js';
import { useMessages } from './hooks/messages/use-messages.mycelia.js';
import { useChannels } from './hooks/channels/use-channels.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

subsystem
  .use(useRequests)
  .use(useMessages)
  .use(useChannels)
  .use(useCommands)
  .build();

// Register a command
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  createChannel: true,
  timeout: 10000,
  meta: { description: 'Process data asynchronously' }
});

// Send the command
const result = await subsystem.commands.send('processData', {
  data: [1, 2, 3, 4, 5],
  operation: 'sum'
});
```

### Command with Explicit Reply Channel

```javascript
// Create a reply channel manually
const replyChannel = subsystem.channels.create('data-processing-replies', {
  participants: [clientPkr],
  metadata: { description: 'Data processing replies' }
});

// Register command with explicit channel
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  replyChannel: replyChannel.route,
  timeout: 10000
});

// Send command
const result = await subsystem.commands.send('processData', {
  data: [1, 2, 3, 4, 5]
});
```

### Direct Path Commands

```javascript
// Send command using direct path (no registration needed)
const result = await subsystem.commands.send('processor://data/process', {
  data: [1, 2, 3, 4, 5]
}, {
  replyChannel: 'ui://channel/data-replies',
  timeout: 5000
});
```

### Command Introspection

```javascript
// List all registered commands
const commands = subsystem.commands.list();

// Generate documentation
console.log('# Available Commands\n');
commands.forEach(cmd => {
  console.log(`## ${cmd.name}`);
  console.log(`- Path: ${cmd.path}`);
  if (cmd.replyChannel) {
    console.log(`- Reply Channel: ${cmd.replyChannel}`);
  }
  if (cmd.timeout) {
    console.log(`- Timeout: ${cmd.timeout}ms`);
  }
  if (cmd.meta.description) {
    console.log(`- Description: ${cmd.meta.description}`);
  }
  console.log('');
});
```

## Integration with CommandManager

The `useCommands` hook integrates with the `CommandManager` from the `useRequests` hook:

1. **Command Execution**: Uses `requestsFacet.command()` to create a RequestBuilder
2. **Channel-Based Replies**: Commands use channels for replies (not temporary routes)
3. **Timeout Handling**: Timeouts are handled by ResponseManagerSubsystem (not locally)
4. **Promise Resolution**: RequestBuilder.send() returns a Promise that resolves when the first reply arrives on the reply channel

## Command vs Query

Commands and queries serve different purposes:

- **Commands**: Asynchronous operations that may take time, use channels for replies, fire-and-forget semantics
- **Queries**: Synchronous read-only operations, use one-shot requests, immediate response

**When to use Commands:**
- Long-running operations
- Operations that may fail and need timeout handling
- Operations where you want to handle replies asynchronously
- Operations that don't need immediate response

**When to use Queries:**
- Read-only operations
- Operations that need immediate response
- Simple data retrieval
- Operations that should bypass the queue

## Error Handling

Commands handle errors through the RequestBuilder and CommandManager:

- **Send Errors**: If sending the command fails, the Promise is rejected immediately
- **Timeout Errors**: Handled by ResponseManagerSubsystem, which sends a synthetic error response
- **Reply Errors**: Errors in command processing are returned as error responses on the reply channel

**Example:**
```javascript
try {
  const result = await subsystem.commands.send('processData', { data: [1, 2, 3] });
  // Handle success
} catch (error) {
  // Handle send error (command never reached destination)
  console.error('Failed to send command:', error);
}

// For timeout/processing errors, check the response message
const response = await subsystem.commands.send('processData', { data: [1, 2, 3] });
if (response.meta?.isResponse && !response.meta?.success) {
  // Handle command processing error
  console.error('Command failed:', response.body?.error);
}
```

## Best Practices

1. **Use Named Commands**: Register commands with logical names for better ergonomics
2. **Automatic Channel Creation**: Use `createChannel: true` for simple cases, explicit channels for complex scenarios
3. **Set Timeouts**: Always set appropriate timeouts for commands
4. **Metadata**: Add descriptive metadata for introspection and tooling
5. **Error Handling**: Always handle both send errors and command processing errors
6. **Channel Management**: Ensure reply channels are properly set up before sending commands

## See Also

- [Commands Guide](../../communication/COMMANDS.md) - Detailed command communication patterns
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [useRequests](./requests/USE-REQUESTS.md) - Request/response functionality
- [useMessages](./messages/USE-MESSAGES.md) - Message creation
- [useChannels](./channels/USE-CHANNELS.md) - Channel management
- [useQueries](./queries/USE-QUERIES.md) - Query functionality (synchronous read operations)
- [CommandManager](./requests/COMMAND-MANAGER.md) - Command execution details
- [RequestBuilder](./requests/REQUEST-BUILDER.md) - Request builder API

