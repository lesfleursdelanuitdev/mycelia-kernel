# acceptMessage Utility

## Overview

The `accept-message.mycelia.js` module provides a utility function that accepts messages into a subsystem. It handles query message detection and immediate processing, or queue enqueueing for regular messages, serving as the message acceptance entry point for subsystems.

**Key Features:**
- **Query Detection**: Automatically detects query messages and processes them immediately
- **Queue Management**: Enqueues non-query messages for later processing
- **Immediate Processing**: Processes query messages synchronously (bypasses queue)
- **Statistics Tracking**: Records accepted messages and errors
- **Runtime Metadata**: Stores routing context (currentPiece) in message metadata
- **Error Handling**: Comprehensive error handling for both queries and regular messages
- **Debug Support**: Conditional debug logging

## Function Signature

### `acceptMessage(context, message, options)`

Accept a message into a subsystem.

**Signature:**
```javascript
acceptMessage(context, message, options = {}) => Promise<boolean>
```

**Parameters:**
- `context` (Object, required) - Context object with subsystem dependencies (see Context Object below)
- `message` (Message, required) - Message to accept
- `options` (Object, optional) - Options for message processing:
  - `currentPiece` (string, optional) - Current piece for routing context

**Returns:** `Promise<boolean>` - `true` if message was accepted successfully, `false` otherwise

**Behavior:**
- For query messages: Processes immediately if query handler is available
- For other messages: Enqueues message-options pair for later processing
- Always returns `true` for query messages (even if processing fails, error is stored in message)
- Returns `true`/`false` for regular messages based on queue enqueue success

## Context Object

The `context` parameter must contain the following properties:

### Required Properties

#### `queryHandlerManager`

**Type:** `QueryHandlerManager | null`

**Description:** Query handler manager for processing query messages. If `null` or handler not available, queries are treated as regular messages.

**Example:**
```javascript
const context = {
  queryHandlerManager: queriesFacet?._queryHandlerManager || null,
  // ... other properties
};
```

#### `queueManager`

**Type:** `SubsystemQueueManager | BoundedQueue`

**Description:** Queue manager or queue for enqueueing messages. Must have an `enqueue(pair)` method.

**Example:**
```javascript
const context = {
  queueManager: queueFacet._queueManager,
  // ... other properties
};
```

#### `statisticsRecorder`

**Type:** `Function` - `() => void`

**Description:** Function to record accepted messages.

**Example:**
```javascript
const context = {
  statisticsRecorder: () => {
    if (statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordAccepted();
    }
  },
  // ... other properties
};
```

#### `errorRecorder`

**Type:** `Function` - `() => void`

**Description:** Function to record errors.

**Example:**
```javascript
const context = {
  errorRecorder: () => {
    if (statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordError();
    }
  },
  // ... other properties
};
```

#### `debug`

**Type:** `boolean`

**Description:** Debug flag for conditional logging.

**Example:**
```javascript
const context = {
  debug: true,  // Enable debug logging
  // ... other properties
};
```

#### `subsystemName`

**Type:** `string`

**Description:** Subsystem name for logging purposes.

**Example:**
```javascript
const context = {
  subsystemName: 'my-subsystem',
  // ... other properties
};
```

## Message Acceptance Flow

### Query Message Flow

1. **Detection**: Checks if message is a query (`message.isQuery()`)
2. **Handler Check**: Verifies query handler manager exists and has handler
3. **Immediate Processing**: Processes query via `queryHandlerManager.processQuery(message)`
4. **Result Storage**: Stores result in message via `message.setQueryResult(queryResult)`
5. **Statistics**: Records acceptance
6. **Return**: Always returns `true` (even if processing fails, error is stored)

### Regular Message Flow

1. **Detection**: Message is not a query or query handler not available
2. **Pair Creation**: Creates message-options pair `{msg: message, options}`
3. **Enqueue**: Enqueues pair to queue via `queueManager.enqueue(pair)`
4. **Statistics**: Records acceptance if enqueue succeeds
5. **Return**: Returns `true` if enqueued successfully, `false` otherwise

