# Server Contract Design

## Overview

This document designs a **ServerContract** and two implementing hooks (**useFastifyServer** and **useExpressServer**) that provide HTTP server capabilities to Mycelia subsystems. The contract abstracts common HTTP server operations, allowing subsystems to work with either Fastify or Express without code changes.

The design also includes:
- **ServerSubsystem**: A dedicated subsystem that manages the HTTP server and handles route registration messages
- **useServerRoutes**: A hook used by other subsystems to construct and send route registration messages to the ServerSubsystem

## Design Goals

1. **Abstraction**: Provide a unified interface for HTTP server operations
2. **Interchangeability**: Allow swapping between Fastify and Express implementations
3. **Message-Driven Integration**: Subsystems register routes via messages (not direct calls)
4. **Batch Registration**: Support registering multiple routes at once
5. **Lifecycle Management**: Support server start, stop, and lifecycle hooks
6. **Middleware Support**: Enable middleware registration and execution
7. **Error Handling**: Standardized error handling across implementations
8. **Type Safety**: Clear contract definition for validation

---

## ServerContract Specification

### Contract Definition

```javascript
// server.contract.mycelia.js
export const serverContract = createFacetContract({
  name: 'server',
  requiredMethods: [
    // Lifecycle
    'start',
    'stop',
    'isRunning',
    
    // Route Registration (Single)
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'all',  // All HTTP methods
    
    // Route Registration (Batch)
    'registerRoutes',  // Register multiple routes at once
    'registerMyceliaRoutes',  // Register multiple Mycelia routes at once
    
    // Middleware
    'use',  // Global middleware
    'useRoute',  // Route-specific middleware
    
    // Error Handling
    'setErrorHandler',
    
    // Server Info
    'getAddress',
    'getPort',
    
    // Integration
    'registerMyceliaRoute',  // Register Mycelia route as HTTP endpoint
    'registerMyceliaCommand', // Register Mycelia command as HTTP endpoint
    'registerMyceliaQuery'    // Register Mycelia query as HTTP endpoint
  ],
  requiredProperties: [
    '_server',  // Internal server instance (Fastify/Express)
    '_isRunning'  // Running state flag
  ],
  validate: (ctx, api, subsystem, facet) => {
    // Validate _server is an object
    if (typeof facet._server !== 'object' || facet._server === null) {
      throw new Error('Server facet _server must be an object');
    }
    
    // Validate _isRunning is a boolean
    if (typeof facet._isRunning !== 'boolean') {
      throw new Error('Server facet _isRunning must be a boolean');
    }
  }
});
```

### Required Methods

#### Lifecycle Methods

**`start(options)`**
- Start the HTTP server
- `options.port` (number, optional): Port to listen on (default: 3000)
- `options.host` (string, optional): Host to bind to (default: '0.0.0.0')
- `options.callback` (function, optional): Callback when server starts
- Returns: `Promise<void>`
- Throws: Error if server is already running

**`stop()`**
- Stop the HTTP server gracefully
- Returns: `Promise<void>`
- Closes all connections and stops listening

**`isRunning()`**
- Check if server is currently running
- Returns: `boolean`

#### Route Registration Methods

**`get(path, handler, options)`**
- Register GET route
- `path` (string): Route path (supports Mycelia path format)
- `handler` (function): Request handler `(req, res) => void | Promise<void>`
- `options` (object, optional): Route options (middleware, etc.)
- Returns: `this` (for chaining)

**`post(path, handler, options)`**
- Register POST route
- Same signature as `get()`

**`put(path, handler, options)`**
- Register PUT route
- Same signature as `get()`

**`patch(path, handler, options)`**
- Register PATCH route
- Same signature as `get()`

**`delete(path, handler, options)`**
- Register DELETE route
- Same signature as `get()`

**`all(path, handler, options)`**
- Register route for all HTTP methods
- Same signature as `get()`

#### Batch Route Registration Methods

**`registerRoutes(routes)`**
- Register multiple routes at once
- `routes` (array): Array of route definitions
  - Each route: `{ method: string, path: string, handler: function, options?: object }`
  - `method`: HTTP method ("GET", "POST", "PUT", "PATCH", "DELETE", "ALL")
  - `path`: Route path
  - `handler`: Request handler function
  - `options`: Optional route options
- Returns: `this` (for chaining)
- Example:
  ```javascript
  server.registerRoutes([
    { method: 'GET', path: '/users', handler: getUsers },
    { method: 'POST', path: '/users', handler: createUser },
    { method: 'GET', path: '/users/:id', handler: getUser }
  ]);
  ```

**`registerMyceliaRoutes(routes)`**
- Register multiple Mycelia routes/commands/queries as HTTP endpoints at once
- `routes` (array): Array of Mycelia route definitions
  - Each route: `{ type: string, myceliaPath: string, httpMethod: string, httpPath: string, options?: object }`
  - `type`: "route", "command", or "query"
  - `myceliaPath`: Mycelia route/command/query path or name
  - `httpMethod`: HTTP method ("GET", "POST", etc.)
  - `httpPath`: HTTP path
  - `options`: Optional transformation and middleware options
