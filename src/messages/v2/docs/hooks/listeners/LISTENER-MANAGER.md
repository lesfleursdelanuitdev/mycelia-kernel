# ListenerManager Class

## Overview

The `ListenerManager` class manages listener registration and notification for subsystems using pluggable policies. It provides the core functionality for event-driven communication patterns, supporting both exact path matching and pattern-based matching with parameter extraction.

**Key Features:**
- **Pluggable Registration Policies**: Configurable policies for managing listener registration (multiple, single, replace, limited)
- **Exact Path Matching**: Register listeners for specific message paths
- **Pattern Matching**: Register listeners for patterns with parameter extraction (e.g., `{domain}/store`)
- **Handler Groups**: Support for registering multiple handlers as a single group (onSuccess, onFailure, onTimeout)
- **Statistics Tracking**: Built-in statistics for monitoring listener activity
- **Policy Management**: Register and unregister custom policies

## Constructor

### `new ListenerManager(options)`

Create a new `ListenerManager` instance.

**Parameters:**
- `options` (object, optional) - Configuration options:
  - `registrationPolicy` (string, default: `'multiple'`) - Registration policy name
  - `debug` (boolean, default: `false`) - Enable debug logging
  - `policyOptions` (object, default: `{}`) - Policy-specific configuration options

**Returns:** `ListenerManager` - New instance

**Example:**
```javascript
// Basic listener manager
const listenerManager = new ListenerManager();

// Configured listener manager
const listenerManager = new ListenerManager({
  registrationPolicy: 'single',
  debug: true,
  policyOptions: { maxListeners: 5 }
});
```

## Core Methods

### `on(path, handler)`

Register a listener for a specific message path.

**Signature:**
```javascript
on(path, handler) => boolean
```

**Parameters:**
- `path` (string, required) - Exact message path to listen for (e.g., `'layer/create'`, `'domain/register'`)
- `handler` (Function, required) - Handler function: `(message) => void`

**Returns:** `boolean` - `true` if registration successful

**Throws:**
- `Error` - If handler is not a function
- `Error` - If registration policy prevents registration
- `Error` - If policy is unknown

**Behavior:**
- Applies the configured registration policy
- Stores handler in internal `listeners` Map
- Updates statistics
- Logs debug message if debug is enabled

**Example:**
```javascript
listenerManager.on('layer/create', (message) => {
  console.log('Layer created:', message.getBody());
});
```

### `off(path, handler)`

Unregister a specific listener for a path.

**Signature:**
```javascript
off(path, handler) => boolean
```

**Parameters:**
- `path` (string, required) - Message path
- `handler` (Function, required) - Handler function to remove

**Returns:** `boolean` - `true` if handler was found and removed, `false` otherwise

**Behavior:**
- Removes handler from internal storage
- Cleans up empty path entries
- Updates statistics
- Logs debug message if debug is enabled

**Example:**
```javascript
const handler = (message) => console.log('Handled:', message);
listenerManager.on('message/path', handler);
// Later...
listenerManager.off('message/path', handler);
```

### `offAll(path)`

Unregister all listeners for a specific path.

**Signature:**
```javascript
offAll(path) => number
```

**Parameters:**
- `path` (string, required) - Message path

**Returns:** `number` - Number of listeners removed

**Example:**
```javascript
const removed = listenerManager.offAll('layer/create');
console.log(`Removed ${removed} listeners`);
```

### `clearListeners()`

Clear all listeners (both exact and pattern).

**Signature:**
```javascript
clearListeners() => number
```

**Returns:** `number` - Total number of listeners removed

**Example:**
```javascript
const totalRemoved = listenerManager.clearListeners();
```

## Pattern Matching Methods

### `onPattern(pattern, handler)`

Register a listener for a pattern path with parameter extraction.

**Signature:**
```javascript
onPattern(pattern, handler) => boolean
```

**Parameters:**
- `pattern` (string, required) - Pattern path with `{param}` placeholders (e.g., `'command/completed/id/{id}'`, `'{domain}/store'`)
- `handler` (Function, required) - Handler function: `(message, params) => void`
  - `message` - The message object
  - `params` - Extracted parameters object (e.g., `{ id: 'msg_123' }`)

**Returns:** `boolean` - `true` if registration successful

**Throws:**
- `Error` - If handler is not a function
- `Error` - If pattern does not contain pattern syntax
- `Error` - If pattern contains no valid parameters
- `Error` - If registration policy prevents registration

**Behavior:**
- Parses pattern to extract parameter names
- Converts pattern to regex for matching
- Stores handler in internal `patternListeners` Map
- Applies registration policy
- Updates statistics

