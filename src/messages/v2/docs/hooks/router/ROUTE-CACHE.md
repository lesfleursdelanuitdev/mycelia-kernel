# RouteCache Class

## Overview

The `RouteCache` class is a bounded LRU (Least Recently Used) cache for route matches. It caches the results of route matching operations to improve performance by avoiding repeated pattern matching for frequently accessed paths. The cache uses a `Map`'s insertion order to track access order, implementing LRU eviction when the cache reaches capacity.

**Key Features:**
- **LRU Eviction**: Automatically evicts least recently used entries when capacity is reached
- **Access Order Tracking**: Uses Map insertion order to track most/least recently used entries
- **Bounded Capacity**: Fixed maximum capacity to prevent unbounded memory growth
- **Automatic Updates**: Access order is automatically updated on `get()` and `set()` operations
- **Simple Invalidation**: Supports clearing all entries or invalidating by pattern

## Constructor

### `new RouteCache(capacity)`

Create a new `RouteCache` instance.

**Signature:**
```javascript
new RouteCache(capacity = 1000)
```

**Parameters:**
- `capacity` (number, optional, default: `1000`) - Maximum number of cached entries

**Throws:**
- `Error` - If `capacity` is not a positive number

**Initialization:**
- Validates capacity is a positive number
- Creates internal `Map` for cache storage (path → MatchResult)
- Sets cache capacity

**Example:**
```javascript
import { RouteCache } from './route-cache.mycelia.js';

// Create cache with default capacity (1000)
const cache = new RouteCache();

// Create cache with custom capacity
const largeCache = new RouteCache(5000);
```

## Core Methods

### `get(path)`

Get cached match for a path (updates access order).

**Signature:**
```javascript
get(path) => MatchResult | null
```

**Parameters:**
- `path` (string, required) - Path string to look up

**Returns:** `MatchResult | null` - Cached match result or `null` if not found

**Behavior:**
- Returns `null` if path is not in cache
- If path exists in cache:
  - Retrieves the match result
  - Deletes the entry from its current position
  - Re-inserts it at the end (most recently used position)
  - Returns the match result
- This operation updates the access order, making the entry "most recently used"

**Example:**
```javascript
const cache = new RouteCache(100);

// Set a cache entry
const matchResult = { matched: true, params: { id: '123' }, pattern: 'user/{id}' };
cache.set('user/123', matchResult);

// Get cached entry
const cached = cache.get('user/123');
if (cached) {
  console.log('Cache hit!', cached.params); // { id: '123' }
}

// Get non-existent entry
const notFound = cache.get('unknown/path');
console.log(notFound); // null
```

**LRU Behavior:**
```javascript
const cache = new RouteCache(3);

// Add entries
cache.set('path1', result1);
cache.set('path2', result2);
cache.set('path3', result3);
// Cache: [path1, path2, path3]

// Access path1 (moves to end)
cache.get('path1');
// Cache: [path2, path3, path1]

// Add new entry (evicts path2, least recently used)
cache.set('path4', result4);
// Cache: [path3, path1, path4]
```

### `set(path, matchResult)`

Cache a match result for a path (updates access order).

**Signature:**
```javascript
set(path, matchResult) => void
```

**Parameters:**
- `path` (string, required) - Path string to cache
- `matchResult` (MatchResult, required) - Match result to cache

**MatchResult Structure:**
```javascript
{
  matched: true,
  params: Object,        // Extracted route parameters
  pattern: string,       // Matched pattern
  routeEntry: RouteEntry // Route entry with handler
}
```

**Behavior:**
- If path already exists in cache:
  - Removes existing entry
  - Re-inserts at end (most recently used position)
- If path does not exist:
  - If cache is at capacity, removes least recently used entry (first entry)
  - Adds new entry at end (most recently used position)
- This operation ensures the entry is marked as "most recently used"

