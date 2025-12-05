# BoundedQueue Class

## Overview

The `BoundedQueue` class is a queue with a maximum capacity and configurable overflow policy for handling backpressure and memory management in message-driven systems. It provides event-driven notifications and comprehensive statistics for monitoring queue behavior.

**Key Features:**
- **Bounded Capacity**: Fixed maximum capacity to prevent unbounded memory growth
- **Overflow Policies**: Configurable policies for handling queue overflow (drop-oldest, drop-newest, block, error)
- **Event-Driven**: Emits events for queue state changes (full, empty, dropped, error)
- **Statistics Tracking**: Comprehensive statistics for monitoring queue behavior
- **Debug Support**: Conditional debug logging
- **FIFO Ordering**: First-in-first-out message ordering

## Constructor

### `new BoundedQueue(capacity, policy)`

Create a new `BoundedQueue` instance.

**Signature:**
```javascript
new BoundedQueue(capacity, policy = 'drop-oldest')
```

**Parameters:**
- `capacity` (number, required) - Maximum number of items the queue can hold
- `policy` (string, optional, default: `'drop-oldest'`) - Overflow policy when queue is full:
  - `'drop-oldest'`: Remove oldest item and add new one (FIFO with replacement)
  - `'drop-newest'`: Reject new item when full (strict capacity)
  - `'block'`: Wait for space (simplified implementation, falls back to drop-oldest)
  - `'error'`: Throw error when full (fail-fast)

**Throws:**
- `Error` - If capacity is invalid (not a positive number)

**Initialization:**
- Sets queue capacity and policy
- Initializes empty queue array
- Initializes statistics counters
- Initializes event handlers for `full`, `empty`, `dropped`, `error` events

**Example:**
```javascript
import { BoundedQueue } from './bounded-queue.mycelia.js';

// Basic queue with default policy
const queue = new BoundedQueue(100);

// Queue with error policy for critical data
const criticalQueue = new BoundedQueue(50, 'error');

// Queue with drop-newest for real-time data
const realtimeQueue = new BoundedQueue(200, 'drop-newest');
```

## Core Methods

### `enqueue(item)`

Add an item to the queue.

**Signature:**
```javascript
enqueue(item) => boolean
```

**Parameters:**
- `item` (any, required) - Item to enqueue

**Returns:** `boolean` - `true` if successfully enqueued, `false` if rejected (depending on policy)

**Throws:**
- `Error` - If queue is full and policy is `'error'`

**Behavior:**
- If queue is not full: Adds item and returns `true`
- If queue is full: Applies overflow policy (see Overflow Policies below)
- Emits `'full'` event when queue becomes full
- Updates statistics (`itemsEnqueued`, `queueFullEvents`)
- Logs debug message if debug is enabled

**Example:**
```javascript
const queue = new BoundedQueue(10, 'drop-oldest');

const success = queue.enqueue({ msg: message1, options: {} });
if (success) {
  console.log('Item enqueued');
}

// When queue is full, oldest item is dropped (drop-oldest policy)
for (let i = 0; i < 15; i++) {
  queue.enqueue({ msg: messageFactory.createCommand(`cmd/${i}`), options: {} });
}
// Queue now has 10 items (oldest 5 were dropped)
```

### `dequeue()`

Remove and return the next item from the queue.

**Signature:**
```javascript
dequeue() => any | null
```

**Returns:** `any | null` - Next item in FIFO order, or `null` if queue is empty

**Behavior:**
- Returns `null` if queue is empty
- Removes and returns first item (FIFO order)
- Updates statistics (`itemsDequeued`)
- Emits `'empty'` event if queue becomes empty after dequeue
- Logs debug message if debug is enabled

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });

const first = queue.dequeue(); // Returns message1
const second = queue.dequeue(); // Returns message2
const third = queue.dequeue(); // Returns null (queue empty)
```

### `peek()`

Look at the next item without removing it.

**Signature:**
```javascript
peek() => any | null
```

**Returns:** `any | null` - Next item or `null` if queue is empty

**Behavior:**
- Returns first item without removing it
- Does not modify queue state
- Does not update statistics
- Does not emit events

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });

const next = queue.peek(); // Returns message1 (queue unchanged)
const size = queue.size(); // Still 2
```

### `peekAll()`

Get all items in the queue without removing them.

**Signature:**
```javascript
peekAll() => Array
```

**Returns:** `Array` - Copy of all items in the queue (in order)

**Behavior:**
- Returns a copy of all items (shallow copy)
- Does not modify queue state
- Does not update statistics
- Does not emit events

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });

const all = queue.peekAll(); // Returns [{ msg: message1, ... }, { msg: message2, ... }]
const size = queue.size(); // Still 2
```

### `remove(item)`

Remove a specific item from the queue.

**Signature:**
```javascript
remove(item) => boolean
```

**Parameters:**
- `item` (any, required) - Item to remove (matched by reference equality)

**Returns:** `boolean` - `true` if item was found and removed, `false` otherwise

**Behavior:**
- Searches for item using `indexOf()` (reference equality)
- Removes first matching item if found
- Updates statistics (`itemsDequeued`)
- Emits `'empty'` event if queue becomes empty after removal
- Logs debug message if debug is enabled

**Example:**
```javascript
const queue = new BoundedQueue(10);
const pair1 = { msg: message1, options: {} };
const pair2 = { msg: message2, options: {} };

queue.enqueue(pair1);
queue.enqueue(pair2);

const removed = queue.remove(pair1); // Returns true
const size = queue.size(); // Now 1
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
const queue = new BoundedQueue(10);
queue.isEmpty(); // true

queue.enqueue({ msg: message1, options: {} });
queue.isEmpty(); // false
```

### `isFull()`

Check if queue is at capacity.

**Signature:**
```javascript
isFull() => boolean
```

**Returns:** `boolean` - `true` if queue is full (size >= capacity), `false` otherwise

**Example:**
```javascript
const queue = new BoundedQueue(2);
queue.isFull(); // false

queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });
queue.isFull(); // true
```

### `size()`

Get current queue size.

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Current number of items in queue

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.size(); // 0

queue.enqueue({ msg: message1, options: {} });
queue.size(); // 1
```

### `getCapacity()`

Get queue capacity.

**Signature:**
```javascript
getCapacity() => number
```

**Returns:** `number` - Maximum queue capacity

**Example:**
```javascript
const queue = new BoundedQueue(100);
const capacity = queue.getCapacity(); // 100
```

### `clear()`

Clear all items from the queue.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Removes all items from the queue
- Resets queue size to 0
- Does not affect capacity or policy
- Logs debug message if debug is enabled

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });

queue.clear();
queue.size(); // 0
queue.isEmpty(); // true
```

## Overflow Policies

The queue supports different overflow policies when the queue is full:

### `drop-oldest` (default)

Removes the oldest item and adds the new one.

**Behavior:**
- When queue is full and new item arrives
- Oldest item is removed (via `shift()`)
- New item is added (via `push()`)
- Queue size remains at capacity
- `enqueue()` returns `true`
- Emits `'dropped'` event with `{ item, reason: 'drop-oldest' }`
- Updates statistics (`itemsDropped`)

**Use Case:** When you want to keep the most recent items and can tolerate losing older items.

**Example:**
```javascript
const queue = new BoundedQueue(3, 'drop-oldest');
queue.enqueue('item1');
queue.enqueue('item2');
queue.enqueue('item3');
// Queue: ['item1', 'item2', 'item3']

queue.enqueue('item4');
// Queue: ['item2', 'item3', 'item4'] (item1 dropped)
```

### `drop-newest`

Rejects the new item (doesn't add it).

**Behavior:**
- When queue is full and new item arrives
- New item is rejected (not added)
- Queue remains unchanged
- `enqueue()` returns `false`
- Emits `'dropped'` event with `{ item, reason: 'drop-newest' }`
- Updates statistics (`itemsDropped`)

**Use Case:** When you want to preserve existing items and reject new ones when full.

**Example:**
```javascript
const queue = new BoundedQueue(3, 'drop-newest');
queue.enqueue('item1');
queue.enqueue('item2');
queue.enqueue('item3');
// Queue: ['item1', 'item2', 'item3']

const success = queue.enqueue('item4');
// success = false
// Queue: ['item1', 'item2', 'item3'] (unchanged)
```

### `block`

Waits for space (simplified implementation, falls back to drop-oldest).

**Behavior:**
- Currently not fully implemented
- Falls back to `drop-oldest` behavior
- Emits `'dropped'` event with `{ item, reason: 'block-timeout' }`
- `enqueue()` returns `false`

**Note:** This is a placeholder for future async blocking implementation.

**Example:**
```javascript
const queue = new BoundedQueue(3, 'block');
// Currently behaves like 'drop-oldest'
```

### `error`

Throws an error when queue is full.

**Behavior:**
- When queue is full and new item arrives
- Throws `Error` with message: `"Queue is full (capacity: {capacity})"`
- Queue remains unchanged
- Updates statistics (`errors`)
- Emits `'error'` event with `{ error, item }`

**Use Case:** When you want to fail-fast and handle queue full as an error condition.

**Example:**
```javascript
const queue = new BoundedQueue(3, 'error');
queue.enqueue('item1');
queue.enqueue('item2');
queue.enqueue('item3');

try {
  queue.enqueue('item4');
} catch (error) {
  // Error: "Queue is full (capacity: 3)"
  console.error('Queue full:', error.message);
}
```

## Event System

The queue emits events for state changes and errors:

### Events

- **`'full'`**: Emitted when queue becomes full
- **`'empty'`**: Emitted when queue becomes empty
- **`'dropped'`**: Emitted when an item is dropped (with `{ item, reason }`)
- **`'error'`**: Emitted when an error occurs (with `{ error, item }`)

### Event Methods

#### `on(event, handler)`

Add an event listener.

**Signature:**
```javascript
on(event, handler) => void
```

**Parameters:**
- `event` (string, required) - Event name (`'full'`, `'empty'`, `'dropped'`, `'error'`)
- `handler` (Function, required) - Event handler function

**Example:**
```javascript
const queue = new BoundedQueue(10, 'drop-oldest');

queue.on('full', () => {
  console.log('Queue is full!');
});

queue.on('dropped', (data) => {
  console.log('Item dropped:', data.reason);
});

queue.on('error', (data) => {
  console.error('Queue error:', data.error);
});
```

#### `off(event, handler)`

Remove an event listener.

**Signature:**
```javascript
off(event, handler) => void
```

**Parameters:**
- `event` (string, required) - Event name
- `handler` (Function, required) - Event handler function to remove

**Example:**
```javascript
const handler = () => console.log('Queue is full!');
queue.on('full', handler);

// Later, remove listener
queue.off('full', handler);
```

#### `emit(event, data)`

Emit an event to all listeners (internal method).

**Signature:**
```javascript
emit(event, data) => void
```

**Note:** This is an internal method. Events are emitted automatically by the queue.

## Statistics

### `getStatistics()`

Get comprehensive queue statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object:
```javascript
{
  itemsEnqueued: number,
  itemsDequeued: number,
  itemsDropped: number,
  queueFullEvents: number,
  errors: number,
  capacity: number,
  currentSize: number,
  policy: string,
  utilization: number  // currentSize / capacity (0.0 to 1.0)
}
```

**Example:**
```javascript
const queue = new BoundedQueue(10, 'drop-oldest');

queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });
queue.dequeue();

const stats = queue.getStatistics();
console.log(`Statistics:
  Enqueued: ${stats.itemsEnqueued}
  Dequeued: ${stats.itemsDequeued}
  Dropped: ${stats.itemsDropped}
  Full Events: ${stats.queueFullEvents}
  Utilization: ${(stats.utilization * 100).toFixed(1)}%
`);
```

### Statistics Properties

- **`itemsEnqueued`**: Total number of items successfully enqueued
- **`itemsDequeued`**: Total number of items dequeued (including `remove()`)
- **`itemsDropped`**: Total number of items dropped due to overflow policy
- **`queueFullEvents`**: Number of times queue became full
- **`errors`**: Number of errors encountered
- **`capacity`**: Queue capacity
- **`currentSize`**: Current queue size
- **`policy`**: Current overflow policy
- **`utilization`**: Queue utilization ratio (size / capacity)

## Debug Support

### `setDebug(debug)`

Set debug logging mode.

**Signature:**
```javascript
setDebug(debug) => void
```

**Parameters:**
- `debug` (boolean, required) - Enable or disable debug logging

**Side Effects:**
- Enables/disables debug logging for queue operations
- Debug messages are logged for `enqueue()`, `dequeue()`, `remove()`, and `clear()`

**Example:**
```javascript
const queue = new BoundedQueue(10);
queue.setDebug(true);

queue.enqueue({ msg: message1, options: {} });
// Logs: "BoundedQueue: Enqueued item, queue size: 1"
```

## Usage Patterns

### Basic Queue Operations

```javascript
import { BoundedQueue } from './bounded-queue.mycelia.js';

const queue = new BoundedQueue(100, 'drop-oldest');

// Enqueue items
queue.enqueue({ msg: message1, options: {} });
queue.enqueue({ msg: message2, options: {} });

// Check status
console.log(`Queue: ${queue.size()}/${queue.getCapacity()}`);
console.log(`Empty: ${queue.isEmpty()}, Full: ${queue.isFull()}`);

// Dequeue items
while (!queue.isEmpty()) {
  const item = queue.dequeue();
  if (item) {
    // Process item
    await processMessage(item.msg, item.options);
  }
}
```

### With Event Listeners

```javascript
const queue = new BoundedQueue(10, 'drop-oldest');

queue.on('full', () => {
  console.log('Queue is full!');
  statistics.recordQueueFull();
});

queue.on('dropped', (data) => {
  console.log(`Item dropped: ${data.reason}`);
  statistics.recordDropped();
});

queue.on('empty', () => {
  console.log('Queue is empty');
});

queue.on('error', (data) => {
  console.error('Queue error:', data.error);
});
```

### With Different Policies

```javascript
// Drop oldest (default) - keep most recent
const recentQueue = new BoundedQueue(100, 'drop-oldest');

// Drop newest - preserve existing
const preserveQueue = new BoundedQueue(100, 'drop-newest');

// Error on full - fail fast
const criticalQueue = new BoundedQueue(50, 'error');
try {
  criticalQueue.enqueue(item);
} catch (error) {
  // Handle queue full error
}
```

### Statistics Monitoring

```javascript
const queue = new BoundedQueue(100, 'drop-oldest');

// Process messages
for (let i = 0; i < 1000; i++) {
  queue.enqueue({ msg: messageFactory.createCommand(`cmd/${i}`), options: {} });
  if (i % 10 === 0) {
    queue.dequeue();
  }
}

// Get statistics
const stats = queue.getStatistics();
console.log(`Queue Statistics:
  Enqueued: ${stats.itemsEnqueued}
  Dequeued: ${stats.itemsDequeued}
  Dropped: ${stats.itemsDropped}
  Full Events: ${stats.queueFullEvents}
  Utilization: ${(stats.utilization * 100).toFixed(1)}%
`);
```

## Error Handling

### Queue Full (error policy)

If queue is full and policy is `'error'`:

```javascript
const queue = new BoundedQueue(10, 'error');

// Fill queue
for (let i = 0; i < 10; i++) {
  queue.enqueue({ msg: messageFactory.createCommand(`cmd/${i}`), options: {} });
}

try {
  queue.enqueue({ msg: messageFactory.createCommand('cmd/10'), options: {} });
} catch (error) {
  // Error: "Queue is full (capacity: 10)"
  console.error('Queue full:', error.message);
}
```

### Enqueue Errors

If enqueue fails (non-error policy):

```javascript
const queue = new BoundedQueue(10, 'drop-newest');

// Fill queue
for (let i = 0; i < 10; i++) {
  queue.enqueue({ msg: messageFactory.createCommand(`cmd/${i}`), options: {} });
}

const success = queue.enqueue({ msg: messageFactory.createCommand('cmd/10'), options: {} });
if (!success) {
  // Message rejected (queue full, drop-newest policy)
  console.warn('Message rejected: queue full');
}
```

## Internal Methods

### `handleFullQueue(item)`

Handle queue overflow based on policy (internal method).

**Signature:**
```javascript
handleFullQueue(item) => boolean
```

**Parameters:**
- `item` (any, required) - Item that couldn't be enqueued

**Returns:** `boolean` - Success status (depends on policy)

**Behavior:**
- Applies overflow policy (drop-oldest, drop-newest, block, error)
- Updates statistics
- Emits events
- May throw error (for error policy)

**Note:** This is an internal method called by `enqueue()` when queue is full.

## Best Practices

1. **Choose Appropriate Capacity**: Set capacity based on expected message volume and memory constraints
2. **Select Policy Carefully**: Choose overflow policy that matches your use case:
   - `drop-oldest`: For real-time data where recent items are more important
   - `drop-newest`: For preserving existing items when full
   - `error`: For critical data where queue full is an error condition
3. **Monitor Statistics**: Regularly check statistics to understand queue behavior
4. **Handle Events**: Register event listeners for queue full, dropped, and error events
5. **Enable Debug**: Enable debug logging during development
6. **Process Regularly**: Ensure items are dequeued regularly to prevent queue overflow
7. **Use Peek**: Use `peek()` to inspect items without removing them

## Thread Safety

The `BoundedQueue` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## Performance Considerations

- **Enqueue**: O(1) operation (array push)
- **Dequeue**: O(1) operation (array shift, but may be O(n) for large arrays due to array reindexing)
- **Peek**: O(1) operation (array index access)
- **Remove**: O(n) operation (array search and splice)
- **Clear**: O(1) operation (array reassignment)
- **Size/IsEmpty/IsFull**: O(1) operations (array length check)

**Note:** For very large queues, consider using a linked list implementation for better dequeue performance.

## See Also

- [useQueue Hook](./USE-QUEUE.md) - Hook that uses queues
- [SubsystemQueueManager](./SUBSYSTEM-QUEUE-MANAGER.md) - Queue manager that wraps BoundedQueue
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [acceptMessage](../message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction








