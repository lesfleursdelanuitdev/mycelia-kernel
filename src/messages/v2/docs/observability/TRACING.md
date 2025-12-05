# Distributed Tracing

## Overview

Mycelia Kernel provides distributed tracing capabilities that enable end-to-end request tracking across subsystems. Every message automatically receives a unique trace ID (UUID v4 format) that propagates through the entire system, allowing you to follow a request from its origin through all subsystems it touches.

## Key Concepts

### Trace ID

A **trace ID** is a unique identifier (UUID v4) assigned to every message. It enables correlating all operations related to a single request across multiple subsystems.

- **Automatic Generation**: Every message gets a trace ID automatically
- **Immutable**: Trace IDs are stored in fixed metadata and cannot be changed
- **Inheritance**: Child messages can inherit trace IDs from parent messages
- **HTTP Propagation**: Trace IDs flow through HTTP requests and responses

### Trace ID Propagation

Trace IDs automatically propagate through:
- Message routing (MessageRouter)
- Subsystem processing
- HTTP requests/responses
- Child message creation

## Usage

### Basic Usage

Every message automatically gets a trace ID:

```javascript
import { Message } from './models/message/message.mycelia.js';

const message = new Message('test://path', { data: 'test' });
const traceId = message.getMeta().getTraceId();
console.log('Trace ID:', traceId); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### Custom Trace ID

You can provide a custom trace ID:

```javascript
const message = new Message('test://path', { data: 'test' }, {
  traceId: 'my-custom-trace-id'
});
const traceId = message.getMeta().getTraceId();
console.log('Trace ID:', traceId); // "my-custom-trace-id"
```

### Trace ID Inheritance

Child messages can inherit trace IDs from parent messages:

```javascript
// Create parent message
const parent = new Message('parent://operation', { data: 'parent' });
const parentTraceId = parent.getMeta().getTraceId();

// Create child message that inherits trace ID
const child = new Message('child://operation', { data: 'child' }, {
  parentMessage: parent
});

// Child has same trace ID as parent
const childTraceId = child.getMeta().getTraceId();
console.log('Parent trace ID:', parentTraceId);
console.log('Child trace ID:', childTraceId);
console.log('Match:', parentTraceId === childTraceId); // true
```

### HTTP Request Tracing

Trace IDs are automatically extracted from HTTP headers and injected into messages:

```javascript
// HTTP request with trace ID header
// GET /api/users/123
// Headers: X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000

// The trace ID is automatically:
// 1. Extracted from X-Trace-Id header (or traceparent for W3C Trace Context)
// 2. Added to message metadata
// 3. Propagated through Mycelia routing
// 4. Returned in response header X-Trace-Id
```

### Using Trace Utilities

```javascript
import { 
  generateTraceId, 
  inheritTraceId, 
  extractTraceIdFromHeaders,
  injectTraceIdIntoHeaders 
} from './utils/trace.utils.mycelia.js';

// Generate a new trace ID
const traceId = generateTraceId();

// Inherit trace ID from parent message
const parentTraceId = inheritTraceId(parentMessage);

// Extract trace ID from HTTP headers
const headers = { 'X-Trace-Id': '550e8400-e29b-41d4-a716-446655440000' };
const traceId = extractTraceIdFromHeaders(headers);

// Inject trace ID into HTTP headers
const responseHeaders = {};
injectTraceIdIntoHeaders(responseHeaders, traceId);
// responseHeaders['X-Trace-Id'] = traceId
```

## Trace ID Format

Trace IDs use UUID v4 format:
- Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Example: `550e8400-e29b-41d4-a716-446655440000`
- Always 36 characters (32 hex digits + 4 hyphens)

## HTTP Header Support

### Custom Header: X-Trace-Id

The default header name is `X-Trace-Id`. You can customize it:

```javascript
// In HTTP adapter configuration
const traceId = extractTraceIdFromHeaders(headers, 'My-Custom-Trace-Id');
```

### W3C Trace Context: traceparent

The system also supports the W3C Trace Context standard (`traceparent` header):

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

The trace ID is extracted from the second segment of the `traceparent` header.

## Trace ID in Message Metadata

Trace IDs are stored in the fixed (immutable) metadata of messages:

```javascript
const message = new Message('test://path', { data: 'test' });
const meta = message.getMeta();

// Get trace ID
const traceId = meta.getTraceId();
// OR
const traceId = meta.getFixedField('traceId');
// OR
const traceId = meta.getCustomField('traceId');
```

## Best Practices

### 1. Use Trace IDs for Logging

Include trace IDs in your logs for correlation:

```javascript
import { createStructuredLoggerFromMessage } from './utils/structured-logger.utils.mycelia.js';

const logger = createStructuredLoggerFromMessage(message, 'my-subsystem');
logger.info('Processing message', { path: message.getPath() });
// Log includes trace ID automatically
```

### 2. Propagate Trace IDs in HTTP Requests

When making HTTP requests to external services, include the trace ID:

```javascript
const traceId = message.getMeta().getTraceId();
const response = await fetch('https://api.example.com/data', {
  headers: {
    'X-Trace-Id': traceId
  }
});
```

### 3. Inherit Trace IDs for Related Operations

When creating child messages for related operations, inherit the trace ID:

```javascript
// Parent operation
const parent = new Message('parent://operation', { data: 'parent' });

