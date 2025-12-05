# Principal Registry

## Overview

The **PrincipalRegistry** class is the central manager for all Principals and their identity mappings in the Mycelia system. It automatically mints keypairs when creating Principals and provides utilities for identity creation and access control.

**Key Features:**
- **Automatic Key Minting**: Generates keypairs for principals
- **Multiple Lookup Indices**: UUID, name, public key, private key
- **PKR Refresh/Rotation**: Handles expired PKRs automatically
- **Identity Factories**: `createIdentity()` and `createFriendIdentity()`
- **RWS Caching**: Reuses ReaderWriterSet instances
- **Refresh Locks**: Prevents concurrent refresh operations
- **Automatic Name Derivation**: Derives principal name from instance if not provided

## Constructor

### Signature

```javascript
new PrincipalRegistry({ kernel })
```

### Parameters

#### `kernel` (object, optional)

The kernel instance. If provided:
1. Creates the kernel principal automatically
2. Attaches the kernel instance
3. Creates a full identity wrapper and attaches it to `kernel.identity`

**Example:**
```javascript
const registry = new PrincipalRegistry({ kernel: messageSystem });
// Kernel principal created automatically
// kernel.identity is set with full identity wrapper
```

## Key Minting

### `mint(kind)`

Mints a keypair for a principal kind.

**Parameters:**
- `kind` (string, optional) - Principal kind (default: `PRINCIPAL_KINDS.RESOURCE`)

**Returns:** `object` - Object with `publicKey` and optionally `privateKey`

**Private Keys:**
- Generated for: `kernel`, `topLevel`, `friend`
- Not generated for: `child`, `resource`

**Example:**
```javascript
const { publicKey, privateKey } = registry.mint(PRINCIPAL_KINDS.TOP_LEVEL);
const { publicKey } = registry.mint(PRINCIPAL_KINDS.RESOURCE); // No privateKey
```

## Principal Management

### `createPrincipal(kind, opts)`

Creates and registers a principal.

**Parameters:**
- `kind` (string, optional) - Principal kind (default: `PRINCIPAL_KINDS.TOP_LEVEL`)
  - Valid kinds: `KERNEL`, `FRIEND`, `TOP_LEVEL`, `RESOURCE`, `CHILD`
- `opts` (object, optional) - Principal options
  - `name` (string, optional) - Principal name. If not provided and `instance` has `getNameString()` method, name is derived from instance
  - `metadata` (object, optional) - Metadata object
  - `owner` (PKR, optional) - Owner PKR (for child/resource principals)
  - `instance` (object, optional) - Instance to bind

**Returns:** `PKR` - Public Key Record of the created principal

**Throws:**
- `TypeError` - If kind is invalid
- `Error` - If trying to create a second kernel principal

**Name Derivation:**
- If `name` is not provided and `instance` has a `getNameString()` method, the name is automatically derived from `instance.getNameString()`

**Example:**
```javascript
// Create top-level subsystem principal
const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
  name: 'my-subsystem',
  instance: subsystem
});

// Create principal with auto-derived name
const pkr2 = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
  instance: subsystem  // Name derived from subsystem.getNameString()
});

// Create child principal
const childPkr = registry.createPrincipal(PRINCIPAL_KINDS.CHILD, {
  name: 'child-subsystem',
  owner: parentPkr,
  instance: childSubsystem
});
```

### `refreshPrincipal(principalOrPublicKey)`

Refreshes a principal's PKR when it expires (rotates keys).

**Parameters:**
- `principalOrPublicKey` (Principal|symbol) - Principal instance or public key symbol

**Returns:** `PKR` - New Public Key Record (or existing PKR if not expired)

**Throws:**
- `Error` - If public key is unknown or principal is not registered
- `TypeError` - If parameter is not a Principal or symbol

**Features:**
- Refresh locks prevent concurrent refreshes (returns existing PKR if refresh is in progress)
- Updates public→private key mapping
- Creates new identity wrapper and attaches to instance if it exists:
  - **Friends**: Creates friend identity via `createFriendIdentity()`
  - **Resources**: Creates identity and attaches to `resourceInstance.instance.identity`
  - **Others**: Creates identity via `createIdentity()` and attaches to `instance.identity`
- Returns existing PKR if not expired or if public key has already changed

**Example:**
```javascript
// Refresh by principal
const newPKR = registry.refreshPrincipal(principal);

// Refresh by public key
const newPKR = registry.refreshPrincipal(publicKeySymbol);
```

### `resolvePKR(pkr)`

Resolves a PKR to its private key.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record

**Returns:** `symbol|undefined` - Private key or undefined if not found

**Example:**
```javascript
const privateKey = registry.resolvePKR(pkr);
if (privateKey) {
  // PKR resolved successfully
}
```

## Access Control

### `createRWS(ownerPkr)`

Creates a ReaderWriterSet for an owner PKR. Caches instances for reuse.

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `ReaderWriterSet` - Access control set

**Example:**
```javascript
const rws = registry.createRWS(ownerPkr);
rws.addReader(granter, grantee);
```

### `createIdentity(ownerPkr)`

Creates a full identity wrapper for an owner PKR.

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `object` - Identity object with permission methods

**Throws:**
- `Error` - If PKR is invalid or unknown
- `Error` - If kernel reference is not set or missing `sendProtected` method

**Requirements:**
- Kernel must be set in constructor
- Kernel must have `sendProtected` method

**Example:**
```javascript
const identity = registry.createIdentity(ownerPkr);
identity.canRead(pkr);
identity.grantReader(granter, grantee);
await identity.sendProtected(message);
```

### `createFriendIdentity(friendPkr)`

Creates a friend-specific identity wrapper.

