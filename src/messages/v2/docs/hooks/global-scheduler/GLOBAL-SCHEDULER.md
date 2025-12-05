# GlobalScheduler Class

## Overview

The `GlobalScheduler` class manages time allocation between subsystems using configurable scheduling strategies. It coordinates the overall system scheduling by allocating time slices to subsystems and ensuring fair resource distribution across the entire message processing pipeline. The scheduler uses a pluggable strategy system for flexible scheduling algorithms.

**Key Features:**
- **Global Time Allocation**: Allocates time slices to subsystems across the entire system
- **Pluggable Strategies**: Configurable scheduling strategies (round-robin, priority, load-based, adaptive)
- **Continuous Scheduling Loop**: Automatic scheduling loop that runs until stopped
- **Statistics Tracking**: Comprehensive statistics for monitoring performance
- **Strategy Registry**: Register and unregister custom scheduling strategies
- **MessageSystem Integration**: Works with MessageSystem to access registered subsystems
- **Debug Support**: Conditional debug logging

## Constructor

### `new GlobalScheduler(messageSystem, options)`

Create a new `GlobalScheduler` instance.

**Signature:**
```javascript
new GlobalScheduler(messageSystem, options = {})
```

**Parameters:**
- `messageSystem` (MessageSystem, required) - The MessageSystem instance to schedule subsystems for
- `options` (Object, optional) - Configuration options:
  - `timeSliceDuration` (number, optional, default: `50`) - Duration of each time slice in milliseconds
  - `schedulingStrategy` (string, optional, default: `'round-robin'`) - Scheduling strategy
    - `'round-robin'`: Equal time allocation in circular order (default)
    - `'priority'`: Allocate time based on subsystem priority
    - `'load-based'`: Allocate more time to subsystems with more work
    - `'adaptive'`: Dynamically switches strategies based on system utilization
  - `debug` (boolean, optional, default: `false`) - Enable debug logging

**Throws:**
- No constructor errors (validates at runtime)

**Initialization:**
- Stores MessageSystem reference
- Initializes options with defaults
- Creates strategy registry with default strategies (round-robin, priority, load-based, adaptive)
- Initializes scheduling state (`isRunning`, `currentSubsystemIndex`, `schedulingCycle`, `lastScheduled`)
- Initializes statistics counters
- Logs initialization message if debug is enabled

**Example:**
```javascript
import { GlobalScheduler } from '../../models/message-system/global-scheduler.mycelia.js';

// Basic scheduler with defaults
const scheduler = new GlobalScheduler(messageSystem);

// Configured scheduler with priority-based scheduling
const scheduler = new GlobalScheduler(messageSystem, {
  timeSliceDuration: 100,
  schedulingStrategy: 'priority',
  debug: true
});

// Load-based scheduler for high-throughput systems
const scheduler = new GlobalScheduler(messageSystem, {
  timeSliceDuration: 25,
  schedulingStrategy: 'load-based',
  debug: false
});
```

## Core Methods

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
- If already running, logs warning and returns (no-op)

**Example:**
```javascript
const scheduler = new GlobalScheduler(messageSystem);
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
- Logs debug message if debug is enabled

**Example:**
```javascript
scheduler.stop();

// Global scheduler is now stopped
```

### `scheduleNext()`

Schedule the next subsystem (internal method, called automatically).

**Signature:**
```javascript
scheduleNext() => Promise<void>
```

**Behavior:**
- Internal method called by the scheduling loop
- Gets subsystems from MessageSystem
- If no subsystems, schedules next cycle and returns
- Selects next subsystem using configured strategy
- Allocates time slice to selected subsystem
- Schedules next cycle after `timeSliceDuration`
- Continues until `stop()` is called

**Note:** This method is called automatically by the scheduling loop. You typically don't call it directly.

### `selectNextSubsystem(subsystems)`

Select next subsystem based on scheduling strategy.

**Signature:**
```javascript
selectNextSubsystem(subsystems) => BaseSubsystem | null
```

**Parameters:**
- `subsystems` (Array<BaseSubsystem>, required) - Available subsystems

**Returns:** `BaseSubsystem | null` - Selected subsystem or null if none available

**Behavior:**
- Gets strategy function from registry
- Calls strategy function with subsystems and options
- Falls back to round-robin if strategy not found
- Catches errors and falls back to round-robin
- Updates statistics on errors

**Example:**
```javascript
const subsystems = messageSystem.getSubsystems();
const selected = scheduler.selectNextSubsystem(subsystems);
if (selected) {
  console.log('Selected subsystem:', selected.name);
}
```

### `allocateTimeSlice(subsystem)`

Allocate time slice to a subsystem.

**Signature:**
```javascript
allocateTimeSlice(subsystem) => Promise<void>
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Subsystem to schedule

