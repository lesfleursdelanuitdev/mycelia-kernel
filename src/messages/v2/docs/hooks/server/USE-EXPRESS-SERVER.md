# useExpressServer Hook

## Overview

The `useExpressServer` hook provides HTTP server functionality using Express. It implements the ServerContract interface, enabling subsystems to expose HTTP endpoints and integrate Mycelia routes, commands, and queries as HTTP endpoints.

**Key Features:**
- **Express Integration**: Uses Express as the underlying HTTP server
- **ServerContract Implementation**: Implements all required methods from ServerContract
- **Mycelia Integration**: Routes HTTP requests to Mycelia messages automatically
- **Lifecycle Management**: Start, stop, and status checking
- **Route Registration**: Support for all HTTP methods and batch registration
- **Middleware Support**: Global and route-specific middleware
- **Error Handling**: Standardized error handling

## Hook Metadata

```javascript
{
  kind: 'server',
  overwrite: false,
  required: ['router', 'messages'],
  attach: true,
  contract: 'server',
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'server'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing server facet
- **`required`**: `['router', 'messages']` - Requires router and messages facets for Mycelia integration
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.server`
- **`contract`**: `'server'` - Implements the server contract
- **`source`**: `import.meta.url` - Source file location for debugging

## Dependencies

**Required Facets:**
- **`router`**: For routing Mycelia messages
- **`messages`**: For creating Mycelia messages from HTTP requests

**External Dependencies:**
- **`express`**: Must be installed via `npm install express`

## Configuration

The hook reads configuration from `ctx.config.server`:

```javascript
{
  port: number,           // Default: 3000
  host: string,           // Default: '0.0.0.0'
  express: {              // Express-specific options
    json: boolean,        // Enable JSON body parser (default: true)
    urlencoded: boolean,  // Enable URL-encoded body parser (default: true)
    // ... other Express options
  },
  debug: boolean          // Enable debug logging
}
```

### Configuration Options

- **`port`** (number, default: `3000`): Port to listen on
- **`host`** (string, default: `'0.0.0.0'`): Host to bind to
- **`express.json`** (boolean, default: `true`): Enable JSON body parser middleware
- **`express.urlencoded`** (boolean, default: `true`): Enable URL-encoded body parser middleware
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

## Facet Methods

All methods from the [ServerContract](../models/facet-contract/SERVER-CONTRACT.md) are implemented. See the contract documentation for detailed method signatures.

### Lifecycle Methods

- `start(options)` - Start the HTTP server
- `stop()` - Stop the HTTP server
- `isRunning()` - Check if server is running

### Route Registration Methods

- `get(path, handler, options)` - Register GET route
- `post(path, handler, options)` - Register POST route
- `put(path, handler, options)` - Register PUT route
- `patch(path, handler, options)` - Register PATCH route
- `delete(path, handler, options)` - Register DELETE route
- `all(path, handler, options)` - Register route for all HTTP methods
- `registerRoutes(routes)` - Register multiple routes at once
- `registerMyceliaRoutes(routes)` - Register multiple Mycelia routes at once

### Middleware Methods

- `use(middleware)` - Register global middleware
- `useRoute(path, middleware)` - Register route-specific middleware

### Error Handling

- `setErrorHandler(handler)` - Set global error handler

### Server Info

- `getAddress()` - Get server address
- `getPort()` - Get server port

### Mycelia Integration Methods

- `registerMyceliaRoute(routePath, httpMethod, httpPath, options)` - Register Mycelia route as HTTP endpoint
- `registerMyceliaCommand(commandName, httpMethod, httpPath, options)` - Register Mycelia command as HTTP endpoint
- `registerMyceliaQuery(queryName, httpMethod, httpPath, options)` - Register Mycelia query as HTTP endpoint

## Usage

### Basic Setup

```javascript
import { BaseSubsystem } from './base-subsystem/base.subsystem.mycelia.js';
import { useRouter } from './hooks/router/use-router.mycelia.js';
import { useMessages } from './hooks/messages/use-messages.mycelia.js';
import { useExpressServer } from './hooks/server/use-express-server.mycelia.js';

const subsystem = new BaseSubsystem('api', {
  ms: messageSystem,
  config: {
    server: {
      type: 'express',
      port: 3000,
      host: '0.0.0.0',
      express: {
        json: true,
        urlencoded: true
      }
    }
  }
});

await subsystem
  .use(useRouter)
  .use(useMessages)
  .use(useExpressServer)
  .build();

// Start the server
await subsystem.server.start({ port: 3000 });
```

### Registering HTTP Routes

```javascript
// Register a simple GET route
await subsystem.server.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// Register a POST route
await subsystem.server.post('/api/users', async (req, res) => {
  const user = req.body;
  // Process user creation
  res.status(201).json({ id: '123', ...user });
});
```