## Runtime Metadata

### `currentPiece` Storage

If `options.currentPiece` is provided, it is stored in message runtime metadata:

```javascript
if (options.currentPiece) {
  if (!message._runtimeMeta) {
    message._runtimeMeta = {};
  }
  message._runtimeMeta.currentPiece = options.currentPiece;
}
```

**Purpose:** Provides routing context for message processing.

**Example:**
```javascript
await acceptMessage(context, message, {
  currentPiece: 'domain'  // Stored in message._runtimeMeta.currentPiece
});
```

## Query Message Handling

Query message handling is implemented in the `queryHandling()` function, which processes queries immediately and stores results in the message.

### `queryHandling(queryHandlerManager, message, statisticsRecorder, errorRecorder, logger)`

Internal function that handles query message processing.

**Signature:**
```javascript
queryHandling(queryHandlerManager, message, statisticsRecorder, errorRecorder, logger) => Promise<boolean>
```

**Parameters:**
- `queryHandlerManager` (QueryHandlerManager, required) - Query handler manager instance
- `message` (Message, required) - Query message to process
- `statisticsRecorder` (Function, required) - Function to record accepted messages
- `errorRecorder` (Function, required) - Function to record errors
- `logger` (Object, required) - Logger instance for debug output

**Returns:** `Promise<boolean>` - Always returns `true` (even on error, error result is stored in message)

**Behavior:**
1. Logs query processing start
2. Processes query via `queryHandlerManager.processQuery(message)`
3. Stores result in message via `message.setQueryResult(queryResult)`
4. Records acceptance statistics
5. Returns `true` (message accepted)

**Error Handling:**
- If processing fails, error is caught
- Error is recorded via `errorRecorder()`
- Error is logged via `logger.error()`
- Error result is stored in message: `{success: false, error: error.message}`
- Function still returns `true` (message accepted with error result)

### Query Detection

Queries are detected using `message.isQuery()`:

```javascript
if (queryHandlerManager && queryHandlerManager.hasHandler() && message.isQuery()) {
  return await queryHandling(queryHandlerManager, message, statisticsRecorder, errorRecorder, logger);
}
```

### Query Processing

Queries are processed immediately via `queryHandlerManager.processQuery(message)`:

```javascript
const queryResult = await queryHandlerManager.processQuery(message);
message.setQueryResult(queryResult);
```

**Result Storage:**
- Success: Result stored via `message.setQueryResult(queryResult)`
- Error: Error result stored via `message.setQueryResult({success: false, error: ...})`

### Query Error Handling

If query processing fails:

1. Error is recorded via `errorRecorder()`
2. Error is logged via `logger.error()`
3. Error result is stored in message: `{success: false, error: error.message}`
4. Function still returns `true` (message is "accepted" with error result)

**Example:**
```javascript
// queryHandling() is called internally when a query message is detected
// The function handles all query processing logic:
// - Processes query immediately
// - Stores result in message
// - Records statistics
// - Handles errors gracefully
```

## Regular Message Handling

### Message-Options Pair

Regular messages are enqueued as a pair:

```javascript
const pair = { msg: message, options };
const success = queueManager.enqueue(pair);
```

**Pair Structure:**
- `msg` (Message) - The message object
- `options` (Object) - Processing options (including `currentPiece`)

**Purpose:** Preserves options for later retrieval during `processMessage()`.

### Enqueue Behavior

The queue manager's `enqueue()` method determines success:

- **Success**: Returns `true`, statistics recorded
- **Failure**: Returns `false` (e.g., queue full, policy rejection), error recorded

**Queue Policies:**
- Queue may reject messages if full (depending on policy)
- Queue may drop messages (depending on overflow policy)
- Queue may block (depending on policy)

## Return Values

### Query Messages

**Always returns `true`**:
- Success: Query processed, result stored, returns `true`
- Error: Query processing failed, error result stored, returns `true`

**Rationale:** Query messages are "accepted" even if processing fails, because the error result is stored in the message for the caller to retrieve.

