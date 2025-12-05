# Web Server Adapters for Mycelia Kernel

The Mycelia Kernel `ServerSubsystem` supports multiple web server adapters, allowing you to choose the HTTP framework that best fits your needs. All adapters implement the same `ServerContract` interface, providing a consistent API regardless of the underlying framework.

## Available Adapters

Mycelia Kernel currently supports three web server adapters:

1. **Fastify** - High-performance, schema-based web framework
2. **Express** - Minimal and flexible Node.js web framework
3. **Hono** - Ultrafast web framework for the Edge

## Installation

All adapters are included as dependencies in the Mycelia Kernel package:

```json
{
  "dependencies": {
    "fastify": "^4.29.1",
    "express": "^4.21.2",
    "hono": "^4.6.11",
    "@hono/node-server": "^1.19.6"
  }
}
```

## Configuration

The `ServerSubsystem` accepts a configuration object that specifies which adapter to use:

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
import { ServerSubsystem } from './models/server-subsystem/server.subsystem.mycelia.js';

const messageSystem = new MessageSystem('my-app', { debug: false });
await messageSystem.bootstrap();

const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',  // or 'express' or 'hono'
      port: 3000,
      host: '0.0.0.0'
    }
  },
  debug: false
});

await messageSystem.registerSubsystem(serverSubsystem);
```

### Configuration Options

- **`type`** (string, default: `'fastify'`): The server adapter to use. Valid values: `'fastify'`, `'express'`, or `'hono'`
- **`port`** (number, default: `3000`): The port number to listen on
- **`host`** (string, default: `'0.0.0.0'`): The host address to bind to
- **`debug`** (boolean, default: `false`): Enable debug logging

### Framework-Specific Configuration

Each adapter supports additional framework-specific configuration options:

#### Fastify

```javascript
config: {
  server: {
    type: 'fastify',
    port: 3000,
    host: '0.0.0.0',
    fastify: {
      // Fastify-specific options
      logger: true,
      // ... other Fastify options
    }
  }
}
```

#### Express

```javascript
config: {
  server: {
    type: 'express',
    port: 3000,
    host: '0.0.0.0',
    express: {
      // Express-specific options
      json: true,  // Enable JSON body parser (default: true)
      urlencoded: true  // Enable URL-encoded body parser (default: true)
    }
  }
}
```

#### Hono

```javascript
config: {
  server: {
    type: 'hono',
    port: 3000,
    host: '0.0.0.0',
    hono: {
      // Hono-specific options
      // ... Hono app options
    }
  }
}
```

## Starting the Server

After registering the `ServerSubsystem`, you can start the HTTP server:

```javascript
const serverFacet = serverSubsystem.find('server');

await serverFacet.start({
  host: '127.0.0.1',
  port: 3000
});

console.log(`Server running on ${serverFacet.getAddress()}`);
```

## Registering Routes

All adapters support the same route registration API. Routes can be registered via Mycelia messages or directly through the server facet.

### Registering via Messages

```javascript
import { Message } from './models/message/message.mycelia.js';
import { SERVER_ROUTES } from './models/server-subsystem/server.routes.def.mycelia.js';

// Register a Mycelia route as HTTP endpoint
const registerMessage = new Message(SERVER_ROUTES.registerMycelia.path, {
  myceliaPath: 'my-service://get/status',
  httpMethod: 'GET',
  httpPath: '/status'
}, {
  processImmediately: true
});

await messageSystem.send(registerMessage);
```

### Registering Directly

```javascript
const serverFacet = serverSubsystem.find('server');

// Register a Mycelia route
await serverFacet.registerMyceliaRoute(
  'my-service://get/status',  // Mycelia path
  'GET',                       // HTTP method
  '/status'                    // HTTP path
);

// Register a command
await serverFacet.registerMyceliaCommand(
  'my-service://command/createItem',
  'POST',
  '/items'
);

// Register a query
await serverFacet.registerMyceliaQuery(
  'my-service://query/getItems',
  'GET',
  '/api/items'
);
```

## Path Parameters

All adapters support path parameters using the `:param` syntax:

```javascript
// Register route with path parameter
await serverFacet.registerMyceliaRoute(
  'my-service://get/user/{id}',
  'GET',
  '/users/:id'  // Express/Fastify/Hono all use :id syntax
);

// The handler will receive the parameter
router.registerRoute('my-service://get/user/{id}', async (message, params) => {
  const { id } = params;
  return { success: true, userId: id };
});
```

## Query Parameters

Query parameters are automatically extracted and made available in the message metadata:

```javascript
router.registerRoute('my-service://get/search', async (message) => {
  const meta = message.getMeta();
  const query = meta.getCustomMutableField('query');
  // query = { q: 'search term', page: '1' }
  return { success: true, query };
});
```

## Batch Registration

You can register multiple routes at once:

```javascript
const batchMessage = new Message(SERVER_ROUTES.registerBatch.path, {
  routes: [
    {
      type: 'route',
      myceliaPath: 'my-service://get/status',
      httpMethod: 'GET',
      httpPath: '/status'
    },
    {
      type: 'command',
      commandName: 'my-service://command/createItem',
      httpMethod: 'POST',
      httpPath: '/items'
    },
    {
      type: 'query',
      queryName: 'my-service://query/getItems',
      httpMethod: 'GET',
      httpPath: '/api/items'
    }
  ]
}, {
  processImmediately: true
});

