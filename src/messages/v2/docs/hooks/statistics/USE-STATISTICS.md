# useStatistics Hook

## Overview

The `useStatistics` hook provides statistics tracking functionality to subsystems. It wraps the `SubsystemStatistics` class and exposes methods for querying subsystem performance metrics, enabling monitoring and observability within the subsystem architecture.

**Key Features:**
- **Performance Metrics**: Track messages accepted, processed, errors, and processing times
- **Queue Monitoring**: Track queue full events
- **Time Slice Tracking**: Track time slices received from global scheduler
- **Processing Metrics**: Aggregated processing metrics for easy access
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'statistics',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'statistics'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing statistics facet
- **`required`**: `[]` - No dependencies on other facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.statistics`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.statistics`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

## Facet Methods

### `getStatistics()`

Get all subsystem statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object (copy):
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
- Returns a copy of all statistics (prevents external mutation)
- Statistics are automatically updated by other hooks (queue, processor, scheduler)
- Returns current snapshot of statistics

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Messages accepted: ${stats.messagesAccepted}`);
console.log(`Messages processed: ${stats.messagesProcessed}`);
console.log(`Processing errors: ${stats.processingErrors}`);
console.log(`Queue full events: ${stats.queueFullEvents}`);
console.log(`Time slices received: ${stats.timeSlicesReceived}`);
```

**Example - Statistics Monitoring:**
```javascript
// Monitor statistics periodically
setInterval(() => {
  const stats = subsystem.statistics.getStatistics();
  console.log(`Statistics:
    Accepted: ${stats.messagesAccepted}
    Processed: ${stats.messagesProcessed}
    Errors: ${stats.processingErrors}
    Queue Full: ${stats.queueFullEvents}
    Time Slices: ${stats.timeSlicesReceived}
  `);
}, 5000);
```

### `getProcessingMetrics()`

Get aggregated processing metrics.

**Signature:**
```javascript
getProcessingMetrics() => Object
```

**Returns:** `Object` - Processing metrics object:
```javascript
{
  messagesAccepted: number,
  messagesProcessed: number,
  averageProcessingTime: number,
  processingErrors: number,
  queueFullEvents: number,
  timeSlicesReceived: number
}
```

**Behavior:**
- Returns a curated set of processing-related metrics
- Includes `averageProcessingTime` (calculated from total processing time)
- Provides convenient access to key performance indicators

**Example:**
```javascript
const metrics = subsystem.statistics.getProcessingMetrics();
console.log(`Processing Metrics:
  Accepted: ${metrics.messagesAccepted}
  Processed: ${metrics.messagesProcessed}
  Average Time: ${metrics.averageProcessingTime.toFixed(2)}ms
  Errors: ${metrics.processingErrors}
  Queue Full: ${metrics.queueFullEvents}
  Time Slices: ${metrics.timeSlicesReceived}
`);
```

**Example - Performance Dashboard:**
```javascript
function displayMetrics(subsystem) {
  const metrics = subsystem.statistics.getProcessingMetrics();
  
  console.log(`
    Performance Metrics:
    ===================
    Messages Accepted: ${metrics.messagesAccepted}
    Messages Processed: ${metrics.messagesProcessed}
    Success Rate: ${((metrics.messagesProcessed / metrics.messagesAccepted) * 100).toFixed(1)}%
    Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms
    Errors: ${metrics.processingErrors}
    Queue Full Events: ${metrics.queueFullEvents}
    Time Slices: ${metrics.timeSlicesReceived}
  `);
}
```

## Facet Properties

### `_statistics` (internal)

Internal accessor for the `SubsystemStatistics` instance.

**Type:** `SubsystemStatistics`

**Purpose:** Used internally by other hooks that need to record statistics:
- `useQueue` - Records queue full events
- `useMessageProcessor` - Records accepted and processed messages
- `useScheduler` - Records time slices received

