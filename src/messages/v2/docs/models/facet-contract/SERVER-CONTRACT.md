# Server Facet Contract

## Overview

The **ServerContract** defines the interface that HTTP server facets must satisfy. It ensures all required HTTP server methods are implemented and validates internal structure for compatibility with different server implementations (Fastify, Express). This contract enables subsystems to work with either Fastify or Express without code changes.

**Key Features:**
- **Unified Interface**: Single contract for multiple server implementations
- **Lifecycle Management**: Start, stop, and status checking
- **Route Registration**: Support for all HTTP methods and batch registration
- **Middleware Support**: Global and route-specific middleware
- **Error Handling**: Standardized error handling interface
- **Mycelia Integration**: Methods to expose Mycelia routes, commands, and queries as HTTP endpoints

## Contract Definition

```javascript
import { serverContract } from './server.contract.mycelia.js';

// Contract is automatically registered in defaultContractRegistry
// Hooks implementing this contract: useFastifyServer, useExpressServer
```

## Required Methods

### Lifecycle Methods

#### `start(options)`

Start the HTTP server.

**Signature:**
```javascript
async start(options = {}) => Promise<void>
```

**Parameters:**
- `options.port` (number, optional): Port to listen on (default: 3000)
- `options.host` (string, optional): Host to bind to (default: '0.0.0.0')
- `options.callback` (function, optional): Callback when server starts

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If server is already running

**Example:**
```javascript
await server.start({ port: 3000, host: '0.0.0.0' });
```

#### `stop()`

Stop the HTTP server gracefully.

**Signature:**
```javascript
async stop() => Promise<void>
```

**Returns:** `Promise<void>`

**Example:**
```javascript
await server.stop();
```

#### `isRunning()`

Check if server is currently running.

**Signature:**
```javascript
isRunning() => boolean
```

**Returns:** `boolean` - `true` if server is running, `false` otherwise

**Example:**
```javascript
if (server.isRunning()) {
  console.log('Server is active');
}
```

### Route Registration Methods (Single)

#### `get(path, handler, options)`

Register a GET route.

**Signature:**
```javascript
async get(path, handler, options = {}) => this
```

**Parameters:**
- `path` (string): Route path (supports Mycelia path format)
- `handler` (function): Request handler `(req, res) => void | Promise<void>`
- `options` (object, optional): Route options (middleware, etc.)

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.get('/api/users', async (req, res) => {
  res.json({ users: [] });
});
```

#### `post(path, handler, options)`

Register a POST route. Same signature as `get()`.

#### `put(path, handler, options)`

Register a PUT route. Same signature as `get()`.

#### `patch(path, handler, options)`

Register a PATCH route. Same signature as `get()`.

#### `delete(path, handler, options)`

Register a DELETE route. Same signature as `get()`.

#### `all(path, handler, options)`

Register a route for all HTTP methods. Same signature as `get()`.

### Route Registration Methods (Batch)

#### `registerRoutes(routes)`

Register multiple routes at once.

**Signature:**
```javascript
async registerRoutes(routes) => this
```

**Parameters:**
- `routes` (array): Array of route definitions
  - Each route: `{ method: string, path: string, handler: function, options?: object }`
  - `method`: HTTP method ("GET", "POST", "PUT", "PATCH", "DELETE", "ALL")
  - `path`: Route path
  - `handler`: Request handler function
  - `options`: Optional route options

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.registerRoutes([
  { method: 'GET', path: '/api/users', handler: getUsers },
  { method: 'POST', path: '/api/users', handler: createUser },
  { method: 'GET', path: '/api/users/:id', handler: getUser }
]);
```

#### `registerMyceliaRoutes(routes)`

Register multiple Mycelia routes/commands/queries as HTTP endpoints at once.

**Signature:**
```javascript
async registerMyceliaRoutes(routes) => this
```

**Parameters:**
- `routes` (array): Array of Mycelia route definitions
  - Each route: `{ type: string, myceliaPath: string, httpMethod: string, httpPath: string, options?: object }`
  - `type`: "route", "command", or "query"
  - `myceliaPath`: Mycelia route/command/query path or name
  - `httpMethod`: HTTP method ("GET", "POST", etc.)
  - `httpPath`: HTTP path
  - `options`: Optional transformation and middleware options

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.registerMyceliaRoutes([
  { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
  { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
  { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
]);
```

### Middleware Methods

#### `use(middleware)`

Register global middleware.

**Signature:**
```javascript
async use(middleware) => this
```

**Parameters:**
- `middleware` (function): Middleware function `(req, res, next) => void | Promise<void>`

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.use(async (req, res, next) => {
  console.log('Request:', req.url);
  next();
});
```

#### `useRoute(path, middleware)`

Register route-specific middleware.

**Signature:**
```javascript
async useRoute(path, middleware) => this
```

**Parameters:**
- `path` (string): Route path pattern
- `middleware` (function): Middleware function

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.useRoute('/api/*', async (req, res, next) => {
  // Authentication middleware for API routes
  next();
});
```

### Error Handling

#### `setErrorHandler(handler)`

Set global error handler.

**Signature:**
```javascript
async setErrorHandler(handler) => this
```

**Parameters:**
- `handler` (function): Error handler `(error, req, res) => void | Promise<void>`

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.setErrorHandler(async (error, req, res) => {
  res.status(500).json({ error: error.message });
});
```

### Server Info

#### `getAddress()`

Get server address.

**Signature:**
```javascript
getAddress() => string | null
```

**Returns:** `string | null` - Server address (e.g., "http://localhost:3000") or `null` if not started

**Example:**
```javascript
const address = server.getAddress();
console.log(`Server running at ${address}`);
```

#### `getPort()`

Get server port.

**Signature:**
```javascript
getPort() => number | null
```

**Returns:** `number | null` - Server port or `null` if not started

**Example:**
```javascript
const port = server.getPort();
console.log(`Server listening on port ${port}`);
```

### Mycelia Integration Methods

#### `registerMyceliaRoute(routePath, httpMethod, httpPath, options)`

Register a Mycelia route as an HTTP endpoint.

**Signature:**
```javascript
async registerMyceliaRoute(routePath, httpMethod, httpPath, options = {}) => this
```

**Parameters:**
- `routePath` (string): Mycelia route path (e.g., "user://get/{id}")
- `httpMethod` (string): HTTP method ("GET", "POST", etc.)
- `httpPath` (string): HTTP path (e.g., "/api/users/:id")
- `options` (object, optional): Additional options
  - `transformRequest` (function): Transform HTTP request to Mycelia message
  - `transformResponse` (function): Transform Mycelia response to HTTP response
  - `middleware` (array): Additional middleware

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id'
);
```

#### `registerMyceliaCommand(commandName, httpMethod, httpPath, options)`

Register a Mycelia command as an HTTP endpoint.

**Signature:**
```javascript
async registerMyceliaCommand(commandName, httpMethod, httpPath, options = {}) => this
```

**Parameters:**
- `commandName` (string): Command name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Similar to `registerMyceliaRoute`

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.registerMyceliaCommand(
  'createUser',
  'POST',
  '/api/users'
);
```

#### `registerMyceliaQuery(queryName, httpMethod, httpPath, options)`

Register a Mycelia query as an HTTP endpoint.

**Signature:**
```javascript
async registerMyceliaQuery(queryName, httpMethod, httpPath, options = {}) => this
```

**Parameters:**
- `queryName` (string): Query name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Similar to `registerMyceliaRoute`

**Returns:** `this` (for chaining)

**Example:**
```javascript
await server.registerMyceliaQuery(
  'getUserStats',
  'GET',
  '/api/users/stats'
);
```

## Required Properties

### `_server` (object)

Internal server instance (Fastify or Express). Must be an object (not null or primitive).

**Validation:**
- Must be an object
- Cannot be `null`
- Used by implementation-specific code

### `_isRunning` (boolean)

Running state flag. Must be a boolean.

**Validation:**
- Must be a boolean
- `true` when server is running
- `false` when server is stopped

## Custom Validation

The contract includes custom validation that checks:

1. **`_server` is an object**: Validates that `_server` is an object and not null or a primitive
2. **`_isRunning` is a boolean**: Validates that `_isRunning` is a boolean value

**Validation Error Messages:**
- `"Server facet _server must be an object"` - If `_server` is not an object
- `"Server facet _isRunning must be a boolean"` - If `_isRunning` is not a boolean

## Contract Enforcement

The contract is automatically enforced during the build process when a facet declares `contract: 'server'`:

```javascript
export const useFastifyServer = createHook({
  kind: 'server',
  contract: 'server',  // Declares this hook implements server contract
  // ...
});
```

**Enforcement Timing:**
- Contract validation occurs during the verification phase of the build process
- All validation happens before any facets are initialized
- Build fails if validation fails

## Implementations

The following hooks implement the ServerContract:

- **[useFastifyServer](./hooks/server/USE-FASTIFY-SERVER.md)** - Fastify implementation
- **[useExpressServer](./hooks/server/USE-EXPRESS-SERVER.md)** - Express implementation

## Usage

### In Hooks

Hooks declare the contract using the `contract` parameter:

```javascript
export const useFastifyServer = createHook({
  kind: 'server',
  contract: 'server',  // Declare contract
  fn: (ctx, api, subsystem) => {
    return new Facet('server', {
      contract: 'server'  // Also declare on facet
    })
    .add({
      // Must implement all contract methods
      async start() { /* ... */ },
      async stop() { /* ... */ },
      // ... other required methods
    });
  }
});
```

### In Subsystems

Subsystems can use either implementation interchangeably:

```javascript
// Using Fastify
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',
      port: 3000
    }
  }
});

// Using Express
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'express',
      port: 3000
    }
  }
});
```

## See Also

- [Facet Contracts Overview](./FACET-CONTRACTS-OVERVIEW.md) - General information about facet contracts
- [Facet Contract](./FACET-CONTRACT.md) - How to create and use facet contracts
- [useFastifyServer](./hooks/server/USE-FASTIFY-SERVER.md) - Fastify implementation
- [useExpressServer](./hooks/server/USE-EXPRESS-SERVER.md) - Express implementation
- [ServerSubsystem](./models/server-subsystem/SERVER-SUBSYSTEM.md) - Subsystem that uses server hooks
- [useServerRoutes](./hooks/server-routes/USE-SERVER-ROUTES.md) - Helper hook for route registration


