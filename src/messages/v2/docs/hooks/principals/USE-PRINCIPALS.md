# usePrincipals Hook

## Overview

The **usePrincipals** hook provides principal registry functionality to subsystems. It wraps PrincipalRegistry and exposes principal management methods for creating, managing, and resolving principals and their identities.

**Key Features:**
- **Principal Management**: Create and register principals
- **Key Minting**: Automatic keypair generation
- **Identity Creation**: Create identity wrappers for owners and friends
- **PKR Resolution**: Resolve PKRs to private keys
- **Access Control**: Create ReaderWriterSet instances
- **PKR Refresh**: Rotate keys on expiration
- **Registry Access**: Direct access to PrincipalRegistry instance via `registry` getter

## Hook Metadata

```javascript
{
  kind: 'principals',
  overwrite: false,
  required: [],
  attach: false,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'principals'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing principals facet
- **`required`**: `[]` - No facet dependencies (requires kernel in config)
- **`attach`**: `false` - Facet is not automatically attached to the subsystem (accessed via `find()`)
- **`source`**: `import.meta.url` - Source file location for debugging

**Note:** The hook requires `ctx.config.principals.kernel` to be set. The facet is not attached, so it must be accessed via `subsystem.find('principals')`.

## Configuration

### Required Configuration

The hook requires `ctx.config.principals.kernel` to exist:

```javascript
const subsystem = useBase('my-subsystem', {
  ms: messageSystem,
  config: {
    principals: {
      kernel: messageSystem // Required
    }
  }
})
  .use(usePrincipals)
  .build();
```

**Validation:**
- Throws `Error` if `ctx.config.principals.kernel` is missing

## Usage

### Basic Setup

```javascript
import { useBase } from './use-base.mycelia.js';
import { usePrincipals } from './hooks/principals/use-principals.mycelia.js';

const subsystem = useBase('server', {
  ms: messageSystem,
  config: {
    principals: {
      kernel: messageSystem
    }
  }
})
  .use(usePrincipals)
  .build();

// Access principals facet
const principals = subsystem.find('principals');
```

## Exposed Methods

### `mint(kind)`

Mints a keypair for a principal kind.

**Parameters:**
- `kind` (string, optional) - Principal kind (default: `'resource'`)

**Returns:** `object` - Object with `publicKey` and optionally `privateKey`

**Example:**
```javascript
const { publicKey, privateKey } = principals.mint('topLevel');
```

### `createPrincipal(kind, opts)`

Creates and registers a principal.

**Parameters:**
- `kind` (string, optional) - Principal kind (default: `'topLevel'`)
- `opts` (object, optional) - Principal options
  - `name` (string, optional) - Principal name
  - `metadata` (object, optional) - Metadata object
  - `owner` (PKR, optional) - Owner PKR
  - `instance` (object, optional) - Instance to bind

**Returns:** `PKR` - Public Key Record of the created principal

**Example:**
```javascript
const pkr = principals.createPrincipal('topLevel', {
  name: 'my-subsystem',
  instance: subsystem
});
```

### `resolvePKR(pkr)`

Resolves a PKR to its private key.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record

**Returns:** `symbol|undefined` - Private key or undefined if not found

**Example:**
```javascript
const privateKey = principals.resolvePKR(pkr);
```

### `createRWS(ownerPkr)`

Creates a ReaderWriterSet for an owner PKR.

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `ReaderWriterSet` - Access control set

**Example:**
```javascript
const rws = principals.createRWS(ownerPkr);
rws.addReader(granter, grantee);
```

### `createIdentity(ownerPkr)`

Creates a full identity wrapper for an owner PKR.

**Parameters:**
- `ownerPkr` (PKR, required) - Owner's Public Key Record

**Returns:** `object` - Identity object with permission methods

**Example:**
```javascript
const identity = principals.createIdentity(ownerPkr);
identity.canRead(pkr);
await identity.sendProtected(message);
```

### `createFriendIdentity(friendPkr)`

Creates a friend-specific identity wrapper.

**Parameters:**
- `friendPkr` (PKR, required) - Friend's Public Key Record

**Returns:** `object` - Identity object with permission methods

**Example:**
```javascript
const friendIdentity = principals.createFriendIdentity(friendPkr);
await friendIdentity.sendProtected(message);
```


### `isKernel(pkr)`

Checks if a PKR belongs to the kernel.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record

**Returns:** `boolean` - `true` if PKR belongs to kernel

**Example:**
```javascript
if (principals.isKernel(pkr)) {
  // Kernel has full privileges
}
```

### `get(uuid)`

Gets a principal by UUID.

**Parameters:**
- `uuid` (string, required) - Principal UUID

**Returns:** `Principal|undefined` - Principal or undefined if not found

**Example:**
```javascript
const principal = principals.get('123e4567-e89b-12d3-a456-426614174000');
```

### `has(id)`

Checks if a principal exists by UUID, name, or key.

**Parameters:**
- `id` (string|symbol) - UUID, name, public key, or private key

**Returns:** `boolean` - `true` if principal exists

**Example:**
```javascript
principals.has('my-subsystem'); // By name
principals.has(publicKeySymbol); // By public key
```

### `refreshPrincipal(principalOrPublicKey)`

Refreshes a principal's PKR (rotates keys on expiration).

**Parameters:**
- `principalOrPublicKey` (Principal|symbol) - Principal instance or public key

**Returns:** `PKR` - New Public Key Record

**Example:**
```javascript
const newPKR = principals.refreshPrincipal(principal);
// instance.identity is automatically updated
```

### `registry` (getter)

Exposes the PrincipalRegistry instance for direct access. This allows you to use methods not directly exposed by the hook, such as `list()`, `size`, and iteration.

**Returns:** `PrincipalRegistry` - The underlying PrincipalRegistry instance

**Example:**
```javascript
const registry = principals.registry;

