# useQueries Hook

## Overview

The `useQueries` hook provides query handler functionality to subsystems. It enables subsystems to process query messages synchronously, bypassing the normal message queue. Query messages are processed immediately and their results are stored directly in the message object.

**Key Features:**
- **Query Handler Management**: Enable/disable query handlers for synchronous query processing
- **Immediate Processing**: Query messages are processed immediately (bypasses queue)
- **Result Storage**: Query results are stored directly in the message object
- **Route Integration**: Integrates with router facet for query route registration
- **Statistics Integration**: Integrates with statistics facet for tracking
- **Listener Integration**: Integrates with listeners facet for event notifications
- **Debug Support**: Conditional debug logging via debug flag utilities

## Hook Metadata

```javascript
{
  kind: 'queries',
  overwrite: false,
  required: ['router', 'statistics', 'listeners'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'queries'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing queries facet
- **`required`**: `['router', 'statistics', 'listeners']` - Requires router, statistics, and listeners facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.queries`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.queries`:

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
    queries: {
      debug: true
    }
  }
});
```

## Facet Methods

### `hasQueryHandler()`

Check if a query handler is currently enabled.

**Signature:**
```javascript
hasQueryHandler() => boolean
```

**Returns:** `boolean` - `true` if a query handler is enabled, `false` otherwise

**Example:**
```javascript
if (subsystem.queries.hasQueryHandler()) {
  console.log('Query handler is enabled');
}
```

### `enableQueryHandler(queryHandler)`

Enable query handler support by registering a query handler instance.

**Signature:**
```javascript
enableQueryHandler(queryHandler) => boolean
```

**Parameters:**
- `queryHandler` (BaseQueryHandler, required) - Query handler instance that extends `BaseQueryHandler`

**Returns:** `boolean` - `true` if handler was successfully enabled

**Side Effects:**
- Registers the query handler with `QueryHandlerManager`
- Enables query message processing for the subsystem
- May register query routes with the router facet (depending on handler implementation)

**Example:**
```javascript
import { BaseQueryHandler } from './base-query-handler.mycelia.js';

class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-data': this.handleGetData.bind(this),
      'get-stats': this.handleGetStats.bind(this)
    };
  }
  
  handleGetData(queryBody) {
    return { success: true, data: this.subsystem.getData(queryBody) };
  }
  
  handleGetStats(queryBody) {
    return { success: true, stats: this.subsystem.getStatistics() };
  }
}

const queryHandler = new MyQueryHandler(subsystem);
subsystem.queries.enableQueryHandler(queryHandler);
```

### `disableQueryHandler()`

Disable query handler support.

**Signature:**
```javascript
disableQueryHandler() => boolean
```

**Returns:** `boolean` - `true` if handler was successfully disabled

**Side Effects:**
- Unregisters the query handler from `QueryHandlerManager`
- Disables query message processing for the subsystem
- Query messages will be treated as regular messages (enqueued instead of processed immediately)

**Example:**
```javascript
subsystem.queries.disableQueryHandler();
// Query messages will now be enqueued like regular messages
```

## Facet Properties

### `_queryHandlerManager`

**Type:** `QueryHandlerManager`

**Description:** Internal reference to the `QueryHandlerManager` instance. Used internally by other hooks (e.g., `useMessageProcessor` for query message processing).

**Note:** This is an internal property and should not be accessed directly by application code. Use the public methods instead.

## Encapsulated Functionality

The `useQueries` hook encapsulates:

1. **Query Handler Management**: Manages query handler lifecycle (enable/disable)
2. **Query Processing**: Integrates with `acceptMessage` to process queries immediately
3. **Handler Registration**: Provides interface for registering query handlers
4. **Route Integration**: Works with router facet for query route handling
5. **Statistics Integration**: Works with statistics facet for tracking query operations
6. **Listener Integration**: Works with listeners facet for query-related events

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useQueries } from './hooks/queries/use-queries.mycelia.js';
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';
import { BaseQueryHandler } from './hooks/queries/base-query-handler.mycelia.js';

// Create a custom query handler
class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-info': this.handleGetInfo.bind(this)
    };
  }
  
  handleGetInfo(queryBody) {
    return {
      success: true,
      data: {
        name: this.subsystem.name,
        status: 'active'
      }
    };
  }
}

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useQueries
});

await subsystem.build();

// Enable query handler
const queryHandler = new MyQueryHandler(subsystem);
subsystem.queries.enableQueryHandler(queryHandler);
```

### Query Message Processing

Query messages are automatically processed when accepted:

```javascript
// Create a query message
const queryMessage = messageFactory.createQuery('query/get-info', {});

// Accept the query (will be processed immediately)
await subsystem.processor.accept(queryMessage);

// Result is stored in the message
const result = queryMessage.getQueryResult();
if (result.success) {
  console.log('Query result:', result.data);
} else {
  console.error('Query error:', result.error);
}
```

### Multiple Query Operations

Query handlers can support multiple operations:

```javascript
class DataQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-user': this.handleGetUser.bind(this),
      'get-users': this.handleGetUsers.bind(this),
      'get-count': this.handleGetCount.bind(this)
    };
  }
  
  handleGetUser(queryBody) {
    const { id } = queryBody;
    const user = this.subsystem.getUserById(id);
    return { success: true, data: user };
  }
  
  handleGetUsers(queryBody) {
    const { limit = 10, offset = 0 } = queryBody;
    const users = this.subsystem.getUsers(limit, offset);
    return { success: true, data: users };
  }
  
  handleGetCount(queryBody) {
    const count = this.subsystem.getUserCount();
    return { success: true, data: { count } };
  }
}
```

### Disabling Query Handler

```javascript
// Disable query handler
subsystem.queries.disableQueryHandler();

// Query messages will now be enqueued like regular messages
const queryMessage = messageFactory.createQuery('query/get-info', {});
await subsystem.processor.accept(queryMessage);
// Message is queued, not processed immediately
```

## Error Handling

### Handler Not Enabled

If a query message is accepted but no handler is enabled:

```javascript
// Query handler not enabled
const queryMessage = messageFactory.createQuery('query/get-info', {});
await subsystem.processor.accept(queryMessage);
// Query is treated as regular message and enqueued
```

### Query Processing Errors

Query processing errors are handled by the query handler:

```javascript
class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-data': this.handleGetData.bind(this)
    };
  }
  
  handleGetData(queryBody) {
    try {
      const data = this.subsystem.getData(queryBody);
      return { success: true, data };
    } catch (error) {
      // BaseQueryHandler will catch and return error result
      throw error;
    }
  }
}
```

**Error Result Format:**
```javascript
{
  success: false,
  error: 'Error message'
}
```

## Debug Logging

The hook uses the debug flag utility for conditional logging:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    queries: {
      debug: true
    }
  }
});
```

Debug messages are logged by the `QueryHandlerManager` and `BaseQueryHandler` classes when debug is enabled.

## Dependencies

The `useQueries` hook requires the following facets:

- **`router`** (required) - For query route registration and routing
- **`statistics`** (required) - For tracking query operations
- **`listeners`** (required) - For query-related event notifications

**Installation Order:**
The hook should be installed after its dependencies (router, statistics, listeners) are installed.

## Integration with Other Hooks

### With useMessageProcessor

The `useMessageProcessor` hook uses the query handler manager to process query messages:

```javascript
// In acceptMessage utility
if (queryHandlerManager && queryHandlerManager.hasHandler() && message.isQuery()) {
  // Process query immediately via queryHandlerManager.processQuery(message)
  const queryResult = await queryHandlerManager.processQuery(message);
  message.setQueryResult(queryResult);
}
```

### With useRouter

The router facet is used for query route registration (if the query handler registers routes):

```javascript
// Query handler may register routes with router
const routerFacet = api.__facets['router'];
// Routes are registered during query handler enablement
```

### With useStatistics

The statistics facet tracks query operations:

```javascript
// Statistics are recorded when queries are processed
// Tracked via statistics facet integration
```

### With useListeners

The listeners facet can be used for query-related events:

```javascript
// Listeners can be registered for query events
// Integration via listeners facet
```

## Query Handler Implementation

### BaseQueryHandler

Query handlers must extend `BaseQueryHandler` and implement `getOperationHandlers()`:

```javascript
import { BaseQueryHandler } from './base-query-handler.mycelia.js';

class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'operation-name': this.handlerMethod.bind(this)
    };
  }
  
  handlerMethod(queryBody) {
    // Process query and return result
    return {
      success: true,
      data: { /* result data */ }
    };
  }
}
```

### Query Message Format

Query messages must follow the format: `subsystem://query/<operation>`

**Example:**
```javascript
// Query message path: 'my-subsystem://query/get-info'
const queryMessage = messageFactory.createQuery('query/get-info', {
  // Query parameters
  id: '123'
});
```

### Query Result Format

Query handlers should return results in the following format:

**Success:**
```javascript
{
  success: true,
  data: { /* result data */ }
}
```

**Error:**
```javascript
{
  success: false,
  error: 'Error message'
}
```

## Best Practices

1. **Extend BaseQueryHandler**: Always extend `BaseQueryHandler` for consistent behavior
2. **Bind Handler Methods**: Use `.bind(this)` when returning handler methods in `getOperationHandlers()`
3. **Return Consistent Format**: Always return results in the standard format `{success, data/error}`
4. **Handle Errors Gracefully**: Let `BaseQueryHandler` handle errors, or return error results explicitly
5. **Enable Early**: Enable query handler early in subsystem lifecycle (after build)
6. **Use Descriptive Operations**: Use clear, descriptive operation names (e.g., `get-user`, `list-items`)
7. **Validate Input**: Validate query body parameters in handler methods
8. **Enable Debug**: Enable debug logging during development for troubleshooting

## Query Message Flow

### Query Processing Flow

1. **Accept**: Query message is accepted via `subsystem.processor.accept(queryMessage)`
2. **Detection**: `acceptMessage` detects query message (`message.isQuery()`)
3. **Handler Check**: Checks if query handler is enabled (`queryHandlerManager.hasHandler()`)
4. **Process**: Processes query immediately via `queryHandlerManager.processQuery(message)`
5. **Route**: `BaseQueryHandler` routes to appropriate operation handler
6. **Execute**: Operation handler executes and returns result
7. **Store**: Result is stored in message via `message.setQueryResult(result)`
8. **Return**: `acceptMessage` returns `true` (message accepted with result)

### Query Handler Lifecycle

1. **Create**: Create query handler instance extending `BaseQueryHandler`
2. **Enable**: Enable query handler via `subsystem.queries.enableQueryHandler(handler)`
3. **Process**: Query messages are processed automatically when accepted
4. **Disable**: Optionally disable query handler via `subsystem.queries.disableQueryHandler()`

## See Also

- [Queries Guide](../../communication/QUERIES.md) - Detailed query communication patterns
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [Requests Guide](../../communication/REQUESTS.md) - How queries use requests
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [QueryHandlerManager](./QUERY-HANDLER-MANAGER.md) - Query handler manager class
- [BaseQueryHandler](./BASE-QUERY-HANDLER.md) - Base class for query handlers
- [useRequests](../requests/USE-REQUESTS.md) - Request/response functionality
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

