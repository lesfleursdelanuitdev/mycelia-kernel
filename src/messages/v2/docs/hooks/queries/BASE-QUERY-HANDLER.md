# BaseQueryHandler Class

## Overview

The `BaseQueryHandler` class is a base class for query handlers that provides common query processing logic. It handles query message validation, operation routing, and error handling, allowing subclasses to focus on implementing specific query operations.

**Key Features:**
- **Operation Routing**: Automatically routes query messages to appropriate operation handlers
- **Path Validation**: Validates query message paths and extracts operations
- **Error Handling**: Provides consistent error handling and response formatting
- **Subclass Interface**: Requires subclasses to implement `getOperationHandlers()` method
- **Debug Support**: Conditional debug logging based on subsystem debug flag
- **Query Body Extraction**: Extracts query body from messages for handler methods

## Constructor

### `new BaseQueryHandler(subsystem)`

Create a new `BaseQueryHandler` instance.

**Signature:**
```javascript
new BaseQueryHandler(subsystem)
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - Reference to subsystem for query operations

**Throws:**
- `Error` - If `subsystem` is not provided
- `Error` - If subclass doesn't implement `getOperationHandlers()` method

**Initialization:**
- Stores subsystem reference
- Extracts debug flag from subsystem (`subsystem.debug || false`)
- Calls `getOperationHandlers()` to get operation mapping
- Validates that operations mapping is provided
- Logs initialization message if debug is enabled

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
```

## Core Methods

### `processQuery(message)`

Process a query message by routing it to the appropriate operation handler.

**Signature:**
```javascript
async processQuery(message) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Query message with path format: `subsystem://query/<operation>`

**Returns:** `Promise<Object>` - Query result object:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: 'Error message' }`

**Behavior:**
1. Extracts subsystem path from message (`message.getSubsystemPath()`)
2. Validates path format (must start with `'query/'`)
3. Extracts operation name from path (`'query/get-errors'` → `'get-errors'`)
4. Validates operation is specified
5. Extracts query body from message (`message.getBody()`)
6. Routes to appropriate handler via operations mapping
7. Calls handler with query body
8. Returns handler result

**Error Handling:**
- Invalid path format: Returns error result
- Missing operation: Returns error result
- Unknown operation: Returns error result
- Handler errors: Catches and returns error result

**Example:**
```javascript
// Query message: 'my-subsystem://query/get-data'
const queryMessage = messageFactory.createQuery('query/get-data', {
  id: '123'
});

const result = await queryHandler.processQuery(queryMessage);
// result = { success: true, data: { ... } }
```

**Path Format:**
Query messages must follow the format: `subsystem://query/<operation>`

- **Full Path**: `'my-subsystem://query/get-data'`
- **Subsystem Path**: `'query/get-data'` (extracted via `message.getSubsystemPath()`)
- **Operation**: `'get-data'` (extracted from subsystem path)

### `getOperationHandlers()`

Get operation handlers mapping. **Must be implemented by subclasses.**

**Signature:**
```javascript
getOperationHandlers() => Object<string, Function>
```

**Returns:** `Object<string, Function>` - Mapping of operation names to handler functions

**Throws:**
- `Error` - If not implemented by subclass (base class throws error)

**Implementation Requirements:**
- Must return an object with operation names as keys
- Values must be functions (handler methods)
- Handler functions should be bound to `this` if they access instance properties
- Handler functions receive `queryBody` as parameter

**Example:**
```javascript
class MyQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-data': this.handleGetData.bind(this),
      'get-stats': this.handleGetStats.bind(this),
      'get-count': this.handleGetCount.bind(this)
    };
  }
  
  handleGetData(queryBody) {
    const { id } = queryBody;
    return { success: true, data: this.subsystem.getData(id) };
  }
  
  handleGetStats(queryBody) {
    return { success: true, data: this.subsystem.getStatistics() };
  }
  
  handleGetCount(queryBody) {
    return { success: true, data: { count: this.subsystem.getCount() } };
  }
}
```

**Handler Function Signature:**
```javascript
async handlerMethod(queryBody) => Promise<Object>
```