**Example:**
```javascript
const cache = new RouteCache(100);

// Cache a match result
const matchResult = {
  matched: true,
  params: { id: '123' },
  pattern: 'user/{id}',
  routeEntry: entry
};

cache.set('user/123', matchResult);

// Update existing entry (moves to end)
cache.set('user/123', updatedMatchResult);
```

**Capacity Management:**
```javascript
const cache = new RouteCache(3);

// Fill cache
cache.set('path1', result1);
cache.set('path2', result2);
cache.set('path3', result3);
console.log(cache.size()); // 3

// Add another (evicts path1, least recently used)
cache.set('path4', result4);
console.log(cache.size()); // 3
console.log(cache.get('path1')); // null (evicted)
```

### `clear()`

Clear all cached matches.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Removes all entries from the cache
- Cache size becomes 0
- Capacity remains unchanged

**Example:**
```javascript
const cache = new RouteCache(100);

// Add entries
cache.set('path1', result1);
cache.set('path2', result2);
console.log(cache.size()); // 2

// Clear all
cache.clear();
console.log(cache.size()); // 0
```

### `invalidate(pattern)`

Invalidate cache entries that match a pattern.

**Signature:**
```javascript
invalidate(pattern) => void
```

**Parameters:**
- `pattern` (string, required) - Pattern to invalidate (currently unused, clears all)

**Behavior:**
- Currently clears all cache entries (simple implementation)
- The `pattern` parameter is accepted but not used
- Cache will rebuild as paths are matched
- This is a safe and simple approach - could be enhanced to only remove matching entries

**Note:** The current implementation clears all entries regardless of the pattern. This is safe and simple, and the cache will rebuild as paths are matched.

**Example:**
```javascript
const cache = new RouteCache(100);

// Add entries
cache.set('user/123', result1);
cache.set('user/456', result2);
cache.set('admin/users', result3);

// Invalidate (clears all)
cache.invalidate('user/*');
console.log(cache.size()); // 0
```

### `size()`

Get current cache size.

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Current number of cached entries

**Example:**
```javascript
const cache = new RouteCache(100);

cache.set('path1', result1);
cache.set('path2', result2);
console.log(cache.size()); // 2
```

### `getCapacity()`

Get cache capacity.

**Signature:**
```javascript
getCapacity() => number
```

**Returns:** `number` - Maximum cache capacity

**Example:**
```javascript
const cache = new RouteCache(500);
console.log(cache.getCapacity()); // 500
```

## LRU Cache Behavior

The `RouteCache` implements a Least Recently Used (LRU) eviction policy:

### Access Order

- **Most Recently Used**: Entries at the end of the Map (last inserted/accessed)
- **Least Recently Used**: Entries at the beginning of the Map (first inserted, not accessed recently)

### Eviction Policy

When the cache reaches capacity and a new entry is added:
1. The least recently used entry (first entry in Map) is removed
2. The new entry is added at the end (most recently used position)

### Access Order Updates

- **On `get()`**: Entry is moved from its current position to the end (most recently used)
- **On `set()`**: Entry is placed at the end (most recently used), or moved there if it already exists

### Example - LRU Eviction

```javascript
const cache = new RouteCache(3);

// Add entries
cache.set('a', resultA); // [a]
cache.set('b', resultB); // [a, b]
cache.set('c', resultC); // [a, b, c]

// Access 'a' (moves to end)
cache.get('a'); // [b, c, a]

// Add 'd' (evicts 'b', least recently used)
cache.set('d', resultD); // [c, a, d]

// 'b' is no longer in cache
console.log(cache.get('b')); // null
```

## Usage Patterns

### Basic Caching

```javascript
import { RouteCache } from './route-cache.mycelia.js';

const cache = new RouteCache(1000);

// Cache a match result
const matchResult = {
  matched: true,
  params: { id: '123' },
  pattern: 'user/{id}',
  routeEntry: entry
};

cache.set('user/123', matchResult);

// Retrieve cached result
const cached = cache.get('user/123');
if (cached) {
  // Use cached result
  console.log('Cache hit!', cached.params);
}
```

