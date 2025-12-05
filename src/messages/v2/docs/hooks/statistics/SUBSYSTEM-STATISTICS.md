# SubsystemStatistics Class

## Overview

The `SubsystemStatistics` class manages statistics tracking for subsystems. It provides a centralized, consistent interface for recording and querying subsystem performance metrics, including message processing, error tracking, queue events, and time slice management.

**Key Features:**
- **Performance Metrics**: Track messages accepted, processed, errors, and processing times
- **Queue Monitoring**: Track queue full events
- **Time Slice Tracking**: Track time slices received from global scheduler
- **Statistics Management**: Reset, get, set, and increment statistics
- **Average Calculation**: Automatic calculation of average processing time
- **Debug Support**: Conditional debug logging for all operations

## Constructor

### `new SubsystemStatistics(debug)`

Create a new `SubsystemStatistics` instance.

**Signature:**
```javascript
new SubsystemStatistics(debug = false)
```

**Parameters:**
- `debug` (boolean, optional, default: `false`) - Enable debug logging

**Initialization:**
- Sets debug flag
- Calls `reset()` to initialize all statistics to zero

**Example:**
```javascript
import { SubsystemStatistics } from './subsystem-statistics.mycelia.js';

// Basic statistics instance
const statistics = new SubsystemStatistics();

// With debug logging
const statistics = new SubsystemStatistics(true);
```

## Core Methods

### `reset()`

Reset all statistics to zero.

**Signature:**
```javascript
reset() => void
```

**Side Effects:**
- Resets all statistics to zero:
  - `messagesAccepted`: 0
  - `messagesProcessed`: 0
  - `processingErrors`: 0
  - `queueFullEvents`: 0
  - `timeSlicesReceived`: 0
  - `totalProcessingTime`: 0
- Logs debug message if debug is enabled

**Example:**
```javascript
// Reset statistics
statistics.reset();

// Reset after collecting metrics
const metrics = statistics.getStats();
console.log('Metrics before reset:', metrics);
statistics.reset();
```

### `recordAccepted()`

Record that a message was accepted into the queue.

**Signature:**
```javascript
recordAccepted() => void
```

**Side Effects:**
- Increments `messagesAccepted` counter
- Logs debug message if debug is enabled

**Example:**
```javascript
// Record message acceptance
statistics.recordAccepted();

// In message acceptance flow
function acceptMessage(message) {
  // ... accept message ...
  statistics.recordAccepted();
}
```

### `recordProcessed(processingTime)`

Record that a message was processed successfully.

**Signature:**
```javascript
recordProcessed(processingTime = 0) => void
```

**Parameters:**
- `processingTime` (number, optional, default: `0`) - Processing time in milliseconds

**Side Effects:**
- Increments `messagesProcessed` counter
- Adds `processingTime` to `totalProcessingTime`
- Logs debug message if debug is enabled

**Example:**
```javascript
// Record processing without time
statistics.recordProcessed();

// Record processing with time
const startTime = Date.now();
// ... process message ...
const processingTime = Date.now() - startTime;
statistics.recordProcessed(processingTime);

// In message processing flow
async function processMessage(message) {
  const startTime = Date.now();
  try {
    // ... process message ...
    const processingTime = Date.now() - startTime;
    statistics.recordProcessed(processingTime);
  } catch (error) {
    statistics.recordError();
  }
}
```

### `recordError()`

Record that a processing error occurred.

**Signature:**
```javascript
recordError() => void
```

**Side Effects:**
- Increments `processingErrors` counter
- Logs debug message if debug is enabled

**Example:**
```javascript
// Record error
statistics.recordError();

// In error handling
try {
  // ... process message ...
  statistics.recordProcessed(processingTime);
} catch (error) {
  statistics.recordError();
  throw error;
}
```

### `recordQueueFull()`

Record that the queue became full.

**Signature:**
```javascript
recordQueueFull() => void
```

**Side Effects:**
- Increments `queueFullEvents` counter
- Logs debug message if debug is enabled

**Example:**
```javascript
// Record queue full event
statistics.recordQueueFull();

// In queue management
function enqueue(message) {
  if (queue.isFull()) {
    statistics.recordQueueFull();
    // Handle queue full...
  }
  // ... enqueue message ...
}
```

### `recordTimeSlice()`

Record that a time slice was received.

**Signature:**
```javascript
recordTimeSlice() => void
```

**Side Effects:**
- Increments `timeSlicesReceived` counter
- Logs debug message if debug is enabled

**Example:**
```javascript
// Record time slice
statistics.recordTimeSlice();

// In scheduler
async function process(timeSlice) {
  statistics.recordTimeSlice();
  // ... process messages ...
}
```

