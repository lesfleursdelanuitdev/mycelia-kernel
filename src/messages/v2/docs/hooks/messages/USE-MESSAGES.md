# useMessages Hook

## Overview

The `useMessages` hook provides message creation functionality to subsystems using `MessageFactory`. It exposes convenient methods for creating different types of messages (simple, atomic, batch, query, command, transaction, retry, error) and automatically adds caller metadata to messages.

**Key Features:**
- **Message Creation**: Create messages of various types with convenient methods
- **Automatic Caller Metadata**: Automatically adds subsystem name as caller in message metadata
- **MessageFactory Integration**: Uses MessageFactory for all message creation
- **ID Generation**: Generate unique message IDs, transaction IDs, and sender IDs
- **Transaction Batches**: Create multiple messages in a transaction batch
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'messages',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'messages'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing messages facet
- **`required`**: `[]` - No dependencies (standalone hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.messages`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.messages`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    messages: {
      debug: true
    }
  }
});
```

## Automatic Caller Metadata

The hook automatically adds the subsystem name as `caller` in message metadata if not already provided:

```javascript
// Automatically adds caller: 'my-subsystem' to metadata
const message = subsystem.messages.create('canvas://layers/create', { name: 'background' });
// message.meta.caller === 'my-subsystem'
```

This helps track which subsystem created each message for debugging and tracing purposes.

## Facet Methods

### `create(path, body, options)`

Create a message with configurable options.

**Signature:**
```javascript
create(path, body, options = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path in format `'subsystem://path/to/resource'`
- `body` (any, required) - Message payload/data
- `options` (object, optional) - Creation options:
  - `type` (string, default: `'simple'`) - Message type: `'simple'`, `'atomic'`, `'batch'`, `'query'`, `'retry'`, `'transaction'`, `'command'`, `'error'`
  - `meta` (object, default: `{}`) - Message metadata (caller is automatically added if not present)
  - `maxRetries` (number) - Max retries (for retry type)
  - `transaction` (string) - Transaction ID (for transaction type)
  - `seq` (number) - Sequence number (for transaction type)
  - `generateTransactionId` (boolean, default: `false`) - Auto-generate transaction ID if not provided

**Returns:** `Message` - New message instance

**Example:**
```javascript
// Simple message
const msg = subsystem.messages.create('canvas://layers/create', { name: 'background' });

// Atomic message
const atomicMsg = subsystem.messages.create('command://save', { file: 'project.json' }, {
  type: 'atomic'
});

// Message with custom metadata
const customMsg = subsystem.messages.create('api://users/create', { name: 'John' }, {
  type: 'command',
  meta: { priority: 'high' }
});
```

### `createSimple(path, body, meta)`

Create a simple message.

**Signature:**
```javascript
createSimple(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Message body
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New simple message

**Example:**
```javascript
const message = subsystem.messages.createSimple('canvas://layers/create', { 
  name: 'background',
  type: 'image'
});
```

### `createAtomic(path, body, meta)`

Create an atomic message (must be processed completely or not at all).

**Signature:**
```javascript
createAtomic(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Message body
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New atomic message

**Example:**
```javascript
const atomicMessage = subsystem.messages.createAtomic('command://save', {
  file: 'project.json',
  data: projectData
});
```

### `createBatch(path, body, meta)`

Create a batch message (contains multiple operations).

**Signature:**
```javascript
createBatch(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Message body (should be array)
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New batch message

**Example:**
```javascript
const batchMessage = subsystem.messages.createBatch('patch://update', [
  { op: 'add', path: '/layers/0', value: layer1 },
  { op: 'add', path: '/layers/1', value: layer2 },
  { op: 'remove', path: '/layers/2' }
]);
```

### `createQuery(path, body, meta)`

Create a query message (processed synchronously).

**Signature:**
```javascript
createQuery(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Query parameters
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New query message

**Example:**
```javascript
const queryMessage = subsystem.messages.createQuery('query://layers/list', {
  filter: { type: 'image' },
  limit: 10
});

// Query messages are processed immediately (synchronously)
const result = await subsystem.accept(queryMessage);
```

### `createCommand(path, body, meta)`

Create a command message (with auto-generated senderId).

**Signature:**
```javascript
createCommand(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Command data
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New command message

**Example:**
```javascript
const commandMessage = subsystem.messages.createCommand('command://save', {
  file: 'project.json',
  data: projectData
});

// Command messages automatically get a senderId
```

### `createTransaction(path, body, transactionId, seq, meta)`

Create a transaction message (part of a transaction sequence).

**Signature:**
```javascript
createTransaction(path, body, transactionId = null, seq = null, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Message body
- `transactionId` (string, optional) - Transaction ID (auto-generated if not provided)
- `seq` (number, optional) - Sequence number
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New transaction message

**Example:**
```javascript
// Transaction with auto-generated ID
const txMessage1 = subsystem.messages.createTransaction('command://save', { file: 'data.json' });
const txId = txMessage1.meta.getTransaction();

// Transaction with explicit ID and sequence
const txMessage2 = subsystem.messages.createTransaction('command://backup', { file: 'data.json' }, txId, 2);
const txMessage3 = subsystem.messages.createTransaction('command://notify', { file: 'data.json' }, txId, 3);
```

### `createRetry(path, body, maxRetries, meta)`

Create a retry message (with retry logic).

**Signature:**
```javascript
createRetry(path, body, maxRetries = 3, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Message body
- `maxRetries` (number, default: `3`) - Maximum retries
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New retry message

**Example:**
```javascript
const retryMessage = subsystem.messages.createRetry('api://external/call', {
  endpoint: 'https://api.example.com/data',
  payload: data
}, 5); // Max 5 retries
```

### `createError(path, body, meta)`

Create an error message.

**Signature:**
```javascript
createError(path, body, meta = {}) => Message
```

**Parameters:**
- `path` (string, required) - Message path
- `body` (any, required) - Error details
- `meta` (object, optional) - Additional metadata

**Returns:** `Message` - New error message

**Example:**
```javascript
const errorMessage = subsystem.messages.createError('error://processing/failed', {
  error: 'Validation failed',
  details: { field: 'name', reason: 'required' }
});
```

### `createTransactionBatch(specs, globalOptions)`

Create multiple messages in a transaction batch (all share the same transaction ID).

**Signature:**
```javascript
createTransactionBatch(specs, globalOptions = {}) => Array<Message>
```

**Parameters:**
- `specs` (Array<Object>, required) - Array of message specifications:
  - `path` (string, required) - Message path
  - `body` (any, required) - Message body
  - `options` (object, optional) - Per-message options
- `globalOptions` (object, optional) - Global options applied to all messages:
  - `type` (string) - Message type for all messages
  - `meta` (object) - Global metadata (caller is automatically added)

**Returns:** `Array<Message>` - Array of message instances (all share the same transaction ID)

**Example:**
```javascript
const messages = subsystem.messages.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } },
  { path: 'command://notify', body: { recipients: ['admin'] } }
]);

