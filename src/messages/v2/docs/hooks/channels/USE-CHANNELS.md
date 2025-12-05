# useChannels Hook

## Overview

The `useChannels` hook provides a lightweight, ergonomic API for working with long-lived communication channels from a subsystem. It wraps the channel management methods available through `subsystem.identity` with convenient helpers that automatically build routes based on the subsystem's name.

**Key Features:**
- **Ergonomic API**: Build routes automatically from local names
- **Identity-Based**: All channel operations go through `subsystem.identity`
- **Route Building**: Automatically constructs canonical channel routes
- **Metadata Helpers**: Sets default metadata.name for easier channel lookup
- **No Direct Kernel Access**: Never touches kernel or ChannelManager directly

## Hook Metadata

```javascript
{
  kind: 'channels',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: null
}
```

### Properties

- **`kind`**: `'channels'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing channels facet
- **`required`**: `[]` - No required facets (identity is checked lazily at call time)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.channels`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `null` - No contract implementation

## Dependencies

The `useChannels` hook requires:
- **`subsystem.identity`**: Must be available at runtime (from `usePrincipals` hook via AccessControl registration)

**Note:** Identity is not a facet dependency, so it's checked lazily when channel methods are called. This allows the hook to be installed even if identity isn't available yet, but operations will fail with a helpful error if identity is missing.

**Example:**
```javascript
subsystem
  .use(usePrincipals)  // Required for identity (via AccessControl)
  .use(useChannels)   // Can now use channels
  .build();
```

## Configuration

The `useChannels` hook does not read any configuration. It relies entirely on `subsystem.identity` for channel operations.

## Facet Methods

### `buildRoute(localName)`

Build a canonical channel route for this subsystem.

**Signature:**
```javascript
buildRoute(localName) => string
```

**Parameters:**
- `localName` (string, required) - Local channel name (no scheme/prefix)

**Returns:** `string` - Fully qualified channel route

**Throws:**
- `Error` - If localName is not a non-empty string

**Route Format:**
- Uses `subsystem.getNameString()` to get the subsystem prefix
- Appends `channel/{localName}` to the prefix
- Example: `"ui://"` + `"channel/graph-layout"` = `"ui://channel/graph-layout"`

**Example:**
```javascript
const route = subsystem.channels.buildRoute('graph-layout');
// Returns: "ui://channel/graph-layout" (if subsystem name is "ui://")
```

### `create(localName, options)`

Create a channel using a local name (preferred ergonomic API).

**Signature:**
```javascript
create(localName, options) => Channel
```

**Parameters:**
- `localName` (string, required) - Local channel name (no scheme/prefix)
- `options` (Object, optional, default: `{}`) - Channel options:
  - `participants` (Array<any>, optional, default: `[]`) - PKRs allowed to use the channel
  - `metadata` (Object, optional, default: `{}`) - Optional channel metadata

**Returns:** `Channel` - Channel instance

**Throws:**
- `Error` - If identity is not available
- `Error` - If localName is invalid

**Behavior:**
- Automatically builds route using `buildRoute(localName)`
- Sets `metadata.name` to `localName` if not already provided (helps `ChannelManager.getChannelFor()` find channels by short name)
- Delegates to `identity.createChannel(route, { participants, metadata })`

**Example:**
```javascript
const channel = subsystem.channels.create('graph-layout', {
  participants: [otherPkr],
  metadata: { description: 'Layout updates' }
});

console.log(channel.route); // "ui://channel/graph-layout"
console.log(channel.metadata.name); // "graph-layout"
```

### `createWithRoute(route, options)`

Create a channel with a fully specified route string.

**Signature:**
```javascript
createWithRoute(route, options) => Channel
```

**Parameters:**
- `route` (string, required) - Fully qualified channel route
- `options` (Object, optional, default: `{}`) - Channel options:
  - `participants` (Array<any>, optional, default: `[]`) - PKRs allowed to use the channel
  - `metadata` (Object, optional, default: `{}`) - Optional channel metadata

**Returns:** `Channel` - Channel instance

**Throws:**
- `Error` - If identity is not available
- `Error` - If route is not a non-empty string

**Use Cases:**
- Creating channels with custom routes that don't follow the standard pattern
- Inter-subsystem channels with specific routing requirements
- Legacy channel routes that need to be preserved

**Example:**
```javascript
const channel = subsystem.channels.createWithRoute('custom://special/channel', {
  participants: [otherPkr],
  metadata: { type: 'special' }
});
```

### `get(nameOrRoute)`

Get a channel owned by this subsystem's identity by name or route.

**Signature:**
```javascript
get(nameOrRoute) => Channel | null
```

**Parameters:**
- `nameOrRoute` (string, required) - Channel name or full route

**Returns:** `Channel | null` - Channel instance or null if not found

**Throws:**
- `Error` - If identity is not available
- `Error` - If nameOrRoute is invalid

**Lookup Behavior:**
- **Full route**: `"canvas://channel/layout"` - Direct route lookup
- **Short name**: `"layout"` - Searches by:
  1. Exact route match (if route matches pattern)
  2. `metadata.name` match among owned channels
  3. Route suffix match (`/channel/{name}`) among owned channels

**Example:**
```javascript
// By short name
const channel = subsystem.channels.get('graph-layout');
if (channel) {
  console.log('Channel found:', channel.route);
}

// By full route
const channel2 = subsystem.channels.get('ui://channel/graph-layout');
```

### `list()`

List all channels owned by this subsystem's identity.

**Signature:**
```javascript
list() => Array<Channel>
```

**Returns:** `Array<Channel>` - Array of channel instances owned by this identity

**Throws:**
- `Error` - If identity is not available

**Example:**
```javascript
const channels = subsystem.channels.list();
channels.forEach(ch => {
  console.log(`Channel: ${ch.route}, Participants: ${ch.participants.size}`);
});
```

## Usage Patterns

### Pattern 1: Create and Use a Channel

```javascript
// Create a channel
const channel = subsystem.channels.create('updates', {
  participants: [otherPkr],
  metadata: { description: 'Real-time updates' }
});

// Register route handler for the channel
subsystem.registerRoute(channel.route, (message) => {
  console.log('Received update:', message.getBody());
});

// Send messages to the channel
await subsystem.identity.sendProtected(
  subsystem.messages.create(channel.route, { data: 'update' })
);
```

### Pattern 2: Lookup Existing Channel

```javascript
// Get channel by name
const channel = subsystem.channels.get('updates');
if (channel) {
  // Channel exists, use it
  console.log('Channel route:', channel.route);
} else {
  // Channel doesn't exist, create it
  const newChannel = subsystem.channels.create('updates');
}
```

### Pattern 3: List All Channels

```javascript
const channels = subsystem.channels.list();
console.log(`Found ${channels.length} channels:`);
channels.forEach(ch => {
  console.log(`- ${ch.route} (${ch.participants.size} participants)`);
});
```

### Pattern 4: Custom Route Channel

```javascript
// Create channel with custom route
const channel = subsystem.channels.createWithRoute('legacy://old/channel', {
  participants: [legacyPkr],
  metadata: { legacy: true }
});
```

### Pattern 5: Channel for Command Replies

```javascript
// Create a reply channel for commands
const replyChannel = subsystem.channels.create('command-replies', {
  metadata: { purpose: 'command-replies' }
});

// Register handler
subsystem.registerRoute(replyChannel.route, (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Use in command requests
await subsystem.requests
  .command()
  .with({ replyTo: replyChannel.route, timeout: 5000 })
  .forMessage(commandMessage)
  .send();
```

## Integration with Other Hooks

### Principals Hook

The `useChannels` hook requires `subsystem.identity` from `usePrincipals`:
- All channel operations delegate to `identity.createChannel()`, `identity.getChannel()`, and `identity.listChannels()`
- Identity methods interact with `ChannelManagerSubsystem` through the kernel

**Example:**
```javascript
subsystem
  .use(usePrincipals)  // Provides identity
  .use(useChannels)    // Uses identity for channel operations
  .build();
```

### Router Hook

Channels are typically used with routes:
- Create a channel to get a route
- Register a route handler for the channel route
- Send messages to the channel route

**Example:**
```javascript
// Create channel
const channel = subsystem.channels.create('updates');

// Register route handler
subsystem.registerRoute(channel.route, (message) => {
  // Handle messages on this channel
});
```

