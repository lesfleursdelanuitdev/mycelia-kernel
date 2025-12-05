# WebSocketSubsystem Design

## Overview

The **WebSocketSubsystem** is a dedicated subsystem that manages WebSocket server connections and handles WebSocket message routing. It follows the same architectural patterns as `ServerSubsystem` but is designed for bidirectional, persistent WebSocket connections.

**Key Goals:**
- Bidirectional communication (client ↔ Mycelia)
- Connection lifecycle management
- Message routing from WebSocket to Mycelia messages
- Broadcasting Mycelia messages to WebSocket clients
- Support for multiple WebSocket libraries (ws, uWebSockets.js, etc.)
- Integration with existing message system

## Architecture

### High-Level Flow

```
WebSocket Client
    ↓ (connect)
WebSocketSubsystem (connection established)
    ↓ (message received)
WebSocket → Mycelia Message (via useWebSockets hook)
    ↓
MessageSystem Router
    ↓
Target Subsystem Handler
    ↓ (response)
Mycelia Message → WebSocket (via useWebSockets hook)
    ↓
WebSocket Client
```

### Component Structure

```
WebSocketSubsystem
├── useWebSockets hook
│   ├── WebSocket Server (ws/uWebSockets.js/etc.)
│   ├── Connection Manager
│   ├── Message Router (WebSocket → Mycelia)
│   └── Broadcast Manager (Mycelia → WebSocket)
└── Route Handlers (similar to ServerSubsystem)
```

## WebSocketSubsystem Class

### Class Definition

```javascript
export class WebSocketSubsystem extends BaseSubsystem {
  constructor(name = 'websocket', options = {}) {
    // Similar structure to ServerSubsystem
    // - Validates name (must be 'websocket')
    // - Uses canonical default hooks
    // - Selects WebSocket library based on config
    // - Registers route handlers for WebSocket operations
  }
}
```

### Key Differences from ServerSubsystem

1. **Persistent Connections**: WebSocket maintains persistent connections vs. stateless HTTP
2. **Bidirectional**: Both client → server and server → client messaging
3. **Connection State**: Tracks individual client connections
4. **Broadcasting**: Can send messages to multiple/all clients
5. **Connection Lifecycle**: Handles connect, disconnect, error events

### Configuration Options

```javascript
const websocketSubsystem = new WebSocketSubsystem('websocket', {
  ms: messageSystem,
  config: {
    websocket: {
      type: 'ws',  // 'ws', 'uws', 'socket.io', etc.
      port: 8080,
      host: '0.0.0.0',
      path: '/ws',  // WebSocket path
      // Library-specific options
      options: {
        perMessageDeflate: true,
        maxPayload: 1024 * 1024, // 1MB
        // ... other ws/uws options
      }
    },
    // Connection management
    connection: {
      maxConnections: 1000,
      connectionTimeout: 30000, // 30s
      pingInterval: 25000, // 25s
      pingTimeout: 5000, // 5s
    },
    // Message routing
    routing: {
      defaultPath: 'websocket://message', // Default Mycelia path for messages
      enableBroadcast: true,
      enableDirectSend: true,
    }
  }
});
```

## useWebSockets Hook

### Hook Structure

```javascript
export const useWebSockets = createHook({
  kind: 'websocket',
  overwrite: false,
  required: ['router', 'messages'], // Needs router and messages facets
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Creates WebSocket server
    // Manages connections
    // Routes messages
    // Returns websocket facet
  }
});
```

### Facet Methods

#### Connection Management

```javascript
{
  // Start/stop WebSocket server
  start(): Promise<void>
  stop(): Promise<void>
  
  // Connection management
  getConnection(connectionId: string): WebSocketConnection | null
  getAllConnections(): WebSocketConnection[]
  getConnectionCount(): number
  
  // Send messages to clients
  send(connectionId: string, message: Message | Object): Promise<void>
  broadcast(message: Message | Object, filter?: Function): Promise<void>
  
  // Register message handlers
  registerMessageHandler(path: string, handler: Function): void
  registerConnectionHandler(event: 'connect' | 'disconnect' | 'error', handler: Function): void
}
```

