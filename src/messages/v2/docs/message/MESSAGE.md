# Message Class

## Overview

The **Message** class is a simple, lightweight data container for inter-subsystem communication in a pure message-driven architecture. Messages are the fundamental unit of communication between subsystems and carry all necessary information for routing, processing, and tracing.

## What is a Message?

A Message encapsulates:
- **Path**: The message destination (e.g., `'canvas://layers/create'`)
- **Body**: The message payload/data
- **Metadata**: Information about the message (type, timestamp, transaction info, etc.)
- **ID**: Unique identifier for the message

## Creating Messages

### Basic Message Creation

```javascript
import { Message } from './models/message/message.mycelia.js';

// Simple message
const msg = new Message('canvas://layers/create', { name: 'background', type: 'image' });
```

### Using `Message.create()` (Recommended)

The `Message.create()` static method provides more options:

```javascript
// Simple message
const msg = Message.create('canvas://layers/create', { name: 'background' });

// Atomic message (must be processed completely or not at all)
const atomicMsg = Message.create('command://save', { file: 'project.json' }, { 
  type: 'atomic' 
});

// Batch message (contains multiple operations)
const batchMsg = Message.create('patch://update', [patch1, patch2, patch3], { 
  type: 'batch' 
});
```

## Message Constructor

### Signature

```javascript
new Message(pathOrData, body, meta = {})
```

### Parameters

- `pathOrData` (string|Object) - The message path OR a messageData object from MessageFactory
- `body` (any) - The message payload/data (ignored if pathOrData is an object)
- `meta` (Object, default: `{}`) - Message metadata (ignored if pathOrData is an object)

### Examples

**Basic Message:**
```javascript
const msg = new Message('canvas://layers/create', { name: 'background' });
```

**Message with Custom Metadata:**
```javascript
const msg = new Message('command://save', { file: 'data.json' }, {
  isAtomic: true,
  maxRetries: 5,
  id: 'custom-msg-123',
  transaction: 'tx_1703123456789_abc123def',
  seq: 1
});
```

**Note:** The constructor uses `MessageFactory` internally for creation logic. For specialized message types, consider using `Message.create()` with options.

## Message.create() Static Method

### Signature

```javascript
Message.create(path, body, options = {})
```

### Parameters

- `path` (string) - Message path in format `'subsystem://path/to/resource'`
- `body` (any) - Message payload/data
- `options` (Object) - Creation options
  - `type` (string, default: `'simple'`) - Message type: `'simple'`, `'atomic'`, `'batch'`, `'query'`, `'retry'`, `'transaction'`, `'command'`
  - `meta` (Object, default: `{}`) - Message metadata
  - `maxRetries` (number) - Max retries (for retry type)
  - `transaction` (string) - Transaction ID (for transaction type)
  - `seq` (number) - Sequence number (for transaction type)
  - `generateTransactionId` (boolean, default: `false`) - Auto-generate transaction ID if not provided

### Message Types

#### Simple Message

```javascript
const msg = Message.create('canvas://layers/create', { name: 'background' });
```

#### Atomic Message

```javascript
const atomicMsg = Message.create('command://save', { file: 'data.json' }, { 
  type: 'atomic' 
});
```

**Characteristics:**
- Must be processed completely or not at all
- No partial processing allowed

#### Batch Message

```javascript
const batchMsg = Message.create('patch://update', [patch1, patch2, patch3], { 
  type: 'batch' 
});
```

**Characteristics:**
- Contains multiple operations
- Body is typically an array

#### Query Message

```javascript
// Auto-detected from path
const queryMsg = Message.create('error://query/get-errors', { filters: {} });

// OR explicitly
const queryMsg2 = Message.create('error://query/get-errors', { filters: {} }, { 
  type: 'query' 
});
```

**Characteristics:**
- Auto-detected if path matches `subsystem://query/operation` pattern
- Read-only operations
- Can have query results attached

#### Command Message

```javascript
const cmdMsg = Message.create('command://execute', { action: 'save' }, { 
  type: 'command' 
});
console.log(cmdMsg.isCommand()); // true
console.log(cmdMsg.getSenderId()); // "sender_1703123456789_abc123" (auto-generated)
```

