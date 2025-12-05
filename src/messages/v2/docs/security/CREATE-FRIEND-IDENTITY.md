# createFriendIdentity

## Overview

The **createFriendIdentity** function creates an identity context specifically for friend principals. It validates that the PKR belongs to a friend principal before creating the identity wrapper.

**Key Features:**
- **Friend Validation**: Ensures PKR belongs to a friend principal
- **Delegates to createIdentity**: Reuses full identity functionality
- **PKR Validation**: Validates PKR is valid and not expired
- **Kernel Verification**: Ensures kernel reference is valid

## Function Signature

```javascript
createFriendIdentity(principals, friendPkr, kernel)
```

### Parameters

#### `principals` (PrincipalRegistry, required)

The PrincipalRegistry instance with `resolvePKR` and `get` methods.

**Validation:**
- Must have `resolvePKR` method
- Must have `get` method
- Throws `Error` if invalid

#### `friendPkr` (PKR, required)

The friend's Public Key Record.

**Validation:**
- Must be a valid PKR
- Must belong to a friend principal
- Throws `Error` if invalid, expired, unknown, or not a friend

#### `kernel` (object, required)

The kernel instance with `sendProtected` method.

**Validation:**
- Must have `sendProtected` method
- Throws `Error` if invalid

### Returns

**Object** - Identity object with the same interface as `createIdentity`:
- `pkr`: Friend PKR
- `canRead`, `canWrite`, `canGrant`: Permission query functions
- `requireRead`, `requireWrite`, `requireGrant`: Permission wrappers
- `requireAuth`: Generic auth wrapper
- `grantReader`, `grantWriter`, `revokeReader`, `revokeWriter`: Permission management
- `promote`, `demote`: Permission promotion/demotion
- `sendProtected`: Protected messaging method

### Throws

- `Error` if PKR is invalid, expired, or unknown
- `Error` if PKR doesn't belong to a friend principal
- `Error` if kernel reference is missing or invalid

## Usage

### Basic Friend Identity Creation

```javascript
import { createFriendIdentity } from './create-friend-identity.mycelia.js';

// Create friend identity (validates friend principal)
const friendIdentity = createFriendIdentity(principals, friendPkr, kernel);

// Use identity methods
if (friendIdentity.canRead(pkr)) {
  // Allow read
}

await friendIdentity.sendProtected(message);
```

### Friend Validation

The function automatically validates:
1. PKR is valid and not expired
2. PKR belongs to a registered principal
3. Principal kind is `PRINCIPAL_KINDS.FRIEND`

**Example:**
```javascript
// This will throw if pkr doesn't belong to a friend
try {
  const friendIdentity = createFriendIdentity(principals, pkr, kernel);
} catch (error) {
  // Error: "createFriendIdentity: expected a friend principal"
}
```

## Relationship to createIdentity

`createFriendIdentity` is a convenience wrapper around `createIdentity` that adds friend-specific validation. It delegates to `createIdentity` after validation, so the returned identity object has the same interface and functionality.

**Implementation:**
```javascript
// Validates friend principal
if (principal.kind !== PRINCIPAL_KINDS.FRIEND) {
  throw new Error('createFriendIdentity: expected a friend principal');
}

// Delegates to createIdentity
return createIdentity(principals, friendPkr, kernel);
```

## Usage Examples

### Create Friend Identity

```javascript
import { createFriendIdentity } from './create-friend-identity.mycelia.js';

// Create friend principal first
const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
  name: 'Anna',
  instance: friendInstance
});

// Create friend identity
const friendIdentity = createFriendIdentity(principals, friendPkr, kernel);
```

### Use Friend Identity

```javascript
const friendIdentity = createFriendIdentity(principals, friendPkr, kernel);

// Check permissions
if (friendIdentity.canRead(pkr)) {
  // Allow read
}

// Send protected message
const message = new Message('target://operation', { data: 'value' });
await friendIdentity.sendProtected(message);
```

## Best Practices

1. **Validate friend principal** before creating identity
2. **Use `createFriendIdentity()`** instead of `createIdentity()` for friends
3. **Handle validation errors** appropriately
4. **Check PKR expiration** before creating identity

## Related Documentation

- [createIdentity](./CREATE-IDENTITY.md) - Full identity wrapper (delegated to)
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Creates friend identities
- [Friend](./FRIEND.md) - Friend class representation







