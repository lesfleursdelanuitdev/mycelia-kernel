# Public Key Record (PKR)

## Overview

The **PKR (Public Key Record)** class represents an immutable, externally shareable identity reference. It wraps a Principal's UUID, name, kind, and publicKey symbol for external use, with automatic expiration support.

**Key Features:**
- **Immutable**: Frozen after construction, cannot be modified
- **Configurable Expiration**: Human-readable time strings ("3 hours", "one week")
- **Minter Verification**: Validates the kernel that created it
- **Serialization**: JSON and string conversion support

## What is a PKR?

A PKR is a **shareable identity reference** that can be safely passed between systems or stored externally. It contains:

- **UUID**: Unique identifier for the principal
- **Name**: Optional human-readable name
- **Kind**: Principal kind (kernel, topLevel, child, friend, resource)
- **Public Key**: Symbol representing the public key
- **Minter**: Private reference to the kernel that created it
- **Expiration**: Timestamp when the PKR expires

**Important**: PKRs are **immutable** and **expire automatically** to ensure security.

## Constructor

### Signature

```javascript
new PKR({ uuid, name, kind, publicKey, minter, expiration })
```

### Parameters

#### `uuid` (string, required)

The unique identifier for the principal.

**Validation:**
- Must be a non-empty string
- Throws `TypeError` if invalid

#### `name` (string, optional)

Optional human-readable name for the principal.

**Default:** `null`

#### `kind` (string, required)

The principal kind identifier. Should use `PRINCIPAL_KINDS` constants.

**Validation:**
- Must be a string
- Throws `TypeError` if invalid

**Example:**
```javascript
import { PRINCIPAL_KINDS } from './principal.mycelia.js';

new PKR({
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('publicKey:topLevel')
});
```

#### `publicKey` (symbol, required)

The public key symbol for the principal.

**Validation:**
- Must be a symbol
- Throws `TypeError` if invalid

#### `minter` (symbol, optional)

The kernel key that created this PKR. Used for verification.

**Default:** `null`

**Validation:**
- Must be a symbol if provided
- Throws `TypeError` if invalid type

#### `expiration` (string, optional)

Expiration time as a human-readable string. Supports:
- Hours: `"3 hours"`, `"three hours"`, `"1 hour"`
- Days: `"three days"`, `"2 days"`, `"one day"`
- Weeks: `"one week"`, `"2 weeks"`, `"three weeks"`

Supports both numeric and word forms (one through ten).

**Default:** `"1 week"`

**Examples:**
```javascript
new PKR({ ..., expiration: '3 hours' });
new PKR({ ..., expiration: 'three days' });
new PKR({ ..., expiration: 'one week' });
```

## Properties

### `uuid` (getter)

Returns the UUID string.

```javascript
const pkr = new PKR({ ... });
console.log(pkr.uuid); // "123e4567-e89b-12d3-a456-426614174000"
```

### `name` (getter)

Returns the name string or `null`.

```javascript
const pkr = new PKR({ name: 'my-subsystem', ... });
console.log(pkr.name); // "my-subsystem"
```

### `kind` (getter)

Returns the principal kind string.

```javascript
const pkr = new PKR({ kind: 'topLevel', ... });
console.log(pkr.kind); // "topLevel"
```

### `publicKey` (getter)

Returns the public key symbol.

```javascript
const pkr = new PKR({ publicKey: Symbol('key'), ... });
console.log(pkr.publicKey); // Symbol('key')
```

## Methods

### `isMinter(key)`

Verifies if the given key is the minter (kernel) that created this PKR.

**Parameters:**
- `key` (symbol, required) - The kernel key to verify

**Returns:** `boolean` - `true` if the key is the minter

**Throws:** `TypeError` if key is not a symbol

**Example:**
```javascript
const kernelKey = Symbol('kernel-key');
const pkr = new PKR({ ..., minter: kernelKey });

pkr.isMinter(kernelKey); // true
pkr.isMinter(Symbol('other-key')); // false
```

### `isExpired()`

Checks if the PKR has expired based on its configured expiration time.

**Returns:** `boolean` - `true` if expired, `false` otherwise

**Example:**
```javascript
const pkr = new PKR({ ..., expiration: '1 hour' });
// ... wait 2 hours ...
pkr.isExpired(); // true
```

### `isValid(key)`

Combined validity check: verifies the PKR is minted by the given key and not expired.

**Parameters:**
- `key` (symbol, required) - The kernel key to verify

**Returns:** `boolean` - `true` if valid (minted by key and not expired)

**Example:**
```javascript
const kernelKey = Symbol('kernel-key');
const pkr = new PKR({ ..., minter: kernelKey, expiration: '1 week' });

pkr.isValid(kernelKey); // true (if not expired)
```

## Serialization

### `toJSON()`

Converts the PKR to a JSON-serializable object.

**Returns:** `object` - JSON representation

**Example:**
```javascript
const pkr = new PKR({ ... });
const json = pkr.toJSON();
// {
//   uuid: "...",
//   name: "...",
//   kind: "...",
//   publicKey: "Symbol(...)",
//   expiresAt: "2024-01-01T00:00:00.000Z"
// }
```

### `toString()`

Returns a human-readable string representation.

**Returns:** `string` - Formatted string

**Example:**
```javascript
const pkr = new PKR({ kind: 'topLevel', name: 'my-subsystem', ... });
pkr.toString(); // "[PKR topLevel:my-subsystem]"
```

### `equals(other)`

Compares two PKRs for equality based on UUID.

**Parameters:**
- `other` (PKR) - The PKR to compare

**Returns:** `boolean` - `true` if UUIDs match

**Example:**
```javascript
const pkr1 = new PKR({ uuid: '123', ... });
const pkr2 = new PKR({ uuid: '123', ... });
pkr1.equals(pkr2); // true
```

## Expiration Parsing

The PKR constructor includes a `parseExpiration()` function that converts human-readable time strings to milliseconds.

**Supported Formats:**
- Hours: `"1 hour"`, `"3 hours"`, `"three hours"`, `"1 hr"`, `"2 hrs"`
- Days: `"1 day"`, `"three days"`, `"2 days"`
- Weeks: `"1 week"`, `"three weeks"`, `"2 wks"`

**Number Forms:**
- Numeric: `"1"`, `"2"`, `"3"`, etc.
- Words: `"one"`, `"two"`, `"three"`, ... `"ten"`

**Default:** If no pattern matches or expiration is invalid, defaults to 1 week.

## Usage Examples

### Basic PKR Creation

```javascript
import { PKR } from './public-key-record.mycelia.js';
import { PRINCIPAL_KINDS } from './principal.mycelia.js';

const pkr = new PKR({
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  name: 'my-subsystem',
  kind: PRINCIPAL_KINDS.TOP_LEVEL,
  publicKey: Symbol('publicKey:topLevel'),
  minter: kernelKey,
  expiration: '1 week'
});
```

### Custom Expiration

```javascript
// Short-lived PKR (3 hours)
const shortPkr = new PKR({
  ...,
  expiration: '3 hours'
});

// Long-lived PKR (three weeks)
const longPkr = new PKR({
  ...,
  expiration: 'three weeks'
});
```

### Validity Checking

```javascript
const kernelKey = Symbol('kernel-key');
const pkr = new PKR({ ..., minter: kernelKey });

// Check if PKR is valid (not expired and minted by kernel)
if (pkr.isValid(kernelKey)) {
  // Use PKR safely
} else {
  // PKR is expired or invalid
}
```

### Serialization

```javascript
const pkr = new PKR({ ... });

// JSON serialization
const json = JSON.stringify(pkr.toJSON());

// String representation
console.log(pkr.toString()); // "[PKR topLevel:my-subsystem]"
```

## Best Practices

1. **Use PRINCIPAL_KINDS constants** instead of string literals for kind
2. **Set appropriate expiration** based on use case (shorter for sensitive operations)
3. **Always validate PKRs** before use with `isValid()`
4. **Check expiration** before operations with `isExpired()`
5. **Use `equals()`** for PKR comparison, not direct object comparison

## Security Considerations

- **Immutable**: PKRs cannot be modified after creation, ensuring integrity
- **Expiration**: Automatic expiration prevents long-lived identity references
- **Minter Verification**: Validates the source of the PKR
- **Private Fields**: Sensitive data (minter, expiration timestamp) are private

## Related Documentation

- [Principal](./PRINCIPAL.md) - Creates PKRs internally
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Manages PKR lifecycle
- [createIdentity](./CREATE-IDENTITY.md) - Uses PKRs for identity wrappers

