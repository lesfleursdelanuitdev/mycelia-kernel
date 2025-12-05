# Error Record

## Overview

The **ErrorRecord** class represents a normalized error record with metadata in the Mycelia error management system. It provides a consistent structure for error information, including type, severity, subsystem, timestamp, and additional metadata. ErrorRecord instances are used throughout the error management system for recording, storing, querying, and analyzing errors.

**Key Features:**
- **Normalized Structure**: Consistent error representation across the system
- **Type Safety**: Uses constants (`ERROR_TYPES`, `ERROR_SEVERITY`) for type safety
- **Automatic ID Generation**: UUIDs generated automatically if not provided
- **Timestamp Tracking**: Automatic timestamp generation with ISO string conversion
- **Metadata Support**: Flexible metadata object for additional error information
- **Serialization**: `toRecord()` method for converting to plain objects

## Constants

### `ERROR_TYPES`

Constants for error type identifiers. Use these instead of string literals for type safety.

```javascript
ERROR_TYPES = {
  UNROUTABLE: 'unroutable',    // Message had no matching route
  MAX_RETRIES: 'maxretries',  // Message exceeded max retry count
  TIMEOUT: 'timeout',          // Operation took too long
  AUTH_FAILED: 'auth_failed', // Authorization or identity failure
  VALIDATION: 'validation',    // Schema or payload validation error
  INTERNAL: 'internal',        // Internal system or kernel error
  EXTERNAL: 'external',        // External service or transport failure
  SIMPLE: 'simple'             // Generic catch-all error
}
```

**Example:**
```javascript
import { ERROR_TYPES } from './error-record.mycelia.js';

const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});
```

### `ERROR_SEVERITY`

Constants for error severity levels. Use these instead of string literals for type safety.

```javascript
ERROR_SEVERITY = {
  INFO: 'info',       // Informational message
  WARN: 'warn',       // Warning level
  ERROR: 'error',     // Error level
  CRITICAL: 'critical' // Critical error
}
```

**Example:**
```javascript
import { ERROR_SEVERITY } from './error-record.mycelia.js';

const record = new ErrorRecord({
  type: ERROR_TYPES.INTERNAL,
  severity: ERROR_SEVERITY.CRITICAL,
  subsystem: 'my-subsystem'
});
```

## Constructor

### Signature

```javascript
new ErrorRecord(params = {})
```

### Parameters

#### `params` (object, optional)

Error record parameters.

**Properties:**
- `id` (string, optional) - Unique identifier (auto-generated UUID if not provided)
- `type` (string, required) - Error type (should use `ERROR_TYPES` constants)
- `severity` (string, required) - Error severity level (should use `ERROR_SEVERITY` constants)
- `subsystem` (string, required) - Subsystem name where error occurred
- `timestamp` (Date, optional) - Error timestamp (defaults to current date/time)
- `metadata` (object, optional) - Additional error metadata (defaults to `{}`)

**Throws:**
- `TypeError` if `type` is missing or not a non-empty string
- `TypeError` if `severity` is missing or not a non-empty string
- `TypeError` if `subsystem` is missing or not a non-empty string

**Example:**
```javascript
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from './error-record.mycelia.js';

// Minimal required fields
const record = new ErrorRecord({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});

// With all fields
const record2 = new ErrorRecord({
  id: 'custom-id-123',
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'network-subsystem',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  metadata: {
    message: 'Request timed out',
    path: 'kernel://api/request',
    code: 'TIMEOUT_001',
    cause: errorObject
  }
});
```

## Properties

### `id` (string)

Unique identifier for the error record. Auto-generated UUID if not provided.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});

