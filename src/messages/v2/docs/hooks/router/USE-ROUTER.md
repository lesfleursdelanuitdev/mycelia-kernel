# useRouter Hook

## Overview

The `useRouter` hook provides route registration and matching functionality to subsystems. It wraps the `SubsystemRouter` class and exposes methods for registering routes, matching message paths, and managing route metadata. This enables message routing within the subsystem architecture.

**Key Features:**
- **Route Registration**: Register route patterns with handlers
- **Pattern Matching**: Support for static paths, parameterized routes (`{param}`), and wildcards (`*`)
- **Route Caching**: LRU cache for route matches to improve performance
- **Strict Matching**: One pattern per handler (prevents duplicate registrations)
- **Longest-Pattern-Wins**: When multiple routes match, the most specific (longest) pattern wins
- **Route Metadata**: Support for route descriptions, priorities, and custom metadata
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'router',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'router'
}
```

### Properties

- **`kind`**: `'router'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing router facet
- **`required`**: `[]` - No required facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.router`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `'router'` - Implements the router contract

## Configuration

The hook reads configuration from `ctx.config.router`:

```javascript
{
  cacheCapacity: number,
  debug: boolean
}
```

### Configuration Options

- **`cacheCapacity`** (number, default: `1000`): Maximum number of route matches to cache (LRU cache)
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

## Facet Methods

### `registerRoute(pattern, handler, routeOptions)`

Register a route pattern with a handler.

**Signature:**
```javascript
registerRoute(pattern, handler, routeOptions = {}) => boolean
```

**Parameters:**
- `pattern` (string, required) - Route pattern (e.g., `'register/domain'`, `'{domain}/store'`, `'query/*'`)
- `handler` (Function, required) - Handler function: `async (message, params, options) => result`
- `routeOptions` (object, optional) - Route options:
  - `priority` (number, default: `0`) - Route priority (higher = more important)
  - `description` (string, optional) - Route description for documentation
  - `metadata` (object, optional) - Additional metadata:
    - `required` (string, optional) - Required permission type (`'read'`, `'write'`, or `'grant'`) for authentication

**Returns:** `boolean` - `true` if registration successful

**Throws:**
- `Error` - If pattern is already registered (strict matching)
- `Error` - If pattern or handler is invalid

**Behavior:**
- Registers route with `SubsystemRouter`
- Throws error if pattern already exists (strict matching)
- Clears route cache when new route is registered
- Logs error if registration fails

**Example - Static Route:**
```javascript
subsystem.router.registerRoute('register/domain', async (message, params, options) => {
  const body = message.getBody();
  // Process domain registration
  return { success: true, domain: body.domain };
});
```

**Example - Parameterized Route:**
```javascript
subsystem.router.registerRoute('{domain}/store', async (message, params, options) => {
  // params.domain contains the captured domain value
  const domain = params.domain;
  const body = message.getBody();
  // Store data for domain
  return { success: true, domain, data: body };
});
```

**Example - Wildcard Route:**
```javascript
subsystem.router.registerRoute('query/*', async (message, params, options) => {
  // Matches any path starting with 'query/'
  const path = message.getPath();
  // Process query
  return { success: true, path };
});
```

**Example - With Route Options:**
```javascript
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  // Handler implementation
}, {
  priority: 10,
  description: 'User operations',
  metadata: { version: '1.0' }
});
```

**Example - With Authentication:**
```javascript
// Register route with required 'write' permission
subsystem.router.registerRoute('user/{id}/update', async (message, params, options) => {
  // Handler will automatically check for 'write' permission before executing
  // if subsystem has an identity attached
}, {
  metadata: { required: 'write' }
});