## Query Methods

### `getStats()`

Get all statistics as a copy.

**Signature:**
```javascript
getStats() => Object
```

**Returns:** `Object` - Copy of statistics object:
```javascript
{
  messagesAccepted: number,
  messagesProcessed: number,
  processingErrors: number,
  queueFullEvents: number,
  timeSlicesReceived: number,
  totalProcessingTime: number
}
```

**Behavior:**
- Returns a shallow copy of statistics (prevents external mutation)
- All values are numbers (counters or totals)

**Example:**
```javascript
// Get all statistics
const stats = statistics.getStats();
console.log(`Accepted: ${stats.messagesAccepted}`);
console.log(`Processed: ${stats.messagesProcessed}`);
console.log(`Errors: ${stats.processingErrors}`);

// Compare statistics
const stats1 = statistics.getStats();
// ... do work ...
const stats2 = statistics.getStats();
const delta = {
  processed: stats2.messagesProcessed - stats1.messagesProcessed,
  errors: stats2.processingErrors - stats1.processingErrors
};
```

### `getAverageProcessingTime()`

Get average processing time per message.

**Signature:**
```javascript
getAverageProcessingTime() => number
```

**Returns:** `number` - Average processing time in milliseconds

**Calculation:**
- If `messagesProcessed > 0`: `totalProcessingTime / messagesProcessed`
- Otherwise: `0`

**Example:**
```javascript
// Get average processing time
const avgTime = statistics.getAverageProcessingTime();
console.log(`Average processing time: ${avgTime.toFixed(2)}ms`);

// Check if processing has occurred
if (statistics.getStats().messagesProcessed > 0) {
  const avgTime = statistics.getAverageProcessingTime();
  console.log(`Average: ${avgTime}ms`);
} else {
  console.log('No messages processed yet');
}
```

### `get(key)`

Get a specific statistic value.

**Signature:**
```javascript
get(key) => number
```

**Parameters:**
- `key` (string, required) - Statistic key (e.g., `'messagesAccepted'`, `'messagesProcessed'`)

**Returns:** `number` - Statistic value or `0` if not found

**Example:**
```javascript
// Get specific statistic
const accepted = statistics.get('messagesAccepted');
const processed = statistics.get('messagesProcessed');
const errors = statistics.get('processingErrors');

// Get all statistics using get()
const stats = {
  accepted: statistics.get('messagesAccepted'),
  processed: statistics.get('messagesProcessed'),
  errors: statistics.get('processingErrors'),
  queueFull: statistics.get('queueFullEvents'),
  timeSlices: statistics.get('timeSlicesReceived'),
  totalTime: statistics.get('totalProcessingTime')
};
```

## Modification Methods

### `increment(key, amount)`

Increment a specific statistic.

**Signature:**
```javascript
increment(key, amount = 1) => void
```

**Parameters:**
- `key` (string, required) - Statistic key
- `amount` (number, optional, default: `1`) - Amount to increment by

**Side Effects:**
- Increments the statistic by the specified amount (if key exists)
- Logs debug message if debug is enabled
- Logs warning if key does not exist (only if debug is enabled)

**Example:**
```javascript
// Increment by 1
statistics.increment('messagesAccepted');

// Increment by specific amount
statistics.increment('totalProcessingTime', 5.2);

// Batch increment
for (let i = 0; i < 10; i++) {
  statistics.increment('messagesProcessed');
}
```

### `set(key, value)`

Set a specific statistic value.

**Signature:**
```javascript
set(key, value) => void
```

**Parameters:**
- `key` (string, required) - Statistic key
- `value` (number, required) - Value to set

**Side Effects:**
- Sets the statistic to the specified value (if key exists)
- Logs debug message if debug is enabled
- Logs warning if key does not exist (only if debug is enabled)

**Example:**
```javascript
// Set specific statistic
statistics.set('messagesAccepted', 100);
statistics.set('totalProcessingTime', 5000);

// Reset specific statistic
statistics.set('processingErrors', 0);

// Initialize statistics
statistics.set('messagesAccepted', 0);
statistics.set('messagesProcessed', 0);
```

## Debug Methods

### `isDebugEnabled()`

Check if debug logging is enabled.

**Signature:**
```javascript
isDebugEnabled() => boolean
```

**Returns:** `boolean` - `true` if debug is enabled, `false` otherwise

**Example:**
```javascript
if (statistics.isDebugEnabled()) {
  console.log('Statistics debug logging is enabled');
}
```

### `setDebug(debug)`

Set debug logging.

**Signature:**
```javascript
setDebug(debug) => void
```

**Parameters:**
- `debug` (boolean, required) - Enable or disable debug logging