- Returns: `this` (for chaining)
- Example:
  ```javascript
  server.registerMyceliaRoutes([
    { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
    { type: 'command', myceliaPath: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
    { type: 'query', myceliaPath: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
  ]);
  ```

#### Middleware Methods

**`use(middleware)`**
- Register global middleware
- `middleware` (function): Middleware function `(req, res, next) => void | Promise<void>`
- Returns: `this` (for chaining)

**`useRoute(path, middleware)`**
- Register route-specific middleware
- `path` (string): Route path pattern
- `middleware` (function): Middleware function
- Returns: `this` (for chaining)

#### Error Handling

**`setErrorHandler(handler)`**
- Set global error handler
- `handler` (function): Error handler `(error, req, res) => void | Promise<void>`
- Returns: `this` (for chaining)

#### Server Info

**`getAddress()`**
- Get server address
- Returns: `string | null` (e.g., "http://localhost:3000")

**`getPort()`**
- Get server port
- Returns: `number | null`

#### Mycelia Integration Methods

**`registerMyceliaRoute(routePath, httpMethod, httpPath, options)`**
- Register a Mycelia route as an HTTP endpoint
- `routePath` (string): Mycelia route path (e.g., "user://get/{id}")
- `httpMethod` (string): HTTP method ("GET", "POST", etc.)
- `httpPath` (string): HTTP path (e.g., "/api/users/:id")
- `options` (object, optional): Additional options
  - `transformRequest` (function): Transform HTTP request to Mycelia message
  - `transformResponse` (function): Transform Mycelia response to HTTP response
  - `middleware` (array): Additional middleware
- Returns: `this` (for chaining)

**`registerMyceliaCommand(commandName, httpMethod, httpPath, options)`**
- Register a Mycelia command as an HTTP endpoint
- `commandName` (string): Command name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Similar to `registerMyceliaRoute`
- Returns: `this` (for chaining)

**`registerMyceliaQuery(queryName, httpMethod, httpPath, options)`**
- Register a Mycelia query as an HTTP endpoint
- `queryName` (string): Query name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Similar to `registerMyceliaRoute`
- Returns: `this` (for chaining)

### Required Properties

**`_server`** (object)
- Internal server instance (Fastify or Express)
- Used by implementation-specific code
- Must be an object (not null)

**`_isRunning`** (boolean)
- Running state flag
- `true` when server is running
- `false` when server is stopped

---

## ServerSubsystem Design

### Overview

The **ServerSubsystem** is a dedicated subsystem that extends `BaseSubsystem` and manages the HTTP server. It uses either `useExpressServer` or `useFastifyServer` based on configuration, and registers routes (using `subsystem.registerRoute()`) that handle route registration messages from other subsystems.

### Subsystem Structure

```javascript
// ServerSubsystem class
class ServerSubsystem extends BaseSubsystem {
  constructor(name, options = {}) {
    super(name, options);
    // Config determines which server hook to use
  }
  
  async onInit() {
    // Register routes that handle registration messages
    // These routes will be called when messages arrive at this subsystem
    
    // Register route for Mycelia route registration
    this.registerRoute('route/register-mycelia', async (message, params, routeOptions) => {
      // routeOptions is the handler's options parameter (frozen, contains callerId, etc.)
      // Extract registration data from message body
      const { myceliaPath, httpMethod, httpPath, options: registrationOptions } = message.body;
      const server = this.find('server');
      if (!server) {
        return { success: false, error: 'Server facet not found' };
      }
      
      await server.registerMyceliaRoute(myceliaPath, httpMethod, httpPath, registrationOptions);
      return { success: true, registered: { myceliaPath, httpPath } };
    });
    
    // Register route for command registration
    this.registerRoute('route/register-command', async (message, params, routeOptions) => {
      const { commandName, httpMethod, httpPath, options: registrationOptions } = message.body;
      const server = this.find('server');
      if (!server) {
        return { success: false, error: 'Server facet not found' };
      }
      
      await server.registerMyceliaCommand(commandName, httpMethod, httpPath, registrationOptions);
      return { success: true, registered: { commandName, httpPath } };
    });
    
    // Register route for query registration
    this.registerRoute('route/register-query', async (message, params, routeOptions) => {
      const { queryName, httpMethod, httpPath, options: registrationOptions } = message.body;
      const server = this.find('server');
      if (!server) {
        return { success: false, error: 'Server facet not found' };
      }
      
      await server.registerMyceliaQuery(queryName, httpMethod, httpPath, registrationOptions);
      return { success: true, registered: { queryName, httpPath } };
    });
    
    // Register route for batch registration
    this.registerRoute('route/register-batch', async (message, params, routeOptions) => {
      const { routes } = message.body;
      const server = this.find('server');
      if (!server) {
        return { success: false, error: 'Server facet not found' };
      }
      
      await server.registerMyceliaRoutes(routes);
      return { success: true, registered: routes.length };
    });
  }
}
```

### Configuration-Based Hook Selection

The ServerSubsystem selects the server hook based on `ctx.config.server.type`:

```javascript
// ServerSubsystem setup
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',  // or 'express' - determines which hook to use
      port: 3000,
      host: '0.0.0.0',
      fastify: { /* Fastify-specific options */ },
      // OR
      express: { /* Express-specific options */ }
    }
  }
});

// During build, hook selection happens based on config:
// - If config.server.type === 'fastify': use useFastifyServer
// - If config.server.type === 'express': use useExpressServer
// - Default: use useFastifyServer

await serverSubsystem
  .use(useRouter)
  .use(useMessages)
  .use(selectServerHook(serverSubsystem.ctx.config.server))  // Selects useFastifyServer or useExpressServer
  .build();

// After build, routes registered in onInit() are active
// Messages to 'server://route/register-*' will be handled
```

### Route Patterns

The ServerSubsystem registers routes using `subsystem.registerRoute()` with these patterns:

- `route/register-mycelia` - Handles `registerMyceliaRoute` messages
- `route/register-command` - Handles `registerMyceliaCommand` messages  
- `route/register-query` - Handles `registerMyceliaQuery` messages
- `route/register-batch` - Handles batch registration messages

**Note:** These are **local route patterns** within the ServerSubsystem. Messages sent to `server://route/register-mycelia` will be routed to the ServerSubsystem, and then matched against the local route pattern `route/register-mycelia`.

### Message Formats

#### Register Mycelia Route

```javascript
{
  path: 'server://route/register-mycelia',  // Full path to ServerSubsystem
  body: {
    myceliaPath: 'user://get/{id}',  // Mycelia route path
    httpMethod: 'GET',
    httpPath: '/api/users/:id',
    options: {
      transformRequest: (req) => { /* ... */ },  // Optional
      transformResponse: (result) => { /* ... */ },  // Optional
      middleware: []  // Optional
    }
  }
}
```

#### Register Mycelia Command

```javascript
{
  path: 'server://route/register-command',  // Full path to ServerSubsystem
  body: {
    commandName: 'createUser',  // Command name
    httpMethod: 'POST',
    httpPath: '/api/users',
    options: { /* ... */ }
  }
}
```

#### Register Mycelia Query

```javascript
{
  path: 'server://route/register-query',  // Full path to ServerSubsystem
  body: {
    queryName: 'getUserStats',  // Query name
    httpMethod: 'GET',
    httpPath: '/api/users/stats',
    options: { /* ... */ }
  }
}
```

#### Batch Registration

```javascript
{
  path: 'server://route/register-batch',  // Full path to ServerSubsystem
  body: {
    routes: [
      { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
      { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
      { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
    ]
  }
}
```

### Route Handler Signature

Route handlers follow the BaseSubsystem route handler signature:

```javascript
async (message, params, options) => result
```

- `message` - The incoming message with `body` containing registration data
- `params` - Route parameters extracted from the message path (empty object `{}` for static routes)
- `options` - Route options (frozen object with callerId, timeout, etc.)
- Returns: Result object with `success` and optional data

**Note:** The `options` parameter is a frozen object that contains routing metadata. It should not be modified by handlers.

---

## useServerRoutes Hook Design

### Overview

The `useServerRoutes` hook is used by **other subsystems** (not the ServerSubsystem) that want to register their own routes. It provides helper methods that construct and send messages to the ServerSubsystem to register routes. It does NOT handle route registration itself - it only constructs messages.

### Hook Metadata

```javascript
export const useServerRoutes = createHook({
  kind: 'serverRoutes',
  overwrite: false,
  required: ['router', 'messages'],  // For constructing and sending messages
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Implementation
  }
});
```

### Configuration

Reads configuration from `ctx.config.serverRoutes`:

```javascript
{
  debug: boolean  // Enable debug logging
}
```

**Note:** The ServerSubsystem name is always `'server'`. Messages are sent to `server://route/register-*` paths.

### Message Formats

#### Register Single Route

```javascript
{
  path: 'server://route/register',
  body: {
    method: 'GET',  // HTTP method
    path: '/api/users',  // HTTP path
    handler: 'handleGetUsers',  // Handler name (optional if using Mycelia route)
    options: {
      middleware: [],  // Optional middleware
      // ... other route options
    }
  }
}
```

#### Register Batch Routes

```javascript
{
  path: 'server://route/register-batch',
  body: {
    routes: [
      { method: 'GET', path: '/api/users', handler: 'handleGetUsers' },
      { method: 'POST', path: '/api/users', handler: 'handleCreateUser' },
      { method: 'GET', path: '/api/users/:id', handler: 'handleGetUser' }
    ]
  }
}
```

#### Register Mycelia Route

