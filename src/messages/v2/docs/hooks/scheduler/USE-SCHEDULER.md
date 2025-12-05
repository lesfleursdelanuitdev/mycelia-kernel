# useScheduler Hook

## Overview

The `useScheduler` hook provides message scheduling functionality to subsystems. It wraps the `SubsystemScheduler` class and manages processing lifecycle state, enabling time-sliced message processing with configurable scheduling strategies. This hook is essential for subsystems that need to process messages within allocated time slices from a global scheduler.

**Key Features:**
- **Time-Sliced Processing**: Process messages within allocated time slices
- **Configurable Strategies**: Support for multiple scheduling strategies (priority, fifo, load-based, adaptive)
- **Processing Lifecycle**: Manage processing state (paused, processing, priority)
- **Statistics Integration**: Records time slice statistics automatically
- **Priority Management**: Set and get subsystem priority for global scheduling
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'scheduler',
  overwrite: false,
  required: ['queue', 'processor', 'statistics', 'listeners'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'scheduler'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing scheduler facet
- **`required`**: `['queue', 'processor', 'statistics', 'listeners']` - Requires `queue`, `processor`, `statistics`, and `listeners` facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.scheduler`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.scheduler`:

```javascript
{
  priority: number,
  schedulingStrategy: 'priority' | 'fifo' | 'load-based' | 'adaptive',
  maxMessagesPerSlice: number,
  debug: boolean,
  strategyOptions: {
    // Strategy-specific options
  }
}
```

### Configuration Options

- **`priority`** (number, default: `1`): Subsystem priority for global scheduling (higher = more important)
- **`schedulingStrategy`** (string, default: `'priority'`): Message scheduling strategy
  - `'priority'`: Atomic messages first, then by timestamp (default)
  - `'fifo'`: First in, first out (oldest messages first)
  - `'load-based'`: Simple messages first (lowest complexity)
  - `'adaptive'`: Dynamic switching based on queue utilization
- **`maxMessagesPerSlice`** (number, default: `10`): Maximum messages to process per time slice
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.
- **`strategyOptions`** (object, optional): Strategy-specific configuration options

## Facet Methods

### `process(timeSlice)`

Process messages during a time slice.

**Signature:**
```javascript
process(timeSlice) => Promise<Object>
```

**Parameters:**
- `timeSlice` (number, required) - Available processing time in milliseconds

**Returns:** `Promise<Object>` - Processing result object:
```javascript
{
  processed: number,        // Number of messages processed
  processingTime: number,   // Time spent processing (ms)
  errors: number,           // Number of processing errors
  remainingTime?: number,   // Remaining time (if paused)
  status?: string          // Status string (if paused: 'paused')
}
```

**Behavior:**
- Returns immediately with `status: 'paused'` if processing is paused
- Records time slice in statistics if statistics facet is available
- Delegates to `SubsystemScheduler.process()` for actual processing
- Processes messages up to `maxMessagesPerSlice` or until time slice is exhausted
- Uses configured scheduling strategy to select messages
- Returns processing statistics

**Example:**
```javascript
// Process messages during a 50ms time slice
const result = await subsystem.scheduler.process(50);
console.log(`Processed ${result.processed} messages in ${result.processingTime}ms`);
if (result.errors > 0) {
  console.warn(`Encountered ${result.errors} errors`);
}
```

**Example - Paused Processing:**
```javascript
// Pause processing
subsystem.scheduler.pauseProcessing();

// Process call returns immediately
const result = await subsystem.scheduler.process(50);
// result: { processed: 0, remainingTime: 50, status: 'paused' }
```

### `getScheduler()`

Get the underlying `SubsystemScheduler` instance.

**Signature:**
```javascript
getScheduler() => SubsystemScheduler
```

**Returns:** `SubsystemScheduler` - The scheduler instance

**Note:** This provides direct access to the `SubsystemScheduler` API. Prefer using the facet methods when possible for better abstraction.

**Example:**
```javascript
const scheduler = subsystem.scheduler.getScheduler();
const stats = scheduler.getStatistics();
console.log('Scheduler statistics:', stats);
```

### `configureScheduler(schedulerOptions)`

Configure scheduler options dynamically.

**Signature:**
```javascript
configureScheduler(schedulerOptions) => void
```

**Parameters:**
- `schedulerOptions` (object, required) - Scheduler configuration options:
  - `strategy` (string, optional) - Scheduling strategy name
  - `strategyOptions` (object, optional) - Strategy-specific options
  - `maxMessagesPerSlice` (number, optional) - Maximum messages per slice

**Side Effects:**
- Updates scheduling strategy if `strategy` is provided
- Updates `maxMessagesPerSlice` if provided
- Changes take effect on next `process()` call

**Example:**
```javascript
// Change scheduling strategy
subsystem.scheduler.configureScheduler({
  strategy: 'fifo',
  strategyOptions: {}
});

// Update max messages per slice
subsystem.scheduler.configureScheduler({
  maxMessagesPerSlice: 20
});

// Change both
subsystem.scheduler.configureScheduler({
  strategy: 'load-based',
  strategyOptions: {
    complexityEstimator: (msg) => msg.getBody().operations?.length || 1
  },
  maxMessagesPerSlice: 15
});
```

### `getPriority()`

Get subsystem priority.

**Signature:**
```javascript
getPriority() => number
```

**Returns:** `number` - Current priority value

**Example:**
```javascript
const priority = subsystem.scheduler.getPriority();
console.log(`Subsystem priority: ${priority}`);
```

### `setPriority(newPriority)`

Set subsystem priority.

**Signature:**
```javascript
setPriority(newPriority) => void
```

**Parameters:**
- `newPriority` (number, required) - New priority value (must be non-negative)

**Throws:**
- `Error` - If `newPriority` is not a number or is negative

**Side Effects:**
- Updates subsystem priority
- Priority is used by global scheduler for time allocation

**Example:**
```javascript
// Set high priority
subsystem.scheduler.setPriority(10);

// Set low priority
subsystem.scheduler.setPriority(1);
```

### `pauseProcessing()`

Pause message processing.

**Signature:**
```javascript
pauseProcessing() => void
```

**Side Effects:**
- Sets `isPaused` to `true`
- Subsequent `process()` calls return immediately with `status: 'paused'`
- Does not affect messages already in queue

**Example:**
```javascript
// Pause processing
subsystem.scheduler.pauseProcessing();

// Process calls will return immediately
const result = await subsystem.scheduler.process(50);
// result.status === 'paused'
```

### `resumeProcessing()`

Resume message processing.

**Signature:**
```javascript
resumeProcessing() => void
```

**Side Effects:**
- Sets `isPaused` to `false`
- Subsequent `process()` calls will process messages normally

**Example:**
```javascript
// Resume processing
subsystem.scheduler.resumeProcessing();

// Process calls will now process messages
const result = await subsystem.scheduler.process(50);
// Messages will be processed normally
```

### `isPaused()`

Check if processing is paused.

**Signature:**
```javascript
isPaused() => boolean
```

**Returns:** `boolean` - `true` if processing is paused, `false` otherwise

**Example:**
```javascript
if (subsystem.scheduler.isPaused()) {
  console.log('Processing is paused');
} else {
  console.log('Processing is active');
}
```

### `isProcessing()`

Check if currently processing messages.

**Signature:**
```javascript
isProcessing() => boolean
```

**Returns:** `boolean` - `true` if currently processing, `false` otherwise

**Note:** This state is managed internally and may not always reflect the exact processing state. It's primarily for internal use.

**Example:**
```javascript
if (subsystem.scheduler.isProcessing()) {
  console.log('Scheduler is currently processing messages');
}
```

## Facet Properties

### `_scheduler` (internal)

Internal accessor for the `SubsystemScheduler` instance.

**Type:** `SubsystemScheduler`

**Purpose:** Used internally by other hooks that need direct access to the scheduler.

**Note:** This is an internal property and should not be used by external code. Use `getScheduler()` for direct access if needed.

## Encapsulated Functionality

The `useScheduler` hook encapsulates:

1. **SubsystemScheduler Instance**: A `SubsystemScheduler` instance that handles message selection and processing
2. **Processing Lifecycle State**: Tracks `isProcessing` and `isPaused` states
3. **Priority Management**: Manages subsystem priority for global scheduling
4. **Configuration Management**: Extracts and applies configuration from `ctx.config.scheduler`
5. **Statistics Integration**: Automatically records time slice statistics
6. **Debug Logging**: Integrates with the logger utility for conditional debug output

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useScheduler } from './hooks/scheduler/use-scheduler.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    scheduler: {
      priority: 5,
      schedulingStrategy: 'priority',
      maxMessagesPerSlice: 10,
      debug: true
    }
  }
});