**Side Effects:**
- Updates the debug flag
- Future operations will log debug messages if enabled

**Example:**
```javascript
// Enable debug logging
statistics.setDebug(true);

// Disable debug logging
statistics.setDebug(false);

// Toggle debug
statistics.setDebug(!statistics.isDebugEnabled());
```

## Statistics Properties

### `messagesAccepted`

Number of messages accepted into the queue.

**Type:** `number`

**Updated By:**
- `recordAccepted()` - Increments by 1
- `increment('messagesAccepted', amount)` - Increments by specified amount
- `set('messagesAccepted', value)` - Sets to specified value

**Example:**
```javascript
const stats = statistics.getStats();
console.log(`Accepted: ${stats.messagesAccepted}`);
```

### `messagesProcessed`

Number of messages successfully processed.

**Type:** `number`

**Updated By:**
- `recordProcessed()` - Increments by 1
- `increment('messagesProcessed', amount)` - Increments by specified amount
- `set('messagesProcessed', value)` - Sets to specified value

**Example:**
```javascript
const stats = statistics.getStats();
console.log(`Processed: ${stats.messagesProcessed}`);
```

### `processingErrors`

Number of processing errors encountered.

**Type:** `number`

**Updated By:**
- `recordError()` - Increments by 1
- `increment('processingErrors', amount)` - Increments by specified amount
- `set('processingErrors', value)` - Sets to specified value

**Example:**
```javascript
const stats = statistics.getStats();
console.log(`Errors: ${stats.processingErrors}`);
```

### `queueFullEvents`

Number of times the queue became full.

**Type:** `number`

**Updated By:**
- `recordQueueFull()` - Increments by 1
- `increment('queueFullEvents', amount)` - Increments by specified amount
- `set('queueFullEvents', value)` - Sets to specified value

**Example:**
```javascript
const stats = statistics.getStats();
console.log(`Queue full events: ${stats.queueFullEvents}`);
```

### `timeSlicesReceived`

Number of time slices received from global scheduler.

**Type:** `number`

**Updated By:**
- `recordTimeSlice()` - Increments by 1
- `increment('timeSlicesReceived', amount)` - Increments by specified amount
- `set('timeSlicesReceived', value)` - Sets to specified value

**Example:**
```javascript
const stats = statistics.getStats();
console.log(`Time slices: ${stats.timeSlicesReceived}`);
```

### `totalProcessingTime`

Total time spent processing messages (in milliseconds).

**Type:** `number`

**Updated By:**
- `recordProcessed(processingTime)` - Adds `processingTime` to total
- `increment('totalProcessingTime', amount)` - Increments by specified amount
- `set('totalProcessingTime', value)` - Sets to specified value

**Note:** Used to calculate `averageProcessingTime` = `totalProcessingTime / messagesProcessed`

**Example:**
```javascript
const stats = statistics.getStats();
const avgTime = stats.messagesProcessed > 0
  ? stats.totalProcessingTime / stats.messagesProcessed
  : 0;
console.log(`Total time: ${stats.totalProcessingTime}ms`);
console.log(`Average time: ${avgTime}ms`);
```

## Usage Patterns

### Basic Statistics Tracking

```javascript
import { SubsystemStatistics } from './subsystem-statistics.mycelia.js';

// Create statistics instance
const statistics = new SubsystemStatistics(true); // Enable debug

// Record events
statistics.recordAccepted();
statistics.recordProcessed(5.2);
statistics.recordError();
statistics.recordQueueFull();
statistics.recordTimeSlice();

// Get statistics
const stats = statistics.getStats();
console.log('Statistics:', stats);
```

### Performance Monitoring

```javascript
// Monitor processing performance
function monitorPerformance(statistics) {
  const stats = statistics.getStats();
  const avgTime = statistics.getAverageProcessingTime();
  
  console.log(`
    Performance Metrics:
    ====================
    Messages Accepted: ${stats.messagesAccepted}
    Messages Processed: ${stats.messagesProcessed}
    Processing Errors: ${stats.processingErrors}
    Average Processing Time: ${avgTime.toFixed(2)}ms
    Queue Full Events: ${stats.queueFullEvents}
    Time Slices Received: ${stats.timeSlicesReceived}
  `);
  
  // Calculate rates
  const successRate = stats.messagesAccepted > 0
    ? (stats.messagesProcessed / stats.messagesAccepted) * 100
    : 0;
  
  const errorRate = stats.messagesProcessed > 0
    ? (stats.processingErrors / stats.messagesProcessed) * 100
    : 0;
  
  console.log(`
    Rates:
    ======
    Success Rate: ${successRate.toFixed(1)}%
    Error Rate: ${errorRate.toFixed(1)}%
  `);
}
```

### Statistics Comparison

```javascript
// Compare statistics at different points
function compareStatistics(statistics) {
  const stats1 = statistics.getStats();
  
  // ... do work ...
  
  const stats2 = statistics.getStats();
  
  const delta = {
    accepted: stats2.messagesAccepted - stats1.messagesAccepted,
    processed: stats2.messagesProcessed - stats1.messagesProcessed,
    errors: stats2.processingErrors - stats1.processingErrors,
    queueFull: stats2.queueFullEvents - stats1.queueFullEvents,
    timeSlices: stats2.timeSlicesReceived - stats1.timeSlicesReceived,
    totalTime: stats2.totalProcessingTime - stats1.totalProcessingTime
  };
  
  console.log('Delta:', delta);
  return delta;
}
```

### Statistics Reset

```javascript
// Reset statistics periodically
function resetStatisticsPeriodically(statistics, interval = 60000) {
  setInterval(() => {
    const stats = statistics.getStats();
    console.log('Statistics before reset:', stats);
    statistics.reset();
    console.log('Statistics reset');
  }, interval);
}
```

### Custom Statistics Tracking

```javascript
// Track custom metrics using increment/set
function trackCustomMetrics(statistics) {
  // Increment custom counter
  statistics.increment('messagesAccepted', 5);
  
  // Set custom value
  statistics.set('totalProcessingTime', 1000);
  
  // Get custom value
  const customValue = statistics.get('messagesAccepted');
  console.log('Custom value:', customValue);
}
```

## Error Handling

- **Invalid Keys**: Methods that accept keys (`get`, `increment`, `set`) will return `0` or log warnings for unknown keys, but will not throw errors
- **Type Safety**: Statistics values are always numbers (counters or totals)
- **Copy Safety**: `getStats()` returns a copy, preventing external mutation

## Debug Logging

Debug logging is enabled via constructor or `setDebug()`:

```javascript
// Enable debug in constructor
const statistics = new SubsystemStatistics(true);

// Enable debug later
statistics.setDebug(true);

// Check debug status
if (statistics.isDebugEnabled()) {
  console.log('Debug logging is enabled');
}
```

Debug messages are logged for:
- Statistics reset
- Message accepted
- Message processed (with time)
- Processing error
- Queue full event
- Time slice received
- Statistic increment
- Statistic set

## Integration with useStatistics Hook

The `SubsystemStatistics` class is used internally by the `useStatistics` hook:

```javascript
// In useStatistics hook
const statistics = new SubsystemStatistics(debug);

// Exposed via facet
return new Facet('statistics', { attach: true })
  .add({
    getStatistics() {
      return statistics.getStats();
    },
    getProcessingMetrics() {
      return {
        messagesAccepted: statistics.getStats().messagesAccepted,
        messagesProcessed: statistics.getStats().messagesProcessed,
        averageProcessingTime: statistics.getAverageProcessingTime(),
        // ...
      };
    },
    _statistics: statistics  // Internal access
  });
```

## Thread Safety

- **Single Subsystem**: Each subsystem has its own `SubsystemStatistics` instance
- **Concurrent Access**: Statistics operations are not atomic, but in JavaScript's single-threaded model, this is generally safe
- **Copy on Read**: `getStats()` returns a copy, preventing race conditions from external mutation

## Performance Considerations

- **Lightweight Operations**: All operations are O(1) (constant time)
- **Memory Efficient**: Only stores numeric counters
- **Copy Overhead**: `getStats()` creates a shallow copy (minimal overhead)
- **Debug Logging**: Debug logging has minimal overhead when disabled

## Best Practices

1. **Use Record Methods**: Prefer `recordAccepted()`, `recordProcessed()`, etc. over manual `increment()` calls
2. **Track Processing Time**: Always pass `processingTime` to `recordProcessed()` for accurate averages
3. **Monitor Queue Full Events**: High `queueFullEvents` may indicate capacity issues
4. **Calculate Rates**: Calculate success rates, error rates, and throughput from statistics
5. **Reset Periodically**: Reset statistics periodically to track trends over time
6. **Use getStats()**: Use `getStats()` for reading statistics (returns copy, prevents mutation)

## See Also

- [useStatistics Hook](./USE-STATISTICS.md) - The hook that uses this class
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [useQueue Hook](../queue/USE-QUEUE.md) - Queue hook (records queue full events)
- [useMessageProcessor Hook](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook (records accepted/processed/errors)
- [useScheduler Hook](../scheduler/USE-SCHEDULER.md) - Scheduler hook (records time slices)








