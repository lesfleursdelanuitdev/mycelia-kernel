# Kernel Subsystem

## Overview

The **KernelSubsystem** is the root kernel subsystem responsible for processing `kernel://` messages and coordinating with child subsystems (access-control, error-manager, etc.). It extends `BaseSubsystem` and uses synchronous defaults for immediate message processing.

**Key Features:**
- **Root Subsystem**: The root subsystem of the kernel hierarchy
- **Kernel Message Processing**: Processes `kernel://` messages synchronously
- **Child Subsystem Management**: Manages access-control, error-manager, response-manager, and channel-manager child subsystems
- **Subsystem Registration**: Registers subsystems with access control and identity
- **Protected Message Sending**: Sends authenticated messages with caller verification
- **Channel Access Control**: Enforces channel ACL for channel-based messages
- **Response Management**: Handles response-required commands and incoming responses
- **Synchronous Processing**: Uses synchronous defaults for immediate message processing

## What is KernelSubsystem?

`KernelSubsystem` is the root subsystem that:
- Processes system-level `kernel://` messages
- Coordinates with child subsystems for access control, error management, response tracking, and channel management
- Registers top-level subsystems with identity and access control
- Provides protected message sending with caller authentication
- Enforces channel access control for channel-based communication
- Manages response-required commands and incoming responses
- Acts as the foundation for the entire kernel architecture

**Architecture:**
```
KernelSubsystem (root)
├─ Synchronous Default Hooks
│  └─ Immediate message processing
├─ useKernelServices Hook
│  └─ Creates child subsystems
├─ Child Subsystems
│  ├─ AccessControlSubsystem
│  ├─ ErrorManagerSubsystem
│  ├─ ResponseManagerSubsystem
│  └─ ChannelManagerSubsystem
└─ Message Processing
   ├─ kernel:// message routing
   ├─ Channel ACL enforcement
   ├─ Response tracking
   └─ Protected message sending
```

## Constructor

### Signature

```javascript
new KernelSubsystem(name = 'kernel', options = {})
```

### Parameters

#### `name` (string, optional)

The subsystem name. Must be `'kernel'`.

**Default:** `'kernel'`

**Validation:**
- Must be exactly `'kernel'`
- Throws `Error` if name is not `'kernel'`

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
```

#### `options` (object, required)

Configuration options for the kernel subsystem.

**Properties:**
- `ms` (MessageSystem, required) - MessageSystem instance
- `config` (object, optional) - Configuration object:
  - `kernelServices` (object, optional) - Kernel services configuration
    - `services` (object, optional) - Service-specific configuration
      - `'access-control'` (object, optional) - AccessControlSubsystem configuration
      - `'error-manager'` (object, optional) - ErrorManagerSubsystem configuration
  - `errorManager` (object, optional) - ErrorManagerSubsystem configuration (backward compatibility)
- `debug` (boolean, optional) - Enable debug logging

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    kernelServices: {
      services: {
        'access-control': {
          // AccessControlSubsystem config
        },
        'error-manager': {
          boundedErrorStore: {
            capacity: 5000
          }
        }
      }
    }
  },
  debug: true
});
```

## Default Hooks

The `KernelSubsystem` uses `createSynchronousDefaultHooks()` for immediate message processing:

```javascript
this.defaultHooks = createSynchronousDefaultHooks();
```

This provides:
- Synchronous message processing (no queue, immediate execution)
- All standard hooks (router, listeners, queries, etc.)
- Optimized for kernel-level operations

## Installed Hooks

The `KernelSubsystem` automatically installs:

- **`useKernelServices`** - Creates and adds child subsystems (access-control, error-manager)

## Methods

### `bootstrap(opts)`

Bootstrap the kernel subsystem.

**Signature:**
```javascript
bootstrap(opts) => Promise<void>
```

**Parameters:**
- `opts` (object, optional) - Build options

**Returns:** `Promise<void>`

**Flow:**
1. Build the subsystem (initializes all facets and hooks)
2. Verify that hierarchy facet has been installed
3. Child subsystems are automatically created and added by `useKernelServices` hook
4. Child subsystems are automatically built by `buildChildren()`

