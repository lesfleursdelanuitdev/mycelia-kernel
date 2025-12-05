# ServerSubsystem

## Overview

The **ServerSubsystem** is a dedicated subsystem that extends `BaseSubsystem` and manages the HTTP server. It supports multiple web server adapters (Fastify, Express, and Hono) and registers routes (using `subsystem.registerRoute()`) that handle route registration messages from other subsystems.

**Key Features:**
- **HTTP Server Management**: Manages HTTP server lifecycle (start, stop)
- **Multiple Adapter Support**: Supports Fastify, Express, and Hono web frameworks
- **Configuration-Based Hook Selection**: Chooses adapter based on config
- **Message-Driven Route Registration**: Handles route registration messages from other subsystems
- **Mycelia Integration**: Exposes Mycelia routes, commands, and queries as HTTP endpoints
- **Always Named 'server'**: Subsystem name is always `'server'` for consistent routing

## Web Server Adapters

The ServerSubsystem supports three web server adapters. See [Web Server Adapters](./WEB-SERVER-ADAPTERS.md) for detailed information on:
- Available adapters (Fastify, Express, Hono)
- Configuration options
- Usage examples
- Adapter comparison
- Migration guide

## Class Definition

```javascript
import { ServerSubsystem } from './server-subsystem/server.subsystem.mycelia.js';

const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',  // or 'express' or 'hono'
      port: 3000,
      host: '0.0.0.0'
    }
  }
});
```

## Constructor

### Signature

```javascript
new ServerSubsystem(name = 'server', options = {})
```

### Parameters

#### `name` (string, default: `'server'`)

The subsystem name. **Must be `'server'`**.

**Validation:**
- Must be exactly `'server'`
- Throws `Error` if invalid

#### `options` (object, required)

Configuration options for the subsystem.

**Required:**
- `ms` (MessageSystem): MessageSystem instance (required)

**Optional:**
- `config.server.type` (string, default: `'fastify'`): Server type - `'fastify'` or `'express'`
- `config.server.port` (number, default: `3000`): Server port
- `config.server.host` (string, default: `'0.0.0.0'`): Server host
- `config.server.fastify` (object, optional): Fastify-specific options (if using Fastify)
- `config.server.express` (object, optional): Express-specific options (if using Express)
- `debug` (boolean, default: `false`): Enable debug logging

**Example:**
```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',
      port: 3000,
      host: '0.0.0.0',
      fastify: {
        logger: true
      }
    }
  },
  debug: true
});
```

## Configuration-Based Hook Selection

The ServerSubsystem automatically selects the server hook based on `config.server.type`:

- **`'fastify'`** (default): Uses `useFastifyServer`
- **`'express'`**: Uses `useExpressServer`

**Example - Fastify:**
```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',
      port: 3000,
      fastify: {
        logger: true
      }
    }
  }
});
```

**Example - Express:**
```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'express',
      port: 3000,
      express: {
        json: true,
        urlencoded: true
      }
    }
  }
});
```

## Lifecycle Methods

### `onInit()`

Initializes the subsystem and registers routes that handle route registration messages from other subsystems.

**Signature:**
```javascript
async onInit() => Promise<void>
```

**Behavior:**
- Registers route handlers for:
  - `route/register-mycelia` - Handles Mycelia route registration
  - `route/register-command` - Handles command registration
  - `route/register-query` - Handles query registration
  - `route/register-batch` - Handles batch registration

**Example:**
```javascript
class CustomServerSubsystem extends ServerSubsystem {
  async onInit() {
    await super.onInit();  // Register default routes
    
    // Add custom initialization
    // ...
  }
}
```

## Route Patterns

The ServerSubsystem registers routes using `subsystem.registerRoute()` with these patterns:

- **`route/register-mycelia`** - Handles `registerMyceliaRoute` messages
- **`route/register-command`** - Handles `registerMyceliaCommand` messages
- **`route/register-query`** - Handles `registerMyceliaQuery` messages
- **`route/register-batch`** - Handles batch registration messages

**Note:** These are **local route patterns** within the ServerSubsystem. Messages sent to `server://route/register-mycelia` will be routed to the ServerSubsystem, and then matched against the local route pattern `route/register-mycelia`.

## Message Formats

### Register Mycelia Route

```javascript
{
  path: 'server://route/register-mycelia',
  body: {
    myceliaPath: 'user://get/{id}',
    httpMethod: 'GET',
    httpPath: '/api/users/:id',
    options: {
      transformRequest: (req) => { /* ... */ },
      transformResponse: (result) => { /* ... */ },
      middleware: []
    }
  }
}
```

### Register Mycelia Command

```javascript
{
  path: 'server://route/register-command',
  body: {
    commandName: 'createUser',
    httpMethod: 'POST',
    httpPath: '/api/users',
    options: { /* ... */ }
  }
}
```

### Register Mycelia Query

```javascript
{
  path: 'server://route/register-query',
  body: {
    queryName: 'getUserStats',
    httpMethod: 'GET',
    httpPath: '/api/users/stats',
    options: { /* ... */ }
  }
}
```

### Batch Registration

```javascript
{
  path: 'server://route/register-batch',
  body: {
    routes: [
      { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
      { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' },
      { type: 'query', queryName: 'getUserStats', httpMethod: 'GET', httpPath: '/api/users/stats' }
    ]
  }
}
```

## Usage

### Basic Setup

```javascript
import { ServerSubsystem } from './server-subsystem/server.subsystem.mycelia.js';
import { MessageSystem } from './message-system/message-system.mycelia.js';

const messageSystem = new MessageSystem('main-system');
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',
      port: 3000,
      host: '0.0.0.0'
    }
  }
});

await serverSubsystem.build();

// Start the server
await serverSubsystem.server.start({ port: 3000 });
```

### Starting and Stopping the Server

```javascript
// Start the server
await serverSubsystem.server.start({ 
  port: 3000,
  host: '0.0.0.0',
  callback: () => {
    console.log('Server started');
  }
});

// Check if server is running
if (serverSubsystem.server.isRunning()) {
  console.log('Server is active');
}

// Get server info
const address = serverSubsystem.server.getAddress();
const port = serverSubsystem.server.getPort();
console.log(`Server running at ${address}:${port}`);

// Stop the server
await serverSubsystem.server.stop();
```

### Registering Routes Directly

While routes are typically registered via messages from other subsystems, you can also register routes directly:

```javascript
// Register a simple HTTP route
await serverSubsystem.server.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// Register a Mycelia route
await serverSubsystem.server.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id'
);
```

### Using with Other Subsystems

Other subsystems can register routes using the `useServerRoutes` hook:

```javascript
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

## Route Handler Signature

Route handlers in ServerSubsystem follow the BaseSubsystem route handler signature:

```javascript
async (message, params, options) => result
```

- `message` - The incoming message with `body` containing registration data
- `params` - Route parameters extracted from the message path (empty object `{}` for static routes)
- `options` - Route options (frozen object with callerId, timeout, etc.)
- Returns: Result object with `success` and optional data

**Note:** The `options` parameter is a frozen object that contains routing metadata. It should not be modified by handlers.

## Error Handling

The ServerSubsystem handles errors gracefully:

- **Invalid server type**: Throws error if server type is not 'fastify' or 'express'
- **Missing server facet**: Returns error if server facet is not found
- **Invalid routes**: Validates routes and returns errors
- **Server errors**: Logs errors and provides error handlers

## Best Practices

1. **Use consistent naming**: Always name the subsystem `'server'`
2. **Register routes before starting**: Register all routes before calling `start()`
3. **Use message-driven registration**: Prefer `useServerRoutes` for other subsystems
4. **Handle errors**: Always check registration results
5. **Configure appropriately**: Set appropriate port, host, and server-specific options

## See Also

- [BaseSubsystem](../BASE-SUBSYSTEM.md) - Base class for all subsystems
- [ServerContract](../facet-contract/SERVER-CONTRACT.md) - Server contract interface
- [useFastifyServer](../../hooks/server/USE-FASTIFY-SERVER.md) - Fastify server implementation
- [useExpressServer](../../hooks/server/USE-EXPRESS-SERVER.md) - Express server implementation
- [useServerRoutes](../../hooks/server-routes/USE-SERVER-ROUTES.md) - Helper hook for route registration


