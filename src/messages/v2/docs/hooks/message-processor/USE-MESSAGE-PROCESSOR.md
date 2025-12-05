# useMessageProcessor Hook

## Overview

The `useMessageProcessor` hook provides core message processing functionality to subsystems. It handles message acceptance, processing, and routing, serving as the central message processing pipeline for subsystems.

**Key Features:**
- **Message Acceptance**: Accept messages and place them on the queue (or process immediately for queries)
- **Message Processing**: Process messages through the complete routing and handler pipeline
- **Immediate Processing**: Process messages immediately without queuing
- **Tick Processing**: Process a single message from the queue (one-at-a-time)
- **Query Support**: Special handling for query messages (synchronous processing)
- **Error Reporting**: Integration with error system for authentication failures
- **Statistics Tracking**: Records accepted, processed, and error messages
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'processor',
  overwrite: false,
  required: ['router', 'statistics', 'queue', 'listeners', 'queries'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'processor'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing processor facet
- **`required`**: `['router', 'statistics', 'queue', 'listeners', 'queries']` - Requires router, statistics, queue, listeners, and queries facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.processor`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.processor`:

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
    processor: {
      debug: true
    }
  }
});
```

## Facet Methods

### `accept(message, options)`

Accept a message and place it on the queue (or process immediately for queries).

**Signature:**
```javascript
accept(message, options = {}) => Promise<boolean>
```

**Parameters:**
- `message` (Message, required) - Message to accept
- `options` (object, optional) - Options for message processing:
  - `currentPiece` (string, optional) - Current piece for routing context
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<boolean>` - `true` if message was accepted successfully, `false` otherwise

**Behavior:**
- For query messages: Processes immediately (synchronously) if query handler is available
- For other messages: Places message on the queue for later processing
- Records message acceptance in statistics
- Records errors in statistics if acceptance fails

**Side Effects:**
- May enqueue message to queue
- May process message immediately (for queries)
- Updates statistics (accepted count, error count)
- May trigger queue full events

**Example:**
```javascript
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });

// Accept message (will be queued)
const accepted = await subsystem.processor.accept(message);
if (accepted) {
  console.log('Message accepted and queued');
}

// Accept with options
await subsystem.processor.accept(message, {
  currentPiece: 'domain',
  debug: true
});
```

### `processMessage(pairOrMessage, options)`

Process a message through the complete processing pipeline.

**Signature:**
```javascript
processMessage(pairOrMessage, options = {}) => Promise<Object>
```

**Parameters:**
- `pairOrMessage` (Object | Message, required) - Message-options pair `{msg, options}` or message object
  - If pair: `{msg: Message, options: Object}` - Message already dequeued
  - If message: `Message` - Message to process (backward compatibility)
- `options` (object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<Object>` - Processing result object

**Behavior:**
- Extracts message and options from pair format or handles backward compatibility
- Routes message to appropriate handler
- Handles authentication if required
- Records processing statistics
- Reports errors to error system if authentication fails
- Returns processing result

**Example:**
```javascript
// Process message from pair (dequeued from queue)
const pair = queueFacet.selectNextMessage();
if (pair) {
  const result = await subsystem.processor.processMessage(pair);
  console.log('Processing result:', result);
}

// Process message directly (backward compatibility)
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await subsystem.processor.processMessage(message, {
  callerId: secretIdentity
});
```

### `processImmediately(message, options)`

Process a message immediately without queuing.

**Signature:**
```javascript
processImmediately(message, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to process immediately
- `options` (object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<Object>` - Processing result object

**Behavior:**
- Processes message immediately using core processing logic
- Never touches the queue
- Bypasses queuing entirely
- Useful for synchronous processing or immediate responses

**Example:**
```javascript
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });

// Process immediately (bypasses queue)
const result = await subsystem.processor.processImmediately(message, {
  callerId: secretIdentity
});
console.log('Immediate processing result:', result);
```

### `processTick()`

Process a single message from the queue (process one tick).

**Signature:**
```javascript
processTick() => Promise<Object | null>
```

**Returns:** `Promise<Object | null>` - Processing result or `null` if no message in queue

**Behavior:**
- Dequeues one message from the queue
- Processes the dequeued message
- Returns `null` if queue is empty
- Used as a fallback when no scheduler is present
- Useful for manual one-at-a-time processing

**Example:**
```javascript
// Process one message from queue
const result = await subsystem.processor.processTick();
if (result) {
  console.log('Processed message:', result);
} else {
  console.log('No messages in queue');
}

// Manual processing loop
while (true) {
  const result = await subsystem.processor.processTick();
  if (!result) {
    break; // Queue is empty
  }
  // Process result...
}
```

## Internal Implementation

The hook uses `createProcessMessageCore` from `process-message.mycelia.js` to create the core processing function. This factory function takes dependencies (route registry, message system, statistics facet, debug flag, subsystem name) and returns a `processMessageCore` function that handles the actual message processing.

**Note:** The core processing logic is encapsulated in the `process-message.mycelia.js` module. See [processMessage Documentation](./PROCESS-MESSAGE.md) for details on the `createProcessMessageCore` factory function.

## Encapsulated Functionality

The `useMessageProcessor` hook encapsulates:

1. **Message Routing**: Integration with router facet for message routing
2. **Queue Management**: Integration with queue facet for message queuing
3. **Statistics Tracking**: Records accepted, processed, and error messages
4. **Query Handling**: Special handling for query messages (synchronous processing)
5. **Error Reporting**: Integration with error system for authentication failures
6. **Processing Pipeline**: Complete message processing pipeline from acceptance to completion

## Message Processing Flow

### Standard Message Flow

1. **Accept**: Message is accepted via `accept()`
2. **Queue**: Message is placed on queue (unless it's a query)
3. **Dequeue**: Scheduler or `processTick()` dequeues message
4. **Process**: Message is processed via `processMessage()`
5. **Route**: Message is routed to appropriate handler
6. **Execute**: Handler executes and returns result
7. **Statistics**: Processing is recorded in statistics

### Query Message Flow

1. **Accept**: Query message is accepted via `accept()`
2. **Detect**: Query handler manager detects query message
3. **Process Immediately**: Message is processed synchronously (bypasses queue)
4. **Route**: Message is routed to query handler
5. **Execute**: Query handler executes and returns result
6. **Return**: Result is returned immediately

### Immediate Processing Flow

1. **Call**: `processImmediately()` is called with message
2. **Process**: Message is processed immediately (bypasses queue)
3. **Route**: Message is routed to appropriate handler
4. **Execute**: Handler executes and returns result
5. **Return**: Result is returned immediately

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useMessageProcessor } from './hooks/message-processor/use-message-processor.mycelia.js';
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks(),  // Includes useMessageProcessor
  config: {
    processor: {
      debug: true
    }
  }
});

await subsystem.build();

// Accept a message
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
await subsystem.processor.accept(message);

// Process messages (via scheduler or manually)
const result = await subsystem.processor.processTick();
```

### With Scheduler

```javascript
// Scheduler will automatically call processTick() or processMessage()
// during time slices
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes scheduler
});

await subsystem.build();

// Accept messages
await subsystem.processor.accept(message1);
await subsystem.processor.accept(message2);

// Scheduler processes messages during time slices
await subsystem.process(timeSlice);
```

### Immediate Processing

```javascript
// Process message immediately (bypasses queue)
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await subsystem.processor.processImmediately(message, {
  callerId: secretIdentity
});

console.log('Immediate result:', result);
```

### Manual Processing Loop

```javascript
// Manual one-at-a-time processing
while (true) {
  const result = await subsystem.processor.processTick();
  if (!result) {
    // Queue is empty, wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    continue;
  }
  
  // Process result
  console.log('Processed:', result);
  
  // Check if we should stop
  if (shouldStop) {
    break;
  }
}
```

### Query Message Handling

```javascript
// Query messages are processed immediately (synchronously)
const queryMessage = messageFactory.createQuery('query/domain', { name: 'example.com' });

// Accept query (will be processed immediately, not queued)
const accepted = await subsystem.processor.accept(queryMessage);
// Query is already processed by this point
```

## Error Handling

### Authentication Failures

Authentication failures are automatically reported to the error system:

```javascript
// If authentication fails during processing:
// 1. Error is recorded in statistics
// 2. Error is sent to error system via ms.sendError()
// 3. Processing continues (does not throw)
```

### Processing Errors

Processing errors are caught and recorded:

```javascript
// Errors during message processing:
// 1. Error is recorded in statistics
// 2. Error is logged if debug is enabled
// 3. Processing result indicates error state
```

### Queue Full

When queue is full:

```javascript
// If queue is full during accept():
// 1. Queue full event is recorded in statistics
// 2. Message may be dropped (depending on queue policy)
// 3. accept() returns false
```

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    processor: {
      debug: true
    }
  }
});
```

Debug messages include:
- Message processing start/completion
- Routing decisions
- Authentication results
- Error conditions

## Dependencies

The `useMessageProcessor` hook requires the following facets:

- **`router`** (required) - For message routing to handlers
- **`statistics`** (required) - For tracking message statistics
- **`queue`** (required) - For message queuing
- **`listeners`** (required) - For event notifications
- **`queries`** (required) - For query message handling

**Installation Order:**
The hook should be installed after its dependencies (router, statistics, queue, listeners, queries) are installed.

## Integration with Other Hooks

### With Scheduler

The scheduler hook uses `processMessage()` to process messages during time slices:

```javascript
// Scheduler calls processMessage() for each dequeued message
const pair = queueFacet.selectNextMessage();
if (pair) {
  await processorFacet.processMessage(pair);
}
```

### With Queue

The queue hook provides message queuing:

```javascript
// Processor accepts messages and queues them
await processorFacet.accept(message);
// Message is queued via queueFacet._queueManager
```

### With Router

The router hook provides message routing:

```javascript
// Processor routes messages via router
const result = await processorFacet.processMessage(message);
// Routing is handled by routerFacet._routeRegistry
```

### With Queries

The queries hook provides query handling:

```javascript
// Processor handles query messages specially
await processorFacet.accept(queryMessage);
// Query is processed immediately via queriesFacet._queryHandlerManager
```

## Best Practices

1. **Use Scheduler for Production**: Use scheduler for automatic message processing
2. **Use processTick for Manual Control**: Use `processTick()` for manual one-at-a-time processing
3. **Use processImmediately for Synchronous**: Use `processImmediately()` when you need immediate results
4. **Handle Errors**: Always check processing results for errors
5. **Monitor Statistics**: Use statistics facet to monitor message processing
6. **Configure Debug**: Enable debug logging during development

## Processing Options

### `callerId`

Secret identity Symbol of the calling subsystem. Used for authentication and authorization:

```javascript
await subsystem.processor.processMessage(message, {
  callerId: secretIdentity
});
```

### `debug`

Runtime debug flag override:

```javascript
await subsystem.processor.processMessage(message, {
  debug: true  // Overrides config.debug for this call
});
```

### `currentPiece`

Current piece for routing context:

```javascript
await subsystem.processor.accept(message, {
  currentPiece: 'domain'  // Routing context
});
```

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [processMessage](./process-message.mycelia.js) - Core message processing logic
- [acceptMessage](./accept-message.mycelia.js) - Message acceptance logic
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