**Throws:**
- `Error` if hierarchy facet is not installed after build

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

// Kernel and child subsystems are now ready
const accessControl = kernel.getAccessControl();
const errorManager = kernel.getErrorManager();
```

### `getAccessControl()`

Get the access control subsystem reference.

**Signature:**
```javascript
getAccessControl() => AccessControlSubsystem|null
```

**Returns:** `AccessControlSubsystem|null` - Access control subsystem instance or null if not found

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

const accessControl = kernel.getAccessControl();
if (accessControl) {
  // Use access control
  const resource = accessControl.createResource(owner, 'my-resource', instance);
}
```

### `getErrorManager()`

Get the error manager subsystem reference.

**Signature:**
```javascript
getErrorManager() => ErrorManagerSubsystem|null
```

**Returns:** `ErrorManagerSubsystem|null` - Error manager subsystem instance or null if not found

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

const errorManager = kernel.getErrorManager();
if (errorManager) {
  // Use error manager
  const result = errorManager.record(error, {
    messageSubsystem: 'my-subsystem'
  });
}
```

### `getResponseManager()`

Get the response manager subsystem reference.

**Signature:**
```javascript
getResponseManager() => ResponseManagerSubsystem|null
```

**Returns:** `ResponseManagerSubsystem|null` - Response manager subsystem instance or null if not found

**Purpose:** Manages response-required commands, tracks pending responses, and handles incoming responses.

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

const responseManager = kernel.getResponseManager();
if (responseManager) {
  // Get reply path for a pending response
  const replyTo = responseManager.getReplyTo(correlationId);
}
```

### `getChannelManager()`

Get the channel manager subsystem reference.

**Signature:**
```javascript
getChannelManager() => ChannelManagerSubsystem|null
```

**Returns:** `ChannelManagerSubsystem|null` - Channel manager subsystem instance or null if not found

**Purpose:** Manages communication channels, including registration, participant management, and access control.

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

const channelManager = kernel.getChannelManager();
if (channelManager) {
  // Get channel by route
  const channel = channelManager.getChannel('canvas://channel/layout');
  
  // Check channel access
  const canUse = channelManager.canUseChannel('canvas://channel/layout', callerPkr);
}
```

### `registerSubsystem(subsystemInstance, options)`

Register a subsystem with access control.

**Signature:**
```javascript
registerSubsystem(subsystemInstance, options = {}) => BaseSubsystem
```

**Parameters:**
- `subsystemInstance` (BaseSubsystem, required) - The subsystem instance to register
- `options` (object, optional) - Optional options:
  - `metadata` (object, optional) - Optional metadata for the subsystem

**Returns:** `BaseSubsystem` - The subsystem instance with identity attached

**Behavior:**
- Wires a subsystem principal and attaches identity to the subsystem instance
- Delegates to `AccessControlSubsystem.wireSubsystem()` with type `'topLevel'`
- Registers all child subsystems in the hierarchy recursively
- Subsystems registered through the kernel are always registered as `'topLevel'`

**Throws:**
- `Error` if access control subsystem is not found
- `Error` if `wireSubsystem` fails

**Example:**
```javascript
// Create a subsystem
const canvasSubsystem = new BaseSubsystem('canvas', {
  ms: messageSystem
});

// Register with kernel (gets identity attached)
const registered = kernel.registerSubsystem(canvasSubsystem, {
  metadata: { purpose: 'graphics' }
});

