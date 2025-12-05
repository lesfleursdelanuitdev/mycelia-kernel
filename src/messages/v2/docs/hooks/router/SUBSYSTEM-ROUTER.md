# SubsystemRouter Class

## Overview

The `SubsystemRouter` class manages route registration and matching for subsystems. It provides a strict matching system where one pattern equals one handler, and implements longest-pattern-wins logic when multiple routes match a path. The router includes LRU caching for route matches to improve performance.

**Key Features:**
- **Strict Matching**: One pattern per handler (prevents duplicate registrations)
- **Longest-Pattern-Wins**: When multiple routes match, the most specific (longest) pattern wins
- **Route Caching**: LRU cache for route matches to improve performance
- **Pattern Support**: Static paths, parameterized routes (`{param}`), and wildcards (`*`)
- **Route Metadata**: Support for route descriptions, priorities, and custom metadata
- **Debug Support**: Conditional debug logging

## Constructor

### `new SubsystemRouter(subsystem, options)`

Create a new `SubsystemRouter` instance.

**Signature:**
```javascript
new SubsystemRouter(subsystem, options = {})
```

**Parameters:**
- `subsystem` (Object, required) - Subsystem instance
- `options` (Object, optional) - Configuration options:
  - `cacheCapacity` (number, optional, default: `1000`) - Maximum cache size for route matches
  - `debug` (boolean, optional, default: `false`) - Enable debug logging

**Throws:**
- `Error` - If `subsystem` is not provided or not an object

**Initialization:**
- Creates internal `Map` for route storage (pattern → RouteEntry)
- Creates `RouteCache` instance with specified capacity
- Sets debug mode
- Routes are stored with strict matching (one pattern = one handler)

**Example:**
```javascript
import { SubsystemRouter } from './subsystem-router.mycelia.js';

const router = new SubsystemRouter(subsystem, {
  cacheCapacity: 2000,
  debug: true
});
```

## Core Methods

### `register(pattern, handler, metadata)`

Register a route pattern with a handler.

**Signature:**
```javascript
register(pattern, handler, metadata = {}) => RouteEntry
```

**Parameters:**
- `pattern` (string, required) - Route pattern (e.g., `'user/{id}'`, `'posts/*'`)
- `handler` (Function, required) - Handler function: `async (message, params, options) => result`
- `metadata` (Object, optional, default: `{}`) - Route metadata:
  - `description` (string, optional) - Route description
  - `priority` (number, optional) - Route priority
  - Additional custom metadata properties

**Returns:** `RouteEntry` - The created route entry

**Throws:**
- `Error` - If pattern is not a non-empty string
- `Error` - If handler is not a function
- `Error` - If pattern is already registered (strict matching)

**Behavior:**
- Creates a matcher function for the pattern using `_createMatcher()`
- Creates a `RouteEntry` with pattern, handler, matcher, and metadata
- Stores route in internal `Map` (pattern → RouteEntry)
- Clears route cache (new route might match previously unmatched paths)
- Logs debug message if debug is enabled
- Returns the created `RouteEntry`

**Example:**
```javascript
const router = new SubsystemRouter(subsystem);

const entry = router.register('user/{id}', async (message, params, options) => {
  const userId = params.id;
  return { success: true, userId };
}, {
  description: 'User operations',
  priority: 10
});
```

**Example - Duplicate Pattern (Error):**
```javascript
router.register('user/{id}', handler1);

try {
  router.register('user/{id}', handler2); // Throws error
} catch (error) {
  // Error: "SubsystemRouter.register: Route pattern 'user/{id}' is already registered"
}
```

### `unregister(pattern)`

Unregister a route pattern.

**Signature:**
```javascript
unregister(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Pattern to unregister

**Returns:** `boolean` - `true` if route was removed, `false` if not found

**Behavior:**
- Removes route from internal `Map`
- Invalidates cache entries for the pattern (clears entire cache)
- Logs debug message if debug is enabled
- Returns `false` if pattern was not registered

**Example:**
```javascript
// Register route
router.register('user/{id}', handler);

// Later, unregister
const removed = router.unregister('user/{id}');
if (removed) {
  console.log('Route removed');
}
```

### `match(path)`

Match a path against registered routes.

**Signature:**
```javascript
match(path) => MatchResult | null
```

**Parameters:**
- `path` (string, required) - Path to match (e.g., `'user/123'`)

**Returns:** `MatchResult | null` - Match result or `null` if no match

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
- Returns `null` if path is not a string or is empty
- Checks cache first (LRU cache)
- If cached, returns cached result
- If not cached, iterates through all routes
- For each route, calls `entry.match(path)` to test pattern
- Tracks the longest matching pattern (most specific)
- If multiple routes match, returns the one with the longest pattern
- If patterns have the same length, first registered route wins (Map iteration order)
- Caches the result before returning
- Returns `null` if no routes match

**Matching Rules:**
1. **Longest Pattern Wins**: When multiple routes match, the route with the longest pattern wins
2. **First Registered Wins (Tie)**: If patterns have the same length, the first registered route wins
3. **Cache Support**: Route matches are cached (LRU cache) for performance
4. **Strict Matching**: Patterns must match exactly (anchored to start and end)

**Example:**
```javascript
// Register routes
router.register('user/*', handler1);
router.register('user/{id}', handler2);
router.register('user/{id}/profile', handler3);

