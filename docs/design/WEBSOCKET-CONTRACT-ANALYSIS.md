# WebSocket Contract Analysis

## Should We Create a WebSocket Contract?

**Short Answer: Yes, absolutely.**

## Why a WebSocket Contract Makes Sense

### 1. **Multiple Library Support** (Same as HTTP Servers)

Just like HTTP servers support Fastify, Express, and Hono, WebSocket will support multiple libraries:
- `ws` (most common Node.js WebSocket library)
- `uWebSockets.js` (high-performance alternative)
- Potentially `Socket.IO` (if compatibility needed)
- Potentially others in the future

**Without a contract:** Each implementation would have different method signatures, making `WebSocketSubsystem` tightly coupled to specific libraries.

**With a contract:** `WebSocketSubsystem` can work with any WebSocket library implementation, just like `ServerSubsystem` works with any HTTP server.

### 2. **Consistency with Existing Patterns**

The codebase already uses contracts for HTTP servers:
- `serverContract` ensures Fastify, Express, and Hono all implement the same interface
- `WebSocketSubsystem` should follow the same pattern as `ServerSubsystem`
- Developers already understand the contract pattern

### 3. **Build-Time Validation**

Contracts provide:
- **Early error detection**: Fail fast if a WebSocket hook doesn't implement required methods
- **Type safety**: Clear interface definition
- **Documentation**: Contract serves as living documentation

### 4. **Future Extensibility**

A contract makes it easier to:
- Add new WebSocket libraries without changing `WebSocketSubsystem`
- Ensure all implementations support the same features
- Maintain backward compatibility

## WebSocket Contract vs HTTP Server Contract

### Similarities

Both contracts need:
- **Lifecycle methods**: `start()`, `stop()`, `isRunning()`
- **Server info**: `getAddress()`, `getPort()`
- **Internal state**: `_server`, `_isRunning`

### Key Differences

WebSocket has unique requirements that HTTP doesn't:

1. **Connection Management**
   - HTTP: Stateless, no connection tracking
   - WebSocket: Stateful, must track individual connections

2. **Message Sending**
   - HTTP: Request → Response (one-way per request)
   - WebSocket: Bidirectional, can send anytime to specific connections

3. **Broadcasting**
   - HTTP: Not applicable
   - WebSocket: Core feature (send to all/some clients)

4. **Connection Lifecycle**
   - HTTP: Not applicable
   - WebSocket: Connect, disconnect, error events

## Proposed WebSocket Contract

### Required Methods

```javascript
export const websocketContract = createFacetContract({
  name: 'websocket',
  requiredMethods: [
    // Lifecycle (same as HTTP)
    'start',
    'stop',
    'isRunning',
    
    // Server Info (same as HTTP)
    'getAddress',
    'getPort',
    
    // Connection Management (WebSocket-specific)
    'getConnection',           // Get connection by ID
    'getAllConnections',       // Get all active connections
    'getConnectionCount',       // Get number of active connections
    'closeConnection',         // Close specific connection
    
    // Message Sending (WebSocket-specific)
    'send',                    // Send message to specific connection
    'broadcast',               // Broadcast to all/some connections
    
    // Connection Lifecycle Handlers (WebSocket-specific)
    'onConnection',            // Register connection handler
    'onDisconnection',          // Register disconnection handler
    'onError',                 // Register error handler
    
    // Message Routing (WebSocket-specific)
    'registerMessageHandler',  // Register handler for incoming messages
    'routeMessage',            // Route incoming WebSocket message to Mycelia
  ],
  requiredProperties: [
    '_server',                 // Internal WebSocket server instance
    '_isRunning',              // Running state flag
    '_connections',             // Connection manager/registry
  ],
  validate: (ctx, api, subsystem, facet) => {
    // Validate _server is an object
    if (typeof facet._server !== 'object' || facet._server === null) {
      throw new Error('WebSocket facet _server must be an object');
    }
    
    // Validate _isRunning is a boolean
    if (typeof facet._isRunning !== 'boolean') {
      throw new Error('WebSocket facet _isRunning must be a boolean');
    }
    
    // Validate _connections exists (could be Map, object, or manager instance)
    if (!facet._connections) {
      throw new Error('WebSocket facet _connections must be defined');
    }
  }
});
```

### Method Signatures

#### Lifecycle Methods (Same as HTTP)

```javascript
// Start WebSocket server
async start(options = {}) => Promise<void>
// options.port, options.host, options.path, options.callback

// Stop WebSocket server
async stop() => Promise<void>

// Check if running
isRunning() => boolean
```

#### Connection Management

```javascript
// Get connection by ID
getConnection(connectionId: string) => WebSocketConnection | null

// Get all connections
getAllConnections() => WebSocketConnection[]

// Get connection count
getConnectionCount() => number

// Close specific connection
closeConnection(connectionId: string, code?: number, reason?: string) => Promise<void>
```

#### Message Sending

```javascript
// Send message to specific connection
async send(connectionId: string, message: Message | Object) => Promise<void>

// Broadcast to all or filtered connections
async broadcast(message: Message | Object, filter?: Function) => Promise<void>
// filter: (connection: WebSocketConnection) => boolean
```

#### Connection Lifecycle Handlers

```javascript
// Register connection handler
onConnection(handler: (connection: WebSocketConnection) => void | Promise<void>) => void

// Register disconnection handler
onDisconnection(handler: (connection: WebSocketConnection, code: number, reason: string) => void | Promise<void>) => void

// Register error handler
onError(handler: (connection: WebSocketConnection, error: Error) => void | Promise<void>) => void
```

#### Message Routing

```javascript
// Register handler for incoming messages
registerMessageHandler(path: string, handler: Function) => void

// Route incoming WebSocket message to Mycelia
async routeMessage(connectionId: string, wsMessage: Object) => Promise<Object>
```

## WebSocketConnection Interface

The contract should also define what a `WebSocketConnection` looks like:

```javascript
interface WebSocketConnection {
  id: string                    // Unique connection ID
  socket: WebSocket            // Native WebSocket instance
  metadata: Object              // Custom metadata (user ID, session, etc.)
  connectedAt: Date            // Connection timestamp
  lastActivity: Date           // Last message timestamp
  
  // Methods
  send(data: any): Promise<void>
  close(code?: number, reason?: string): void
  ping(): void
}
```

## Implementation Examples

### useWsWebSocket Hook (ws library)

```javascript
export const useWsWebSocket = createHook({
  kind: 'websocket',
  contract: 'websocket',  // Declare contract
  fn: (ctx, api, subsystem) => {
    return new Facet('websocket', {
      contract: 'websocket'
    })
    .add({
      async start(options = {}) {
        const { WebSocketServer } = await import('ws');
        this._server = new WebSocketServer({
          port: options.port || 8080,
          path: options.path || '/ws',
          // ... other options
        });
        
        this._server.on('connection', (socket, req) => {
          const connection = this._createConnection(socket, req);
          this._connections.set(connection.id, connection);
          this._handleConnection(connection);
        });
        
        await new Promise((resolve) => {
          this._server.on('listening', resolve);
        });
        
        this._isRunning = true;
      },
      
      async send(connectionId, message) {
        const connection = this._connections.get(connectionId);
        if (!connection) {
          throw new Error(`Connection ${connectionId} not found`);
        }
        await connection.send(JSON.stringify(message));
      },
      
      async broadcast(message, filter) {
        const connections = filter
          ? Array.from(this._connections.values()).filter(filter)
          : Array.from(this._connections.values());
        
        const promises = connections.map(conn => 
          conn.send(JSON.stringify(message))
        );
        await Promise.all(promises);
      },
      
      // ... other required methods
    });
  }
});
```

### useUwsWebSocket Hook (uWebSockets.js library)

```javascript
export const useUwsWebSocket = createHook({
  kind: 'websocket',
  contract: 'websocket',  // Same contract!
  fn: (ctx, api, subsystem) => {
    return new Facet('websocket', {
      contract: 'websocket'
    })
    .add({
      async start(options = {}) {
        const uWS = await import('uWebSockets.js');
        // Different implementation, same interface
        // ...
      },
      
      async send(connectionId, message) {
        // Different implementation, same interface
        // ...
      },
      
      // ... same methods as ws implementation
    });
  }
});
```

## Benefits Summary

### 1. **Interchangeability**
```javascript
// WebSocketSubsystem works with any implementation
const ws = new WebSocketSubsystem('websocket', {
  ms: messageSystem,
  config: {
    websocket: {
      type: 'ws'  // or 'uws', 'socket.io', etc.
    }
  }
});
```

### 2. **Consistent API**
All WebSocket implementations provide the same methods, making code predictable.

### 3. **Build-Time Safety**
Contract validation ensures implementations are complete before runtime.

### 4. **Documentation**
Contract serves as the definitive API reference.

### 5. **Future-Proof**
Easy to add new WebSocket libraries without breaking existing code.

## Comparison: With vs Without Contract

### Without Contract

```javascript
// Each implementation has different methods
useWsWebSocket: {
  sendToClient(id, msg) { ... },
  broadcastToAll(msg) { ... }
}

useUwsWebSocket: {
  send(id, msg) { ... },
  broadcast(msg, filter) { ... }
}

// WebSocketSubsystem must handle differences
if (websocketType === 'ws') {
  websocket.sendToClient(connectionId, message);
} else if (websocketType === 'uws') {
  websocket.send(connectionId, message);
}
```

### With Contract

```javascript
// All implementations have same methods
useWsWebSocket: {
  send(id, msg) { ... },      // Same signature
  broadcast(msg, filter) { ... }  // Same signature
}

useUwsWebSocket: {
  send(id, msg) { ... },      // Same signature
  broadcast(msg, filter) { ... }  // Same signature
}

// WebSocketSubsystem uses consistent API
websocket.send(connectionId, message);  // Works for all implementations
```

## Recommendation

**Yes, create a WebSocket contract.** It provides:

1. ✅ **Consistency** with existing HTTP server contract pattern
2. ✅ **Interchangeability** between WebSocket libraries
3. ✅ **Type safety** and build-time validation
4. ✅ **Documentation** of the WebSocket interface
5. ✅ **Future extensibility** for new libraries

The contract should be created **before** implementing the first WebSocket hook, ensuring all implementations follow the same interface from the start.

## Next Steps

1. **Create `websocket.contract.mycelia.js`** - Define the contract
2. **Register in `defaultContractRegistry`** - Make it available
3. **Update design document** - Add contract to WebSocketSubsystem design
4. **Implement first hook** - `useWsWebSocket` implementing the contract
5. **Add tests** - Contract validation tests



