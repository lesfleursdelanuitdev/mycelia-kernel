# useBoundedErrorStore Hook

## Overview

The `useBoundedErrorStore` hook provides bounded error store functionality to subsystems. It wraps `BoundedErrorStore` and exposes error storage and querying methods as a facet. The hook provides a fixed-capacity, in-memory error store optimized for appending new error records, querying recent errors with filters, and summarizing error types and severity.

**Key Features:**
- **Fixed Capacity Storage**: Configurable maximum number of error records to retain
- **Automatic Eviction**: Oldest records are automatically evicted when capacity is exceeded
- **ID-Based Lookup**: Fast O(1) lookup by error record ID
- **Flexible Querying**: Filter by type, severity, subsystem, and timestamp
- **Summary Statistics**: Aggregate error counts by type and severity
- **Chronological Ordering**: Maintains insertion order (oldest → newest)
- **Iterable Access**: Access all records via `all` getter

## Hook Metadata

```javascript
{
  kind: 'boundedErrorStore',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'boundedErrorStore'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing boundedErrorStore facet
- **`required`**: `[]` - No dependencies (standalone hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.boundedErrorStore`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.boundedErrorStore`:

```javascript
{
  capacity: number
}
```

### Configuration Options

- **`capacity`** (number, optional): Maximum number of error records to retain. Defaults to `1000` if not specified.

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 5000 // Store up to 5000 error records
    }
  }
});

subsystem.use(useBoundedErrorStore);
await subsystem.build();

// Access store
const store = subsystem.boundedErrorStore;
console.log(store.capacity); // 5000
```

## Facet Methods

### `add(recordOrParams)`

Add an error record to the store.

**Signature:**
```javascript
add(recordOrParams) => ErrorRecord
```

**Parameters:**
- `recordOrParams` (ErrorRecord|Object, required) - ErrorRecord instance or constructor parameters

**Returns:** `ErrorRecord` - The stored ErrorRecord instance

**Behavior:**
- Accepts either an ErrorRecord instance or constructor parameters
- If capacity is exceeded, the oldest record is automatically evicted
- The record is tracked by ID for fast lookup
- Returns the stored ErrorRecord instance

**Example:**
```javascript
// Add ErrorRecord instance
const record = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});
const stored = subsystem.boundedErrorStore.add(record);

// Add using constructor parameters
const stored2 = subsystem.boundedErrorStore.add({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'validator',
  metadata: { field: 'email' }
});
```

### `get(id)`

Get an error record by ID.

**Signature:**
```javascript
get(id) => ErrorRecord|null
```

**Parameters:**
- `id` (string, required) - Error record ID

**Returns:** `ErrorRecord|null` - Error record or null if not found

**Example:**
```javascript
const record = subsystem.boundedErrorStore.add({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});

const retrieved = subsystem.boundedErrorStore.get(record.id);
console.log(retrieved === record); // true

const notFound = subsystem.boundedErrorStore.get('non-existent-id');
console.log(notFound); // null
```

### `list(options)`

List error records with optional filtering.

**Signature:**
```javascript
list(options = {}) => ErrorRecord[]
```

**Parameters:**
- `options` (object, optional) - Filter options:
  - `type` (string|string[], optional) - Error type(s) to include
  - `severity` (string|string[], optional) - Severity level(s) to include
  - `subsystem` (string|string[], optional) - Subsystem name(s) to include
  - `since` (Date|string|number, optional) - Only include records at or after this timestamp
  - `limit` (number, optional) - Max number of records to return (from newest backwards)

**Returns:** `ErrorRecord[]` - Matching records, oldest → newest

**Example:**
```javascript
// Get all records
const all = subsystem.boundedErrorStore.list();

// Filter by type
const timeouts = subsystem.boundedErrorStore.list({ 
  type: ERROR_TYPES.TIMEOUT 
});

// Filter by multiple types
const networkErrors = subsystem.boundedErrorStore.list({ 
  type: [ERROR_TYPES.TIMEOUT, ERROR_TYPES.EXTERNAL] 
});

// Filter by severity
const critical = subsystem.boundedErrorStore.list({ 
  severity: ERROR_SEVERITY.CRITICAL 
});

// Filter by subsystem
const subsystemErrors = subsystem.boundedErrorStore.list({ 
  subsystem: 'network' 
});

// Filter by timestamp
const recent = subsystem.boundedErrorStore.list({ 
  since: new Date(Date.now() - 3600000) // Last hour
});

// Combined filters
const filtered = subsystem.boundedErrorStore.list({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network',
  since: new Date(Date.now() - 86400000), // Last 24 hours
  limit: 50
});
```

### `recent(limit)`

Get the N most recent error records.

**Signature:**
```javascript
recent(limit = 50) => ErrorRecord[]
```

**Parameters:**
- `limit` (number, optional) - Maximum number of records to return

**Returns:** `ErrorRecord[]` - Recent records, oldest → newest

**Example:**
```javascript
// Get 50 most recent (default)
const recent = subsystem.boundedErrorStore.recent();

// Get 10 most recent
const recent10 = subsystem.boundedErrorStore.recent(10);

// Get 100 most recent
const recent100 = subsystem.boundedErrorStore.recent(100);
```

### `summarize(options)`

Get a summary of errors.

**Signature:**
```javascript
summarize(options = {}) => Object
```

**Parameters:**
- `options` (object, optional) - Summary options:
  - `since` (Date|string|number, optional) - Only summarize errors at or after this timestamp

**Returns:** `Object` - Summary object:
```javascript
{
  total: number,                    // Total number of errors
  byType: { [type]: number },       // Count by error type
  bySeverity: { [severity]: number }, // Count by severity level
  firstTimestamp: string|null,      // ISO string of first error timestamp
  lastTimestamp: string|null        // ISO string of last error timestamp
}
```

**Example:**
```javascript
// Get summary of all errors
const summary = subsystem.boundedErrorStore.summarize();
console.log(summary);
// {
//   total: 150,
//   byType: {
//     timeout: 50,
//     validation: 30,
//     internal: 70
//   },
//   bySeverity: {
//     error: 100,
//     warn: 40,
//     critical: 10
//   },
//   firstTimestamp: '2024-01-01T00:00:00.000Z',
//   lastTimestamp: '2024-01-01T12:00:00.000Z'
// }

// Get summary since a specific time
const recentSummary = subsystem.boundedErrorStore.summarize({
  since: new Date(Date.now() - 3600000) // Last hour
});
```

### `clear()`

Clear all error records.

**Signature:**
```javascript
clear() => void
```

**Example:**
```javascript
subsystem.boundedErrorStore.add(record1);
subsystem.boundedErrorStore.add(record2);
console.log(subsystem.boundedErrorStore.size); // 2

subsystem.boundedErrorStore.clear();
console.log(subsystem.boundedErrorStore.size); // 0
```

## Facet Properties

### `size` (getter)

Get current store size.

**Returns:** `number` - Number of stored error records

**Example:**
```javascript
subsystem.boundedErrorStore.add(record1);
subsystem.boundedErrorStore.add(record2);

console.log(subsystem.boundedErrorStore.size); // 2
```

### `capacity` (getter)

Get store capacity.

**Returns:** `number` - Maximum capacity of the store

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 5000
    }
  }
});

subsystem.use(useBoundedErrorStore);
await subsystem.build();

console.log(subsystem.boundedErrorStore.capacity); // 5000
```

### `all` (getter)

Get all error records (copy).

**Returns:** `ErrorRecord[]` - All records, oldest → newest

**Note:** For filtered queries, use `list()` instead.

**Example:**
```javascript
subsystem.boundedErrorStore.add(record1);
subsystem.boundedErrorStore.add(record2);
subsystem.boundedErrorStore.add(record3);

const allRecords = subsystem.boundedErrorStore.all;
console.log(allRecords.length); // 3
console.log(allRecords[0]); // Oldest record
console.log(allRecords[2]); // Newest record
```

## Usage Patterns

### Basic Storage and Retrieval

```javascript
import { useBoundedErrorStore } from './hooks/bounded-error-store/use-bounded-error-store.mycelia.js';
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from './models/kernel-subsystem/error-manager-subsystem/error-record.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem });
subsystem.use(useBoundedErrorStore);
await subsystem.build();

// Add error records
const record1 = subsystem.boundedErrorStore.add({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});

const record2 = subsystem.boundedErrorStore.add({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'validator'
});

// Retrieve by ID
const retrieved = subsystem.boundedErrorStore.get(record1.id);

// Get all records
const all = subsystem.boundedErrorStore.all;
```

### Querying Errors

```javascript
// Get recent errors
const recent = subsystem.boundedErrorStore.recent(50);

// Filter by type
const timeouts = subsystem.boundedErrorStore.list({ 
  type: ERROR_TYPES.TIMEOUT 
});

// Filter by severity
const critical = subsystem.boundedErrorStore.list({ 
  severity: ERROR_SEVERITY.CRITICAL 
});

// Filter by subsystem
const networkErrors = subsystem.boundedErrorStore.list({ 
  subsystem: 'network' 
});

// Combined filters
const filtered = subsystem.boundedErrorStore.list({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network',
  limit: 20
});
```

### Error Analysis

```javascript
// Get summary statistics
const summary = subsystem.boundedErrorStore.summarize();
console.log(`Total errors: ${summary.total}`);
console.log(`By type:`, summary.byType);
console.log(`By severity:`, summary.bySeverity);