// Subsystem now has identity
console.log(registered.identity); // Identity wrapper with PKR
```

### `sendProtected(pkr, message, options)`

Send a protected message with caller authentication.

**Signature:**
```javascript
sendProtected(pkr, message, options = {}) => Promise<Object>
```

**Parameters:**
- `pkr` (PKR, required) - The caller's Public Key Record (PKR)
- `message` (Message, required) - Message object (contains path for routing)
- `options` (object, optional) - Send options:
  - `isResponse` (boolean, optional) - If true, message is treated as a response
  - `responseRequired` (object, optional) - Response-required configuration:
    - `replyTo` (string, required) - Reply channel or route path
    - `timeout` (number, optional) - Timeout in milliseconds
  - `callerId` (PKR, ignored) - Any callerId in options is stripped (set by kernel)
  - `...otherOptions` (any) - Additional options passed to router

**Returns:** `Promise<Object>` - Send result from the router

**Security:**
- This method allows the kernel to set the `callerId` for authenticated messages
- Any `callerId` in the provided options is stripped to prevent spoofing
- The kernel sets both `callerId` (from the provided PKR) and `callerIdSetBy` (kernel's PKR)
- Enforces channel access control for channel-based messages
- Routes the message through the MessageSystem router with protected options

**Flow:**
1. Validates kernel has identity with PKR
2. Validates the provided PKR
3. Strips any user-provided `callerId` from options (prevents spoofing)
4. Sets `callerId` to the provided PKR
5. Sets `callerIdSetBy` to the kernel's PKR
6. Gets MessageSystem router
7. **If `isResponse` is true:**
   - Handles response via ResponseManagerSubsystem (non-blocking)
   - If one-shot path: Routes directly (skips channel ACL)
   - Else: Enforces channel ACL if channel, then routes
8. **Else (non-response):**
   - Registers response-required if needed (non-blocking)
   - Enforces channel ACL if channel path
   - Routes normally

**Channel Access Control:**
- For channel paths: Enforces ACL via ChannelManagerSubsystem
- For one-shot paths: Skips channel ACL (temporary routes, not channels)
- Throws error if caller is not authorized to use the channel

**Response Management:**
- For `isResponse: true`: Validates response via ResponseManagerSubsystem
- For `responseRequired`: Registers pending response with replyTo and timeout
- Both operations are non-blocking (warnings logged, but message send continues)

**Throws:**
- `Error` if kernel identity is missing
- `Error` if MessageSystem is not found
- `Error` if MessageSystem router facet is not found
- `Error` if pkr is invalid
- `Error` if caller is not authorized to use a channel

**Example - Basic Message:**
```javascript
// Get caller's PKR
const callerPkr = callerSubsystem.identity.pkr;

// Send a protected message with caller authentication
const result = await kernel.sendProtected(
  callerPkr,
  new Message('canvas://layers/create', { name: 'background' })
);

// Message is routed with authenticated callerId and callerIdSetBy
```

**Example - Response-Required Command:**
```javascript
// Send a command that requires a response
const result = await kernel.sendProtected(
  callerPkr,
  commandMessage,
  {
    responseRequired: {
      replyTo: 'canvas://channel/replies',
      timeout: 5000
    }
  }
);

// ResponseManagerSubsystem tracks the pending response
// Response will arrive on the replyTo channel
```

**Example - Response Message:**
```javascript
// Send a response message
const result = await kernel.sendProtected(
  callerPkr,
  responseMessage,
  {
    isResponse: true
  }
);

// ResponseManagerSubsystem validates the response
// Channel ACL is enforced if replyTo is a channel
```

**Example - Channel Message:**
```javascript
// Send a message to a channel (ACL enforced automatically)
const result = await kernel.sendProtected(
  callerPkr,
  new Message('canvas://channel/updates', { data: 'update' })
);

// ChannelManagerSubsystem checks if caller can use the channel
// Throws error if unauthorized
```

## Child Subsystems

The `KernelSubsystem` automatically creates the following child subsystems via `useKernelServices`:

### Access Control Subsystem

**Name:** `'access-control'`

**Class:** `AccessControlSubsystem`

**Purpose:** Identity and access control management

**Access:**
```javascript
const accessControl = kernel.getAccessControl();
```

### Error Manager Subsystem

**Name:** `'error-manager'`

**Class:** `ErrorManagerSubsystem`

**Purpose:** Error recording and querying

**Access:**
```javascript
const errorManager = kernel.getErrorManager();
```

### Response Manager Subsystem

**Name:** `'response-manager'`

**Class:** `ResponseManagerSubsystem`

**Purpose:** Tracks response-required commands, handles incoming responses, and emits synthetic timeout responses

**Access:**
```javascript
const responseManager = kernel.getResponseManager();
```

**Features:**
- Registers pending responses for commands with `responseRequired`
- Validates incoming responses via `handleResponse()`
- Emits synthetic timeout responses when commands time out
- Provides `getReplyTo()` to retrieve reply paths for pending responses

### Channel Manager Subsystem

**Name:** `'channel-manager'`

**Class:** `ChannelManagerSubsystem`

**Purpose:** Manages communication channels, including registration, participant management, and access control

**Access:**
```javascript
const channelManager = kernel.getChannelManager();
```

**Features:**
- Registers and unregisters channels
- Manages channel participants
- Verifies channel access (owner and participants)
- Provides owner-scoped channel lookup

## Message Processing

The `KernelSubsystem` processes `kernel://` messages synchronously:

```javascript
// Kernel messages are processed immediately
const message = new Message('kernel://error/record/timeout', {
  subsystem: 'network',
  message: 'Request timed out'
});

await kernel.accept(message);
```

## Integration with MessageSystem

The `KernelSubsystem` is automatically created by `MessageSystem`:

```javascript
const messageSystem = new MessageSystem('main-system');
// Kernel is automatically created

// Access kernel
const kernel = messageSystem.kernel;

// Bootstrap kernel
await messageSystem.bootstrap();
// Kernel is automatically bootstrapped
```

## Usage Patterns

### Basic Setup

```javascript
import { KernelSubsystem } from './models/kernel-subsystem/kernel.subsystem.mycelia.js';
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';

// Create MessageSystem (kernel is created automatically)
const messageSystem = new MessageSystem('main-system');

// Access kernel
const kernel = messageSystem.kernel;

// Bootstrap (builds kernel and child subsystems)
await messageSystem.bootstrap();
// Or: await kernel.bootstrap();
```

### Registering Subsystems

```javascript
// Create a subsystem
const canvasSubsystem = new BaseSubsystem('canvas', {
  ms: messageSystem
});

// Register with kernel (gets identity)
const registered = kernel.registerSubsystem(canvasSubsystem, {
  metadata: { purpose: 'graphics' }
});

// Subsystem has identity
console.log(registered.identity.pkr); // Public Key Record
```

### Using Child Subsystems

```javascript
// Access access control
const accessControl = kernel.getAccessControl();
if (accessControl) {
  // Create resources
  const resource = accessControl.createResource(owner, 'my-resource', instance);
  
  // Create friends
  const friend = accessControl.createFriend('Anna', {
    endpoint: 'https://anna.example.com'
  });
}

// Access error manager
const errorManager = kernel.getErrorManager();
if (errorManager) {
  // Record errors
  const result = errorManager.record(error, {
    messageSubsystem: 'my-subsystem',
    type: ERROR_TYPES.INTERNAL
  });
  
  // Query errors
  const recent = errorManager.queryRecent({ limit: 50 });
}
```

### Protected Message Sending

```javascript
// Get caller's PKR
const callerPkr = callerSubsystem.identity.pkr;

// Send protected message
const result = await kernel.sendProtected(
  callerPkr,
  new Message('canvas://layers/create', { name: 'background' })
);

// Message is authenticated with callerId
```

### Channel-Based Communication

```javascript
// Create a channel
const channel = subsystem.channels.create('updates', {
  participants: [otherPkr],
  metadata: { description: 'Real-time updates' }
});

// Send message to channel (ACL enforced automatically)
const result = await kernel.sendProtected(
  callerPkr,
  new Message(channel.route, { data: 'update' })
);

// ChannelManagerSubsystem verifies caller has access
```

### Response-Required Commands

```javascript
// Send a command that requires a response
const result = await kernel.sendProtected(
  callerPkr,
  commandMessage,
  {
    responseRequired: {
      replyTo: 'canvas://channel/replies',
      timeout: 5000
    }
  }
);

// ResponseManagerSubsystem tracks the pending response
// Response will arrive on the replyTo channel
```

### Response Messages

```javascript
// Send a response message
const result = await kernel.sendProtected(
  callerPkr,
  responseMessage,
  {
    isResponse: true
  }
);

// ResponseManagerSubsystem validates the response
// Channel ACL is enforced if replyTo is a channel
```

## Error Handling

### Missing Access Control

If access control subsystem is not found:

```javascript
try {
  kernel.registerSubsystem(subsystem);
} catch (error) {
  console.error(error.message);
  // "KernelSubsystem.registerSubsystem: AccessControlSubsystem not found. Ensure kernel is bootstrapped."
}
```

**Solution:** Ensure kernel is bootstrapped before registering subsystems.

### Missing Kernel Identity

If kernel identity is missing:

```javascript
try {
  await kernel.sendProtected(pkr, message);
} catch (error) {
  console.error(error.message);
  // "KernelSubsystem.sendProtected: Kernel must have an identity with PKR. Ensure kernel is bootstrapped."
}
```

**Solution:** Ensure kernel is bootstrapped and has identity.

### Unauthorized Channel Access

If caller is not authorized to use a channel:

```javascript
try {
  await kernel.sendProtected(
    unauthorizedPkr,
    new Message('canvas://channel/updates', { data: 'update' })
  );
} catch (error) {
  console.error(error.message);
  // "KernelSubsystem.sendProtected: caller is not authorized to use channel "canvas://channel/updates"."
}
```

**Solution:** Ensure caller is the channel owner or a participant, or add caller as a participant to the channel.

### Invalid Name

If name is not `'kernel'`:

```javascript
try {
  const kernel = new KernelSubsystem('invalid-name', { ms: messageSystem });
} catch (error) {
  console.error(error.message);
  // "KernelSubsystem: name must be "kernel""
}
```

## Configuration

### Kernel Services Configuration

Configure child subsystems via `config.kernelServices`:

```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    kernelServices: {
      services: {
        'access-control': {
          // AccessControlSubsystem configuration
        },
        'error-manager': {
          boundedErrorStore: {
            capacity: 5000
          }
        }
      }
    }
  }
});
```

### Backward Compatibility

The hook supports backward compatibility with `config.errorManager`:

```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    // Old way (still works)
    errorManager: {
      boundedErrorStore: {
        capacity: 5000
      }
    }
  }
});
```

## Best Practices

1. **Use MessageSystem**: Typically created via `MessageSystem`, not directly
2. **Bootstrap First**: Always bootstrap kernel before using child subsystems
3. **Check for Null**: Always check if child subsystems exist before using them
4. **Register Subsystems**: Register top-level subsystems via `registerSubsystem()` for identity
5. **Use Protected Sending**: Use `sendProtected()` for authenticated messages
6. **Channel Access**: Ensure callers are authorized before sending to channels
7. **Response Management**: Use `responseRequired` for commands that need responses
8. **One-Shot Routes**: One-shot routes automatically skip channel ACL (temporary routes)
9. **Configure Services**: Configure child subsystems via `config.kernelServices`

## See Also

- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core building block for all subsystems
- [Message System](./message/MESSAGE-SYSTEM.md) - Central coordinator that creates KernelSubsystem
- [Access Control Subsystem](./security/ACCESS-CONTROL-SUBSYSTEM.md) - Child subsystem for identity and access control
- [Error Manager Subsystem](./errors/ERROR-MANAGER-SUBSYSTEM.md) - Child subsystem for error management
- [Response Manager Subsystem](./models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Child subsystem for response tracking
- [Channel Manager Subsystem](./models/kernel-subsystem/channel-manager-subsystem/CHANNEL-MANAGER-SUBSYSTEM.md) - Child subsystem for channel management
- [useKernelServices Hook](./hooks/kernel-services/USE-KERNEL-SERVICES.md) - Hook that creates child subsystems
- [useChannels Hook](./hooks/channels/USE-CHANNELS.md) - Hook for working with channels
- [useRequests Hook](./hooks/requests/USE-REQUESTS.md) - Hook for request/response operations
- [Default Hooks](./DEFAULT-HOOKS.md) - Pre-configured hook sets