### WebSocketConnection Class

```javascript
class WebSocketConnection {
  id: string              // Unique connection ID
  socket: WebSocket       // Native WebSocket instance
  metadata: Object        // Custom metadata (user ID, session, etc.)
  connectedAt: Date       // Connection timestamp
  lastActivity: Date      // Last message timestamp
  
  // Methods
  send(data: any): Promise<void>
  close(code?: number, reason?: string): void
  ping(): void
}
```

## Message Routing

### WebSocket → Mycelia Message Flow

1. **Client sends WebSocket message**
   ```json
   {
     "path": "user://get/{id}",
     "body": { "id": "123" },
     "correlationId": "corr-1",
     "metadata": { ... }
   }
   ```

2. **useWebSockets hook receives message**
   - Extracts path, body, metadata
   - Creates Mycelia Message
   - Adds WebSocket-specific metadata (connectionId, clientInfo)
   - Routes via MessageSystem router

3. **Handler processes message**
   - Receives Mycelia message
   - Processes normally
   - Returns result

4. **Result sent back to WebSocket client**
   - Result wrapped in response format
   - Sent to specific connection
   - Includes correlationId for matching

### Mycelia → WebSocket Flow

1. **Subsystem sends Mycelia message**
   ```javascript
   await messageSystem.send(new Message('websocket://broadcast', {
     event: 'user-updated',
     data: { userId: '123', name: 'John' }
   }));
   ```

2. **WebSocketSubsystem receives message**
   - Checks if message is for WebSocket routing
   - Extracts target (connectionId, broadcast, etc.)
   - Sends to WebSocket client(s)

## Route Registration

### Similar to ServerSubsystem

```javascript
// Register WebSocket message handler
websocketSubsystem.registerRoute('websocket://message', async (message, params, options) => {
  // Handle incoming WebSocket message
  // message.body contains WebSocket message data
  // options.connectionId contains WebSocket connection ID
  return { success: true, data: result };
});

// Register connection lifecycle handlers
websocketSubsystem.registerRoute('websocket://connect', async (message, params, options) => {
  // Handle new connection
  // message.body contains connection metadata
  return { success: true };
});

websocketSubsystem.registerRoute('websocket://disconnect', async (message, params, options) => {
  // Handle disconnection
  return { success: true };
});
```

### Message Format

**Incoming WebSocket Message:**
```json
{
  "path": "mycelia://path/to/handler",
  "body": { ... },
  "correlationId": "optional-correlation-id",
  "metadata": {
    "traceId": "optional-trace-id",
    "headers": { ... }
  }
}
```

**Outgoing WebSocket Message:**
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "matching-correlation-id",
  "error": null,
  "metadata": {
    "traceId": "trace-id",
    "timestamp": 1234567890
  }
}
```

## Connection Lifecycle

### Events

1. **Connection Established**
   - Client connects to WebSocket endpoint
   - `websocket://connect` message sent to subsystem
   - Connection registered in ConnectionManager
   - Connection ID generated and stored

2. **Message Received**
   - Client sends message
   - Converted to Mycelia message
   - Routed to handler
   - Response sent back to client

3. **Connection Closed**
   - Client disconnects (normal or error)
   - `websocket://disconnect` message sent to subsystem
   - Connection removed from ConnectionManager
   - Cleanup resources

4. **Error Handling**
   - WebSocket errors logged
   - `websocket://error` message sent to subsystem
   - Connection may be closed depending on error

## Broadcasting

### Broadcast Patterns

1. **Broadcast to All**
   ```javascript
   await websocketSubsystem.websocket.broadcast({
     event: 'system-update',
     data: { message: 'System maintenance in 5 minutes' }
   });
   ```

2. **Broadcast with Filter**
   ```javascript
   await websocketSubsystem.websocket.broadcast(
     { event: 'user-message', data: { ... } },
     (connection) => connection.metadata.userId === 'user-123'
   );
   ```

3. **Broadcast via Mycelia Message**
   ```javascript
   await messageSystem.send(new Message('websocket://broadcast', {
     event: 'notification',
     data: { ... },
     filter: { userId: 'user-123' } // Optional filter
   }));
   ```

## Integration with MessageSystem

### Message Paths

- `websocket://message` - Handle incoming WebSocket message
- `websocket://connect` - Handle new connection
- `websocket://disconnect` - Handle disconnection
- `websocket://error` - Handle WebSocket errors
- `websocket://broadcast` - Broadcast message to clients
- `websocket://send/{connectionId}` - Send message to specific connection

### Integration Points

1. **MessageSystem Router**: Routes WebSocket-originated messages
2. **Message Metadata**: Includes WebSocket connection info
3. **Trace IDs**: Propagates trace IDs through WebSocket messages
4. **Correlation IDs**: Matches requests/responses via correlationId

## WebSocket Library Support

### Primary Library: `ws`

```javascript
import { WebSocketServer } from 'ws';

// useWebSockets hook uses ws library
const wss = new WebSocketServer({
  port: 8080,
  path: '/ws',
  perMessageDeflate: true,
  // ... other options
});
```

### Alternative Libraries

1. **uWebSockets.js** - High-performance alternative
2. **Socket.IO** - If Socket.IO compatibility needed
3. **SockJS** - Fallback support

### Library Abstraction

```javascript
// Abstract WebSocket server interface
interface WebSocketServerAdapter {
  start(options): Promise<void>
  stop(): Promise<void>
  on(event: string, handler: Function): void
  // ... other methods
}

// Implementation for ws
class WsAdapter implements WebSocketServerAdapter { ... }

// Implementation for uWebSockets.js
class UwsAdapter implements WebSocketServerAdapter { ... }
```

## Configuration

### WebSocket Configuration

```javascript
{
  websocket: {
    type: 'ws',                    // 'ws', 'uws', 'socket.io'
    port: 8080,
    host: '0.0.0.0',
    path: '/ws',
    options: {
      // Library-specific options
      perMessageDeflate: true,
      maxPayload: 1024 * 1024,
      clientTracking: true,
    }
  },
  connection: {
    maxConnections: 1000,
    connectionTimeout: 30000,
    pingInterval: 25000,
    pingTimeout: 5000,
    // Connection metadata
    generateConnectionId: (socket) => uuid.v4(),
  },
  routing: {
    defaultPath: 'websocket://message',
    enableBroadcast: true,
    enableDirectSend: true,
    // Message transformation
    transformIncoming: (wsMessage) => wsMessage,
    transformOutgoing: (myceliaResult) => myceliaResult,
  }
}
```

## Security Considerations

### Authentication

```javascript
// Connection-level authentication
websocketSubsystem.registerRoute('websocket://connect', async (message) => {
  const token = message.body.token;
  const user = await validateToken(token);
  
  // Store user info in connection metadata
  connection.metadata.userId = user.id;
  connection.metadata.permissions = user.permissions;
  
  return { success: true };
});
```

### Authorization

```javascript
// Message-level authorization
websocketSubsystem.registerRoute('websocket://message', async (message, params, options) => {
  const connection = options.connection;
  const requiredPermission = message.body.requiredPermission;
  
  if (!hasPermission(connection.metadata.permissions, requiredPermission)) {
    return { success: false, error: 'Unauthorized' };
  }
  
  // Process message...
});
```

### Rate Limiting

```javascript
// Per-connection rate limiting
connection.rateLimiter = new RateLimiter({
  maxMessages: 100,
  windowMs: 60000, // 1 minute
});
```

## Error Handling

### Error Scenarios

1. **Connection Errors**
   - Network errors
   - Protocol errors
   - Timeout errors

2. **Message Errors**
   - Invalid message format
   - Routing errors
   - Handler errors

3. **System Errors**
   - Server overload
   - Resource exhaustion

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "WEBSOCKET_ERROR",
    "message": "Connection timeout",
    "details": { ... }
  },
  "correlationId": "corr-1"
}
```

## Testing Strategy

### Unit Tests

- `useWebSockets` hook tests
- Connection manager tests
- Message routing tests
- Broadcast tests

### Integration Tests

- Real WebSocket client connections
- Message routing through MessageSystem
- Broadcasting scenarios
- Connection lifecycle

### Test Utilities

```javascript
// Mock WebSocket client
const mockClient = createMockWebSocketClient();

// Test connection
await mockClient.connect('ws://localhost:8080/ws');

// Test message sending
const response = await mockClient.send({
  path: 'test://handler',
  body: { data: 'test' }
});

// Test disconnection
await mockClient.disconnect();
```

## Comparison with ServerSubsystem

| Feature | ServerSubsystem | WebSocketSubsystem |
|---------|----------------|-------------------|
| **Protocol** | HTTP (stateless) | WebSocket (stateful) |
| **Connection** | Per-request | Persistent |
| **Direction** | Request → Response | Bidirectional |
| **Routing** | HTTP path → Mycelia path | WebSocket message → Mycelia path |
| **Broadcasting** | Not applicable | Supported |
| **Connection State** | None | Tracked per client |
| **Lifecycle** | Request/Response | Connect/Message/Disconnect |

## Usage Examples

### Basic Setup

```javascript
import { WebSocketSubsystem } from './models/websocket-subsystem/websocket.subsystem.mycelia.js';
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';

const messageSystem = new MessageSystem('main');
await messageSystem.bootstrap();

const websocketSubsystem = new WebSocketSubsystem('websocket', {
  ms: messageSystem,
  config: {
    websocket: {
      type: 'ws',
      port: 8080,
      path: '/ws'
    }
  }
});

await websocketSubsystem.build();
await websocketSubsystem.websocket.start();
```

### Message Handler

```javascript
// Register handler for WebSocket messages
websocketSubsystem.registerRoute('websocket://message', async (message, params, options) => {
  const { path, body } = message.body;
  const connectionId = options.connectionId;
  
  // Route to appropriate handler based on path
  if (path === 'chat://send') {
    // Handle chat message
    return { success: true, data: { messageId: 'msg-123' } };
  }
  
  return { success: false, error: 'Unknown path' };
});
```

### Broadcasting

```javascript
// Broadcast to all connected clients
await websocketSubsystem.websocket.broadcast({
  event: 'system-notification',
  data: { message: 'System maintenance scheduled' }
});

// Broadcast to specific users
await websocketSubsystem.websocket.broadcast(
  { event: 'user-message', data: { ... } },
  (connection) => connection.metadata.userId === 'user-123'
);
```

### Connection Lifecycle

```javascript
// Handle new connections
websocketSubsystem.registerRoute('websocket://connect', async (message, params, options) => {
  const connection = options.connection;
  console.log(`Client connected: ${connection.id}`);
  
  // Send welcome message
  await websocketSubsystem.websocket.send(connection.id, {
    event: 'welcome',
    data: { message: 'Connected to Mycelia WebSocket server' }
  });
  
  return { success: true };
});

// Handle disconnections
websocketSubsystem.registerRoute('websocket://disconnect', async (message, params, options) => {
  const connection = options.connection;
  console.log(`Client disconnected: ${connection.id}`);
  
  // Cleanup resources
  // ...
  
  return { success: true };
});
```

## Implementation Phases

### Phase 1: Core Infrastructure
- WebSocketSubsystem class
- useWebSockets hook (basic)
- Connection management
- Message routing (WebSocket → Mycelia)

### Phase 2: Bidirectional Communication
- Mycelia → WebSocket routing
- Broadcasting support
- Connection lifecycle handlers

### Phase 3: Advanced Features
- Multiple WebSocket library support
- Connection metadata
- Rate limiting
- Authentication/authorization

### Phase 4: Production Features
- Error handling
- Monitoring/metrics
- Load testing
- Documentation

## Open Questions

1. **Library Choice**: Start with `ws` or support multiple from the start?
2. **Connection ID Generation**: UUID v4 or custom format?
3. **Message Format**: JSON only or support binary/protobuf?
4. **Subprotocols**: Support WebSocket subprotocols?
5. **Reconnection**: Handle client reconnection with same connection ID?
6. **Scaling**: How to handle multiple WebSocketSubsystem instances (sticky sessions)?

## Next Steps

1. Review and refine design
2. Decide on WebSocket library (start with `ws`)
3. Create implementation plan
4. Begin Phase 1 implementation

