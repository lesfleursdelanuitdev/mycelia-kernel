# Message Scheduling Strategies

## Overview

The `message-scheduling-strategies.mycelia.js` module provides pure functions that implement different message scheduling strategies for `SubsystemScheduler`. Each strategy is a pure function that takes available message-options pairs and returns the selected message to process next within a subsystem.

**Key Concepts:**
- **Pure Functions**: Strategy functions are pure (no side effects, deterministic)
- **Pluggable**: Strategies can be registered and unregistered at runtime
- **Configurable**: Strategies can accept options for customization
- **Composable**: Multiple strategies can be used in the same system

## Strategy Function Interface

All strategy functions must follow this interface:

### Function Signature

```javascript
function strategyFunction(pairs, options) {
  // Strategy logic
  return {msg: Message, options: Object} | null;
}
```

### Parameters

1. **`pairs`** (Array<{msg: Message, options: Object}>, required)
   - Available message-options pairs to process
   - Empty array `[]` if no messages available
   - Each pair contains:
     - `msg` (Message) - Message object
     - `options` (Object) - Processing options

2. **`options`** (Object, required)
   - Strategy options object containing:
     - `currentIndex` (number) - Current processing index
     - `maxMessagesPerSlice` (number) - Maximum messages per slice
     - `queueUtilization` (number) - Queue utilization (0-1)
     - `subsystemStats` (Object) - Subsystem performance statistics
     - `lastProcessed` (Object) - Last processed message timestamps
     - `onSelection` (Function) - Callback to update current index
     - `...strategyOptions` - Strategy-specific options (spread)

### Return Value

Must return:
- `{msg: Message, options: Object}` - Selected message-options pair, or
- `null` - If no message should be selected (empty array or no valid selection)

## Writing a Custom Strategy

### Requirements

1. **Pure Function**: Must be a pure function with no side effects
   - No mutations of input parameters
   - No external state changes
   - Deterministic (same inputs = same outputs)

2. **Interface Compliance**: Must follow the exact interface specified above

3. **Handle Empty Arrays**: Must return `null` if `pairs.length === 0`

### Example: Custom Strategy

```javascript
/**
 * Custom Strategy - Select message with highest urgency
 */
function urgencyStrategy(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  return pairs.reduce((mostUrgent, current) => {
    const currentUrgency = current.msg.getBody()?.urgency || 0;
    const mostUrgentValue = mostUrgent.msg.getBody()?.urgency || 0;
    return currentUrgency > mostUrgentValue ? current : mostUrgent;
  });
}

// Register the strategy
scheduler.registerStrategy('urgency', urgencyStrategy);
```

### Best Practices

1. **Always Handle Empty Arrays**: Return `null` if no messages available
   ```javascript
   if (pairs.length === 0) return null;
   ```

2. **Use Reduce for Selection**: Use `reduce()` to find best match
   ```javascript
   return pairs.reduce((best, current) => {
     // Selection logic
     return isBetter(current, best) ? current : best;
   });
   ```

3. **Handle Backward Compatibility**: Support both `pair.msg` and direct message access
   ```javascript
   const msg = pair.msg || pair; // Handle backward compatibility
   ```

4. **Validate Options**: Check and validate strategy-specific options
   ```javascript
   const complexityEstimator = options.complexityEstimator || defaultEstimator;
   if (typeof complexityEstimator !== 'function') {
     throw new Error('complexityEstimator must be a function');
   }
   ```

## Default Strategies

### `messagePriority(pairs, options)`

Priority-based message scheduling strategy.

**Signature:**
```javascript
messagePriority(pairs, options = {}) => {msg: Message, options: Object} | null
```

**Parameters:**
- `pairs` (Array<{msg: Message, options: Object}>, required) - Available message-options pairs
- `options` (Object, optional) - Strategy options (not used by this strategy)

**Returns:** `{msg: Message, options: Object} | null` - Pair with highest priority message

