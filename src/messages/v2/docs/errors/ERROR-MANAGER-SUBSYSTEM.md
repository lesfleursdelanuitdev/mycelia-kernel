# Error Manager Subsystem

## Overview

The **ErrorManagerSubsystem** is a kernel child subsystem responsible for recording normalized error events, providing query APIs over recent errors, and emitting notifications via listeners. It integrates `useBoundedErrorStore` and `useErrorClassifier` hooks to provide a complete error management solution.

**Key Features:**
- **Error Recording**: Record and classify errors from various sources
- **Query APIs**: Query recent errors with filtering by type, severity, and subsystem
- **Error Summary**: Generate summaries of error counts by type and subsystem
- **Message Routes**: Provides message-based API for error recording and querying
- **Event Notifications**: Emits error events via listeners for real-time monitoring
- **Result-Based API**: All methods return Result objects for consistent error handling

## Constructor

### Signature

```javascript
new ErrorManagerSubsystem(name = 'error-manager', options = {})
```

### Parameters

#### `name` (string, optional)

The subsystem name. Defaults to `'error-manager'`.

**Default:** `'error-manager'`

#### `options` (object, required)

Configuration options for the subsystem.

**Properties:**
- `ms` (MessageSystem, required) - MessageSystem instance
- `config` (object, optional) - Configuration object
  - `boundedErrorStore` (object, optional) - BoundedErrorStore configuration
    - `capacity` (number, optional) - Maximum number of error records to retain (default: 1000)

**Example:**
```javascript
import { ErrorManagerSubsystem } from './error-manager.subsystem.mycelia.js';

const errorManager = new ErrorManagerSubsystem('error-manager', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 5000
    }
  }
});

await errorManager.build();
```

## Installed Hooks

The `ErrorManagerSubsystem` automatically installs the following hooks:

- **`useBoundedErrorStore`** (kind: `boundedErrorStore`) - Provides error storage functionality
- **`useErrorClassifier`** (kind: `errorClassifier`) - Provides error classification functionality

**Required Facets:**
- `router` - For message routing (must be provided by parent subsystem or hooks)
- `listeners` - For event notifications (must be provided by parent subsystem or hooks)

## Convenience Accessors

### `errorStore` (getter)

Get the bounded error store facet.

**Returns:** `BoundedErrorStore` facet - The boundedErrorStore facet

**Example:**
```javascript
const store = errorManager.errorStore;
const recent = store.recent(50);
```

### `store` (getter)

Get the underlying BoundedErrorStore instance.

**Returns:** `BoundedErrorStore` - The underlying store instance

**Example:**
```javascript
const store = errorManager.store;
const all = store.all;
```

## Public API

### `record(errorLike, context)`

Record and classify an error.

**Signature:**
```javascript
record(errorLike, context = {}) => Result
```

**Parameters:**
- `errorLike` (any, required) - Error, ErrorRecord, string, or object
- `context` (object, optional) - Additional classification context:
  - `messageSubsystem` (string, optional) - Subsystem name
  - `path` (string, optional) - Path associated with the error
  - `type` (string, optional) - Error type override
  - `severity` (string, optional) - Severity override
  - `code` (string|number, optional) - Error code
  - `data` (any, optional) - Additional data
  - `cause` (any, optional) - Underlying cause
  - `meta` (object, optional) - Additional metadata

**Returns:** `Result` - Result object:
- **Success**: `{ success: true, data: ErrorRecord }` - Plain object representation of the error record
- **Failure**: `{ success: false, type: 'record_error', message: string, details: object }`

**Behavior:**
- Classifies the error using `errorClassifier`
- Adds the classified record to `boundedErrorStore`
- Emits `'kernel://error/event/recorded'` event via listeners
- Returns Result object with the error record

**Example:**
```javascript
// Record an Error object
const error = new Error('Database connection failed');
const result = errorManager.record(error, {
  messageSubsystem: 'database',
  type: ERROR_TYPES.EXTERNAL,
  path: 'kernel://database/connect'
});

if (result.success) {
  console.log('Error recorded:', result.data);
} else {
  console.error('Failed to record error:', result.message);
}

// Record a string error
const result2 = errorManager.record('Validation failed', {
  messageSubsystem: 'validator',
  type: ERROR_TYPES.VALIDATION
});

// Record with full context
const result3 = errorManager.record(error, {
  messageSubsystem: 'api',
  path: 'kernel://api/users/create',
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  code: 'VALIDATION_001',
  data: { field: 'email', value: 'invalid' },
  cause: validationError,
  meta: { userId: 123, requestId: 'req-456' }
});
```

### `queryRecent(opts)`

Query recent errors.

**Signature:**
```javascript
queryRecent(opts = {}) => Result
```

**Parameters:**
- `opts` (object, optional) - Query options:
  - `limit` (number, optional) - Maximum number of records to return (default: 50)
  - `type` (string, optional) - Filter by error type
  - `subsystem` (string, optional) - Filter by subsystem

**Returns:** `Result` - Result object:
- **Success**: `{ success: true, data: { count: number, errors: ErrorRecord[] } }`
- **Failure**: `{ success: false, type: 'query_error', message: string, details: object }`

**Example:**
```javascript
// Get recent errors (default limit: 50)
const result = errorManager.queryRecent();

if (result.success) {
  console.log(`Found ${result.data.count} errors`);
  result.data.errors.forEach(error => {
    console.log(error.type, error.severity, error.subsystem);
  });
}

// Get recent errors with limit
const result2 = errorManager.queryRecent({ limit: 100 });

// Filter by type
const result3 = errorManager.queryRecent({
  limit: 50,
  type: ERROR_TYPES.TIMEOUT
});

// Filter by subsystem
const result4 = errorManager.queryRecent({
  limit: 50,
  subsystem: 'network'
});

// Combined filters
const result5 = errorManager.queryRecent({
  limit: 20,
  type: ERROR_TYPES.TIMEOUT,
  subsystem: 'network'
});
```

### `queryByType(type, opts)`

Query errors by type.

**Signature:**
```javascript
queryByType(type, opts = {}) => Result
```

**Parameters:**
- `type` (string, required) - Error type to filter by
- `opts` (object, optional) - Query options:
  - `limit` (number, optional) - Maximum number of records to return (default: 100)

**Returns:** `Result` - Result object (same format as `queryRecent`)

**Example:**
```javascript
// Query timeout errors
const result = errorManager.queryByType(ERROR_TYPES.TIMEOUT);

if (result.success) {
  console.log(`Found ${result.data.count} timeout errors`);
}

// Query with custom limit
const result2 = errorManager.queryByType(ERROR_TYPES.VALIDATION, {
  limit: 200
});
```

### `summary(opts)`

Get error summary.

**Signature:**
```javascript
summary(opts = {}) => Result
```

**Parameters:**
- `opts` (object, optional) - Summary options:
  - `limit` (number, optional) - Maximum number of records to analyze (default: 500)

**Returns:** `Result` - Result object:
- **Success**: `{ success: true, data: { limit: number, count: number, byType: object, bySubsystem: object } }`
- **Failure**: `{ success: false, type: 'summary_error', message: string, details: object }`

**Example:**
```javascript
// Get summary of all errors
const result = errorManager.summary();

if (result.success) {
  const { limit, count, byType, bySubsystem } = result.data;
  console.log(`Analyzed ${count} of ${limit} recent errors`);
  console.log('By type:', byType);
  console.log('By subsystem:', bySubsystem);
}

// Get summary with custom limit
const result2 = errorManager.summary({ limit: 1000 });
```

### `clear()`

Clear all error records.

**Signature:**
```javascript
clear() => Result
```

**Returns:** `Result` - Result object:
- **Success**: `{ success: true, data: { cleared: true } }`
- **Failure**: `{ success: false, type: 'clear_error', message: string, details: object }`

**Example:**
```javascript
const result = errorManager.clear();

if (result.success) {
  console.log('All error records cleared');
}
```

### `size()`

Get current store size.

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Current number of error records

**Example:**
```javascript
const currentSize = errorManager.size();
console.log(`Store contains ${currentSize} error records`);
```

## Message Routes

The `ErrorManagerSubsystem` registers the following message routes during initialization:

### Record Route

**Path:** `kernel://error/record/:type`

Records an error event. The error type can be specified in the path parameter or in the message payload.

**Message Payload:**
```javascript
{
  subsystem: string,    // Subsystem name
  type: string,         // Error type (optional if in path)
  severity: string,     // Severity (optional)
  code: string|number, // Error code (optional)
  message: string,      // Error message
  cause: any,          // Underlying cause (optional)
  data: any,           // Additional data (optional)
  meta: object         // Additional metadata (optional)
}
```

**Example:**
```javascript
const message = messageSystem.create('kernel://error/record/timeout', {
  subsystem: 'network',
  message: 'Request timed out',
  code: 'TIMEOUT_001',
  data: { timeout: 5000, elapsed: 5200 }
});

const result = await messageSystem.send(message);
```

### Query Recent Route

**Path:** `kernel://error/query/recent`

Queries recent errors.

**Message Payload:**
```javascript
{
  limit: number,      // Maximum number of records (optional, default: 50)
  type: string,       // Filter by type (optional)
  subsystem: string   // Filter by subsystem (optional)
}
```

**Example:**
```javascript
const message = messageSystem.create('kernel://error/query/recent', {
  limit: 100,
  type: ERROR_TYPES.TIMEOUT
});

const result = await messageSystem.send(message);
```

### Query By Type Route

**Path:** `kernel://error/query/by-type/:type`

Queries errors by type.

**Message Payload:**
```javascript
{
  limit: number  // Maximum number of records (optional, default: 100)
}
```

**Example:**
```javascript
const message = messageSystem.create('kernel://error/query/by-type/timeout', {
  limit: 200
});

const result = await messageSystem.send(message);
```

### Query Summary Route

**Path:** `kernel://error/query/summary`

Gets error summary.

**Message Payload:**
```javascript
{
  limit: number  // Maximum number of records to analyze (optional, default: 500)
}
```

**Example:**
```javascript
const message = messageSystem.create('kernel://error/query/summary', {
  limit: 1000
});

const result = await messageSystem.send(message);
```

## Event Notifications

The `ErrorManagerSubsystem` emits error events via listeners when errors are recorded:

**Event:** `'kernel://error/event/recorded'`

**Payload:** `ErrorRecord` - The recorded error record

**Example:**
```javascript
// Listen for error events
const listeners = kernel.find('listeners');
if (listeners) {
  listeners.on('kernel://error/event/recorded', (record) => {
    console.log('Error recorded:', record.type, record.severity, record.subsystem);
  });
}

// Record an error (event will be emitted)
errorManager.record(new Error('Something went wrong'), {
  messageSubsystem: 'my-subsystem'
});
```

## Integration with Kernel

The `ErrorManagerSubsystem` is typically created as a child of the `KernelSubsystem`:

```javascript
// KernelSubsystem automatically creates ErrorManagerSubsystem
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem
});

await kernel.bootstrap();

// Access via kernel
const errorManager = kernel.getErrorManager();
if (errorManager) {
  // Use error manager
  const result = errorManager.record(error, {
    messageSubsystem: 'my-subsystem'
  });
}
```

The kernel uses `ErrorManagerSubsystem` for:
- Recording errors from various subsystems
- Querying error history
- Generating error summaries
- Monitoring error events

## Usage Patterns

### Recording Errors

