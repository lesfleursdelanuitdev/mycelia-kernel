# SubsystemScheduler Class

## Overview

The `SubsystemScheduler` class provides message processing within a subsystem using configurable scheduling strategies. It implements a pluggable strategy system for selecting which messages to process next, enabling flexible and efficient message processing within subsystems. The scheduler processes messages during allocated time slices, respecting time constraints and message limits.

**Key Features:**
- **Time-Sliced Processing**: Processes messages within allocated time slices
- **Pluggable Strategies**: Configurable scheduling strategies (priority, fifo, load-based, adaptive)
- **Message Selection**: Intelligent message selection based on configured strategy
- **Statistics Tracking**: Comprehensive statistics for monitoring performance
- **Queue Integration**: Integrates with subsystem queue for message access
- **Processor Integration**: Delegates actual processing to processor facet
- **Debug Support**: Conditional debug logging

## Constructor

### `new SubsystemScheduler(subsystem, options)`

Create a new `SubsystemScheduler` instance.

**Signature:**
```javascript
new SubsystemScheduler(subsystem, options = {})
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - The subsystem this scheduler manages
- `options` (Object, optional) - Configuration options:
  - `schedulingStrategy` (string, optional, default: `'priority'`) - Message scheduling strategy
  - `maxMessagesPerSlice` (number, optional, default: `10`) - Maximum messages to process per time slice
  - `debug` (boolean, optional, default: `false`) - Enable debug logging
  - `strategyOptions` (object, optional) - Strategy-specific options

**Throws:**
- No constructor errors (validates at runtime)

**Initialization:**
- Stores subsystem reference
- Initializes options with defaults
- Creates strategy registry with default strategies (priority, fifo, load-based, adaptive)
- Initializes scheduling state (`currentIndex`, `lastProcessed`)
- Initializes statistics counters
- Logs initialization message if debug is enabled

**Example:**
```javascript
import { SubsystemScheduler } from './subsystem-scheduler.mycelia.js';

// Basic scheduler with defaults
const scheduler = new SubsystemScheduler(subsystem);

// Configured scheduler
const scheduler = new SubsystemScheduler(subsystem, {
  schedulingStrategy: 'fifo',
  maxMessagesPerSlice: 20,
  debug: true
});
```

## Core Methods

### `process(timeSlice)`

Process messages during a time slice using the configured strategy.

**Signature:**
```javascript
process(timeSlice) => Promise<Object>
```

**Parameters:**
- `timeSlice` (number, required) - Available processing time in milliseconds

**Returns:** `Promise<Object>` - Processing result:
```javascript
{
  processed: number,        // Number of messages processed
  processingTime: number,    // Time spent processing (ms)
  errors: number            // Number of processing errors
}
```

**Behavior:**
- Gets available messages from subsystem queue
- Returns immediately if no messages available
- Processes up to `maxMessagesPerSlice` messages or until time slice is exhausted
- For each message:
  - Checks if time slice is exhausted
  - Refreshes message list to get current queue state
  - Selects next message using configured strategy
  - Removes selected message from queue
  - Processes message via processor facet
  - Tracks processing for statistics
- Updates statistics after processing
- Returns processing statistics
- Errors during processing are caught and counted, but don't stop processing

**Example:**
```javascript
const scheduler = new SubsystemScheduler(subsystem);

// Process messages during 50ms time slice
const result = await scheduler.process(50);
console.log(`Processed ${result.processed} messages`);
console.log(`Processing time: ${result.processingTime}ms`);
console.log(`Errors: ${result.errors}`);
```

**Example - Time Slice Exhaustion:**
```javascript
// Process with small time slice
const result = await scheduler.process(10); // 10ms