**Parameters:**
- `friendPkr` (PKR, required) - Friend's Public Key Record

**Returns:** `object` - Identity object with permission methods

**Throws:**
- `Error` - If PKR is invalid or unknown
- `Error` - If principal is not found or not a friend principal
- `Error` - If kernel reference is not set or missing `sendProtected` method

**Requirements:**
- Kernel must be set in constructor
- Kernel must have `sendProtected` method

**Example:**
```javascript
const friendIdentity = registry.createFriendIdentity(friendPkr);
await friendIdentity.sendProtected(message);
```

**Note:** `createResourceIdentity` is a standalone function, not a method on PrincipalRegistry. See [createResourceIdentity](./CREATE-RESOURCE-IDENTITY.md) for details.

## Lookup Methods

### `get(uuid)`

Gets a principal by UUID.

**Parameters:**
- `uuid` (string, required) - Principal UUID

**Returns:** `Principal|undefined` - Principal or undefined if not found

**Example:**
```javascript
const principal = registry.get('123e4567-e89b-12d3-a456-426614174000');
```

### `has(id)`

Checks if a principal exists by UUID, name, or key.

**Parameters:**
- `id` (string|symbol) - UUID, name, public key, or private key

**Returns:** `boolean` - `true` if principal exists

**Example:**
```javascript
registry.has('123e4567-e89b-12d3-a456-426614174000'); // By UUID
registry.has('my-subsystem'); // By name
registry.has(publicKeySymbol); // By public key
```

### `delete(uuid)`

Deletes a principal and cleans up all related mappings.

**Parameters:**
- `uuid` (string, required) - Principal UUID

**Returns:** `Principal|null` - Deleted principal or null if not found

**Example:**
```javascript
const deleted = registry.delete(uuid);
```

### `clear()`

Clears all principals and related data.

**Example:**
```javascript
registry.clear();
```

## Utility Methods

### `size` (getter)

Returns the number of registered principals.

```javascript
const count = registry.size;
```

### `kernelId` (getter)

Returns the kernel's private key.

```javascript
const kernelKey = registry.kernelId;
```

### `isKernel(pkr)`

Checks if a PKR belongs to the kernel.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record

**Returns:** `boolean` - `true` if PKR belongs to kernel

**Example:**
```javascript
if (registry.isKernel(pkr)) {
  // Kernel has full privileges
}
```

### `list()`

Returns an array of all registered principals.

**Returns:** `Array<Principal>` - Array of all principals

**Example:**
```javascript
const allPrincipals = registry.list();
```

### `[Symbol.iterator]()`

Allows iteration over all principals.

**Example:**
```javascript
for (const principal of registry) {
  console.log(principal.name);
}
```

## Internal Structure

The registry maintains multiple lookup indices:

- **byUuid**: `Map<string, Principal>` - Primary lookup by UUID
- **byName**: `Map<string, string>` - Name to UUID mapping
- **byPublicKey**: `Map<symbol, string>` - Public key to UUID mapping
- **byPrivateKey**: `Map<symbol, string>` - Private key to UUID mapping
- **publicToPrivate**: `Map<symbol, symbol>` - Public to private key mapping
- **rwsByUuid**: `Map<string, ReaderWriterSet>` - RWS cache by UUID
- **refreshLocks**: `Map<string, boolean>` - Refresh operation locks

## Usage Examples

### Basic Setup

```javascript
import { PrincipalRegistry } from './principal-registry.mycelia.js';

const registry = new PrincipalRegistry({ kernel: messageSystem });
// Kernel principal and identity created automatically
```

### Create Subsystem Principal

```javascript
const subsystemPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
  name: 'server',
  instance: serverSubsystem
});

// Get identity wrapper
const identity = registry.createIdentity(subsystemPkr);
```

### Create Friend Principal

```javascript
const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
  name: 'Anna',
  instance: friendInstance
});

// Get friend identity
const friendIdentity = registry.createFriendIdentity(friendPkr);
```

### Create Resource Principal

```javascript
// Create owner principal first
const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, {
  name: 'owner-subsystem',
  instance: ownerSubsystem
});

// Create resource principal with owner
const resourcePkr = registry.createPrincipal(PRINCIPAL_KINDS.RESOURCE, {
  name: 'my-resource',
  owner: ownerPkr,
  instance: resourceInstance
});

// Get resource identity (using standalone function)
import { createResourceIdentity } from './create-resource-identity.mycelia.js';
const resourceIdentity = createResourceIdentity(registry, resourcePkr, ownerPkr, kernel);
```

### PKR Refresh

```javascript
// Check if PKR is expired
if (pkr.isExpired()) {
  // Refresh automatically creates new identity wrapper
  const newPKR = registry.refreshPrincipal(principal);
  // instance.identity is automatically updated
}
```

## Best Practices

1. **Use PRINCIPAL_KINDS constants** for kind parameters
2. **Attach instances during creation** for automatic binding
3. **Use `refreshPrincipal()`** when PKRs expire
4. **Cache identity wrappers** - they're automatically created on refresh
5. **Use `has()` before `get()`** if you need to check existence

## Related Documentation

- [Principal](./PRINCIPAL.md) - Principal class
- [Public Key Record](./PUBLIC-KEY-RECORD.md) - PKR class
- [ReaderWriterSet](./READER-WRITER-SET.md) - Access control
- [createIdentity](./CREATE-IDENTITY.md) - Identity wrapper factory
- [createFriendIdentity](./CREATE-FRIEND-IDENTITY.md) - Friend identity wrapper factory
- [createResourceIdentity](./CREATE-RESOURCE-IDENTITY.md) - Resource identity wrapper factory (standalone function)

