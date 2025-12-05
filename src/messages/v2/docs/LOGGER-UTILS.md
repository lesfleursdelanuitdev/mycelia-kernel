# Logger Utilities

## Overview

The `logger.utils.mycelia.js` module provides a simple logger abstraction for improved testability and consistency. Loggers conditionally output messages based on a debug flag, making it easy to control logging across the entire system.

**Note:** This module now supports both traditional text logging and structured JSON logging. For detailed information on structured logging with trace IDs, see [Structured Logging](./observability/STRUCTURED-LOGGING.md).

## Purpose

Direct `console.log()` calls have several issues:
- Hard to test (can't easily mock or verify)
- Inconsistent formatting
- No centralized control
- Mixed with application output

The logger utility provides:
- **Conditional logging** - Only logs when debug is enabled
- **Consistent formatting** - Automatic prefixing with subsystem/hook names
- **Testability** - Can be mocked or replaced in tests
- **Error handling** - Errors are always logged (even if debug is off)
- **Structured logging** - Optional JSON output with trace IDs and correlation IDs (see [Structured Logging](./observability/STRUCTURED-LOGGING.md))

## API

### `createLogger(debug, prefix, context)`

Create a logger instance that conditionally logs based on debug flag.

**Parameters:**
- `debug` (boolean, default: `false`) - Whether debug logging is enabled
- `prefix` (string, default: `''`) - Optional prefix for log messages (e.g., subsystem name)
- `context` (Object, optional) - Additional context for structured logging
  - `structured` (boolean) - Enable structured JSON logging
  - `traceId` (string) - Trace ID for distributed tracing
  - `correlationId` (string) - Correlation ID for request/response tracking
  - `message` (Message) - Message to extract context from

**Returns:** `Object` - Logger object with `log()`, `error()`, `warn()`, and `isDebugEnabled()` methods

### `createSubsystemLogger(subsystem)`

Create a logger for a subsystem instance.

**Parameters:**
- `subsystem` (BaseSubsystem, optional) - Subsystem instance

**Returns:** `Object` - Logger object with subsystem name as prefix

**Implementation:**
```javascript
export function createSubsystemLogger(subsystem) {
  return createLogger(subsystem?.debug || false, subsystem?.name || '');
}
```

## Logger Methods

### `logger.log(...args)`

Log an info message (only if debug is enabled).

**Parameters:**
- `...args` (any) - Arguments to log (same as `console.log`)

**Behavior:**
- Only logs if `debug === true`
- Prefixes message with `[prefix]` if prefix is provided
- Uses `console.log()` under the hood

**Example:**
```javascript
const logger = createLogger(true, 'useRouter my-subsystem');
logger.log('Route registered:', pattern);
// Output: [useRouter my-subsystem] Route registered: register/domain
```

### `logger.error(...args)`

Log an error message (always logged, but with prefix only if debug is enabled).

**Parameters:**
- `...args` (any) - Arguments to log (same as `console.error`)

**Behavior:**
- **Always logs** (even if `debug === false`)
- Prefixes message with `[prefix]` only if debug is enabled
- Uses `console.error()` under the hood

**Example:**
```javascript
const logger = createLogger(false, 'useRouter my-subsystem');
logger.error('Failed to register route:', error);
// Output: Failed to register route: [Error details]
// (No prefix because debug is false)

const debugLogger = createLogger(true, 'useRouter my-subsystem');
debugLogger.error('Failed to register route:', error);
// Output: [useRouter my-subsystem] Failed to register route: [Error details]
```

### `logger.warn(...args)`

Log a warning message (only if debug is enabled).

**Parameters:**
- `...args` (any) - Arguments to log (same as `console.warn`)

**Behavior:**
- Only logs if `debug === true`
- Prefixes message with `[prefix]` if prefix is provided
- Uses `console.warn()` under the hood

**Example:**
```javascript
const logger = createLogger(true, 'useRouter my-subsystem');
logger.warn('Route already registered:', pattern);
// Output: [useRouter my-subsystem] Route already registered: register/domain
```

### `logger.isDebugEnabled()`

Check if debug logging is enabled.

**Returns:** `boolean` - True if debug is enabled

**Example:**
```javascript
const logger = createLogger(true, 'my-hook');
if (logger.isDebugEnabled()) {
  // Do expensive debug-only operations
  const stats = computeExpensiveStats();
  logger.log('Stats:', stats);
}
```

## Usage

### In Hooks

The most common pattern is to combine `getDebugFlag()` with `createLogger()`:

```javascript
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useMyHook = createHook({
  kind: 'myhook',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.myhook || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useMyHook ${name}`);
    
    logger.log('Initializing hook');
    
    try {
      // ... initialization
      logger.log('Hook initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize hook:', error);
      throw error;
    }
    
    return new Facet('myhook', { attach: true })
      .add({
        // ... facet methods
      });
  }
});
```

### In BaseSubsystem

Use `createSubsystemLogger()` for subsystem-level logging:

```javascript
import { createSubsystemLogger } from '../../utils/logger.utils.mycelia.js';

export class BaseSubsystem {
  async build(ctx = {}) {
    // ... build logic
    this._isBuilt = true;
    const logger = createSubsystemLogger(this);
    logger.log('Built successfully');
    return this;
  }
  
  async dispose() {
    const logger = createSubsystemLogger(this);
    for (const cb of this._disposeCallbacks) {
      try {
        await cb();
      } catch (err) {
        logger.error('Dispose callback error:', err);
      }
    }
    logger.log('Disposed');
  }
}
```

### Runtime Debug Flags

Sometimes you need to check a runtime debug flag (from options) with a fallback to the hook's debug flag:

```javascript
async accept(message, options = {}) {
  // Use runtime debug flag from options, fallback to hook debug
  const runtimeDebug = options.debug !== undefined ? options.debug : debug;
  if (runtimeDebug) {
    const runtimeLogger = createLogger(runtimeDebug, `useMessageProcessor ${name}`);
    runtimeLogger.error('Failed to send auth failure:', error);
  }
}
```

## Formatting

### Prefix Format

When a prefix is provided, messages are formatted as:
```
[prefix] message content
```

**Examples:**
```javascript
createLogger(true, 'useRouter my-subsystem').log('Route registered');
// Output: [useRouter my-subsystem] Route registered

createLogger(true, 'kernel').log('Initialized');
// Output: [kernel] Initialized

createLogger(true, '').log('No prefix');
// Output: No prefix
```

### Multiple Arguments

The logger passes all arguments directly to the console methods:

```javascript
logger.log('User:', user.name, 'Age:', user.age);
// Output: [prefix] User: John Age: 30

logger.error('Error code:', 500, error);
// Output: [prefix] Error code: 500 [Error object]
```

## Error Handling

### Errors Are Always Logged

Unlike `log()` and `warn()`, `error()` always outputs, even when debug is disabled:

```javascript
const logger = createLogger(false, 'my-hook');

logger.log('This is hidden');        // No output
logger.warn('This is hidden');       // No output
logger.error('This is shown');      // Output: This is shown (no prefix)
```

This ensures critical errors are never missed, even in production.

### Prefix Behavior for Errors

- **Debug enabled**: Errors include prefix
- **Debug disabled**: Errors are logged without prefix

This allows production error monitoring while keeping debug output organized.

## Testing

### Mocking Loggers

In tests, you can replace the logger with a mock:

```javascript
import { createLogger } from './logger.utils.mycelia.js';

// In test
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  isDebugEnabled: () => true
};

// Or create a real logger and verify calls
const logger = createLogger(true, 'test');
logger.log('Test message');
expect(console.log).toHaveBeenCalledWith('[test]', 'Test message');
```

### Disabling Logs in Tests

```javascript
// Disable all logging in test environment
const logger = createLogger(false, 'test');
logger.log('This will not output');
```

## Best Practices

1. **Always use logger utilities** - Don't use `console.log()` directly
2. **Combine with debug flags** - Use `getDebugFlag()` to determine logger state
3. **Use appropriate methods** - Use `log()` for info, `warn()` for warnings, `error()` for errors
4. **Include context in prefix** - Use descriptive prefixes like `useRouter ${name}`
5. **Use subsystem logger** - Use `createSubsystemLogger()` in BaseSubsystem methods
6. **Handle runtime flags** - Support `options.debug` for runtime control

## Migration from console.log

### Before

```javascript
if (this.debug) {
  console.log(`[${this.name}] Built successfully`);
}
```

### After

```javascript
const logger = createSubsystemLogger(this);
logger.log('Built successfully');
```

### Before

```javascript
if (debug) {
  console.error(`useRouter ${name}: Error:`, error);
}
```

### After

```javascript
const logger = createLogger(debug, `useRouter ${name}`);
logger.error('Error:', error);
```

## Structured Logging

The logger utility now supports structured JSON logging with trace IDs and correlation IDs. This is useful for production environments where logs need to be aggregated and analyzed.

### Enabling Structured Logging

```javascript
// Traditional text logging (default)
const logger = createLogger(debug, 'my-subsystem');
logger.log('Message processed');

// Structured JSON logging (opt-in)
const logger = createLogger(debug, 'my-subsystem', {
  structured: true,
  traceId: '550e8400-e29b-41d4-a716-446655440000'
});
logger.log('Message processed', { messageId: 'msg-123' });
// Output: {"timestamp":"2024-01-01T12:00:00.000Z","level":"INFO","subsystem":"my-subsystem","traceId":"550e8400-e29b-41d4-a716-446655440000","message":"Message processed","metadata":{"messageId":"msg-123"}}
```

### Automatic Context Extraction

The logger can automatically extract trace IDs and correlation IDs from messages:

```javascript
const message = new Message('test://path', { data: 'test' });
const logger = createLogger(debug, 'my-subsystem', {
  structured: true,
  message: message // Automatically extracts trace ID
});
logger.log('Processing message');
// Trace ID from message is automatically included in logs
```

### When to Use Structured Logging

- **Production environments** - For log aggregation and analysis
- **Distributed systems** - For correlating logs across subsystems
- **Debugging complex issues** - For tracing requests end-to-end
- **Integration with monitoring tools** - For integration with observability platforms

For more details, see [Structured Logging](./observability/STRUCTURED-LOGGING.md).

## See Also

- [Debug Flag Utilities](./DEBUG-FLAG-UTILS.md) - For extracting debug flags
- [Base Subsystem](./BASE-SUBSYSTEM.md) - For subsystem-level logging
- [Structured Logging](./observability/STRUCTURED-LOGGING.md) - Detailed structured logging guide
- [Distributed Tracing](./observability/TRACING.md) - Trace ID documentation
- [Hooks Documentation](./hooks/HOOKS.md) - For hook development patterns