### Registering Mycelia Routes

```javascript
// Register a Mycelia route as HTTP endpoint
await subsystem.server.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id'
);

// Register a Mycelia command as HTTP endpoint
await subsystem.server.registerMyceliaCommand(
  'createUser',
  'POST',
  '/api/users'
);

// Register a Mycelia query as HTTP endpoint
await subsystem.server.registerMyceliaQuery(
  'getUserStats',
  'GET',
  '/api/users/stats'
);
```

### Batch Registration

```javascript
// Register multiple routes at once
await subsystem.server.registerRoutes([
  { method: 'GET', path: '/api/users', handler: getUsers },
  { method: 'POST', path: '/api/users', handler: createUser }
]);

// Register multiple Mycelia routes at once
await subsystem.server.registerMyceliaRoutes([
  { type: 'route', myceliaPath: 'user://get/{id}', httpMethod: 'GET', httpPath: '/api/users/:id' },
  { type: 'command', commandName: 'createUser', httpMethod: 'POST', httpPath: '/api/users' }
]);
```

### Middleware

```javascript
// Global middleware
await subsystem.server.use(async (req, res, next) => {
  console.log('Request:', req.url);
  // Add custom headers
  res.setHeader('X-Custom-Header', 'value');
  next();
});

// Route-specific middleware
await subsystem.server.useRoute('/api/*', async (req, res, next) => {
  // Authentication middleware
  const token = req.headers['authorization'];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});
```

### Error Handling

```javascript
await subsystem.server.setErrorHandler(async (err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
```

## Mycelia Integration

When registering Mycelia routes, the hook automatically:

1. **Transforms HTTP requests to Mycelia messages**: Extracts request body, params, query, and headers
2. **Routes messages through Mycelia**: Uses the router facet to route messages to appropriate handlers
3. **Transforms Mycelia responses to HTTP responses**: Converts Mycelia message results to HTTP responses

### Request Transformation

By default, the request body is used as the message body. You can customize this with `transformRequest`:

```javascript
await subsystem.server.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id',
  {
    transformRequest: (req) => {
      return {
        userId: req.params.id,
        includeStats: req.query.stats === 'true'
      };
    }
  }
);
```

### Response Transformation

By default, the Mycelia result is sent as JSON. You can customize this with `transformResponse`:

```javascript
await subsystem.server.registerMyceliaRoute(
  'user://get/{id}',
  'GET',
  '/api/users/:id',
  {
    transformResponse: (result) => {
      return {
        data: result.data,
        meta: {
          timestamp: Date.now()
        }
      };
    }
  }
);
```

## Express-Specific Features

The hook leverages Express's features:

- **Middleware system**: Full Express middleware support
- **Route parameters**: Express route parameter parsing
- **Body parsing**: Automatic JSON and URL-encoded body parsing
- **Error handling**: Express error handling middleware
- **Compatibility**: Works with Express ecosystem packages

## Debug Logging

Enable debug logging to see server operations:

```javascript
const subsystem = new BaseSubsystem('api', {
  ms: messageSystem,
  config: {
    server: {
      debug: true,  // Enable debug logging
      port: 3000
    }
  }
});
```

Debug messages include:
- Server start/stop events
- Route registration
- Mycelia route registration
- Error messages

## Error Handling

The hook handles errors gracefully:

- **Express not installed**: Throws clear error message with installation instructions
- **Missing dependencies**: Validates router and messages facets are available
- **Server errors**: Logs errors and provides error handlers
- **Route registration errors**: Logs errors and continues with other routes
- **Async error handling**: Properly handles async errors in route handlers

## Best Practices

1. **Use ServerSubsystem**: For production use, use `ServerSubsystem` which handles hook selection automatically
2. **Register routes before starting**: Register all routes before calling `start()`
3. **Use batch registration**: Use `registerMyceliaRoutes()` for multiple routes
4. **Handle errors**: Always set an error handler
5. **Use middleware**: Leverage middleware for cross-cutting concerns (auth, logging, etc.)
6. **Async handlers**: Always use async/await or proper error handling in route handlers

## See Also

- [ServerContract](../models/facet-contract/SERVER-CONTRACT.md) - Contract interface definition
- [useFastifyServer](./USE-FASTIFY-SERVER.md) - Fastify implementation
- [ServerSubsystem](../models/server-subsystem/SERVER-SUBSYSTEM.md) - Subsystem that uses server hooks
- [useServerRoutes](../server-routes/USE-SERVER-ROUTES.md) - Helper hook for route registration
- [Express Documentation](https://expressjs.com/) - Express framework documentation


