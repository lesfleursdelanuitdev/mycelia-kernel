# createIdentity

## Overview

The **createIdentity** function constructs an identity context around a given owner PKR. It provides permission-checked wrappers for read/write/grant/auth operations and a secure `sendProtected` method that auto-injects the owner's PKR.

**Key Features:**
- **Permission Wrappers**: `requireRead`, `requireWrite`, `requireGrant`
- **Generic Auth Wrapper**: `requireAuth(type, handler)`
- **Grant/Revoke Helpers**: Convenience methods for permission management
- **Protected Messaging**: Auto-injects owner PKR in `sendProtected`
- **Channel Management**: Create, lookup, and list channels owned by the identity

## Function Signature

```javascript
createIdentity(principals, ownerPkr, kernel)
```

### Parameters

#### `principals` (PrincipalRegistry, required)

The PrincipalRegistry instance for PKR resolution and RWS creation.

**Validation:**
- Must have `resolvePKR` method
- Must have `createRWS` method
- Throws `TypeError` if invalid

#### `ownerPkr` (PKR, required)

The owner's Public Key Record.

**Validation:**
- Must have `publicKey` property (symbol)
- Throws `TypeError` if invalid

#### `kernel` (object, required)

The kernel instance with `sendProtected` method.

**Validation:**
- Must have `sendProtected` method
- Throws `TypeError` if invalid

### Returns

**Object** - Identity object with:
- `pkr`: Owner PKR
- `canRead`, `canWrite`, `canGrant`: Permission query functions
- `requireRead`, `requireWrite`, `requireGrant`: Permission wrappers
- `requireAuth`: Generic auth wrapper
- `grantReader`, `grantWriter`, `revokeReader`, `revokeWriter`: Permission management
- `promote`, `demote`: Permission promotion/demotion
- `sendProtected`: Protected messaging method
- `createChannel`, `getChannel`, `listChannels`: Channel management methods

## Permission Queries

### `canRead(pkr)`

Checks if a PKR has read permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can read

**Example:**
```javascript
const identity = createIdentity(principals, ownerPkr, kernel);
if (identity.canRead(pkr)) {
  // Allow read operation
}
```

### `canWrite(pkr)`

Checks if a PKR has write permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can write

**Example:**
```javascript
if (identity.canWrite(pkr)) {
  // Allow write operation
}
```

### `canGrant(pkr)`

Checks if a PKR has grant permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can grant

**Example:**
```javascript
if (identity.canGrant(pkr)) {
  // Allow permission delegation
}
```

## Permission Wrappers

### `requireRead(fn)`

Wraps a function to require read permission before execution.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks read permission

**Throws:** `Error` if read permission denied

**Example:**
```javascript
const readData = identity.requireRead((data) => {
  return data.value;
});

// Throws if owner doesn't have read permission
const value = readData(data);
```

### `requireWrite(fn)`

Wraps a function to require write permission before execution.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks write permission

**Throws:** `Error` if write permission denied

**Example:**
```javascript
const updateData = identity.requireWrite((data, newValue) => {
  data.value = newValue;
});

// Throws if owner doesn't have write permission
updateData(data, 'new-value');
```

### `requireGrant(fn)`

Wraps a function to require grant permission before execution.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks grant permission

**Throws:** `Error` if grant permission denied

**Example:**
```javascript
const grantAccess = identity.requireGrant((grantee) => {
  // Grant permission logic
});

// Throws if owner doesn't have grant permission
grantAccess(granteePkr);
```

### `requireAuth(type, handler)`

Generic authorization wrapper that supports multiple permission types.

**Parameters:**
- `type` (string, required) - Permission type: `'read'`, `'write'`, or `'grant'`
- `handler` (Function, required) - Handler function to wrap

**Returns:** `Function` - Wrapped function with permission check

**Throws:**
- `TypeError` if handler is not a function
- `Error` if unknown auth type
- `Error` if permission denied

**Example:**
```javascript
const readHandler = identity.requireAuth('read', (data) => {
  return data.value;
});

const writeHandler = identity.requireAuth('write', (data, value) => {
  data.value = value;
});
```

## Permission Management

### `grantReader(granter, grantee)`