**Parameters:**
- `queryBody` (Object) - Query body extracted from message (`message.getBody()`)

**Returns:** `Promise<Object>` - Query result:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: 'Error message' }` (or throw error)

## Private Methods

### `_error(message)`

Create an error response object.

**Signature:**
```javascript
_error(message) => Object
```

**Parameters:**
- `message` (string, required) - Error message

**Returns:** `Object` - Error response object:
```javascript
{
  success: false,
  error: message
}
```

**Side Effects:**
- Logs error message if debug is enabled

**Note:** This is a private method used internally by `processQuery()` for error handling.

## Query Processing Flow

### Step-by-Step Process

1. **Message Received**: `processQuery(message)` is called
2. **Path Extraction**: Extract subsystem path via `message.getSubsystemPath()`
3. **Path Validation**: Validate path starts with `'query/'`
4. **Operation Extraction**: Extract operation name from path (`'query/get-data'` → `'get-data'`)
5. **Operation Validation**: Validate operation is specified
6. **Body Extraction**: Extract query body via `message.getBody()`
7. **Handler Lookup**: Find handler in operations mapping
8. **Handler Validation**: Validate handler exists for operation
9. **Handler Execution**: Call handler with query body
10. **Result Return**: Return handler result

### Error Flow

If any step fails:
1. Error is caught or detected
2. Error message is logged (if debug enabled)
3. Error result is returned: `{ success: false, error: 'Error message' }`
4. Processing stops (no handler is called)

## Usage Patterns

### Basic Implementation

```javascript
import { BaseQueryHandler } from './base-query-handler.mycelia.js';

class DataQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-user': this.handleGetUser.bind(this),
      'list-users': this.handleListUsers.bind(this)
    };
  }
  
  handleGetUser(queryBody) {
    const { id } = queryBody;
    if (!id) {
      return { success: false, error: 'User ID required' };
    }
    
    const user = this.subsystem.getUserById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { success: true, data: user };
  }
  
  handleListUsers(queryBody) {
    const { limit = 10, offset = 0 } = queryBody;
    const users = this.subsystem.getUsers(limit, offset);
    return { success: true, data: users };
  }
}
```

### With Error Handling

```javascript
class SafeQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-data': this.handleGetData.bind(this)
    };
  }
  
  async handleGetData(queryBody) {
    try {
      // Validate input
      if (!queryBody.id) {
        return { success: false, error: 'ID required' };
      }
      
      // Process query
      const data = await this.subsystem.fetchData(queryBody.id);
      
      // Return success
      return { success: true, data };
    } catch (error) {
      // Let BaseQueryHandler catch and format error
      throw error;
    }
  }
}
```

### With Async Operations

```javascript
class AsyncQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'fetch-data': this.handleFetchData.bind(this),
      'process-data': this.handleProcessData.bind(this)
    };
  }
  
  async handleFetchData(queryBody) {
    const { url } = queryBody;
    const data = await fetch(url).then(r => r.json());
    return { success: true, data };
  }
  
  async handleProcessData(queryBody) {
    const { data } = queryBody;
    const processed = await this.subsystem.processAsync(data);
    return { success: true, data: processed };
  }
}
```

### With Subsystem Access

```javascript
class SubsystemQueryHandler extends BaseQueryHandler {
  getOperationHandlers() {
    return {
      'get-status': this.handleGetStatus.bind(this),
      'get-config': this.handleGetConfig.bind(this)
    };
  }
  
  handleGetStatus(queryBody) {
    // Access subsystem properties and methods
    return {
      success: true,
      data: {
        name: this.subsystem.name,
        isBuilt: this.subsystem.isBuilt,
        status: 'active'
      }
    };
  }
  
  handleGetConfig(queryBody) {
    // Access subsystem configuration
    const config = this.subsystem.config || {};
    return { success: true, data: config };
  }
}
```

## Query Message Format

### Path Structure

Query messages must follow this path structure:

```
subsystem://query/<operation>
```

**Examples:**
- `'my-subsystem://query/get-data'`
- `'error://query/get-errors'`
- `'stats://query/get-statistics'`

### Subsystem Path Extraction

The `processQuery()` method extracts the subsystem path:

```javascript
const queryPath = message.getSubsystemPath();
// 'my-subsystem://query/get-data' → 'query/get-data'
```

### Operation Extraction

The operation is extracted from the subsystem path:

```javascript
const operation = queryPath.split('/')[1];
// 'query/get-data' → 'get-data'
```

### Query Body

The query body is extracted from the message:

```javascript
const queryBody = message.getBody() || {};
// Contains query parameters
```

## Error Handling

### Path Validation Errors

If path doesn't start with `'query/'`:

```javascript
// Invalid path: 'data/get-info'
// Returns: { success: false, error: "Invalid query path: data/get-info. Expected format: 'query/<operation>'" }
```

### Missing Operation

If operation is not specified:

```javascript
// Path: 'query/'
// Returns: { success: false, error: "No operation specified in query path: query/" }
```

### Unknown Operation

If operation handler doesn't exist:

```javascript
// Operation: 'unknown-operation'
// Returns: { success: false, error: "Unknown query operation: unknown-operation" }
```

### Handler Errors

If handler throws an error:

```javascript
// Handler throws: new Error('Database error')
// Returns: { success: false, error: "Database error" }
```

**Note:** Handlers can either:
- Return error result: `{ success: false, error: '...' }`
- Throw error: `throw new Error('...')` (will be caught and formatted)

## Debug Logging

Debug messages are logged when `subsystem.debug` is `true`:

### Initialization

```javascript
MyQueryHandler: Initialized
```

### Processing

```javascript
MyQueryHandler: Processing query operation 'get-data'
```

### Warnings

```javascript
MyQueryHandler: Invalid query path: data/get-info
MyQueryHandler: No operation specified in path: query/
MyQueryHandler: Unknown query operation: unknown-operation
```

### Errors

```javascript
MyQueryHandler: Error processing query: Database connection failed
MyQueryHandler: Database connection failed
```

## Best Practices

1. **Always Bind Handlers**: Use `.bind(this)` when returning handler methods in `getOperationHandlers()`
2. **Validate Input**: Validate query body parameters in handler methods
3. **Return Consistent Format**: Always return `{ success, data/error }` format
4. **Handle Errors**: Either return error results or throw errors (both are handled)
5. **Use Descriptive Operations**: Use clear, descriptive operation names (e.g., `get-user`, `list-items`)
6. **Access Subsystem Safely**: Check for null/undefined when accessing subsystem properties
7. **Document Operations**: Document what each operation does and what parameters it expects
8. **Test Handlers**: Test each operation handler independently

## Subclass Requirements

### Must Implement

**`getOperationHandlers()`**

Subclasses must implement this method to return a mapping of operation names to handler functions.

**Example:**
```javascript
getOperationHandlers() {
  return {
    'operation-name': this.handlerMethod.bind(this)
  };
}
```

### Handler Method Requirements

Handler methods should:
- Accept `queryBody` as parameter
- Return `Promise<Object>` or `Object`
- Return format: `{ success: true, data: ... }` or `{ success: false, error: '...' }`
- Be bound to `this` if accessing instance properties

## Integration with QueryHandlerManager

The `BaseQueryHandler` is used with `QueryHandlerManager`:

```javascript
import { QueryHandlerManager } from './query-handler-manager.mycelia.js';
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

const queryManager = new QueryHandlerManager(subsystem, true);
const handler = new MyQueryHandler(subsystem);
queryManager.enable(handler);
```

## Thread Safety

The `BaseQueryHandler` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## Performance Considerations

- **Operation Lookup**: Operation lookup is O(1) (object property access)
- **Path Parsing**: Path parsing is O(n) where n is path length (string operations)
- **Handler Execution**: Performance depends on handler implementation
- **Error Handling**: Error handling adds minimal overhead (try-catch)

## See Also

- [useQueries Hook](./USE-QUERIES.md) - Hook that uses query handlers
- [QueryHandlerManager](./QUERY-HANDLER-MANAGER.md) - Manager class for query handlers
- [acceptMessage](../message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects








