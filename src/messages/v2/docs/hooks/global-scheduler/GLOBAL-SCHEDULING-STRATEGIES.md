# Global Scheduling Strategies

## Overview

The `global-scheduling-strategies.utils.mycelia.js` module provides pure functions that implement different global scheduling strategies for `GlobalScheduler`. Each strategy is a pure function that takes available subsystems and returns the selected subsystem to schedule next across the entire system.

**Key Concepts:**
- **Pure Functions**: Strategy functions are pure (no side effects, deterministic)
- **Pluggable**: Strategies can be registered and unregistered at runtime
- **Configurable**: Strategies can accept options for customization
- **Composable**: Multiple strategies can be used in the same system

## Strategy Function Interface

All strategy functions must follow this interface:

### Function Signature

```javascript
function strategyFunction(subsystems, options) {
  // Strategy logic
  return BaseSubsystem | null;
}
```

### Parameters

1. **`subsystems`** (Array<BaseSubsystem>, required)
   - Available subsystems to schedule
   - Empty array `[]` if no subsystems available
   - Each subsystem is a `BaseSubsystem` instance

2. **`options`** (Object, required)
   - Strategy options object containing:
     - `currentIndex` (number) - Current round-robin index
     - `schedulerStats` (Object) - Global scheduler statistics
     - `averageUtilization` (number) - Average system utilization (0-1)
     - `lastScheduled` (Object) - Last scheduled timestamps by subsystem name
     - `onSelection` (Function) - Callback to update current index
     - `onScheduled` (Function) - Callback to track scheduled subsystem

### Return Value

Must return:
- `BaseSubsystem` - Selected subsystem to schedule next, or
- `null` - If no subsystem should be selected (empty array or no valid selection)

## Writing a Custom Strategy

### Requirements

1. **Pure Function**: Must be a pure function with no side effects
   - No mutations of input parameters
   - No external state changes
   - Deterministic (same inputs = same outputs)

2. **Interface Compliance**: Must follow the exact interface specified above

3. **Handle Empty Arrays**: Must return `null` if `subsystems.length === 0`

### Example: Custom Strategy

```javascript
/**
 * Custom Strategy - Select subsystem with highest priority
 */
function customPriorityStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  return subsystems.reduce((highest, current) => {
    const currentPriority = current.getPriority?.() || 0;
    const highestPriority = highest.getPriority?.() || 0;
    return currentPriority > highestPriority ? current : highest;
  });
}

// Register the strategy
scheduler.registerStrategy('custom-priority', customPriorityStrategy);
```

### Best Practices

1. **Always Handle Empty Arrays**: Return `null` if no subsystems available
   ```javascript
   if (subsystems.length === 0) return null;
   ```

2. **Use Reduce for Selection**: Use `reduce()` to find best match
   ```javascript
   return subsystems.reduce((best, current) => {
     // Selection logic
     return isBetter(current, best) ? current : best;
   });
   ```

3. **Validate Options**: Check and validate strategy-specific options
   ```javascript
   const threshold = options.threshold || 0.5;
   if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
     throw new Error('threshold must be a number between 0 and 1');
   }
   ```

4. **Use Callbacks**: Use `onSelection` and `onScheduled` callbacks when needed
   ```javascript
   if (options.onSelection) {
     options.onSelection(newIndex);
   }
   if (options.onScheduled) {
     options.onScheduled(selectedSubsystem.name);
   }
   ```

## Default Strategies

### `roundRobinStrategy(subsystems, options)`

Round-robin scheduling strategy.

**Signature:**
```javascript
roundRobinStrategy(subsystems, options = {}) => BaseSubsystem | null
```

**Parameters:**
- `subsystems` (Array<BaseSubsystem>, required) - Available subsystems
- `options` (Object, optional) - Strategy options:
  - `currentIndex` (number, optional) - Current round-robin index
  - `onSelection` (Function, optional) - Callback to update index after selection

**Returns:** `BaseSubsystem | null` - Selected subsystem in round-robin order

**Selection Logic:**
1. Cycles through subsystems in order
2. Uses `currentIndex` to track position
3. Updates index via `onSelection` callback
4. Wraps around to beginning when reaching end

**Example:**
```javascript
import { roundRobinStrategy } from './global-scheduling-strategies.utils.mycelia.js';

const selected = roundRobinStrategy(subsystems, {
  currentIndex: 2,
  onSelection: (newIndex) => { /* update index */ }
});
if (selected) {
  console.log('Selected subsystem:', selected.name);
}
```

**Use Case:** When you need equal time allocation across all subsystems (fairness).

### `priorityStrategy(subsystems, options)`

Priority-based scheduling strategy.

**Signature:**
```javascript
priorityStrategy(subsystems, options = {}) => BaseSubsystem | null
```

**Parameters:**
- `subsystems` (Array<BaseSubsystem>, required) - Available subsystems
- `options` (Object, optional) - Strategy options (not used by this strategy)

**Returns:** `BaseSubsystem | null` - Subsystem with highest priority

**Selection Logic:**
1. Gets priority for each subsystem via `subsystem.getPriority()`
2. Selects subsystem with highest priority value
3. Higher priority = more time allocation

**Example:**
```javascript
import { priorityStrategy } from './global-scheduling-strategies.utils.mycelia.js';

const selected = priorityStrategy(subsystems);
if (selected) {
  console.log('Selected subsystem:', selected.name);
  console.log('Priority:', selected.getPriority());
}
```

**Use Case:** When you need to prioritize certain subsystems over others.

**Note:** Requires subsystems to implement `getPriority()` method (typically from scheduler facet).

### `loadBasedStrategy(subsystems, options)`

Load-based scheduling strategy.

**Signature:**
```javascript
loadBasedStrategy(subsystems, options = {}) => BaseSubsystem | null
```

**Parameters:**
- `subsystems` (Array<BaseSubsystem>, required) - Available subsystems
- `options` (Object, optional) - Strategy options (not used by this strategy)

**Returns:** `BaseSubsystem | null` - Subsystem with highest queue load

**Selection Logic:**
1. Gets queue status for each subsystem via `subsystem.getQueueStatus()`
2. Selects subsystem with most messages in queue
3. Prioritizes subsystems with more work

**Example:**
```javascript
import { loadBasedStrategy } from './global-scheduling-strategies.utils.mycelia.js';

const selected = loadBasedStrategy(subsystems);
if (selected) {
  const queueStatus = selected.getQueueStatus();
  console.log('Selected subsystem:', selected.name);
  console.log('Queue size:', queueStatus.size);
}
```

**Use Case:** When you need to balance workload by allocating more time to busy subsystems.

**Note:** Requires subsystems to implement `getQueueStatus()` method (typically from queue facet).

### `adaptiveStrategy(subsystems, options)`

Adaptive scheduling strategy.

**Signature:**
```javascript
adaptiveStrategy(subsystems, options = {}) => BaseSubsystem | null
```

**Parameters:**
- `subsystems` (Array<BaseSubsystem>, required) - Available subsystems
- `options` (Object, optional) - Strategy options:
  - `averageUtilization` (number, optional) - Average system utilization (0-1)
  - `schedulerStats` (Object, optional) - Scheduler statistics

**Returns:** `BaseSubsystem | null` - Selected subsystem based on adaptive logic

**Selection Logic:**
1. Monitors system utilization
2. High utilization (>0.8): Uses load-based strategy to balance work
3. Low utilization (<0.3): Uses round-robin strategy for fairness
4. Medium utilization (0.3-0.8): Uses priority-based strategy

**Example:**
```javascript
import { adaptiveStrategy } from './global-scheduling-strategies.utils.mycelia.js';

const selected = adaptiveStrategy(subsystems, {
  averageUtilization: 0.7,
  schedulerStats: { cyclesCompleted: 100 }
});
if (selected) {
  console.log('Selected subsystem:', selected.name);
}
```

**Use Case:** When you need dynamic strategy switching based on system load.

## Strategy Registry

### `DEFAULT_STRATEGIES`

Default strategy registry containing all core strategies.

**Type:** `Map<string, Function>`

**Contents:**
- `'round-robin'` → `roundRobinStrategy`
- `'priority'` → `priorityStrategy`
- `'load-based'` → `loadBasedStrategy`
- `'adaptive'` → `adaptiveStrategy`

**Example:**
```javascript
import { DEFAULT_STRATEGIES } from './global-scheduling-strategies.utils.mycelia.js';

// Access default strategies
const roundRobin = DEFAULT_STRATEGIES.get('round-robin');
const selected = roundRobin(subsystems, options);
```

### `getStrategy(name)`

Get a strategy function by name.

**Signature:**
```javascript
getStrategy(name) => Function | null
```

**Parameters:**
- `name` (string, required) - Strategy name

**Returns:** `Function | null` - Strategy function or null if not found

**Example:**
```javascript
import { getStrategy } from './global-scheduling-strategies.utils.mycelia.js';

const strategy = getStrategy('round-robin');
if (strategy) {
  const selected = strategy(subsystems, options);
}
```

### `getStrategyNames()`

Get all available strategy names.

**Signature:**
```javascript
getStrategyNames() => Array<string>
```

**Returns:** `Array<string>` - Array of strategy names

