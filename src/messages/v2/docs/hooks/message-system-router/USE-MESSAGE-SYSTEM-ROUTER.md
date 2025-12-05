# useMessageSystemRouter Hook

## Overview

The `useMessageSystemRouter` hook provides message routing functionality to subsystems (typically MessageSystem) using `MessageRouter`. It routes messages to appropriate subsystems based on message paths, extracting subsystem names from paths and delegating to the correct subsystem. The hook handles both regular subsystem messages and kernel messages (`kernel://`) with special processing.

**Key Features:**
- **Path-Based Routing**: Extracts subsystem names from message paths and routes accordingly
- **Kernel Message Handling**: Special handling for `kernel://` messages (synchronous processing)
- **Subsystem Registry Integration**: Uses MessageSystem's subsystem registry for routing
- **Query Message Support**: Handles query messages with synchronous results
- **Statistics Tracking**: Tracks routing statistics (messages routed, errors, unknown routes)
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'messageSystemRouter',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'messageSystemRouter'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing messageSystemRouter facet
- **`required`**: `[]` - No facet dependencies (requires MessageSystem and subsystems registry in context)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.messageSystemRouter`
- **`source`**: `import.meta.url` - Source file location for debugging

**Note:** This hook is typically used on MessageSystem instances. The hook requires `ctx.ms` (MessageSystem) and `ctx.subsystems` (MessageSubsystems registry) to function properly.

## Configuration

The hook reads configuration from `ctx.config.messageSystemRouter`:

```javascript
{
  debug: boolean,
  options: {
    // Additional options passed to MessageRouter
  }
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.
- **`options`** (object, optional): Additional options passed to MessageRouter constructor

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system', {
  config: {
    messageSystemRouter: {
      debug: true,
      options: {
        // Additional MessageRouter options
      }
    }
  }
});
```

## Facet Methods

### `route(message, options)`

Route a message to the appropriate subsystem based on its path.

**Signature:**
```javascript
route(message, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to route (must have valid path format)
- `options` (object, optional) - Options to pass to subsystem `accept()`

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
- Extracts subsystem name from message path
- Routes `kernel://` messages to kernel subsystem (synchronous processing)
- Routes other messages to subsystems via registry
- Handles query messages with synchronous results
- Tracks routing statistics
- Returns detailed routing result

**Example:**
```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await messageSystem.messageSystemRouter.route(message);

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

const result = await messageSystem.messageSystemRouter.route(kernelMessage);
// Kernel messages are processed synchronously
```

**Example - Query Message:**
```javascript
const queryMessage = new Message('canvas://layers/query/all', {});
const result = await messageSystem.messageSystemRouter.route(queryMessage);

if (result.success && result.result) {
  // Query result is available immediately
  console.log('Query result:', result.result);
}
```

### `routeToSubsystem(message, targetSubsystem, options)`

Route message to a specific subsystem.

**Signature:**
```javascript
routeToSubsystem(message, targetSubsystem, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to route
- `targetSubsystem` (BaseSubsystem, required) - Target subsystem
- `options` (object, optional) - Options to pass to `accept()` or `processImmediately()`

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

**Example:**
```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const targetSubsystem = messageSystem.getSubsystem('canvas');

const result = await messageSystem.messageSystemRouter.routeToSubsystem(
  message,
  targetSubsystem
);

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

const result = await messageSystem.messageSystemRouter.routeToSubsystem(
  message,
  targetSubsystem
);

// Message is processed immediately, bypassing queue
console.log(result.processed); // true
```

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
const stats = messageSystem.messageSystemRouter.getStatistics();
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

**Example:**
```javascript
messageSystem.messageSystemRouter.clear();
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

const result = await messageSystem.messageSystemRouter.route(kernelMessage);
// Processed immediately by kernel subsystem
```

### Subsystem Messages

Regular subsystem messages are routed via the subsystem registry:

```javascript
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await messageSystem.messageSystemRouter.route(message);
// Routed to 'canvas' subsystem via registry
```

### Query Messages

Query messages can return synchronous results:

```javascript
const queryMessage = new Message('canvas://layers/query/all', {});
const result = await messageSystem.messageSystemRouter.route(queryMessage);

if (result.success && result.result) {
  // Query result available immediately
  console.log('Query result:', result.result);
}
```

## Usage Patterns

### Basic Routing

```javascript
// Route a message
const message = new Message('canvas://layers/create', { name: 'background' });
const result = await messageSystem.messageSystemRouter.route(message);

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
const result = await messageSystem.messageSystemRouter.routeToSubsystem(
  message,
  targetSubsystem
);
```

### Immediate Processing

```javascript
// Process message immediately (bypass queue)
message.meta.processImmediately = true;

const result = await messageSystem.messageSystemRouter.route(message);
// Message processed synchronously
```

### Statistics Monitoring

```javascript
// Monitor routing statistics
const stats = messageSystem.messageSystemRouter.getStatistics();
console.log(`Success rate: ${stats.messagesRouted / (stats.messagesRouted + stats.routingErrors)}`);

// Clear statistics periodically
if (stats.messagesRouted > 10000) {
  messageSystem.messageSystemRouter.clear();
}
```

## Integration with MessageSystem

The `useMessageSystemRouter` hook is automatically installed by `MessageSystem`:

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

## Error Handling

### Missing MessageSystem

If MessageSystem is not found in context:

```javascript
// Throws during hook execution
throw new Error(`useMessageSystemRouter ${name}: MessageSystem (ctx.ms) is required but not found`);
```

### Missing Subsystems Registry

If subsystems registry is not found:

```javascript
// Throws during hook execution
throw new Error(`useMessageSystemRouter ${name}: MessageSubsystems registry (ctx.subsystems) is required but not found`);
```

### Invalid Message Path

If message path is invalid:

```javascript
const result = await router.route(invalidMessage);
// result: { success: false, error: 'Invalid message path: ...', messageId: '...' }
```

### Unknown Subsystem

If subsystem is not found:

```javascript
const result = await router.route(message);
// result: { success: false, error: 'No subsystem found for: canvas', messageId: '...' }
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

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const messageSystem = new MessageSystem('main-system', {
  config: {
    messageSystemRouter: {
      debug: true
    }
  }
});
```

Debug messages include:
- Router initialization
- Message routing (success/failure)
- Statistics clearing

## Dependencies

The `useMessageSystemRouter` hook requires:

- **MessageSystem** (in `ctx.ms`) - Required for routing infrastructure
- **MessageSubsystems Registry** (in `ctx.subsystems`) - Required for subsystem lookup

**Note:** The hook has no facet dependencies, but requires MessageSystem and subsystems registry in the context to function properly.

## Best Practices

1. **Use on MessageSystem**: Typically used on MessageSystem instances, not regular subsystems
2. **Check Results**: Always check `result.success` before using routing results
3. **Handle Errors**: Handle routing errors gracefully (unknown routes, missing subsystems)
4. **Monitor Statistics**: Monitor routing statistics for system health
5. **Use Immediate Processing**: Use `processImmediately` flag for time-sensitive messages
6. **Query Messages**: Use query messages for synchronous operations
7. **Kernel Messages**: Use `kernel://` paths for system-level operations

## Performance Considerations

### Routing Performance

- **Path Extraction**: O(1) - Simple string parsing
- **Subsystem Lookup**: O(1) - Map-based registry lookup
- **Message Acceptance**: Depends on subsystem implementation

### Statistics Tracking

- **Minimal Overhead**: Simple counter increments
- **No Performance Impact**: Statistics don't affect routing performance

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [MessageRouter](./MESSAGE-ROUTER.md) - MessageRouter class implementation
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator that uses this hook
- [useRouter](../router/USE-ROUTER.md) - Subsystem-level router hook
- [Message](../../message/MESSAGE.md) - Message class for routing