```javascript
{
  path: 'server://route/register-mycelia',
  body: {
    type: 'route',  // 'route', 'command', or 'query'
    myceliaPath: 'user://get/{id}',  // Mycelia route path or name
    httpMethod: 'GET',
    httpPath: '/api/users/:id',
    options: {
      transformRequest: (req) => { /* ... */ },  // Optional
      transformResponse: (result) => { /* ... */ },  // Optional
      middleware: []  // Optional
    }
  }
}
```

#### Register Batch Mycelia Routes

```javascript
{
  path: 'server://route/register-mycelia-batch',
  body: {
    routes: [
      { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
      { type: 'command', myceliaPath: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
      { type: 'query', myceliaPath: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
    ]
  }
}
```

### Facet Methods

The `useServerRoutes` hook creates a facet that provides helper methods for subsystems to **construct and send messages** to the ServerSubsystem:

```javascript
{
  // Register a Mycelia route as HTTP endpoint (sends message to ServerSubsystem)
  async registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options) { /* ... */ },
  
  // Register a Mycelia command as HTTP endpoint (sends message to ServerSubsystem)
  async registerMyceliaCommand(commandName, httpMethod, httpPath, options) { /* ... */ },
  
  // Register a Mycelia query as HTTP endpoint (sends message to ServerSubsystem)
  async registerMyceliaQuery(queryName, httpMethod, httpPath, options) { /* ... */ },
  
  // Register multiple Mycelia routes/commands/queries at once (sends message to ServerSubsystem)
  async registerMyceliaRoutes(routes) { /* ... */ }
}
```

### Implementation Structure

```javascript
fn: (ctx, api, subsystem) => {
  const router = api.__facets['router'];
  const messages = api.__facets['messages'];
  
  // Get config (server name is always 'server')
  const config = ctx.config?.serverRoutes || {};
  const debug = config.debug !== undefined ? config.debug : (ctx.debug || false);
  
  // Helper to construct message path to ServerSubsystem
  // ServerSubsystem name is always 'server'
  function getServerPath(route) {
    return `server://route/${route}`;
  }
  
  // Create facet with helper methods that construct and send messages
  return new Facet('serverRoutes', {
    attach: true,
    source: import.meta.url
  })
  .add({
    /**
     * Register a Mycelia route as HTTP endpoint
     * Constructs and sends message to ServerSubsystem
     * 
     * @param {string} myceliaPath - Mycelia route path (e.g., 'user://get/{id}')
     * @param {string} httpMethod - HTTP method ('GET', 'POST', etc.)
     * @param {string} httpPath - HTTP path (e.g., '/api/users/:id')
     * @param {Object} [options={}] - Optional transformation and middleware options
     * @returns {Promise<Object>} Result from ServerSubsystem route handler
     */
    async registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options = {}) {
      const msg = messages.create(getServerPath('register-mycelia'), {
        myceliaPath,
        httpMethod,
        httpPath,
        options
      });
      
      if (debug) {
        console.log(`[${subsystem.name}] Registering route: ${myceliaPath} -> ${httpMethod} ${httpPath}`);
      }
      
      // Route message to ServerSubsystem
      // Message will be accepted by ServerSubsystem and processed
      // ServerSubsystem's route handler will call server.registerMyceliaRoute()
      const result = await router.route(msg);
      return result;
    },
    
    /**
     * Register a Mycelia command as HTTP endpoint
     * Constructs and sends message to ServerSubsystem
     * 
     * @param {string} commandName - Command name
     * @param {string} httpMethod - HTTP method
     * @param {string} httpPath - HTTP path
     * @param {Object} [options={}] - Optional options
     * @returns {Promise<Object>} Result from ServerSubsystem route handler
     */
    async registerMyceliaCommand(commandName, httpMethod, httpPath, options = {}) {
      const msg = messages.create(getServerPath('register-command'), {
        commandName,
        httpMethod,
        httpPath,
        options
      });
      
      if (debug) {
        console.log(`[${subsystem.name}] Registering command: ${commandName} -> ${httpMethod} ${httpPath}`);
      }
      
      const result = await router.route(msg);
      return result;
    },
    
    /**
     * Register a Mycelia query as HTTP endpoint
     * Constructs and sends message to ServerSubsystem
     * 
     * @param {string} queryName - Query name
     * @param {string} httpMethod - HTTP method
     * @param {string} httpPath - HTTP path
     * @param {Object} [options={}] - Optional options
     * @returns {Promise<Object>} Result from ServerSubsystem route handler
     */
    async registerMyceliaQuery(queryName, httpMethod, httpPath, options = {}) {
      const msg = messages.create(getServerPath('register-query'), {
        queryName,
        httpMethod,
        httpPath,
        options
      });
      
      if (debug) {
        console.log(`[${subsystem.name}] Registering query: ${queryName} -> ${httpMethod} ${httpPath}`);
      }
      
      const result = await router.route(msg);
      return result;
    },
    
    /**
     * Register multiple Mycelia routes/commands/queries at once
     * Constructs and sends batch message to ServerSubsystem
     * 
     * @param {Array} routes - Array of route definitions
     *   Each route: { type: 'route'|'command'|'query', ... }
     * @returns {Promise<Object>} Result from ServerSubsystem route handler
     */
    async registerMyceliaRoutes(routes) {
      const msg = messages.create(getServerPath('register-batch'), {
        routes
      });
      
      if (debug) {
        console.log(`[${subsystem.name}] Registering ${routes.length} routes in batch`);
      }
      
      const result = await router.route(msg);
      return result;
    }
  });
}
```

### Message Flow

When a subsystem calls `serverRoutes.registerMyceliaRoute()`:

1. **Message Construction**: `useServerRoutes` constructs a message with path `server://route/register-mycelia`
2. **Message Routing**: `router.route(msg)` routes the message to the ServerSubsystem
3. **Message Acceptance**: ServerSubsystem's `accept()` method receives the message
4. **Message Processing**: ServerSubsystem's `processMessage()` matches the route pattern `route/register-mycelia`
5. **Handler Execution**: The route handler (registered in `onInit()`) executes
6. **Server Registration**: Handler calls `server.registerMyceliaRoute()` on the server facet
7. **Response**: Handler returns result, which flows back through the message system

### Usage Example

```javascript
// In a subsystem that wants to register routes
const userSubsystem = new BaseSubsystem('user', {
  ms: messageSystem,
  config: {
    serverRoutes: {
      serverSubsystemName: 'server',  // Name of ServerSubsystem
      debug: true
    }
  }
});

await userSubsystem
  .use(useRouter)
  .use(useMessages)
  .use(useServerRoutes)  // Add route registration capability
  .onInit(async () => {
    // Register routes via messages (sends to ServerSubsystem)
    await userSubsystem.serverRoutes.registerMyceliaRoute(
      'user://get/{id}',
      'GET',
      '/api/users/:id'
    );
    
    await userSubsystem.serverRoutes.registerMyceliaCommand(
      'createUser',
      'POST',
      '/api/users'
    );
    
    // Or register multiple at once
    await userSubsystem.serverRoutes.registerMyceliaRoutes([
      { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
      { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
      { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
    ]);
  })
  .build();
```

---

## useFastifyServer Hook Design

### Hook Metadata

```javascript
export const useFastifyServer = createHook({
  kind: 'server',
  overwrite: false,
  required: ['router', 'messages'],  // For Mycelia integration
  attach: true,
  contract: 'server',
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Implementation
  }
});
```

### Configuration

Reads configuration from `ctx.config.server`:

```javascript
{
  port: number,           // Default: 3000
  host: string,           // Default: '0.0.0.0'
  fastify: {              // Fastify-specific options
    logger: boolean,      // Enable Fastify logger
    bodyLimit: number,    // Request body size limit
    // ... other Fastify options
  },
  debug: boolean          // Enable debug logging
}
```

### Implementation Structure

```javascript
fn: (ctx, api, subsystem) => {
  const config = ctx.config.server || {};
  const fastify = Fastify(config.fastify || {});
  
  // Create facet with all required methods
  return new Facet('server', {
    contract: 'server',
    attach: true,
    source: import.meta.url
  })
  .add({
    _server: fastify,
    _isRunning: false,
    
    // Lifecycle methods
    async start(options) { /* ... */ },
    async stop() { /* ... */ },
    isRunning() { /* ... */ },
    
    // Route methods
    get(path, handler, options) { /* ... */ },
    post(path, handler, options) { /* ... */ },
    // ... other HTTP methods
    
    // Middleware
    use(middleware) { /* ... */ },
    useRoute(path, middleware) { /* ... */ },
    
    // Error handling
    setErrorHandler(handler) { /* ... */ },
    
    // Server info
    getAddress() { /* ... */ },
    getPort() { /* ... */ },
    
    // Batch registration
    registerRoutes(routes) { /* ... */ },
    registerMyceliaRoutes(routes) { /* ... */ },
    
    // Mycelia integration (single)
    registerMyceliaRoute(routePath, httpMethod, httpPath, options) { /* ... */ },
    registerMyceliaCommand(commandName, httpMethod, httpPath, options) { /* ... */ },
    registerMyceliaQuery(queryName, httpMethod, httpPath, options) { /* ... */ }
  });
}
```

### Batch Registration Implementation

```javascript
registerRoutes(routes) {
  for (const route of routes) {
    const method = route.method.toLowerCase();
    if (method === 'all') {
      this.all(route.path, route.handler, route.options);
    } else if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
      this[method](route.path, route.handler, route.options);
    } else {
      throw new Error(`Unsupported HTTP method: ${route.method}`);
    }
  }
  return this;
}

registerMyceliaRoutes(routes) {
  for (const route of routes) {
    if (route.type === 'route') {
      this.registerMyceliaRoute(route.myceliaPath, route.httpMethod, route.httpPath, route.options);
    } else if (route.type === 'command') {
      this.registerMyceliaCommand(route.myceliaPath, route.httpMethod, route.httpPath, route.options);
    } else if (route.type === 'query') {
      this.registerMyceliaQuery(route.myceliaPath, route.httpMethod, route.httpPath, route.options);
    }
  }
  return this;
}
```

