# ReaderWriterSet

## Overview

The **ReaderWriterSet** class provides fine-grained access control for resources in the Mycelia system. It implements a three-level permission model (read/write/grant) with a granter/grantee delegation system.

**Key Features:**
- **Three Permission Levels**: Read, Write, Grant
- **Granter/Grantee Model**: Permission delegation with validation
- **Kernel Privileges**: Kernel always has full access
- **Owner Permissions**: Owners have full access to their resources
- **Promote/Demote**: Upgrade/downgrade permissions
- **Cloning Support**: Duplicate RWS instances

## Permission Model

### Permission Levels

1. **Read**: View/access resources
2. **Write**: Modify resources
3. **Grant**: Delegate permissions to others

### Permission Hierarchy

- **Kernel**: Always has full access (read, write, grant)
- **Owner**: Has full access to their own resources
- **Writers**: Can read and write
- **Readers**: Can only read

## Constructor

### Signature

```javascript
new ReaderWriterSet({ pkr, principals })
```

### Parameters

#### `pkr` (PKR, required)

The owner's Public Key Record.

**Validation:**
- Must be a valid PKR with UUID
- Throws `Error` if missing

#### `principals` (PrincipalRegistry, required)

The PrincipalRegistry instance for PKR resolution.

**Validation:**
- Must be a PrincipalRegistry instance
- Throws `Error` if missing

**Example:**
```javascript
const rws = new ReaderWriterSet({
  pkr: ownerPkr,
  principals: registry
});
```

## Permission Management

### `addReader(granter, grantee)`

Grants read permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal granting permission
- `grantee` (PKR, required) - The principal receiving permission

**Returns:** `boolean` - `true` if successful, `false` if validation fails

**Example:**
```javascript
const success = rws.addReader(ownerPkr, readerPkr);
```

### `addWriter(granter, grantee)`

Grants write permission to a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal granting permission
- `grantee` (PKR, required) - The principal receiving permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
const success = rws.addWriter(ownerPkr, writerPkr);
```

### `removeReader(granter, grantee)`

Revokes read permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal revoking permission
- `grantee` (PKR, required) - The principal losing permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
const success = rws.removeReader(ownerPkr, readerPkr);
```

### `removeWriter(granter, grantee)`

Revokes write permission from a grantee.

**Parameters:**
- `granter` (PKR, required) - The principal revoking permission
- `grantee` (PKR, required) - The principal losing permission

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
const success = rws.removeWriter(ownerPkr, writerPkr);
```

### `promote(granter, grantee)`

Promotes a reader to writer.

**Parameters:**
- `granter` (PKR, required) - The principal granting promotion
- `grantee` (PKR, required) - The principal being promoted

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
const success = rws.promote(ownerPkr, readerPkr);
// Reader becomes writer
```

### `demote(granter, grantee)`

Demotes a writer to reader.

**Parameters:**
- `granter` (PKR, required) - The principal granting demotion
- `grantee` (PKR, required) - The principal being demoted

**Returns:** `boolean` - `true` if successful

**Example:**
```javascript
const success = rws.demote(ownerPkr, writerPkr);
// Writer becomes reader
```

### `clear()`

Clears all readers and writers.

**Example:**
```javascript
rws.clear();
```

## Permission Checks

### `isOwner(pkr)`

Checks if a PKR belongs to the owner.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if PKR is the owner

**Example:**
```javascript
if (rws.isOwner(pkr)) {
  // Full access
}
```

### `canRead(pkr)`

Checks if a PKR has read permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can read

**Permission Logic:**
- Kernel: Always `true`
- Owner: Always `true`
- Writers: `true`
- Readers: `true`
- Others: `false`

**Example:**
```javascript
if (rws.canRead(pkr)) {
  // Allow read operation
}
```

### `canWrite(pkr)`

Checks if a PKR has write permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can write

**Permission Logic:**
- Kernel: Always `true`
- Owner: Always `true`
- Writers: `true`
- Readers: `false`
- Others: `false`

**Example:**
```javascript
if (rws.canWrite(pkr)) {
  // Allow write operation
}
```

### `canGrant(pkr)`

Checks if a PKR has grant permission.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if can grant

**Permission Logic:**
- Kernel: Always `true`
- Owner: Always `true`
- Others: `false`

**Example:**
```javascript
if (rws.canGrant(pkr)) {
  // Allow permission delegation
}
```

## Introspection

### `hasReader(pkr)`

Checks if a PKR is in the readers set.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if is a reader

**Example:**
```javascript
if (rws.hasReader(pkr)) {
  // PKR has read permission
}
```

### `hasWriter(pkr)`

Checks if a PKR is in the writers set.

**Parameters:**
- `pkr` (PKR, required) - Public Key Record to check

**Returns:** `boolean` - `true` if is a writer

**Example:**
```javascript
if (rws.hasWriter(pkr)) {
  // PKR has write permission
}
```

### `readerCount()`

Returns the number of readers.

**Returns:** `number` - Count of readers

**Example:**
```javascript
const count = rws.readerCount();
```

### `writerCount()`

Returns the number of writers.

**Returns:** `number` - Count of writers

**Example:**
```javascript
const count = rws.writerCount();
```

## Utility Methods

### `clone()`

Creates a deep copy of the ReaderWriterSet.

**Returns:** `ReaderWriterSet` - Cloned instance

**Example:**
```javascript
const cloned = rws.clone();
```

### `toRecord()`

Converts the RWS to a serializable record object.

**Returns:** `object` - Record representation

**Example:**
```javascript
const record = rws.toRecord();
// {
//   uuid: "...",
//   owner: "...",
//   readers: [...],
//   writers: [...]
// }
```

### `toString()`

Returns a human-readable string representation.

**Returns:** `string` - Formatted string

**Example:**
```javascript
rws.toString(); // "[RWS uuid] readers=2 writers=1"
```

## Usage Examples

### Basic Permission Management

```javascript
const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });

// Grant read permission
rws.addReader(ownerPkr, readerPkr);

// Grant write permission
rws.addWriter(ownerPkr, writerPkr);

// Check permissions
if (rws.canRead(readerPkr)) {
  // Allow read
}

if (rws.canWrite(writerPkr)) {
  // Allow write
}
```

### Permission Promotion

```javascript
// Start as reader
rws.addReader(ownerPkr, userPkr);

// Promote to writer
rws.promote(ownerPkr, userPkr);

// Demote back to reader
rws.demote(ownerPkr, userPkr);
```

### Kernel Privileges

```javascript
const kernelPkr = registry.getKernelPkr();

// Kernel always has full access
rws.canRead(kernelPkr); // true
rws.canWrite(kernelPkr); // true
rws.canGrant(kernelPkr); // true
```

## Security Considerations

- **PKR Validation**: All operations validate PKR expiration and minter
- **Granter Verification**: Only authorized granters can grant permissions
- **Canonical Identity**: Uses stable identity across key rotations
- **Owner Protection**: Owners always have full access
- **Kernel Privileges**: Kernel has full access by design

## Best Practices

1. **Always validate permissions** before operations
2. **Use `canGrant()`** to check before granting permissions
3. **Check `isOwner()`** for owner-specific operations
4. **Use `promote()`/`demote()`** instead of remove/add for role changes
5. **Validate PKRs** are not expired before permission checks

## Related Documentation

- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Creates and manages RWS instances
- [createIdentity](./CREATE-IDENTITY.md) - Uses RWS for identity wrappers
- [Public Key Record](./PUBLIC-KEY-RECORD.md) - PKR validation

