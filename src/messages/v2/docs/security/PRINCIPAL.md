# Principal

## Overview

The **Principal** class represents an internal entity in the Mycelia system. It can represent a kernel, subsystem (topLevel or child), friend, or resource. Each Principal owns a UUID, kind, publicKey, and optional instance binding.

**Key Features:**
- **Automatic UUID Generation**: Uses `randomUUID()` from crypto
- **Lazy PKR Creation**: PKR created on first access and cached
- **Instance Binding**: Links to actual objects (kernel, subsystem, friend, resource)
- **Key Rotation**: Support for PKR refresh when keys expire
- **PRINCIPAL_KINDS Constants**: Type-safe kind identifiers

## PRINCIPAL_KINDS Constants

The `PRINCIPAL_KINDS` constant object provides type-safe identifiers for principal kinds:

```javascript
export const PRINCIPAL_KINDS = {
  KERNEL: 'kernel',
  TOP_LEVEL: 'topLevel',
  CHILD: 'child',
  FRIEND: 'friend',
  RESOURCE: 'resource',
};
```

**Usage:**
Always use these constants instead of string literals to prevent typos and ensure type safety.

## Constructor

### Signature

```javascript
new Principal({ name, kind, publicKey, metadata, instance, kernelId })
```

### Parameters

#### `kind` (string, required)

The principal kind. Should use `PRINCIPAL_KINDS` constants.

**Validation:**
- Must be a string
- Throws `TypeError` if invalid

**Example:**
```javascript
import { PRINCIPAL_KINDS } from './principal.mycelia.js';

new Principal({
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('publicKey:topLevel')
});
```

#### `publicKey` (symbol, required)

The public key symbol for the principal.

**Validation:**
- Must be a symbol
- Throws `TypeError` if invalid

#### `name` (string, optional)

Optional human-readable name for the principal.

**Default:** `null`

#### `metadata` (object, optional)

Optional metadata object for storing additional information.

**Default:** `{}`

#### `instance` (object, optional)

Optional instance object to bind to the principal. Can be a kernel, subsystem, friend, or resource.

**Note:** If provided, `attachInstance()` is called automatically during construction.

#### `kernelId` (symbol, optional)

The kernel key that minted this principal. Used for PKR minter verification.

**Default:** `null`

**Validation:**
- Must be a symbol if provided
- Throws `TypeError` if invalid type

## Properties

### `uuid` (getter)

Returns the automatically generated UUID string.

```javascript
const principal = new Principal({ ... });
console.log(principal.uuid); // "123e4567-e89b-12d3-a456-426614174000"
```

### `name` (getter)

Returns the name string or `null`.

```javascript
const principal = new Principal({ name: 'my-subsystem', ... });
console.log(principal.name); // "my-subsystem"
```

### `kind` (getter)

Returns the principal kind string.

```javascript
const principal = new Principal({ kind: PRINCIPAL_KINDS.TOP_LEVEL, ... });
console.log(principal.kind); // "topLevel"
```

### `publicKey` (getter)

Returns the public key symbol.

```javascript
const principal = new Principal({ publicKey: Symbol('key'), ... });
console.log(principal.publicKey); // Symbol('key')
```

### `metadata` (getter)

Returns the metadata object.

```javascript
const principal = new Principal({ metadata: { version: '1.0' }, ... });
console.log(principal.metadata); // { version: '1.0' }
```

### `createdAt` (getter)

Returns the creation timestamp.

```javascript
const principal = new Principal({ ... });
console.log(principal.createdAt); // Date object
```

### `instance` (getter)

Returns the bound instance object or `null`.

```javascript
const subsystem = { ... };
const principal = new Principal({ instance: subsystem, ... });
console.log(principal.instance); // subsystem object
```

### `pkr` (getter)

Returns the PKR (Public Key Record). Created lazily on first access and cached.

```javascript
const principal = new Principal({ ... });
const pkr = principal.pkr; // PKR created on first access
const pkr2 = principal.pkr; // Returns cached PKR
```

## Methods

### `attachInstance(obj)`

Attaches an instance object to the principal. Can only be called once.

**Parameters:**
- `obj` (object, required) - The instance to attach

**Throws:**
- `Error` if instance already attached
- `TypeError` if obj is not an object
- `Error` if principal kind is invalid for instance attachment

**Valid Kinds for Instance Attachment:**
- `PRINCIPAL_KINDS.KERNEL`
- `PRINCIPAL_KINDS.TOP_LEVEL`
- `PRINCIPAL_KINDS.CHILD`
- `PRINCIPAL_KINDS.FRIEND`
- `PRINCIPAL_KINDS.RESOURCE`

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', { ... });
const principal = new Principal({
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('key'),
  instance: subsystem // Automatically attached
});
```

### `refresh(newPublicKey)`

Refreshes the Principal's PKR when its previous one expires. Updates the public key and creates a new PKR.

**Parameters:**
- `newPublicKey` (symbol, required) - The newly minted public key

**Returns:** `PKR` - New PKR instance

**Throws:** `TypeError` if newPublicKey is not a symbol

**Example:**
```javascript
const newKey = Symbol('publicKey:topLevel:refresh');
const newPKR = principal.refresh(newKey);
```

### `rename(newName)`

Updates the principal's name.

**Parameters:**
- `newName` (string, optional) - New name (can be null to clear)

**Example:**
```javascript
principal.rename('new-name');
principal.rename(null); // Clear name
```

### `toRecord()`

Converts the principal to a serializable record object.

**Returns:** `object` - Record representation

**Example:**
```javascript
const record = principal.toRecord();
// {
//   uuid: "...",
//   name: "...",
//   kind: "...",
//   publicKey: "Symbol(...)",
//   createdAt: "2024-01-01T00:00:00.000Z"
// }
```

### `equals(other)`

Compares two principals for equality based on UUID.

**Parameters:**
- `other` (Principal) - The principal to compare

**Returns:** `boolean` - `true` if UUIDs match

**Example:**
```javascript
const principal1 = new Principal({ ... });
const principal2 = new Principal({ ... });
principal1.equals(principal2); // false (different UUIDs)
```

### `toString()`

Returns a human-readable string representation.

**Returns:** `string` - Formatted string

**Example:**
```javascript
const principal = new Principal({ kind: 'topLevel', name: 'my-subsystem', ... });
principal.toString(); // "[Principal topLevel:my-subsystem]"
```

## PKR (Public Key Record)

The Principal lazily creates a PKR on first access via the `pkr` getter. The PKR is cached and reused until `refresh()` is called.

**PKR Creation:**
- Created with the principal's UUID, name, kind, and publicKey
- Uses `kernelId` as the minter
- Default expiration is 1 week (can be customized via PKR constructor if needed)

**PKR Refresh:**
When `refresh()` is called:
- Public key is updated
- PKR cache is reset
- New PKR is created with the new public key

## Usage Examples

### Basic Principal Creation

```javascript
import { Principal, PRINCIPAL_KINDS } from './principal.mycelia.js';

const principal = new Principal({
  name: 'my-subsystem',
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('publicKey:topLevel'),
  metadata: { version: '1.0' },
  kernelId: kernelKey
});
```

### Principal with Instance

```javascript
const subsystem = new BaseSubsystem('server', { ... });
const principal = new Principal({
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('publicKey:topLevel'),
  instance: subsystem // Automatically attached
});
```

### PKR Access

```javascript
const principal = new Principal({ ... });

// PKR created on first access
const pkr = principal.pkr;

// Subsequent accesses return cached PKR
const pkr2 = principal.pkr; // Same instance
```

### Key Rotation

```javascript
const principal = new Principal({ ... });
const oldPKR = principal.pkr;

// ... PKR expires ...

const newKey = Symbol('publicKey:topLevel:refresh');
const newPKR = principal.refresh(newKey);
```

## Best Practices

1. **Use PRINCIPAL_KINDS constants** instead of string literals
2. **Attach instances during construction** for convenience
3. **Access PKR via getter** to benefit from lazy creation
4. **Use `equals()`** for principal comparison
5. **Call `refresh()`** when PKR expires to rotate keys

## Related Documentation

- [PRINCIPAL_KINDS](./PRINCIPAL.md#principal_kinds-constants) - Principal kind constants
- [Public Key Record](./PUBLIC-KEY-RECORD.md) - PKR class
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Principal management