### Fastify-Specific Considerations

1. **Plugin System**: Fastify uses plugins; middleware should be registered as plugins
2. **Request/Response**: Fastify has its own request/response objects
3. **Async Support**: Fastify natively supports async handlers
4. **Validation**: Fastify has built-in schema validation
5. **Logging**: Fastify has built-in logging

### Mycelia Integration Example

```javascript
registerMyceliaRoute(routePath, httpMethod, httpPath, options) {
  const router = subsystem.find('router');
  const messages = subsystem.find('messages');
  
  this._server[httpMethod.toLowerCase()](httpPath, async (request, reply) => {
    // Transform HTTP request to Mycelia message
    const message = messages.create(routePath, request.body, {
      params: request.params,
      query: request.query,
      headers: request.headers
    });
    
    // Route message through Mycelia
    const result = await router.route(message);
    
    // Transform Mycelia response to HTTP response
    reply.code(200).send(result.body);
  });
  
  return this;
}
```

---

## useExpressServer Hook Design

### Hook Metadata

```javascript
export const useExpressServer = createHook({
  kind: 'server',
  overwrite: false,
  required: ['router', 'messages'],  // For Mycelia integration
  attach: true,
  contract: 'server',
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Implementation
  }
});
```

### Configuration

Reads configuration from `ctx.config.server`:

```javascript
{
  port: number,           // Default: 3000
  host: string,           // Default: '0.0.0.0'
  express: {              // Express-specific options
    json: boolean,        // Enable JSON body parser
    urlencoded: boolean,   // Enable URL-encoded body parser
    // ... other Express options
  },
  debug: boolean          // Enable debug logging
}
```

### Implementation Structure

```javascript
fn: (ctx, api, subsystem) => {
  const express = require('express');
  const app = express();
  
  // Apply Express configuration
  if (config.express?.json !== false) {
    app.use(express.json());
  }
  if (config.express?.urlencoded !== false) {
    app.use(express.urlencoded({ extended: true }));
  }
  
  // Create facet with all required methods
  return new Facet('server', {
    contract: 'server',
    attach: true,
    source: import.meta.url
  })
  .add({
    _server: app,
    _httpServer: null,  // HTTP server instance (created on start)
    _isRunning: false,
    
    // Lifecycle methods
    async start(options) { /* ... */ },
    async stop() { /* ... */ },
    isRunning() { /* ... */ },
    
    // Route methods
    get(path, handler, options) { /* ... */ },
    post(path, handler, options) { /* ... */ },
    // ... other HTTP methods
    
    // Middleware
    use(middleware) { /* ... */ },
    useRoute(path, middleware) { /* ... */ },
    
    // Error handling
    setErrorHandler(handler) { /* ... */ },
    
    // Server info
    getAddress() { /* ... */ },
    getPort() { /* ... */ },
    
    // Batch registration
    registerRoutes(routes) { /* ... */ },
    registerMyceliaRoutes(routes) { /* ... */ },
    
    // Mycelia integration (single)
    registerMyceliaRoute(routePath, httpMethod, httpPath, options) { /* ... */ },
    registerMyceliaCommand(commandName, httpMethod, httpPath, options) { /* ... */ },
    registerMyceliaQuery(queryName, httpMethod, httpPath, options) { /* ... */ }
  });
}
```

### Express-Specific Considerations

1. **Middleware**: Express uses middleware functions with `(req, res, next)` signature
2. **Request/Response**: Express uses Node.js `req` and `res` objects
3. **Async Support**: Express requires explicit async error handling
4. **HTTP Server**: Express app needs to be wrapped in `http.createServer()` for listening
5. **Body Parsing**: Express requires explicit body parser middleware

### Mycelia Integration Example

```javascript
registerMyceliaRoute(routePath, httpMethod, httpPath, options) {
  const router = subsystem.find('router');
  const messages = subsystem.find('messages');
  
  this._server[httpMethod.toLowerCase()](httpPath, async (req, res, next) => {
    try {
      // Transform HTTP request to Mycelia message
      const message = messages.create(routePath, req.body, {
        params: req.params,
        query: req.query,
        headers: req.headers
      });
      
      // Route message through Mycelia
      const result = await router.route(message);
      
      // Transform Mycelia response to HTTP response
      res.status(200).json(result.body);
    } catch (error) {
      next(error);
    }
  });
  
  return this;
}
```

---

## Usage Examples

### ServerSubsystem Setup

```javascript
// ServerSubsystem (manages HTTP server)
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',  // or 'express' - determines which hook to use
      port: 3000,
      host: '0.0.0.0',
      fastify: {
        logger: true
      }
      // OR express: { json: true, urlencoded: true }
    }
  }
});

// ServerSubsystem setup:
// - Extends BaseSubsystem
// - Selects useFastifyServer or useExpressServer based on config.server.type
// - In onInit(), registers routes using subsystem.registerRoute() that handle registration messages
// - Manages the HTTP server lifecycle

await serverSubsystem
  .use(useRouter)
  .use(useMessages)
  .use(selectServerHook(serverSubsystem.ctx.config.server))  // useFastifyServer or useExpressServer
  .build();

// After build, onInit() has registered routes:
// - route/register-mycelia
// - route/register-command
// - route/register-query
// - route/register-batch

// Start server
await serverSubsystem.server.start({ port: 3000 });
```

### Other Subsystems Registering Routes

```javascript
// User subsystem (registers routes via messages to ServerSubsystem)
const userSubsystem = new BaseSubsystem('user', {
  ms: messageSystem,
  config: {
    serverRoutes: {
      debug: true  // Enable debug logging
    }
  }
});

await userSubsystem
  .use(useRouter)
  .use(useMessages)
  .use(useServerRoutes)  // Provides helper methods to send registration messages
  .onInit(async () => {
    // Register routes by sending messages to ServerSubsystem
    await userSubsystem.serverRoutes.registerMyceliaRoute(
      'user://get/{id}',
      'GET',
      '/api/users/:id'
    );
    
    await userSubsystem.serverRoutes.registerMyceliaCommand(
      'createUser',
      'POST',
      '/api/users'
    );
    
    // Or register multiple at once
    await userSubsystem.serverRoutes.registerMyceliaRoutes([
      { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
      { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
      { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
    ]);
  })
  .build();
```

### Direct Server Access (ServerSubsystem Only)

```javascript
// Only ServerSubsystem should directly access server facet
serverSubsystem.server.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

// Batch registration (direct access)
serverSubsystem.server.registerRoutes([
  { method: 'GET', path: '/health', handler: healthCheck },
  { method: 'GET', path: '/status', handler: statusCheck }
]);
```

### Configuration-Based Hook Selection

```javascript
// ServerSubsystem selects hook based on config
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',  // or 'express'
      port: 3000,
      // ... other config
    }
  }
});

// Internally, ServerSubsystem uses:
// - useFastifyServer if config.server.type === 'fastify'
// - useExpressServer if config.server.type === 'express'
```

### Middleware Example

```javascript
// Global middleware
apiSubsystem.server.use((req, res, next) => {
  console.log('Request:', req.method, req.path);
  next();
});

// Route-specific middleware
apiSubsystem.server.useRoute('/api/*', (req, res, next) => {
  // Authentication middleware
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Error Handling

```javascript
apiSubsystem.server.setErrorHandler((error, req, res) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message 
  });
});
```

---

## Design Decisions

### 1. Contract vs. Adapter Pattern

**Decision**: Use FacetContract for interface definition
- **Rationale**: Leverages existing Mycelia contract system
- **Benefits**: Automatic validation, clear interface, adapter support
- **Trade-offs**: Requires contract registration

### 2. Required Dependencies

**Decision**: 
- Server hooks require `router` and `messages` facets
- useServerRoutes requires `router`, `messages`, and `listeners` facets
- **Rationale**: Needed for Mycelia integration and message handling
- **Benefits**: Ensures integration capabilities are available
- **Trade-offs**: Subsystems must use these hooks

### 2a. ServerSubsystem Architecture

**Decision**: Dedicated ServerSubsystem that manages HTTP server and handles registration messages
- **Rationale**: Centralizes server management and follows single responsibility principle
- **Benefits**: 
  - Clear separation: ServerSubsystem manages server, others register routes
  - Configuration-based hook selection (Fastify vs Express)
  - Routes handle registration messages
- **Trade-offs**: Requires dedicated subsystem

### 2b. useServerRoutes Hook Purpose

**Decision**: `useServerRoutes` only constructs and sends messages, does NOT handle registration
- **Rationale**: Maintains loose coupling and follows Mycelia's message-driven architecture
- **Benefits**: 
  - Subsystems don't need direct access to server facet
  - Routes can be registered from any subsystem via messages
  - Better separation of concerns
  - ServerSubsystem handles all registration logic
- **Trade-offs**: Slight overhead of message routing (minimal)

### 3. Internal Server Storage

**Decision**: Store server instance in `_server` property
- **Rationale**: Allows implementation-specific access if needed
- **Benefits**: Flexibility for advanced use cases
- **Trade-offs**: Exposes implementation details

### 4. Mycelia Integration Methods

**Decision**: Provide dedicated methods for Mycelia integration
- **Rationale**: Simplifies common use case
- **Benefits**: Easy integration, consistent API
- **Trade-offs**: Additional methods to maintain

### 4a. Batch Registration

**Decision**: Provide batch registration methods
- **Rationale**: Common use case to register multiple routes at once
- **Benefits**: 
  - More efficient than individual registrations
  - Atomic operation (all or nothing)
  - Better performance
- **Trade-offs**: Slightly more complex API

### 5. Lifecycle Management

**Decision**: Separate `start()` and `stop()` methods
- **Rationale**: Clear lifecycle control
- **Benefits**: Explicit server management
- **Trade-offs**: Must remember to start/stop

---

## Implementation Considerations

### 1. Request/Response Transformation

Both implementations need to:
- Transform HTTP requests to Mycelia messages
- Transform Mycelia responses to HTTP responses
- Handle path parameters, query strings, headers
- Support request/response body transformation

### 2. Error Handling

- Fastify: Built-in error handling with `reply.sendError()`
- Express: Requires explicit error middleware
- Contract: Standardized error handler interface

### 3. Async Support

- Fastify: Native async support
- Express: Requires explicit async error handling (use wrapper)

### 4. Middleware

- Fastify: Plugin-based middleware
- Express: Function-based middleware
- Contract: Unified `use()` and `useRoute()` interface

### 5. Testing

- Both implementations should be testable
- Mock server instances for unit tests
- Integration tests for full server functionality

---

## Future Enhancements

1. **WebSocket Support**: Add WebSocket capabilities to contract
2. **HTTP/2 Support**: Support for HTTP/2 protocol
3. **Server-Sent Events**: SSE support for real-time updates
4. **GraphQL Integration**: GraphQL endpoint support
5. **Rate Limiting**: Built-in rate limiting middleware
6. **CORS Support**: CORS configuration
7. **Compression**: Response compression support
8. **Static File Serving**: Static file serving capabilities

---

## Summary

The ServerContract design provides:

✅ **Unified Interface**: Single API for both Fastify and Express
✅ **Contract Validation**: Automatic validation of implementations
✅ **Message-Driven Architecture**: Routes registered via messages (useServerRoutes)
✅ **Batch Registration**: Register multiple routes at once
✅ **Mycelia Integration**: Seamless integration with message system
✅ **Lifecycle Management**: Clear start/stop lifecycle
✅ **Middleware Support**: Flexible middleware registration
✅ **Error Handling**: Standardized error handling
✅ **Interchangeability**: Easy swapping between implementations
✅ **Loose Coupling**: Subsystems register routes via messages, not direct access

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ServerSubsystem                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ useFastify   │  │ useRouter    │  │ useMessages  │     │
│  │ Server OR    │  │              │  │              │     │
│  │ useExpress   │  │              │  │              │     │
│  │ Server       │  │              │  │              │     │
│  │ (based on    │  │              │  │              │     │
│  │  config)     │  │              │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                 │              │
│         └──────────────────┴─────────────────┘              │
│                                                              │
│  Routes registered:                                         │
│  - server://route/register-mycelia                          │
│  - server://route/register-command                         │
│  - server://route/register-query                            │
│  - server://route/register-batch                            │
│                                                              │
│  These routes call server facet methods:                    │
│  - server.registerMyceliaRoute()                           │
│  - server.registerMyceliaCommand()                         │
│  - server.registerMyceliaQuery()                           │
│  - server.registerMyceliaRoutes()                          │
└────────────────────────────────────────────────────────────┘
                          ▲
                          │ Messages
                          │ (server://route/register-*)
                          │
┌─────────────────────────┴─────────────────────────────────┐
│              Other Subsystems                              │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ UserService  │  │ ProductService│                     │
│  │              │  │              │                      │
│  │ useServer    │  │ useServer    │                      │
│  │ Routes       │  │ Routes       │                      │
│  │              │  │              │                      │
│  │ Provides:    │  │ Provides:    │                      │
│  │ - register   │  │ - register   │                      │
│  │   Mycelia    │  │   Mycelia    │                      │
│  │   Route()    │  │   Route()    │                      │
│  │ - register   │  │ - register   │                      │
│  │   Mycelia    │  │   Mycelia    │                      │
│  │   Command()  │  │   Command()  │                      │
│  │ - register   │  │ - register   │                      │
│  │   Mycelia    │  │   Mycelia    │                      │
│  │   Query()    │  │   Query()    │                      │
│  │ - register   │  │ - register   │                      │
│  │   Mycelia    │  │   Mycelia    │                      │
│  │   Routes()   │  │   Routes()   │                      │
│  └──────┬───────┘  └──────┬───────┘                      │
│         │                  │                              │
│         └──────────────────┘                              │
│         Construct messages and send to ServerSubsystem      │
│         (via router.route())                               │
└────────────────────────────────────────────────────────────┘
```

This design enables subsystems to use HTTP server capabilities without being tied to a specific implementation, while maintaining full integration with Mycelia's message-driven architecture. Routes are registered via messages, ensuring loose coupling and better separation of concerns.