### Requests Hook

Channels are commonly used with command requests:
- Create a reply channel
- Use channel route as `replyTo` in command requests
- Handle replies on the channel route

**Example:**
```javascript
// Create reply channel
const replyChannel = subsystem.channels.create('replies');

// Register reply handler
subsystem.registerRoute(replyChannel.route, (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

// Send command with channel reply
await subsystem.requests
  .command()
  .with({ replyTo: replyChannel.route, timeout: 5000 })
  .forMessage(commandMessage)
  .send();
```

## Channel Route Format

Channels follow a canonical route format:

**Standard Format:**
```
{subsystemPrefix}channel/{localName}
```

**Examples:**
- `"ui://channel/graph-layout"` (from `"ui://"` + `"channel/graph-layout"`)
- `"canvas://channel/updates"` (from `"canvas://"` + `"channel/updates"`)
- `"kernel://channel/replies"` (from `"kernel://"` + `"channel/replies"`)

**Custom Routes:**
- Use `createWithRoute()` for non-standard routes
- Example: `"custom://special/channel"`

## Identity Integration

The `useChannels` hook never directly accesses the kernel or `ChannelManagerSubsystem`. All operations go through `subsystem.identity`:

1. **Identity Methods**: `identity.createChannel()`, `identity.getChannel()`, `identity.listChannels()`
2. **Identity Implementation**: These methods are provided by `createIdentity()` function
3. **Kernel Access**: Identity methods access `ChannelManagerSubsystem` through the kernel
4. **Security**: Identity ensures proper owner PKR scoping and permission checks

## Error Handling

### Missing Identity Error

```javascript
try {
  const channel = subsystem.channels.create('test');
} catch (error) {
  // Error: "channels facet: subsystem.identity is required. 
  //        Ensure the subsystem has been registered via AccessControl."
}
```

### Invalid Local Name Error

```javascript
try {
  const route = subsystem.channels.buildRoute('');
} catch (error) {
  // Error: "channels.buildRoute: localName must be a non-empty string."
}
```

### Invalid Route Error

```javascript
try {
  const channel = subsystem.channels.createWithRoute('');
} catch (error) {
  // Error: "channels.createWithRoute: route must be a non-empty string."
}
```

## Best Practices

1. **Use Local Names**: Prefer `create(localName)` over `createWithRoute()` for standard channels
2. **Set Metadata**: Provide meaningful metadata for easier channel management
3. **Register Routes**: Always register route handlers for channels you create
4. **Check Existence**: Use `get()` to check if a channel exists before creating
5. **List Channels**: Use `list()` to discover existing channels
6. **Use for Commands**: Create dedicated reply channels for command requests
7. **Participant Management**: Add participants when creating channels if needed
8. **Route Consistency**: Use `buildRoute()` to ensure consistent route formatting

## Performance Considerations

- **Route Building**: `buildRoute()` is a simple string operation, very fast
- **Identity Delegation**: All operations delegate to identity, which may involve kernel calls
- **Channel Lookup**: `get()` uses `ChannelManagerSubsystem.getChannelFor()` which may search multiple channels
- **List Operation**: `list()` returns all channels owned by the identity

## See Also

- [Channels Guide](../../communication/CHANNELS.md) - Channel-based communication for commands and requests
- [Communication Types Supported](../../communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [Commands Guide](../../communication/COMMANDS.md) - How commands use channels
- [Requests Guide](../../communication/REQUESTS.md) - How requests use channels
- [When to Use What](../../communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns
- [createIdentity](../../security/CREATE-IDENTITY.md) - Identity function that provides channel methods
- [ChannelManagerSubsystem](../../models/kernel-subsystem/channel-manager-subsystem/CHANNEL-MANAGER-SUBSYSTEM.md) - Channel manager subsystem documentation
- [Channel Class](../../models/kernel-subsystem/channel-manager-subsystem/CHANNEL.md) - Channel class documentation
- [useRouter](../router/USE-ROUTER.md) - Router hook for registering channel routes
- [usePrincipals](../principals/USE-PRINCIPALS.md) - Principals hook for identity management
- [useRequests](../requests/USE-REQUESTS.md) - Requests hook for command requests with channels


