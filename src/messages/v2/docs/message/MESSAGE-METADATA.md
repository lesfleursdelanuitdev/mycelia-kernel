# Message Metadata

## Overview

The **MessageMetadata** class encapsulates message metadata with separation between fixed (immutable) and mutable data. Fixed metadata is frozen at creation and cannot be altered, while mutable metadata can be updated during message processing lifecycle.

## What is Message Metadata?

MessageMetadata separates metadata into two categories:

### Fixed Metadata (Immutable)
- Creation-time data (timestamp, type, caller, transaction info)
- Configuration flags (isAtomic, isBatch, isQuery, isCommand, isError)
- Maximum retries allowed
- Sender ID (for command messages)

### Mutable Metadata (Editable)
- Runtime state (retries, queryResult)
- Processing state flags

## Creating Message Metadata

### Constructor

```javascript
import { MessageMetadata } from './models/message/message-metadata.mycelia.js';

const fixed = {
  timestamp: Date.now(),
  type: 'command',
  isCommand: true,
  maxRetries: 5,
  caller: 'canvas'
};

const mutable = { retries: 0 };

const meta = new MessageMetadata(fixed, mutable);
```

### Signature

```javascript
new MessageMetadata(fixedMeta, mutableMeta = {})
```

### Parameters

- `fixedMeta` (Object, required) - Fixed (immutable) metadata
- `mutableMeta` (Object, default: `{}`) - Mutable metadata

### Fixed Metadata Fields

- `timestamp` (number) - Creation timestamp
- `type` (string) - Message type: `'simple'`, `'atomic'`, `'batch'`, `'query'`, `'retry'`, `'transaction'`, `'command'`, `'error'`
- `maxRetries` (number) - Maximum retries allowed
- `isAtomic` (boolean) - Whether message is atomic
- `batch` (boolean) - Whether message is a batch
- `isQuery` (boolean) - Whether message is a query
- `isCommand` (boolean) - Whether message is a command
- `isError` (boolean) - Whether message is an error
- `transaction` (string|null) - Transaction ID
- `seq` (number|null) - Sequence number (for transaction messages)
- `senderId` (string|null) - Sender ID (auto-generated for command messages)
- `caller` (string|null) - Subsystem name that created/sent the message

### Mutable Metadata Fields

- `retries` (number) - Current retry count
- `queryResult` (any) - Query result (for query messages)

## Accessing Fixed Metadata

### `getTimestamp()`

Get creation timestamp.

```javascript
const timestamp = meta.getTimestamp(); // 1703123456789
```

### `getSenderId()`

Get sender ID (for command messages).

```javascript
const senderId = meta.getSenderId(); // "sender_1703123456789_abc123" or null
```

### `getTransaction()`

Get transaction ID.

```javascript
const txId = meta.getTransaction(); // "tx_123" or null
```

### `getSeq()`

Get sequence number (for transaction messages).

```javascript
const seq = meta.getSeq(); // 1 or null
```

### `getType()`

Get message type.

```javascript
const type = meta.getType(); // "command"
```

### `getMaxRetries()`

Get maximum retries allowed.

```javascript
const maxRetries = meta.getMaxRetries(); // 5
```

### `getCaller()`

Get caller subsystem name.

```javascript
const caller = meta.getCaller(); // "canvas" or null
```

### `getCustomField(fieldName)`

Get a custom field from fixed metadata. Allows access to custom fields that were added to fixed metadata during creation but don't have dedicated getter methods (e.g., `replyTo`, `replyPath`, `correlationId`).

```javascript
// If replyTo was set during message creation:
const replyTo = meta.getCustomField('replyTo'); // "subsystem://replies" or undefined
const correlationId = meta.getCustomField('correlationId'); // "msg_123" or undefined
```

**Parameters:**
- `fieldName` (string, required) - Field name to retrieve

**Returns:**
- Field value or `undefined` if not found

**Note:** Custom fields must be added to the `meta` parameter when creating the message. They become part of fixed metadata and cannot be modified after creation.

## Type Checking Methods

### `isAtomic()`

Check if message is atomic.

```javascript
if (meta.isAtomic()) {
  // Message must be processed completely or not at all
}
```

### `isBatch()`

Check if message is a batch.

```javascript
if (meta.isBatch()) {
  // Message contains multiple operations
}
```

### `isQuery()`

Check if message is a query.

```javascript
if (meta.isQuery()) {
  // Read-only operation
}
```

### `isCommand()`

Check if message is a command.

```javascript
if (meta.isCommand()) {
  // Write operation with senderId
}
```

### `isError()`

Check if message is an error.

```javascript
if (meta.isError()) {
  // Error message
}
```

## Managing Mutable Metadata

### Retry Management

#### `getRetries()`

Get current retry count.

```javascript
const retries = meta.getRetries(); // 2
```

#### `setRetries(count)`

Set retry count.

```javascript
meta.setRetries(3);
```

**Throws:**
- `Error` if count is not a non-negative number

#### `incrementRetry()`

Increment retry count. Returns `true` if can retry, `false` if max reached.

```javascript
const canRetry = meta.incrementRetry(); // true or false
```

**Returns:**
- `true` if `retries <= maxRetries`
- `false` if `retries > maxRetries`

#### `resetRetries()`

Reset retry count to 0.

```javascript
meta.resetRetries();
```

### Query Result Management

#### `getQueryResult()`

Get query result.

```javascript
const result = meta.getQueryResult(); // { data: [...] } or null
```

#### `setQueryResult(result)`

Set query result.

```javascript
meta.setQueryResult({ data: [1, 2, 3] });
```

### Bulk Updates

#### `updateMutable(updates)`

Update multiple mutable metadata fields at once.

```javascript
meta.updateMutable({
  retries: 1,
  queryResult: { data: [...] }
});
```

**Throws:**
- `Error` if updates is not an object

### Custom Mutable Field Access

#### `getCustomMutableField(fieldName)`

Get a custom field from mutable metadata. Allows access to custom fields that were added to mutable metadata during processing (e.g., `replyPath` stored by request-core).

```javascript
// If replyPath was stored in mutable metadata:
const replyPath = meta.getCustomMutableField('replyPath'); // "subsystem://replies" or undefined
```

**Parameters:**
- `fieldName` (string, required) - Field name to retrieve

**Returns:**
- Field value or `undefined` if not found

**Note:** Custom mutable fields can be added using `updateMutable()` or by directly setting properties on the mutable metadata object.

## Serialization

### `toJSON()`

Serialize metadata to JSON.

```javascript
const json = meta.toJSON();
// {
//   fixed: { timestamp: 1703123456789, type: 'command', ... },
//   mutable: { retries: 0, queryResult: null }
// }
```

### `fromJSON(json)`

Create MessageMetadata from JSON.

```javascript
const json = {
  fixed: { timestamp: 1703123456789, type: 'command' },
  mutable: { retries: 0 }
};

const meta = MessageMetadata.fromJSON(json);
```

**Throws:**
- `Error` if json is not an object

## Cloning

### `clone(mutableUpdates = {})`

Clone metadata with optional mutable updates.

```javascript
// Clone with same mutable state
const cloned = meta.clone();

// Clone with updated mutable state
const clonedWithUpdates = meta.clone({ retries: 1 });
```

**Parameters:**
- `mutableUpdates` (Object, default: `{}`) - Updates to apply to mutable metadata in clone

**Returns:**
- New MessageMetadata instance with same fixed metadata and updated mutable metadata

## Immutability

### Fixed Metadata

Fixed metadata is **frozen** and cannot be modified after creation:

```javascript
const meta = new MessageMetadata(
  { timestamp: Date.now(), type: 'simple' },
  { retries: 0 }
);

// This will fail silently or throw in strict mode
meta.getTimestamp = () => 0; // Cannot modify
```

### Mutable Metadata

Mutable metadata can be updated:

```javascript
// These work
meta.incrementRetry(); // OK
meta.setQueryResult({ data: [...] }); // OK
meta.updateMutable({ retries: 1 }); // OK
```

## Best Practices

1. **Don't modify fixed metadata**: Fixed metadata is immutable for a reason - it represents creation-time state

2. **Use incrementRetry() for retries**: Use `incrementRetry()` instead of manually incrementing to check max retries

3. **Set query results on query messages**: Use `setQueryResult()` for query messages to attach results

4. **Use updateMutable() for bulk updates**: Use `updateMutable()` when updating multiple mutable fields

5. **Clone when needed**: Use `clone()` when you need a copy with different mutable state

## Common Patterns

### Pattern: Retry Tracking

```javascript
const meta = new MessageMetadata(
  { type: 'retry', maxRetries: 5 },
  { retries: 0 }
);

// Process message
try {
  await processMessage();
} catch (error) {
  if (meta.incrementRetry()) {
    // Can retry
    await retryMessage();
  } else {
    // Max retries reached
    console.error('Max retries reached');
  }
}
```

### Pattern: Query Result

```javascript
const meta = new MessageMetadata(
  { type: 'query', isQuery: true },
  { queryResult: null }
);

// Process query
const result = await executeQuery();

// Set result
meta.setQueryResult(result);
```

### Pattern: Cloning with Updates

```javascript
const original = new MessageMetadata(
  { type: 'simple' },
  { retries: 0 }
);

// Clone with updated retries
const updated = original.clone({ retries: 1 });
```

## See Also

- [Message](./MESSAGE.md) - Learn about the Message class that uses MessageMetadata
- [Message Factory](./MESSAGE-FACTORY.md) - Learn about message creation
- [Message Metadata Utils](./MESSAGE-METADATA-UTILS.md) - Learn about metadata building utilities