### Cache Monitoring

```javascript
const cache = new RouteCache(1000);

// Monitor cache usage
console.log(`Cache size: ${cache.size()}/${cache.getCapacity()}`);
console.log(`Utilization: ${(cache.size() / cache.getCapacity() * 100).toFixed(1)}%`);

// Check if cache is full
if (cache.size() >= cache.getCapacity()) {
  console.log('Cache is at capacity');
}
```

### Cache Invalidation

```javascript
const cache = new RouteCache(1000);

// Add entries
cache.set('user/123', result1);
cache.set('user/456', result2);
cache.set('admin/users', result3);

// Invalidate all (e.g., when routes change)
cache.invalidate('*');
console.log(cache.size()); // 0

// Or clear explicitly
cache.clear();
```

## Integration with SubsystemRouter

The `RouteCache` is used internally by `SubsystemRouter` to cache route match results:

```javascript
// In SubsystemRouter.match()
const cached = this.cache.get(path);
if (cached) {
  return cached; // Cache hit - return immediately
}

// ... perform matching ...

if (bestMatch) {
  // Cache the result
  this.cache.set(path, bestMatch);
  return bestMatch;
}
```

**Cache Lifecycle:**
- Created when `SubsystemRouter` is instantiated
- Cleared when new routes are registered (via `router.register()`)
- Invalidated when routes are unregistered (via `router.unregister()`)
- Used automatically during route matching

**Example:**
```javascript
import { SubsystemRouter } from './subsystem-router.mycelia.js';

const router = new SubsystemRouter(subsystem, {
  cacheCapacity: 2000 // Sets RouteCache capacity
});

// First match - cache miss (performs matching)
const match1 = router.match('user/123');
// Cache now contains: { 'user/123': matchResult }

// Second match - cache hit (returns immediately)
const match2 = router.match('user/123');
// Returns cached result, no matching performed

// Register new route - cache cleared
router.register('admin/*', handler);
// Cache is cleared (new route might match previously unmatched paths)
```

## Performance Considerations

### Cache Hit Benefits

- **Avoids Pattern Matching**: Cache hits skip the expensive pattern matching process
- **Faster Lookups**: Map lookups are O(1) average case
- **Reduced CPU Usage**: No regex compilation or pattern testing needed

### Cache Miss Costs

- **Pattern Matching**: Must test all routes against the path
- **Regex Compilation**: Matcher functions use regex patterns
- **Cache Update**: Must update cache access order

### Capacity Tuning

- **Too Small**: Frequent evictions, low hit rate
- **Too Large**: Higher memory usage, diminishing returns
- **Optimal**: Based on unique path count and access patterns

**Recommendations:**
- Set capacity based on expected unique message paths
- Monitor cache hit rate to tune capacity
- Consider typical message path distribution

### Memory Usage

- Each cache entry stores a `MatchResult` object
- Memory usage is roughly: `capacity × (path string size + MatchResult size)`
- MatchResult includes params object and RouteEntry reference

## Best Practices

1. **Set Appropriate Capacity**: Choose capacity based on expected unique paths
2. **Monitor Cache Performance**: Track cache hit rates to optimize capacity
3. **Clear When Routes Change**: Clear cache when routes are added/removed
4. **Don't Modify Cached Results**: Treat cached MatchResult objects as immutable
5. **Use for High-Traffic Paths**: Cache is most beneficial for frequently accessed paths
6. **Consider Path Distribution**: If paths are highly unique, larger cache may be needed

## Thread Safety

The `RouteCache` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## See Also

- [SubsystemRouter](./SUBSYSTEM-ROUTER.md) - Router that uses RouteCache
- [useRouter Hook](./USE-ROUTER.md) - Hook that uses SubsystemRouter
- [RouteEntry](./ROUTE-ENTRY.md) - Route entry representation