**Example:**
```javascript
// Register pattern listener
listenerManager.onPattern('command/completed/id/{id}', (message, params) => {
  console.log('Command completed:', params.id);
});

// Register with multiple parameters
listenerManager.onPattern('{domain}/store/{key}', (message, params) => {
  console.log('Domain:', params.domain, 'Key:', params.key);
});
```

### `offPattern(pattern, handler)`

Unregister a pattern listener.

**Signature:**
```javascript
offPattern(pattern, handler) => boolean
```

**Parameters:**
- `pattern` (string, required) - Pattern path
- `handler` (Function, required) - Handler function to remove

**Returns:** `boolean` - `true` if handler was found and removed, `false` otherwise

**Example:**
```javascript
const handler = (message, params) => console.log('Matched:', params);
listenerManager.onPattern('{domain}/store', handler);
// Later...
listenerManager.offPattern('{domain}/store', handler);
```

### `isPattern(path)`

Check if a path contains pattern syntax.

**Signature:**
```javascript
isPattern(path) => boolean
```

**Parameters:**
- `path` (string, required) - Path to check

**Returns:** `boolean` - `true` if path contains `{param}` syntax

**Example:**
```javascript
listenerManager.isPattern('command/completed/id/{id}'); // true
listenerManager.isPattern('command/completed'); // false
```

## Handler Group Methods

### `registerHandlerGroup(path, handlers)`

Register a handler group for a specific path. Handler groups contain `onSuccess`, `onFailure`, and `onTimeout` callbacks.

**Signature:**
```javascript
registerHandlerGroup(path, handlers, options = {}) => boolean
```

**Parameters:**
- `path` (string, required) - Message path to listen for
- `handlers` (object, required) - Handler group object:
  - `onSuccess` (Function, optional) - Success callback: `(message) => void`
  - `onFailure` (Function, optional) - Failure callback: `(message) => void`
  - `onTimeout` (Function, optional) - Timeout callback: `(message) => void`
- `options` (object, optional) - Registration options (currently unused)

**Returns:** `boolean` - `true` if registration successful

**Throws:**
- `Error` - If handlers is not an object

**Behavior:**
- Wraps handler group into a function with attached properties
- Registers the wrapped handler using `on()`
- Handler group properties are accessible via `handler.onSuccess`, `handler.onFailure`, `handler.onTimeout`

**Example:**
```javascript
listenerManager.registerHandlerGroup('save/msg_123', {
  onSuccess: (message) => console.log('Success:', message),
  onFailure: (message) => console.error('Failure:', message),
  onTimeout: (message) => console.warn('Timeout:', message)
});
```

### `unregisterHandlerGroup(path, handlers)`

Unregister a handler group for a specific path.

**Signature:**
```javascript
unregisterHandlerGroup(path, handlers, options = {}) => boolean
```

**Parameters:**
- `path` (string, required) - Message path
- `handlers` (object, required) - Handler group object to remove (must match registered group)
- `options` (object, optional) - Unregistration options (currently unused)

**Returns:** `boolean` - `true` if handler group was found and removed, `false` otherwise

**Example:**
```javascript
const handlerGroup = {
  onSuccess: handler1,
  onFailure: handler2,
  onTimeout: handler3
};

listenerManager.registerHandlerGroup('save/msg_123', handlerGroup);
// Later...
listenerManager.unregisterHandlerGroup('save/msg_123', handlerGroup);
```

## Notification Methods

### `notifyListeners(path, message)`

Notify listeners for a specific path. Checks both exact path matches and pattern matches.

**Signature:**
```javascript
notifyListeners(path, message) => number
```

**Parameters:**
- `path` (string, required) - Message path
- `message` (Message, required) - Message object to send to listeners

**Returns:** `number` - Number of listeners notified

**Behavior:**
1. Checks exact path matches first
2. Checks pattern matches and extracts parameters
3. Calls handlers with message (and params for pattern matches)
4. Updates statistics
5. Logs debug message if debug is enabled

**Example:**
```javascript
// Notify listeners after processing a message
const notified = listenerManager.notifyListeners('layer/create', message);
console.log(`Notified ${notified} listeners`);
```

### `notifyAllListeners(message)`

Notify all listeners (broadcast).

**Signature:**
```javascript
notifyAllListeners(message) => number
```

**Parameters:**
- `message` (Message, required) - Message object to broadcast

**Returns:** `number` - Total number of listeners notified

**Example:**
```javascript
// Broadcast to all listeners
const notified = listenerManager.notifyAllListeners(message);
```

## Query Methods

### `hasListeners(path)`

Check if there are listeners for a specific path.

**Signature:**
```javascript
hasListeners(path) => boolean
```

**Parameters:**
- `path` (string, required) - Message path

**Returns:** `boolean` - `true` if listeners exist for the path

**Example:**
```javascript
if (listenerManager.hasListeners('layer/create')) {
  console.log('Has listeners for layer creation');
}
```

### `getListenerCount(path)`

Get the number of listeners for a specific path.

**Signature:**
```javascript
getListenerCount(path) => number
```

**Parameters:**
- `path` (string, required) - Message path

**Returns:** `number` - Number of listeners for the path

**Example:**
```javascript
const count = listenerManager.getListenerCount('layer/create');
```

### `getListeners(path)`

Get all listeners for a specific path.

**Signature:**
```javascript
getListeners(path) => Array<Function>
```

**Parameters:**
- `path` (string, required) - Message path

**Returns:** `Array<Function>` - Array of handler functions (copy)

**Example:**
```javascript
const handlers = listenerManager.getListeners('layer/create');
```

### `getAllListeners()`

Get all listeners (for debugging).

**Signature:**
```javascript
getAllListeners() => Object
```

**Returns:** `Object` - Object with paths as keys and handler arrays as values

**Example:**
```javascript
const allListeners = listenerManager.getAllListeners();
console.log('All listeners:', allListeners);
```

### `hasPatternListeners(pattern)`

Check if pattern listeners exist for a pattern.

**Signature:**
```javascript
hasPatternListeners(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Pattern path

**Returns:** `boolean` - `true` if pattern listeners exist

### `getPatternListenerCount(pattern)`

Get pattern listener count for a specific pattern.

**Signature:**
```javascript
getPatternListenerCount(pattern) => number
```

**Parameters:**
- `pattern` (string, required) - Pattern path

**Returns:** `number` - Total number of handlers for this pattern

### `getRegisteredPatterns()`

Get all registered patterns.

**Signature:**
```javascript
getRegisteredPatterns() => Array<string>
```

**Returns:** `Array<string>` - Array of pattern strings

**Example:**
```javascript
const patterns = listenerManager.getRegisteredPatterns();
console.log('Registered patterns:', patterns);
```

## Policy Management Methods

### `setListenerPolicy(policy, options)`

Set the listener registration policy.

**Signature:**
```javascript
setListenerPolicy(policy, options = {}) => boolean
```

**Parameters:**
- `policy` (string, required) - Registration policy name (see [CONFIG.md](./CONFIG.md))
- `options` (object, optional) - Policy-specific options

**Returns:** `boolean` - `true` if policy was set successfully

**Throws:**
- `Error` - If policy is unknown
- `Error` - If policy options are invalid

**Example:**
```javascript
// Set policy to only allow one listener per path
listenerManager.setListenerPolicy('single');

// Set policy with options
listenerManager.setListenerPolicy('limited', { maxListeners: 5 });
```

### `getListenerPolicy()`

Get the current listener registration policy.

**Signature:**
```javascript
getListenerPolicy() => string
```

**Returns:** `string` - Current policy name

**Example:**
```javascript
const policy = listenerManager.getListenerPolicy();
```

### `registerPolicy(name, policyFunction)`

Register a new custom policy.

**Signature:**
```javascript
registerPolicy(name, policyFunction) => void
```

**Parameters:**
- `name` (string, required) - Policy name
- `policyFunction` (Function, required) - Policy function:
  ```javascript
  (existingListeners, path, handler, options) => {
    return {
      success: boolean,
      listeners: Array<Function>,
      error: string | null
    };
  }
  ```

**Throws:**
- `Error` - If policyFunction is not a function

**Example:**
```javascript
listenerManager.registerPolicy('my-custom', (existingListeners, path, handler, options) => {
  // Custom policy logic
  if (existingListeners.length >= options.maxListeners) {
    return {
      success: false,
      listeners: existingListeners,
      error: 'Maximum listeners reached'
    };
  }
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
});
```

### `unregisterPolicy(name)`

Unregister a custom policy (cannot unregister default policies).

**Signature:**
```javascript
unregisterPolicy(name) => boolean
```

**Parameters:**
- `name` (string, required) - Policy name

**Returns:** `boolean` - `true` if policy was removed, `false` if not found

**Throws:**
- `Error` - If attempting to unregister a default policy

**Example:**
```javascript
listenerManager.unregisterPolicy('my-custom');
```

### `getAvailablePolicies()`

Get available policy names.

**Signature:**
```javascript
getAvailablePolicies() => Array<string>
```

**Returns:** `Array<string>` - Array of policy names

**Example:**
```javascript
const policies = listenerManager.getAvailablePolicies();
console.log('Available policies:', policies);
```

## Validation Methods

### `validateListener(path, handler)`

Validate if a listener can be added for a path.

**Signature:**
```javascript
validateListener(path, handler) => Object
```

**Parameters:**
- `path` (string, required) - Message path
- `handler` (Function, required) - Handler function

**Returns:** `Object` - Validation result:
  - `valid` (boolean) - Whether listener can be added
  - `reason` (string | null) - Error reason if invalid

**Example:**
```javascript
const validation = listenerManager.validateListener('layer/create', handler);
if (!validation.valid) {
  console.log('Cannot add listener:', validation.reason);
}
```

## Statistics Methods

### `getStatistics()`

Get listener manager statistics.

**Signature:**
```javascript
getStatistics() => Object
```

**Returns:** `Object` - Statistics object:
  - `listenersRegistered` (number) - Total listeners registered
  - `listenersUnregistered` (number) - Total listeners unregistered
  - `notificationsSent` (number) - Total notifications sent
  - `notificationErrors` (number) - Total notification errors
  - `patternListenersRegistered` (number) - Pattern listeners registered
  - `patternListenersUnregistered` (number) - Pattern listeners unregistered
  - `patternMatches` (number) - Pattern matches found
  - `registrationPolicy` (string) - Current registration policy
  - `policyOptions` (object) - Current policy options
  - `availablePolicies` (Array<string>) - Available policy names
  - `totalPaths` (number) - Total exact paths
  - `totalListeners` (number) - Total listeners (exact + pattern)
  - `exactPaths` (number) - Number of exact paths
  - `exactListeners` (number) - Number of exact listeners
  - `patternCount` (number) - Number of pattern paths
  - `patternListeners` (number) - Number of pattern listeners

**Example:**
```javascript
const stats = listenerManager.getStatistics();
console.log('Total listeners:', stats.totalListeners);
console.log('Notifications sent:', stats.notificationsSent);
```

## Utility Methods

### `clear()`

Clear statistics and reset state (removes all listeners).

**Signature:**
```javascript
clear() => void
```

**Behavior:**
- Resets all statistics to zero
- Clears all listeners (exact and pattern)
- Logs debug message if debug is enabled

**Example:**
```javascript
listenerManager.clear();
```

## Pattern Syntax

Patterns use `{paramName}` syntax for parameter extraction:

- **Single Parameter**: `'command/completed/id/{id}'` → matches `'command/completed/id/msg_123'` with `params = { id: 'msg_123' }`
- **Multiple Parameters**: `'{domain}/store/{key}'` → matches `'myDomain/store/item1'` with `params = { domain: 'myDomain', key: 'item1' }`
- **Parameter Names**: Must start with letter or underscore, followed by letters, numbers, or underscores

**Pattern Matching Rules:**
1. Patterns are converted to regex with capture groups
2. Each `{param}` becomes `(.+)` in the regex
3. Patterns are anchored to start and end (`^pattern$`)
4. Special regex characters are escaped (except `{` and `}`)
5. Longest matching pattern wins when multiple patterns match

## Internal Storage

The `ListenerManager` uses two internal Maps:

1. **`listeners`**: `Map<string, Array<Function>>` - Exact path → handler array
2. **`patternListeners`**: `Map<string, Array<PatternEntry>>` - Pattern → pattern entry array
   - Each `PatternEntry` contains:
     - `pattern` (string) - Original pattern
     - `paramNames` (Array<string>) - Parameter names
     - `regex` (RegExp) - Compiled regex
     - `handlers` (Array<Function>) - Handler functions

## Error Handling

- **Handler Validation**: All handlers must be functions
- **Policy Validation**: Policies are validated before application
- **Pattern Validation**: Patterns must contain valid `{param}` syntax
- **Notification Errors**: Errors in handlers are caught and logged, but don't stop other handlers

## Best Practices

1. **Use Exact Paths When Possible**: Exact path matching is faster than pattern matching
2. **Use Patterns for Dynamic Paths**: Use patterns when paths contain variable parts
3. **Clean Up Listeners**: Always unregister listeners when no longer needed
4. **Handle Errors**: Listeners should handle errors internally
5. **Use Appropriate Policies**: Choose policies that match your use case
6. **Monitor Statistics**: Use `getStatistics()` to monitor listener activity

## See Also

- [useListeners Hook](./USE-LISTENERS.md) - Hook that wraps ListenerManager
- [Configuration](./CONFIG.md) - Configuration options and values
- [Listener Manager Policies](../listener-manager-policies.mycelia.js) - Policy implementations