**Note:** This is an internal property and should not be used by external code. Use `getStatistics()` or `getProcessingMetrics()` for accessing statistics.

**Example (Internal Use):**
```javascript
// In useQueue hook
const statisticsFacet = api.__facets?.['statistics'];
if (statisticsFacet?._statistics) {
  statisticsFacet._statistics.recordQueueFull();
}
```

## Encapsulated Functionality

The `useStatistics` hook encapsulates:

1. **SubsystemStatistics Instance**: A `SubsystemStatistics` instance that handles the actual statistics tracking
2. **Statistics Recording**: Automatically records statistics via other hooks (queue, processor, scheduler)
3. **Configuration Management**: Extracts and applies configuration from `ctx.config.statistics`
4. **Debug Logging**: Integrates with the logger utility for conditional debug output
5. **Metrics Aggregation**: Provides convenient methods for accessing aggregated metrics

## Statistics Tracking

Statistics are automatically recorded by other hooks:

### Messages Accepted

Recorded by `useMessageProcessor` when messages are accepted into the queue:

```javascript
// In acceptMessage
statistics.recordAccepted();
```

### Messages Processed

Recorded by `useMessageProcessor` when messages are successfully processed:

```javascript
// In processMessage
statistics.recordProcessed(processingTime);
```

### Processing Errors

Recorded by `useMessageProcessor` when message processing fails:

```javascript
// In processMessage
statistics.recordError();
```

### Queue Full Events

Recorded by `useQueue` when the queue becomes full:

```javascript
// In SubsystemQueueManager
if (statisticsFacet?._statistics) {
  statisticsFacet._statistics.recordQueueFull();
}
```

### Time Slices Received

Recorded by `useScheduler` when a time slice is received:

```javascript
// In useScheduler.process()
if (statisticsFacet?._statistics) {
  statisticsFacet._statistics.recordTimeSlice();
}
```

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useStatistics } from './hooks/statistics/use-statistics.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    statistics: {
      debug: true
    }
  }
});

subsystem
  .use(useStatistics)
  .build();

// Get statistics
const stats = subsystem.statistics.getStatistics();
console.log(`Messages processed: ${stats.messagesProcessed}`);
```

### With Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useStatistics
});

await subsystem.build();

// Statistics are already available
const metrics = subsystem.statistics.getProcessingMetrics();
```

### Statistics Monitoring

```javascript
// Monitor statistics periodically
function monitorStatistics(subsystem, interval = 5000) {
  setInterval(() => {
    const metrics = subsystem.statistics.getProcessingMetrics();
    
    console.log(`
      Statistics Update:
      - Accepted: ${metrics.messagesAccepted}
      - Processed: ${metrics.messagesProcessed}
      - Errors: ${metrics.processingErrors}
      - Avg Time: ${metrics.averageProcessingTime.toFixed(2)}ms
      - Queue Full: ${metrics.queueFullEvents}
    `);
  }, interval);
}

monitorStatistics(subsystem);
```

### Performance Analysis

```javascript
// Analyze processing performance
function analyzePerformance(subsystem) {
  const metrics = subsystem.statistics.getProcessingMetrics();
  
  const successRate = metrics.messagesAccepted > 0
    ? (metrics.messagesProcessed / metrics.messagesAccepted) * 100
    : 0;
  
  const errorRate = metrics.messagesProcessed > 0
    ? (metrics.processingErrors / metrics.messagesProcessed) * 100
    : 0;
  
  console.log(`
    Performance Analysis:
    ====================
    Success Rate: ${successRate.toFixed(1)}%
    Error Rate: ${errorRate.toFixed(1)}%
    Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms
    Queue Full Events: ${metrics.queueFullEvents}
  `);
  
  return {
    successRate,
    errorRate,
    averageProcessingTime: metrics.averageProcessingTime
  };
}
```

### Statistics Comparison

```javascript
// Compare statistics at different points in time
const stats1 = subsystem.statistics.getStatistics();

// ... do some processing ...

const stats2 = subsystem.statistics.getStatistics();

const delta = {
  messagesAccepted: stats2.messagesAccepted - stats1.messagesAccepted,
  messagesProcessed: stats2.messagesProcessed - stats1.messagesProcessed,
  processingErrors: stats2.processingErrors - stats1.processingErrors
};

console.log(`Delta:`, delta);
```

## Statistics Properties

### `messagesAccepted`

Number of messages accepted into the queue.

**Type:** `number`

**Updated By:** `useMessageProcessor` (via `acceptMessage`)

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Accepted: ${stats.messagesAccepted}`);
```

### `messagesProcessed`

Number of messages successfully processed.

**Type:** `number`

**Updated By:** `useMessageProcessor` (via `processMessage`)

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Processed: ${stats.messagesProcessed}`);
```

### `processingErrors`

Number of processing errors encountered.

**Type:** `number`

**Updated By:** `useMessageProcessor` (via `processMessage`)

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Errors: ${stats.processingErrors}`);
```

### `queueFullEvents`

Number of times the queue became full.

**Type:** `number`

**Updated By:** `useQueue` (via `SubsystemQueueManager`)

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Queue full events: ${stats.queueFullEvents}`);
```

### `timeSlicesReceived`

Number of time slices received from global scheduler.

**Type:** `number`

**Updated By:** `useScheduler` (via `process()`)

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
console.log(`Time slices: ${stats.timeSlicesReceived}`);
```

### `totalProcessingTime`

Total time spent processing messages (in milliseconds).

**Type:** `number`

**Updated By:** `useMessageProcessor` (via `processMessage`)

**Note:** Used to calculate `averageProcessingTime` = `totalProcessingTime / messagesProcessed`

**Example:**
```javascript
const stats = subsystem.statistics.getStatistics();
const avgTime = stats.messagesProcessed > 0
  ? stats.totalProcessingTime / stats.messagesProcessed
  : 0;
console.log(`Average time: ${avgTime}ms`);
```

## Error Handling

- **No Errors**: The hook does not throw errors
- **Missing Statistics**: If statistics instance is not available, methods return empty/default values
- **Statistics Updates**: Statistics are updated automatically by other hooks (no manual tracking needed)

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    statistics: {
      debug: true
    }
  }
});
```

Debug messages are logged by the underlying `SubsystemStatistics` instance when statistics are recorded.

## Dependencies

- **No Facet Dependencies**: The `useStatistics` hook has no required facets (`required: []`)
- **Used By Other Hooks**: Many hooks require `statistics` as a dependency:
  - `useQueue` requires `statistics` (for queue full events)
  - `useScheduler` requires `statistics` (for time slice tracking)
  - `useMessageProcessor` requires `statistics` (for message tracking)
  - `useQueries` requires `statistics` (for query statistics)

## Best Practices

1. **Monitor Regularly**: Check statistics periodically to monitor subsystem health
2. **Track Key Metrics**: Focus on `messagesProcessed`, `processingErrors`, and `averageProcessingTime`
3. **Watch Queue Full Events**: High `queueFullEvents` may indicate capacity issues
4. **Calculate Rates**: Calculate success rates, error rates, and throughput from statistics
5. **Compare Over Time**: Track statistics deltas to understand trends
6. **Use Processing Metrics**: Use `getProcessingMetrics()` for convenient access to key metrics

## See Also

- [Hooks Documentation](./HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](./FACETS.md) - Understanding facet objects
- [SubsystemStatistics](./SUBSYSTEM-STATISTICS.md) - The underlying statistics implementation
- [useQueue](../queue/USE-QUEUE.md) - Queue hook (uses statistics)
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook (uses statistics)
- [useScheduler](../scheduler/USE-SCHEDULER.md) - Scheduler hook (uses statistics)
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction








