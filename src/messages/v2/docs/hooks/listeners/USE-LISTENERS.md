# useListeners Hook

## Overview

The `useListeners` hook provides listener management functionality to subsystems. It wraps the `ListenerManager` class and exposes methods for registering and unregistering message listeners, enabling event-driven communication patterns within the subsystem architecture.

**Standard EventEmitter API:** Mycelia's `useListeners` provides the same familiar API as Node.js EventEmitter:
- `on(path, handler)` - Register a listener
- `off(path, handler)` - Unregister a listener  
- `emit(path, message)` - Emit an event

This makes Mycelia's listeners **comparable to standard event systems** while providing additional features like pattern matching, handler groups, and registration policies.

**Key Features:**
- **Standard EventEmitter API**: Familiar `on()`, `off()`, `emit()` methods (comparable to Node.js EventEmitter)
- **Optional Activation**: Listeners can be enabled/disabled dynamically
- **Path-Based Registration**: Register listeners for specific message paths
- **Pattern Matching**: Support for pattern-based listeners with parameter extraction
- **Handler Groups**: Support for registering multiple handlers as a group
- **Registration Policies**: Configurable policies for managing listener registration (multiple, single, replace, limited)
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'listeners',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'listeners'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing listeners facet
- **`required`**: `[]` - No dependencies on other facets
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.listeners`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.listeners`:

```javascript
{
  registrationPolicy: 'multiple' | 'single' | 'replace' | 'limited',
  debug: boolean,
  policyOptions: {
    // Policy-specific options
  }
}
```

### Configuration Options

- **`registrationPolicy`** (string, default: `'multiple'`): Policy for managing listener registration
  - `'multiple'`: Allow multiple listeners per path (default)
  - `'single'`: Only one listener per path
  - `'replace'`: Replace existing listener when registering new one
  - `'limited'`: Limit number of listeners per path (requires `policyOptions.maxListeners`)
- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.
- **`policyOptions`** (object, optional): Policy-specific configuration options

## Facet Methods

### `hasListeners()`

Check if listeners are currently enabled.

**Signature:**
```javascript
hasListeners() => boolean
```

**Returns:** `boolean` - `true` if listeners are enabled and initialized, `false` otherwise

**Example:**
```javascript
if (subsystem.listeners.hasListeners()) {
  // Listeners are ready to use
  subsystem.listeners.on('message/path', handler);
}
```

### `enableListeners(listenerOptions)`

Enable listeners and initialize the `ListenerManager` if not already initialized.

**Signature:**
```javascript
enableListeners(listenerOptions = {}) => void
```

**Parameters:**
- `listenerOptions` (object, optional) - Options that override config:
  - `registrationPolicy` (string, optional) - Override registration policy
  - `debug` (boolean, optional) - Override debug flag
  - `policyOptions` (object, optional) - Override policy options

**Side Effects:**
- Initializes `ListenerManager` if not already initialized
- Sets `listenersEnabled` to `true`
- Subsequent calls are no-ops if already enabled

**Example:**
```javascript
// Enable with default config
subsystem.listeners.enableListeners();

// Enable with custom policy
subsystem.listeners.enableListeners({
  registrationPolicy: 'single',
  policyOptions: { maxListeners: 5 }
});
```

### `disableListeners()`

Disable listeners (but does not destroy the `ListenerManager` instance).

**Signature:**
```javascript
disableListeners() => void
```

**Side Effects:**
- Sets `listenersEnabled` to `false`
- Prevents new listener registrations until re-enabled
- Does not remove existing listeners or destroy the manager

**Example:**
```javascript
subsystem.listeners.disableListeners();
// Attempts to register will return false
```

### `on(path, handlers, options)`

Register a listener for a specific message path.

**Signature:**
```javascript
on(path, handlers, options = {}) => boolean
```

**Parameters:**
- `path` (string, required) - Message path to listen for (e.g., `'layer/create'`, `'domain/register'`)
- `handlers` (Function | Object, required) - Handler function or handler group object
- `options` (object, optional) - Registration options:
  - `isHandlerGroup` (boolean, default: `false`) - Whether `handlers` is a handler group object
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `boolean` - `true` if registration successful, `false` if listeners are disabled or registration failed

**Behavior:**
- Returns `false` and logs a warning if listeners are not enabled
- If `isHandlerGroup` is `true`, delegates to `ListenerManager.registerHandlerGroup()`
- Otherwise, delegates to `ListenerManager.on()` for regular handler registration
- Respects the configured registration policy

**Example - Single Handler:**
```javascript
subsystem.listeners.enableListeners();

subsystem.listeners.on('layer/create', async (message) => {
  console.log('Layer created:', message.getBody());
});
```

**Example - Handler Group:**
```javascript
subsystem.listeners.on('command/execute', {
  onSuccess: (message) => console.log('Success:', message),
  onFailure: (message) => console.error('Failure:', message),
  onTimeout: (message) => console.warn('Timeout:', message)
}, { isHandlerGroup: true });
```

**Example - Pattern Matching:**
```javascript
// Listen for any domain registration
subsystem.listeners.on('domain/*', async (message) => {
  console.log('Domain event:', message.getPath());
});

// Listen with parameter capture
subsystem.listeners.on('{domain}/store', async (message, params) => {
  console.log('Storing domain:', params.domain);
});
```

### `off(path, handlers, options)`

Unregister a listener for a specific message path.

**Signature:**
```javascript
off(path, handlers, options = {}) => boolean
```

**Parameters:**
- `path` (string, required) - Message path
- `handlers` (Function | Object, required) - Handler function or handler group object to remove
- `options` (object, optional) - Unregistration options:
  - `isHandlerGroup` (boolean, default: `false`) - Whether `handlers` is a handler group object
  - `debug` (boolean, optional) - Runtime debug flag override

**Returns:** `boolean` - `true` if unregistration successful, `false` if listeners are disabled or handler not found

**Behavior:**
- Returns `false` and logs a warning if listeners are not enabled
- If `isHandlerGroup` is `true`, delegates to `ListenerManager.unregisterHandlerGroup()`
- Otherwise, delegates to `ListenerManager.off()` for regular handler unregistration

**Example:**
```javascript
const handler = async (message) => {
  console.log('Handled:', message);
};

// Register
subsystem.listeners.on('message/path', handler);

// Later, unregister
subsystem.listeners.off('message/path', handler);
```

### `emit(path, message)`

Emit an event to listeners for a specific path. This is the standard EventEmitter `emit()` method.

**Signature:**
```javascript
emit(path, message) => number
```

**Parameters:**
- `path` (string, required) - Message path to emit to
- `message` (Message, required) - Message to send to listeners

**Returns:** `number` - Number of listeners notified, or `0` if listeners not enabled

**Behavior:**
- Returns `0` and logs a warning if listeners are not enabled
- Checks both exact path matches and pattern matches
- Notifies all matching listeners
- Returns the total number of listeners notified

**Example:**
```javascript
// Enable listeners
subsystem.listeners.enableListeners();

// Register listeners
subsystem.listeners.on('user/created', (message) => {
  console.log('User created:', message.getBody());
});

subsystem.listeners.on('user/created', (message) => {
  console.log('Another handler:', message.getBody());
});

// Emit event
const message = new Message('user/created', { userId: '123', username: 'alice' });
const notified = subsystem.listeners.emit('user/created', message);
// Returns: 2 (both listeners notified)
```

**Note:** This method provides the standard EventEmitter API. Mycelia's listeners are comparable to Node.js EventEmitter with additional features like pattern matching and handler groups.

## Facet Properties

### `listeners` (getter)

Direct access to the underlying `ListenerManager` instance.

**Type:** `ListenerManager | null`

**Returns:** The `ListenerManager` instance if enabled, `null` otherwise

**Example:**
```javascript
const manager = subsystem.listeners.listeners;
if (manager) {
  // Direct access to ListenerManager methods
  const count = manager.getListenerCount('message/path');
}
```

**Note:** This provides direct access to the `ListenerManager` API. Prefer using the facet methods (`on()`, `off()`) when possible for better abstraction.

### `_listenerManager` (internal)

Internal accessor function for the `ListenerManager` instance.

**Type:** `() => ListenerManager | null`

**Purpose:** Used internally by other hooks that need access to the listener manager.

**Note:** This is an internal property and should not be used by external code.

## Encapsulated Functionality

The `useListeners` hook encapsulates:

1. **ListenerManager Instance**: A `ListenerManager` instance that handles the actual listener registration, matching, and notification logic
2. **Enable/Disable State**: Tracks whether listeners are currently enabled
3. **Lazy Initialization**: The `ListenerManager` is only created when `enableListeners()` is first called
4. **Configuration Management**: Extracts and applies configuration from `ctx.config.listeners`
5. **Debug Logging**: Integrates with the logger utility for conditional debug output
6. **Handler Group Support**: Provides abstraction for registering handler groups (multiple handlers as a single unit)

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    listeners: {
      registrationPolicy: 'multiple',
      debug: true
    }
  }
});

subsystem
  .use(useListeners)
  .build();

// Enable listeners
subsystem.listeners.enableListeners();

// Register a listener
subsystem.listeners.on('layer/create', async (message) => {
  console.log('Layer created:', message.getBody());
});
```

### With Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useListeners
});

await subsystem.build();

// Listeners are already available
subsystem.listeners.enableListeners();
subsystem.listeners.on('message/path', handler);
```

### Dynamic Enable/Disable

```javascript
// Enable listeners
subsystem.listeners.enableListeners();

// Register listeners
subsystem.listeners.on('event/a', handlerA);
subsystem.listeners.on('event/b', handlerB);

// Temporarily disable (listeners remain registered)
subsystem.listeners.disableListeners();
// New registrations will fail until re-enabled

// Re-enable
subsystem.listeners.enableListeners();
// Existing listeners are still active
```

### Handler Groups

```javascript
subsystem.listeners.enableListeners();

// Register a handler group
subsystem.listeners.on('command/execute', {
  onSuccess: (message) => {
    console.log('Command succeeded:', message);
  },
  onFailure: (message) => {
    console.error('Command failed:', message);
  },
  onTimeout: (message) => {
    console.warn('Command timed out:', message);
  }
}, { isHandlerGroup: true });

// Unregister the handler group
subsystem.listeners.off('command/execute', {
  onSuccess: handler,
  onFailure: handler,
  onTimeout: handler
}, { isHandlerGroup: true });
```

## Registration Policies

The hook supports different registration policies via `ListenerManager`:

- **`multiple`**: Allow unlimited listeners per path (default)
- **`single`**: Only one listener per path (new registrations replace old ones)
- **`replace`**: Replace existing listener when registering
- **`limited`**: Limit number of listeners (requires `policyOptions.maxListeners`)

See `ListenerManager` documentation for policy details.

## Error Handling

- **Listeners Not Enabled**: `on()` and `off()` return `false` and log a warning if listeners are not enabled
- **Invalid Handler**: `ListenerManager` validates handlers and may throw errors for invalid input
- **Policy Violations**: Registration policies may prevent certain registrations

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    listeners: {
      debug: true
    }
  }
});
```

Debug messages include warnings when attempting to register/unregister listeners while disabled.

## Dependencies

- **No Facet Dependencies**: The `useListeners` hook has no required facets (`required: []`)
- **Used By Other Hooks**: Many hooks require `listeners` as a dependency:
  - `useStatistics` requires `listeners`
  - `useQueue` requires `listeners`
  - `useScheduler` requires `listeners`
  - `useRouter` requires `listeners`
  - `useMessageProcessor` requires `listeners`
  - `useQueries` requires `listeners`

## Best Practices

1. **Enable Before Use**: Always call `enableListeners()` before registering listeners
2. **Check State**: Use `hasListeners()` to verify listeners are enabled before operations
3. **Use Facet Methods**: Prefer facet methods (`on()`, `off()`) over direct `ListenerManager` access
4. **Handle Disabled State**: Check return values from `on()` and `off()` to handle disabled state gracefully
5. **Clean Up**: Unregister listeners when no longer needed to prevent memory leaks
6. **Use Appropriate Policies**: Choose registration policies that match your use case

## See Also

- [Events Guide](../../communication/EVENTS.md) - Detailed event communication patterns
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [Hooks Documentation](./HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](./FACETS.md) - Understanding facet objects
- [ListenerManager](./LISTENER-MANAGER.md) - The underlying listener manager implementation
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