// May process fewer messages if time slice is exhausted
if (result.processingTime >= 10) {
  console.log('Time slice exhausted');
}
```

### `getAvailableMessages()`

Get available messages from the subsystem queue.

**Signature:**
```javascript
getAvailableMessages() => Array<{msg: Message, options: Object}>
```

**Returns:** `Array<{msg: Message, options: Object}>` - Array of message-options pairs

**Throws:**
- `Error` - If queue facet is not found

**Behavior:**
- Accesses queue facet via `subsystem.find('queue')`
- Returns all messages from queue without removing them (uses `peekAll()`)
- Messages are removed as they are processed

**Example:**
```javascript
const messages = scheduler.getAvailableMessages();
console.log(`Available messages: ${messages.length}`);
```

### `selectNextMessage(messages)`

Select next message using the configured strategy.

**Signature:**
```javascript
selectNextMessage(messages) => {msg: Message, options: Object} | null
```

**Parameters:**
- `messages` (Array<{msg: Message, options: Object}>, required) - Available message-options pairs

**Returns:** `{msg: Message, options: Object} | null` - Selected message-options pair or `null` if empty

**Behavior:**
- Gets current strategy from options
- Retrieves strategy function from strategy registry
- Falls back to priority strategy if strategy not found
- Calls strategy function with messages and strategy options
- Falls back to priority strategy if strategy execution fails
- Returns selected message-options pair

**Example:**
```javascript
const messages = scheduler.getAvailableMessages();
const selected = scheduler.selectNextMessage(messages);
if (selected) {
  console.log(`Selected message: ${selected.msg.getId()}`);
}
```

### `processMessage(pair)`

Process a single message-options pair.

**Signature:**
```javascript
processMessage(pair) => Promise<void>
```

**Parameters:**
- `pair` (Object, required) - Message-options pair:
  - `msg` (Message, required) - Message to process
  - `options` (Object, required) - Processing options

**Throws:**
- `Error` - If queue facet is not found
- `Error` - If processor facet is not found
- `Error` - If message processing fails

**Behavior:**
- Removes the selected pair from queue (using `queue.remove()`)
- Accesses processor facet via `subsystem.find('processor')`
- Delegates to `processorFacet.processMessage(pair)` for actual processing
- Logs warning if message removal fails (but continues processing)

**Example:**
```javascript
const pair = { msg: message, options: {} };
await scheduler.processMessage(pair);
```

## Strategy Management Methods

### `registerStrategy(name, strategyFunction)`

Register a new message scheduling strategy.

**Signature:**
```javascript
registerStrategy(name, strategyFunction) => void
```

**Parameters:**
- `name` (string, required) - Strategy name
- `strategyFunction` (Function, required) - Strategy function: `(messages, options) => {msg: Message, options: Object} | null`

**Throws:**
- `Error` - If `strategyFunction` is not a function

**Behavior:**
- Validates strategy function is a function
- Adds strategy to strategy registry
- Logs debug message if debug is enabled

**Strategy Function Signature:**
```javascript
(messages, options) => {msg: Message, options: Object} | null
```

**Parameters:**
- `messages` (Array<{msg: Message, options: Object}>) - Available message-options pairs
- `options` (Object) - Strategy options (from `getStrategyOptions()`)

**Returns:** `{msg: Message, options: Object} | null` - Selected pair or `null` if empty

**Example:**
```javascript
// Register custom strategy
scheduler.registerStrategy('random', (messages, options) => {
  if (messages.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
});

// Use custom strategy
scheduler.setStrategy('random');
```

### `unregisterStrategy(name)`

Unregister a message scheduling strategy.

**Signature:**
```javascript
unregisterStrategy(name) => boolean
```

**Parameters:**
- `name` (string, required) - Strategy name to unregister

**Returns:** `boolean` - `true` if strategy was removed, `false` if not found

**Throws:**
- `Error` - If attempting to unregister the default `'priority'` strategy

**Behavior:**
- Prevents unregistering the default `'priority'` strategy
- Removes strategy from registry
- Logs debug message if debug is enabled and strategy was removed
- Returns `true` if strategy was found and removed, `false` otherwise

**Example:**
```javascript
// Register custom strategy
scheduler.registerStrategy('custom', strategyFunction);

// Later, unregister
const removed = scheduler.unregisterStrategy('custom');
if (removed) {
  console.log('Custom strategy removed');
}

// Cannot unregister default strategy
try {
  scheduler.unregisterStrategy('priority');
} catch (error) {
  // Error: "Cannot unregister default priority strategy"
}
```

### `setStrategy(name, options)`

Set the current message scheduling strategy.

**Signature:**
```javascript
setStrategy(name, options = {}) => void
```

**Parameters:**
- `name` (string, required) - Strategy name
- `options` (object, optional, default: `{}`) - Strategy-specific options

**Throws:**
- `Error` - If strategy name is unknown
- `Error` - If strategy options are invalid

**Behavior:**
- Validates strategy exists in registry
- Validates strategy options using `validateMessageStrategyOptions()`
- Updates `options.schedulingStrategy` and `options.strategyOptions`
- Logs debug message if debug is enabled

**Example:**
```javascript
// Set FIFO strategy
scheduler.setStrategy('fifo');

// Set load-based strategy with options
scheduler.setStrategy('load-based', {
  complexityEstimator: (msg) => {
    const body = msg.getBody();
    return body.operations?.length || 1;
  }
});
```

### `getAvailableStrategies()`

Get available strategy names.

**Signature:**
```javascript
getAvailableStrategies() => Array<string>
```

**Returns:** `Array<string>` - Array of strategy names

**Example:**
```javascript
const strategies = scheduler.getAvailableStrategies();
console.log('Available strategies:', strategies);
// ['priority', 'fifo', 'load-based', 'adaptive', 'custom']
```

### `getCurrentStrategy()`

Get current strategy name.

**Signature:**
```javascript
getCurrentStrategy() => string
```

**Returns:** `string` - Current strategy name

**Example:**
```javascript
const current = scheduler.getCurrentStrategy();
console.log(`Current strategy: ${current}`);
```

## Statistics Methods

### `getStatistics()`

Get scheduler statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object:
```javascript
{
  timeSlicesProcessed: number,
  messagesProcessed: number,
  processingErrors: number,
  averageProcessingTime: number,
  totalProcessingTime: number,
  subsystemName: string,
  currentStrategy: string,
  availableStrategies: Array<string>,
  queueUtilization: number,
  options: Object
}
```

**Example:**
```javascript
const stats = scheduler.getStatistics();
console.log(`Processed ${stats.messagesProcessed} messages`);
console.log(`Average time: ${stats.averageProcessingTime}ms`);
console.log(`Queue utilization: ${(stats.queueUtilization * 100).toFixed(1)}%`);
```

### `updateStatistics(processed, processingTime)`

Update scheduler statistics (internal method).

**Signature:**
```javascript
updateStatistics(processed, processingTime) => void
```

**Parameters:**
- `processed` (number, required) - Number of messages processed
- `processingTime` (number, required) - Time spent processing (ms)

**Behavior:**
- Increments `timeSlicesProcessed`
- Adds to `messagesProcessed`
- Adds to `totalProcessingTime`
- Recalculates `averageProcessingTime`

**Note:** This is an internal method called by `process()`. It should not be called directly.

### `clear()`

Clear statistics and reset state.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Resets all statistics to zero
- Resets `currentIndex` to 0
- Clears `lastProcessed` tracking
- Logs debug message if debug is enabled

**Example:**
```javascript
// Clear statistics
scheduler.clear();
const stats = scheduler.getStatistics();
// All counters are now 0
```

## Utility Methods

### `calculateQueueUtilization()`

Calculate current queue utilization.

**Signature:**
```javascript
calculateQueueUtilization() => number
```

**Returns:** `number` - Queue utilization ratio (0.0 to 1.0)

**Behavior:**
- Accesses queue facet via `subsystem.find('queue')`
- Returns 0 if queue facet not found
- Calculates utilization as `size / capacity`
- Returns value between 0.0 and 1.0

**Example:**
```javascript
const utilization = scheduler.calculateQueueUtilization();
console.log(`Queue utilization: ${(utilization * 100).toFixed(1)}%`);
```

### `getStrategyOptions()`

Get options object for strategy functions (internal method).

**Signature:**
```javascript
getStrategyOptions() => Object
```

**Returns:** `Object` - Strategy options:
```javascript
{
  currentIndex: number,
  maxMessagesPerSlice: number,
  queueUtilization: number,
  subsystemStats: Object,
  lastProcessed: Object,
  onSelection: Function
}
```

**Note:** This is an internal method called by `selectNextMessage()`. It provides context to strategy functions.

## Scheduling Strategies

The scheduler supports multiple scheduling strategies:

### Priority Strategy (default)

Atomic messages first, then by timestamp.

```javascript
scheduler.setStrategy('priority');
```

**Behavior:**
- Atomic messages have highest priority
- Among atomic messages, older messages (lower timestamp) are preferred
- Among non-atomic messages, older messages are preferred

### FIFO Strategy

First in, first out (oldest messages first).

```javascript
scheduler.setStrategy('fifo');
```

**Behavior:**
- Selects message with lowest timestamp (oldest)
- Simple and predictable ordering

### Load-Based Strategy

Simple messages first (lowest complexity).

```javascript
scheduler.setStrategy('load-based', {
  complexityEstimator: (msg) => {
    // Custom complexity estimation
    return msg.getBody().operations?.length || 1;
  }
});
```

**Behavior:**
- Estimates message complexity
- Selects message with lowest complexity
- Can use custom `complexityEstimator` function

### Adaptive Strategy

Dynamic switching based on queue utilization.

```javascript
scheduler.setStrategy('adaptive');
```

**Behavior:**
- Switches strategies based on queue utilization
- High utilization (>80%): Uses load-based strategy
- Medium utilization (40-80%): Uses priority strategy
- Low utilization (<40%): Uses FIFO strategy

See `message-scheduling-strategies` documentation for strategy details.

## Usage Patterns

### Basic Processing

```javascript
import { SubsystemScheduler } from './subsystem-scheduler.mycelia.js';

const scheduler = new SubsystemScheduler(subsystem, {
  schedulingStrategy: 'priority',
  maxMessagesPerSlice: 10,
  debug: true
});

// Process messages during time slice
const result = await scheduler.process(50);
console.log(`Processed ${result.processed} messages`);
```

### Strategy Management

```javascript
// Get available strategies
const strategies = scheduler.getAvailableStrategies();
console.log('Available:', strategies);

// Set strategy
scheduler.setStrategy('fifo');

// Get current strategy
const current = scheduler.getCurrentStrategy();
console.log(`Current: ${current}`);

// Register custom strategy
scheduler.registerStrategy('custom', (messages, options) => {
  // Custom selection logic
  return messages[0];
});

// Use custom strategy
scheduler.setStrategy('custom');
```

### Statistics Monitoring

```javascript
// Process messages
await scheduler.process(50);

// Get statistics
const stats = scheduler.getStatistics();
console.log(`Messages processed: ${stats.messagesProcessed}`);
console.log(`Average time: ${stats.averageProcessingTime}ms`);
console.log(`Queue utilization: ${(stats.queueUtilization * 100).toFixed(1)}%`);
console.log(`Errors: ${stats.processingErrors}`);

// Clear statistics
scheduler.clear();
```

### Custom Strategy

```javascript
// Register custom strategy
scheduler.registerStrategy('urgency-based', (messages, options) => {
  if (messages.length === 0) return null;
  
  // Select message with highest urgency
  return messages.reduce((mostUrgent, current) => {
    const currentUrgency = current.msg.getBody()?.urgency || 0;
    const mostUrgentValue = mostUrgent.msg.getBody()?.urgency || 0;
    return currentUrgency > mostUrgentValue ? current : mostUrgent;
  });
});

// Use custom strategy
scheduler.setStrategy('urgency-based');
```

## Error Handling

- **Missing Queue Facet**: `getAvailableMessages()` and `processMessage()` throw errors if queue facet is not found
- **Missing Processor Facet**: `processMessage()` throws error if processor facet is not found
- **Unknown Strategy**: `setStrategy()` throws error if strategy name is unknown
- **Invalid Strategy Options**: `setStrategy()` throws error if strategy options are invalid
- **Invalid Strategy Function**: `registerStrategy()` throws error if strategy function is not a function
- **Cannot Unregister Priority**: `unregisterStrategy()` throws error if attempting to unregister `'priority'`
- **Processing Errors**: Errors during message processing are caught, counted, and logged, but don't stop processing

## Debug Logging

The scheduler supports debug logging:

```javascript
const scheduler = new SubsystemScheduler(subsystem, {
  debug: true
});
```

Debug messages include:
- Scheduler initialization with strategy and available strategies
- Message processing progress
- Time slice exhaustion warnings
- Processing errors
- Strategy registration/unregistration
- Strategy changes
- Statistics clearing

## Integration with useScheduler Hook

The `SubsystemScheduler` is used internally by the `useScheduler` hook:

```javascript
// In useScheduler hook
const scheduler = new SubsystemScheduler(subsystem, {
  schedulingStrategy: config.schedulingStrategy || 'priority',
  maxMessagesPerSlice: config.maxMessagesPerSlice || 10,
  debug: getDebugFlag(config, ctx)
});

// Scheduler is exposed via facet
subsystem.scheduler.process(timeSlice);
// Delegates to scheduler.process()
```

## Best Practices

1. **Choose Appropriate Strategy**: Select strategy based on message characteristics and requirements
2. **Tune maxMessagesPerSlice**: Balance throughput with time slice constraints
3. **Monitor Statistics**: Track processing statistics to optimize configuration
4. **Handle Errors**: Check `errors` count in processing results
5. **Respect Time Slices**: Don't exceed allocated time slices
6. **Use Custom Strategies**: Register custom strategies for domain-specific requirements
7. **Monitor Queue Utilization**: Use queue utilization for adaptive strategies

## Performance Considerations

- **Strategy Selection**: Strategy function is called for each message selection (may be called multiple times per time slice)
- **Message Refresh**: Message list is refreshed before each selection to get current queue state
- **Time Slice Checking**: Time slice is checked before each message to respect time constraints
- **Queue Operations**: Uses `peekAll()` and `remove()` for queue access (may have performance implications for large queues)

## Thread Safety

The `SubsystemScheduler` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## See Also

- [useScheduler Hook](./USE-SCHEDULER.md) - Hook that uses SubsystemScheduler
- [Message Scheduling Strategies](./MESSAGE-SCHEDULING-STRATEGIES.md) - Strategy function implementations
- [useQueue](../queue/USE-QUEUE.md) - Queue hook (required dependency)
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook (required dependency)
- [SubsystemQueueManager](../queue/SUBSYSTEM-QUEUE-MANAGER.md) - Queue manager implementation








