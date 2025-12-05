# Message Factory

## Overview

The **MessageFactory** class provides a centralized factory for creating messages with configurable options. It handles all message creation logic including metadata building, ID generation, and transaction management.

## What is MessageFactory?

MessageFactory is a static utility class that:
- **Creates messages**: Provides a unified API for creating messages of all types
- **Generates IDs**: Creates unique message, transaction, and sender IDs
- **Builds metadata**: Constructs appropriate metadata based on message type
- **Manages transactions**: Supports transaction batch creation

## Creating Messages

### Basic Message Creation

```javascript
import { MessageFactory } from './models/message/message-factory.mycelia.js';

// Simple message
const msg = MessageFactory.create('canvas://layers/create', { name: 'background' });
```

### Message with Options

```javascript
// Atomic message
const atomicMsg = MessageFactory.create('command://save', { file: 'data.json' }, { 
  type: 'atomic' 
});

// Retry message
const retryMsg = MessageFactory.create('api://fetch', { url: '...' }, { 
  type: 'retry',
  maxRetries: 5 
});
```

## MessageFactory.create()

### Signature

```javascript
MessageFactory.create(path, body, options = {})
```

### Parameters

- `path` (string) - The message path in format `'subsystem://path/to/resource'`
- `body` (any) - The message payload/data
- `options` (Object, default: `{}`) - Creation options
  - `type` (string, default: `'simple'`) - Message type: `'simple'`, `'atomic'`, `'batch'`, `'query'`, `'retry'`, `'transaction'`, `'command'`
  - `meta` (Object, default: `{}`) - Message metadata
  - `maxRetries` (number) - Max retries (for retry type)
  - `transaction` (string) - Transaction ID (for transaction type)
  - `seq` (number) - Sequence number (for transaction type)
  - `generateTransactionId` (boolean, default: `false`) - Auto-generate transaction ID if not provided

### Returns

Returns a message data object with:
- `id` (string) - Unique message ID
- `path` (string) - Message path
- `body` (any) - Message body
- `meta` (MessageMetadata) - MessageMetadata instance

**Note:** This returns a data object, not a Message instance. Use `Message.create()` or `new Message()` to create Message instances.

### Examples

#### Simple Message

```javascript
const msgData = MessageFactory.create('canvas://layers/create', { name: 'background' });
```

#### Atomic Message

```javascript
const atomicMsgData = MessageFactory.create('command://save', { file: 'data.json' }, { 
  type: 'atomic' 
});
```

#### Retry Message

```javascript
const retryMsgData = MessageFactory.create('api://fetch', { url: '...' }, { 
  type: 'retry',
  maxRetries: 5 
});
```

#### Transaction Message

```javascript
// With explicit transaction ID
const txMsgData = MessageFactory.create('command://execute', { cmd: 'save' }, { 
  type: 'transaction',
  transaction: 'tx_123',
  seq: 1 
});

// With auto-generated transaction ID
const autoTxMsgData = MessageFactory.create('command://execute', { cmd: 'save' }, { 
  type: 'transaction',
  generateTransactionId: true,
  seq: 1 
});
```

#### Query Message

```javascript
// Auto-detected from path
const queryMsgData = MessageFactory.create('error://query/get-errors', { filters: {} });

// OR explicitly
const queryMsgData2 = MessageFactory.create('error://query/get-errors', { filters: {} }, { 
  type: 'query' 
});
```

#### Command Message

```javascript
const cmdMsgData = MessageFactory.create('command://execute', { action: 'save' }, { 
  type: 'command' 
});
// cmdMsgData.meta.type = 'command'
// cmdMsgData.meta.senderId = 'sender_1703123456789_abc123' (auto-generated)
```

## ID Generation Methods

### `generateId()`

Generate a unique message ID.

**Signature:**
```javascript
MessageFactory.generateId(): string
```

**Returns:**
- Unique message ID in format `'msg_timestamp_random'`

**Example:**
```javascript
const id = MessageFactory.generateId();
console.log(id); // "msg_1703123456789_abc123def"
```

### `generateTransactionId()`

Generate a unique transaction ID.

**Signature:**
```javascript
MessageFactory.generateTransactionId(): string
```

**Returns:**
- Unique transaction ID in format `'tx_timestamp_random'`

**Example:**
```javascript
const txId = MessageFactory.generateTransactionId();
console.log(txId); // "tx_1703123456789_abc123def"
```

### `generateSenderId()`

Generate a unique sender ID (private method, used internally).

**Signature:**
```javascript
MessageFactory.generateSenderId(): string
```

**Returns:**
- Unique sender ID in format `'sender_timestamp_random'`

**Note:** This is a private method. Use `acquireSenderId()` for public access.

### `acquireSenderId()`

Public API for acquiring a unique sender ID before creating command messages.

**Signature:**
```javascript
MessageFactory.acquireSenderId(): string
```

**Returns:**
- Unique sender ID in format `'sender_timestamp_random'`

**Example:**
```javascript
// Acquire sender ID before creating commands
const senderId = MessageFactory.acquireSenderId();
console.log('Acquired sender ID:', senderId);

// Later, create command messages (senderId will be auto-generated anyway)
const cmd = MessageFactory.create('command://execute', { action: 'save' }, { 
  type: 'command' 
});
```

**Use Case:**
- Track sender ID before creating commands
- Store sender ID for later reference
- Note: Command messages auto-generate senderId regardless

## Transaction Batch Creation

### `createTransactionBatch()`

Create multiple messages with the same transaction ID.

**Signature:**
```javascript
MessageFactory.createTransactionBatch(messageSpecs, globalOptions = {})
```

**Parameters:**
- `messageSpecs` (Array) - Array of `{path, body, options}` objects
- `globalOptions` (Object, default: `{}`) - Global options applied to all messages

**Returns:**
- Array of message data objects, all sharing the same transaction ID

**Example:**
```javascript
// Create multiple messages in a transaction
const messages = MessageFactory.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } },
  { path: 'event://saved', body: { file: 'data.json' } }
]);

// All messages share the same transaction ID
messages.forEach((msg, index) => {
  console.log(msg.meta.getTransaction()); // Same transaction ID
  console.log(msg.meta.getSeq()); // 1, 2, 3
});
```

**Transaction Batch with Global Options:**
```javascript
const batchMessages = MessageFactory.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } }
], { 
  meta: { priority: 'high' },
  type: 'atomic' 
});
```

**Characteristics:**
- All messages share the same transaction ID (auto-generated)
- Each message gets a sequential number (1, 2, 3, ...)
- Global options are applied to all messages
- If `type: 'atomic'` is specified in global options, all messages are marked as atomic

## Internal Methods

### `buildMetadata()`

Build metadata based on message type and options (private method).

**Signature:**
```javascript
MessageFactory.buildMetadata(type, meta, options): MessageMetadata
```

**Parameters:**
- `type` (string) - Message type
- `meta` (Object) - Base metadata
- `options` (Object) - Type-specific options

**Returns:**
- MessageMetadata instance

**Note:** This is an internal method used by `create()`. It uses `buildMessageMetadata()` from `message-metadata.utils.mycelia.js`.

## Message Type Handling

MessageFactory handles different message types with specific behaviors:

### Simple Messages
- Default type
- Auto-detects query messages from path pattern `subsystem://query/operation`

### Atomic Messages
- Sets `isAtomic: true` in metadata
- Must be processed completely or not at all

### Batch Messages
- Sets `batch: true` in metadata
- Body typically contains multiple operations

### Query Messages
- Sets `isQuery: true` in metadata
- Auto-detected from path or explicitly specified

### Retry Messages
- Sets `maxRetries` from options
- Tracks retry attempts

### Transaction Messages
- Sets `transaction` and `seq` from options
- Can preserve `isAtomic` flag if specified in meta

### Command Messages
- Auto-generates `senderId`
- Sets `isCommand: true` in metadata
- Ignores any `senderId` provided in meta (ensures uniqueness)

### Error Messages
- Sets `isError: true` in metadata

## Best Practices

1. **Use Message.create() instead**: For most use cases, use `Message.create()` which internally uses MessageFactory

2. **Use transaction batches for related operations**: Use `createTransactionBatch()` for operations that should be grouped

3. **Let command messages auto-generate senderId**: Don't manually set senderId for command messages

4. **Use generateTransactionId for transactions**: Use `generateTransactionId: true` or `createTransactionBatch()` for transaction management

5. **Specify maxRetries for retry messages**: Always specify `maxRetries` for retry type messages

## Common Patterns

### Pattern: Simple Message Creation

```javascript
const msgData = MessageFactory.create('canvas://layers/create', { 
  name: 'background' 
});
```

### Pattern: Atomic Operation

```javascript
const atomicMsgData = MessageFactory.create('command://save', { 
  file: 'project.json',
  data: projectData 
}, { 
  type: 'atomic' 
});
```

### Pattern: Transaction Batch

```javascript
const messages = MessageFactory.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } },
  { path: 'event://saved', body: { file: 'data.json' } }
], {
  type: 'atomic'  // All messages in transaction are atomic
});
```

### Pattern: Retry Message

```javascript
const retryMsgData = MessageFactory.create('api://fetch', { 
  url: 'https://api.example.com/data' 
}, { 
  type: 'retry',
  maxRetries: 5 
});
```

## See Also

- [Message](./MESSAGE.md) - Learn about the Message class
- [Message Metadata](./MESSAGE-METADATA.md) - Learn about MessageMetadata
- [Message Metadata Utils](./MESSAGE-METADATA-UTILS.md) - Learn about metadata building utilities







