# useGlobalScheduler Hook

## Overview

The `useGlobalScheduler` hook provides global scheduling functionality to subsystems (typically MessageSystem) using `GlobalScheduler`. It manages time allocation between subsystems using configurable scheduling strategies, coordinating the overall system scheduling by allocating time slices to subsystems and ensuring fair resource distribution across the entire message processing pipeline.

**Key Features:**
- **Global Time Allocation**: Allocates time slices to subsystems across the entire system
- **Configurable Strategies**: Support for multiple scheduling strategies (round-robin, priority, load-based, adaptive)
- **Pluggable Strategy System**: Register custom scheduling strategies
- **Statistics Tracking**: Tracks scheduling cycles, time allocated, and subsystem statistics
- **Automatic Scheduling Loop**: Continuous scheduling loop that allocates time to subsystems
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'globalScheduler',
  overwrite: false,
  required: [],
  attach: false,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'globalScheduler'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing globalScheduler facet
- **`required`**: `[]` - No dependencies (requires MessageSystem in context)
- **`attach`**: `false` - Facet is not automatically attached to the subsystem (accessed via `find()`)
- **`source`**: `import.meta.url` - Source file location for debugging

**Note:** This hook is typically used on MessageSystem instances, not regular subsystems. The facet is not attached, so it must be accessed via `subsystem.find('globalScheduler')`.

## Configuration

The hook reads configuration from `ctx.config.globalScheduler`:

```javascript
{
  timeSliceDuration: number,
  schedulingStrategy: 'round-robin' | 'priority' | 'load-based' | 'adaptive',
  debug: boolean,
  options: {
    // Additional options passed to GlobalScheduler
  }
}
```

### Configuration Options

- **`timeSliceDuration`** (number, default: `50`): Duration of each time slice in milliseconds
- **`schedulingStrategy`** (string, default: `'round-robin'`): Scheduling strategy
  - `'round-robin'`: Equal time allocation in circular order (default)
  - `'priority'`: Allocate time based on subsystem priority
  - `'load-based'`: Allocate more time to subsystems with more work
  - `'adaptive'`: Dynamically switches strategies based on system utilization
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.
- **`options`** (object, optional): Additional options passed to GlobalScheduler constructor

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system', {
  timeSliceDuration: 100,
  schedulingStrategy: 'priority',
  config: {
    globalScheduler: {
      timeSliceDuration: 100,
      schedulingStrategy: 'adaptive',
      debug: true
    }
  }
});
```

## Scheduling Strategies

### Round-Robin (Default)

Cycles through subsystems in order, ensuring equal time allocation:

```javascript
messageSystem.globalScheduler.setStrategy('round-robin');
```

**Behavior:**
- Cycles through subsystems in order
- Ensures equal time allocation
- Simple and fair

### Priority-Based

Allocates time based on subsystem priority (higher priority = more time):

```javascript
messageSystem.globalScheduler.setStrategy('priority');
```

**Behavior:**
- Selects subsystem with highest priority
- Priority is set via `subsystem.getPriority()` (from scheduler facet)
- Higher priority subsystems get more time

### Load-Based

Allocates more time to subsystems with more work (higher queue load):

```javascript
messageSystem.globalScheduler.setStrategy('load-based');
```

**Behavior:**
- Selects subsystem with most messages in queue
- Prioritizes subsystems with more work
- Helps balance workload

### Adaptive

Dynamically switches strategies based on system utilization:

```javascript
messageSystem.globalScheduler.setStrategy('adaptive', {
  averageUtilization: 0.7
});
```

**Behavior:**
- Monitors system utilization
- Switches strategies based on load
- Adapts to changing conditions

## Facet Methods

### `start()`

Start the global scheduling loop.

**Signature:**
```javascript
start() => void
```

**Behavior:**
- Starts the continuous scheduling loop
- Begins allocating time slices to subsystems
- Schedules subsystems based on configured strategy
- Runs until `stop()` is called

**Example:**
```javascript
const scheduler = messageSystem.find('globalScheduler');
scheduler.start();

// Global scheduler is now running
```

### `stop()`

Stop the global scheduling loop.

**Signature:**
```javascript
stop() => void
```

**Behavior:**
- Stops the scheduling loop
- No more time slices will be allocated
- Subsystems continue processing any in-flight messages

**Example:**
```javascript
scheduler.stop();

// Global scheduler is now stopped
```

### `setStrategy(name, options)`

Set the current scheduling strategy.

**Signature:**
```javascript
setStrategy(name, options = {}) => void
```

**Parameters:**
- `name` (string, required) - Strategy name: `'round-robin'`, `'priority'`, `'load-based'`, `'adaptive'`
- `options` (object, optional) - Strategy-specific options

**Behavior:**
- Validates strategy name exists
- Validates strategy options
- Sets the scheduling strategy
- Throws error if strategy not found or options invalid

**Example:**
```javascript
// Set round-robin strategy
scheduler.setStrategy('round-robin');

// Set priority strategy
scheduler.setStrategy('priority');

// Set adaptive strategy with options
scheduler.setStrategy('adaptive', {
  averageUtilization: 0.7
});
```

### `registerStrategy(name, strategyFunction)`

Register a custom scheduling strategy.

**Signature:**
```javascript
registerStrategy(name, strategyFunction) => void
```

**Parameters:**
- `name` (string, required) - Strategy name
- `strategyFunction` (Function, required) - Strategy function: `(subsystems, options) => BaseSubsystem`

**Behavior:**
- Registers a custom strategy function
- Strategy function receives subsystems array and options
- Strategy function should return the selected subsystem
- Throws error if strategy function is not a function

**Example:**
```javascript
// Register custom strategy
scheduler.registerStrategy('my-custom', (subsystems, options) => {
  // Custom selection logic
  // Return the subsystem to schedule next
  return subsystems[0];
});

// Use custom strategy
scheduler.setStrategy('my-custom');
```

### `unregisterStrategy(name)`

Unregister a scheduling strategy.

**Signature:**
```javascript
unregisterStrategy(name) => boolean
```

**Parameters:**
- `name` (string, required) - Strategy name to unregister

**Returns:** `boolean` - `true` if strategy was removed, `false` if not found

**Behavior:**
- Removes strategy from registry
- Cannot unregister default `'round-robin'` strategy
- Throws error if trying to unregister `'round-robin'`

**Example:**
```javascript
// Unregister custom strategy
const removed = scheduler.unregisterStrategy('my-custom');
if (removed) {
  console.log('Strategy removed');
}
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
// ['round-robin', 'priority', 'load-based', 'adaptive', 'my-custom']
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
console.log('Current strategy:', current);
// 'round-robin'
```

### `getStatistics()`

Get global scheduler statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object:
```javascript
{
  cyclesCompleted: number,        // Number of scheduling cycles completed
  totalTimeAllocated: number,     // Total time allocated (ms)
  subsystemsScheduled: number,    // Number of subsystems scheduled
  schedulingErrors: number,       // Number of scheduling errors
  isRunning: boolean,             // Whether scheduler is running
  registeredSubsystems: Array<string>, // Names of registered subsystems
  subsystemCount: number,        // Number of subsystems
  currentStrategy: string,        // Current strategy name
  availableStrategies: Array<string>, // Available strategy names
  averageUtilization: number,    // Average system utilization (0-1)
  options: Object                // Scheduler options
}
```

**Example:**
```javascript
const stats = scheduler.getStatistics();
console.log('Scheduling stats:', stats);
console.log(`Cycles: ${stats.cyclesCompleted}`);
console.log(`Time allocated: ${stats.totalTimeAllocated}ms`);
console.log(`Subsystems scheduled: ${stats.subsystemsScheduled}`);
```

### `getSubsystemStatistics()`

Get statistics for all registered subsystems.

**Signature:**
```javascript
getSubsystemStatistics() => Object
```

**Returns:** `Object` - Subsystem statistics object keyed by subsystem name:
```javascript
{
  'subsystem-name': {
    // Subsystem statistics from subsystem.getStatistics()
  }
}
```

**Example:**
```javascript
const subsystemStats = scheduler.getSubsystemStatistics();
console.log('Subsystem stats:', subsystemStats);
// {
//   'canvas': { messagesAccepted: 100, messagesProcessed: 95, ... },
//   'server': { messagesAccepted: 50, messagesProcessed: 48, ... }
// }
```

### `clear()`

Clear all statistics and reset state.

**Signature:**
```javascript
clear() => void
```

**Behavior:**
- Resets all statistics counters
- Resets scheduling state (index, cycle, last scheduled)
- Does not stop the scheduler
- Useful for resetting metrics

**Example:**
```javascript
scheduler.clear();
console.log('Statistics cleared');
```

## Usage Patterns

### Basic Setup

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
import { useGlobalScheduler } from './hooks/global-scheduler/use-global-scheduler.mycelia.js';

// Create MessageSystem (useGlobalScheduler is included in default hooks)
const messageSystem = new MessageSystem('main-system', {
  timeSliceDuration: 50,
  schedulingStrategy: 'round-robin'
});

await messageSystem.bootstrap();

// Get global scheduler facet
const scheduler = messageSystem.find('globalScheduler');

// Start scheduling
scheduler.start();
```