await messageSystem.send(batchMessage);
```

## Adapter Comparison

### Fastify

**Pros:**
- High performance (one of the fastest Node.js frameworks)
- Built-in JSON schema validation
- Plugin ecosystem
- TypeScript support

**Best for:**
- High-performance APIs
- Applications requiring schema validation
- Microservices with strict performance requirements

**Example:**
```javascript
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
```

### Express

**Pros:**
- Most popular Node.js framework
- Extensive middleware ecosystem
- Simple and flexible
- Large community

**Best for:**
- Applications requiring extensive middleware
- Teams familiar with Express
- Legacy Express applications being migrated

**Example:**
```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'express',
      port: 3000,
      host: '0.0.0.0'
    }
  }
});
```

### Hono

**Pros:**
- Ultrafast performance (optimized for Edge)
- Small bundle size
- Modern API (Fetch API compatible)
- Works in Edge environments (Cloudflare Workers, Deno, Bun)

**Best for:**
- Edge computing deployments
- Applications requiring minimal bundle size
- Modern JavaScript/TypeScript projects
- Cloudflare Workers or other Edge platforms

**Example:**
```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'hono',
      port: 3000,
      host: '0.0.0.0'
    }
  }
});
```

## Server Lifecycle

All adapters support starting and stopping the server:

```javascript
const serverFacet = serverSubsystem.find('server');

// Start server
await serverFacet.start({ host: '127.0.0.1', port: 3000 });

// Check if running
console.log(serverFacet.isRunning()); // true

// Get server address
console.log(serverFacet.getAddress()); // http://127.0.0.1:3000
console.log(serverFacet.getPort());    // 3000

// Stop server
await serverFacet.stop();
console.log(serverFacet.isRunning()); // false
```

## Error Handling

All adapters handle errors consistently:

- **404 Not Found**: Returned when no route matches the request
- **500 Internal Server Error**: Returned when a handler throws an error or returns `{ success: false, statusCode: 500 }`

```javascript
// Handler returning error
router.registerRoute('my-service://post/error', async () => {
  return {
    success: false,
    statusCode: 500,
    error: 'Something went wrong'
  };
});
```

## Complete Example

Here's a complete example using the Fastify adapter:

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
import { ServerSubsystem } from './models/server-subsystem/server.subsystem.mycelia.js';
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { Message } from './models/message/message.mycelia.js';
import { SERVER_ROUTES } from './models/server-subsystem/server.routes.def.mycelia.js';

// Create a service subsystem
class MyService extends BaseSubsystem {
  constructor(name, options) {
    super(name, { ...options, defaultHooks: createCanonicalDefaultHooks() });
    
    this.onInit(() => {
      const router = this.find('router');
      
      router.registerRoute('my-service://get/status', async () => {
        return { success: true, status: 'ok' };
      });
      
      router.registerRoute('my-service://get/user/{id}', async (message, params) => {
        return { success: true, userId: params.id };
      });
    });
  }
}

// Setup
const messageSystem = new MessageSystem('my-app', { debug: false });
await messageSystem.bootstrap();

const myService = new MyService('my-service', { ms: messageSystem });
await messageSystem.registerSubsystem(myService);

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

await messageSystem.registerSubsystem(serverSubsystem);

// Register routes
const serverFacet = serverSubsystem.find('server');
await serverFacet.registerMyceliaRoute(
  'my-service://get/status',
  'GET',
  '/status'
);

await serverFacet.registerMyceliaRoute(
  'my-service://get/user/{id}',
  'GET',
  '/users/:id'
);

// Start server
await serverFacet.start({ host: '127.0.0.1', port: 3000 });
console.log(`Server running on ${serverFacet.getAddress()}`);

// Test
const response = await fetch('http://127.0.0.1:3000/status');
const data = await response.json();
console.log(data); // { success: true, status: 'ok' }
```

## Migration Between Adapters

Since all adapters implement the same `ServerContract`, you can easily switch between them by changing the `type` configuration:

```javascript
// Switch from Fastify to Express
config: {
  server: {
    type: 'express',  // Changed from 'fastify'
    port: 3000,
    host: '0.0.0.0'
  }
}
```

No code changes are required - the API remains the same across all adapters.

## Additional Resources

- [ServerSubsystem HTTP Integration](./SERVER-SUBSYSTEM-HTTP-INTEGRATION.md) - Detailed explanation of HTTP integration flow
- [ServerSubsystem](./SERVER-SUBSYSTEM.md) - General ServerSubsystem documentation
- [Fastify Documentation](https://www.fastify.io/)
- [Express Documentation](https://expressjs.com/)
- [Hono Documentation](https://hono.dev/)