**Characteristics:**
- Auto-generates `senderId` for tracking
- Write operations

#### Retry Message

```javascript
const retryMsg = Message.create('api://fetch', { url: '...' }, { 
  type: 'retry',
  maxRetries: 5 
});
```

**Characteristics:**
- Tracks retry attempts
- Has maximum retry limit

#### Transaction Message

```javascript
const txMsg = Message.create('command://execute', { cmd: 'save' }, { 
  type: 'transaction',
  transaction: 'tx_123',
  seq: 1 
});
```

**Characteristics:**
- Part of a transaction sequence
- Has transaction ID and sequence number

## Message Properties

### Core Properties

- `id` (string) - Unique message identifier
- `path` (string) - Message destination path
- `body` (any) - Message payload/data
- `meta` (MessageMetadata) - Message metadata instance

## Message Methods

### Accessor Methods

#### `getId()`
Returns the message ID.

```javascript
const id = msg.getId(); // "msg_1703123456789_abc123"
```

#### `getPath()`
Returns the message path.

```javascript
const path = msg.getPath(); // "canvas://layers/create"
```

#### `getBody()`
Returns the message body.

```javascript
const body = msg.getBody(); // { name: 'background', type: 'image' }
```

#### `getMeta()`
Returns the MessageMetadata instance.

```javascript
const meta = msg.getMeta(); // MessageMetadata instance
```

### Type Checking Methods

#### `isAtomic()`
Check if message is atomic.

```javascript
if (msg.isAtomic()) {
  // Message must be processed completely or not at all
}
```

#### `isBatch()`
Check if message is a batch.

```javascript
if (msg.isBatch()) {
  // Message contains multiple operations
}
```

#### `isQuery()`
Check if message is a query.

```javascript
if (msg.isQuery()) {
  // Read-only operation
}
```

#### `isCommand()`
Check if message is a command.

```javascript
if (msg.isCommand()) {
  // Write operation with auto-generated senderId
}
```

#### `isError()`
Check if message is an error.

```javascript
if (msg.isError()) {
  // Error message
}
```

### Timestamp Methods

#### `getTimestamp()`
Get message creation timestamp.

```javascript
const timestamp = msg.getTimestamp(); // 1703123456789
```

### Retry Methods

#### `getRetries()`
Get current retry count.

```javascript
const retries = msg.getRetries(); // 2
```

#### `getMaxRetries()`
Get maximum retries allowed.

```javascript
const maxRetries = msg.getMaxRetries(); // 5
```

#### `incrementRetry()`
Increment retry count. Returns `true` if can retry, `false` if max reached.

```javascript
const canRetry = msg.incrementRetry(); // true or false
```

#### `resetRetries()`
Reset retry count to 0.

```javascript
msg.resetRetries();
```

### Query Methods

#### `getQueryResult()`
Get query result.

```javascript
const result = msg.getQueryResult(); // { data: [...] } or null
```

#### `setQueryResult(result)`
Set query result.

```javascript
msg.setQueryResult({ data: [1, 2, 3] });
```

### Transaction Methods

#### `getTransaction()`
Get transaction ID.

```javascript
const txId = msg.getTransaction(); // "tx_123" or null
```

#### `getSeq()`
Get sequence number.

```javascript
const seq = msg.getSeq(); // 1 or null
```

### Sender/Caller Methods

#### `getSenderId()`
Get sender ID (auto-generated for command messages).

```javascript
const senderId = msg.getSenderId(); // "sender_1703123456789_abc123" or null
```

#### `getCaller()`
Get caller subsystem name.

```javascript
const caller = msg.getCaller(); // "canvas" or null
```

### Metadata Update Methods

#### `updateMeta(updates)`
Update mutable metadata.

```javascript
msg.updateMeta({
  retries: 1,
  queryResult: { data: [...] }
});
```

## Static Methods

### `Message.create(path, body, options)`