// Analyze recent errors
const recentSummary = subsystem.boundedErrorStore.summarize({
  since: new Date(Date.now() - 3600000) // Last hour
});

// Count errors by subsystem
const bySubsystem = {};
for (const record of subsystem.boundedErrorStore.all) {
  bySubsystem[record.subsystem] = (bySubsystem[record.subsystem] || 0) + 1;
}
```

### Capacity Management

```javascript
// Monitor store size
console.log(`Store size: ${subsystem.boundedErrorStore.size}/${subsystem.boundedErrorStore.capacity}`);

// Check if approaching capacity
if (subsystem.boundedErrorStore.size / subsystem.boundedErrorStore.capacity > 0.9) {
  console.warn('Store is nearly full');
}

// Clear store when needed
subsystem.boundedErrorStore.clear();
```

## Integration with ErrorManagerSubsystem

The `useBoundedErrorStore` hook is used by `ErrorManagerSubsystem`:

```javascript
// ErrorManagerSubsystem uses BoundedErrorStore
const errorManager = kernel.getErrorManager();

// Store is accessed via the hook
const store = errorManager.boundedErrorStore;

// Add error (via ErrorManager)
const result = errorManager.record(new Error('Something went wrong'), {
  subsystem: 'my-subsystem'
});

// Query errors (via ErrorManager)
const recent = errorManager.queryRecent({ limit: 10 });

// Direct access to store
const allErrors = errorManager.store.all;
const summary = errorManager.store.summarize();
```

## Internal Store Access

The hook exposes the underlying `BoundedErrorStore` instance via `_store` for internal use by other hooks:

```javascript
// Access underlying store (for advanced use cases)
const store = subsystem.boundedErrorStore._store;

// Direct access to BoundedErrorStore methods
const all = store.all;
const summary = store.summarize();
```

**Note:** Prefer using the facet methods (`subsystem.boundedErrorStore.add()`, etc.) over direct store access for better abstraction.

## Capacity Configuration

### Default Capacity

If not specified, the store uses a default capacity of 1000:

```javascript
const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem });
subsystem.use(useBoundedErrorStore);
await subsystem.build();

console.log(subsystem.boundedErrorStore.capacity); // 1000
```

### Custom Capacity

Configure capacity via `ctx.config.boundedErrorStore.capacity`:

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 5000 // Store up to 5000 error records
    }
  }
});

subsystem.use(useBoundedErrorStore);
await subsystem.build();

console.log(subsystem.boundedErrorStore.capacity); // 5000
```

## Automatic Eviction

When the store reaches capacity, the oldest records are automatically evicted when new records are added:

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    boundedErrorStore: {
      capacity: 3 // Small capacity for demonstration
    }
  }
});

subsystem.use(useBoundedErrorStore);
await subsystem.build();

const store = subsystem.boundedErrorStore;

store.add(record1); // Size: 1
store.add(record2); // Size: 2
store.add(record3); // Size: 3
store.add(record4); // Size: 3 (record1 evicted)

console.log(store.size); // 3
console.log(store.get(record1.id)); // null (evicted)
console.log(store.get(record4.id)); // record4 (present)
```

## Best Practices

1. **Choose Appropriate Capacity**: Select capacity based on your needs (1000-10000 recommended)
2. **Use Filters**: Use `list()` with filters instead of filtering `all` manually
3. **Monitor Size**: Check `size` vs `capacity` to monitor store usage
4. **Use Recent for Queries**: Use `recent()` for most common queries
5. **Summarize Periodically**: Use `summarize()` for error analysis
6. **Clear When Needed**: Clear store when starting new error tracking periods
7. **Iterate Efficiently**: Use `all` getter for bulk operations

## Performance Considerations

### Capacity Selection

- **Too Small**: Frequent eviction, loss of historical data
- **Too Large**: High memory usage, slower queries
- **Recommended**: 1000-10000 for most use cases

### Query Performance

- **ID Lookup**: O(1) via Map
- **List with Filters**: O(n) where n is the number of records
- **Summary**: O(n) where n is the number of records
- **Recent**: O(n) where n is the number of records (but limited by capacity)

### Memory Usage

- Each ErrorRecord stores: id, type, severity, subsystem, timestamp, metadata
- Memory usage is bounded by capacity
- Oldest records are automatically evicted

## See Also

- [Bounded Error Store](../../errors/BOUNDED-ERROR-STORE.md) - Fixed-capacity in-memory error store implementation
- [Error Record](../../errors/ERROR-RECORD.md) - Normalized error record with metadata
- [useErrorClassifier](./../error-classifier/USE-ERROR-CLASSIFIER.md) - Error classification hook
- [Error Manager Subsystem](../../errors/ERROR-MANAGER-SUBSYSTEM.md) - Kernel subsystem for error management
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects





