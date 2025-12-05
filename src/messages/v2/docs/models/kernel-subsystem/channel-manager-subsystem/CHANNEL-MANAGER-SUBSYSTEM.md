# Channel Manager Subsystem

## Overview

The **ChannelManagerSubsystem** is a kernel child subsystem responsible for managing communication channels. It provides channel registration, participant management, and access control verification for multi-party communication.

**Key Features:**
- **Channel Registration**: Register and unregister communication channels
- **Participant Management**: Add and remove participants from channels
- **Access Control**: Verify channel access for owners and participants
- **Owner-Scoped Lookup**: Find channels by owner PKR and name/route
- **Channel Indexing**: Efficient lookup by route and owner

## What is ChannelManagerSubsystem?

`ChannelManagerSubsystem` is a kernel child subsystem that:
- Manages long-lived communication channels
- Enforces channel access control (owner and participants)
- Provides channel lookup by route or owner-scoped name
- Integrates with `KernelSubsystem.sendProtected()` for automatic ACL enforcement

**Architecture:**
```
ChannelManagerSubsystem
├─ Channel Registry (route -> Channel)
├─ Owner Index (ownerPkr -> Set<Channel>)
└─ Access Control Verification
```

## Constructor

### Signature

```javascript
new ChannelManagerSubsystem(name = 'channel-manager', options = {})
```

### Parameters

#### `name` (string, optional)

The subsystem name. Defaults to `'channel-manager'`.

**Default:** `'channel-manager'`

#### `options` (object, required)

Configuration options for the channel manager subsystem.

**Properties:**
- `ms` (MessageSystem, required) - MessageSystem instance
- `config` (object, optional) - Configuration object
- `debug` (boolean, optional) - Enable debug logging

**Example:**
```javascript
const channelManager = new ChannelManagerSubsystem('channel-manager', {
  ms: messageSystem,
  debug: true
});
```

## Registration API

### `registerChannel({ route, ownerPkr, participants, metadata })`

Register a new channel.

**Signature:**
```javascript
registerChannel({ route, ownerPkr, participants = [], metadata = {} }) => Channel
```

**Parameters:**
- `route` (string, required) - Channel route/path (e.g., `"canvas://channel/layout"`)
- `ownerPkr` (PKR, required) - Owner's Public Key Record
- `participants` (Array<PKR>, optional, default: `[]`) - Initial participants
- `metadata` (Object, optional, default: `{}`) - Channel metadata

**Returns:** `Channel` - The created channel instance

**Throws:**
- `Error` if route is invalid
- `Error` if ownerPkr is missing
- `Error` if channel already exists for the route

**Example:**
```javascript
const channel = channelManager.registerChannel({
  route: 'canvas://channel/layout',
  ownerPkr: canvasPkr,
  participants: [userPkr1, userPkr2],
  metadata: { name: 'layout', description: 'Layout updates' }
});
```

### `unregisterChannel(route)`

Unregister a channel.

**Signature:**
```javascript
unregisterChannel(route) => boolean
```

**Parameters:**
- `route` (string, required) - Channel route

**Returns:** `boolean` - True if channel was found and unregistered, false otherwise

**Throws:**
- `Error` if route is invalid

**Example:**
```javascript
const removed = channelManager.unregisterChannel('canvas://channel/layout');
if (removed) {
  console.log('Channel unregistered');
}
```

### `getChannel(route)`

Get a channel by route.

**Signature:**
```javascript
getChannel(route) => Channel | null
```

**Parameters:**
- `route` (string, required) - Channel route

**Returns:** `Channel | null` - Channel instance or null if not found

**Throws:**
- `Error` if route is invalid

**Example:**
```javascript
const channel = channelManager.getChannel('canvas://channel/layout');
if (channel) {
  console.log('Channel found:', channel.route);
}
```

### `listChannels()`

List all registered channels.

**Signature:**
```javascript
listChannels() => Array<Channel>
```

**Returns:** `Array<Channel>` - Array of all channel instances

**Example:**
```javascript
const channels = channelManager.listChannels();
console.log(`Found ${channels.length} channels`);
```

## Owner-Scoped Lookup

### `listAllChannelsFor(ownerPkr)`

Return all channels owned by a given PKR.

**Signature:**
```javascript
listAllChannelsFor(ownerPkr) => Array<Channel>
```

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `Array<Channel>` - Array of channels owned by the PKR

**Throws:**
- `Error` if ownerPkr is not provided

**Example:**
```javascript
const channels = channelManager.listAllChannelsFor(canvasPkr);
console.log(`Canvas owns ${channels.length} channels`);
```

### `getChannelFor(ownerPkr, nameOrRoute)`

Get a channel for a specific owner PKR and a name/route.

**Signature:**
```javascript
getChannelFor(ownerPkr, nameOrRoute) => Channel | null
```

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record
- `nameOrRoute` (string, required) - Full route (e.g., `"canvas://channel/layout"`) or short name (e.g., `"layout"`)

**Returns:** `Channel | null` - Channel instance or null if not found

**Lookup Order:**
1. Exact route match (owner must match)
2. `metadata.name` match among channels owned by this PKR
3. Suffix `/channel/<name>` match among channels owned by this PKR

**Throws:**
- `Error` if parameters are invalid

**Example:**
```javascript
// By full route
const channel1 = channelManager.getChannelFor(canvasPkr, 'canvas://channel/layout');

// By short name (searches metadata.name and route suffix)
const channel2 = channelManager.getChannelFor(canvasPkr, 'layout');
```

## Participant / ACL

### `addParticipant(route, pkr)`

Add a participant to a channel.

**Signature:**
```javascript
addParticipant(route, pkr) => boolean
```

**Parameters:**
- `route` (string, required) - Channel route
- `pkr` (PKR, required) - Participant's Public Key Record

**Returns:** `boolean` - True if participant was added, false if channel not found or already a participant

**Example:**
```javascript
const added = channelManager.addParticipant('canvas://channel/layout', userPkr);
if (added) {
  console.log('Participant added');
}
```

### `removeParticipant(route, pkr)`

Remove a participant from a channel.

**Signature:**
```javascript
removeParticipant(route, pkr) => boolean
```

**Parameters:**
- `route` (string, required) - Channel route
- `pkr` (PKR, required) - Participant's Public Key Record

**Returns:** `boolean` - True if participant was removed, false if channel not found or not a participant

**Example:**
```javascript
const removed = channelManager.removeParticipant('canvas://channel/layout', userPkr);
if (removed) {
  console.log('Participant removed');
}
```

### `canUseChannel(route, callerPkr)`

Check if a caller can use a channel.

**Signature:**
```javascript
canUseChannel(route, callerPkr) => boolean
```

**Parameters:**
- `route` (string, required) - Channel route
- `callerPkr` (PKR, required) - Caller's Public Key Record

**Returns:** `boolean` - True if caller can use the channel, false otherwise

**Access Rules:**
- Owner can always use the channel
- Participants can use the channel
- Others cannot use the channel

**Example:**
```javascript
const canUse = channelManager.canUseChannel('canvas://channel/layout', callerPkr);
if (canUse) {
  console.log('Caller can use the channel');
}
```

### `verifyAccess(route, callerPkr)`

Verify access to a channel (with logging).

**Signature:**
```javascript
verifyAccess(route, callerPkr) => boolean
```

**Parameters:**
- `route` (string, required) - Channel route
- `callerPkr` (PKR, required) - Caller's Public Key Record

**Returns:** `boolean` - True if caller can use the channel, false otherwise

**Behavior:**
- Checks access via `canUseChannel()`
- Logs warning if access is denied
- Used by `KernelSubsystem.sendProtected()` for ACL enforcement

**Example:**
```javascript
const ok = channelManager.verifyAccess('canvas://channel/layout', callerPkr);
if (!ok) {
  // Access denied (warning already logged)
}
```

## Introspection

### `getStatus()`

Get status information.

**Signature:**
```javascript
getStatus() => Object
```

**Returns:** `Object` - Status object with:
- `count` (number) - Total number of channels
- `channels` (Array<Object>) - Array of channel snapshots

**Example:**
```javascript
const status = channelManager.getStatus();
console.log(`Total channels: ${status.count}`);
status.channels.forEach(ch => {
  console.log(`Channel: ${ch.route}, Participants: ${ch.participants.length}`);
});
```

## Disposal

### `dispose()`

Dispose the subsystem and clean up all channels.

**Signature:**
```javascript
dispose() => Promise<void>
```

**Behavior:**
- Clears all channels
- Clears owner index
- Logs disposal message
- Calls parent `dispose()` if available

**Example:**
```javascript
await channelManager.dispose();
```

## Integration with KernelSubsystem

The `ChannelManagerSubsystem` integrates with `KernelSubsystem.sendProtected()` for automatic channel ACL enforcement:

1. **Channel Detection**: Kernel checks if message path is a registered channel
2. **ACL Enforcement**: Kernel calls `verifyAccess()` to check caller permissions
3. **Error on Unauthorized**: Kernel throws error if caller is not authorized

**Example:**
```javascript
// Channel is registered
channelManager.registerChannel({
  route: 'canvas://channel/updates',
  ownerPkr: canvasPkr,
  participants: [userPkr]
});

// Kernel automatically enforces ACL when sending to channel
await kernel.sendProtected(
  authorizedPkr,  // Owner or participant - allowed
  new Message('canvas://channel/updates', { data: 'update' })
);

// Unauthorized caller - throws error
try {
  await kernel.sendProtected(
    unauthorizedPkr,  // Not owner or participant - denied
    new Message('canvas://channel/updates', { data: 'update' })
  );
} catch (error) {
  // Error: "caller is not authorized to use channel..."
}
```

## Usage Patterns

### Pattern 1: Create and Use Channel

```javascript
// Create channel
const channel = channelManager.registerChannel({
  route: 'canvas://channel/updates',
  ownerPkr: canvasPkr,
  participants: [userPkr1, userPkr2],
  metadata: { name: 'updates', description: 'Real-time updates' }
});

// Add more participants
channelManager.addParticipant(channel.route, userPkr3);

// Check access
const canUse = channelManager.canUseChannel(channel.route, userPkr1);
```

### Pattern 2: Owner-Scoped Lookup

```javascript
// List all channels owned by a PKR
const channels = channelManager.listAllChannelsFor(canvasPkr);

// Get channel by short name
const layoutChannel = channelManager.getChannelFor(canvasPkr, 'layout');
```

### Pattern 3: Channel Lifecycle

```javascript
// Register channel
const channel = channelManager.registerChannel({
  route: 'canvas://channel/temp',
  ownerPkr: canvasPkr
});

// Use channel...

// Unregister when done
channelManager.unregisterChannel(channel.route);
```

## Error Handling

### Duplicate Channel

```javascript
try {
  channelManager.registerChannel({
    route: 'canvas://channel/layout',
    ownerPkr: canvasPkr
  });
  // Register again - error
  channelManager.registerChannel({
    route: 'canvas://channel/layout',
    ownerPkr: canvasPkr
  });
} catch (error) {
  // Error: "channel already exists for route..."
}
```

### Invalid Route

```javascript
try {
  channelManager.getChannel('');
} catch (error) {
  // Error: "route must be a non-empty string"
}
```

## Best Practices

1. **Use Consistent Routes**: Use canonical route format: `{subsystem}://channel/{name}`
2. **Set Metadata**: Provide meaningful metadata for easier lookup
3. **Manage Participants**: Add/remove participants as needed
4. **Clean Up**: Unregister channels when no longer needed
5. **Check Access**: Use `canUseChannel()` before sending to channels
6. **Owner Scoping**: Use `getChannelFor()` for owner-scoped lookups

## See Also

- [Channel Class](./CHANNEL.md) - Channel class documentation
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem with channel ACL enforcement
- [useChannels Hook](../../../hooks/channels/USE-CHANNELS.md) - Hook for working with channels
- [createIdentity](../../../security/CREATE-IDENTITY.md) - Identity wrapper with channel methods