```javascript
// Record various error types
const errorManager = kernel.getErrorManager();

// Record Error object
const result1 = errorManager.record(new Error('Database error'), {
  messageSubsystem: 'database',
  type: ERROR_TYPES.EXTERNAL
});

// Record string error
const result2 = errorManager.record('Validation failed', {
  messageSubsystem: 'validator',
  type: ERROR_TYPES.VALIDATION
});

// Record with full context
const result3 = errorManager.record(error, {
  messageSubsystem: 'api',
  path: 'kernel://api/users/create',
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  code: 'VALIDATION_001',
  data: { field: 'email' },
  cause: validationError,
  meta: { userId: 123 }
});
```

### Querying Errors

```javascript
// Query recent errors
const recent = errorManager.queryRecent({ limit: 50 });

// Query by type
const timeouts = errorManager.queryByType(ERROR_TYPES.TIMEOUT, {
  limit: 100
});

// Query with filters
const filtered = errorManager.queryRecent({
  limit: 20,
  type: ERROR_TYPES.TIMEOUT,
  subsystem: 'network'
});
```

### Error Analysis

```javascript
// Get error summary
const summary = errorManager.summary({ limit: 500 });

if (summary.success) {
  const { byType, bySubsystem } = summary.data;
  console.log('Errors by type:', byType);
  console.log('Errors by subsystem:', bySubsystem);
}

// Monitor error count
const currentSize = errorManager.size();
console.log(`Total errors: ${currentSize}`);
```

### Error Event Monitoring

```javascript
// Set up error event listener
const listeners = kernel.find('listeners');
if (listeners) {
  listeners.on('kernel://error/event/recorded', (record) => {
    // Handle error event
    if (record.severity === ERROR_SEVERITY.CRITICAL) {
      console.error('Critical error:', record);
      // Send alert, etc.
    }
  });
}
```

## Error Handling

All public API methods return `Result` objects for consistent error handling:

```javascript
// Check result success
const result = errorManager.record(error, {
  messageSubsystem: 'my-subsystem'
});

if (result.success) {
  // Success: use result.data
  console.log('Error recorded:', result.data);
} else {
  // Failure: use result.type, result.message, result.details
  console.error('Failed to record:', result.type, result.message);
  console.error('Details:', result.details);
}
```

## Result Object Format

### Success Result

```javascript
{
  success: true,
  data: any  // Method-specific data
}
```

### Failure Result

```javascript
{
  success: false,
  type: string,      // Error type (e.g., 'record_error', 'query_error')
  message: string,   // Error message
  details: object    // Additional error details
}
```

## Best Practices

1. **Always Check Results**: Always check `result.success` before using `result.data`
2. **Provide Context**: Include subsystem, path, and metadata when recording errors
3. **Use Appropriate Types**: Use `ERROR_TYPES` constants for type safety
4. **Monitor Events**: Set up listeners for real-time error monitoring
5. **Query Efficiently**: Use appropriate limits and filters when querying
6. **Clear Periodically**: Clear error store when starting new tracking periods
7. **Use Summary**: Use `summary()` for error analysis and reporting

## Configuration

### BoundedErrorStore Capacity

Configure the error store capacity via `config.boundedErrorStore.capacity`:

```javascript
const errorManager = new ErrorManagerSubsystem('error-manager', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 5000 // Store up to 5000 error records
    }
  }
});
```

## See Also

- [Error Record](./ERROR-RECORD.md) - Normalized error record with metadata
- [Bounded Error Store](./BOUNDED-ERROR-STORE.md) - Fixed-capacity in-memory error store
- [useErrorClassifier](../hooks/error-classifier/USE-ERROR-CLASSIFIER.md) - Error classification hook
- [useBoundedErrorStore](../hooks/bounded-error-store/USE-BOUNDED-ERROR-STORE.md) - Bounded error store hook
- [Base Subsystem](../BASE-SUBSYSTEM.md) - Core building block for all subsystems
- [Kernel Subsystem](../message/MESSAGE-SYSTEM.md) - Kernel subsystem that uses ErrorManagerSubsystem





