# useErrorClassifier Hook

## Overview

The `useErrorClassifier` hook provides error classification functionality to subsystems. It installs an `errorClassifier` facet that normalizes arbitrary "error-like" inputs into consistent `ErrorRecord` instances. The hook intelligently infers error types, severity levels, and extracts relevant information from various error formats.

**Key Features:**
- **Error Normalization**: Converts various error formats (Error, string, object, ErrorRecord) into ErrorRecord
- **Type Inference**: Automatically infers error type from error properties or context
- **Severity Inference**: Determines appropriate severity level based on error type
- **Context Merging**: Merges ad-hoc context (subsystem, path, metadata) into error records
- **Flexible Input**: Accepts ErrorRecord, Error, string, or plain object
- **Metadata Extraction**: Extracts message, code, path, data, and cause from errors

## Hook Metadata

```javascript
{
  kind: 'errorClassifier',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'errorClassifier'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing errorClassifier facet
- **`required`**: `[]` - No dependencies (standalone hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.errorClassifier`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook has no configuration options. It works out of the box with sensible defaults.

## Facet Methods

### `classify(errorLike, context)`

Normalize arbitrary inputs into an ErrorRecord.

**Signature:**
```javascript
classify(errorLike, context = {}) => ErrorRecord
```

**Parameters:**
- `errorLike` (any, required) - Any error-like object: ErrorRecord, Error, string, plain object, etc.
- `context` (object, optional) - Extra classification context:
  - `messageSubsystem` (string|null, optional) - Name of the subsystem that originated the message
  - `path` (string|null, optional) - Path associated with the error (e.g. message path)
  - `data` (any, optional) - Payload/data to attach (falls back to errorLike)
  - `cause` (any, optional) - Underlying cause (Error or other value)
  - `meta` (object, optional) - Additional metadata merged into ErrorRecord.metadata
  - `type` (string, optional) - Optional override for error type
  - `severity` (string, optional) - Optional override for severity
  - `code` (string|number, optional) - Optional override for error code

**Returns:** `ErrorRecord` - Normalized error record

**Throws:**
- `TypeError` if subsystem is not provided (via messageSubsystem, meta.subsystem, or errorLike.subsystem)

**Behavior:**
- Fast path: If `errorLike` is already an ErrorRecord, returns it as-is
- If ErrorRecord has a static `from` method, delegates to it
- Otherwise, normalizes the input by extracting type, severity, message, subsystem, etc.
- Merges context information into the error record
- Validates that subsystem is provided

**Example:**
```javascript
// Classify an Error object
const error = new Error('Something went wrong');
const record = subsystem.errorClassifier.classify(error, {
  messageSubsystem: 'my-subsystem',
  path: 'kernel://api/request',
  type: ERROR_TYPES.INTERNAL
});

// Classify a string
const record2 = subsystem.errorClassifier.classify('Validation failed', {
  messageSubsystem: 'validator',
  type: ERROR_TYPES.VALIDATION
});

// Classify a plain object
const record3 = subsystem.errorClassifier.classify({
  message: 'Timeout occurred',
  code: 'TIMEOUT_001',
  subsystem: 'network'
}, {
  type: ERROR_TYPES.TIMEOUT
});
```

## Classification Logic

### Type Inference

The classifier infers error type from:
1. `errorLike.type` (if present)
2. `context.type` (if provided)
3. Falls back to `ERROR_TYPES.SIMPLE` if not found

If the inferred type matches a known `ERROR_TYPES` value, it's used; otherwise, it falls back to `ERROR_TYPES.SIMPLE`.

**Example:**
```javascript
// Type from errorLike
const record1 = classifier.classify({ type: ERROR_TYPES.TIMEOUT }, {
  messageSubsystem: 'network'
});

// Type from context
const record2 = classifier.classify(new Error('Error'), {
  messageSubsystem: 'network',
  type: ERROR_TYPES.TIMEOUT
});

// Default type
const record3 = classifier.classify('Error', {
  messageSubsystem: 'network'
});
// record3.type === ERROR_TYPES.SIMPLE
```

### Severity Inference