// All messages share the same transaction ID
const txId = messages[0].meta.getTransaction();
console.log('Transaction ID:', txId);
messages.forEach((msg, idx) => {
  console.log(`Message ${idx + 1} transaction:`, msg.meta.getTransaction()); // Same ID
  console.log(`Message ${idx + 1} sequence:`, msg.meta.getSeq()); // 1, 2, 3
});
```

### `generateId()`

Generate a unique message ID.

**Signature:**
```javascript
generateId() => string
```

**Returns:** `string` - Unique message ID in format `'msg_<timestamp>_<random>'`

**Example:**
```javascript
const messageId = subsystem.messages.generateId();
console.log('Message ID:', messageId);
// 'msg_1703123456789_abc123def'
```

### `generateTransactionId()`

Generate a unique transaction ID.

**Signature:**
```javascript
generateTransactionId() => string
```

**Returns:** `string` - Unique transaction ID in format `'tx_<timestamp>_<random>'`

**Example:**
```javascript
const txId = subsystem.messages.generateTransactionId();
console.log('Transaction ID:', txId);
// 'tx_1703123456789_abc123def'
```

### `acquireSenderId()`

Acquire a unique sender ID.

**Signature:**
```javascript
acquireSenderId() => string
```

**Returns:** `string` - Unique sender ID

**Example:**
```javascript
const senderId = subsystem.messages.acquireSenderId();
console.log('Sender ID:', senderId);
```

## Usage Patterns

### Basic Message Creation

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useMessages } from './hooks/messages/use-messages.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
})
  .use(useMessages);

await subsystem.build();

// Create simple message
const message = subsystem.messages.createSimple('canvas://layers/create', {
  name: 'background',
  type: 'image'
});
```

### Different Message Types

```javascript
// Simple message
const simple = subsystem.messages.createSimple('api://users/create', { name: 'John' });

// Atomic message (all-or-nothing)
const atomic = subsystem.messages.createAtomic('command://save', { file: 'data.json' });

// Batch message (multiple operations)
const batch = subsystem.messages.createBatch('patch://update', [op1, op2, op3]);

// Query message (synchronous)
const query = subsystem.messages.createQuery('query://users/list', { filter: { active: true } });

// Command message (with senderId)
const command = subsystem.messages.createCommand('command://process', { data: data });

// Transaction message
const tx = subsystem.messages.createTransaction('command://save', { file: 'data.json' });

// Retry message
const retry = subsystem.messages.createRetry('api://external/call', { endpoint: '...' }, 5);

// Error message
const error = subsystem.messages.createError('error://validation/failed', { field: 'name' });
```