subsystem
  .use(useScheduler)
  .build();

// Process messages during a time slice
const result = await subsystem.scheduler.process(50);
console.log(`Processed ${result.processed} messages`);
```

### With Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useScheduler
});

await subsystem.build();

// Scheduler is already available
const result = await subsystem.scheduler.process(50);
```

### Pause and Resume

```javascript
// Pause processing
subsystem.scheduler.pauseProcessing();

// Process calls return immediately
const pausedResult = await subsystem.scheduler.process(50);
// pausedResult: { processed: 0, remainingTime: 50, status: 'paused' }

// Resume processing
subsystem.scheduler.resumeProcessing();

// Process calls now process messages
const activeResult = await subsystem.scheduler.process(50);
// activeResult: { processed: 5, processingTime: 45, errors: 0 }
```

### Priority Management

```javascript
// Get current priority
const currentPriority = subsystem.scheduler.getPriority();
console.log(`Current priority: ${currentPriority}`);

// Set high priority
subsystem.scheduler.setPriority(10);

// Set low priority
subsystem.scheduler.setPriority(1);
```

### Dynamic Configuration

```javascript
// Change scheduling strategy
subsystem.scheduler.configureScheduler({
  strategy: 'fifo'
});

// Update max messages per slice
subsystem.scheduler.configureScheduler({
  maxMessagesPerSlice: 20
});

// Change both with strategy options
subsystem.scheduler.configureScheduler({
  strategy: 'load-based',
  strategyOptions: {
    complexityEstimator: (msg) => {
      const body = msg.getBody();
      return body.operations?.length || 1;
    }
  },
  maxMessagesPerSlice: 15
});
```

