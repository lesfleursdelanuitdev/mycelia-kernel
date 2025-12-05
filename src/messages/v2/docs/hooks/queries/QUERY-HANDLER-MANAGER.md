# QueryHandlerManager Class

## Overview

The `QueryHandlerManager` class manages query handler setup and integration for subsystems. It provides a clean interface for enabling and disabling query support, automatically handles route registration for query operations, and delegates query message processing to registered query handlers.

**Key Features:**
- **Query Handler Management**: Enable/disable query handlers with automatic route registration
- **Route Integration**: Automatically registers `query/*` route when handler is enabled
- **Query Processing**: Delegates query message processing to registered handlers
- **State Management**: Tracks whether a query handler is currently enabled
- **Debug Support**: Conditional debug logging
- **Validation**: Validates query handler interface before enabling

## Constructor

### `new QueryHandlerManager(subsystem, debug)`

Create a new `QueryHandlerManager` instance.

**Signature:**
```javascript
new QueryHandlerManager(subsystem, debug = false)
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - The subsystem that owns this manager
- `debug` (boolean, optional, default: `false`) - Enable debug logging

**Throws:**
- `Error` - If `subsystem` is not provided

**Example:**
```javascript
import { QueryHandlerManager } from './query-handler-manager.mycelia.js';

const queryManager = new QueryHandlerManager(subsystem, true);
```

**Initialization:**
- Stores subsystem reference
- Sets debug flag
- Initializes `queryHandler` to `null` (no handler enabled initially)

## Core Methods

### `enable(queryHandler)`

Enable query handler support by registering a query handler instance.

**Signature:**
```javascript
enable(queryHandler) => boolean
```

**Parameters:**
- `queryHandler` (BaseQueryHandler, required) - Query handler instance that implements `processQuery(message)` method

**Returns:** `boolean` - Always returns `true` (success status)

**Throws:**
- `Error` - If `queryHandler` is not provided or doesn't implement `processQuery()` method

**Side Effects:**
- Stores the query handler instance
- Automatically registers `query/*` route with the subsystem router
- The route handler delegates to `queryHandler.processQuery(message)`
- Logs debug message if debug is enabled

**Behavior:**
- If a handler is already enabled, returns `true` without changes (idempotent)
- Validates that handler implements `processQuery()` method
- Registers route with high priority (priority: 10) for query operations

**Example:**
```javascript
import { BaseQueryHandler } from './base-query-handler.mycelia.js';

class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-data': this.handleGetData.bind(this)
    };
  }
  
  handleGetData(queryBody) {
    return { success: true, data: this.subsystem.getData() };
  }
}

const queryHandler = new MyQueryHandler(subsystem);
queryManager.enable(queryHandler);
// Query handler enabled and 'query/*' route registered
```

**Route Registration:**
When a handler is enabled, the manager automatically registers a route:

```javascript
subsystem.registerRoute('query/*', async (message, _iterator, _params) => {
  return await this.queryHandler.processQuery(message);
}, {
  description: 'Query operations',
  priority: 10 // High priority for query operations
});
```

### `disable()`

Disable query handler support.

**Signature:**
```javascript
disable() => boolean
```

**Returns:** `boolean` - `true` if handler was disabled, `false` if no handler was enabled

**Side Effects:**
- Unregisters `query/*` route from subsystem router
- Clears the query handler reference (sets to `null`)
- Logs debug message if debug is enabled

**Behavior:**
- If no handler is enabled, returns `false` (no-op)
- Unregisters the route that was registered during `enable()`
- Clears handler reference

**Example:**
```javascript
const disabled = queryManager.disable();
if (disabled) {
  console.log('Query handler disabled');
} else {
  console.log('No query handler was enabled');
}
```

### `hasHandler()`

Check if a query handler is currently enabled.

**Signature:**
```javascript
hasHandler() => boolean
```

**Returns:** `boolean` - `true` if a query handler is enabled, `false` otherwise

**Example:**
```javascript
if (queryManager.hasHandler()) {
  console.log('Query handler is enabled');
} else {
  console.log('No query handler enabled');
}
```

### `processQuery(message)`

Process a query message by delegating to the registered query handler.

**Signature:**
```javascript
processQuery(message) => Promise<any>
```

**Parameters:**
- `message` (Message, required) - Query message to process

**Returns:** `Promise<any>` - Query result from the handler

**Throws:**
- `Error` - If query handler is not enabled

**Behavior:**
- Delegates to `queryHandler.processQuery(message)`
- Returns the result from the handler
- Throws error if no handler is enabled

**Example:**
```javascript
const queryMessage = messageFactory.createQuery('query/get-data', {});
const result = await queryManager.processQuery(queryMessage);
console.log('Query result:', result);
```

**Note:** This method is typically called by `acceptMessage` utility when a query message is detected.

## Accessor Methods

### `getHandler()`

Get the current query handler instance.

**Signature:**
```javascript
getHandler() => BaseQueryHandler | null
```

**Returns:** `BaseQueryHandler | null` - The current query handler instance, or `null` if not enabled

**Example:**
```javascript
const handler = queryManager.getHandler();
if (handler) {
  console.log('Handler type:', handler.constructor.name);
}
```

### `isDebugEnabled()`

Check if debug logging is enabled.

**Signature:**
```javascript
isDebugEnabled() => boolean
```

**Returns:** `boolean` - `true` if debug is enabled, `false` otherwise

**Example:**
```javascript
if (queryManager.isDebugEnabled()) {
  console.log('Debug logging is enabled');
}
```

### `setDebug(debug)`

Set debug logging flag.

**Signature:**
```javascript
setDebug(debug) => void
```

**Parameters:**
- `debug` (boolean, required) - Enable or disable debug logging

**Side Effects:**
- Updates the internal debug flag
- Affects debug logging in `enable()` and `disable()` methods

**Example:**
```javascript
queryManager.setDebug(true);
// Debug logging now enabled
```

## Internal Storage

### Properties

- **`subsystem`** (BaseSubsystem): Reference to the subsystem that owns this manager
- **`debug`** (boolean): Debug logging flag
- **`queryHandler`** (BaseQueryHandler | null): Current query handler instance, or `null` if not enabled

## Usage Patterns

### Basic Lifecycle

```javascript
import { QueryHandlerManager } from './query-handler-manager.mycelia.js';
import { BaseQueryHandler } from './base-query-handler.mycelia.js';

// Create manager
const queryManager = new QueryHandlerManager(subsystem, true);

// Create and enable handler
class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-info': this.handleGetInfo.bind(this)
    };
  }
  
  handleGetInfo(queryBody) {
    return { success: true, data: { name: this.subsystem.name } };
  }
}

const handler = new MyQueryHandler(subsystem);
queryManager.enable(handler);

// Process queries
const result = await queryManager.processQuery(queryMessage);

// Disable when done
queryManager.disable();
```

### Integration with useQueries Hook

The `QueryHandlerManager` is used internally by the `useQueries` hook:

```javascript
// In useQueries hook
const queryHandlerManager = new QueryHandlerManager(subsystem, debug);

// Exposed via facet
facet.enableQueryHandler = (handler) => queryHandlerManager.enable(handler);
facet.disableQueryHandler = () => queryHandlerManager.disable();
facet.hasQueryHandler = () => queryHandlerManager.hasHandler();
facet._queryHandlerManager = queryHandlerManager;
```

### Route Registration

When a handler is enabled, the manager automatically registers a route:

```javascript
// Manager automatically calls:
subsystem.registerRoute('query/*', async (message, _iterator, _params) => {
  return await this.queryHandler.processQuery(message);
}, {
  description: 'Query operations',
  priority: 10
});
```

This route catches all query messages (`query/*`) and delegates to the query handler's `processQuery()` method.

## Query Handler Interface

Query handlers must implement the following interface:

### Required Method

**`processQuery(message)`**

Process a query message and return a result.

**Signature:**
```javascript
async processQuery(message) => Promise<Object>
```

**Parameters:**
- `message` (Message) - Query message to process

**Returns:** `Promise<Object>` - Query result object

**Result Format:**
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: 'Error message' }`

**Example:**
```javascript
class MyQueryHandler {
  async processQuery(message) {
    // Process query
    const data = await this.getData(message);
    return { success: true, data };
  }
}
```

**Note:** Handlers that extend `BaseQueryHandler` automatically implement this interface and provide additional functionality (operation routing, error handling, etc.).

## Error Handling

### Handler Not Enabled

If `processQuery()` is called when no handler is enabled:

```javascript
try {
  const result = await queryManager.processQuery(message);
} catch (error) {
  // Error: "Query handler not enabled"
  console.error(error.message);
}
```

### Invalid Handler

If `enable()` is called with an invalid handler:

```javascript
try {
  queryManager.enable({}); // Missing processQuery method
} catch (error) {
  // Error: "Query handler must implement processQuery(message) method"
  console.error(error.message);
}
```

### Handler Already Enabled

If `enable()` is called when a handler is already enabled:

```javascript
queryManager.enable(handler1);
queryManager.enable(handler2); // Returns true, but handler1 remains enabled
// handler2 is ignored (idempotent behavior)
```

## Debug Logging

Debug messages are logged when debug is enabled:

### Enable Handler

```javascript
QueryHandlerManager: Query handler enabled and 'query/*' route registered
```

### Disable Handler

```javascript
QueryHandlerManager: Query handler disabled
```

### Handler Already Enabled

```javascript
QueryHandlerManager: Query handler already enabled
```

## Integration with acceptMessage

The `QueryHandlerManager` is used by the `acceptMessage` utility to process query messages:

```javascript
// In acceptMessage utility
if (queryHandlerManager && queryHandlerManager.hasHandler() && message.isQuery()) {
  const queryResult = await queryHandlerManager.processQuery(message);
  message.setQueryResult(queryResult);
  return true; // Message accepted with result
}
```

## Best Practices

1. **Use BaseQueryHandler**: Extend `BaseQueryHandler` for consistent behavior and operation routing
2. **Enable Early**: Enable query handler early in subsystem lifecycle (after build)
3. **Validate Handlers**: Always validate that handlers implement `processQuery()` before enabling
4. **Handle Errors**: Query handlers should return error results, not throw exceptions
5. **Disable When Done**: Disable query handler when no longer needed to clean up routes
6. **Check State**: Use `hasHandler()` before calling `processQuery()`
7. **Enable Debug**: Enable debug logging during development for troubleshooting

## Thread Safety

The `QueryHandlerManager` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## Performance Considerations

- **Route Registration**: Route registration is performed once during `enable()`
- **Query Processing**: Query processing is delegated to the handler (performance depends on handler implementation)
- **State Checks**: `hasHandler()` is a simple null check (O(1))

## See Also

- [useQueries Hook](./USE-QUERIES.md) - Hook that uses this manager
- [BaseQueryHandler](./base-query-handler.mycelia.js) - Base class for query handlers
- [acceptMessage](../message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility that uses this manager
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [Router Documentation](../router/) - Route registration and matching








