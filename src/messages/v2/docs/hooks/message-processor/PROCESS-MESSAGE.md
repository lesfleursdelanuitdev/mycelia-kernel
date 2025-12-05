# processMessage Utility

## Overview

The `process-message.mycelia.js` module provides utility functions for processing messages through the complete processing pipeline. It includes both a factory function (`createProcessMessageCore`) for creating configured processing functions and a low-level utility (`processMessage`) that handles route matching, handler execution, and error handling, serving as the core message processing logic for subsystems.

**Key Features:**
- **Factory Function**: `createProcessMessageCore` creates configured processing functions with dependencies
- **Route Matching**: Matches message paths to registered route handlers
- **Handler Execution**: Executes matched handlers with proper parameters
- **Error Handling**: Comprehensive error handling and reporting
- **Statistics Tracking**: Records processing time and errors
- **Debug Support**: Conditional debug logging

## Factory Function

### `createProcessMessageCore(dependencies)`

Create a `processMessageCore` function with the given dependencies.

**Signature:**
```javascript
createProcessMessageCore(dependencies) => Function
```

**Parameters:**
- `dependencies` (Object, required) - Dependencies object:
  - `routeRegistry` (SubsystemRouter, required) - Route registry for pattern matching
  - `ms` (Object, optional) - MessageSystem instance (for error reporting)
  - `statisticsFacet` (Object, optional) - Statistics facet (for recording statistics)
  - `debug` (boolean, required) - Debug flag
  - `subsystemName` (string, required) - Subsystem name for logging

**Returns:** `Function` - `processMessageCore` function: `(message, options) => Promise<Object>`

**Behavior:**
- Creates a configured `processMessageCore` function with all dependencies bound
- The returned function handles error reporting, statistics recording, and debug logging
- Used internally by `useMessageProcessor` hook to create the core processing function

**Example:**
```javascript
import { createProcessMessageCore } from './process-message.mycelia.js';

const processMessageCore = createProcessMessageCore({
  routeRegistry: routerFacet._routeRegistry,
  ms: messageSystem,
  statisticsFacet: statisticsFacet,
  debug: true,
  subsystemName: 'my-subsystem'
});

// Use the created function
const result = await processMessageCore(message, options);
```

**Note:** This factory function is used by the `useMessageProcessor` hook to create the core processing function. It encapsulates the setup of error reporting, statistics recording, and debug logging.

## Function Signature

### `processMessage(context, message, options)`

Process a message through the complete processing pipeline.

**Signature:**
```javascript
processMessage(context, message, options = {}) => Promise<Object>
```

**Parameters:**
- `context` (Object, required) - Context object with subsystem dependencies (see Context Object below)
- `message` (Message, required) - Message to process
- `options` (Object, optional) - Processing options:
  - `callerId` (Symbol, optional) - Secret identity Symbol of the calling subsystem (from `sendProtected`)

**Returns:** `Promise<Object>` - Processing result object

**Throws:**
- `Error` - If access control wrapper is not initialized
- `Error` - If processing fails (handler errors, etc.)

## Context Object

The `context` parameter must contain the following properties:

### Required Properties

#### `routeRegistry`

**Type:** `SubsystemRouter` (or compatible route registry)

**Description:** Route registry for pattern matching. Used to find the handler for a message path.

**Example:**
```javascript
const context = {
  routeRegistry: routerFacet._routeRegistry,
  // ... other properties
};
```

#### `errorReporter`

**Type:** `Function` - `(message, authResult) => Promise<void>`

**Description:** Function to report authentication failures to the error system.

**Parameters:**
- `message` (Message) - Message that failed authorization
- `authResult` (Object) - Authorization result object with failure details

**Example:**
```javascript
const context = {
  errorReporter: async (message, authResult) => {
    if (ms) {
      await ms.sendError('kernel://error/record/auth_failed', message, {
        meta: {
          authFailure: {
            type: authResult.type,
            message: authResult.message,
            details: authResult.details
          }
        }
      });
    }
  },
  // ... other properties
};
```

#### `statisticsRecorder`

**Type:** `Function` - `(processingTime) => void`

**Description:** Function to record successful message processing with processing time.

**Parameters:**
- `processingTime` (number) - Processing time in milliseconds

**Example:**
```javascript
const context = {
  statisticsRecorder: (processingTime) => {
    if (statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordProcessed(processingTime);
    }
  },
  // ... other properties
};
```

#### `errorRecorder`

**Type:** `Function` - `() => void`

**Description:** Function to record processing errors.

**Example:**
```javascript
const context = {
  errorRecorder: () => {
    if (statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordError();
    }
  },
  // ... other properties
};
```

#### `debug`

**Type:** `boolean`

**Description:** Debug flag for conditional logging.

**Example:**
```javascript
const context = {
  debug: true,  // Enable debug logging
  // ... other properties
};
```

#### `subsystemName`

**Type:** `string`

**Description:** Subsystem name for logging purposes.

**Example:**
```javascript
const context = {
  subsystemName: 'my-subsystem',
  // ... other properties
};
```

## Processing Pipeline

The `processMessage` function executes a two-step pipeline:

### Step 1: Route Matching

Matches the message path to a registered route handler.

**Process:**
1. Gets path from message (via `message.getPath()`)
2. Matches route using route registry's `match()` method
3. Returns match object with handler, params, and route entry

**Result:**
- **Success**: Returns match object with handler and route details
- **Failure**: Returns `null` if no route matches

**Error Handling:**
- If no route matches, records error and returns failure result
- Includes available routes in error result for debugging

### Step 2: Handler Execution

Executes the matched handler with proper parameters.

**Process:**
1. Records start time
2. Calls handler with message, route iterator, and parameters
3. Records processing time
4. Records statistics if result indicates success

**Handler Signature:**
```javascript
async (message, params, options) => result
```

**Parameters:**
- `message` (Message) - The message being processed
- `params` (Object) - Extracted route parameters (e.g., `{domain: 'example.com'}`)
- `options` (Object) - Processing options

**Result:**
- Returns handler execution result
- Records processing time if successful

## Return Values

### Success Result

When processing succeeds, returns the handler's result:

```javascript
{
  success: true,
  // ... handler-specific result data
}
```

**Note:** The exact structure depends on the handler implementation.

### Route Not Found Result

When no route matches:

```javascript
{
  success: false,
  error: "No route handler found for path: {path}",
  subsystem: "subsystem-name",
  availableRoutes: ["route1", "route2", ...]
}
```


## Error Handling

### Handler Execution Errors

If the handler throws an error:

1. Error is recorded via `errorRecorder()`
2. Error is logged if debug is enabled
3. Error is re-thrown (not caught)

**Example:**
```javascript
try {
  const result = await processMessage(context, message, options);
} catch (error) {
  // Handler threw an error
  console.error('Handler error:', error);
}
```

### Route Matching Errors

If route matching fails:

1. Error is recorded via `errorRecorder()`
2. Warning is logged if debug is enabled
3. Returns failure result (does not throw)

## Internal Functions

### `matchRoute(routeRegistry, message)`

Matches a route for the message.

**Signature:**
```javascript
matchRoute(routeRegistry, message) => Object | null
```

**Parameters:**
- `routeRegistry` (SubsystemRouteRegistry) - Route registry
- `message` (Message) - Message to match

**Returns:** Route match object or `null` if no match

**Behavior:**
- Gets path from message (via `message.getPath()`)
- Matches route using route registry's `match()` method
- Returns match object with handler, params, and route entry

**Match Object Structure:**
```javascript
{
  handler: Function,      // Handler function
  params: Object,          // Extracted parameters
  routeEntry: RouteEntry   // Route entry object
}
```

### `executeHandler(match, message, statisticsRecorder)`

Executes the matched handler.

**Signature:**
```javascript
executeHandler(match, message, statisticsRecorder) => Promise<Object>
```

**Parameters:**
- `match` (Object) - Route match object
- `message` (Message) - Message being processed
- `statisticsRecorder` (Function) - Function to record processing time

**Returns:** `Promise<Object>` - Handler execution result

**Behavior:**
1. Records start time
2. Calls handler with message, params, and options
3. Calculates processing time
4. Records statistics if result indicates success
5. Returns handler result

**Statistics Recording:**
- Only records if `result.success !== false`
- Records processing time in milliseconds

## Usage Examples

### Using createProcessMessageCore (Recommended)

```javascript
import { createProcessMessageCore } from './process-message.mycelia.js';

// Create configured processing function
const processMessageCore = createProcessMessageCore({
  routeRegistry: routerFacet._routeRegistry,
  ms: messageSystem,
  statisticsFacet: statisticsFacet,
  debug: true,
  subsystemName: 'my-subsystem'
});

// Use the created function
const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await processMessageCore(message, {
  callerId: secretIdentity
});
```

### Using processMessage Directly

```javascript
import { processMessage } from './process-message.mycelia.js';

const context = {
  routeRegistry: routerFacet._routeRegistry,
  errorReporter: async (message, authResult) => {
    if (ms) {
      await ms.sendError('kernel://error/record/auth_failed', message, {
        meta: { authFailure: authResult }
      });
    }
  },
  statisticsRecorder: (processingTime) => {
    statisticsFacet._statistics.recordProcessed(processingTime);
  },
  errorRecorder: () => {
    statisticsFacet._statistics.recordError();
  },
  debug: true,
  subsystemName: 'my-subsystem'
};

const message = messageFactory.createCommand('register/domain', { name: 'example.com' });
const result = await processMessage(context, message, {});
```