### Transaction Batches

```javascript
// Create multiple messages in a transaction
const messages = subsystem.messages.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } },
  { path: 'command://notify', body: { recipients: ['admin'] } }
], {
  type: 'command',
  meta: { priority: 'high' }
});

// All messages share the same transaction ID
const txId = messages[0].meta.getTransaction();
console.log('Transaction ID:', txId);

// Send all messages
for (const msg of messages) {
  await subsystem.accept(msg);
}
```

### ID Generation

```javascript
// Generate message ID
const messageId = subsystem.messages.generateId();

// Generate transaction ID
const txId = subsystem.messages.generateTransactionId();

// Acquire sender ID
const senderId = subsystem.messages.acquireSenderId();
```

### With Custom Metadata

```javascript
// Create message with custom metadata
const message = subsystem.messages.create('api://users/create', { name: 'John' }, {
  type: 'command',
  meta: {
    priority: 'high',
    source: 'admin-panel',
    timestamp: Date.now()
  }
});

// Caller is automatically added if not present
console.log(message.meta.caller); // 'my-subsystem'
```

## Automatic Caller Metadata

The hook automatically adds the subsystem name as `caller` in message metadata:

```javascript
// Automatically adds caller: 'my-subsystem'
const message = subsystem.messages.create('canvas://layers/create', { name: 'background' });
console.log(message.meta.caller); // 'my-subsystem'

// If caller is already provided, it's not overridden
const customMessage = subsystem.messages.create('canvas://layers/create', { name: 'background' }, {
  meta: { caller: 'custom-caller' }
});
console.log(customMessage.meta.caller); // 'custom-caller'
```

This helps with:
- **Tracing**: Track which subsystem created each message
- **Debugging**: Identify message sources in logs
- **Auditing**: Record message origins

## MessageFactory Integration

The hook uses `MessageFactory` internally for all message creation. All methods delegate to `MessageFactory.create()` or specialized factory methods, ensuring consistent message creation across the system.

**Note:** See [Message Factory Documentation](../../message/MESSAGE-FACTORY.md) for details on the underlying factory implementation.

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    messages: {
      debug: true
    }
  }
});
```

Debug messages include:
- Message creation with ID and type
- Transaction batch creation with count

## Dependencies

The `useMessages` hook has **no dependencies** - it can be used standalone without requiring other facets.

**Installation:**
The hook can be installed at any time, as it doesn't depend on other hooks.

## Integration with Other Hooks

### With Message Processor

Messages created with `useMessages` can be processed by `useMessageProcessor`:

```javascript
// Create message
const message = subsystem.messages.createCommand('canvas://layers/create', { name: 'background' });

// Accept and process
await subsystem.processor.accept(message);
```

### With Router

Messages created with `useMessages` are routed based on their path:

```javascript
// Create message with path
const message = subsystem.messages.create('canvas://layers/create', { name: 'background' });

// Message path determines routing
// 'canvas://layers/create' routes to 'canvas' subsystem
```

### With Queries

Query messages created with `useMessages` are processed synchronously:

```javascript
// Create query message
const query = subsystem.messages.createQuery('query://layers/list', { filter: { type: 'image' } });

// Query is processed immediately (synchronously)
const result = await subsystem.processor.accept(query);
```

## Best Practices

1. **Use Appropriate Message Types**: Choose the right message type for your use case
   - `simple` for basic messages
   - `atomic` for all-or-nothing operations
   - `batch` for multiple operations
   - `query` for synchronous queries
   - `command` for commands requiring sender tracking
   - `transaction` for transaction sequences
   - `retry` for operations that may need retries

2. **Use Transaction Batches**: Use `createTransactionBatch()` for related operations that should share a transaction ID

3. **Leverage Automatic Caller**: Let the hook automatically add caller metadata for tracing

4. **Generate IDs When Needed**: Use `generateId()`, `generateTransactionId()`, and `acquireSenderId()` when you need IDs outside of message creation

5. **Configure Debug**: Enable debug logging during development to track message creation

## Message Type Guidelines

### When to Use Each Type

- **Simple**: Default choice for most messages
- **Atomic**: When operation must complete entirely or not at all
- **Batch**: When sending multiple related operations together
- **Query**: When you need synchronous, immediate results
- **Command**: When you need sender tracking and command semantics
- **Transaction**: When messages are part of a transaction sequence
- **Retry**: When operation may fail and needs automatic retry logic
- **Error**: When reporting errors or exceptions

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [Message](./../../message/MESSAGE.md) - Message class for inter-subsystem communication
- [Message Factory](./../../message/MESSAGE-FACTORY.md) - Centralized factory for creating messages
- [Message Metadata](./../../message/MESSAGE-METADATA.md) - Message metadata with fixed and mutable data
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction





