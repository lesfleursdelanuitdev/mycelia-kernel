# Bounded Error Store

## Overview

The **BoundedErrorStore** class is a fixed-capacity, in-memory error store optimized for appending new error records, querying recent errors with filters, and summarizing error types and severity. It uses `BoundedQueue` internally for capacity management with automatic eviction of oldest records when the capacity is exceeded.

**Key Features:**
- **Fixed Capacity**: Configurable maximum number of error records to retain
- **Automatic Eviction**: Oldest records are automatically evicted when capacity is exceeded
- **ID-Based Lookup**: Fast O(1) lookup by error record ID
- **Flexible Querying**: Filter by type, severity, subsystem, and timestamp
- **Summary Statistics**: Aggregate error counts by type and severity
- **Chronological Ordering**: Maintains insertion order (oldest → newest)
- **Iterable**: Supports iteration over all error records

## Constructor

### Signature

```javascript
new BoundedErrorStore(capacity = 1000)
```

### Parameters

#### `capacity` (number, optional)

Maximum number of error records to retain. Must be a positive number.

**Default:** `1000`

**Throws:**
- `TypeError` if capacity is not a number, not finite, or less than 1

**Example:**
```javascript
import { BoundedErrorStore } from './bounded-error-store.mycelia.js';

// Default capacity (1000)
const store = new BoundedErrorStore();

// Custom capacity
const smallStore = new BoundedErrorStore(100);
const largeStore = new BoundedErrorStore(10000);
```

## Properties

### `size` (getter)

Current number of stored error records.

**Returns:** `number` - Current size

**Example:**
```javascript
const store = new BoundedErrorStore(100);
store.add(record1);
store.add(record2);

console.log(store.size); // 2
```

### `capacity` (getter)

Maximum capacity of the store.

**Returns:** `number` - Maximum capacity

**Example:**
```javascript
const store = new BoundedErrorStore(500);
console.log(store.capacity); // 500
```

### `all` (getter)

Returns an array of all error records (copy). Oldest first, newest last.

**Returns:** `ErrorRecord[]` - Array of all error records

**Note:** For filtered queries, use `list()` instead.

**Example:**
```javascript
const store = new BoundedErrorStore();
store.add(record1);
store.add(record2);
store.add(record3);

const allRecords = store.all;
console.log(allRecords.length); // 3
console.log(allRecords[0]); // Oldest record
console.log(allRecords[2]); // Newest record
```

## Core Operations

### `add(recordOrParams)`

Appends an error record to the store. Accepts either an `ErrorRecord` instance or constructor parameters.

**Signature:**
```javascript
add(recordOrParams) => ErrorRecord
```

**Parameters:**
- `recordOrParams` (ErrorRecord|Object) - ErrorRecord instance or constructor parameters

**Returns:** `ErrorRecord` - The stored ErrorRecord instance

**Behavior:**
- If capacity is exceeded, the oldest record is automatically evicted
- The record is tracked by ID for fast lookup
- Returns the stored ErrorRecord instance