console.log(record.id); // '550e8400-e29b-41d4-a716-446655440000' (example UUID)
```

### `type` (string)

Error type identifier. Should use `ERROR_TYPES` constants.

```javascript
console.log(record.type); // 'timeout', 'internal', 'validation', etc.
```

### `severity` (string)

Error severity level. Should use `ERROR_SEVERITY` constants.

```javascript
console.log(record.severity); // 'info', 'warn', 'error', 'critical'
```

### `subsystem` (string)

Subsystem name where the error occurred.

```javascript
console.log(record.subsystem); // 'my-subsystem'
```

### `timestamp` (Date)

Error timestamp. Defaults to current date/time if not provided.

```javascript
console.log(record.timestamp); // Date object
console.log(record.timestamp.toISOString()); // '2024-01-01T12:00:00.000Z'
```

### `metadata` (object)

Additional error metadata. Can contain any additional information about the error.

```javascript
console.log(record.metadata); // { message: '...', path: '...', code: '...' }
```

## Methods

### `toRecord()`

Convert error record to a plain object for serialization.

**Signature:**
```javascript
toRecord() => Object
```

**Returns:** `Object` - Plain object representation:
```javascript
{
  id: string,              // UUID string
  type: string,            // Error type
  severity: string,        // Error severity
  subsystem: string,       // Subsystem name
  timestamp: string,       // ISO 8601 timestamp string
  metadata: object         // Metadata object
}
```

**Example:**
```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem',
  metadata: { message: 'Request timed out' }
});

const plain = record.toRecord();
console.log(plain);
// {
//   id: '550e8400-e29b-41d4-a716-446655440000',
//   type: 'timeout',
//   severity: 'error',
//   subsystem: 'my-subsystem',
//   timestamp: '2024-01-01T12:00:00.000Z',
//   metadata: { message: 'Request timed out' }
// }

// Serialize to JSON
const json = JSON.stringify(plain);
```

## Error Types

### `UNROUTABLE`

Message had no matching route.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.UNROUTABLE,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'router',
  metadata: {
    path: 'kernel://unknown/path',
    message: 'No route found for message path'
  }
});
```

### `MAX_RETRIES`

Message exceeded max retry count.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.MAX_RETRIES,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'processor',
  metadata: {
    messageId: 'msg-123',
    retryCount: 5,
    maxRetries: 3
  }
});
```

### `TIMEOUT`

Operation took too long.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'network',
  metadata: {
    operation: 'http-request',
    timeout: 5000,
    elapsed: 5200
  }
});
```

### `AUTH_FAILED`

Authorization or identity failure.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.AUTH_FAILED,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'auth',
  metadata: {
    principal: 'user-123',
    reason: 'Invalid credentials'
  }
});
```

### `VALIDATION`

Schema or payload validation error.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'validator',
  metadata: {
    field: 'email',
    message: 'Invalid email format',
    value: 'invalid-email'
  }
});
```

### `INTERNAL`

Internal system or kernel error.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.INTERNAL,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'kernel',
  metadata: {
    message: 'Unexpected internal error',
    stack: error.stack
  }
});
```

### `EXTERNAL`

External service or transport failure.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.EXTERNAL,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'external-api',
  metadata: {
    service: 'payment-gateway',
    statusCode: 503,
    message: 'Service unavailable'
  }
});
```

### `SIMPLE`

Generic catch-all error.

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem',
  metadata: {
    message: 'An error occurred'
  }
});
```

## Error Severity Levels

### `INFO`

Informational message (not an error).

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.INFO,
  subsystem: 'my-subsystem',
  metadata: { message: 'Operation completed successfully' }
});
```

### `WARN`

Warning level (potential issue).

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'network',
  metadata: { message: 'Request took longer than expected' }
});
```

### `ERROR`

Error level (actual error).

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'validator',
  metadata: { message: 'Validation failed' }
});
```

### `CRITICAL`

Critical error (system-threatening).

```javascript
const record = new ErrorRecord({
  type: ERROR_TYPES.INTERNAL,
  severity: ERROR_SEVERITY.CRITICAL,
  subsystem: 'kernel',
  metadata: { message: 'System failure' }
});
```

## Usage Patterns

### Creating Error Records

```javascript
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from './error-record.mycelia.js';

// Basic error record
const record = new ErrorRecord({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});

// Error record with metadata
const detailedRecord = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'network',
  metadata: {
    message: 'Request timed out',
    path: 'kernel://api/request',
    code: 'TIMEOUT_001',
    elapsed: 5200,
    timeout: 5000
  }
});
```