The classifier infers severity from:
1. `errorLike.severity` (if present)
2. `context.severity` (if provided)
3. Defaults to `ERROR_SEVERITY.WARN` for `AUTH_FAILED` type
4. Defaults to `ERROR_SEVERITY.ERROR` for all other types

**Example:**
```javascript
// Severity from errorLike
const record1 = classifier.classify({ severity: ERROR_SEVERITY.CRITICAL }, {
  messageSubsystem: 'kernel'
});

// Severity from context
const record2 = classifier.classify(new Error('Error'), {
  messageSubsystem: 'kernel',
  severity: ERROR_SEVERITY.WARN
});

// Default severity (ERROR)
const record3 = classifier.classify('Error', {
  messageSubsystem: 'kernel'
});
// record3.severity === ERROR_SEVERITY.ERROR

// Default severity for AUTH_FAILED (WARN)
const record4 = classifier.classify('Auth failed', {
  messageSubsystem: 'auth',
  type: ERROR_TYPES.AUTH_FAILED
});
// record4.severity === ERROR_SEVERITY.WARN
```

### Message Extraction

The classifier extracts message from:
1. `errorLike.message` (if present)
2. `errorLike.msg` (if present)
3. `errorLike` itself (if it's a string)
4. `String(errorLike)` (as fallback)

**Example:**
```javascript
// Message from Error.message
const record1 = classifier.classify(new Error('Something went wrong'), {
  messageSubsystem: 'my-subsystem'
});

// Message from string
const record2 = classifier.classify('Validation failed', {
  messageSubsystem: 'validator'
});

// Message from object
const record3 = classifier.classify({ message: 'Custom error' }, {
  messageSubsystem: 'my-subsystem'
});
```

### Subsystem Extraction

The classifier extracts subsystem from:
1. `context.messageSubsystem` (if provided)
2. `context.meta.subsystem` (if present)
3. `errorLike.subsystem` (if present)
4. Throws error if none provided

**Example:**
```javascript
// Subsystem from context
const record1 = classifier.classify(new Error('Error'), {
  messageSubsystem: 'my-subsystem'
});

// Subsystem from meta
const record2 = classifier.classify(new Error('Error'), {
  meta: { subsystem: 'my-subsystem' }
});

// Subsystem from errorLike
const record3 = classifier.classify({
  message: 'Error',
  subsystem: 'my-subsystem'
}, {});

// Missing subsystem throws error
try {
  classifier.classify(new Error('Error'), {});
} catch (error) {
  // TypeError: ErrorClassifier.classify: subsystem is required
}
```

### Metadata Merging

The classifier merges metadata from:
1. `errorLike.meta` (if present)
2. `context.meta` (if provided)
3. Extracted fields: `code`, `message`, `path`, `data`, `cause`

**Example:**
```javascript
const record = classifier.classify(new Error('Error'), {
  messageSubsystem: 'my-subsystem',
  path: 'kernel://api/request',
  code: 'ERR_001',
  data: { userId: 123 },
  cause: originalError,
  meta: { custom: 'value' }
});

// record.metadata contains:
// - code: 'ERR_001'
// - message: 'Error'
// - path: 'kernel://api/request'
// - data: { userId: 123 }
// - cause: originalError
// - custom: 'value'
```

## Usage Patterns

### Classifying Errors

```javascript
// Classify JavaScript Error
const error = new Error('Database connection failed');
const record = subsystem.errorClassifier.classify(error, {
  messageSubsystem: 'database',
  type: ERROR_TYPES.EXTERNAL,
  path: 'kernel://database/connect'
});

// Classify string error
const record2 = subsystem.errorClassifier.classify('Validation failed', {
  messageSubsystem: 'validator',
  type: ERROR_TYPES.VALIDATION
});

// Classify object error
const record3 = subsystem.errorClassifier.classify({
  message: 'Timeout occurred',
  code: 'TIMEOUT_001',
  subsystem: 'network'
}, {
  type: ERROR_TYPES.TIMEOUT
});
```

### Classifying with Context

```javascript
// Classify with full context
const record = subsystem.errorClassifier.classify(error, {
  messageSubsystem: 'api',
  path: 'kernel://api/users/create',
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  code: 'VALIDATION_001',
  data: { field: 'email', value: 'invalid' },
  cause: validationError,
  meta: {
    userId: 123,
    requestId: 'req-456'
  }
});
```

### Fast Path for ErrorRecord

```javascript
// If already an ErrorRecord, returns as-is
const existingRecord = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});

const record = subsystem.errorClassifier.classify(existingRecord, {});
console.log(record === existingRecord); // true
```

## Integration with ErrorManagerSubsystem

The `useErrorClassifier` hook is used by `ErrorManagerSubsystem`:

```javascript
// ErrorManagerSubsystem uses errorClassifier
const errorManager = kernel.getErrorManager();

// Record an error (classifier is used internally)
const result = errorManager.record(new Error('Something went wrong'), {
  subsystem: 'my-subsystem',
  type: ERROR_TYPES.INTERNAL
});

// Direct access to classifier
const record = errorManager.errorClassifier.classify(error, {
  messageSubsystem: 'my-subsystem',
  path: 'kernel://error/record',
  type: ERROR_TYPES.SIMPLE
});
```

## Error Handling

### Missing Subsystem

If subsystem is not provided, the classifier throws a TypeError:

```javascript
try {
  subsystem.errorClassifier.classify(new Error('Error'), {});
} catch (error) {
  console.error(error.message);
  // "ErrorClassifier.classify: subsystem is required (provide via messageSubsystem, meta.subsystem, or errorLike.subsystem)"
}
```

**Solution:** Always provide subsystem via one of:
- `context.messageSubsystem`
- `context.meta.subsystem`
- `errorLike.subsystem`

## Best Practices

1. **Always Provide Subsystem**: Always provide subsystem information for proper error tracking
2. **Use Context Overrides**: Use context to override type and severity when you have better information
3. **Include Path**: Include path information for better error traceability
4. **Include Cause**: Include underlying cause for error chaining
5. **Use Constants**: Use `ERROR_TYPES` and `ERROR_SEVERITY` constants for type safety
6. **Merge Metadata**: Use `context.meta` to add custom metadata
7. **Reuse ErrorRecord**: If you already have an ErrorRecord, pass it directly (fast path)

## Classification Examples

### Error Object

```javascript
const error = new Error('Database connection failed');
error.code = 'DB_CONN_001';

const record = classifier.classify(error, {
  messageSubsystem: 'database',
  type: ERROR_TYPES.EXTERNAL,
  path: 'kernel://database/connect'
});
```

### String Error

```javascript
const record = classifier.classify('Validation failed', {
  messageSubsystem: 'validator',
  type: ERROR_TYPES.VALIDATION,
  path: 'kernel://api/validate'
});
```

### Object Error

```javascript
const record = classifier.classify({
  message: 'Timeout occurred',
  code: 'TIMEOUT_001',
  subsystem: 'network',
  type: ERROR_TYPES.TIMEOUT
}, {
  path: 'kernel://network/request'
});
```

### Error with Cause

```javascript
const originalError = new Error('Original error');
const wrapperError = new Error('Wrapper error');
wrapperError.cause = originalError;

const record = classifier.classify(wrapperError, {
  messageSubsystem: 'my-subsystem',
  type: ERROR_TYPES.INTERNAL,
  cause: originalError
});
```

### Error with Full Context

```javascript
const record = classifier.classify(error, {
  messageSubsystem: 'api',
  path: 'kernel://api/users/create',
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  code: 'VALIDATION_001',
  data: {
    field: 'email',
    value: 'invalid-email',
    rules: ['required', 'email-format']
  },
  cause: validationError,
  meta: {
    userId: 123,
    requestId: 'req-456',
    timestamp: Date.now()
  }
});
```

## Type and Severity Defaults

### Type Defaults

- If type is not provided or doesn't match known types: `ERROR_TYPES.SIMPLE`

### Severity Defaults

- `AUTH_FAILED` type: `ERROR_SEVERITY.WARN`
- All other types: `ERROR_SEVERITY.ERROR`

## See Also

- [Error Record](../../errors/ERROR-RECORD.md) - Normalized error record with metadata
- [Error Manager Subsystem](../../errors/ERROR-MANAGER-SUBSYSTEM.md) - Kernel subsystem for error management
- [Bounded Error Store](../../errors/BOUNDED-ERROR-STORE.md) - Fixed-capacity in-memory error store
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects





