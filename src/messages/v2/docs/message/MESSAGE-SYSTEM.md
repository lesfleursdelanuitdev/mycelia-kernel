# MessageSystem Class

## Overview

The **MessageSystem** class is the central coordinator for a message-driven architecture. It extends `BaseSubsystem`, allowing it to be composed with hooks and facets like any other subsystem. The MessageSystem coordinates subsystems, manages global scheduling, routes messages between subsystems, and provides a registry for subsystem management.

**Key Features:**
- **Subsystem-Based Architecture**: Extends BaseSubsystem, can use hooks and facets
- **Global Scheduling**: Manages time allocation between subsystems via global scheduler
- **Message Routing**: Routes messages to appropriate subsystems based on message paths
- **Subsystem Registry**: Maintains a registry of all registered subsystems
- **Kernel Integration**: Creates and manages the kernel subsystem for system-level operations
- **Dependency Graph Caching**: Uses dependency graph cache for efficient subsystem builds
- **No-Op Processing**: Overrides `accept()` and `process()` as no-ops (coordinates rather than processes)

## What is a MessageSystem?

A MessageSystem is the root coordinator that:
- Manages multiple subsystems in a message-driven architecture
- Routes messages between subsystems based on message paths
- Coordinates global scheduling to allocate processing time to subsystems
- Maintains a registry of all registered subsystems
- Provides the kernel subsystem for system-level operations (access control, error management)

## Creating a MessageSystem

### Basic Creation

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';

const messageSystem = new MessageSystem('main-system', {
  debug: true
});
```

### With Configuration

```javascript
const messageSystem = new MessageSystem('main-system', {
  debug: true,
  timeSliceDuration: 50,
  schedulingStrategy: 'round-robin',
  errorManagerMaxSize: 1000,
  config: {
    globalScheduler: {
      timeSliceDuration: 50,
      schedulingStrategy: 'priority'
    },
    kernel: {
      // Kernel subsystem configuration
    }
  }
});
```

## Constructor

### Signature

```javascript
new MessageSystem(name, options = {})
```

### Parameters

#### `name` (string, required)

The unique name for the MessageSystem.

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system');
```

#### `options` (object, optional)

Configuration options for the MessageSystem.

**Options:**
- `debug` (boolean, default: `false`) - Enable debug logging
- `timeSliceDuration` (number, default: `50`) - Duration of each time slice in milliseconds
- `schedulingStrategy` (string, default: `'round-robin'`) - Global scheduling strategy
- `errorManagerMaxSize` (number, default: `1000`) - Maximum size for error manager store
- `config` (object, optional) - Configuration object for hooks and subsystems
  - `globalScheduler` (object) - Global scheduler configuration
  - `kernel` (object) - Kernel subsystem configuration

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system', {
  debug: true,
  timeSliceDuration: 100,
  schedulingStrategy: 'priority',
  errorManagerMaxSize: 2000,
  config: {
    globalScheduler: {
      timeSliceDuration: 100,
      schedulingStrategy: 'adaptive'
    },
    kernel: {
      debug: true
    }
  }
});
```

## Default Hooks

The MessageSystem automatically includes the following default hooks:

1. **`useGlobalScheduler`** - Manages time allocation between subsystems
2. **`useMessages`** - Provides message creation and management utilities
3. **`useMessageSystemRegistry`** - Maintains registry of registered subsystems
4. **`useMessageSystemRouter`** - Routes messages to appropriate subsystems

These hooks are automatically added to `defaultHooks` and will be installed when the MessageSystem is built.

## Methods

### `bootstrap()`

Bootstrap the MessageSystem and kernel subsystem.

**Signature:**
```javascript
bootstrap() => Promise<void>
```

**Behavior:**
1. Builds the MessageSystem with dependency graph cache
2. Sets kernel on message system router
3. Bootstraps the kernel subsystem (which builds its own children)

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system');
await messageSystem.bootstrap();

// MessageSystem and kernel are now ready
```

### `startScheduler()`

Start the global scheduling loop.

**Signature:**
```javascript
startScheduler() => void
```

**Behavior:**
- Starts the global scheduler to begin allocating time slices to subsystems
- Throws error if `globalScheduler` facet is not found

**Example:**
```javascript
await messageSystem.bootstrap();
messageSystem.startScheduler();

// Global scheduler is now running
```

### `stopScheduler()`

Stop the global scheduling loop.

**Signature:**
```javascript
stopScheduler() => void
```

**Behavior:**
- Stops the global scheduler
- Throws error if `globalScheduler` facet is not found