**Behavior:**
- Increments subsystems scheduled counter
- Adds time slice duration to total time allocated
- Tracks scheduling timestamp for LRU strategy
- Calls `subsystem.process(timeSlice)` to process messages
- Logs allocation and processing results if debug is enabled
- Catches errors and increments error counter

**Example:**
```javascript
const subsystem = messageSystem.getSubsystems()[0];
await scheduler.allocateTimeSlice(subsystem);
```

## Strategy Management

### `setStrategy(name, options)`

Set the current scheduling strategy.

**Signature:**
```javascript
setStrategy(name, options = {}) => void
```

**Parameters:**
- `name` (string, required) - Strategy name: `'round-robin'`, `'priority'`, `'load-based'`, `'adaptive'`
- `options` (Object, optional) - Strategy-specific options

**Throws:**
- `Error` - If strategy name not found
- `Error` - If strategy options are invalid

**Behavior:**
- Validates strategy name exists in registry
- Validates strategy options using `validateStrategyOptions()`
- Sets the scheduling strategy
- Stores strategy options
- Logs debug message if debug is enabled

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
- `strategyFunction` (Function, required) - Strategy function: `(subsystems, options) => BaseSubsystem | null`

**Throws:**
- `Error` - If strategy function is not a function

**Behavior:**
- Validates strategy function is a function
- Registers strategy in internal registry
- Logs debug message if debug is enabled

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

**Throws:**
- `Error` - If trying to unregister `'round-robin'` (default strategy)

**Behavior:**
- Prevents unregistering default `'round-robin'` strategy
- Removes strategy from registry
- Logs debug message if debug is enabled and strategy was removed
- Returns `true` if strategy was removed, `false` if not found

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

## Statistics and Monitoring

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
- Logs debug message if debug is enabled

**Example:**
```javascript
scheduler.clear();
console.log('Statistics cleared');
```

## Utility Methods

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
  schedulerStats: Object,
  averageUtilization: number,
  lastScheduled: Object,
  onSelection: Function,
  onScheduled: Function
}
```

**Note:** This method is used internally by `selectNextSubsystem()`. You typically don't call it directly.

### `calculateAverageUtilization()`

Calculate average system utilization.

**Signature:**
```javascript
calculateAverageUtilization() => number
```

**Returns:** `number` - Average utilization (0-1)

**Behavior:**
- Gets all subsystems from MessageSystem
- Calculates queue utilization for each subsystem
- Returns average utilization across all subsystems
- Returns 0 if no subsystems available

**Example:**
```javascript
const utilization = scheduler.calculateAverageUtilization();
console.log(`Average utilization: ${(utilization * 100).toFixed(1)}%`);
```

## Usage Patterns

### Basic Setup

```javascript
import { GlobalScheduler } from './global-scheduler.mycelia.js';
import { MessageSystem } from './message-system.v2.mycelia.js';

// Create MessageSystem
const messageSystem = new MessageSystem('main-system');

// Create scheduler
const scheduler = new GlobalScheduler(messageSystem, {
  timeSliceDuration: 50,
  schedulingStrategy: 'round-robin',
  debug: true
});

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
scheduler.start();
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

The `GlobalScheduler` is designed to work with MessageSystem:

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

### Scheduling Errors

Errors during scheduling are caught and counted:

```javascript
// Errors are caught in allocateTimeSlice()
// Statistics are updated (schedulingErrors++)
// Processing continues with next subsystem
```

## Debug Logging

The scheduler supports debug logging:

```javascript
const scheduler = new GlobalScheduler(messageSystem, {
  debug: true
});
```

Debug messages include:
- Scheduler initialization
- Strategy changes
- Time slice allocation
- Scheduling errors
- Statistics clearing

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

## Best Practices

1. **Configure Time Slices**: Set appropriate `timeSliceDuration` based on your workload
2. **Choose Strategy Wisely**: Select strategy based on your use case:
   - `round-robin` for equal time allocation
   - `priority` for priority-based allocation
   - `load-based` for workload balancing
   - `adaptive` for dynamic adjustment
3. **Monitor Statistics**: Regularly check statistics to understand system behavior
4. **Custom Strategies**: Create custom strategies for specialized use cases
5. **Start After Bootstrap**: Start scheduler after MessageSystem is bootstrapped
6. **Stop Gracefully**: Stop scheduler before shutting down system

## See Also

- [useGlobalScheduler](./USE-GLOBAL-SCHEDULER.md) - Hook that provides GlobalScheduler functionality
- [Global Scheduling Strategies](./GLOBAL-SCHEDULING-STRATEGIES.md) - Default scheduling strategies
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [useScheduler](../scheduler/USE-SCHEDULER.md) - Subsystem-level scheduler hook
- [SubsystemScheduler](../scheduler/SUBSYSTEM-SCHEDULER.md) - Subsystem-level scheduler implementation





