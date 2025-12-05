# Dependency Graph Cache

## Overview

The **DependencyGraphCache** class provides a bounded LRU (Least Recently Used) cache for dependency graph topological sort results. It significantly improves build performance by caching the results of expensive dependency graph computations, allowing repeated builds with the same facet combinations to skip graph building and sorting operations.

**Key Features:**
- **LRU Eviction**: Automatically evicts least recently used entries when at capacity
- **Bounded Size**: Configurable capacity to control memory usage
- **Access Order Tracking**: Updates access order on every get() operation
- **Valid/Invalid Results**: Caches both successful sorts and error results
- **Performance Optimization**: Skips expensive operations for cached facet combinations

## What is DependencyGraphCache?

`DependencyGraphCache` is a specialized cache implementation designed to store the results of dependency graph topological sorting. When building subsystems, the system needs to:

1. Build a dependency graph from hook and facet metadata
2. Perform topological sorting to determine initialization order
3. Handle dependency cycles (invalid graphs)

These operations are expensive, especially for complex subsystems with many facets. The cache stores the results so that subsequent builds with the same facet combination can skip these operations.

**Key Concepts:**
- **Cache Key**: Alphabetically sorted facet kinds string (e.g., `'hierarchy,listeners,processor'`)
- **Cache Value**: Object containing `valid` flag, `orderedKinds` (if valid), or `error` (if invalid)
- **LRU Eviction**: When cache is full, least recently used entries are evicted
- **Access Order**: Every `get()` operation moves the entry to the end (most recently used)

## Creating a DependencyGraphCache

### Constructor

```javascript
new DependencyGraphCache(capacity = 100)
```

**Parameters:**
- `capacity` (number, optional) - Maximum number of cached entries. Defaults to 100.

**Throws:**
- `Error` - If capacity is not a number or is less than 1

**Example:**
```javascript
import { DependencyGraphCache } from './models/subsystem-builder/dependency-graph-cache.mycelia.js';

// Default capacity (100)
const cache = new DependencyGraphCache();

// Custom capacity
const cache = new DependencyGraphCache(200);
```

**Properties:**
- `capacity` (number) - Maximum number of cached entries
- `cache` (Map) - Internal cache storage (key → value)

## Methods

### `get(key)`

Retrieves a cached result for a key and updates its access order (moves to end).

**Signature:**
```javascript
get(key) => { valid: boolean, orderedKinds?: string[], error?: string } | null
```

**Parameters:**
- `key` (string, required) - Cache key (sorted facet kinds string)

**Returns:**
- `{ valid: boolean, orderedKinds?: string[], error?: string } | null` - Cached result or `null` if not found

**Behavior:**
- Returns `null` if key is not in cache
- If key exists, moves entry to end (most recently used) by deleting and re-inserting
- Returns the cached value object

**Example:**
```javascript
const cache = new DependencyGraphCache();
cache.set('hierarchy,listeners,processor', true, ['hierarchy', 'listeners', 'processor']);

const result = cache.get('hierarchy,listeners,processor');
// result = { valid: true, orderedKinds: ['hierarchy', 'listeners', 'processor'] }

const missing = cache.get('non-existent');
// missing = null
```

**Access Order Update:**
The `get()` operation updates the access order, making the retrieved entry the most recently used. This prevents frequently accessed entries from being evicted:

```javascript
const cache = new DependencyGraphCache(3);
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);
cache.set('key3', true, ['c']);

cache.get('key1'); // Moves key1 to end (most recently used)

cache.set('key4', true, ['d']); // Evicts key2 (not key1, which was accessed)
```

### `set(key, valid, orderedKinds, error)`

Stores a cached result for a key.

**Signature:**
```javascript
set(key, valid, orderedKinds = null, error = null) => void
```

**Parameters:**
- `key` (string, required) - Cache key (sorted facet kinds string)
- `valid` (boolean, required) - Whether the result is valid
- `orderedKinds` (string[], optional) - Topologically sorted facet kinds (if valid)
- `error` (string, optional) - Error message (if invalid)

**Behavior:**
- If cache is at capacity and key doesn't exist, evicts least recently used entry
- If key already exists, updates the entry and moves it to end (most recently used)
- Creates value object with `valid` flag and appropriate fields (`orderedKinds` for valid, `error` for invalid)

**Value Structure:**
- **Valid result**: `{ valid: true, orderedKinds: string[] }`
- **Invalid result**: `{ valid: false, error: string }`

**Example:**
```javascript
const cache = new DependencyGraphCache();

// Store valid result
cache.set('hierarchy,listeners,processor', true, ['hierarchy', 'listeners', 'processor']);

// Store invalid result (dependency cycle)
cache.set('a,b,c', false, null, 'Facet dependency cycle detected among: a, b, c');
```

**Eviction Behavior:**
When cache is at capacity and a new key is added (not updating existing), the least recently used entry is evicted:

```javascript
const cache = new DependencyGraphCache(3);
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);
cache.set('key3', true, ['c']);

cache.set('key4', true, ['d']); // Evicts key1 (least recently used)
```

**Update Behavior:**
Updating an existing key does not cause eviction:

```javascript
const cache = new DependencyGraphCache(2);
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);

cache.set('key1', true, ['a', 'b']); // Updates key1, no eviction
// Both key1 and key2 remain
```

### `clear()`

Removes all cached entries.

**Signature:**
```javascript
clear() => void
```

**Behavior:**
- Removes all entries from cache
- Sets size to 0
- Does not affect capacity

**Example:**
```javascript
const cache = new DependencyGraphCache();
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);

cache.clear();
console.log(cache.size()); // 0
```

### `size()`

Returns the current number of cached entries.

**Signature:**
```javascript
size() => number
```

**Returns:**
- `number` - Number of cached entries (0 to capacity)

**Example:**
```javascript
const cache = new DependencyGraphCache();
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);

console.log(cache.size()); // 2
```

## LRU (Least Recently Used) Behavior

The cache implements LRU eviction to ensure that frequently accessed entries remain in cache while less frequently used entries are evicted when capacity is reached.

### How LRU Works

1. **Insertion Order**: Entries are stored in insertion order (Map maintains insertion order)
2. **Access Updates**: Every `get()` operation moves the entry to the end (most recently used)
3. **Eviction**: When at capacity, the first entry (least recently used) is evicted
4. **Update**: Updating an existing entry moves it to the end without eviction

### LRU Example

```javascript
const cache = new DependencyGraphCache(3);

// Add three entries
cache.set('key1', true, ['a']); // [key1]
cache.set('key2', true, ['b']); // [key1, key2]
cache.set('key3', true, ['c']); // [key1, key2, key3]

// Access key1 (moves to end)
cache.get('key1'); // [key2, key3, key1]

// Add key4 (evicts key2, which is least recently used)
cache.set('key4', true, ['d']); // [key3, key1, key4]

// key2 is evicted, key1 remains (was accessed)
```

### Access Order Maintenance

The cache maintains access order through delete-and-reinsert operations:

```javascript
// On get():
const value = cache.get(key);
cache.delete(key);  // Remove from current position
cache.set(key, value); // Re-insert at end (most recent)
```

## Cache Key Format

Cache keys are created from facet kinds by:
1. Sorting facet kinds alphabetically
2. Joining with commas

**Example:**
```javascript
// Facet kinds: ['processor', 'hierarchy', 'listeners']
// Cache key: 'hierarchy,listeners,processor'
```

**Benefits:**
- **Deterministic**: Same set of facets always produces the same key
- **Order-independent**: Facet order doesn't affect the key
- **Simple**: Easy to generate and compare

## Cache Value Structure

### Valid Result

```javascript
{
  valid: true,
  orderedKinds: ['hierarchy', 'listeners', 'processor']
}
```

- `valid` is always `true`
- `orderedKinds` contains the topologically sorted facet kinds
- `error` is not present

### Invalid Result

```javascript
{
  valid: false,
  error: 'Facet dependency cycle detected among: a, b, c'
}
```

- `valid` is always `false`
- `error` contains the error message
- `orderedKinds` is not present

## Integration with Build System

The cache is integrated into the subsystem build process:

### Automatic Creation

`BaseSubsystem.build()` automatically creates a cache if one is not provided:

```javascript
// In BaseSubsystem.build()
let graphCache = ctx.graphCache || this.ctx?.graphCache;

if (!graphCache) {
  const cacheCapacity = ctx.config?.graphCache?.capacity || 100;
  graphCache = new DependencyGraphCache(cacheCapacity);
}
```

### Cache Sharing

The cache can be shared across multiple subsystems:

```javascript
import { DependencyGraphCache } from './models/subsystem-builder/dependency-graph-cache.mycelia.js';

// Create shared cache
const sharedCache = new DependencyGraphCache(200);

// Use in multiple subsystems
await subsystem1.build({ graphCache: sharedCache });
await subsystem2.build({ graphCache: sharedCache });
await subsystem3.build({ graphCache: sharedCache });
```

### Parent-Child Sharing

Child subsystems inherit the parent's cache:

```javascript
// Parent creates cache
await parent.build({ graphCache: new DependencyGraphCache(100) });

// Children inherit via ctx.graphCache
// (set in buildChildren utility)
```