Create a message with configurable options. See [Message.create() Static Method](#messagecreate-static-method) section above.

### `Message.fromJSON(json)`

Create a message from JSON representation.

```javascript
const json = {
  id: 'msg_123',
  path: 'canvas://layers/create',
  body: { name: 'background' },
  meta: {
    fixed: { timestamp: 1703123456789, type: 'simple' },
    mutable: { retries: 0 }
  }
};

const msg = Message.fromJSON(json);
```

### `message.clone()`

Clone the message.

```javascript
const cloned = msg.clone();
```

**Note:** Clones both the message and its metadata. Mutable metadata is cloned separately.

## Instance Methods

### `toJSON()`

Serialize message to JSON.

```javascript
const json = msg.toJSON();
// {
//   id: 'msg_123',
//   path: 'canvas://layers/create',
//   body: { name: 'background' },
//   meta: { fixed: {...}, mutable: {...} }
// }
```

### `toString()`

Get string representation.

```javascript
const str = msg.toString();
// "Message(msg_123, canvas://layers/create, {"name":"background"})"
```

## Message Path Format

Message paths follow the format:

```
subsystem://path/to/resource
```

**Examples:**
- `'canvas://layers/create'` - Create a layer in the canvas subsystem
- `'command://save'` - Save command
- `'error://query/get-errors'` - Query errors from error subsystem
- `'api://fetch'` - API fetch operation

## Message Lifecycle

1. **Creation**: Message is created with path, body, and optional metadata
2. **Acceptance**: Message is accepted by a subsystem via `subsystem.accept(message)`
3. **Queuing**: Message is placed in the queue (unless it's a query)
4. **Processing**: Message is processed by the subsystem
5. **Routing**: Message is routed to appropriate handler based on path
6. **Completion**: Handler processes the message and returns result

## Best Practices

1. **Use `Message.create()`**: Use the static factory method for better type handling

2. **Specify message types**: Always specify the message type when creating messages

3. **Use atomic messages for critical operations**: Use `type: 'atomic'` for operations that must complete fully

4. **Use transactions for multi-step operations**: Use `type: 'transaction'` with transaction IDs for related operations

5. **Set appropriate retry limits**: Use `maxRetries` for operations that may fail

6. **Use query messages for read operations**: Use `type: 'query'` for read-only operations

7. **Use command messages for write operations**: Use `type: 'command'` for write operations (auto-generates senderId)

## Common Patterns

### Pattern: Simple Message

```javascript
const msg = Message.create('canvas://layers/create', { 
  name: 'background',
  type: 'image' 
});
```

### Pattern: Atomic Operation

```javascript
const atomicMsg = Message.create('command://save', { 
  file: 'project.json',
  data: projectData 
}, { 
  type: 'atomic' 
});
```

### Pattern: Query with Result

```javascript
const queryMsg = Message.create('error://query/get-errors', { 
  filters: { level: 'error' } 
});

// Later, set result
queryMsg.setQueryResult({ errors: [...] });
```

### Pattern: Retry Message

```javascript
const retryMsg = Message.create('api://fetch', { 
  url: 'https://api.example.com/data' 
}, { 
  type: 'retry',
  maxRetries: 5 
});

// Process and retry if needed
if (failed) {
  if (retryMsg.incrementRetry()) {
    // Can retry
    await process(retryMsg);
  } else {
    // Max retries reached
    console.error('Max retries reached');
  }
}
```

### Pattern: Transaction Batch

```javascript
import { MessageFactory } from './models/message/message-factory.mycelia.js';

const messages = MessageFactory.createTransactionBatch([
  { path: 'command://save', body: { file: 'data.json' } },
  { path: 'command://backup', body: { file: 'data.json' } },
  { path: 'event://saved', body: { file: 'data.json' } }
]);

// All messages share the same transaction ID
messages.forEach((msg, index) => {
  console.log(msg.getTransaction()); // Same transaction ID
  console.log(msg.getSeq()); // 1, 2, 3
});
```

## See Also

- [Message Factory](./MESSAGE-FACTORY.md) - Learn about the MessageFactory class for creating messages
- [Message Metadata](./MESSAGE-METADATA.md) - Learn about MessageMetadata and how it works
- [Message Metadata Utils](./MESSAGE-METADATA-UTILS.md) - Learn about metadata building utilities