**Selection Logic:**
1. Atomic messages have highest priority
2. Among atomic messages, older messages (lower timestamp) are preferred
3. Among non-atomic messages, older messages are preferred

**Example:**
```javascript
import { messagePriority } from './message-scheduling-strategies.mycelia.js';

const selected = messagePriority(pairs);
if (selected) {
  console.log('Selected message:', selected.msg.getId());
}
```

**Use Case:** When you need to prioritize atomic (transactional) messages while maintaining fairness for older messages.

### `messageFIFO(pairs, options)`

FIFO (First In, First Out) message scheduling strategy.

**Signature:**
```javascript
messageFIFO(pairs, options = {}) => {msg: Message, options: Object} | null
```

**Parameters:**
- `pairs` (Array<{msg: Message, options: Object}>, required) - Available message-options pairs
- `options` (Object, optional) - Strategy options (not used by this strategy)

**Returns:** `{msg: Message, options: Object} | null` - Pair with oldest message

**Selection Logic:**
- Selects message with lowest timestamp (oldest message)
- Simple and predictable ordering

**Example:**
```javascript
import { messageFIFO } from './message-scheduling-strategies.mycelia.js';

const selected = messageFIFO(pairs);
if (selected) {
  console.log('Selected oldest message:', selected.msg.getId());
}
```

**Use Case:** When you need strict chronological ordering and fairness.

### `messageLoadBased(pairs, options)`

Load-based message scheduling strategy.

**Signature:**
```javascript
messageLoadBased(pairs, options = {}) => {msg: Message, options: Object} | null
```

**Parameters:**
- `pairs` (Array<{msg: Message, options: Object}>, required) - Available message-options pairs
- `options` (Object, optional) - Strategy options:
  - `complexityEstimator` (Function, optional) - Function to estimate message complexity: `(msg: Message) => number`

**Returns:** `{msg: Message, options: Object} | null` - Pair with lowest estimated complexity message

**Selection Logic:**
- Estimates complexity for each message
- Selects message with lowest complexity
- Uses default complexity estimator if `complexityEstimator` not provided

**Default Complexity Estimator:**
- Base complexity: 1
- Adds property count from message body
- Adds 2× array count (arrays indicate more operations)
- Adds 0.1 for atomic messages (transaction handling overhead)

**Example:**
```javascript
import { messageLoadBased } from './message-scheduling-strategies.mycelia.js';

// Use default complexity estimator
const selected = messageLoadBased(pairs);

// Use custom complexity estimator
const selected = messageLoadBased(pairs, {
  complexityEstimator: (msg) => {
    const body = msg.getBody();
    return body.operations?.length || 1;
  }
});
```

**Use Case:** When you want to maximize throughput by processing simple messages first.

### `messageAdaptive(pairs, options)`

Adaptive message scheduling strategy.

**Signature:**
```javascript
messageAdaptive(pairs, options = {}) => {msg: Message, options: Object} | null
```

**Parameters:**
- `pairs` (Array<{msg: Message, options: Object}>, required) - Available message-options pairs
- `options` (Object, optional) - Strategy options:
  - `queueUtilization` (number, optional, default: `0`) - Current queue utilization (0-1)
  - `subsystemStats` (Object, optional) - Subsystem performance statistics

**Returns:** `{msg: Message, options: Object} | null` - Selected pair based on adaptive logic

**Selection Logic:**
- **High utilization (>80%)**: Uses `messageLoadBased` for throughput
- **Medium utilization (40-80%)**: Uses `messagePriority` for balanced processing
- **Low utilization (<40%)**: Uses `messageFIFO` for fairness

**Example:**
```javascript
import { messageAdaptive } from './message-scheduling-strategies.mycelia.js';

const selected = messageAdaptive(pairs, {
  queueUtilization: 0.8,
  subsystemStats: { averageProcessingTime: 5.2 }
});
```

**Use Case:** When you want dynamic strategy selection based on system load.

## Utility Functions

### `getMessageStrategy(name)`

Get a message strategy function by name.

**Signature:**
```javascript
getMessageStrategy(name) => Function | null
```

**Parameters:**
- `name` (string, required) - Strategy name

**Returns:** `Function | null` - Strategy function or `null` if not found

**Example:**
```javascript
import { getMessageStrategy } from './message-scheduling-strategies.mycelia.js';

const strategy = getMessageStrategy('priority');
if (strategy) {
  const selected = strategy(pairs, options);
}
```

### `getMessageStrategyNames()`

Get all available message strategy names.

**Signature:**
```javascript
getMessageStrategyNames() => Array<string>
```

**Returns:** `Array<string>` - Array of strategy names

**Example:**
```javascript
import { getMessageStrategyNames } from './message-scheduling-strategies.mycelia.js';

const names = getMessageStrategyNames();
console.log('Available strategies:', names);
// ['priority', 'fifo', 'load-based', 'adaptive']
```

### `validateMessageStrategyOptions(strategyName, options)`

Validate message strategy options.

**Signature:**
```javascript
validateMessageStrategyOptions(strategyName, options) => Object
```

**Parameters:**
- `strategyName` (string, required) - Name of the strategy
- `options` (Object, required) - Options to validate

**Returns:** `Object` - Validation result:
```javascript
{
  valid: boolean,    // Whether options are valid
  errors: Array<string>  // Array of error messages
}
```

**Validation Rules:**
- **`load-based`**: Validates `complexityEstimator` is a function if provided
- **`adaptive`**: Validates `queueUtilization` is a number between 0 and 1 if provided

**Example:**
```javascript
import { validateMessageStrategyOptions } from './message-scheduling-strategies.mycelia.js';

const result = validateMessageStrategyOptions('load-based', {
  complexityEstimator: (msg) => msg.getBody().size
});

if (!result.valid) {
  console.error('Invalid options:', result.errors);
}
```

## Constants

### `DEFAULT_MESSAGE_STRATEGIES`

Default strategy registry for message scheduling.

**Type:** `Map<string, Function>`

**Contents:**
- `'priority'` → `messagePriority`
- `'fifo'` → `messageFIFO`
- `'load-based'` → `messageLoadBased`
- `'adaptive'` → `messageAdaptive`

**Example:**
```javascript
import { DEFAULT_MESSAGE_STRATEGIES } from './message-scheduling-strategies.mycelia.js';

// Access strategy directly
const priorityStrategy = DEFAULT_MESSAGE_STRATEGIES.get('priority');

// Use in scheduler
const scheduler = new SubsystemScheduler(subsystem);
scheduler.strategies = new Map(DEFAULT_MESSAGE_STRATEGIES);
```

## Usage Patterns

### Using Default Strategies

```javascript
import { 
  messagePriority, 
  messageFIFO, 
  messageLoadBased, 
  messageAdaptive 
} from './message-scheduling-strategies.mycelia.js';

// Get available messages
const pairs = scheduler.getAvailableMessages();

// Use priority strategy
const selected = messagePriority(pairs);

// Use FIFO strategy
const selected = messageFIFO(pairs);

// Use load-based strategy
const selected = messageLoadBased(pairs, {
  complexityEstimator: (msg) => msg.getBody().operations?.length || 1
});

// Use adaptive strategy
const selected = messageAdaptive(pairs, {
  queueUtilization: 0.7,
  subsystemStats: scheduler.getStatistics()
});
```

### Registering Custom Strategies

```javascript
import { SubsystemScheduler } from './subsystem-scheduler.mycelia.js';

// Define custom strategy
function urgencyStrategy(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  return pairs.reduce((mostUrgent, current) => {
    const currentUrgency = current.msg.getBody()?.urgency || 0;
    const mostUrgentValue = mostUrgent.msg.getBody()?.urgency || 0;
    return currentUrgency > mostUrgentValue ? current : mostUrgent;
  });
}

// Register with scheduler
const scheduler = new SubsystemScheduler(subsystem);
scheduler.registerStrategy('urgency', urgencyStrategy);

// Use custom strategy
scheduler.setStrategy('urgency');
```

### Strategy with Options

```javascript
// Custom strategy that uses options
function weightedStrategy(pairs, options = {}) {
  if (pairs.length === 0) return null;
  
  const weights = options.weights || {};
  
  return pairs.reduce((best, current) => {
    const currentWeight = weights[current.msg.getType()] || 1;
    const bestWeight = weights[best.msg.getType()] || 1;
    return currentWeight > bestWeight ? current : best;
  });
}

// Register and use
scheduler.registerStrategy('weighted', weightedStrategy);
scheduler.setStrategy('weighted', {
  weights: {
    'command': 10,
    'query': 5,
    'event': 1
  }
});
```

## Strategy Selection Examples

### Priority Strategy

```javascript
const pairs = [
  { msg: message1, options: {} }, // atomic, timestamp: 1000
  { msg: message2, options: {} }, // non-atomic, timestamp: 500
  { msg: message3, options: {} }  // atomic, timestamp: 1500
];

const selected = messagePriority(pairs);
// Returns message1 (atomic, oldest among atomic)
```

### FIFO Strategy

```javascript
const pairs = [
  { msg: message1, options: {} }, // timestamp: 1000
  { msg: message2, options: {} }, // timestamp: 500
  { msg: message3, options: {} }  // timestamp: 1500
];

const selected = messageFIFO(pairs);
// Returns message2 (oldest timestamp: 500)
```

### Load-Based Strategy

```javascript
const pairs = [
  { msg: message1, options: {} }, // complexity: 5
  { msg: message2, options: {} }, // complexity: 2
  { msg: message3, options: {} }  // complexity: 10
];

const selected = messageLoadBased(pairs);
// Returns message2 (lowest complexity: 2)
```

### Adaptive Strategy

```javascript
// High utilization (>80%)
const selected1 = messageAdaptive(pairs, { queueUtilization: 0.9 });
// Uses load-based strategy

// Medium utilization (40-80%)
const selected2 = messageAdaptive(pairs, { queueUtilization: 0.6 });
// Uses priority strategy

// Low utilization (<40%)
const selected3 = messageAdaptive(pairs, { queueUtilization: 0.2 });
// Uses FIFO strategy
```

## Best Practices

1. **Keep Strategies Pure**: No side effects, no mutations
2. **Handle Empty Arrays**: Always return `null` if `pairs.length === 0`
3. **Use Reduce for Selection**: `reduce()` is efficient for finding best match
4. **Support Backward Compatibility**: Handle both `pair.msg` and direct message access
5. **Validate Options**: Check and validate strategy-specific options
6. **Provide Defaults**: Use sensible defaults for optional options
7. **Document Complexity**: Document time complexity if relevant
8. **Test Edge Cases**: Test with empty arrays, single message, etc.

## Performance Considerations

- **Strategy Selection**: Strategy function is called for each message selection
- **Complexity Estimation**: Load-based strategy may be slower if complexity estimator is expensive
- **Array Operations**: Strategies use `reduce()` which is O(n) where n is number of messages
- **Adaptive Overhead**: Adaptive strategy has additional logic to select sub-strategy

## Thread Safety

Strategy functions are pure and stateless, making them inherently thread-safe. However, the `options` object may contain mutable state, so strategies should not mutate it.

## See Also

- [SubsystemScheduler](./SUBSYSTEM-SCHEDULER.md) - Scheduler that uses these strategies
- [useScheduler Hook](./USE-SCHEDULER.md) - Hook that uses SubsystemScheduler
- [useQueue](../queue/USE-QUEUE.md) - Queue hook
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook








