# createResourceIdentity

## Overview

The **createResourceIdentity** function constructs an identity context around a resource PKR. Similar to `createIdentity`, but also checks if the caller is the resource owner. It provides permission-checked wrappers that grant access if:
- The RWS grants permission, OR
- The caller is the resource owner (via `isResourceOwner` check)

**Key Features:**
- **Owner Check**: `isResourceOwner(pkr)` function to verify resource ownership
- **Owner Privileges**: Resource owners have full read/write/grant permissions
- **RWS Integration**: Uses ReaderWriterSet for non-owner permissions
- **Permission Wrappers**: `requireRead`, `requireWrite`, `requireGrant`
- **Generic Auth Wrapper**: `requireAuth(type, handler)`
- **Grant/Revoke Helpers**: Convenience methods for permission management
- **Protected Messaging**: Uses resource owner PKR in `sendProtected`

## Function Signature

```javascript
createResourceIdentity(principals, resourcePkr, resourceOwnerPkr, kernel)
```

### Parameters

#### `principals` (PrincipalRegistry, required)

The PrincipalRegistry instance for PKR resolution and RWS creation.

**Validation:**
- Must have `resolvePKR` method
- Must have `createRWS` method
- Throws `TypeError` if invalid

#### `resourcePkr` (PKR, required)

The resource's Public Key Record.

**Validation:**
- Must have `publicKey` property (symbol)
- Throws `TypeError` if invalid

#### `resourceOwnerPkr` (PKR, required)

The resource owner's Public Key Record. Used for owner checks and `sendProtected`.

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
- `pkr`: Resource PKR
- `resourceOwnerPkr`: Resource owner PKR
- `isResourceOwner`: Function to check if a PKR is the resource owner
- `canRead`, `canWrite`, `canGrant`: Permission query functions (with owner check)
- `requireRead`, `requireWrite`, `requireGrant`: Permission wrappers
- `requireAuth`: Generic auth wrapper
- `grantReader`, `grantWriter`, `revokeReader`, `revokeWriter`: Permission management
- `promote`, `demote`: Permission promotion/demotion
- `sendProtected`: Protected messaging method (uses resource owner PKR)

## Owner Check

### `isResourceOwner(pkr)`

Checks if the given PKR is the owner of this resource.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if PKR is the resource owner

**Example:**
```javascript
const identity = createResourceIdentity(principals, resourcePkr, ownerPkr, kernel);
if (identity.isResourceOwner(pkr)) {
  // PKR is the resource owner
}
```

## Permission Queries

All permission queries (`canRead`, `canWrite`, `canGrant`) return `true` if:
- The PKR is the resource owner (via `isResourceOwner`), OR
- The RWS grants the permission

### `canRead(pkr)`

Checks if a PKR can read the resource.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can read (owner or RWS grants permission)

**Example:**
```javascript
const identity = createResourceIdentity(principals, resourcePkr, ownerPkr, kernel);
if (identity.canRead(pkr)) {
  // Allow read operation
}
```

### `canWrite(pkr)`

Checks if a PKR can write to the resource.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can write (owner or RWS grants permission)

**Example:**
```javascript
if (identity.canWrite(pkr)) {
  // Allow write operation
}
```

### `canGrant(pkr)`

Checks if a PKR can grant permissions on the resource.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can grant (owner or RWS grants permission)

**Example:**
```javascript
if (identity.canGrant(pkr)) {
  // Allow grant operation
}
```

## Permission Wrappers

### `requireRead(fn)`

Wraps a function to require read permission.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks read permission

**Throws:** `Error` if read permission denied

**Example:**
```javascript
const readData = identity.requireRead(() => {
  return resource.getData();
});
```

### `requireWrite(fn)`

Wraps a function to require write permission.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks write permission

**Throws:** `Error` if write permission denied

**Example:**
```javascript
const updateData = identity.requireWrite((data) => {
  resource.setData(data);
});
```

### `requireGrant(fn)`

Wraps a function to require grant permission.

**Parameters:**
- `fn` (Function, required) - Function to wrap

**Returns:** `Function` - Wrapped function that checks grant permission

**Throws:** `Error` if grant permission denied

**Example:**
```javascript
const grantAccess = identity.requireGrant((pkr) => {
  identity.grantReader(identity.pkr, pkr);
});
```

### `requireAuth(type, handler)`