## Usage Examples

### Basic Usage

```javascript
import { DependencyGraphCache } from './models/subsystem-builder/dependency-graph-cache.mycelia.js';

const cache = new DependencyGraphCache(100);

// Store valid result
cache.set('hierarchy,listeners,processor', true, [
  'hierarchy',
  'listeners',
  'processor'
]);

// Retrieve result
const result = cache.get('hierarchy,listeners,processor');
if (result && result.valid) {
  console.log('Ordered kinds:', result.orderedKinds);
}
```

### Storing Invalid Results

```javascript
const cache = new DependencyGraphCache();

// Store invalid result (dependency cycle)
cache.set(
  'a,b,c',
  false,
  null,
  'Facet dependency cycle detected among: a, b, c'
);

// Retrieve invalid result
const result = cache.get('a,b,c');
if (result && !result.valid) {
  console.error('Cached error:', result.error);
}
```

### Capacity Management

```javascript
const cache = new DependencyGraphCache(3);

// Fill cache
cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);
cache.set('key3', true, ['c']);

console.log(cache.size()); // 3

// Add more (evicts key1)
cache.set('key4', true, ['d']);

console.log(cache.size()); // 3 (still at capacity)
console.log(cache.get('key1')); // null (evicted)
```

### Access Order Updates

```javascript
const cache = new DependencyGraphCache(3);

cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);
cache.set('key3', true, ['c']);

// Access key1 (moves to end)
cache.get('key1');

// Add key4 (evicts key2, not key1)
cache.set('key4', true, ['d']);

console.log(cache.get('key1')); // { valid: true, orderedKinds: ['a'] }
console.log(cache.get('key2')); // null (evicted)
```

### Cache Clearing

```javascript
const cache = new DependencyGraphCache();

cache.set('key1', true, ['a']);
cache.set('key2', true, ['b']);

console.log(cache.size()); // 2

cache.clear();

console.log(cache.size()); // 0
console.log(cache.get('key1')); // null
```

## Performance Considerations

### Benefits

1. **Skip Expensive Operations**: Cached facet combinations skip graph building and sorting
2. **Error Caching**: Invalid graphs are cached to avoid repeated failures
3. **Memory Efficient**: Bounded size prevents unbounded memory growth
4. **Fast Lookups**: Map-based storage provides O(1) average case lookups

### Capacity Selection

Choose capacity based on:
- **Number of unique facet combinations**: More combinations require larger cache
- **Memory constraints**: Larger cache uses more memory
- **Access patterns**: Frequently accessed combinations benefit from larger cache

**Recommendations:**
- **Small applications**: 50-100 entries
- **Medium applications**: 100-200 entries
- **Large applications**: 200-500 entries

### Cache Hit Rate

Monitor cache effectiveness:

```javascript
let hits = 0;
let misses = 0;

// Wrap cache.get() to track hits/misses
const originalGet = cache.get.bind(cache);
cache.get = function(key) {
  const result = originalGet(key);
  if (result) hits++;
  else misses++;
  return result;
};

// After builds, check hit rate
const hitRate = hits / (hits + misses);
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
```

## Best Practices

### 1. Share Cache Across Subsystems

```javascript
// Create one cache for all subsystems
const sharedCache = new DependencyGraphCache(200);

await subsystem1.build({ graphCache: sharedCache });
await subsystem2.build({ graphCache: sharedCache });
```

### 2. Configure Capacity

```javascript
// Configure via context
await subsystem.build({
  config: {
    graphCache: {
      capacity: 200
    }
  }
});
```

### 3. Monitor Cache Size

```javascript
const cache = new DependencyGraphCache(100);

// Check size periodically
if (cache.size() >= cache.capacity * 0.9) {
  console.warn('Cache nearly full, consider increasing capacity');
}
```

### 4. Clear When Needed

```javascript
// Clear cache when facet combinations change significantly
cache.clear();
```

### 5. Handle Cache Misses

```javascript
const result = cache.get(key);
if (!result) {
  // Cache miss - will be computed and cached automatically
  // by the build system
}
```

## Error Handling

### Invalid Capacity

```javascript
try {
  const cache = new DependencyGraphCache(0);
} catch (error) {
  console.error(error.message);
  // "DependencyGraphCache: capacity must be a positive number"
}
```

### Missing Keys

```javascript
const cache = new DependencyGraphCache();
const result = cache.get('non-existent');

if (result === null) {
  // Handle cache miss
}
```

## See Also

- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Uses DependencyGraphCache for build optimization
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Details on how the cache is used in the build process
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Automatic cache creation and management