**Example:**
```javascript
import { getStrategyNames } from './global-scheduling-strategies.utils.mycelia.js';

const names = getStrategyNames();
console.log('Available strategies:', names);
// ['round-robin', 'priority', 'load-based', 'adaptive']
```

### `validateStrategyOptions(strategyName, options)`

Validate strategy options.

**Signature:**
```javascript
validateStrategyOptions(strategyName, options) => Object
```

**Parameters:**
- `strategyName` (string, required) - Name of the strategy
- `options` (Object, required) - Options to validate

**Returns:** `Object` - Validation result:
```javascript
{
  valid: boolean,
  errors: Array<string>
}
```

**Example:**
```javascript
import { validateStrategyOptions } from './global-scheduling-strategies.utils.mycelia.js';

const result = validateStrategyOptions('adaptive', {
  averageUtilization: 0.7
});

if (!result.valid) {
  console.error('Invalid options:', result.errors);
}
```

**Validation Rules:**
- `adaptive`: Validates `averageUtilization` is a number between 0 and 1

## Usage Patterns

### Using Default Strategies

```javascript
import {
  roundRobinStrategy,
  priorityStrategy,
  loadBasedStrategy,
  adaptiveStrategy
} from './global-scheduling-strategies.utils.mycelia.js';

// Round-robin
const selected1 = roundRobinStrategy(subsystems, {
  currentIndex: 0,
  onSelection: (newIndex) => { /* update */ }
});

// Priority-based
const selected2 = priorityStrategy(subsystems);

// Load-based
const selected3 = loadBasedStrategy(subsystems);

// Adaptive
const selected4 = adaptiveStrategy(subsystems, {
  averageUtilization: 0.7
});
```

### Creating Custom Strategies

```javascript
// Least recently used (LRU) strategy
function lruStrategy(subsystems, options = {}) {
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
}

// Register with scheduler
scheduler.registerStrategy('lru', lruStrategy);
scheduler.setStrategy('lru');
```

### Strategy Composition

```javascript
// Weighted round-robin strategy
function weightedRoundRobinStrategy(subsystems, options = {}) {
  if (subsystems.length === 0) return null;
  
  const { currentIndex, weights = {} } = options;
  
  // Calculate weighted selection
  let totalWeight = 0;
  const weighted = subsystems.map((subsystem, index) => {
    const weight = weights[subsystem.name] || 1;
    totalWeight += weight;
    return { subsystem, weight, index };
  });
  
  // Select based on weights
  let random = Math.random() * totalWeight;
  for (const { subsystem, weight } of weighted) {
    random -= weight;
    if (random <= 0) {
      return subsystem;
    }
  }
  
  return subsystems[0];
}

scheduler.registerStrategy('weighted-rr', weightedRoundRobinStrategy);
```

## Integration with GlobalScheduler

Strategies are used by `GlobalScheduler`:

```javascript
import { GlobalScheduler } from './global-scheduler.mycelia.js';
import { DEFAULT_STRATEGIES } from './global-scheduling-strategies.utils.mycelia.js';

// GlobalScheduler uses DEFAULT_STRATEGIES internally
const scheduler = new GlobalScheduler(messageSystem, {
  schedulingStrategy: 'round-robin'
});

// Register custom strategy
scheduler.registerStrategy('my-custom', (subsystems, options) => {
  // Custom logic
  return subsystems[0];
});

// Use custom strategy
scheduler.setStrategy('my-custom');
```

## Best Practices

1. **Keep Strategies Pure**: Don't mutate inputs or external state
2. **Handle Edge Cases**: Always check for empty arrays
3. **Use Options Callbacks**: Use `onSelection` and `onScheduled` when needed
4. **Validate Options**: Check and validate strategy-specific options
5. **Document Behavior**: Document selection logic and use cases
6. **Test Strategies**: Test strategies with various subsystem configurations

## Performance Considerations

### Strategy Overhead

- **Round-Robin**: Lowest overhead (O(1) selection)
- **Priority**: Medium overhead (O(n) priority comparison)
- **Load-Based**: Medium overhead (O(n) queue status check)
- **Adaptive**: Higher overhead (strategy selection + delegation)

### Optimization Tips

1. **Cache Results**: Cache subsystem properties (priority, queue status) if accessed frequently
2. **Minimize Iterations**: Use efficient selection algorithms (reduce, find)
3. **Avoid Side Effects**: Keep strategies pure for better performance

## See Also

- [GlobalScheduler](./GLOBAL-SCHEDULER.md) - Global scheduler class that uses these strategies
- [useGlobalScheduler](./USE-GLOBAL-SCHEDULER.md) - Hook that provides GlobalScheduler functionality
- [Message Scheduling Strategies](../scheduler/MESSAGE-SCHEDULING-STRATEGIES.md) - Subsystem-level message scheduling strategies