### With Custom Strategy

```javascript
// Register custom strategy
scheduler.registerStrategy('workload-balance', (subsystems, options) => {
  // Select subsystem with highest queue utilization
  return subsystems.reduce((busiest, current) => {
    const currentUtil = current.getQueueStatus().size / current.queue.capacity;
    const busiestUtil = busiest.getQueueStatus().size / busiest.queue.capacity;
    return currentUtil > busiestUtil ? current : busiest;
  });
});

// Use custom strategy
scheduler.setStrategy('workload-balance');
```

### Strategy Switching

```javascript
// Start with round-robin
scheduler.setStrategy('round-robin');
scheduler.start();

// Switch to priority-based during high load
if (highLoad) {
  scheduler.setStrategy('priority');
}

// Switch to adaptive for dynamic adjustment
scheduler.setStrategy('adaptive', {
  averageUtilization: 0.7
});
```

### Monitoring Statistics

```javascript
// Get global statistics
const stats = scheduler.getStatistics();
console.log(`Cycles: ${stats.cyclesCompleted}`);
console.log(`Time allocated: ${stats.totalTimeAllocated}ms`);
console.log(`Average utilization: ${stats.averageUtilization}`);

// Get subsystem statistics
const subsystemStats = scheduler.getSubsystemStatistics();
for (const [name, stats] of Object.entries(subsystemStats)) {
  console.log(`${name}: ${stats.messagesProcessed} messages processed`);
}
```

### Scheduler Control

```javascript
// Start scheduler
scheduler.start();

// ... system runs ...

// Stop scheduler
scheduler.stop();

// Clear statistics
scheduler.clear();
```

## Scheduling Flow

### Global Scheduling Loop

1. **Start**: `start()` begins the scheduling loop
2. **Get Subsystems**: Retrieves all registered subsystems from MessageSystem
3. **Select Subsystem**: Uses configured strategy to select next subsystem
4. **Allocate Time**: Allocates time slice to selected subsystem
5. **Process**: Subsystem processes messages during time slice
6. **Schedule Next**: Schedules next cycle after `timeSliceDuration`
7. **Repeat**: Continues until `stop()` is called

### Time Slice Allocation

When a subsystem is selected:
1. Time slice is allocated (default: 50ms)
2. `subsystem.process(timeSlice)` is called
3. Subsystem processes messages during the time slice
4. Statistics are recorded
5. Next subsystem is scheduled

## Integration with MessageSystem

The `useGlobalScheduler` hook is typically used on MessageSystem instances:

```javascript
// MessageSystem includes useGlobalScheduler in default hooks
const messageSystem = new MessageSystem('main-system', {
  timeSliceDuration: 50,
  schedulingStrategy: 'round-robin'
});

await messageSystem.bootstrap();

// Access global scheduler
const scheduler = messageSystem.find('globalScheduler');

// Start scheduling
scheduler.start();
```

## Integration with Subsystem Schedulers

The global scheduler coordinates with subsystem schedulers:

```javascript
// Global scheduler allocates time slice
scheduler.allocateTimeSlice(subsystem);

// Subsystem scheduler processes messages during time slice
await subsystem.process(timeSlice);

// Subsystem scheduler uses its own strategy to select messages
const result = await subsystem.scheduler.process(timeSlice);
```

## Custom Strategies

### Strategy Function Signature

```javascript
function customStrategy(subsystems, options) {
  // subsystems: Array<BaseSubsystem> - Available subsystems
  // options: Object - Strategy options
  //   - currentIndex: number
  //   - schedulerStats: Object
  //   - averageUtilization: number
  //   - lastScheduled: Object
  //   - onSelection: Function
  //   - onScheduled: Function
  
  // Return selected subsystem
  return subsystems[0];
}
```

### Example Custom Strategy

```javascript
// Least recently used (LRU) strategy
scheduler.registerStrategy('lru', (subsystems, options) => {
  if (subsystems.length === 0) return null;
  
  const { lastScheduled } = options;
  
  // Find subsystem scheduled least recently
  let lruSubsystem = subsystems[0];
  let lruTime = lastScheduled[lruSubsystem.name] || 0;
  
  for (const subsystem of subsystems) {
    const scheduledTime = lastScheduled[subsystem.name] || 0;
    if (scheduledTime < lruTime) {
      lruSubsystem = subsystem;
      lruTime = scheduledTime;
    }
  }
  
  return lruSubsystem;
});
```

## Error Handling

### Missing MessageSystem

If MessageSystem is not found in context:

```javascript
// Throws during hook execution
throw new Error(`useGlobalScheduler ${name}: MessageSystem (ctx.ms) is required but not found`);
```

### Unknown Strategy

If strategy is not found:

```javascript
try {
  scheduler.setStrategy('unknown-strategy');
} catch (error) {
  console.error(error.message);
  // "Unknown strategy: unknown-strategy. Available: round-robin, priority, ..."
}
```

### Invalid Strategy Options

If strategy options are invalid:

```javascript
try {
  scheduler.setStrategy('adaptive', { invalidOption: true });
} catch (error) {
  console.error(error.message);
  // "Invalid options for strategy 'adaptive': ..."
}
```

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const messageSystem = new MessageSystem('main-system', {
  config: {
    globalScheduler: {
      debug: true
    }
  }
});
```

Debug messages include:
- Scheduler initialization
- Strategy changes
- Time slice allocation
- Scheduling errors
- Statistics clearing

## Dependencies

The `useGlobalScheduler` hook requires:

- **MessageSystem** (in `ctx.ms`) - Required for accessing registered subsystems

**Note:** The hook has no facet dependencies, but requires MessageSystem in the context to function properly.

## Best Practices

1. **Use on MessageSystem**: Typically used on MessageSystem instances, not regular subsystems
2. **Configure Time Slices**: Set appropriate `timeSliceDuration` based on your workload
3. **Choose Strategy Wisely**: Select strategy based on your use case:
   - `round-robin` for equal time allocation
   - `priority` for priority-based allocation
   - `load-based` for workload balancing
   - `adaptive` for dynamic adjustment
4. **Monitor Statistics**: Regularly check statistics to understand system behavior
5. **Custom Strategies**: Create custom strategies for specialized use cases
6. **Start After Bootstrap**: Start scheduler after MessageSystem is bootstrapped
7. **Stop Gracefully**: Stop scheduler before shutting down system

## Performance Considerations

### Time Slice Duration

- **Too Small**: High overhead, frequent context switching
- **Too Large**: Poor responsiveness, unfair allocation
- **Recommended**: 50-100ms for most use cases

### Strategy Selection

- **Round-Robin**: Lowest overhead, fair allocation
- **Priority**: Medium overhead, priority-based allocation
- **Load-Based**: Medium overhead, workload balancing
- **Adaptive**: Higher overhead, dynamic adjustment

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [GlobalScheduler](./GLOBAL-SCHEDULER.md) - GlobalScheduler class implementation
- [Global Scheduling Strategies](./GLOBAL-SCHEDULING-STRATEGIES.md) - Pluggable global scheduling strategies
- [useScheduler](./../scheduler/USE-SCHEDULER.md) - Subsystem-level scheduler hook
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

