# Channel Class

## Overview

The **Channel** class represents a communication channel with owner-based access control and participant management. Channels are used for multi-party communication where an owner controls access and can add/remove participants.

**Key Features:**
- **Owner Control**: Owner (PKR) controls the channel
- **Participant Management**: Add and remove participants
- **Access Control**: Check if a caller can use the channel
- **Metadata Storage**: Store additional channel information

## What is Channel?

`Channel` is an internal class used by `ChannelManagerSubsystem` to represent a communication channel. It provides:
- Route/path identification
- Owner-based access control
- Participant set management
- Metadata storage

## Constructor

### Signature

```javascript
new Channel({ route, ownerPkr, participants = [], metadata = {} })
```

### Parameters

#### `route` (string, required)

Channel route/path (e.g., `"canvas://channel/layout"`).

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

#### `ownerPkr` (PKR, required)

Owner's Public Key Record.

**Validation:**
- Must be provided
- Throws `Error` if missing

#### `participants` (Array<PKR>, optional)

Initial participants. Defaults to empty array.

**Default:** `[]`

**Validation:**
- Must be an array
- Throws `Error` if not an array

#### `metadata` (Object, optional)

Channel metadata. Defaults to empty object.

**Default:** `{}`

**Validation:**
- Must be an object
- Throws `Error` if not an object

**Example:**
```javascript
const channel = new Channel({
  route: 'canvas://channel/layout',
  ownerPkr: canvasPkr,
  participants: [userPkr1, userPkr2],
  metadata: { name: 'layout', description: 'Layout updates' }
});
```

## Properties

### `route` (string, read-only)

Channel route/path. Set during construction and cannot be changed.

### `ownerPkr` (PKR, read-only)

Owner's Public Key Record. Set during construction and cannot be changed.

### `participants` (Set<PKR>, read-write)

Set of participant PKRs. Can be modified via `addParticipant()` and `removeParticipant()`.

### `metadata` (Object, read-write)

Channel metadata object. Can be modified directly.

## Methods

### `addParticipant(pkr)`

Add a participant to the channel.

**Signature:**
```javascript
addParticipant(pkr) => boolean
```

**Parameters:**
- `pkr` (PKR, required) - Participant's Public Key Record

**Returns:** `boolean` - True if participant was added (wasn't already a participant), false otherwise

**Throws:**
- `Error` if pkr is not provided

**Example:**
```javascript
const added = channel.addParticipant(userPkr);
if (added) {
  console.log('Participant added');
} else {
  console.log('Participant already exists');
}
```

### `removeParticipant(pkr)`

Remove a participant from the channel.

**Signature:**
```javascript
removeParticipant(pkr) => boolean
```

**Parameters:**
- `pkr` (PKR, required) - Participant's Public Key Record

**Returns:** `boolean` - True if participant was removed (was a participant), false otherwise

**Throws:**
- `Error` if pkr is not provided

**Example:**
```javascript
const removed = channel.removeParticipant(userPkr);
if (removed) {
  console.log('Participant removed');
} else {
  console.log('Participant was not a member');
}
```

### `canUse(callerPkr)`

Check if a caller can use this channel.

**Signature:**
```javascript
canUse(callerPkr) => boolean
```

**Parameters:**
- `callerPkr` (PKR, required) - Caller's Public Key Record

**Returns:** `boolean` - True if caller can use the channel, false otherwise

**Access Rules:**
- Owner can always use the channel
- Participants can use the channel
- Others cannot use the channel

**Example:**
```javascript
const canUse = channel.canUse(callerPkr);
if (canUse) {
  console.log('Caller can use the channel');
}
```

### `snapshot()`

Get a snapshot of the channel state.

**Signature:**
```javascript
snapshot() => Object
```

**Returns:** `Object` - Snapshot object with:
- `route` (string) - Channel route
- `ownerPkr` (PKR) - Owner's PKR
- `participants` (Array<PKR>) - Array of participant PKRs
- `metadata` (Object) - Channel metadata

**Example:**
```javascript
const snapshot = channel.snapshot();
console.log('Channel snapshot:', snapshot);
// {
//   route: 'canvas://channel/layout',
//   ownerPkr: canvasPkr,
//   participants: [userPkr1, userPkr2],
//   metadata: { name: 'layout', description: 'Layout updates' }
// }
```

## Usage Patterns

### Pattern 1: Create and Manage Channel

```javascript
// Create channel
const channel = new Channel({
  route: 'canvas://channel/updates',
  ownerPkr: canvasPkr,
  participants: [userPkr1],
  metadata: { name: 'updates' }
});

// Add participants
channel.addParticipant(userPkr2);
channel.addParticipant(userPkr3);

// Remove participant
channel.removeParticipant(userPkr1);

// Check access
const canUse = channel.canUse(userPkr2); // true
const cannotUse = channel.canUse(unauthorizedPkr); // false
```

### Pattern 2: Access Control

```javascript
// Owner can always use
const ownerCanUse = channel.canUse(channel.ownerPkr); // true

// Participants can use
const participantCanUse = channel.canUse(userPkr1); // true (if added)

// Others cannot use
const otherCanUse = channel.canUse(otherPkr); // false
```

### Pattern 3: Metadata Management

```javascript
// Set metadata
channel.metadata.description = 'Real-time updates';
channel.metadata.priority = 'high';

// Get snapshot with metadata
const snapshot = channel.snapshot();
console.log(snapshot.metadata); // { description: '...', priority: 'high' }
```

## Integration with ChannelManagerSubsystem

Channels are typically created and managed through `ChannelManagerSubsystem`:

```javascript
// Register channel (creates Channel internally)
const channel = channelManager.registerChannel({
  route: 'canvas://channel/layout',
  ownerPkr: canvasPkr,
  participants: [userPkr1],
  metadata: { name: 'layout' }
});

// Channel is now managed by ChannelManagerSubsystem
// Access via channelManager methods
channelManager.addParticipant(channel.route, userPkr2);
channelManager.canUseChannel(channel.route, userPkr1);
```

## Best Practices

1. **Use ChannelManagerSubsystem**: Create channels via `ChannelManagerSubsystem.registerChannel()`
2. **Set Metadata**: Provide meaningful metadata for easier lookup
3. **Manage Participants**: Use `addParticipant()` and `removeParticipant()` methods
4. **Check Access**: Use `canUse()` before allowing channel operations
5. **Snapshot for Serialization**: Use `snapshot()` for serialization or debugging

## See Also

- [Channel Manager Subsystem](./CHANNEL-MANAGER-SUBSYSTEM.md) - Subsystem that manages channels
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem with channel ACL enforcement
- [useChannels Hook](../../../hooks/channels/USE-CHANNELS.md) - Hook for working with channels