**Example:**
```javascript
messageSystem.stopScheduler();

// Global scheduler is now stopped
```

### `registerSubsystem(subsystemInstance, options)`

Register a subsystem with access control and registry.

**Signature:**
```javascript
registerSubsystem(subsystemInstance, options = {}) => Promise<BaseSubsystem>
```

**Parameters:**
- `subsystemInstance` (BaseSubsystem, required) - The subsystem instance to register
- `options` (object, optional) - Registration options
  - `metadata` (object, optional) - Optional metadata for the subsystem
  - `graphCache` (DependencyGraphCache, optional) - Dependency graph cache for building

**Returns:** `Promise<BaseSubsystem>` - The registered subsystem instance with identity attached

**Behavior:**
1. Builds the subsystem instance with dependency graph cache
2. Wires identity via kernel (access control)
3. Registers subsystem in message system registry
4. Returns subsystem with identity attached

**Example:**
```javascript
const canvasSubsystem = new BaseSubsystem('canvas', {
  ms: messageSystem
})
  .use(useRouter)
  .use(useQueue)
  .use(useMessageProcessor);

// Register subsystem
const registered = await messageSystem.registerSubsystem(canvasSubsystem, {
  metadata: { version: '1.0' }
});

// Subsystem is now registered and has identity
console.log('Registered:', registered.name);
```

### `send(message, options)`

Send a message via the message-system router.

**Signature:**
```javascript
send(message, options = {}) => Promise<Object>
```

**Parameters:**
- `message` (Message, required) - Message to send
- `options` (object, optional) - Send options
  - `callerId` (PKR, optional) - Caller's Public Key Record (for protected messages)
  - `callerIdSetBy` (PKR, optional) - PKR that set the callerId (for protected messages)

**Returns:** `Promise<Object>` - Routing result object:
```javascript
{
  success: boolean,
  subsystem?: string,
  messageId?: string,
  result?: Object,
  error?: string
}
```

**Behavior:**
- Routes message to appropriate subsystem based on message path
- Uses message system router to handle routing
- Returns routing result with success status

**Example:**
```javascript
const message = new Message('canvas://layers/create', { name: 'background' });

const result = await messageSystem.send(message);
if (result.success) {
  console.log(`Message routed to ${result.subsystem}`);
} else {
  console.error(`Routing failed: ${result.error}`);
}
```

### `getSubsystemNames()`

Get all registered subsystem names.

**Signature:**
```javascript
getSubsystemNames() => Array<string>
```

**Returns:** `Array<string>` - Array of subsystem names

**Example:**
```javascript
const names = messageSystem.getSubsystemNames();
console.log('Registered subsystems:', names);
// ['canvas', 'server', 'cache']
```

### `getSubsystemCount()`

Get the number of registered subsystems.

**Signature:**
```javascript
getSubsystemCount() => number
```

**Returns:** `number` - Number of registered subsystems

**Example:**
```javascript
const count = messageSystem.getSubsystemCount();
console.log(`Total subsystems: ${count}`);
```

### `hasSubsystem(subsystemName)`

Check if a subsystem is registered.

**Signature:**
```javascript
hasSubsystem(subsystemName) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name to check

**Returns:** `boolean` - `true` if subsystem is registered, `false` otherwise

**Example:**
```javascript
if (messageSystem.hasSubsystem('canvas')) {
  console.log('Canvas subsystem is registered');
}
```

### `listenerOn(subsystemName, path, handler, options)`

Register a listener on a subsystem.

**Signature:**
```javascript
listenerOn(subsystemName, path, handler, options = {}) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Name of the subsystem to register listener on
- `path` (string, required) - Event path to listen for
- `handler` (Function | Object, required) - Handler function or handler group object
- `options` (object, optional) - Registration options:
  - `isHandlerGroup` (boolean, default: `false`) - Whether `handler` is a handler group object

**Returns:** `boolean` - `true` if registration successful, `false` otherwise

**Behavior:**
1. Gets the subsystem from the registry
2. Validates that the subsystem exists and has a listeners facet
3. Automatically enables listeners if not already enabled
4. Registers the listener on the subsystem

**Example:**
```javascript
// Register a listener on a subsystem
messageSystem.listenerOn('userService', 'user/created', (message) => {
  console.log('User created:', message.getBody());
});

// Register a handler group
messageSystem.listenerOn('commandService', 'save/msg_123', {
  onSuccess: (message) => console.log('Success'),
  onFailure: (message) => console.error('Failure'),
  onTimeout: (message) => console.warn('Timeout')
}, { isHandlerGroup: true });
```

**Throws:**
- Error if `messageSystemRegistry` facet not found
- Error if subsystem not found
- Error if subsystem does not have `listeners` facet

### `listenerOff(subsystemName, path, handler, options)`

Unregister a listener on a subsystem.

**Signature:**
```javascript
listenerOff(subsystemName, path, handler, options = {}) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Name of the subsystem to unregister listener from
- `path` (string, required) - Event path
- `handler` (Function | Object, required) - Handler function or handler group object to remove
- `options` (object, optional) - Unregistration options:
  - `isHandlerGroup` (boolean, default: `false`) - Whether `handler` is a handler group object

**Returns:** `boolean` - `true` if unregistration successful, `false` otherwise

**Behavior:**
1. Gets the subsystem from the registry
2. Validates that the subsystem exists and has a listeners facet
3. Unregisters the listener from the subsystem

**Example:**
```javascript
// Unregister a listener
messageSystem.listenerOff('userService', 'user/created', myHandler);

// Unregister a handler group
messageSystem.listenerOff('commandService', 'save/msg_123', handlerGroup, { isHandlerGroup: true });
```

**Throws:**
- Error if `messageSystemRegistry` facet not found
- Error if subsystem not found
- Error if subsystem does not have `listeners` facet

### `accept(message, options)`

Accept a message (no-op for MessageSystem).

**Signature:**
```javascript
accept(message, options = {}) => Promise<boolean>
```

**Returns:** `Promise<boolean>` - Always returns `true`

**Note:** MessageSystem doesn't process messages directly. Use `send()` to route messages to subsystems.

### `process(timeSlice)`

Process messages (no-op for MessageSystem).

**Signature:**
```javascript
process(timeSlice) => Promise<null>
```

**Returns:** `Promise<null>` - Always returns `null`

**Note:** MessageSystem doesn't process messages directly. It coordinates subsystems via global scheduler.

## Architecture

### Component Structure

```
MessageSystem (extends BaseSubsystem)
├─ Default Hooks
│  ├─ useGlobalScheduler
│  ├─ useMessages
│  ├─ useMessageSystemRegistry
│  └─ useMessageSystemRouter
├─ KernelSubsystem
│  ├─ AccessControlSubsystem
│  └─ ErrorManagerSubsystem
└─ DependencyGraphCache
```

### Message Flow

1. **Send Message**: `messageSystem.send(message)` is called
2. **Route**: MessageSystem router extracts subsystem name from message path
3. **Find Subsystem**: Router looks up subsystem in registry (or uses kernel for `kernel://` paths)
4. **Accept**: Message is accepted by target subsystem
5. **Process**: Subsystem processes message (queued or immediate)
6. **Schedule**: Global scheduler allocates time slices to subsystems

## Usage Patterns

### Basic Setup

```javascript
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';

// Create MessageSystem
const messageSystem = new MessageSystem('main-system', {
  debug: true
});

// Bootstrap (builds MessageSystem and kernel)
await messageSystem.bootstrap();

// Start global scheduler
messageSystem.startScheduler();

// MessageSystem is now ready
```

### Registering Subsystems

```javascript
// Create subsystem
const canvasSubsystem = new BaseSubsystem('canvas', {
  ms: messageSystem
})
  .use(useRouter)
  .use(useQueue)
  .use(useMessageProcessor)
  .use(useStatistics);

// Register subsystem
await messageSystem.registerSubsystem(canvasSubsystem);

// Subsystem is now registered and can receive messages
```

### Sending Messages

```javascript
// Create message
const message = new Message('canvas://layers/create', { 
  name: 'background',
  type: 'image'
});

// Send message (will be routed to canvas subsystem)
const result = await messageSystem.send(message);
if (result.success) {
  console.log(`Message routed to ${result.subsystem}`);
}
```

### With Custom Hooks

```javascript
const messageSystem = new MessageSystem('main-system', {
  debug: true
})
  .use(customHook1)
  .use(customHook2);

await messageSystem.bootstrap();
```

### Querying Subsystems

```javascript
// Get all subsystem names
const names = messageSystem.getSubsystemNames();
console.log('Subsystems:', names);

// Check if subsystem exists
if (messageSystem.hasSubsystem('canvas')) {
  console.log('Canvas subsystem is registered');
}

// Get subsystem count
const count = messageSystem.getSubsystemCount();
console.log(`Total: ${count} subsystems`);
```

### Managing Listeners