### Regular Messages

**Returns `true` or `false`**:
- **Success**: Message enqueued successfully, returns `true`
- **Failure**: Message not enqueued (queue full, etc.), returns `false`

## Error Handling

### Query Processing Errors

If query processing throws an error:

1. Error is caught
2. Error is recorded via `errorRecorder()`
3. Error is logged if debug is enabled
4. Error result is stored in message
5. Function returns `true` (message accepted with error result)

**Example:**
```javascript
try {
  const queryResult = await queryHandlerManager.processQuery(message);
  message.setQueryResult(queryResult);
  return true;
} catch (error) {
  errorRecorder();
  // ... error handling
  message.setQueryResult({
    success: false,
    error: error.message || 'Unknown error processing query'
  });
  return true; // Still accepted
}
```

### Queue Enqueue Errors

If queue enqueue throws an error:

1. Error is caught
2. Error is recorded via `errorRecorder()`
3. Error is logged if debug is enabled
4. Function returns `false` (message not accepted)

**Example:**
```javascript
try {
  const pair = { msg: message, options };
  const success = queueManager.enqueue(pair);
  if (success) {
    statisticsRecorder();
  }
  return success;
} catch (error) {
  errorRecorder();
  // ... error logging
  return false; // Not accepted
}
```

## Statistics Tracking

### Accepted Messages

Statistics are recorded when:

1. **Query Messages**: After successful query processing (or error handling)
2. **Regular Messages**: After successful queue enqueue

**Recording:**
```javascript
statisticsRecorder();  // Increments accepted count
```

### Error Recording

Errors are recorded when:

1. **Query Processing Errors**: When query processing throws
2. **Queue Enqueue Errors**: When queue enqueue throws

**Recording:**
```javascript
errorRecorder();  // Increments error count
```

## Debug Logging

Debug messages are logged conditionally based on the `debug` flag:

### Query Messages

- **Acceptance**: `"Accepting message {id}"`
- **Query Detection**: `"Processing query message synchronously: {path}"`
- **Query Error**: `"Error processing query message: {error}"`

### Regular Messages

- **Acceptance**: `"Accepting message {id}"`
- **Enqueue Success**: `"Message accepted: {id}"`
- **Enqueue Error**: `"Error accepting message: {error}"`

**Example:**
```javascript
if (debug) {
  console.log(`BaseSubsystem ${subsystemName}: Accepting message ${message.id}`);
}
```

## Usage Examples

### Basic Usage

```javascript
import { acceptMessage } from './accept-message.mycelia.js';

const context = {
  queryHandlerManager: queriesFacet?._queryHandlerManager || null,
  queueManager: queueFacet._queueManager,
  statisticsRecorder: () => {
    statisticsFacet._statistics.recordAccepted();
  },
  errorRecorder: () => {
    statisticsFacet._statistics.recordError();
  },
  debug: true,
  subsystemName: 'my-subsystem'
};

const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const accepted = await acceptMessage(context, message);
```

### With Routing Context

```javascript
await acceptMessage(context, message, {
  currentPiece: 'domain'  // Stored in message._runtimeMeta.currentPiece
});
```

### Query Message Handling

```javascript
// Query messages are processed immediately
const queryMessage = messageFactory.createQuery('query/domain', { name: 'example.com' });
const accepted = await acceptMessage(context, queryMessage);

// Result is stored in message
const result = queryMessage.getQueryResult();
if (result.success) {
  console.log('Query result:', result);
} else {
  console.error('Query error:', result.error);
}
```

### Error Handling

