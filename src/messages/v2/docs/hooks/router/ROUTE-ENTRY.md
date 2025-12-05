# RouteEntry Class

## Overview

The `RouteEntry` class represents a single route with its pattern, handler function, matcher function, and metadata. It encapsulates all the information needed to match a path against a route pattern and execute the corresponding handler. `RouteEntry` instances are created internally by `SubsystemRouter` when routes are registered.

**Key Features:**
- **Route Representation**: Encapsulates pattern, handler, matcher, and metadata in a single object
- **Path Matching**: Provides `match()` method to test if a path matches the route pattern
- **Metadata Support**: Stores route metadata (description, priority, custom properties)
- **Immutable Structure**: Once created, the entry properties are fixed (though metadata can be modified)

## Constructor

### `new RouteEntry(pattern, handler, matcher, metadata)`

Create a new `RouteEntry` instance.

**Signature:**
```javascript
new RouteEntry(pattern, handler, matcher, metadata = {})
```

**Parameters:**
- `pattern` (string, required) - Route pattern (e.g., `'user/{id}'`, `'posts/*'`)
- `handler` (Function, required) - Handler function: `async (message, params, options) => result`
- `matcher` (Function, required) - Matcher function: `(path: string) => MatchResult | null`
- `metadata` (Object, optional, default: `{}`) - Route metadata:
  - `description` (string, optional) - Route description
  - `priority` (number, optional) - Route priority
  - Additional custom metadata properties

**Throws:**
- `Error` - If `pattern` is not a non-empty string
- `Error` - If `handler` is not a function
- `Error` - If `matcher` is not a function

**Initialization:**
- Validates all parameters
- Stores pattern, handler, matcher, and metadata as instance properties
- Properties are accessible but should not be modified after creation

**Example:**
```javascript
import { RouteEntry } from './route-entry.mycelia.js';

// Create a matcher function (typically done by SubsystemRouter._createMatcher)
const matcher = (path) => {
  const match = path.match(/^user\/([^/]+)$/);
  if (!match) return null;
  return {
    matched: true,
    params: { id: match[1] },
    pattern: 'user/{id}'
  };
};

// Create route entry
const entry = new RouteEntry(
  'user/{id}',
  async (message, params, options) => {
    return { success: true, userId: params.id };
  },
  matcher,
  {
    description: 'User operations',
    priority: 10
  }
);
```

**Note:** `RouteEntry` instances are typically created by `SubsystemRouter.register()`. You rarely need to create them directly.

## Properties

### `pattern`

Route pattern string.

**Type:** `string`

**Description:** The route pattern (e.g., `'user/{id}'`, `'posts/*'`, `'register/domain'`)

**Example:**
```javascript
const entry = router.register('user/{id}', handler);
console.log(entry.pattern); // 'user/{id}'
```

### `handler`

Handler function for this route.

**Type:** `Function`

**Signature:** `async (message, params, options) => result`

**Description:** The handler function that processes messages matching this route pattern.

**Example:**
```javascript
const entry = router.register('user/{id}', handler);
// entry.handler is the handler function
const result = await entry.handler(message, { id: '123' }, {});
```

### `matcher`

Matcher function for this route.

**Type:** `Function`

**Signature:** `(path: string) => MatchResult | null`

**Description:** The matcher function that tests if a path matches this route pattern. Returns a `MatchResult` object if matched, or `null` if not matched.

**MatchResult Structure:**
```javascript
{
  matched: true,
  params: Object,  // Extracted route parameters
  pattern: string  // The route pattern
}
```

**Example:**
```javascript
const entry = router.register('user/{id}', handler);
const matchResult = entry.matcher('user/123');
// matchResult: { matched: true, params: { id: '123' }, pattern: 'user/{id}' }
```

**Note:** The matcher function is created by `SubsystemRouter._createMatcher()` and should not be called directly. Use `entry.match()` instead.

### `metadata`

Route metadata object.

**Type:** `Object`

**Description:** Contains route metadata such as description, priority, and custom properties.

**Common Properties:**
- `description` (string, optional) - Human-readable description of the route
- `priority` (number, optional) - Route priority (used for documentation, not matching)
- Custom properties can be added as needed

**Example:**
```javascript
const entry = router.register('user/{id}', handler, {
  description: 'User operations',
  priority: 10,
  version: '1.0',
  author: 'system'
});

console.log(entry.metadata.description); // 'User operations'
console.log(entry.metadata.priority);     // 10
console.log(entry.metadata.version);      // '1.0'
```

## Core Methods

### `match(path)`

Match a path against this route's pattern.

**Signature:**
```javascript
match(path) => MatchResult | null
```

**Parameters:**
- `path` (string, required) - Path to match (e.g., `'user/123'`)

**Returns:** `MatchResult | null` - Match result with params, or `null` if no match

**MatchResult Structure:**
```javascript
{
  matched: true,
  params: Object,  // Extracted route parameters (empty object for static/wildcard routes)
  pattern: string  // The route pattern
}
```

**Behavior:**
- Delegates to the `matcher` function
- Returns `null` if path does not match the pattern
- Returns `MatchResult` object if path matches
- Does not execute the handler (only tests if path matches)

**Example:**
```javascript
const entry = router.register('user/{id}', handler);

// Match a path
const matchResult = entry.match('user/123');
if (matchResult) {
  console.log('Matched!');
  console.log('Params:', matchResult.params); // { id: '123' }
  console.log('Pattern:', matchResult.pattern); // 'user/{id}'
}

// No match
const noMatch = entry.match('user/123/posts');
console.log(noMatch); // null
```

**Example - Parameterized Route:**
```javascript
const entry = router.register('{domain}/{action}', handler);

const matchResult = entry.match('example.com/register');
if (matchResult) {
  console.log(matchResult.params); // { domain: 'example.com', action: 'register' }
}
```

**Example - Static Route:**
```javascript
const entry = router.register('register/domain', handler);

const matchResult = entry.match('register/domain');
if (matchResult) {
  console.log(matchResult.params); // {} (empty object for static routes)
}
```

**Example - Wildcard Route:**
```javascript
const entry = router.register('query/*', handler);

const matchResult = entry.match('query/get/users');
if (matchResult) {
  console.log(matchResult.params); // {} (empty object for wildcard routes)
}
```

## Usage Patterns

### Basic Usage

`RouteEntry` instances are typically created and managed by `SubsystemRouter`:

```javascript
import { SubsystemRouter } from './subsystem-router.mycelia.js';

const router = new SubsystemRouter(subsystem);

// Register a route (creates RouteEntry internally)
const entry = router.register('user/{id}', async (message, params, options) => {
  return { success: true, userId: params.id };
}, {
  description: 'User operations',
  priority: 10
});

// Access route entry properties
console.log('Pattern:', entry.pattern);
console.log('Description:', entry.metadata.description);
console.log('Priority:', entry.metadata.priority);
```

### Route Inspection

Inspect route details from a `RouteEntry`:

```javascript
const entry = router.register('user/{id}', handler, {
  description: 'User operations',
  priority: 10,
  version: '1.0'
});

// Inspect route properties
console.log(`Pattern: ${entry.pattern}`);
console.log(`Description: ${entry.metadata.description}`);
console.log(`Priority: ${entry.metadata.priority}`);
console.log(`Version: ${entry.metadata.version}`);

// Test matching
const matchResult = entry.match('user/123');
if (matchResult) {
  console.log('Path matches!');
  console.log('Extracted params:', matchResult.params);
}
```

### Manual Handler Execution

Execute a handler from a `RouteEntry`:

```javascript
const entry = router.register('user/{id}', async (message, params, options) => {
  return { success: true, userId: params.id };
});

// Match path
const matchResult = entry.match('user/123');
if (matchResult) {
  // Execute handler manually
  const message = messageFactory.createCommand('user/123');
  const result = await entry.handler(message, matchResult.params, {});
  console.log('Result:', result);
}
```

### Route Comparison

Compare routes by inspecting their entries:

```javascript
const route1 = router.register('user/*', handler1);
const route2 = router.register('user/{id}', handler2);

// Compare patterns
console.log('Route 1 pattern:', route1.pattern);
console.log('Route 2 pattern:', route2.pattern);

// Compare priorities
if (route1.metadata.priority > route2.metadata.priority) {
  console.log('Route 1 has higher priority');
}
```

## Integration with SubsystemRouter

`RouteEntry` is used internally by `SubsystemRouter`:

```javascript
// SubsystemRouter.register() creates RouteEntry
const entry = router.register('user/{id}', handler, metadata);

// SubsystemRouter.match() uses RouteEntry.match()
const matchResult = router.match('user/123');
// Internally calls entry.match('user/123') for each route

// SubsystemRouter.getRoutes() returns RouteEntry instances
const routes = router.getRoutes();
routes.forEach(entry => {
  console.log(entry.pattern);
});
```

## Handler Function Signature

Route handlers must follow this signature:

```javascript
async (message, params, options) => result
```

**Parameters:**
- `message` (Message, required) - The message being routed
- `params` (Object, required) - Extracted route parameters (empty object for static/wildcard routes)
- `options` (Object, required) - Routing options passed from `route()` call

**Returns:** `Promise<any>` - Handler result (typically a `Result` object or plain object)

**Example:**
```javascript
const handler = async (message, params, options) => {
  const userId = params.id;
  const body = message.getBody();
  
  // Process user operation
  const result = await processUser(userId, body);
  
  return {
    success: true,
    userId,
    result
  };
};

const entry = router.register('user/{id}', handler);
```

## Matcher Function

The matcher function is created by `SubsystemRouter._createMatcher()` and follows this signature:

```javascript
(path: string) => MatchResult | null
```

**Parameters:**
- `path` (string, required) - Path to match

**Returns:** `MatchResult | null` - Match result or `null` if no match

**MatchResult Structure:**
```javascript
{
  matched: true,
  params: Object,  // Extracted route parameters
  pattern: string  // The route pattern
}
```

**Note:** The matcher function is an internal implementation detail. Use `entry.match()` instead of calling the matcher directly.

## Error Handling

- **Invalid Pattern**: Constructor throws an error if pattern is not a non-empty string
- **Invalid Handler**: Constructor throws an error if handler is not a function
- **Invalid Matcher**: Constructor throws an error if matcher is not a function
- **No Match**: `match()` returns `null` if path does not match (not an error)

## Best Practices

1. **Don't Create Directly**: Let `SubsystemRouter.register()` create `RouteEntry` instances
2. **Don't Modify Properties**: Treat `RouteEntry` as immutable after creation
3. **Use match() Method**: Use `entry.match()` instead of calling `matcher` directly
4. **Access Metadata**: Use `entry.metadata` to store and retrieve route information
5. **Inspect Before Execution**: Use `match()` to inspect routes before executing handlers

## Thread Safety

The `RouteEntry` class is not thread-safe. However, since instances are typically created during route registration and then only read from, this is usually not a concern. If you need to modify metadata, ensure proper synchronization.

## See Also

- [SubsystemRouter](./SUBSYSTEM-ROUTER.md) - Router that creates and manages RouteEntry instances
- [useRouter Hook](./USE-ROUTER.md) - Hook that uses SubsystemRouter
- [RouteCache](./ROUTE-CACHE.md) - Route cache implementation
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook








