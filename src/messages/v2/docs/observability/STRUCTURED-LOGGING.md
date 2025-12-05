# Structured Logging

## Overview

Mycelia Kernel provides structured logging capabilities that output JSON-formatted logs with trace IDs, correlation IDs, and other contextual information. This enables better observability, log aggregation, and debugging in production environments.

## Key Features

- **JSON Output**: Machine-parseable log format
- **Trace ID Integration**: Automatic trace ID inclusion in logs
- **Correlation ID Support**: Request/response correlation
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Context Extraction**: Automatic context extraction from messages
- **Backward Compatible**: Traditional text logging still supported

## Usage

### Basic Structured Logger

```javascript
import { createStructuredLogger } from './utils/structured-logger.utils.mycelia.js';

const logger = createStructuredLogger({
  level: 'INFO',
  subsystem: 'my-subsystem',
  traceId: '550e8400-e29b-41d4-a716-446655440000',
  outputFormat: 'json'
});

logger.info('Message processed', { messageId: 'msg-123', duration: 45 });
```

**Output:**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "subsystem": "my-subsystem",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Message processed",
  "metadata": {
    "messageId": "msg-123",
    "duration": 45
  }
}
```

### Logger from Message Context

Automatically extract trace ID and correlation ID from a message:

```javascript
import { createStructuredLoggerFromMessage } from './utils/structured-logger.utils.mycelia.js';

const message = new Message('test://path', { data: 'test' });
const logger = createStructuredLoggerFromMessage(message, 'my-subsystem');

logger.info('Processing message', { path: message.getPath() });
// Log automatically includes trace ID from message
```

### Enhanced Logger Utility

The existing `createLogger()` utility now supports structured logging:

```javascript
import { createLogger } from './utils/logger.utils.mycelia.js';

// Traditional text logging (backward compatible)
const textLogger = createLogger(debug, 'my-subsystem');
textLogger.log('Message processed');

// Structured logging (opt-in)
const structuredLogger = createLogger(debug, 'my-subsystem', {
  structured: true,
  traceId: '550e8400-e29b-41d4-a716-446655440000'
});
structuredLogger.log('Message processed', { messageId: 'msg-123' });

// Structured logging with message context
const contextLogger = createLogger(debug, 'my-subsystem', {
  structured: true,
  message: myMessage // Automatically extracts trace ID
});
contextLogger.log('Message processed');
```

## Log Levels

Structured logger supports four log levels:

- **DEBUG**: Detailed debugging information (lowest priority)
- **INFO**: General informational messages
- **WARN**: Warning messages
- **ERROR**: Error messages (highest priority)

```javascript
const logger = createStructuredLogger({ level: 'INFO' });

logger.debug('Debug message'); // Not logged (level too low)
logger.info('Info message');   // Logged
logger.warn('Warning message'); // Logged
logger.error('Error message');  // Logged
```

## Log Format

### JSON Format (Default)

Structured logs output JSON with the following fields:

```json
{
  "timestamp": "ISO 8601 timestamp",
  "level": "DEBUG|INFO|WARN|ERROR",
  "subsystem": "subsystem name (optional)",
  "traceId": "trace ID (optional)",
  "correlationId": "correlation ID (optional)",
  "message": "log message",
  "metadata": { /* additional metadata */ }
}
```

### Text Format (Backward Compatible)

For backward compatibility, text format is also supported:

```
[INFO] [my-subsystem] [trace:550e8400] Message processed { messageId: 'msg-123' }
```

## Configuration Options

### `createStructuredLogger(config)`

**Parameters:**
- `level` (string, default: 'INFO') - Log level: DEBUG, INFO, WARN, ERROR
- `subsystem` (string, default: '') - Subsystem name
- `traceId` (string, default: null) - Trace ID for distributed tracing
- `correlationId` (string, default: null) - Correlation ID for request/response tracking
- `outputFormat` (string, default: 'json') - Output format: 'json' or 'text'
- `debug` (boolean, default: false) - Enable debug logging (overrides level)

**Example:**
```javascript
const logger = createStructuredLogger({
  level: 'DEBUG',
  subsystem: 'my-subsystem',
  traceId: '550e8400-e29b-41d4-a716-446655440000',
  correlationId: 'corr-123',
  outputFormat: 'json',
  debug: false
});
```

### `createStructuredLoggerFromMessage(message, subsystem, config)`

Creates a structured logger with context extracted from a message.

**Parameters:**
- `message` (Message|Object) - Message to extract context from
- `subsystem` (string, default: '') - Subsystem name
- `config` (Object, optional) - Additional logger configuration

**Example:**
```javascript
const message = new Message('test://path', { data: 'test' });
const logger = createStructuredLoggerFromMessage(message, 'my-subsystem', {
  level: 'INFO',
  outputFormat: 'json'
});
```

## Child Loggers

Create child loggers with additional context:

```javascript
const parentLogger = createStructuredLogger({
  subsystem: 'parent',
  traceId: '550e8400-e29b-41d4-a716-446655440000'
});

const childLogger = parentLogger.child({
  subsystem: 'child',
  correlationId: 'corr-123'
});