// Related child operations inherit trace ID
const child1 = new Message('child://operation1', {}, { parentMessage: parent });
const child2 = new Message('child://operation2', {}, { parentMessage: parent });

// All three messages share the same trace ID
```

### 4. Use Trace IDs for Error Tracking

Include trace IDs in error reports:

```javascript
try {
  // ... process message ...
} catch (error) {
  const traceId = message.getMeta().getTraceId();
  logger.error('Processing failed', { 
    traceId, 
    error: error.message,
    stack: error.stack 
  });
  // Error can be correlated with all related operations
}
```

## Integration with Observability Tools

Trace IDs can be used with external observability tools:

### OpenTelemetry (Future)

When OpenTelemetry integration is added (Phase 5), trace IDs will be compatible with OpenTelemetry spans.

### Log Aggregation

Structured logs with trace IDs can be easily searched and filtered:

```bash
# Search for all logs with a specific trace ID
grep '"traceId":"550e8400-e29b-41d4-a716-446655440000"' logs.json

# Using jq
cat logs.json | jq 'select(.traceId == "550e8400-e29b-41d4-a716-446655440000")'
```

### Monitoring Tools

Trace IDs can be used to:
- Correlate errors across subsystems
- Track request latency end-to-end
- Identify bottlenecks in message processing
- Debug distributed system issues

## Examples

### Complete Example: HTTP Request → Message → Response

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
import { ServerSubsystem } from './models/server-subsystem/server.subsystem.mycelia.js';
import { Message } from './models/message/message.mycelia.js';

// Setup
const messageSystem = new MessageSystem('my-app', { debug: false });
await messageSystem.bootstrap();

const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    server: {
      type: 'fastify',
      port: 3000
    }
  }
});
await messageSystem.registerSubsystem(serverSubsystem);

// Register a route handler
const router = myService.find('router');
router.registerRoute('my-service://get/data', async (message) => {
  const traceId = message.getMeta().getTraceId();
  console.log(`Processing request with trace ID: ${traceId}`);
  
  // Create child message with inherited trace ID
  const childMessage = new Message('other-service://process', {}, {
    parentMessage: message
  });
  // childMessage has same trace ID as message
  
  return { success: true, data: 'result' };
});

// Register HTTP route
const serverFacet = serverSubsystem.find('server');
await serverFacet.registerMyceliaRoute(
  'my-service://get/data',
  'GET',
  '/api/data'
);

await serverFacet.start({ host: '127.0.0.1', port: 3000 });

// Make HTTP request
const response = await fetch('http://127.0.0.1:3000/api/data', {
  headers: {
    'X-Trace-Id': 'my-custom-trace-id' // Optional: provide trace ID
  }
});

// Response includes trace ID in header
const responseTraceId = response.headers.get('X-Trace-Id');
console.log('Response trace ID:', responseTraceId);
```

## API Reference

### `generateTraceId()`

Generate a unique trace ID (UUID v4 format).

**Returns:** `string` - Trace ID

**Example:**
```javascript
const traceId = generateTraceId();
// "550e8400-e29b-41d4-a716-446655440000"
```

### `inheritTraceId(parentMessage)`

Extract trace ID from a parent message.

**Parameters:**
- `parentMessage` (Message|Object) - Parent message

**Returns:** `string|null` - Trace ID or null if not found

**Example:**
```javascript
const traceId = inheritTraceId(parentMessage);
```

### `extractTraceIdFromHeaders(headers, headerName?)`

Extract trace ID from HTTP headers.

**Parameters:**
- `headers` (Object) - HTTP headers object
- `headerName` (string, optional) - Custom header name (default: 'X-Trace-Id')

**Returns:** `string|null` - Trace ID or null if not found

**Example:**
```javascript
const traceId = extractTraceIdFromHeaders(req.headers);
```

### `injectTraceIdIntoHeaders(headers, traceId, headerName?)`

Inject trace ID into HTTP headers.

**Parameters:**
- `headers` (Object) - HTTP headers object (will be modified)
- `traceId` (string) - Trace ID to inject
- `headerName` (string, optional) - Custom header name (default: 'X-Trace-Id')

**Returns:** `Object` - Modified headers object

**Example:**
```javascript
const headers = {};
injectTraceIdIntoHeaders(headers, traceId);
// headers['X-Trace-Id'] = traceId
```

### `MessageMetadata.getTraceId()`

Get trace ID from message metadata.

**Returns:** `string|null` - Trace ID or null if not found

**Example:**
```javascript
const traceId = message.getMeta().getTraceId();
```

## See Also

- [Structured Logging](./STRUCTURED-LOGGING.md) - Logging with trace IDs
- [Message Metadata](../message/MESSAGE-METADATA.md) - Message metadata documentation
- [Observability Plan](../../../../OBSERVABILITY-TRACEABILITY-PLAN.md) - Full observability improvement plan

