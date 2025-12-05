# useQueue Hook

## Overview

The `useQueue` hook provides queue management functionality to subsystems. It wraps the `SubsystemQueueManager` class and exposes methods for managing message queues, including enqueueing, dequeuing, and monitoring queue status. The queue is used to store messages for asynchronous processing.

**Key Features:**
- **Message Queuing**: Enqueue messages for later processing
- **Message Dequeuing**: Dequeue messages for processing
- **Queue Status**: Monitor queue capacity, size, and state
- **Overflow Policies**: Configurable policies for handling queue overflow (drop-oldest, drop-newest, block, error)
- **Statistics Integration**: Integrates with statistics facet for tracking queue events
- **Listener Integration**: Integrates with listeners facet for queue-related events
- **Debug Support**: Integrated debug logging via debug flag utilities

## Hook Metadata

```javascript
{
  kind: 'queue',
  overwrite: false,
  required: ['statistics', 'listeners'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'queue'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing queue facet
- **`required`**: `['statistics', 'listeners']` - Requires statistics and listeners facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.queue`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.queue`:

```javascript
{
  capacity: number,
  policy: 'drop-oldest' | 'drop-newest' | 'block' | 'error',
  debug: boolean
}
```

### Configuration Options

- **`capacity`** (number, default: `1000`): Maximum number of messages the queue can hold
- **`policy`** (string, default: `'drop-oldest'`): Overflow policy when queue is full:
  - `'drop-oldest'`: Remove oldest message and add new one
  - `'drop-newest'`: Reject new message (don't add)
  - `'block'`: Block until space is available (not implemented, falls back to drop-oldest)
  - `'error'`: Throw error when queue is full
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    queue: {
      capacity: 2000,
      policy: 'drop-newest',
      debug: true
    }
  }
});
```

## Facet Methods

### `getQueueStatus(additionalState)`

Get current queue status including capacity, size, and state.

**Signature:**
```javascript
getQueueStatus(additionalState = {}) => Object
```

**Parameters:**
- `additionalState` (object, optional) - Additional state to include in status (e.g., `{isProcessing: true, isPaused: false}`)

**Returns:** `Object` - Queue status object:
```javascript
{
  capacity: number,
  size: number,
  isEmpty: boolean,
  isFull: boolean,
  availableSpace: number,
  // ... additionalState properties
}
```

**Example:**
```javascript
const status = subsystem.queue.getQueueStatus({ isProcessing: true });
console.log(`Queue: ${status.size}/${status.capacity} messages`);
console.log(`Available space: ${status.availableSpace}`);
```

### `clearQueue()`

Clear all messages from the queue.

**Signature:**
```javascript
clearQueue() => void
```

**Side Effects:**
- Removes all messages from the queue
- Resets queue size to 0
- Does not affect queue capacity

**Example:**
```javascript
// Clear all messages
subsystem.queue.clearQueue();
```

### `hasMessagesToProcess()`

Check if the queue has messages to process.

**Signature:**
```javascript
hasMessagesToProcess() => boolean
```

**Returns:** `boolean` - `true` if queue has messages, `false` if empty

**Example:**
```javascript
if (subsystem.queue.hasMessagesToProcess()) {
  // Process messages
  const pair = subsystem.queue.selectNextMessage();
  await subsystem.processor.processMessage(pair);
}
```

### `selectNextMessage()`

Dequeue and return the next message from the queue.

**Signature:**
```javascript
selectNextMessage() => {msg: Message, options: Object} | null
```

**Returns:** `Object | null` - Message-options pair `{msg: Message, options: Object}` or `null` if queue is empty

**Pair Structure:**
- `msg` (Message) - The message object
- `options` (Object) - Processing options (including `currentPiece` if provided during accept)

**Example:**
```javascript
// Dequeue next message
const pair = subsystem.queue.selectNextMessage();
if (pair) {
  const { msg, options } = pair;
  await subsystem.processor.processMessage(pair);
} else {
  console.log('Queue is empty');
}
```

## Facet Properties

### `queue` (direct access)

Direct access to the underlying `BoundedQueue` instance.

**Type:** `BoundedQueue`

**Description:** Provides direct access to the queue for advanced operations. The queue has methods like `enqueue()`, `dequeue()`, `remove()`, `capacity`, etc.

**Example:**
```javascript
// Direct queue access
const queue = subsystem.queue.queue;
const capacity = queue.capacity;
const size = queue.size();

// Enqueue directly (usually done via acceptMessage)
queue.enqueue({ msg: message, options: {} });
```

**Note:** Prefer using facet methods when possible for better abstraction. Direct queue access is useful for advanced use cases.

### `_queueManager` (internal)

Internal reference to the `SubsystemQueueManager` instance.

**Type:** `SubsystemQueueManager`

**Description:** Used internally by other hooks (e.g., `useMessageProcessor` for message acceptance).

**Note:** This is an internal property and should not be accessed directly by application code. Use the public methods instead.

## Encapsulated Functionality

The `useQueue` hook encapsulates:

1. **SubsystemQueueManager Instance**: A `SubsystemQueueManager` instance that manages the queue lifecycle
2. **BoundedQueue Instance**: The underlying `BoundedQueue` that stores messages
3. **Overflow Policy Management**: Handles queue overflow according to configured policy
4. **Statistics Integration**: Records queue full events via statistics facet
5. **Configuration Management**: Extracts and applies configuration from `ctx.config.queue`
6. **Debug Logging**: Integrates with debug flag utilities for conditional debug output

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useQueue } from './hooks/queue/use-queue.mycelia.js';
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks(),  // Includes useQueue
  config: {
    queue: {
      capacity: 2000,
      policy: 'drop-oldest',
      debug: true
    }
  }
});

await subsystem.build();

// Check queue status
const status = subsystem.queue.getQueueStatus();
console.log(`Queue: ${status.size}/${status.capacity}`);

// Check if messages available
if (subsystem.queue.hasMessagesToProcess()) {
  const pair = subsystem.queue.selectNextMessage();
  // Process message...
}
```

### With Message Acceptance

Messages are typically enqueued via `acceptMessage`:

```javascript
// Accept message (will be enqueued)
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
await subsystem.processor.accept(message);

// Later, dequeue and process
const pair = subsystem.queue.selectNextMessage();
if (pair) {
  await subsystem.processor.processMessage(pair);
}
```

### Queue Status Monitoring

```javascript
// Get queue status
const status = subsystem.queue.getQueueStatus({
  isProcessing: true,
  isPaused: false
});

console.log(`Queue Status:
  Capacity: ${status.capacity}
  Size: ${status.size}
  Available: ${status.availableSpace}
  Full: ${status.isFull}
  Empty: ${status.isEmpty}
  Processing: ${status.isProcessing}
  Paused: ${status.isPaused}
`);
```

### Manual Queue Management

```javascript
// Clear queue
subsystem.queue.clearQueue();

// Check if messages available
if (subsystem.queue.hasMessagesToProcess()) {
  // Process messages
  while (subsystem.queue.hasMessagesToProcess()) {
    const pair = subsystem.queue.selectNextMessage();
    if (pair) {
      await subsystem.processor.processMessage(pair);
    }
  }
}
```

### Direct Queue Access

```javascript
// Direct access to underlying queue
const queue = subsystem.queue.queue;

// Get queue properties
const capacity = queue.capacity;
const size = queue.size();

// Advanced operations (if needed)
queue.remove(message);
```

## Overflow Policies

The queue supports different overflow policies when the queue is full:

### `drop-oldest` (default)

Removes the oldest message and adds the new one.

```javascript
config: {
  queue: {
    capacity: 100,
    policy: 'drop-oldest'
  }
}
```

**Behavior:**
- When queue is full and new message arrives
- Oldest message is removed
- New message is added
- Queue size remains at capacity

### `drop-newest`

Rejects the new message (doesn't add it).

```javascript
config: {
  queue: {
    capacity: 100,
    policy: 'drop-newest'
  }
}
```

**Behavior:**
- When queue is full and new message arrives
- New message is rejected (not added)
- Queue remains unchanged
- `enqueue()` returns `false`

### `block`

Blocks until space is available (not fully implemented, falls back to drop-oldest).

```javascript
config: {
  queue: {
    capacity: 100,
    policy: 'block'
  }
}
```

**Note:** Currently not fully implemented. Falls back to `drop-oldest` behavior.

### `error`

Throws an error when queue is full.

```javascript
config: {
  queue: {
    capacity: 100,
    policy: 'error'
  }
}
```

**Behavior:**
- When queue is full and new message arrives
- Throws `Error` with message about queue being full
- Queue remains unchanged

## Integration with Other Hooks

### With useMessageProcessor

The `useMessageProcessor` hook uses the queue for message acceptance:

```javascript
// In acceptMessage utility
const pair = { msg: message, options };
const success = queueManager.enqueue(pair);
// Message is queued for later processing
```

### With useScheduler

The scheduler hook uses the queue to select messages for processing:

```javascript
// In scheduler
const pair = queueFacet.selectNextMessage();
if (pair) {
  await processorFacet.processMessage(pair);
}
```

### With useStatistics

The statistics facet tracks queue events:

```javascript
// Queue full events are recorded
onQueueFull: () => {
  if (statisticsFacet?._statistics) {
    statisticsFacet._statistics.recordQueueFull();
  }
}
```

### With useListeners

The listeners facet can be used for queue-related events:

```javascript
// Listeners can be registered for queue events
// Integration via listeners facet
```

## Error Handling

### Queue Full (error policy)

If queue is full and policy is `'error'`:

```javascript
try {
  await subsystem.processor.accept(message);
} catch (error) {
  // Error: "Queue is full (capacity: 1000)"
  console.error('Queue full:', error.message);
}
```

### Queue Full (drop-newest policy)

If queue is full and policy is `'drop-newest'`:

```javascript
const accepted = await subsystem.processor.accept(message);
if (!accepted) {
  // Message rejected (queue full)
  console.warn('Message rejected: queue full');
}
```

## Debug Logging

The hook uses the debug flag utility for conditional logging:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    queue: {
      debug: true
    }
  }
});
```

Debug messages are logged by the `SubsystemQueueManager` and `BoundedQueue` classes when debug is enabled.

## Dependencies

The `useQueue` hook requires the following facets:

- **`statistics`** (required) - For tracking queue full events
- **`listeners`** (required) - For queue-related event notifications

**Installation Order:**
The hook should be installed after its dependencies (statistics, listeners) are installed.

## Best Practices

1. **Configure Capacity**: Set appropriate capacity based on expected message volume
2. **Choose Policy**: Select overflow policy that matches your use case
3. **Monitor Status**: Regularly check queue status to prevent overflow
4. **Process Regularly**: Ensure messages are dequeued and processed regularly
5. **Handle Full Queue**: Implement handling for queue full scenarios
6. **Use Scheduler**: Use scheduler hook for automatic message processing
7. **Enable Debug**: Enable debug logging during development

## Queue Lifecycle

### Message Flow

1. **Accept**: Message is accepted via `subsystem.processor.accept(message)`
2. **Enqueue**: Message is enqueued as `{msg: message, options}` pair
3. **Store**: Message is stored in queue (BoundedQueue)
4. **Dequeue**: Message is dequeued via `selectNextMessage()`
5. **Process**: Message is processed via `processMessage()`

### Queue States

- **Empty**: No messages in queue (`size === 0`)
- **Available**: Has space for messages (`size < capacity`)
- **Full**: No space for messages (`size === capacity`)

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [SubsystemQueueManager](./subsystem-queue-manager.mycelia.js) - Queue manager implementation
- [BoundedQueue](./bounded-queue.mycelia.js) - Bounded queue implementation
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook that uses queue
- [acceptMessage](../message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction








