# useServerRoutes Hook

## Overview

The `useServerRoutes` hook is a helper hook for **other subsystems** (not the ServerSubsystem) that want to register their own routes on the ServerSubsystem. It provides helper methods that construct and send messages to the ServerSubsystem to register routes. It does NOT handle route registration itself - it only constructs messages.

**Key Features:**
- **Message-Driven Registration**: Routes are registered via messages to ServerSubsystem
- **Helper Methods**: Convenient methods for registering routes, commands, and queries
- **Batch Registration**: Support for registering multiple routes at once
- **Decoupled Architecture**: Subsystems don't need direct access to ServerSubsystem

## Hook Metadata

```javascript
{
  kind: 'serverRoutes',
  overwrite: false,
  required: ['router', 'messages'],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'serverRoutes'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing serverRoutes facet
- **`required`**: `['router', 'messages']` - Requires router and messages facets for constructing and sending messages
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.serverRoutes`
- **`source`**: `import.meta.url` - Source file location for debugging

## Dependencies

**Required Facets:**
- **`router`**: For routing messages to ServerSubsystem
- **`messages`**: For creating registration messages

**Note:** The ServerSubsystem name is always `'server'`. Messages are sent to `server://route/register-*` paths.

## Configuration

The hook reads configuration from `ctx.config.serverRoutes`:

```javascript
{
  debug: boolean  // Enable debug logging
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

## Facet Methods

### `registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options)`

Register a Mycelia route as HTTP endpoint. Constructs and sends message to ServerSubsystem.

**Signature:**
```javascript
async registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options = {}) => Promise<Object>
```

**Parameters:**
- `myceliaPath` (string): Mycelia route path (e.g., `'user://get/{id}'`)
- `httpMethod` (string): HTTP method (`'GET'`, `'POST'`, etc.)
- `httpPath` (string): HTTP path (e.g., `'/api/users/:id'`)
- `options` (object, optional): Optional transformation and middleware options

**Returns:** `Promise<Object>` - Result from ServerSubsystem route handler
  - `success` (boolean): Whether registration was successful
  - `registered` (object): Registration details
  - `error` (string, optional): Error message if registration failed

**Example:**
```javascript
const result = await subsystem.serverRoutes.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id'
);

if (result.success) {
  console.log('Route registered:', result.registered);
}
```

### `registerMyceliaCommand(commandName, httpMethod, httpPath, options)`

Register a Mycelia command as HTTP endpoint. Constructs and sends message to ServerSubsystem.

**Signature:**
```javascript
async registerMyceliaCommand(commandName, httpMethod, httpPath, options = {}) => Promise<Object>
```

**Parameters:**
- `commandName` (string): Command name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Optional options

**Returns:** `Promise<Object>` - Result from ServerSubsystem route handler

**Example:**
```javascript
const result = await subsystem.serverRoutes.registerMyceliaCommand(
  'createUser',
  'POST',
  '/api/users'
);
```

### `registerMyceliaQuery(queryName, httpMethod, httpPath, options)`

Register a Mycelia query as HTTP endpoint. Constructs and sends message to ServerSubsystem.

**Signature:**
```javascript
async registerMyceliaQuery(queryName, httpMethod, httpPath, options = {}) => Promise<Object>
```

**Parameters:**
- `queryName` (string): Query name
- `httpMethod` (string): HTTP method
- `httpPath` (string): HTTP path
- `options` (object, optional): Optional options

**Returns:** `Promise<Object>` - Result from ServerSubsystem route handler

**Example:**
```javascript
const result = await subsystem.serverRoutes.registerMyceliaQuery(
  'getUserStats',
  'GET',
  '/api/users/stats'
);
```

### `registerMyceliaRoutes(routes)`

Register multiple Mycelia routes/commands/queries at once. Constructs and sends batch message to ServerSubsystem.

**Signature:**
```javascript
async registerMyceliaRoutes(routes) => Promise<Object>
```

**Parameters:**
- `routes` (array): Array of route definitions
  - Each route: `{ type: 'route'|'command'|'query', ... }`
  - For `type: 'route'`: `{ type: 'route', myceliaPath: string, httpMethod: string, httpPath: string, options?: object }`
  - For `type: 'command'`: `{ type: 'command', commandName: string, httpMethod: string, httpPath: string, options?: object }`
  - For `type: 'query'`: `{ type: 'query', queryName: string, httpMethod: string, httpPath: string, options?: object }`

**Returns:** `Promise<Object>` - Result from ServerSubsystem route handler
  - `success` (boolean): Whether registration was successful
  - `registered` (number): Number of routes registered
  - `error` (string, optional): Error message if registration failed

**Example:**
```javascript
const result = await subsystem.serverRoutes.registerMyceliaRoutes([
  { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
  { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
  { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
]);

if (result.success) {
  console.log(`Registered ${result.registered} routes`);
}
```

## Usage

### Basic Setup

```javascript
import { BaseSubsystem } from './base-subsystem/base.subsystem.mycelia.js';
import { useRouter } from './hooks/router/use-router.mycelia.js';
import { useMessages } from './hooks/messages/use-messages.mycelia.js';
import { useServerRoutes } from './hooks/server-routes/use-server-routes.mycelia.js';

const userSubsystem = new BaseSubsystem('user', {
  ms: messageSystem,
  config: {
    serverRoutes: {
      debug: true
    }
  }
});

await userSubsystem
  .use(useRouter)
  .use(useMessages)
  .use(useServerRoutes)
  .onInit(async () => {
    // Register routes via messages (sends to ServerSubsystem)
    await userSubsystem.serverRoutes.registerMyceliaRoute(
      'user://get/{id}',
      'GET',
      '/api/users/:id'
    );
  })
  .build();
```

### Registering Routes in onInit

```javascript
class UserSubsystem extends BaseSubsystem {
  async onInit() {
    // Register routes via messages to ServerSubsystem
    await this.serverRoutes.registerMyceliaRoute(
      'user://get/{id}',
      'GET',
      '/api/users/:id'
    );
    
    await this.serverRoutes.registerMyceliaCommand(
      'createUser',
      'POST',
      '/api/users'
    );
    
    await this.serverRoutes.registerMyceliaQuery(
      'getUserStats',
      'GET',
      '/api/users/stats'
    );
  }
}
```

### Batch Registration

```javascript
async onInit() {
  // Register multiple routes at once
  await this.serverRoutes.registerMyceliaRoutes([
    { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
    { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
    { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
  ]);
}
```

## Message Flow

When a subsystem calls `serverRoutes.registerMyceliaRoute()`:

1. **Message Construction**: `useServerRoutes` constructs a message with path `server://route/register-mycelia`
2. **Message Routing**: `router.route(msg)` routes the message to the ServerSubsystem
3. **Message Acceptance**: ServerSubsystem's `accept()` method receives the message
4. **Message Processing**: ServerSubsystem's `processMessage()` matches the route pattern `route/register-mycelia`
5. **Handler Execution**: The route handler (registered in `onInit()`) executes
6. **Server Registration**: Handler calls `server.registerMyceliaRoute()` on the server facet
7. **Response**: Handler returns result, which flows back through the message system

## Error Handling

The hook handles errors gracefully:

- **Missing ServerSubsystem**: If ServerSubsystem is not available, routing will fail
- **Invalid routes**: ServerSubsystem validates routes and returns errors
- **Network errors**: Message routing errors are caught and returned

**Example:**
```javascript
try {
  const result = await subsystem.serverRoutes.registerMyceliaRoute(
    'user://get/{id}',
    'GET',
    '/api/users/:id'
  );
  
  if (!result.success) {
    console.error('Registration failed:', result.error);
  }
} catch (error) {
  console.error('Error registering route:', error);
}
```

## Debug Logging

Enable debug logging to see route registration:

```javascript
const subsystem = new BaseSubsystem('user', {
  ms: messageSystem,
  config: {
    serverRoutes: {
      debug: true  // Enable debug logging
    }
  }
});
```

Debug messages include:
- Route registration attempts
- Command registration attempts
- Query registration attempts
- Batch registration attempts

## Best Practices

1. **Register in onInit**: Register routes in the `onInit()` lifecycle method
2. **Use batch registration**: Use `registerMyceliaRoutes()` for multiple routes
3. **Check results**: Always check `result.success` after registration
4. **Handle errors**: Handle registration errors gracefully
5. **Ensure ServerSubsystem exists**: Make sure ServerSubsystem is built before registering routes

## See Also

- [ServerSubsystem](../models/server-subsystem/SERVER-SUBSYSTEM.md) - Subsystem that handles route registration messages
- [ServerContract](../models/facet-contract/SERVER-CONTRACT.md) - Server contract interface
- [useFastifyServer](../server/USE-FASTIFY-SERVER.md) - Fastify server implementation
- [useExpressServer](../server/USE-EXPRESS-SERVER.md) - Express server implementation


