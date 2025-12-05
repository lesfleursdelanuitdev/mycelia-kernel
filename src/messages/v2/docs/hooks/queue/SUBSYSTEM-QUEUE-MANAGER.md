# SubsystemQueueManager Class

## Overview

The `SubsystemQueueManager` class manages the message queue for a subsystem. It handles queue initialization, operations (enqueue, dequeue, clear), status queries, and statistics. This class isolates queue management concerns from `BaseSubsystem`, providing a clean interface for queue operations.

**Key Features:**
- **Queue Management**: Manages message queue lifecycle and operations
- **BoundedQueue Integration**: Wraps `BoundedQueue` for message storage
- **Overflow Policy Support**: Supports configurable overflow policies (drop-oldest, drop-newest, block, error)
- **Status Monitoring**: Provides queue status and statistics
- **Event Callbacks**: Supports queue full event callbacks
- **Debug Support**: Conditional debug logging

## Constructor

### `new SubsystemQueueManager(options)`

Create a new `SubsystemQueueManager` instance.

**Signature:**
```javascript
new SubsystemQueueManager(options)
```

**Parameters:**
- `options` (Object, required) - Configuration options:
  - `subsystemName` (string, required) - Subsystem name for logging
  - `capacity` (number, optional, default: `1000`) - Queue capacity
  - `policy` (string, optional, default: `'drop-oldest'`) - Queue overflow policy
  - `debug` (boolean, optional, default: `false`) - Enable debug logging
  - `onQueueFull` (Function, optional) - Callback when queue becomes full: `() => void`

**Throws:**
- `Error` - If `subsystemName` is not provided or not a string

**Initialization:**
- Creates a `BoundedQueue` instance with specified capacity and policy
- Sets debug mode on the queue
- Registers queue full event listener if `onQueueFull` callback is provided
- Logs initialization message if debug is enabled

**Example:**
```javascript
import { SubsystemQueueManager } from './subsystem-queue-manager.mycelia.js';

const queueManager = new SubsystemQueueManager({
  capacity: 2000,
  policy: 'drop-oldest',
  debug: true,
  subsystemName: 'canvas',
  onQueueFull: () => {
    statistics.recordQueueFull();
  }
});
```

## Core Methods

### `enqueue(pair)`

Enqueue a message-options pair to the queue.

**Signature:**
```javascript
enqueue(pair) => boolean
```

**Parameters:**
- `pair` (Object, required) - Message-options pair:
  - `msg` (Message) - Message object
  - `options` (Object) - Processing options

**Returns:** `boolean` - `true` if successfully enqueued, `false` if rejected (depending on policy)

**Behavior:**
- Delegates to underlying `BoundedQueue.enqueue()`
- Returns `true` if message was enqueued
- Returns `false` if message was rejected (e.g., queue full with drop-newest policy)
- May trigger `onQueueFull` callback if queue becomes full

**Example:**
```javascript
const pair = { msg: message, options: { currentPiece: 'domain' } };
const success = queueManager.enqueue(pair);
if (success) {
  console.log('Message enqueued');
} else {
  console.log('Message rejected (queue full)');
}
```

### `dequeue()`

Dequeue the next message-options pair from the queue.

**Signature:**
```javascript
dequeue() => {msg: Message, options: Object} | null
```

**Returns:** `Object | null` - Message-options pair `{msg: Message, options: Object}` or `null` if queue is empty

**Behavior:**
- Delegates to underlying `BoundedQueue.dequeue()`
- Returns next pair in FIFO order
- Returns `null` if queue is empty

**Example:**
```javascript
const pair = queueManager.dequeue();
if (pair) {
  const { msg, options } = pair;
  await subsystem.processor.processMessage(pair);
} else {
  console.log('Queue is empty');
}
```

### `size()`

Get current queue size (number of messages).

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Number of messages currently in queue

**Example:**
```javascript
const currentSize = queueManager.size();
console.log(`Queue has ${currentSize} messages`);
```

### `getCapacity()`

Get queue capacity (maximum number of messages).

**Signature:**
```javascript
getCapacity() => number
```

**Returns:** `number` - Maximum queue capacity

**Example:**
```javascript
const capacity = queueManager.getCapacity();
console.log(`Queue capacity: ${capacity}`);
```

### `isEmpty()`

Check if queue is empty.

**Signature:**
```javascript
isEmpty() => boolean
```

**Returns:** `boolean` - `true` if queue is empty, `false` otherwise

**Example:**
```javascript
if (queueManager.isEmpty()) {
  console.log('Queue is empty');
}
```

### `isFull()`

Check if queue is full.

**Signature:**
```javascript
isFull() => boolean
```

**Returns:** `boolean` - `true` if queue is full, `false` otherwise

**Example:**
```javascript
if (queueManager.isFull()) {
  console.log('Queue is full');
}
```

### `clear()`

Clear all messages from the queue.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Removes all messages from the queue
- Resets queue size to 0
- Does not affect queue capacity
- Logs debug message if debug is enabled

**Example:**
```javascript
queueManager.clear();
// Queue is now empty
```

### `getStatus(additionalState)`

Get current queue status information.

**Signature:**
```javascript
getStatus(additionalState = {}) => Object
```

**Parameters:**
- `additionalState` (Object, optional) - Additional state to include in status (e.g., `{isProcessing: true, isPaused: false}`)

**Returns:** `Object` - Queue status object:
```javascript
{
  size: number,
  capacity: number,
  utilization: number,  // size / capacity (0.0 to 1.0)
  isEmpty: boolean,
  isFull: boolean,
  // ... additionalState properties
}
```

**Example:**
```javascript
const status = queueManager.getStatus({ isProcessing: true, isPaused: false });
console.log(`Queue Status:
  Size: ${status.size}/${status.capacity}
  Utilization: ${(status.utilization * 100).toFixed(1)}%
  Empty: ${status.isEmpty}
  Full: ${status.isFull}
  Processing: ${status.isProcessing}
  Paused: ${status.isPaused}
`);
```

### `getStatistics()`

Get queue statistics from the underlying `BoundedQueue`.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Queue statistics object (from `BoundedQueue.getStatistics()`)

**Example:**
```javascript
const stats = queueManager.getStatistics();
console.log('Queue statistics:', stats);
```

### `getQueue()`

Get the underlying `BoundedQueue` instance for direct access.

**Signature:**
```javascript
getQueue() => BoundedQueue
```

**Returns:** `BoundedQueue` - The underlying queue instance

**Note:** This provides direct access to the `BoundedQueue` API. Prefer using manager methods when possible for better abstraction.

**Example:**
```javascript
const queue = queueManager.getQueue();
// Direct access to BoundedQueue methods
const capacity = queue.getCapacity();
const size = queue.size();
```

## Overflow Policies

The queue supports different overflow policies when the queue is full:

### `drop-oldest` (default)

Removes the oldest message and adds the new one.

**Behavior:**
- When queue is full and new message arrives
- Oldest message is removed
- New message is added
- Queue size remains at capacity
- `enqueue()` always returns `true`

### `drop-newest`

Rejects the new message (doesn't add it).

**Behavior:**
- When queue is full and new message arrives
- New message is rejected (not added)
- Queue remains unchanged
- `enqueue()` returns `false`

### `block`

Blocks until space is available (not fully implemented, falls back to drop-oldest).

**Note:** Currently not fully implemented. Falls back to `drop-oldest` behavior.

### `error`

Throws an error when queue is full.

**Behavior:**
- When queue is full and new message arrives
- Throws `Error` with message about queue being full
- Queue remains unchanged
- `enqueue()` throws exception

## Event Callbacks

### `onQueueFull`

Callback function that is called when the queue becomes full.

**Signature:**
```javascript
onQueueFull: () => void
```

**When Called:**
- Called when a message is enqueued and the queue becomes full
- Called after the message is added (for drop-oldest policy)
- Called before rejection (for drop-newest policy)

**Example:**
```javascript
const queueManager = new SubsystemQueueManager({
  capacity: 100,
  policy: 'drop-oldest',
  subsystemName: 'canvas',
  onQueueFull: () => {
    console.log('Queue is full!');
    statistics.recordQueueFull();
  }
});
```

## Usage Patterns

### Basic Lifecycle

```javascript
import { SubsystemQueueManager } from './subsystem-queue-manager.mycelia.js';

// Create manager
const queueManager = new SubsystemQueueManager({
  capacity: 1000,
  policy: 'drop-oldest',
  debug: true,
  subsystemName: 'my-subsystem',
  onQueueFull: () => {
    console.log('Queue full!');
  }
});

// Enqueue messages
const pair1 = { msg: message1, options: {} };
const pair2 = { msg: message2, options: {} };
queueManager.enqueue(pair1);
queueManager.enqueue(pair2);

// Check status
const status = queueManager.getStatus();
console.log(`Queue: ${status.size}/${status.capacity}`);

// Dequeue messages
while (!queueManager.isEmpty()) {
  const pair = queueManager.dequeue();
  if (pair) {
    // Process message
    await processMessage(pair.msg, pair.options);
  }
}
```

### Integration with useQueue Hook

The `SubsystemQueueManager` is used internally by the `useQueue` hook:

```javascript
// In useQueue hook
const queueManager = new SubsystemQueueManager({
  capacity: config.capacity || 1000,
  policy: config.policy || 'drop-oldest',
  debug: getDebugFlag(config, ctx),
  subsystemName: name,
  onQueueFull: () => {
    if (statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordQueueFull();
    }
  }
});

// Exposed via facet
facet.selectNextMessage = () => queueManager.dequeue();
facet.getQueueStatus = (additionalState) => queueManager.getStatus(additionalState);
facet._queueManager = queueManager;
```

### Status Monitoring

```javascript
// Get basic status
const status = queueManager.getStatus();
console.log(`Queue utilization: ${(status.utilization * 100).toFixed(1)}%`);

// Get status with additional state
const statusWithState = queueManager.getStatus({
  isProcessing: true,
  isPaused: false,
  lastProcessed: Date.now()
});
```

### Queue Full Handling

```javascript
const queueManager = new SubsystemQueueManager({
  capacity: 100,
  policy: 'drop-newest',
  subsystemName: 'my-subsystem',
  onQueueFull: () => {
    // Handle queue full event
    console.warn('Queue is full - messages may be rejected');
    statistics.recordQueueFull();
  }
});

// Enqueue with full queue handling
const success = queueManager.enqueue(pair);
if (!success) {
  console.error('Message rejected: queue full');
}
```

## Error Handling

### Queue Full (error policy)

If queue is full and policy is `'error'`:

```javascript
try {
  queueManager.enqueue(pair);
} catch (error) {
  // Error: "Queue is full (capacity: 1000)"
  console.error('Queue full:', error.message);
}
```

### Queue Full (drop-newest policy)

If queue is full and policy is `'drop-newest'`:

```javascript
const success = queueManager.enqueue(pair);
if (!success) {
  // Message rejected (queue full)
  console.warn('Message rejected: queue full');
}
```

## Debug Logging

Debug messages are logged when debug is enabled:

### Initialization

```javascript
SubsystemQueueManager my-subsystem: Initialized with capacity 1000
```

### Queue Cleared

```javascript
SubsystemQueueManager my-subsystem: Queue cleared
```

Debug messages from the underlying `BoundedQueue` are also logged when debug is enabled.

## Integration with BoundedQueue

The `SubsystemQueueManager` wraps a `BoundedQueue` instance:

```javascript
// Manager creates and wraps BoundedQueue
this.queue = new BoundedQueue(capacity, policy);

// All operations delegate to BoundedQueue
enqueue(pair) => this.queue.enqueue(pair)
dequeue() => this.queue.dequeue()
size() => this.queue.size()
// etc.
```

## Best Practices

1. **Configure Capacity**: Set appropriate capacity based on expected message volume
2. **Choose Policy**: Select overflow policy that matches your use case
3. **Monitor Status**: Regularly check queue status to prevent overflow
4. **Handle Queue Full**: Implement handling for queue full scenarios
5. **Use Callbacks**: Use `onQueueFull` callback to track queue full events
6. **Enable Debug**: Enable debug logging during development
7. **Direct Access**: Use `getQueue()` only when you need advanced `BoundedQueue` features

## Thread Safety

The `SubsystemQueueManager` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## Performance Considerations

- **Enqueue/Dequeue**: O(1) operations (delegated to `BoundedQueue`)
- **Status Queries**: O(1) operations (size, capacity, isEmpty, isFull)
- **Clear**: O(n) where n is queue size
- **Statistics**: O(1) operation (delegated to `BoundedQueue`)

## See Also

- [useQueue Hook](./USE-QUEUE.md) - Hook that uses this manager
- [BoundedQueue](./bounded-queue.mycelia.js) - Underlying queue implementation
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [acceptMessage](../message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction








