# useSynchronous Hook

## Overview

The `useSynchronous` hook enables immediate (synchronous) message processing for subsystems. It overrides the standard message processing flow to process messages immediately without queuing, bypassing the queue and scheduler entirely. This hook implements the `processor` contract, providing all required processor methods while delegating to the underlying processor facet.

**Key Features:**
- **Immediate Processing**: Processes messages immediately without queuing
- **Processor Contract**: Implements the `processor` contract, ensuring compatibility with processor-dependent subsystems
- **Delegation Pattern**: Delegates all processor methods to the underlying processor facet
- **Synchronous Mode**: Sets `api.isSynchronous = true` to mark subsystem as synchronous
- **Queue Bypass**: Skips queue and scheduler entirely
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'synchronous',
  overwrite: false,
  required: ['processor', 'statistics', 'listeners', 'queries'],
  attach: true,
  source: import.meta.url,
  contract: 'processor'
}
```

### Properties

- **`kind`**: `'synchronous'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing synchronous facet
- **`required`**: `['processor', 'statistics', 'listeners', 'queries']` - Requires processor, statistics, listeners, and queries facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.synchronous`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `'processor'` - Implements the processor contract, ensuring all required processor methods are present

## Processor Contract

The `useSynchronous` hook implements the `processor` contract, which requires the following methods:

- **`accept`**: Accept a message and process it immediately
- **`processMessage`**: Process a message through the complete processing pipeline
- **`processTick`**: Process a single message from the queue (process one tick)
- **`processImmediately`**: Process a message immediately without queuing

All methods delegate to the underlying processor facet, ensuring that the synchronous facet satisfies the processor contract while providing immediate processing behavior.

## Configuration

The hook reads configuration from `ctx.config.synchronous`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    synchronous: {
      debug: true
    }
  }
});
```

## Facet Methods

### `accept(message, options)`

Accept a message and process it immediately (synchronous mode).

**Signature:**
```javascript
accept(message, options = {}) => Promise<Object | undefined>
```

**Parameters:**
- `message` (Message, required) - Message to process
- `options` (object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<Object | undefined>` - Processing result or `undefined` if processor not found

**Behavior:**
- Sets `message.meta.processImmediately = true` to indicate immediate processing
- Delegates to processor facet's `processImmediately()` or `processMessage()` method
- Processes message immediately without queuing
- Bypasses queue and scheduler entirely
- Returns `undefined` if processor facet is not available (defensive fallback)

**Side Effects:**
- Modifies message metadata (`processImmediately` flag)
- Processes message immediately via processor facet
- Updates statistics (via processor facet)
- May trigger listeners (via processor facet)

**Example:**
```javascript
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });

// Accept message (will be processed immediately)
const result = await subsystem.synchronous.accept(message);
if (result) {
  console.log('Message processed immediately:', result);
}

// Accept with options
await subsystem.synchronous.accept(message, {
  callerId: secretIdentity,
  debug: true
});
```

### `processMessage(pairOrMessage, options)`

Process a message through the complete processing pipeline.

**Signature:**
```javascript
processMessage(pairOrMessage, options = {}) => Promise<Object>
```

**Parameters:**
- `pairOrMessage` (Object | Message, required) - Message-options pair `{msg, options}` or message object
  - If pair: `{msg: Message, options: Object}` - Message already dequeued
  - If message: `Message` - Message to process (backward compatibility)
- `options` (object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<Object>` - Processing result object

**Behavior:**
- Delegates to processor facet's `processMessage()` method
- Processes message through complete routing and handler pipeline
- Throws error if processor facet is missing `processMessage` method

**Example:**
```javascript
// Process message from pair (dequeued from queue)
const pair = queueFacet.selectNextMessage();
if (pair) {
  const result = await subsystem.synchronous.processMessage(pair);
  console.log('Processing result:', result);
}

// Process message directly (backward compatibility)
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await subsystem.synchronous.processMessage(message, {
  callerId: secretIdentity
});
```

### `processImmediately(message, options)`

Process a message immediately without queuing.

**Signature:**
```javascript
processImmediately(message, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to process immediately
- `options` (object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `Promise<Object>` - Processing result object

**Behavior:**
- Delegates to processor facet's `processImmediately()` method
- Processes message immediately without queuing
- Bypasses queue entirely
- Throws error if processor facet is missing `processImmediately` method

**Example:**
```javascript
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });

// Process immediately (bypasses queue)
const result = await subsystem.synchronous.processImmediately(message, {
  callerId: secretIdentity
});
console.log('Immediate processing result:', result);
```

### `processTick()`

Process a single message from the queue (process one tick).

**Signature:**
```javascript
processTick() => Promise<Object | null>
```

**Returns:** `Promise<Object | null>` - Processing result or `null` if no message in queue

**Behavior:**
- Delegates to processor facet's `processTick()` method
- Processes one message from the queue
- Returns `null` if queue is empty or processor facet is not available
- Used for compatibility with scheduler interface

**Example:**
```javascript
// Process one message from queue
const result = await subsystem.synchronous.processTick();
if (result) {
  console.log('Processed message:', result);
} else {
  console.log('No messages in queue');
}
```

### `process()`

Process tick (optional, for compatibility with scheduler interface).

**Signature:**
```javascript
process() => Promise<Object | null>
```

**Returns:** `Promise<Object | null>` - Processing result or `null`

**Behavior:**
- Alias for `processTick()` for backward compatibility
- Delegates to `processTick()` method
- Maintains compatibility with scheduler interface

**Example:**
```javascript
// Process (alias for processTick)
const result = await subsystem.synchronous.process();
```

## Installation Order

The `useSynchronous` hook must be installed **last** (after all other hooks, especially after `useMessageProcessor`) so that its `accept()` method has the highest precedence and overrides the processor's `accept()` method.

**Correct Installation Order:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
})
  .use(useRouter)
  .use(useQueue)
  .use(useStatistics)
  .use(useListeners)
  .use(useQueries)
  .use(useMessageProcessor)  // Install processor first
  .use(useSynchronous);       // Install synchronous last (overrides accept)
```

## Message Processing Flow

### Synchronous Processing Flow

1. **Accept**: Message is accepted via `accept()`
2. **Set Flag**: `message.meta.processImmediately = true` is set
3. **Delegate**: Message is delegated to processor facet's `processImmediately()` or `processMessage()`
4. **Process**: Processor facet processes message immediately
5. **Route**: Message is routed to appropriate handler
6. **Execute**: Handler executes and returns result
7. **Return**: Result is returned immediately (no queuing)

### Key Differences from Standard Processing

- **No Queueing**: Messages are never queued
- **No Scheduler**: Scheduler is bypassed entirely
- **Immediate Execution**: All processing happens synchronously
- **Override Behavior**: `accept()` overrides processor's `accept()` when installed last

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useSynchronous } from './hooks/synchronous/use-synchronous.mycelia.js';
import { createSynchronousDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createSynchronousDefaultHooks(),  // Includes useSynchronous
  config: {
    synchronous: {
      debug: true
    }
  }
});

await subsystem.build();

// Accept a message (will be processed immediately)
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await subsystem.synchronous.accept(message);
console.log('Immediate result:', result);
```

### With Custom Hooks

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
})
  .use(useRouter)
  .use(useQueue)
  .use(useStatistics)
  .use(useListeners)
  .use(useQueries)
  .use(useMessageProcessor)
  .use(useSynchronous);  // Must be last

await subsystem.build();

// All messages are processed immediately
await subsystem.synchronous.accept(message1);
await subsystem.synchronous.accept(message2);
```

### Processor Contract Compliance

Since `useSynchronous` implements the processor contract, it can be used anywhere a processor facet is expected:

```javascript
// The synchronous facet satisfies the processor contract
const processor = subsystem.synchronous;  // Can be used as processor

// All processor methods are available
await processor.accept(message);
await processor.processMessage(message);
await processor.processImmediately(message);
await processor.processTick();
```

## Synchronous Mode

When `useSynchronous` is installed, it sets `api.isSynchronous = true` to mark the subsystem as operating in synchronous mode. This flag can be checked by other parts of the system:

```javascript
if (subsystem.api.isSynchronous) {
  console.log('Subsystem is in synchronous mode');
}
```

## Delegation Pattern

The `useSynchronous` hook uses a delegation pattern, where all processor methods delegate to the underlying processor facet:

```javascript
// All methods delegate to processorFacet
async accept(message, options) {
  // ... set processImmediately flag ...
  return await processorFacet.processImmediately(message, options);
}

async processMessage(pairOrMessage, options) {
  return await processorFacet.processMessage(pairOrMessage, options);
}

async processImmediately(message, options) {
  return await processorFacet.processImmediately(message, options);
}

async processTick() {
  return await processorFacet.processTick();
}
```

This ensures that:
- The synchronous facet satisfies the processor contract
- All processing logic remains in the processor facet
- The synchronous facet only adds immediate processing behavior

## Error Handling

### Missing Processor Facet

If the processor facet is not found during hook execution:

```javascript
// Throws error during build
throw new Error(`useSynchronous ${name}: processor facet not found. useMessageProcessor must be added before useSynchronous.`);
```

### Missing Processor Methods

If the processor facet is missing required methods:

```javascript
// Throws error when method is called
throw new Error(`useSynchronous ${name}: processor facet missing processMessage method`);
```

### Defensive Fallbacks

The `accept()` method includes defensive fallbacks:

```javascript
// If processor methods are not available, returns undefined
if (!processorFacet?.processImmediately && !processorFacet?.processMessage) {
  logger.warn('No core processor found, message not processed');
  return undefined;
}
```

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    synchronous: {
      debug: true
    }
  }
});
```

Debug messages include:
- Message processing start/completion
- Processor delegation
- Error conditions

## Dependencies

The `useSynchronous` hook requires the following facets:

- **`processor`** (required) - For message processing (must be installed before useSynchronous)
- **`statistics`** (required) - For tracking message statistics
- **`listeners`** (required) - For event notifications
- **`queries`** (required) - For query message handling

**Installation Order:**
The hook must be installed after its dependencies, especially after `useMessageProcessor`, so that it can override the processor's `accept()` method.

## Integration with Other Hooks

### With Processor

The synchronous hook delegates to the processor facet:

```javascript
// Synchronous accepts message
await subsystem.synchronous.accept(message);
// Delegates to processor.processImmediately()
```

### With Statistics

Statistics are tracked via the processor facet:

```javascript
// Statistics are recorded by processor facet
await subsystem.synchronous.accept(message);
// Processor facet records statistics
```

### With Listeners

Listeners are notified via the processor facet:

```javascript
// Listeners are notified by processor facet
await subsystem.synchronous.accept(message);
// Processor facet notifies listeners
```

## Best Practices

1. **Install Last**: Always install `useSynchronous` last so it overrides processor's `accept()`
2. **Use for Immediate Processing**: Use when you need immediate, synchronous message processing
3. **Processor Contract**: Remember that synchronous facet implements processor contract
4. **Debug During Development**: Enable debug logging during development
5. **Monitor Performance**: Monitor performance since all processing is synchronous

## When to Use

Use `useSynchronous` when:

- You need immediate message processing (no queuing)
- You want to bypass the scheduler
- You need synchronous behavior for specific subsystems
- You want processor contract compliance with immediate processing

**Do not use** when:

- You need queued message processing
- You want time-sliced processing via scheduler
- You need asynchronous message handling

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [Facet Contracts](../../FACET-CONTRACT.md) - Understanding facet contracts
- [Default Contracts](../../DEFAULT-CONTRACTS.md) - Processor contract documentation
- [useMessageProcessor](./message-processor/USE-MESSAGE-PROCESSOR.md) - Standard message processor hook
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction





