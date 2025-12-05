# Message Metadata Utilities

## Overview

The **Message Metadata Utilities** provide helper functions for building message metadata based on type and options. These utilities are used internally by `MessageFactory` to construct appropriate metadata for different message types.

## What are Message Metadata Utilities?

The utilities module provides:
- **Metadata Building**: Function to build fixed and mutable metadata based on message type
- **Type Handlers**: Logic for handling different message types
- **Auto-detection**: Automatic detection of query messages from path patterns

## buildMessageMetadata()

### Signature

```javascript
buildMessageMetadata(type, meta, options, generateSenderId)
```

### Parameters

- `type` (string) - Message type: `'simple'`, `'atomic'`, `'batch'`, `'query'`, `'retry'`, `'transaction'`, `'command'`, `'error'`
- `meta` (Object) - Base metadata
- `options` (Object) - Type-specific options
  - `maxRetries` (number) - Max retries (for retry type)
  - `transaction` (string) - Transaction ID (for transaction type)
  - `seq` (number) - Sequence number (for transaction type)
  - `path` (string) - Message path (for auto-detection)
- `generateSenderId` (Function) - Function to generate sender ID

### Returns

Returns an object with:
- `fixedMeta` (Object) - Fixed (immutable) metadata
- `mutableMeta` (Object) - Mutable metadata

### Example

```javascript
import { buildMessageMetadata } from './models/message/message-metadata.utils.mycelia.js';

const { fixedMeta, mutableMeta } = buildMessageMetadata(
  'command',
  { caller: 'canvas' },
  { path: 'command://execute' },
  () => 'sender_123'
);

// fixedMeta contains: { timestamp, type: 'command', isCommand: true, senderId: 'sender_123', ... }
// mutableMeta contains: { retries: 0, queryResult: null }
```

## Message Type Handlers

The utility function includes type handlers for each message type:

### Simple Handler

**Type:** `'simple'`

**Behavior:**
- Sets base metadata
- Auto-detects query messages from path pattern `subsystem://query/operation`
- Sets `isQuery: true` if path matches query pattern

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'simple',
  {},
  { path: 'error://query/get-errors' },
  () => null
);
// fixedMeta.isQuery = true (auto-detected)
```

### Atomic Handler

**Type:** `'atomic'`

**Behavior:**
- Sets `isAtomic: true`
- Ensures message must be processed completely or not at all

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'atomic',
  {},
  {},
  () => null
);
// fixedMeta.isAtomic = true
```

### Batch Handler

**Type:** `'batch'`

**Behavior:**
- Sets `batch: true`
- Sets `isAtomic: false` (batches are not atomic)

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'batch',
  {},
  {},
  () => null
);
// fixedMeta.batch = true
// fixedMeta.isAtomic = false
```

### Query Handler

**Type:** `'query'`

**Behavior:**
- Sets `isQuery: true`
- Marks message as read-only operation

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'query',
  {},
  {},
  () => null
);
// fixedMeta.isQuery = true
```

### Retry Handler

**Type:** `'retry'`

**Behavior:**
- Sets `maxRetries` from options (default: 3)
- Tracks retry attempts

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'retry',
  {},
  { maxRetries: 5 },
  () => null
);
// fixedMeta.maxRetries = 5
```

### Transaction Handler

**Type:** `'transaction'`

**Behavior:**
- Sets `transaction` from options
- Sets `seq` from options
- Preserves `isAtomic` flag if specified in meta

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'transaction',
  { isAtomic: true },
  { transaction: 'tx_123', seq: 1 },
  () => null
);
// fixedMeta.transaction = 'tx_123'
// fixedMeta.seq = 1
// fixedMeta.isAtomic = true (preserved)
```

### Command Handler

**Type:** `'command'`

**Behavior:**
- Auto-generates `senderId` using `generateSenderId()` function
- Sets `isCommand: true`
- Ignores any `senderId` provided in meta (ensures uniqueness)

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'command',
  {},
  {},
  () => 'sender_1703123456789_abc123'
);
// fixedMeta.senderId = 'sender_1703123456789_abc123' (auto-generated)
// fixedMeta.isCommand = true
```

### Error Handler

**Type:** `'error'`

**Behavior:**
- Sets `isError: true`
- Marks message as error

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'error',
  {},
  {},
  () => null
);
// fixedMeta.isError = true
```

## Base Metadata Structure

### Fixed Metadata

Base fixed metadata includes:

```javascript
{
  timestamp: Date.now(),
  type: type,
  maxRetries: meta.maxRetries || 3,
  isAtomic: false,
  batch: false,
  isQuery: false,
  isCommand: false,
  isError: false,
  transaction: null,
  seq: null,
  senderId: null,
  caller: meta.caller || null
}
```

### Mutable Metadata

Base mutable metadata includes:

```javascript
{
  retries: 0,
  queryResult: null
}
```

## Auto-detection

### Query Message Detection

The `'simple'` type handler automatically detects query messages from path patterns:

**Pattern:** `subsystem://query/operation`

**Example:**
```javascript
const { fixedMeta } = buildMessageMetadata(
  'simple',
  {},
  { path: 'error://query/get-errors' },
  () => null
);
// fixedMeta.isQuery = true (auto-detected from path)
```

**Regex Pattern:**
```javascript
/^[^:]+:\/\/query\//
```

## Usage

This utility is primarily used internally by `MessageFactory`. However, you can use it directly if you need custom metadata building:

```javascript
import { buildMessageMetadata } from './models/message/message-metadata.utils.mycelia.js';

// Custom metadata building
const { fixedMeta, mutableMeta } = buildMessageMetadata(
  'command',
  { caller: 'my-subsystem' },
  { path: 'command://execute' },
  () => `sender_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
);

// Use fixedMeta and mutableMeta to create MessageMetadata
import { MessageMetadata } from './models/message/message-metadata.mycelia.js';
const meta = new MessageMetadata(fixedMeta, mutableMeta);
```

## Best Practices

1. **Use MessageFactory instead**: For most use cases, use `MessageFactory.create()` which handles metadata building automatically

2. **Understand type handlers**: Each message type has specific behavior - understand what each type does

3. **Use auto-detection**: Let the simple handler auto-detect query messages from path patterns

4. **Provide generateSenderId function**: Always provide a function that generates unique sender IDs for command messages

## See Also

- [Message Factory](./MESSAGE-FACTORY.md) - Learn about MessageFactory which uses these utilities
- [Message Metadata](./MESSAGE-METADATA.md) - Learn about MessageMetadata class
- [Message](./MESSAGE.md) - Learn about the Message class