### With Error Handling

```javascript
try {
  const result = await processMessage(context, message, options);
  
  if (result.success === false) {
    if (result.error) {
      console.error('Processing failed:', result.error);
    } else if (result.type === 'auth_failed') {
      console.error('Authorization failed:', result.message);
    }
  } else {
    console.log('Processing succeeded:', result);
  }
} catch (error) {
  console.error('Handler error:', error);
}
```

### Integration with useMessageProcessor

The `useMessageProcessor` hook uses `createProcessMessageCore` to create the core processing function:

```javascript
// In useMessageProcessor hook
import { createProcessMessageCore } from './process-message.mycelia.js';

// Create processMessageCore function with dependencies
const processMessageCore = createProcessMessageCore({
  routeRegistry: routerFacet._routeRegistry,
  ms,
  statisticsFacet,
  debug,
  subsystemName: name
});

// Use in facet methods
async processMessage(pairOrMessage, options = {}) {
  // ... extract message and options ...
  return await processMessageCore(message, finalOptions);
}
```

## Processing Flow Diagram

```
Message
  ↓
[Step 1: Route Matching]
  ├─ Success → [Step 2: Handler Execution]
  └─ Failure → Return {success: false, error: "No route found"}
  
[Step 2: Handler Execution]
  ├─ Success → Record stats, Return result
  └─ Error → Record error, Throw exception
```

## Route Matching

### Message Path

Messages provide a path (via `message.getPath()`) that is used for matching:

```javascript
const path = message.getPath();
const match = routeRegistry.match(path);
```

**Note:** The path is a string representing the message route (e.g., `'register/domain'`, `'query/get-data'`).

### Match Object

The match object contains:

- **`handler`** (Function): Handler function to execute
- **`params`** (Object): Extracted route parameters
- **`routeEntry`** (RouteEntry): Route entry object with metadata

## Statistics Tracking

### Processing Time

Processing time is recorded for successful operations:

```javascript
const startTime = Date.now();
const result = await handler(message, routeIterator, params);
const processingTime = Date.now() - startTime;

if (result && result.success !== false) {
  statisticsRecorder(processingTime);
}
```

**Note:** Statistics are only recorded if the result indicates success (`result.success !== false`).

### Error Recording

Errors are recorded in the following cases:

1. **No Route Found**: `errorRecorder()` is called
2. **Handler Error**: `errorRecorder()` is called (before re-throwing)

## Debug Logging

Debug messages are logged conditionally based on the `debug` flag:

- **No Route Found**: Warning logged with path and available routes
- **Handler Error**: Error logged with message ID and error details

**Example:**
```javascript
if (debug) {
  console.warn(`BaseSubsystem ${subsystemName}: No route handler found for path: ${message.getPath()}`);
}
```

## Best Practices

1. **Use createProcessMessageCore**: Prefer using `createProcessMessageCore` factory function for creating configured processing functions
2. **Always Provide Context**: Ensure all required context properties are provided when using `processMessage` directly
3. **Handle Errors**: Always handle both thrown errors and failure results
4. **Check Results**: Check `result.success` to determine processing outcome
5. **Use Statistics**: Ensure statistics recording is properly configured
6. **Enable Debug**: Enable debug logging during development

## Error Scenarios

### Scenario 1: No Route Found

```javascript
const result = await processMessage(context, message, options);
// result = {
//   success: false,
//   error: "No route handler found for path: register/domain",
//   subsystem: "my-subsystem",
//   availableRoutes: ["query/*", "command/execute"]
// }
```

### Scenario 2: Authorization Failed

```javascript
const result = await processMessage(context, message, options);
// result = {
//   success: false,
//   type: "auth_failed",
//   message: "Authorization failed: Insufficient permissions",
//   details: { /* ... */ }
// }
// Also: Error reported to error system via errorReporter()
```

### Scenario 3: Handler Error

```javascript
try {
  const result = await processMessage(context, message, options);
} catch (error) {
  // Handler threw an error
  // Error already recorded via errorRecorder()
  console.error('Handler error:', error);
}
```

## See Also

- [useMessageProcessor Hook](./USE-MESSAGE-PROCESSOR.md) - Hook that uses this utility
- [acceptMessage](./accept-message.mycelia.js) - Message acceptance utility
- [Router Documentation](../router/) - Route registration and matching
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