```javascript
try {
  const accepted = await acceptMessage(context, message, options);
  
  if (!accepted) {
    console.error('Message not accepted (queue may be full)');
  } else {
    console.log('Message accepted');
    
    // For queries, check result
    if (message.isQuery()) {
      const result = message.getQueryResult();
      if (!result.success) {
        console.error('Query failed:', result.error);
      }
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Integration with useMessageProcessor

The `useMessageProcessor` hook uses this function internally:

```javascript
// In useMessageProcessor hook
async accept(message, options = {}) {
  const queryHandlerManager = queriesFacet?._queryHandlerManager || null;
  
  return await acceptMessage(
    {
      queryHandlerManager,
      queueManager: queueFacet._queueManager,
      statisticsRecorder: () => {
        statisticsFacet._statistics.recordAccepted();
      },
      errorRecorder: () => {
        statisticsFacet._statistics.recordError();
      },
      debug: options.debug || false,
      subsystemName: name
    },
    message,
    options
  );
}
```

## Message Types

### Command Messages

Commands are enqueued for later processing:

```javascript
const command = messageFactory.createCommand('register/domain', { name: 'example.com' });
const accepted = await acceptMessage(context, command);
// Command is queued, will be processed later
```

### Query Messages

Queries are processed immediately:

```javascript
const query = messageFactory.createQuery('query/domain', { name: 'example.com' });
const accepted = await acceptMessage(context, query);
// Query is processed immediately, result stored in message
const result = query.getQueryResult();
```

### Event Messages

Events are enqueued for later processing:

```javascript
const event = messageFactory.createEvent('domain/registered', { name: 'example.com' });
const accepted = await acceptMessage(context, event);
// Event is queued, will be processed later
```

## Query Result Storage

### Success Result

When query processing succeeds:

```javascript
message.setQueryResult({
  success: true,
  data: { /* query result data */ }
});
```

### Error Result

When query processing fails:

```javascript
message.setQueryResult({
  success: false,
  error: 'Error message'
});
```

### Retrieving Results

Results can be retrieved from the message:

```javascript
const result = message.getQueryResult();
if (result && result.success) {
  console.log('Query result:', result.data);
} else {
  console.error('Query error:', result?.error);
}
```

## Queue Behavior

### Enqueue Success

When message is successfully enqueued:

1. Statistics recorded
2. Debug message logged
3. Returns `true`

### Enqueue Failure

When message cannot be enqueued (queue full, etc.):

1. Error recorded
2. Debug message logged
3. Returns `false`

**Common Causes:**
- Queue is full (depending on overflow policy)
- Queue policy rejects message
- Queue is paused/disabled

## Best Practices

1. **Always Check Return Value**: Check if message was accepted
2. **Handle Query Results**: For queries, check `message.getQueryResult()`
3. **Provide Routing Context**: Use `currentPiece` option when available
4. **Monitor Statistics**: Use statistics to track acceptance rates
5. **Handle Queue Full**: Implement retry logic or error handling for queue full scenarios
6. **Enable Debug**: Enable debug logging during development

## Error Scenarios

### Scenario 1: Queue Full

```javascript
const accepted = await acceptMessage(context, message);
// accepted = false (queue is full, message not enqueued)
// Error recorded in statistics
```

### Scenario 2: Query Processing Error

```javascript
const queryMessage = messageFactory.createQuery('query/domain', { name: 'example.com' });
const accepted = await acceptMessage(context, queryMessage);
// accepted = true (message accepted, but with error result)

const result = queryMessage.getQueryResult();
// result = { success: false, error: 'Error message' }
```

### Scenario 3: Queue Enqueue Error

```javascript
try {
  const accepted = await acceptMessage(context, message);
  // If queue.enqueue() throws, error is caught and false is returned
} catch (error) {
  // Unexpected error (should not happen, but handle just in case)
  console.error('Unexpected error:', error);
}
```

## Message Metadata

### Runtime Metadata

The function may add runtime metadata to messages:

```javascript
// If options.currentPiece is provided
message._runtimeMeta = {
  currentPiece: 'domain'
};
```

**Note:** This is internal metadata and should not be accessed directly. Use message methods if available.

## See Also

- [useMessageProcessor Hook](./USE-MESSAGE-PROCESSOR.md) - Hook that uses this utility
- [processMessage](./PROCESS-MESSAGE.md) - Message processing utility
- [QueryHandlerManager](../queries/) - Query handler management
- [Queue Documentation](../queue/) - Queue management
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