### Serialization

```javascript
// Convert to plain object
const plain = record.toRecord();

// Serialize to JSON
const json = JSON.stringify(plain);

// Store in database or send over network
await database.save(plain);
```

### Integration with Error Manager

```javascript
// ErrorManagerSubsystem uses ErrorRecord
const errorManager = kernel.getErrorManager();

// Record an error (ErrorRecord is created automatically)
const result = errorManager.record(new Error('Something went wrong'), {
  subsystem: 'my-subsystem',
  type: ERROR_TYPES.INTERNAL
});

// Query errors (returns ErrorRecord instances)
const recent = errorManager.queryRecent({ limit: 10 });
recent.data.errors.forEach(error => {
  console.log(error.type); // Error type
  console.log(error.severity); // Error severity
  console.log(error.subsystem); // Subsystem name
});
```

### Integration with Error Classifier

```javascript
// ErrorClassifier normalizes errors into ErrorRecord
const classifier = subsystem.errorClassifier;

// Classify various error types
const record1 = classifier.classify(new Error('Error message'), {
  subsystem: 'my-subsystem',
  type: ERROR_TYPES.INTERNAL
});

const record2 = classifier.classify('String error', {
  subsystem: 'my-subsystem',
  type: ERROR_TYPES.SIMPLE
});

const record3 = classifier.classify({ message: 'Error' }, {
  subsystem: 'my-subsystem',
  type: ERROR_TYPES.VALIDATION
});
```

### Integration with Bounded Error Store

```javascript
// BoundedErrorStore stores ErrorRecord instances
const store = subsystem.boundedErrorStore;

// Add error record
const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});
store.add(record);

// Query error records
const recent = store.recent(10); // Array of ErrorRecord instances
const byId = store.getById(record.id); // ErrorRecord or null
```

## Metadata Guidelines

The `metadata` field is flexible and can contain any additional information. Common patterns:

### Standard Fields

```javascript
{
  message: string,        // Human-readable error message
  code: string,          // Error code
  path: string,          // Message path or route
  cause: Error,          // Underlying error
  data: object,          // Additional data
  stack: string          // Stack trace
}
```

### Custom Fields

```javascript
{
  userId: string,        // User ID
  requestId: string,    // Request ID
  operation: string,    // Operation name
  duration: number,     // Duration in ms
  retryCount: number,   // Retry count
  // ... any custom fields
}
```

## Best Practices

1. **Use Constants**: Always use `ERROR_TYPES` and `ERROR_SEVERITY` constants instead of string literals
2. **Provide Subsystem**: Always provide the subsystem name for proper error tracking
3. **Include Metadata**: Add relevant metadata for debugging and analysis
4. **Choose Appropriate Severity**: Use appropriate severity levels (INFO, WARN, ERROR, CRITICAL)
5. **Use Appropriate Types**: Choose the most specific error type available
6. **Serialize for Storage**: Use `toRecord()` when storing or transmitting error records
7. **Include Context**: Add context information in metadata (message, path, cause, etc.)

## Error Handling

### Validation Errors

```javascript
try {
  const record = new ErrorRecord({
    type: '', // Invalid: empty string
    severity: ERROR_SEVERITY.ERROR,
    subsystem: 'my-subsystem'
  });
} catch (error) {
  console.error(error.message);
  // "ErrorRecord: type must be a non-empty string"
}
```

### Missing Required Fields

```javascript
try {
  const record = new ErrorRecord({
    // Missing type, severity, subsystem
  });
} catch (error) {
  console.error(error.message);
  // "ErrorRecord: type must be a non-empty string"
}
```

## See Also

- [Error Manager Subsystem](../errors/ERROR-MANAGER-SUBSYSTEM.md) - Kernel subsystem for error management
- [Error Classifier Hook](../hooks/error-classifier/USE-ERROR-CLASSIFIER.md) - Error classification hook
- [Bounded Error Store Hook](../hooks/bounded-error-store/USE-BOUNDED-ERROR-STORE.md) - Error storage hook
- [Security Utilities](../security/README.md) - UUID generation utilities