```javascript
// Register a listener on a subsystem
messageSystem.listenerOn('userService', 'user/created', (message) => {
  console.log('User created:', message.getBody());
});

// Register a handler group
messageSystem.listenerOn('commandService', 'save/msg_123', {
  onSuccess: (message) => console.log('Success'),
  onFailure: (message) => console.error('Failure'),
  onTimeout: (message) => console.warn('Timeout')
}, { isHandlerGroup: true });

// Unregister a listener
messageSystem.listenerOff('userService', 'user/created', myHandler);
```

### Scheduler Control

```javascript
// Start scheduler
messageSystem.startScheduler();

// ... system runs ...

// Stop scheduler
messageSystem.stopScheduler();
```

## Configuration

### Global Scheduler Configuration

```javascript
const messageSystem = new MessageSystem('main-system', {
  timeSliceDuration: 100,
  schedulingStrategy: 'priority',
  config: {
    globalScheduler: {
      timeSliceDuration: 100,
      schedulingStrategy: 'adaptive',
      options: {
        // Strategy-specific options
      }
    }
  }
});
```

### Kernel Configuration

```javascript
const messageSystem = new MessageSystem('main-system', {
  errorManagerMaxSize: 2000,
  config: {
    kernel: {
      debug: true
    }
  }
});
```

## Dependency Graph Cache

The MessageSystem uses a `DependencyGraphCache` to cache dependency graph results across subsystem builds. This improves build performance by avoiding redundant topological sorting calculations.

The cache is:
- Shared across all subsystem builds
- Automatically passed to subsystems during `registerSubsystem()`
- Used during `bootstrap()` for both MessageSystem and kernel builds

## Kernel Subsystem

The MessageSystem automatically creates a `KernelSubsystem` instance during construction. The kernel provides:

- **Access Control**: Manages subsystem identities and permissions
- **Error Management**: Tracks and manages system errors
- **System-Level Operations**: Handles `kernel://` message paths

The kernel is bootstrapped during `bootstrap()` and is available for system-level operations.

## Error Handling

### Missing Facets

If required facets are not found, methods throw descriptive errors:

```javascript
// Throws if globalScheduler facet not found
try {
  messageSystem.startScheduler();
} catch (error) {
  console.error(error.message);
  // "main-system: globalScheduler facet not found. Ensure useGlobalScheduler hook is used."
}
```

### Registration Failures

If subsystem registration fails:

```javascript
try {
  await messageSystem.registerSubsystem(subsystem);
} catch (error) {
  console.error(error.message);
  // "main-system: Failed to register subsystem 'canvas' in registry."
}
```

## Best Practices

1. **Bootstrap Before Use**: Always call `bootstrap()` before using the MessageSystem
2. **Start Scheduler**: Start the global scheduler after bootstrapping for automatic message processing
3. **Register Subsystems**: Register all subsystems before sending messages to them
4. **Use send()**: Use `send()` to route messages rather than calling subsystem methods directly
5. **Monitor Registry**: Use `getSubsystemNames()` and `hasSubsystem()` to monitor registered subsystems
6. **Configure Scheduler**: Configure global scheduler based on your workload requirements

## Integration with Subsystems

### Subsystem Registration

Subsystems must be registered with the MessageSystem to receive messages:

```javascript
// Create subsystem
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
})
  .use(useRouter)
  .use(useMessageProcessor);

// Register (builds subsystem and wires identity)
await messageSystem.registerSubsystem(subsystem);

// Subsystem can now receive messages
```

### Message Routing

Messages are routed based on their path:

```javascript
// Message path: 'canvas://layers/create'
// Routes to 'canvas' subsystem
const message = new Message('canvas://layers/create', { name: 'layer1' });
await messageSystem.send(message);

// Message path: 'kernel://error/record'
// Routes to kernel subsystem
const kernelMessage = new Message('kernel://error/record', { error: '...' });
await messageSystem.send(kernelMessage);
```

## See Also

- [Base Subsystem](../BASE-SUBSYSTEM.md) - Core building block for subsystems
- [Kernel Subsystem](../kernel-subsystem/kernel.subsystem.mycelia.js) - Kernel subsystem implementation
- [Message](./MESSAGE.md) - Message class for inter-subsystem communication
- [Message Router](../message-system/message-router.mycelia.js) - Message routing implementation
- [Global Scheduler](../message-system/global-scheduler.mycelia.js) - Global scheduling implementation
- [Hooks Documentation](../hooks/HOOKS.md) - Understanding hooks and how they work




