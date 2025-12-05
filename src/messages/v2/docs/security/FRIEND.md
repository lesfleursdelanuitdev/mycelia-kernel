# Friend

## Overview

The **Friend** class represents a trusted peer instance in the Mycelia network. Friends are authenticated peers with their own identity and keys, used for cross-system communication.

**Key Features:**
- **Connection State**: Tracks connected/disconnected state
- **Last Seen Tracking**: Timestamp of last connection
- **Protected Messaging**: Delegates to MessageSystem
- **Duck-Type Markers**: `isFriend` and `kind` properties for type checking

## Constructor

### Signature

```javascript
new Friend({ name, endpoint, metadata, sessionKey })
```

### Parameters

#### `name` (string, optional)

The friend's name.

**Default:** `undefined`

#### `endpoint` (string, optional)

The friend's network endpoint.

**Default:** `undefined`

#### `metadata` (object, optional)

Optional metadata object for storing additional information.

**Default:** `{}`

#### `sessionKey` (symbol, optional)

Optional session key for secure communication.

**Default:** `null`

**Example:**
```javascript
const friend = new Friend({
  name: 'Anna',
  endpoint: 'https://anna.example.com',
  metadata: { version: '1.0' },
  sessionKey: Symbol('session-key')
});
```

## Properties

### `kind` (getter)

Returns `PRINCIPAL_KINDS.FRIEND`.

```javascript
friend.kind; // 'friend'
```

### `isFriend` (getter)

Returns `true` for duck-type checking.

```javascript
friend.isFriend; // true
```

### `name` (getter)

Returns the friend's name.

```javascript
friend.name; // 'Anna'
```

### `endpoint` (getter)

Returns the friend's endpoint.

```javascript
friend.endpoint; // 'https://anna.example.com'
```

### `metadata` (getter)

Returns the metadata object.

```javascript
friend.metadata; // { version: '1.0' }
```

### `sessionKey` (getter)

Returns the session key or `null`.

```javascript
friend.sessionKey; // Symbol('session-key') or null
```

### `connected` (getter)

Returns the connection state.

```javascript
friend.connected; // true or false
```

### `lastSeen` (getter)

Returns the last seen timestamp or `null`.

```javascript
friend.lastSeen; // Date object or null
```

## Methods

### `connect()`

Marks the friend as connected and updates the last seen timestamp.

**Example:**
```javascript
friend.connect();
// friend.connected === true
// friend.lastSeen === new Date()
```

### `disconnect()`

Marks the friend as disconnected.

**Example:**
```javascript
friend.disconnect();
// friend.connected === false
```

### `sendProtected(message, ms)`

Sends a protected message to this friend through the MessageSystem.

**Parameters:**
- `message` (Message, required) - Message to send
- `ms` (MessageSystem, required) - MessageSystem instance

**Returns:** `Promise<Object>` - Send result

**Throws:**
- `Error` if friend is not connected
- `Error` if MessageSystem is missing or invalid

**Example:**
```javascript
const friend = new Friend({ name: 'Anna' });
friend.connect();

const message = new Message('friend://operation', { data: 'value' });
const result = await friend.sendProtected(message, messageSystem);
```

### `getNameString()`

Returns a standardized friend identifier string.

**Returns:** `string` - Formatted identifier

**Example:**
```javascript
friend.getNameString(); // "friend:Anna"
friend.getNameString(); // "friend:(anonymous)" if no name
```

### `toRecord()`

Converts the friend to a serializable record object.

**Returns:** `object` - Record representation

**Example:**
```javascript
const record = friend.toRecord();
// {
//   kind: 'friend',
//   name: 'Anna',
//   endpoint: 'https://anna.example.com',
//   connected: true,
//   lastSeen: Date,
//   metadata: {}
// }
```

### `toString()`

Returns a human-readable string representation.

**Returns:** `string` - Formatted string

**Example:**
```javascript
friend.toString(); // "[Friend Anna → https://anna.example.com]"
```

## Usage Examples

### Basic Friend Creation

```javascript
import { Friend } from './friend.mycelia.js';

const friend = new Friend({
  name: 'Anna',
  endpoint: 'https://anna.example.com',
  metadata: { version: '1.0' }
});
```

### Connection Management

```javascript
const friend = new Friend({ name: 'Anna' });

// Connect
friend.connect();
console.log(friend.connected); // true
console.log(friend.lastSeen); // Date object

// Disconnect
friend.disconnect();
console.log(friend.connected); // false
```

### Protected Messaging

```javascript
const friend = new Friend({ name: 'Anna' });
friend.connect();

const message = new Message('friend://operation', { data: 'value' });
const result = await friend.sendProtected(message, messageSystem);
```

### Duck-Type Checking

```javascript
const friend = new Friend({ name: 'Anna' });

// Check if object is a friend
if (friend.isFriend && friend.kind === 'friend') {
  // Handle as friend
}
```

## Best Practices

1. **Use `connect()`/`disconnect()`** to manage connection state
2. **Check `connected`** before sending messages
3. **Use `getNameString()`** for consistent identification
4. **Use duck-type markers** (`isFriend`, `kind`) for type checking

## Related Documentation

- [Principal](./PRINCIPAL.md) - Principal representation
- [createFriendIdentity](./CREATE-FRIEND-IDENTITY.md) - Friend identity creation
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Friend principal management