**Throws:**
- `Error` if enqueue fails (shouldn't happen with drop-oldest policy)

**Example:**
```javascript
import { BoundedErrorStore } from './bounded-error-store.mycelia.js';
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from './error-record.mycelia.js';

const store = new BoundedErrorStore(100);

// Add ErrorRecord instance
const record1 = new ErrorRecord({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});
const stored1 = store.add(record1);

// Add using constructor parameters
const stored2 = store.add({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'validator',
  metadata: { field: 'email' }
});

console.log(store.size); // 2
```

### `get(id)`

Retrieves an ErrorRecord by its ID.

**Signature:**
```javascript
get(id) => ErrorRecord|null
```

**Parameters:**
- `id` (string, required) - Error record ID

**Returns:** `ErrorRecord|null` - ErrorRecord instance or null if not found

**Example:**
```javascript
const record = store.add({
  type: ERROR_TYPES.SIMPLE,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'my-subsystem'
});

const retrieved = store.get(record.id);
console.log(retrieved === record); // true

const notFound = store.get('non-existent-id');
console.log(notFound); // null
```

### `clear()`

Clears all stored error records.

**Signature:**
```javascript
clear() => void
```

**Example:**
```javascript
store.add(record1);
store.add(record2);
console.log(store.size); // 2

store.clear();
console.log(store.size); // 0
```

## Querying

### `list(options)`

Lists error records with optional filtering and limit. By default returns all records (oldest → newest).

**Signature:**
```javascript
list(options = {}) => ErrorRecord[]
```

**Parameters:**
- `options` (object, optional) - Filter options
  - `type` (string|string[], optional) - Error type(s) to include
  - `severity` (string|string[], optional) - Severity level(s) to include
  - `subsystem` (string|string[], optional) - Subsystem name(s) to include
  - `since` (Date|string|number, optional) - Only include records at or after this timestamp
  - `limit` (number, optional) - Max number of records to return (from newest backwards)

**Returns:** `ErrorRecord[]` - Matching records, oldest → newest (within the filtered range)

**Example:**
```javascript
// Get all records
const all = store.list();

// Filter by type
const timeouts = store.list({ type: ERROR_TYPES.TIMEOUT });

// Filter by multiple types
const networkErrors = store.list({ 
  type: [ERROR_TYPES.TIMEOUT, ERROR_TYPES.EXTERNAL] 
});

// Filter by severity
const critical = store.list({ severity: ERROR_SEVERITY.CRITICAL });

// Filter by subsystem
const subsystemErrors = store.list({ subsystem: 'network' });

// Filter by multiple subsystems
const multiSubsystem = store.list({ 
  subsystem: ['network', 'database'] 
});

// Filter by timestamp
const recent = store.list({ 
  since: new Date(Date.now() - 3600000) // Last hour
});

// Combined filters
const filtered = store.list({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network',
  since: new Date(Date.now() - 86400000), // Last 24 hours
  limit: 50
});
```

### `recent(limit)`

Convenience method: returns the N most recent error records.

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
const recent = store.recent();

// Get 10 most recent
const recent10 = store.recent(10);

// Get 100 most recent
const recent100 = store.recent(100);
```

## Summary

### `summarize(options)`

Returns a summary of errors, optionally filtered by timestamp.

**Signature:**
```javascript
summarize(options = {}) => Object
```

**Parameters:**
- `options` (object, optional) - Summary options
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
const summary = store.summarize();
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
const recentSummary = store.summarize({
  since: new Date(Date.now() - 3600000) // Last hour
});
```

## Iteration

The store is iterable and supports iteration over all error records in insertion order (oldest → newest).

**Example:**
```javascript
// Iterate over all records
for (const record of store) {
  console.log(record.type, record.severity);
}

// Convert to array
const records = [...store];

// Use with array methods
const criticalErrors = Array.from(store).filter(
  r => r.severity === ERROR_SEVERITY.CRITICAL
);
```

## Capacity Management

### Automatic Eviction

When the store reaches capacity, the oldest records are automatically evicted when new records are added:

```javascript
const store = new BoundedErrorStore(3); // Capacity of 3

store.add(record1); // Size: 1
store.add(record2); // Size: 2
store.add(record3); // Size: 3
store.add(record4); // Size: 3 (record1 evicted)

console.log(store.size); // 3
console.log(store.get(record1.id)); // null (evicted)
console.log(store.get(record4.id)); // record4 (present)
```

### Internal Implementation

The store uses `BoundedQueue` with `'drop-oldest'` policy internally:
- When capacity is exceeded, oldest records are automatically removed
- The `byId` map is automatically cleaned up when records are evicted
- No manual cleanup is required

## Usage Patterns

### Basic Storage and Retrieval

```javascript
import { BoundedErrorStore } from './bounded-error-store.mycelia.js';
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from './error-record.mycelia.js';

const store = new BoundedErrorStore(1000);

// Add error records
const record1 = store.add({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network'
});

const record2 = store.add({
  type: ERROR_TYPES.VALIDATION,
  severity: ERROR_SEVERITY.WARN,
  subsystem: 'validator'
});

// Retrieve by ID
const retrieved = store.get(record1.id);

// Get all records
const all = store.all;
```

### Querying Errors

```javascript
// Get recent errors
const recent = store.recent(50);

// Filter by type
const timeouts = store.list({ type: ERROR_TYPES.TIMEOUT });

// Filter by severity
const critical = store.list({ severity: ERROR_SEVERITY.CRITICAL });

// Filter by subsystem
const networkErrors = store.list({ subsystem: 'network' });

// Combined filters
const filtered = store.list({
  type: ERROR_TYPES.TIMEOUT,
  severity: ERROR_SEVERITY.ERROR,
  subsystem: 'network',
  limit: 20
});
```

### Error Analysis

```javascript
// Get summary statistics
const summary = store.summarize();
console.log(`Total errors: ${summary.total}`);
console.log(`By type:`, summary.byType);
console.log(`By severity:`, summary.bySeverity);

// Analyze recent errors
const recentSummary = store.summarize({
  since: new Date(Date.now() - 3600000) // Last hour
});

// Count errors by subsystem
const bySubsystem = {};
for (const record of store) {
  bySubsystem[record.subsystem] = (bySubsystem[record.subsystem] || 0) + 1;
}
```

### Capacity Management

```javascript
// Monitor store size
console.log(`Store size: ${store.size}/${store.capacity}`);

// Check if approaching capacity
if (store.size / store.capacity > 0.9) {
  console.warn('Store is nearly full');
}

// Clear store when needed
store.clear();
```

## Integration with Error Manager

The `BoundedErrorStore` is used by `ErrorManagerSubsystem` via the `useBoundedErrorStore` hook:

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

## Integration with useBoundedErrorStore Hook

The `useBoundedErrorStore` hook wraps `BoundedErrorStore` and provides it as a facet:

```javascript
// Hook provides BoundedErrorStore as a facet
const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem });
subsystem.use(useBoundedErrorStore);

await subsystem.build();

// Access store via facet
const store = subsystem.boundedErrorStore;

// Use store methods
store.add(record);
const recent = store.recent(50);
const summary = store.summarize();
```

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

## Best Practices

1. **Choose Appropriate Capacity**: Select capacity based on your needs (1000-10000 recommended)
2. **Use Filters**: Use `list()` with filters instead of filtering `all` manually
3. **Monitor Size**: Check `size` vs `capacity` to monitor store usage
4. **Use Recent for Queries**: Use `recent()` for most common queries
5. **Summarize Periodically**: Use `summarize()` for error analysis
6. **Clear When Needed**: Clear store when starting new error tracking periods
7. **Iterate Efficiently**: Use iteration for bulk operations

## Error Handling

### Invalid Capacity

```javascript
try {
  const store = new BoundedErrorStore(0); // Invalid
} catch (error) {
  console.error(error.message);
  // "BoundedErrorStore: capacity must be a positive number"
}
```

### Enqueue Failure

```javascript
// Shouldn't happen with drop-oldest policy, but handle gracefully
try {
  store.add(record);
} catch (error) {
  console.error('Failed to add error record:', error);
}
```

## See Also

- [Error Record](./ERROR-RECORD.md) - Normalized error record with metadata
- [useBoundedErrorStore Hook](../hooks/bounded-error-store/USE-BOUNDED-ERROR-STORE.md) - Bounded error store hook
- [BoundedQueue](../hooks/queue/BOUNDED-QUEUE.md) - Bounded queue implementation
- [Error Manager Subsystem](./ERROR-MANAGER-SUBSYSTEM.md) - Kernel subsystem for error management