// Child logger inherits trace ID from parent
childLogger.info('Child operation');
// Output includes both traceId and correlationId
```

## Integration with Existing Code

### Upgrading Existing Loggers

**Before:**
```javascript
const logger = createLogger(debug, 'my-subsystem');
logger.log('Message processed');
```

**After (with structured logging):**
```javascript
const logger = createLogger(debug, 'my-subsystem', {
  structured: true,
  message: message // Optional: extract context from message
});
logger.log('Message processed', { messageId: message.getId() });
```

### In Hooks

```javascript
export const useMyHook = createHook({
  // ...
  fn: (ctx, api, subsystem) => {
    const logger = createLogger(ctx.debug, `useMyHook ${subsystem.name}`, {
      structured: true,
      traceId: ctx.traceId // If available in context
    });
    
    logger.info('Hook initialized', { subsystem: subsystem.name });
    // ...
  }
});
```

### In Subsystems

```javascript
class MySubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    
    this.onInit(() => {
      const logger = createLogger(this.debug, this.name, {
        structured: true
      });
      
      logger.info('Subsystem initialized', { name: this.name });
    });
  }
}
```

## Best Practices

### 1. Include Relevant Context

Always include relevant context in log metadata:

```javascript
logger.info('Message processed', {
  messageId: message.getId(),
  path: message.getPath(),
  duration: processingTime,
  subsystem: 'my-subsystem'
});
```

### 2. Use Appropriate Log Levels

- **DEBUG**: Detailed debugging (development only)
- **INFO**: Normal operations, important events
- **WARN**: Warning conditions, recoverable errors
- **ERROR**: Error conditions, failures

```javascript
logger.debug('Route matched', { pattern: routePattern }); // Development
logger.info('Message processed', { messageId });         // Production
logger.warn('Queue nearly full', { queueSize, maxSize }); // Production
logger.error('Processing failed', { error, messageId });  // Production
```

### 3. Include Trace IDs

Always include trace IDs in logs for correlation:

```javascript
const logger = createStructuredLoggerFromMessage(message, 'my-subsystem');
logger.info('Processing message');
// Trace ID automatically included
```

### 4. Use Structured Metadata

Pass objects as metadata, not strings:

```javascript
// Good
logger.info('Message processed', { 
  messageId: 'msg-123',
  duration: 45,
  status: 'success'
});

// Avoid
logger.info('Message processed', 'msg-123, 45ms, success');
```

### 5. Error Logging

Always include error details in error logs:

```javascript
try {
  // ... process message ...
} catch (error) {
  logger.error('Processing failed', {
    error: error.message,
    stack: error.stack,
    messageId: message.getId(),
    path: message.getPath()
  });
}
```

## Log Aggregation

Structured JSON logs can be easily aggregated and analyzed:

### Using jq

```bash
# Filter logs by trace ID
cat logs.json | jq 'select(.traceId == "550e8400-e29b-41d4-a716-446655440000")'

# Filter errors
cat logs.json | jq 'select(.level == "ERROR")'

# Count logs by subsystem
cat logs.json | jq -r '.subsystem' | sort | uniq -c
```

### Using grep

```bash
# Search for specific trace ID
grep '"traceId":"550e8400-e29b-41d4-a716-446655440000"' logs.json

# Search for errors
grep '"level":"ERROR"' logs.json
```

### Using Log Aggregation Tools

Structured JSON logs work with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** (Grafana)
- **CloudWatch Logs** (AWS)
- **Google Cloud Logging**
- **Azure Monitor**

## Performance Considerations

- **JSON Serialization**: Slightly more overhead than text logging
- **Impact**: Negligible (< 0.1ms per log entry)
- **Recommendation**: Use structured logging in production, text logging for development if needed

## Migration Guide

### Step 1: Enable Structured Logging

```javascript
// Old
const logger = createLogger(debug, 'my-subsystem');

// New (backward compatible)
const logger = createLogger(debug, 'my-subsystem', {
  structured: true
});
```

### Step 2: Add Metadata

```javascript
// Old
logger.log('Message processed');

// New
logger.log('Message processed', { messageId: message.getId() });
```

### Step 3: Use Message Context

```javascript
// Old
const logger = createLogger(debug, 'my-subsystem');

// New
const logger = createLogger(debug, 'my-subsystem', {
  structured: true,
  message: message // Automatically extracts trace ID
});
```

## Examples

### Complete Example

```javascript
import { createStructuredLoggerFromMessage } from './utils/structured-logger.utils.mycelia.js';
import { Message } from './models/message/message.mycelia.js';

class MyService extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    
    this.onInit(() => {
      const router = this.find('router');
      
      router.registerRoute('my-service://process', async (message) => {
        // Create logger from message context
        const logger = createStructuredLoggerFromMessage(message, this.name, {
          level: 'INFO',
          outputFormat: 'json'
        });
        
        logger.info('Processing started', { 
          path: message.getPath(),
          body: message.getBody()
        });
        
        try {
          // ... process message ...
          const result = { success: true };
          
          logger.info('Processing completed', { 
            result,
            duration: Date.now() - message.getMeta().getTimestamp()
          });
          
          return result;
        } catch (error) {
          logger.error('Processing failed', {
            error: error.message,
            stack: error.stack,
            path: message.getPath()
          });
          throw error;
        }
      });
    });
  }
}
```

## API Reference

### `createStructuredLogger(config)`

Create a structured logger instance.

**Returns:** `Object` - Logger with `debug()`, `info()`, `warn()`, `error()`, and `child()` methods

### `createStructuredLoggerFromMessage(message, subsystem, config)`

Create a structured logger with context extracted from a message.

**Returns:** `Object` - Logger with message context

### Logger Methods

- `logger.debug(message, metadata?)` - Log debug message
- `logger.info(message, metadata?)` - Log info message
- `logger.warn(message, metadata?)` - Log warning message
- `logger.error(message, metadata?)` - Log error message
- `logger.child(additionalContext)` - Create child logger with additional context

## See Also

- [Distributed Tracing](./TRACING.md) - Trace ID documentation
- [Logger Utilities](../LOGGER-UTILS.md) - Traditional logger documentation
- [Observability Plan](../../../../OBSERVABILITY-TRACEABILITY-PLAN.md) - Full observability improvement plan