// Access methods not directly exposed by the hook
const allPrincipals = registry.list();
const count = registry.size;

// Iterate over all principals
for (const principal of registry) {
  console.log(principal.name);
}
```

## Usage Examples

### Create Subsystem Principal

```javascript
const subsystem = useBase('server', {
  ms: messageSystem,
  config: {
    principals: {
      kernel: messageSystem
    }
  }
})
  .use(usePrincipals)
  .build();

const principals = subsystem.find('principals');

// Create principal for this subsystem
const pkr = principals.createPrincipal('topLevel', {
  name: 'server',
  instance: subsystem
});

// Get identity wrapper
const identity = principals.createIdentity(pkr);
```

### Create Friend Principal

```javascript
const principals = subsystem.find('principals');

const friendPkr = principals.createPrincipal('friend', {
  name: 'Anna',
  instance: friendInstance
});

const friendIdentity = principals.createFriendIdentity(friendPkr);
```

### Create Resource Principal

```javascript
const principals = subsystem.find('principals');

// Create owner principal first
const ownerPkr = principals.createPrincipal('topLevel', {
  name: 'owner-subsystem',
  instance: ownerSubsystem
});

// Create resource principal with owner
const resourcePkr = principals.createPrincipal('resource', {
  name: 'my-resource',
  owner: ownerPkr,
  instance: resourceInstance
});

// Create resource identity (using standalone function)
import { createResourceIdentity } from '../../models/security/create-resource-identity.mycelia.js';
const kernel = subsystem.messageSystem?.kernel || subsystem.messageSystem;
const resourceIdentity = createResourceIdentity(principals.registry, resourcePkr, ownerPkr, kernel);
```

### PKR Refresh

```javascript
const principals = subsystem.find('principals');
const principal = principals.get(uuid);

// Check if PKR is expired
if (principal.pkr.isExpired()) {
  // Refresh automatically updates instance.identity
  const newPKR = principals.refreshPrincipal(principal);
}
```

## Best Practices

1. **Configure kernel** in `ctx.config.principals.kernel`
2. **Use PRINCIPAL_KINDS constants** for kind parameters
3. **Attach instances** during principal creation
4. **Use `refreshPrincipal()`** when PKRs expire
5. **Access via `find('principals')`** to get the facet
6. **Use `registry` getter** for direct access to PrincipalRegistry methods (e.g., `list()`, `size`, iteration)
7. **Use standalone `createResourceIdentity`** function for resource identities (not a hook method)

## Related Documentation

- [Principal Registry](../security/PRINCIPAL-REGISTRY.md) - Underlying registry implementation
- [Principal](../security/PRINCIPAL.md) - Principal class
- [Public Key Record](../security/PUBLIC-KEY-RECORD.md) - PKR class
- [createIdentity](../security/CREATE-IDENTITY.md) - Identity wrapper factory
- [createResourceIdentity](../security/CREATE-RESOURCE-IDENTITY.md) - Resource identity wrapper factory