// Match 'user/123/profile'
const match1 = router.match('user/123/profile');
// Returns: MatchResult with handler3 (longest pattern: 'user/{id}/profile')

// Match 'user/123'
const match2 = router.match('user/123');
// Returns: MatchResult with handler2 (longer than handler1)

// Match 'user/123/settings'
const match3 = router.match('user/123/settings');
// Returns: MatchResult with handler1 (wildcard matches anything)
```

**Example - No Match:**
```javascript
const match = router.match('unknown/path');
if (!match) {
  console.log('No route matches this path');
}
```

### `getRoutes()`

Get all registered routes.

**Signature:**
```javascript
getRoutes() => Array<RouteEntry>
```

**Returns:** `Array<RouteEntry>` - Array of all registered route entries

**Behavior:**
- Returns a new array containing all `RouteEntry` instances
- Order is preserved (Map iteration order = insertion order)

**Example:**
```javascript
const routes = router.getRoutes();
routes.forEach(route => {
  console.log(`Pattern: ${route.pattern}`);
  console.log(`Description: ${route.metadata.description}`);
  console.log(`Priority: ${route.metadata.priority}`);
});
```

### `hasRoute(pattern)`

Check if a pattern is registered.

**Signature:**
```javascript
hasRoute(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Pattern to check

**Returns:** `boolean` - `true` if pattern is registered, `false` otherwise

**Example:**
```javascript
if (router.hasRoute('user/{id}')) {
  console.log('Route is registered');
}
```

### `size()`

Get number of registered routes.

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Number of registered routes

**Example:**
```javascript
const routeCount = router.size();
console.log(`Router has ${routeCount} routes`);
```

### `clear()`

Clear all routes and cache.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Removes all routes from internal `Map`
- Clears route cache
- Logs debug message if debug is enabled

**Example:**
```javascript
// Clear all routes
router.clear();
console.log(`Router now has ${router.size()} routes`); // 0
```

## Route Patterns

The router supports three types of route patterns:

### Static Patterns

Exact path matching.

**Example:**
```javascript
router.register('register/domain', handler);
// Matches: 'register/domain'
// Does not match: 'register/domain/extra', 'register/other'
```

### Parameterized Patterns

Capture path segments as parameters using `{paramName}` syntax.

**Example:**
```javascript
router.register('user/{id}', handler);
// Matches: 'user/123', 'user/abc'
// params: { id: '123' } or { id: 'abc' }
```

**Multiple Parameters:**
```javascript
router.register('{domain}/{action}', handler);
// Matches: 'example.com/register', 'test.com/delete'
// params: { domain: 'example.com', action: 'register' }
```

### Wildcard Patterns

Match any path segment(s) using `*` syntax.

**Example:**
```javascript
router.register('query/*', handler);
// Matches: 'query/get', 'query/get/users', 'query/anything/here'
```

**Note:** Wildcards match any characters, including slashes.

## Pattern Matching Details

### Matcher Function Creation

The router creates a matcher function for each pattern using `_createMatcher()`:

1. **Escape Special Characters**: Escapes regex special characters
2. **Replace Parameters**: Replaces `{paramName}` with capture groups `([^/]+)`
3. **Replace Wildcards**: Replaces `*` with `.*`
4. **Anchor Pattern**: Anchors to start (`^`) and end (`$`) for strict matching
5. **Create Regex**: Compiles pattern into a `RegExp`
6. **Return Matcher**: Returns a function that tests paths against the regex

### Parameter Extraction

When a parameterized pattern matches:
- Parameter names are extracted from the pattern during matcher creation
- Parameter values are extracted from regex capture groups
- Parameters are returned in the `MatchResult.params` object

**Example:**
```javascript
router.register('user/{id}/posts/{postId}', handler);

const match = router.match('user/123/posts/456');
// match.params = { id: '123', postId: '456' }
```

## Internal Methods

### `_createMatcher(pattern)`

Create a matcher function for a pattern (internal method).

**Signature:**
```javascript
_createMatcher(pattern) => Function
```

**Parameters:**
- `pattern` (string, required) - Route pattern

**Returns:** `Function` - Matcher function: `(path: string) => MatchResult | null`

**Behavior:**
- Extracts parameter names from pattern
- Escapes special regex characters
- Replaces `{paramName}` with capture groups
- Replaces `*` with `.*`
- Creates anchored regex pattern
- Returns matcher function that:
  - Tests path against regex
  - Extracts parameters from capture groups
  - Returns `MatchResult` with `matched: true`, `params`, and `pattern`
  - Returns `null` if no match

**Note:** This is an internal method called by `register()`. It should not be called directly.

## Usage Patterns

### Basic Route Registration

```javascript
import { SubsystemRouter } from './subsystem-router.mycelia.js';

const router = new SubsystemRouter(subsystem, {
  cacheCapacity: 1000,
  debug: true
});

// Register routes
router.register('user/{id}', async (message, params, options) => {
  const userId = params.id;
  return { success: true, userId };
});

router.register('admin/*', async (message, params, options) => {
  return { success: true, admin: true };
});
```

### Route Matching

```javascript
// Match a path
const match = router.match('user/123');
if (match) {
  const { routeEntry, params } = match;
  console.log('Matched pattern:', match.pattern);
  console.log('Extracted params:', params);
  
  // Execute handler
  const result = await routeEntry.handler(message, params, options);
}
```

### Route Management

```javascript
// Register routes
router.register('route1', handler1);
router.register('route2', handler2);

// Check if registered
if (router.hasRoute('route1')) {
  console.log('Route1 is registered');
}

// Get all routes
const routes = router.getRoutes();
console.log(`Total routes: ${routes.length}`);

// Unregister route
router.unregister('route1');

// Clear all routes
router.clear();
```

### With Route Metadata

```javascript
router.register('user/{id}', handler, {
  description: 'User operations',
  priority: 10,
  version: '1.0',
  author: 'system'
});

const routes = router.getRoutes();
routes.forEach(route => {
  console.log(`Pattern: ${route.pattern}`);
  console.log(`Description: ${route.metadata.description}`);
  console.log(`Priority: ${route.metadata.priority}`);
});
```

## Error Handling

- **Invalid Pattern**: `register()` throws an error if pattern is not a non-empty string
- **Invalid Handler**: `register()` throws an error if handler is not a function
- **Duplicate Pattern**: `register()` throws an error if pattern is already registered
- **Invalid Subsystem**: Constructor throws an error if subsystem is not provided or not an object
- **No Match**: `match()` returns `null` if no route matches the path (not an error)

## Debug Logging

The router supports debug logging:

```javascript
const router = new SubsystemRouter(subsystem, {
  debug: true
});
```

Debug messages include:
- Route registration: `"SubsystemRouter: Registered route 'pattern'"`
- Route unregistration: `"SubsystemRouter: Unregistered route 'pattern'"`
- Cache clearing: `"SubsystemRouter: Cleared all routes"`

## Integration with useRouter Hook

The `SubsystemRouter` is used internally by the `useRouter` hook:

```javascript
// In useRouter hook
const router = new SubsystemRouter(subsystem, {
  cacheCapacity: config.cacheCapacity || 1000,
  debug
});

// Router is exposed via facet
subsystem.router.registerRoute('pattern', handler);
// Delegates to router.register()
```

## Best Practices

1. **Use Descriptive Patterns**: Choose route patterns that clearly indicate their purpose
2. **Prefer Specific Patterns**: Use parameterized patterns (`{id}`) over wildcards (`*`) when possible
3. **Set Cache Capacity**: Set `cacheCapacity` based on expected unique message paths
4. **Use Route Metadata**: Add descriptions and metadata to routes for documentation
5. **Handle No Match**: Always check for `null` when calling `match()`
6. **Clean Up Routes**: Unregister routes when no longer needed
7. **Avoid Duplicate Patterns**: Use strict matching to prevent accidental duplicates

## Performance Considerations

- **Route Cache**: The LRU cache improves performance for frequently matched paths
- **Pattern Matching**: Parameterized patterns are more efficient than wildcards
- **Cache Capacity**: Set appropriate cache capacity based on unique path count
- **Route Count**: Large numbers of routes may impact matching performance (linear scan)
- **Cache Hit Rate**: Higher cache hit rates improve overall performance

## Thread Safety

The `SubsystemRouter` is not thread-safe. It should only be accessed from a single thread or with proper synchronization if used in a multi-threaded environment.

## See Also

- [useRouter Hook](./USE-ROUTER.md) - Hook that uses SubsystemRouter
- [RouteEntry](./ROUTE-ENTRY.md) - Route entry representation
- [RouteCache](./ROUTE-CACHE.md) - Route cache implementation
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [processMessage](../message-processor/PROCESS-MESSAGE.md) - Message processing utility