### Processing Loop

```javascript
// Process messages in a loop
async function processLoop(subsystem, timeSlice) {
  while (true) {
    if (!subsystem.scheduler.isPaused()) {
      const result = await subsystem.scheduler.process(timeSlice);
      
      if (result.processed > 0) {
        console.log(`Processed ${result.processed} messages`);
      }
      
      if (result.errors > 0) {
        console.warn(`Encountered ${result.errors} errors`);
      }
    }
    
    // Wait before next iteration
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

## Scheduling Strategies

The hook supports multiple scheduling strategies via `SubsystemScheduler`:

### Priority Strategy (default)

Atomic messages first, then by timestamp.

```javascript
subsystem.scheduler.configureScheduler({
  strategy: 'priority'
});
```

### FIFO Strategy

First in, first out (oldest messages first).

```javascript
subsystem.scheduler.configureScheduler({
  strategy: 'fifo'
});
```

### Load-Based Strategy

Simple messages first (lowest complexity).

```javascript
subsystem.scheduler.configureScheduler({
  strategy: 'load-based',
  strategyOptions: {
    complexityEstimator: (msg) => {
      const body = msg.getBody();
      return body.operations?.length || 1;
    }
  }
});
```

### Adaptive Strategy

Dynamic switching based on queue utilization.

```javascript
subsystem.scheduler.configureScheduler({
  strategy: 'adaptive'
});
```

See `SubsystemScheduler` and `message-scheduling-strategies` documentation for strategy details.

## Error Handling

- **Missing Dependencies**: Throws error if required facets (`queue`, `processor`, `statistics`, `listeners`) are not available
- **Invalid Priority**: `setPriority()` throws an error if priority is not a non-negative number
- **Processing Errors**: Errors during message processing are caught and counted, but don't stop processing
- **Time Slice Exhaustion**: Processing stops when time slice is exhausted (not an error)

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    scheduler: {
      debug: true
    }
  }
});
```

Debug messages include:
- Scheduler initialization
- Message processing progress
- Processing errors
- Time slice exhaustion

## Dependencies

- **Required Facets**: The `useScheduler` hook requires:
  - `queue` - For accessing messages to process
  - `processor` - For processing messages
  - `statistics` - For recording time slice statistics
  - `listeners` - For event notifications

- **Used By**: The scheduler is typically used by:
  - Global scheduler systems for time-sliced processing
  - Subsystem processing loops
  - Message processing pipelines

## Best Practices

1. **Set Appropriate Priority**: Choose priority based on subsystem importance
2. **Tune maxMessagesPerSlice**: Balance throughput with time slice constraints
3. **Choose Right Strategy**: Select scheduling strategy based on message characteristics
4. **Monitor Processing**: Track processing results to optimize configuration
5. **Handle Pause State**: Check `isPaused()` before processing or handle paused results
6. **Use Statistics**: Monitor statistics to understand processing performance
7. **Handle Errors**: Check `errors` count in processing results
8. **Respect Time Slices**: Don't exceed allocated time slices

## See Also

- [Hooks Documentation](../../hooks/HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../../FACETS.md) - Understanding facet objects
- [SubsystemScheduler](./SUBSYSTEM-SCHEDULER.md) - The underlying scheduler implementation
- [Message Scheduling Strategies](./MESSAGE-SCHEDULING-STRATEGIES.md) - Scheduling strategy functions
- [useQueue](../queue/USE-QUEUE.md) - Queue hook (required dependency)
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook (required dependency)
- [useStatistics](../statistics/USE-STATISTICS.md) - Statistics hook (required dependency)
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

