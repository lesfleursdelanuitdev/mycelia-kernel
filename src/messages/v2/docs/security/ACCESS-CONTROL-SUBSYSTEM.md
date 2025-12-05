# Access Control Subsystem

## Overview

The **AccessControlSubsystem** is a kernel child subsystem responsible for identity and access control in the Mycelia system. It extends `BaseSubsystem` and provides high-level methods for creating resources, friends, and wiring subsystems with their corresponding principals and identities.

**Key Features:**
- **Resource Management**: Create resources with automatic principal registration and identity attachment
- **Friend Management**: Create friends with automatic principal registration and identity attachment
- **Subsystem Wiring**: Wire subsystems (child or top-level) with principals and identities
- **Principal Integration**: Uses `usePrincipals` hook for principal management
- **Automatic Identity Creation**: Automatically creates and attaches identities to instances
- **PKR Management**: Handles Public Key Record creation and management internally

## Constructor

### Signature

```javascript
new AccessControlSubsystem(name = 'access-control', options = {})
```

### Parameters

#### `name` (string, optional)

The subsystem name. Defaults to `'access-control'`.

**Default:** `'access-control'`

#### `options` (object, required)

Configuration options for the subsystem.

**Properties:**
- `ms` (MessageSystem, required) - MessageSystem instance
- `config` (object, optional) - Configuration object
  - `principals` (object, optional) - Principals configuration
    - `kernel` (object, optional) - Kernel instance (required for usePrincipals)

**Example:**
```javascript
const accessControl = new AccessControlSubsystem('access-control', {
  ms: messageSystem,
  config: {
    principals: {
      kernel: messageSystem
    }
  }
});

await accessControl.build();
```

## Architecture

The `AccessControlSubsystem` extends `BaseSubsystem` and automatically installs the `usePrincipals` hook:

```javascript
export class AccessControlSubsystem extends BaseSubsystem {
  constructor(name = 'access-control', options = {}) {
    super(name, options);
    // Install principals facet
    this.use(usePrincipals);
  }
}
```

This provides access to the `principals` facet, which is used internally by all methods.

## Methods

### `createResource(ownerInstance, name, resourceInstance, metadata)`

Create a new Resource and register a corresponding Principal for it.

**Signature:**
```javascript
createResource(ownerInstance, name, resourceInstance, metadata = {}) => Resource
```

**Parameters:**
- `ownerInstance` (BaseSubsystem, required) - The owner subsystem instance
- `name` (string, required) - Resource name (must be non-empty)
- `resourceInstance` (object, required) - Required instance to attach to the resource
- `metadata` (object, optional) - Optional metadata for the resource

**Returns:** `Resource` - The created Resource instance

**Flow:**
1. Create Resource object with owner subsystem, name, metadata, and instance
2. Register a Principal for that resource (createPrincipal handles key minting internally)
3. Create resource identity and attach to resourceInstance

**Throws:**
- `Error` if ownerInstance is missing
- `Error` if name is invalid (not a non-empty string)
- `Error` if resourceInstance is missing
- `Error` if ownerInstance doesn't have an identity with a PKR

**Example:**
```javascript
// Create a resource for a database connection
const dbConnection = { host: 'localhost', port: 5432 };
const resource = accessControl.createResource(
  ownerSubsystem,
  'main-database',
  dbConnection,
  { type: 'postgres', version: '14' }
);

// Resource has identity attached
console.log(dbConnection.identity); // Identity wrapper with PKR
console.log(resource.name); // 'main-database'
console.log(resource.owner); // ownerSubsystem
```

**Example - Resource with Metadata:**
```javascript
const fileHandle = { path: '/data/file.txt', mode: 'r' };
const resource = accessControl.createResource(
  ownerSubsystem,
  'data-file',
  fileHandle,
  { 
    type: 'file',
    size: 1024,
    permissions: 'read-only'
  }
);
```

### `createFriend(name, options)`

Create a new Friend and register a corresponding Principal for it.

**Signature:**
```javascript
createFriend(name, options = {}) => Friend
```

**Parameters:**
- `name` (string, required) - Friend name (must be non-empty)
- `options` (object, optional) - Optional friend options
  - `endpoint` (string, optional) - Friend endpoint
  - `metadata` (object, optional) - Optional metadata for the friend
  - `sessionKey` (symbol, optional) - Optional session key

**Returns:** `Friend` - The created Friend instance

**Flow:**
1. Create Friend object with name, endpoint, metadata, and sessionKey
2. Register a Principal for that friend (createPrincipal handles key minting internally)
3. Create friend identity and attach to the Friend instance

**Throws:**
- `Error` if name is invalid (not a non-empty string)

**Example:**
```javascript
// Create a friend with endpoint
const friend = accessControl.createFriend('Anna', {
  endpoint: 'https://anna.example.com',
  metadata: { version: '1.0', region: 'us-east' }
});

// Friend has identity attached
console.log(friend.identity); // Friend identity wrapper with PKR
console.log(friend.name); // 'Anna'
console.log(friend.endpoint); // 'https://anna.example.com'
```

**Example - Friend with Session Key:**
```javascript
const sessionKey = Symbol('session-key-123');
const friend = accessControl.createFriend('Bob', {
  endpoint: 'wss://bob.example.com',
  sessionKey: sessionKey,
  metadata: { protocol: 'websocket' }
});
```

### `wireSubsystem(type, subsystemInstance, options)`

Wire a subsystem principal and attach identity to the subsystem instance.

**Signature:**
```javascript
wireSubsystem(type, subsystemInstance, options = {}) => { pkr, subsystem }
```

**Parameters:**
- `type` (string, required) - Subsystem type: `'child'` or `'topLevel'`
- `subsystemInstance` (BaseSubsystem, required) - The subsystem instance to register
- `options` (object, optional) - Optional options
  - `metadata` (object, optional) - Optional metadata for the subsystem

**Returns:** `Object` - Object containing:
- `pkr` (PKR) - The created principal's Public Key Record
- `subsystem` (BaseSubsystem) - The subsystem instance with identity attached

**Flow:**
1. Validate type and subsystemInstance
2. Get owner PKR from root subsystem (for child types)
3. Register a Principal for the subsystem (createPrincipal handles key minting internally)
4. Create identity and attach to subsystemInstance.identity

**Throws:**
- `Error` if type is invalid (must be `'child'` or `'topLevel'`)
- `Error` if subsystemInstance is missing
- `Error` if root subsystem cannot be found (for child types)
- `Error` if root subsystem doesn't have an identity with a PKR (for child types)

**Example - Top-Level Subsystem:**
```javascript
// Create a top-level subsystem
const topLevelSubsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

// Wire it with identity
const { pkr, subsystem } = accessControl.wireSubsystem('topLevel', topLevelSubsystem, {
  metadata: { purpose: 'data-processing' }
});

// Subsystem now has identity
console.log(topLevelSubsystem.identity); // Identity wrapper with PKR
console.log(pkr); // Public Key Record
```

**Example - Child Subsystem:**
```javascript
// Create a child subsystem
const childSubsystem = new BaseSubsystem('child-subsystem', {
  ms: messageSystem
});

// Wire it with identity (requires root to have identity)
const { pkr, subsystem } = accessControl.wireSubsystem('child', childSubsystem, {
  metadata: { parent: 'kernel' }
});

// Child subsystem now has identity
console.log(childSubsystem.identity); // Identity wrapper with PKR
console.log(pkr); // Public Key Record
```

## Integration with Kernel

The `AccessControlSubsystem` is typically created as a child of the `KernelSubsystem`:

```javascript
// KernelSubsystem automatically creates AccessControlSubsystem
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem
});

await kernel.bootstrap();

// Access via kernel
const accessControl = kernel.getAccessControl();
```

The kernel uses `AccessControlSubsystem` for:
- Registering subsystems via `kernel.registerSubsystem()`
- Registering child subsystems via `kernel.registerChildSubsystems()`
- Managing identities for all subsystems

## Principal Kinds

The subsystem uses the following principal kinds from `PRINCIPAL_KINDS`:

- **`PRINCIPAL_KINDS.RESOURCE`** - For resources created via `createResource()`
- **`PRINCIPAL_KINDS.FRIEND`** - For friends created via `createFriend()`
- **`'child'`** - For child subsystems wired via `wireSubsystem('child', ...)`
- **`'topLevel'`** - For top-level subsystems wired via `wireSubsystem('topLevel', ...)`

## Identity Creation

All methods automatically create and attach identities:

### Resource Identity

```javascript
const resource = accessControl.createResource(owner, 'my-resource', instance);
// instance.identity is automatically set with resource identity
```

### Friend Identity

```javascript
const friend = accessControl.createFriend('Anna', { endpoint: '...' });
// friend.identity is automatically set with friend identity
```

### Subsystem Identity

```javascript
const { subsystem } = accessControl.wireSubsystem('topLevel', subsystem);
// subsystem.identity is automatically set with subsystem identity
```

## Error Handling

### Missing Owner Identity

When creating a resource, the owner must have an identity:

```javascript
try {
  const resource = accessControl.createResource(ownerWithoutIdentity, 'resource', instance);
} catch (error) {
  console.error(error.message);
  // "AccessControlSubsystem.createResource: ownerInstance must have an identity with a PKR."
}
```

### Invalid Subsystem Type

When wiring a subsystem, the type must be valid:

```javascript
try {
  accessControl.wireSubsystem('invalid', subsystem);
} catch (error) {
  console.error(error.message);
  // "AccessControlSubsystem.wireSubsystem: type must be "child" or "topLevel"."
}
```

### Missing Root Identity for Child

When wiring a child subsystem, the root must have an identity:

```javascript
try {
  accessControl.wireSubsystem('child', childSubsystem);
} catch (error) {
  console.error(error.message);
  // "AccessControlSubsystem.wireSubsystem: root subsystem must have an identity with a PKR for child subsystems."
}
```

## Usage Patterns

### Complete Resource Lifecycle

```javascript
// 1. Create owner subsystem with identity
const owner = new BaseSubsystem('owner', { ms: messageSystem });
await owner.build();
accessControl.wireSubsystem('topLevel', owner);

// 2. Create resource
const dbInstance = { connection: 'postgres://...' };
const resource = accessControl.createResource(owner, 'database', dbInstance, {
  type: 'postgres',
  version: '14'
});

// 3. Resource has identity
console.log(dbInstance.identity.pkr); // Public Key Record
```

### Friend Management

```javascript
// Create multiple friends
const friend1 = accessControl.createFriend('Alice', {
  endpoint: 'https://alice.example.com',
  metadata: { region: 'us-west' }
});

const friend2 = accessControl.createFriend('Bob', {
  endpoint: 'wss://bob.example.com',
  metadata: { protocol: 'websocket' }
});

// Friends have identities
console.log(friend1.identity.pkr);
console.log(friend2.identity.pkr);
```

### Subsystem Registration

```javascript
// Register top-level subsystem
const subsystem1 = new BaseSubsystem('subsystem1', { ms: messageSystem });
await subsystem1.build();
const { pkr: pkr1 } = accessControl.wireSubsystem('topLevel', subsystem1);

// Register child subsystem (requires root identity)
const subsystem2 = new BaseSubsystem('subsystem2', { ms: messageSystem });
await subsystem2.build();
const { pkr: pkr2 } = accessControl.wireSubsystem('child', subsystem2);
```

## Dependencies

The `AccessControlSubsystem` requires:

- **BaseSubsystem** - Base class for all subsystems
- **usePrincipals** - Hook for principal management (installed automatically)
- **Resource** - Resource class for managed objects
- **Friend** - Friend class for trusted peers
- **PRINCIPAL_KINDS** - Principal kind constants

## Best Practices

1. **Use Kernel Integration**: Typically accessed via `kernel.getAccessControl()` rather than creating directly
2. **Ensure Owner Identity**: Always ensure owner subsystems have identities before creating resources
3. **Validate Names**: Use meaningful, non-empty names for resources and friends
4. **Metadata Usage**: Use metadata to store additional information about resources and friends
5. **Child Subsystem Wiring**: Ensure root subsystem has identity before wiring child subsystems
6. **Error Handling**: Always handle errors when creating resources, friends, or wiring subsystems

## See Also

- [Security System Overview](./README.md) - Identity and access control framework
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Centralized principal management
- [Resource](./RESOURCE.md) - Managed object representation
- [Friend](./FRIEND.md) - Trusted peer representation
- [usePrincipals](../hooks/principals/USE-PRINCIPALS.md) - Principal registry hook
- [Base Subsystem](../BASE-SUBSYSTEM.md) - Core building block for all subsystems
- [Kernel Subsystem](../message/MESSAGE-SYSTEM.md) - Kernel subsystem that uses AccessControlSubsystem