Grants read permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal granting permission
- `grantee` (PKR, required) - The principal receiving permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.grantReader(ownerPkr, readerPkr);
```

### `grantWriter(granter, grantee)`

Grants write permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal granting permission
- `grantee` (PKR, required) - The principal receiving permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.grantWriter(ownerPkr, writerPkr);
```

### `revokeReader(granter, grantee)`

Revokes read permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal revoking permission
- `grantee` (PKR, required) - The principal losing permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.revokeReader(ownerPkr, readerPkr);
```

### `revokeWriter(granter, grantee)`

Revokes write permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal revoking permission
- `grantee` (PKR, required) - The principal losing permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.revokeWriter(ownerPkr, writerPkr);
```

### `promote(granter, grantee)`

Promotes a reader to writer.

**Parameters:**
- `granter` (PKR, required) - The principal granting promotion
- `grantee` (PKR, required) - The principal being promoted

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.promote(ownerPkr, readerPkr);
```

### `demote(granter, grantee)`

Demotes a writer to reader.

**Parameters:**
- `granter` (PKR, required) - The principal granting demotion
- `grantee` (PKR, required) - The principal being demoted

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
identity.demote(ownerPkr, writerPkr);
```

## Protected Messaging

### `sendProtected(message, options)`

Sends a protected message with the owner's PKR auto-injected.

**Parameters:**
- `message` (Message, required) - Message to send
- `options` (object, optional) - Additional send options

**Returns:** `Promise<Object>` - Send result

**Example:**
```javascript
const message = new Message('target://operation', { data: 'value' });
const result = await identity.sendProtected(message);
```

## Usage Examples

### Basic Identity Creation

```javascript
import { createIdentity } from './create-identity.mycelia.js';

const identity = createIdentity(principals, ownerPkr, kernel);

// Check permissions
if (identity.canRead(pkr)) {
  // Allow read
}
```

### Permission Wrappers

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Wrap function with read permission check
const getData = identity.requireRead((id) => {
  return database.get(id);
});

// Wrap function with write permission check
const updateData = identity.requireWrite((id, value) => {
  return database.update(id, value);
});

// Use wrapped functions
const data = getData('123'); // Throws if no read permission
updateData('123', 'new-value'); // Throws if no write permission
```

### Generic Auth Wrapper

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Create handlers with different permission levels
const readHandler = identity.requireAuth('read', (data) => data.value);
const writeHandler = identity.requireAuth('write', (data, value) => {
  data.value = value;
});
```

### Permission Management

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Grant permissions
identity.grantReader(ownerPkr, readerPkr);
identity.grantWriter(ownerPkr, writerPkr);

// Promote/demote
identity.promote(ownerPkr, readerPkr);
identity.demote(ownerPkr, writerPkr);

// Revoke permissions
identity.revokeReader(ownerPkr, readerPkr);
identity.revokeWriter(ownerPkr, writerPkr);
```

### Protected Messaging

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Send protected message (owner PKR auto-injected)
const message = new Message('target://operation', { data: 'value' });
const result = await identity.sendProtected(message);
```

### Channel Management

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Create a channel
const channel = identity.createChannel('canvas://channel/layout', {
  participants: [userPkr1, userPkr2],
  metadata: { name: 'layout', description: 'Layout channel' }
});

// Get channel by route
const channel1 = identity.getChannel('canvas://channel/layout');

// Get channel by name
const channel2 = identity.getChannel('layout');

// List all channels
const channels = identity.listChannels();
channels.forEach(ch => {
  console.log(`Channel: ${ch.route}`);
});
```

## Best Practices

1. **Use permission wrappers** for automatic permission checking
2. **Use `requireAuth()`** for flexible permission types
3. **Validate permissions** before granting
4. **Use `sendProtected()`** for secure messaging
5. **Check `canGrant()`** before permission operations
6. **Use channels for multi-party communication** - Channels provide a convenient way to manage communication groups
7. **Handle channel errors gracefully** - ChannelManagerSubsystem may not always be available

## Related Documentation

- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Creates identity wrappers
- [ReaderWriterSet](./READER-WRITER-SET.md) - Underlying access control
- [createFriendIdentity](./CREATE-FRIEND-IDENTITY.md) - Friend-specific identity
- [ChannelManagerSubsystem](../../models/kernel-subsystem/channel-manager-subsystem/CHANNEL-MANAGER-SUBSYSTEM.md) - Channel management subsystem