// Register route with required 'read' permission
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  // Handler will automatically check for 'read' permission before executing
}, {
  metadata: { required: 'read' }
});
```

### `registerRoutes(routes)`

Register multiple routes at once.

**Signature:**
```javascript
registerRoutes(routes) => number
```

**Parameters:**
- `routes` (Array<Object>, required) - Array of route definitions:
  - `pattern` (string, required) - Route pattern
  - `handler` (Function, required) - Handler function
  - `options` (object, optional) - Route options

**Returns:** `number` - Number of routes successfully registered

**Throws:**
- `Error` - If `routes` is not an array

**Behavior:**
- Iterates through routes array
- Skips invalid route definitions (logs warning)
- Continues on individual route errors (logs error)
- Returns count of successfully registered routes

**Example:**
```javascript
const routes = [
  {
    pattern: 'user/{id}',
    handler: async (message, params, options) => {
      // User handler
    },
    options: { priority: 10, description: 'User operations' }
  },
  {
    pattern: 'admin/*',
    handler: async (message, params, options) => {
      // Admin handler
    },
    options: { priority: 20, description: 'Admin operations' }
  }
];

const registered = subsystem.router.registerRoutes(routes);
console.log(`Registered ${registered} routes`);
```

### `unregisterRoute(pattern)`

Unregister a route pattern.

**Signature:**
```javascript
unregisterRoute(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Route pattern to unregister

**Returns:** `boolean` - `true` if route was found and removed, `false` otherwise

**Behavior:**
- Removes route from registry
- Invalidates cache entries for the pattern
- Logs debug message if debug is enabled

**Example:**
```javascript
// Register route
subsystem.router.registerRoute('user/{id}', handler);

// Later, unregister
const removed = subsystem.router.unregisterRoute('user/{id}');
if (removed) {
  console.log('Route removed');
}
```

### `hasRoute(pattern)`

Check if a route pattern is registered.

**Signature:**
```javascript
hasRoute(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Route pattern to check

**Returns:** `boolean` - `true` if route is registered, `false` otherwise

**Example:**
```javascript
if (subsystem.router.hasRoute('user/{id}')) {
  console.log('Route is registered');
}
```

### `getRoutes()`

Get all registered routes.

**Signature:**
```javascript
getRoutes() => Array<Object>
```

**Returns:** `Array<Object>` - Array of route information objects (RouteEntry instances)

**Example:**
```javascript
const routes = subsystem.router.getRoutes();
routes.forEach(route => {
  console.log(`Pattern: ${route.pattern}, Priority: ${route.metadata.priority}`);
});
```

### `match(path)`

Match a path against registered routes without executing the handler.

**Signature:**
```javascript
match(path) => Object | null
```

**Parameters:**
- `path` (string, required) - Path to match (e.g., `'user/123'`)

**Returns:** `Object | null` - Match result object or `null` if no match

**Match Result Structure:**
```javascript
{
  handler: Function,      // Route handler function
  params: Object,         // Extracted route parameters
  routeEntry: RouteEntry  // Route entry with pattern and metadata
}
```

**Behavior:**
- Validates path is a non-empty string
- Returns `null` if path is invalid
- Matches path against registered routes using `SubsystemRouter.match()`
- Returns `null` if no route matches
- **Wraps handler with authentication** if route metadata specifies a `required` permission and subsystem has an identity attached
- Returns match result with `handler`, `params`, and `routeEntry` if match found
- Uses route cache for performance (LRU cache)
- Longest-pattern-wins when multiple routes match

**Authentication Wrapping:**
- If the route's `metadata.required` is set to `'read'`, `'write'`, or `'grant'`, and the subsystem has an `identity` attached, the handler is automatically wrapped with the appropriate permission check
- The wrapped handler will throw a `Permission denied` error if the required permission is not available
- If no identity is attached or no `required` permission is specified, the handler is returned as-is

**Example - Basic Matching:**
```javascript
// Register a route
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  return { success: true, userId: params.id };
});

// Match a path
const match = subsystem.router.match('user/123');
if (match) {
  console.log('Handler:', match.handler);
  console.log('Params:', match.params); // { id: '123' }
  console.log('Route Entry:', match.routeEntry);
  console.log('Pattern:', match.routeEntry.pattern); // 'user/{id}'
  console.log('Metadata:', match.routeEntry.metadata);
}
```

**Example - No Match:**
```javascript
const match = subsystem.router.match('unknown/path');
if (!match) {
  console.log('No route matches this path');
}
```

**Example - Manual Handler Execution:**
```javascript
const match = subsystem.router.match('user/123');
if (match) {
  // Can manually execute handler if needed
  const message = messageFactory.createCommand('user/123');
  const result = await match.handler(message, match.params, {});
  console.log('Result:', result);
}
```

**Example - Route Inspection:**
```javascript
const match = subsystem.router.match('user/123');
if (match) {
  // Inspect route details
  const { handler, params, routeEntry } = match;
  console.log(`Matched pattern: ${routeEntry.pattern}`);
  console.log(`Extracted params:`, params);
  console.log(`Route description: ${routeEntry.metadata.description}`);
  console.log(`Route priority: ${routeEntry.metadata.priority}`);
}
```

**Use Cases:**
- **Route Inspection**: Check which route would match a path without executing
- **Parameter Extraction**: Extract route parameters before handler execution
- **Custom Routing Logic**: Implement custom routing behavior based on match results
- **Route Validation**: Validate paths before sending messages
- **Debugging**: Inspect route matching behavior

### `route(message, options)`

Route a message by matching its path and executing the handler.

**Signature:**
```javascript
route(message, options = {}) => Promise<any>
```

**Parameters:**
- `message` (Message, required) - Message to route (must have `getPath()` method)
- `options` (object, optional) - Routing options passed to the handler

**Returns:** `Promise<any>` - Handler execution result

**Throws:**
- `Error` - If message is invalid or doesn't have `getPath()` method
- `Error` - If message path is not a non-empty string
- `Error` - If no route matches the message path
- `Error` - If handler execution fails

**Behavior:**
- Extracts path from message using `message.getPath()`
- Matches route using `router.match(path)`
- Throws error if no route matches
- Executes matched handler with `(message, params, options)` signature
- Returns handler result
- Logs errors for route not found and handler execution failures

**Example - Route a Message:**
```javascript
// Register a route
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const userId = params.id;
  const body = message.getBody();
  return { success: true, userId, data: body };
});

// Route a message
const message = messageFactory.createCommand('user/123', { name: 'John' });
const result = await subsystem.router.route(message);
// result: { success: true, userId: '123', data: { name: 'John' } }
```

**Example - With Routing Options:**
```javascript
// Register route that uses options
subsystem.router.registerRoute('admin/*', async (message, params, options) => {
  const skipAuth = options.skipAuth || false;
  if (!skipAuth) {
    // Perform authentication
  }
  return { success: true };
});

// Route with options
const message = messageFactory.createCommand('admin/users');
const result = await subsystem.router.route(message, { skipAuth: true });
```

**Example - Error Handling:**
```javascript
try {
  const message = messageFactory.createCommand('unknown/path');
  const result = await subsystem.router.route(message);
} catch (error) {
  // Error: "No route handler found for path: unknown/path"
  console.error('Routing failed:', error.message);
}
```

## Facet Properties

### `_routeRegistry` (internal)

Internal accessor for the `SubsystemRouter` instance.

**Type:** `SubsystemRouter`

**Purpose:** Used internally by other hooks that need direct access to the router.

**Note:** This is an internal property and should not be used by external code. Use the facet methods instead.

## Route Patterns

The router supports three types of route patterns:

### Static Patterns

Exact path matching.

**Example:**
```javascript
subsystem.router.registerRoute('register/domain', handler);
// Matches: 'register/domain'
// Does not match: 'register/domain/extra', 'register/other'
```

### Parameterized Patterns

Capture path segments as parameters using `{paramName}` syntax.

**Example:**
```javascript
subsystem.router.registerRoute('user/{id}', handler);
// Matches: 'user/123', 'user/abc'
// params: { id: '123' } or { id: 'abc' }
```

**Multiple Parameters:**
```javascript
subsystem.router.registerRoute('{domain}/{action}', handler);
// Matches: 'example.com/register', 'test.com/delete'
// params: { domain: 'example.com', action: 'register' }
```

### Wildcard Patterns

Match any path segment(s) using `*` syntax.

**Example:**
```javascript
subsystem.router.registerRoute('query/*', handler);
// Matches: 'query/get', 'query/get/users', 'query/anything/here'
```

**Note:** Wildcards match any characters, including slashes.

## Route Matching

### Matching Rules

1. **Strict Matching**: Only one handler per pattern (no duplicate patterns)
2. **Longest-Pattern-Wins**: When multiple routes match a path, the route with the longest pattern wins
3. **Cache Support**: Route matches are cached (LRU cache) for performance
4. **Pattern Priority**: If patterns have the same length, the first registered route wins

### Matching Examples

```javascript
// Register routes
subsystem.router.registerRoute('user/*', handler1);
subsystem.router.registerRoute('user/{id}', handler2);
subsystem.router.registerRoute('user/{id}/profile', handler3);

// Match 'user/123/profile'
// Matches: handler3 (longest pattern: 'user/{id}/profile')

// Match 'user/123'
// Matches: handler2 (longer than handler1)

// Match 'user/123/settings'
// Matches: handler1 (wildcard matches anything)
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
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const userId = params.id;
  const body = message.getBody();
  
  // Process user operation
  const result = await processUser(userId, body);
  
  return {
    success: true,
    userId,
    result
  };
});
```

## Authentication Integration

The router integrates with the subsystem's identity system to provide automatic permission checking for route handlers.

### How It Works

When a route is matched via the `match()` method, the router checks if:
1. The route's `metadata.required` field specifies a permission type (`'read'`, `'write'`, or `'grant'`)
2. The subsystem has an `identity` attached (via the `usePrincipals` hook)

If both conditions are met, the handler is automatically wrapped with the appropriate permission check using `subsystem.identity.requireAuth(required, handler)`. The wrapped handler will:
- Check if the identity has the required permission before executing
- Throw a `Permission denied` error if the permission is not available
- Execute the handler normally if the permission check passes

### Example

```javascript
// Subsystem with identity attached
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

subsystem
  .use(usePrincipals)  // Attaches identity
  .use(useRouter)
  .build();

// Register route with required 'write' permission
subsystem.router.registerRoute('user/{id}/update', async (message, params, options) => {
  // This handler will only execute if identity has 'write' permission
  return { success: true };
}, {
  metadata: { required: 'write' }
});

// When matching, handler is automatically wrapped
const match = subsystem.router.match('user/123/update');
// match.handler is now wrapped with permission check
// If identity doesn't have 'write' permission, executing it will throw an error
```

### Permission Types

- **`'read'`**: Requires read permission on the identity's PKR
- **`'write'`**: Requires write permission on the identity's PKR
- **`'grant'`**: Requires grant permission on the identity's PKR

See [createIdentity](../../../models/security/create-identity.mycelia.js) for more details on the identity system.

## Encapsulated Functionality

The `useRouter` hook encapsulates:

1. **SubsystemRouter Instance**: A `SubsystemRouter` instance that handles route registration, matching, and caching
2. **Route Cache**: LRU cache for route matches to improve performance
3. **Pattern Matching**: Support for static, parameterized, and wildcard patterns
4. **Strict Registration**: Prevents duplicate route patterns
5. **Configuration Management**: Extracts and applies configuration from `ctx.config.router`
6. **Debug Logging**: Integrates with the logger utility for conditional debug output
7. **Route Metadata**: Support for route descriptions, priorities, and custom metadata
8. **Authentication Wrapping**: Automatic permission checking for route handlers when identity is attached

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useRouter } from './hooks/router/use-router.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      cacheCapacity: 2000,
      debug: true
    }
  }
});

subsystem
  .use(useRouter)
  .build();

// Register routes
subsystem.router.registerRoute('user/{id}', async (message, params, options) => {
  const userId = params.id;
  // Process user
  return { success: true, userId };
});

// Route messages
const message = messageFactory.createCommand('user/123');
const result = await subsystem.router.route(message);
```

### With Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useRouter
});

await subsystem.build();

// Router is already available
subsystem.router.registerRoute('message/path', handler);
```

### Multiple Routes

```javascript
// Register multiple routes
subsystem.router.registerRoute('user/{id}', userHandler);
subsystem.router.registerRoute('admin/*', adminHandler);
subsystem.router.registerRoute('query/get', queryHandler);

// Or use registerRoutes
subsystem.router.registerRoutes([
  { pattern: 'user/{id}', handler: userHandler },
  { pattern: 'admin/*', handler: adminHandler },
  { pattern: 'query/get', handler: queryHandler }
]);
```

### Route with Priority

```javascript
// Register routes with priorities
subsystem.router.registerRoute('user/*', generalHandler, { priority: 1 });
subsystem.router.registerRoute('user/{id}', specificHandler, { priority: 10 });

// When 'user/123' is matched, specificHandler wins (higher priority)
// But pattern length is the primary factor, not priority
```

### Dynamic Route Management

```javascript
// Register route
subsystem.router.registerRoute('dynamic/{action}', handler);

// Check if registered
if (subsystem.router.hasRoute('dynamic/{action}')) {
  console.log('Route is registered');
}

// Get all routes
const routes = subsystem.router.getRoutes();
console.log(`Total routes: ${routes.length}`);

// Route a message
const message = messageFactory.createCommand('dynamic/process');
const result = await subsystem.router.route(message);

// Unregister route
subsystem.router.unregisterRoute('dynamic/{action}');
```

### Direct Message Routing

```javascript
// Register routes
subsystem.router.registerRoute('user/{id}', userHandler);
subsystem.router.registerRoute('admin/*', adminHandler);

// Route messages directly
const userMessage = messageFactory.createCommand('user/123');
const userResult = await subsystem.router.route(userMessage);

const adminMessage = messageFactory.createCommand('admin/users');
const adminResult = await subsystem.router.route(adminMessage, { skipAuth: true });
```

### Route Matching and Inspection

```javascript
// Register routes
subsystem.router.registerRoute('user/{id}', userHandler);
subsystem.router.registerRoute('admin/*', adminHandler);

// Match paths without executing handlers
const userMatch = subsystem.router.match('user/123');
if (userMatch) {
  console.log('Matched pattern:', userMatch.routeEntry.pattern);
  console.log('Extracted params:', userMatch.params); // { id: '123' }
  console.log('Route metadata:', userMatch.routeEntry.metadata);
  
  // Can execute handler manually if needed
  const message = messageFactory.createCommand('user/123');
  const result = await userMatch.handler(message, userMatch.params, {});
}

// Check if path would match before sending message
const path = 'user/456';
const match = subsystem.router.match(path);
if (match) {
  console.log(`Path '${path}' will match pattern '${match.routeEntry.pattern}'`);
} else {
  console.log(`Path '${path}' has no matching route`);
}
```

## Integration with Message Processing

The router is used by `useMessageProcessor` to match incoming messages to handlers. There are several ways to use the router:

```javascript
// Using route() method (recommended for simple routing)
const result = await subsystem.router.route(message, options);

// Using match() method (for inspection or custom logic)
const match = subsystem.router.match(message.getPath());
if (match) {
  // Inspect match details
  console.log('Matched pattern:', match.routeEntry.pattern);
  console.log('Extracted params:', match.params);
  
  // Execute handler manually if needed
  const result = await match.handler(message, match.params, options);
}

// Or using direct matching via _routeRegistry (for advanced use cases)
const matchResult = subsystem.router._routeRegistry.match(message.getPath());
if (matchResult) {
  const result = await matchResult.routeEntry.handler(
    message,
    matchResult.params,
    options
  );
}
```

The `route()` method encapsulates the matching and execution logic, making it the preferred way to route messages. Use `match()` when you need to inspect the match result or implement custom routing logic.

## Error Handling

- **Duplicate Pattern**: `registerRoute()` throws an error if pattern is already registered
- **Invalid Pattern**: Throws error if pattern is not a non-empty string
- **Invalid Handler**: Throws error if handler is not a function
- **Registration Errors**: `registerRoutes()` logs errors for individual route failures but continues processing
- **Route Not Found**: `route()` throws an error if no route matches the message path
- **Invalid Message**: `route()` throws an error if message is invalid or doesn't have `getPath()` method
- **Handler Execution Errors**: `route()` propagates errors thrown by route handlers
- **No Match (match method)**: `match()` returns `null` if no route matches (does not throw)
- **Invalid Path (match method)**: `match()` returns `null` if path is invalid (does not throw)

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      debug: true
    }
  }
});
```

Debug messages include:
- Route registration errors
- Invalid route definition warnings
- Route registration success (via SubsystemRouter)
- Route not found errors (when routing messages)
- Handler execution errors (when routing messages)

## Dependencies

- **Required Facets**: The `useRouter` hook has no required facets

- **Optional Integration**: The router can integrate with:
  - `usePrincipals` - For identity-based authentication (if `metadata.required` is specified in routes)

- **Used By Other Hooks**: The router is used by:
  - `useMessageProcessor` - For matching messages to handlers
  - `useQueries` - For registering query routes

## Best Practices

1. **Use Descriptive Patterns**: Choose route patterns that clearly indicate their purpose
2. **Prefer Specific Patterns**: Use parameterized patterns (`{id}`) over wildcards (`*`) when possible for better specificity
3. **Set Priorities Appropriately**: Use route priorities to control handler selection when multiple routes match
4. **Cache Capacity**: Set `cacheCapacity` based on expected unique message paths
5. **Handle Errors**: Always handle errors in route handlers and when calling `route()`
6. **Use Route Metadata**: Add descriptions and metadata to routes for documentation
7. **Clean Up Routes**: Unregister routes when no longer needed
8. **Use `route()` for Direct Routing**: Use the `route()` method for direct message routing instead of manual matching
9. **Use `match()` for Inspection**: Use the `match()` method to inspect routes or extract parameters without executing handlers
10. **Validate Messages**: Ensure messages have valid paths before routing
11. **Handle Route Not Found**: Always catch errors when routing messages that may not have matching routes
12. **Check Match Results**: Always check if `match()` returns `null` before accessing match properties
13. **Use Authentication**: Specify `metadata.required` for routes that need permission checks when using identity system
14. **Handle Permission Errors**: Always catch permission errors when executing handlers with required permissions
15. **Identity Integration**: Attach identity via `usePrincipals` hook if you want to use authentication on routes

## Route Pattern Best Practices

1. **Static First**: Use static patterns for exact matches
2. **Parameters for Variables**: Use `{param}` for single-segment variables
3. **Wildcards Last**: Use `*` only when you need to match multiple segments
4. **Avoid Ambiguity**: Design patterns to minimize multiple matches
5. **Document Patterns**: Use route descriptions to document pattern behavior

## Performance Considerations

- **Route Cache**: The LRU cache improves performance for frequently matched paths
- **Pattern Matching**: Parameterized patterns are more efficient than wildcards
- **Cache Capacity**: Set appropriate cache capacity based on unique path count
- **Route Count**: Large numbers of routes may impact matching performance

## See Also

- [Hooks Documentation](../../hooks/HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../../FACETS.md) - Understanding facet objects
- [SubsystemRouter](./SUBSYSTEM-ROUTER.md) - The underlying router implementation
- [RouteEntry](./ROUTE-ENTRY.md) - Route entry representation
- [RouteCache](./ROUTE-CACHE.md) - Route cache implementation
- [useMessageProcessor](../message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook
- [processMessage](../message-processor/PROCESS-MESSAGE.md) - Message processing utility
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [createIdentity](../../../models/security/create-identity.mycelia.js) - Identity creation and permission checking
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

