# MessageRouter Class

## Overview

The `MessageRouter` class provides a simple, efficient router that extracts subsystem names from message paths and routes messages to the appropriate subsystems. It integrates with MessageSystem's subsystem registry to provide centralized message routing in a message-driven architecture. Kernel-level paths (`kernel://*`) are routed to the kernel subsystem, which processes them immediately (synchronously) without queuing.

**Key Features:**
- **Path-Based Routing**: Extracts subsystem names from message paths and routes accordingly
- **Kernel Message Handling**: Special handling for `kernel://` messages (synchronous processing)
- **Subsystem Registry Integration**: Uses MessageSystem's subsystem registry for routing
- **Query Message Support**: Handles query messages with synchronous results
- **Immediate Processing**: Supports immediate message processing (bypasses queue)
- **Statistics Tracking**: Tracks routing statistics (messages routed, errors, unknown routes)
- **Debug Support**: Conditional debug logging

## Constructor

### `new MessageRouter(messageSystem, kernel, subsystems, options)`

Create a new `MessageRouter` instance.

**Signature:**
```javascript
new MessageRouter(messageSystem, kernel, subsystems, options = {})
```

**Parameters:**
- `messageSystem` (MessageSystem, required) - The MessageSystem instance to route messages through
- `kernel` (KernelSubsystem, required) - The kernel subsystem instance (for routing `kernel://` messages)
- `subsystems` (MessageSubsystems, required) - The subsystem registry (for routing to subsystems)
- `options` (Object, optional) - Configuration options:
  - `debug` (boolean, optional, default: `false`) - Enable debug logging

**Throws:**
- No constructor errors (validates at runtime)

**Initialization:**
- Stores MessageSystem, kernel, and subsystems registry references
- Initializes debug mode
- Initializes statistics counters
- Logs initialization message if debug is enabled

**Example:**
```javascript
import { MessageRouter } from '../../models/message-system/message-router.mycelia.js';

// Basic router
const router = new MessageRouter(messageSystem, kernel, subsystems);

// Router with debug logging
const router = new MessageRouter(messageSystem, kernel, subsystems, {
  debug: true
});
```

## Core Methods

### `route(message, options)`

Route a message to the appropriate subsystem based on its path.

**Signature:**
```javascript
route(message, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to route (must have valid path format)
- `options` (Object, optional) - Options to pass to subsystem `accept()`

**Returns:** `Promise<Object>` - Routing result object:
```javascript
{
  success: boolean,           // Whether routing was successful
  subsystem?: string,          // Target subsystem name (if successful)
  messageId: string,          // Message ID for tracing
  result?: Object,            // Subsystem acceptance result (if successful)
  error?: string              // Error message (if failed)
}
```

**Behavior:**
- Validates message has valid subsystem path
- Extracts subsystem name from message path
- Routes `kernel://` messages to kernel subsystem
- Routes other messages to subsystems via registry
- Handles query messages with synchronous results
- Tracks routing statistics
- Returns detailed routing result

**Example:**
```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await router.route(message);

if (result.success) {
  console.log(`Message routed to ${result.subsystem}`);
  console.log('Result:', result.result);
} else {
  console.error(`Routing failed: ${result.error}`);
}
```

**Example - Kernel Message:**
```javascript
const kernelMessage = new Message('kernel://error/record/timeout', {
  subsystem: 'network',
  message: 'Request timed out'
});

const result = await router.route(kernelMessage);
// Kernel messages are processed synchronously
```

**Example - Query Message:**
```javascript
const queryMessage = new Message('canvas://layers/query/all', {});
const result = await router.route(queryMessage);

if (result.success && result.result) {
  // Query result is available immediately
  console.log('Query result:', result.result);
}
```

### `routeToSubsystem(message, subsystem, options)`

Route message to a specific subsystem.

**Signature:**
```javascript
routeToSubsystem(message, subsystem, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to route
- `subsystem` (BaseSubsystem, required) - Target subsystem
- `options` (Object, optional) - Options to pass to `accept()` or `processImmediately()`

**Returns:** `Promise<Object>` - Routing result:
```javascript
{
  accepted: boolean,          // Whether message was accepted
  processed?: boolean,        // Whether message was processed immediately
  subsystem: string,         // Target subsystem name
  queueSize?: number,        // Queue size after acceptance
  result?: Object,           // Processing result (if processed)
  queryResult?: Object       // Query result (if query message)
}
```

**Behavior:**
- Checks if message should be processed immediately (`message.meta.processImmediately`)
- Processes immediately if flag is set (bypasses queue)
- Otherwise accepts message into subsystem queue
- Handles query messages with synchronous results
- Returns detailed routing information
- Throws error if routing fails

**Example:**
```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const targetSubsystem = messageSystem.getSubsystem('canvas');

const result = await router.routeToSubsystem(message, targetSubsystem);

if (result.accepted) {
  console.log(`Message accepted by ${result.subsystem}`);
  if (result.processed) {
    console.log('Message processed immediately');
  } else {
    console.log(`Queue size: ${result.queueSize}`);
  }
}
```

**Example - Immediate Processing:**
```javascript
// Set processImmediately flag
message.meta.processImmediately = true;

const result = await router.routeToSubsystem(message, targetSubsystem);

// Message is processed immediately, bypassing queue
console.log(result.processed); // true
```

### `setKernel(kernel)`

Set the kernel subsystem.

**Signature:**
```javascript
setKernel(kernel) => boolean
```

**Parameters:**
- `kernel` (KernelSubsystem, required) - The kernel subsystem instance

**Returns:** `boolean` - `true` if kernel was set, `false` if it was already set

**Behavior:**
- Only sets the kernel if it is currently `null`
- Logs debug message if debug is enabled and kernel was set
- Returns `true` if kernel was set, `false` if already set

**Example:**
```javascript
// Set kernel if not already set
const wasSet = router.setKernel(kernelSubsystem);
if (wasSet) {
  console.log('Kernel was set');
} else {
  console.log('Kernel was already set');
}
```

## Statistics and Monitoring

### `getStatistics()`

Get router statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object:
```javascript
{
  messagesRouted: number,     // Total messages successfully routed
  routingErrors: number,      // Number of routing errors
  unknownRoutes: number,      // Number of unknown/invalid routes
  subsystemCount: number     // Number of registered subsystems
}
```

**Example:**
```javascript
const stats = router.getStatistics();
console.log(`Messages routed: ${stats.messagesRouted}`);
console.log(`Routing errors: ${stats.routingErrors}`);
console.log(`Unknown routes: ${stats.unknownRoutes}`);
console.log(`Subsystems: ${stats.subsystemCount}`);
```

### `clear()`

Clear all statistics.

**Signature:**
```javascript
clear() => void
```

**Behavior:**
- Resets all statistics counters
- Logs debug message if debug is enabled

**Example:**
```javascript
router.clear();
console.log('Router statistics cleared');
```

## Message Routing

### Path Format

Messages must have paths in the format `'subsystem://path/to/resource'`:

```javascript
// Valid paths
'canvas://layers/create'        // Routes to 'canvas' subsystem
'kernel://error/record'         // Routes to 'kernel' subsystem
'api://users/create'            // Routes to 'api' subsystem
```

### Kernel Messages

Kernel messages (`kernel://*`) are routed to the kernel subsystem and processed synchronously:

```javascript
const kernelMessage = new Message('kernel://error/record/timeout', {
  subsystem: 'network',
  message: 'Request timed out'
});

const result = await router.route(kernelMessage);
// Processed immediately by kernel subsystem
```

### Subsystem Messages

Regular subsystem messages are routed via the subsystem registry:

```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await router.route(message);
// Routed to 'canvas' subsystem via registry
```

### Query Messages

Query messages can return synchronous results:

```javascript
const queryMessage = new Message('canvas://layers/query/all', {});
const result = await router.route(queryMessage);

if (result.success && result.result) {
  // Query result available immediately
  console.log('Query result:', result.result);
}
```

## Usage Patterns

### Basic Routing

```javascript
import { MessageRouter } from './message-router.mycelia.js';
import { MessageSystem } from './message-system.v2.mycelia.js';

// Create router
const router = new MessageRouter(messageSystem, kernel, subsystems, {
  debug: true
});

// Route a message
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await router.route(message);

if (result.success) {
  console.log(`Routed to ${result.subsystem}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### Direct Subsystem Routing

```javascript
// Route directly to a subsystem
const targetSubsystem = messageSystem.getSubsystem('canvas');
const result = await router.routeToSubsystem(message, targetSubsystem);

if (result.accepted) {
  console.log(`Message accepted by ${result.subsystem}`);
}
```

### Immediate Processing

```javascript
// Process message immediately (bypass queue)
message.meta.processImmediately = true;

const result = await router.route(message);
// Message processed synchronously
```

### Statistics Monitoring

```javascript
// Monitor routing statistics
const stats = router.getStatistics();
console.log(`Success rate: ${stats.messagesRouted / (stats.messagesRouted + stats.routingErrors)}`);

// Clear statistics periodically
if (stats.messagesRouted > 10000) {
  router.clear();
}
```

## Integration with MessageSystem

The `MessageRouter` is designed to work with MessageSystem:

```javascript
// MessageSystem includes useMessageSystemRouter in default hooks
const messageSystem = new MessageSystem('main-system');

await messageSystem.bootstrap();

// Access router
const router = messageSystem.messageSystemRouter;

// Route messages
const result = await router.route(message);
```

### Kernel Integration

The MessageSystem sets the kernel on the router after bootstrap:

```javascript
await messageSystem.bootstrap();
// Kernel is automatically set on router for kernel:// message routing
```

## Routing Flow

### Standard Message Flow

1. **Extract Subsystem**: Extract subsystem name from message path
2. **Find Subsystem**: Look up subsystem in registry (or use kernel for `kernel://`)
3. **Route Message**: Call `routeToSubsystem()` with message and target
4. **Process or Queue**: 
   - If `processImmediately` flag is set, process immediately
   - Otherwise, accept into subsystem queue
5. **Return Result**: Return routing result with success status

### Query Message Flow

1. **Route Message**: Same as standard flow
2. **Check Query Result**: If message is a query with synchronous result
3. **Return Query Result**: Return query result directly in routing result

### Kernel Message Flow

1. **Detect Kernel Path**: Identify `kernel://` path
2. **Route to Kernel**: Route directly to kernel subsystem
3. **Process Synchronously**: Kernel processes message immediately
4. **Return Result**: Return processing result

## Error Handling

### Invalid Message Path

If message path is invalid:

```javascript
const result = await router.route(invalidMessage);
// result: { success: false, error: 'Invalid message path: ...', messageId: '...' }
```

**Error Types:**
- `'Invalid message path: ...'` - Message path format is invalid
- `'Invalid path format: ...'` - Cannot extract subsystem from path

### Unknown Subsystem

If subsystem is not found:

```javascript
const result = await router.route(message);
// result: { success: false, error: 'No subsystem found for: canvas', messageId: '...' }
```

### Routing Errors

Errors during routing are caught and returned:

```javascript
const result = await router.route(message);
if (!result.success) {
  console.error(`Routing error: ${result.error}`);
  // Statistics are updated (routingErrors++)
}
```

## Debug Logging

The router supports debug logging:

```javascript
const router = new MessageRouter(messageSystem, kernel, subsystems, {
  debug: true
});
```

Debug messages include:
- Router initialization
- Message routing (success/failure)
- Statistics clearing

## Performance Considerations

### Routing Performance

- **Path Extraction**: O(1) - Simple string parsing
- **Subsystem Lookup**: O(1) - Map-based registry lookup
- **Message Acceptance**: Depends on subsystem implementation

### Statistics Tracking

- **Minimal Overhead**: Simple counter increments
- **No Performance Impact**: Statistics don't affect routing performance

## Best Practices

1. **Use on MessageSystem**: Typically used on MessageSystem instances, not regular subsystems
2. **Check Results**: Always check `result.success` before using routing results
3. **Handle Errors**: Handle routing errors gracefully (unknown routes, missing subsystems)
4. **Monitor Statistics**: Monitor routing statistics for system health
5. **Use Immediate Processing**: Use `processImmediately` flag for time-sensitive messages
6. **Query Messages**: Use query messages for synchronous operations
7. **Kernel Messages**: Use `kernel://` paths for system-level operations

## See Also

- [useMessageSystemRouter](./USE-MESSAGE-SYSTEM-ROUTER.md) - Hook that provides MessageRouter functionality
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator that uses MessageRouter
- [useRouter](../router/USE-ROUTER.md) - Subsystem-level router hook
- [Message](../../message/MESSAGE.md) - Message class for routing
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem that handles kernel:// messages