Generic authorization wrapper.

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
const handler = identity.requireAuth('read', () => {
  return resource.getData();
});
```

## Permission Management

### `grantReader(granter, grantee)`

Grants read permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - PKR granting permission
- `grantee` (PKR, required) - PKR receiving permission

**Returns:** `boolean` - `true` if granted successfully

### `grantWriter(granter, grantee)`

Grants write permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - PKR granting permission
- `grantee` (PKR, required) - PKR receiving permission

**Returns:** `boolean` - `true` if granted successfully

### `revokeReader(granter, grantee)`

Revokes read permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - PKR revoking permission
- `grantee` (PKR, required) - PKR losing permission

**Returns:** `boolean` - `true` if revoked successfully

### `revokeWriter(granter, grantee)`

Revokes write permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - PKR revoking permission
- `grantee` (PKR, required) - PKR losing permission

**Returns:** `boolean` - `true` if revoked successfully

### `promote(granter, grantee)`

Promotes a grantee from reader to writer.

**Parameters:**
- `granter` (PKR, required) - PKR promoting permission
- `grantee` (PKR, required) - PKR being promoted

**Returns:** `boolean` - `true` if promoted successfully

### `demote(granter, grantee)`

Demotes a grantee from writer to reader.

**Parameters:**
- `granter` (PKR, required) - PKR demoting permission
- `grantee` (PKR, required) - PKR being demoted

**Returns:** `boolean` - `true` if demoted successfully

## Protected Messaging

### `sendProtected(message, options)`

Sends a protected message using the resource owner's PKR.

**Parameters:**
- `message` (Message, required) - Message to send
- `options` (object, optional) - Message options

**Returns:** `Promise` - Resolves when message is sent

**Note:** Uses `resourceOwnerPkr` (not `resourcePkr`) for sending.

**Example:**
```javascript
const message = new Message('target://operation', { data: 'value' });
await identity.sendProtected(message);
```

## Usage Examples

### Create Resource Identity

```javascript
import { createResourceIdentity } from './create-resource-identity.mycelia.js';

// Create resource principal with owner
const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
  name: 'owner-subsystem',
  instance: ownerSubsystem
});

const resourcePkr = registry.createPrincipal(PRINCIPAL_KINDS.RESOURCE, {
  name: 'my-resource',
  owner: ownerPkr,
  instance: resourceInstance
});

// Create resource identity
const resourceIdentity = createResourceIdentity(
  principals,
  resourcePkr,
  ownerPkr,
  kernel
);
```

### Check Owner Status

```javascript
const resourceIdentity = createResourceIdentity(
  principals,
  resourcePkr,
  ownerPkr,
  kernel
);

// Check if a PKR is the resource owner
if (resourceIdentity.isResourceOwner(ownerPkr)) {
  // Owner has full access
}

if (resourceIdentity.isResourceOwner(otherPkr)) {
  // Not the owner
}
```

### Use Permission Queries

```javascript
const resourceIdentity = createResourceIdentity(
  principals,
  resourcePkr,
  ownerPkr,
  kernel
);

// Owner always has permissions
if (resourceIdentity.canRead(ownerPkr)) {
  // Always true for owner
}

// Non-owner permissions depend on RWS
if (resourceIdentity.canRead(granteePkr)) {
  // True if RWS grants read permission
}
```

### Grant Permissions

```javascript
const resourceIdentity = createResourceIdentity(
  principals,
  resourcePkr,
  ownerPkr,
  kernel
);

// Owner can grant permissions
resourceIdentity.grantReader(ownerPkr, granteePkr);
resourceIdentity.grantWriter(ownerPkr, granteePkr);
```

### Use Permission Wrappers

```javascript
const resourceIdentity = createResourceIdentity(
  principals,
  resourcePkr,
  ownerPkr,
  kernel
);

// Wrap functions with permission checks
const readData = resourceIdentity.requireRead(() => {
  return resource.getData();
});

const updateData = resourceIdentity.requireWrite((data) => {
  resource.setData(data);
});
```

## Relationship to createIdentity

`createResourceIdentity` is similar to `createIdentity` but adds:
1. **Owner Check**: `isResourceOwner(pkr)` function
2. **Owner Privileges**: All permission queries check owner status first
3. **Resource Owner PKR**: Separate `resourceOwnerPkr` parameter
4. **Owner-based sendProtected**: Uses `resourceOwnerPkr` instead of `resourcePkr`

**Key Differences:**
- `createIdentity`: Uses owner PKR for all operations
- `createResourceIdentity`: Uses resource PKR for RWS, owner PKR for ownership checks and messaging

## Best Practices

1. **Always provide owner PKR** when creating resource identity
2. **Use `isResourceOwner()`** to check ownership before operations
3. **Grant permissions via RWS** for non-owner access
4. **Use `sendProtected()`** for secure messaging (uses owner PKR)
5. **Check permissions** before performing operations

## Related Documentation

- [createIdentity](./CREATE-IDENTITY.md) - Full identity wrapper (similar functionality)
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Creates resource identities
- [Resource](./RESOURCE.md) - Resource class representation
- [ReaderWriterSet](./READER-WRITER-SET.md) - Access control mechanism







