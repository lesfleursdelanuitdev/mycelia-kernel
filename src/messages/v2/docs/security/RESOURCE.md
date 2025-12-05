# Resource

## Overview

The **Resource** class represents a generic managed object in the Mycelia system. It's used for data stores, caches, file handles, external connections, and other managed resources. Resources can form hierarchical relationships through parent-child links.

**Key Features:**
- **Hierarchical Naming**: Owner-prefixed resource paths with parent-child relationships
- **Resource Type**: Typed resources for categorization
- **Parent-Child Hierarchy**: Resources can have parent resources and child resources
- **Owner Tracking**: Links to BaseSubsystem instance
- **Instance Attachment**: Optional instance object can be attached to the resource
- **Duck-Type Markers**: `isResource` and `kind` properties
- **Metadata Support**: Optional metadata storage

## Constructor

### Signature

```javascript
new Resource({ name, type, metadata, owner, instance, parent })
```

### Parameters

#### `name` (string, optional)

The resource name.

**Default:** `null`

#### `type` (string, optional)

The resource type. Used for categorization and hierarchical path construction.

**Default:** `null`

#### `metadata` (object, optional)

Optional metadata object for storing additional information.

**Default:** `{}`

#### `owner` (BaseSubsystem, optional)

The owner subsystem instance (BaseSubsystem).

**Default:** `null`

**Note:** The owner must be a BaseSubsystem instance. The resource uses the owner's `getNameString()` method to build hierarchical paths.

#### `instance` (object, optional)

Optional instance object to attach to the resource. This is typically the actual resource object (database connection, file handle, etc.) that the Resource wraps.

**Default:** `null`

#### `parent` (Resource, optional)

The parent resource instance. Used to build hierarchical resource relationships.

**Default:** `null`

**Example:**
```javascript
const resource = new Resource({
  name: 'main-db',
  type: 'database',
  metadata: { version: '1.0' },
  owner: subsystem,
  instance: databaseConnection,
  parent: parentResource
});
```

## Properties

### `kind` (getter)

Returns `PRINCIPAL_KINDS.RESOURCE`.

```javascript
resource.kind; // 'resource'
```

### `isResource` (getter)

Returns `true` for duck-type checking.

```javascript
resource.isResource; // true
```

### `name` (getter)

Returns the resource name.

```javascript
resource.name; // 'main-db'
```

### `type` (getter)

Returns the resource type.

```javascript
resource.type; // 'database'
```

### `metadata` (getter)

Returns the metadata object.

```javascript
resource.metadata; // { version: '1.0' }
```

### `createdAt` (getter)

Returns the creation timestamp.

```javascript
resource.createdAt; // Date object
```

### `owner` (getter)

Returns the owner subsystem (BaseSubsystem) or `null`.

```javascript
resource.owner; // BaseSubsystem instance or null
```

### `instance` (getter)

Returns the attached instance object or `null`.

```javascript
resource.instance; // Attached instance object or null
```

### `parent` (getter)

Returns the parent resource instance or `null`.

```javascript
resource.parent; // Resource instance or null
```

### `children` (getter)

Returns a Map of child resources, keyed by string. The keys follow the format: `type.{type}.name.{name}`.

```javascript
resource.children; // Map<string, Resource>
```

**Child Key Format:**
- Format: `type.{type}.name.{name}`
- Example: `type.database.name.main-db`

## Methods

### `hasChild(name, type)`

Checks if the resource has a child with the specified name and type.

**Parameters:**
- `name` (string) - Child resource name
- `type` (string) - Child resource type

**Returns:** `boolean` - `true` if the child exists, `false` otherwise

**Example:**
```javascript
resource.hasChild('main-db', 'database'); // true or false
```

**Child Key Format:**
The method checks for a child with the key: `type.{type}.name.{name}`

### `addChild(name, type, resource)`

Adds a child resource to this resource.

**Parameters:**
- `name` (string) - Child resource name
- `type` (string) - Child resource type
- `resource` (Resource) - The resource to add as a child

**Returns:** `boolean` - `true` if the child was added, `false` if a child with the same key already exists

**Example:**
```javascript
const childResource = new Resource({ name: 'cache', type: 'memory' });
const added = parentResource.addChild('cache', 'memory', childResource);
if (added) {
  console.log('Child added successfully');
} else {
  console.log('Child with that key already exists');
}
```

**Child Key Format:**
The child is stored with the key: `type.{type}.name.{name}`

### `getNameString()`

Returns the hierarchical resource path. The behavior depends on whether the resource has a parent:
- If `parent` is `null`, returns the result of `getNameStringParentResource()`
- If `parent` exists, appends the resource's type and name to the parent's path

**Returns:** `string` - Hierarchical resource path

**Examples:**
```javascript
// Resource without parent
const resource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem
});
resource.getNameString(); // "kernel://subsystem/type.database.name.main-db"

// Resource with parent
const childResource = new Resource({
  name: 'cache',
  type: 'memory',
  parent: resource
});
childResource.getNameString(); // "kernel://subsystem/type.database.name.main-db/res.type.memory.name.cache"
```

**Path Format:**
- Without parent: Uses `getNameStringParentResource()` format
- With parent: `{parent.getNameStringParentResource()}/res.type.{type}.name.{name}`

### `getNameStringParentResource()`

Returns the hierarchical resource path, prefixed by its owner subsystem. Uses the format: `type.{type}.name.{name}`.

**Returns:** `string` - Hierarchical resource path in the format `type.{type}.name.{name}`

**Examples:**
```javascript
// With owner
const resource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem
});
resource.getNameStringParentResource(); // "kernel://subsystem/type.database.name.main-db"

// Without owner
const resource = new Resource({
  name: 'cache',
  type: 'memory'
});
resource.getNameStringParentResource(); // "type.memory.name.cache"
```

**Path Format:**
- With owner: `{owner.getNameString()}/type.{type}.name.{name}`
- Without owner: `type.{type}.name.{name}`

### `toRecord()`

Converts the resource to a serializable record object.

**Returns:** `object` - Record representation

**Record Structure:**
```javascript
{
  kind: 'resource',
  name: string | null,
  metadata: object,
  createdAt: Date,
  owner: string | null  // Owner's PKR UUID, or owner's name, or null
}
```

**Owner Identifier Logic:**
- If owner has `identity.pkr.uuid`, uses the UUID
- Otherwise, if owner has a `name`, uses the name
- Otherwise, `null`

**Example:**
```javascript
const record = resource.toRecord();
// {
//   kind: 'resource',
//   name: 'main-db',
//   metadata: { type: 'database', version: '1.0' },
//   createdAt: Date,
//   owner: 'uuid-string' or 'subsystem-name' or null
// }
```

### `toString()`

Returns a string representation by concatenating "Resource" with the result of `getNameString()`.

**Returns:** `string` - String representation: "Resource" + `getNameString()`

**Example:**
```javascript
const resource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem
});
resource.toString(); // "Resourcekernel://subsystem/type.database.name.main-db"
```

## Usage Examples

### Basic Resource Creation

```javascript
import { Resource } from './resource.mycelia.js';

const resource = new Resource({
  name: 'main-db',
  type: 'database',
  metadata: { version: '1.0' }
});
```

### Resource with Owner

```javascript
const resource = new Resource({
  name: 'cache',
  type: 'memory',
  owner: subsystem  // BaseSubsystem instance
});

// Hierarchical path
resource.getNameString(); // "kernel://subsystem/type.memory.name.cache"
```

### Resource with Type

```javascript
const resource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem
});

console.log(resource.type); // 'database'
```

### Resource Hierarchy (Parent-Child)

```javascript
// Create parent resource
const parentResource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem
});

// Create child resource
const childResource = new Resource({
  name: 'cache',
  type: 'memory',
  parent: parentResource
});

// Add child to parent
parentResource.addChild('cache', 'memory', childResource);

// Check if child exists
if (parentResource.hasChild('cache', 'memory')) {
  console.log('Child exists');
}

// Access children
parentResource.children.forEach((child, key) => {
  console.log(`Child key: ${key}, Resource: ${child.name}`);
});
```

### Resource with Instance

```javascript
const databaseConnection = await createConnection(config);

const resource = new Resource({
  name: 'main-db',
  type: 'database',
  owner: subsystem,
  instance: databaseConnection,  // Attach the actual database connection
  metadata: { version: '14' }
});

// Access the instance
const db = resource.instance;
await db.query('SELECT * FROM users');
```

### Resource Metadata

```javascript
const resource = new Resource({
  name: 'file-handle',
  type: 'file',
  metadata: {
    path: '/path/to/file',
    mode: 'read-write',
    size: 1024
  }
});
```

### Duck-Type Checking

```javascript
const resource = new Resource({ name: 'cache', type: 'memory' });

// Check if object is a resource
if (resource.isResource && resource.kind === 'resource') {
  // Handle as resource
}
```

## Best Practices

1. **Set type** for resource categorization and hierarchical path construction
2. **Set owner** for hierarchical resource management (must be BaseSubsystem instance)
3. **Use parent-child relationships** to build resource hierarchies
4. **Use consistent type/name combinations** when adding children (keys are `type.{type}.name.{name}`)
5. **Check for existing children** before adding to avoid duplicates (use `hasChild()`)
6. **Attach instance** when creating resources to link the Resource wrapper to the actual resource object
7. **Use descriptive names** for resources
8. **Store configuration in metadata** for flexibility
9. **Use `getNameString()`** for consistent resource identification
10. **Use duck-type markers** (`isResource`, `kind`) for type checking

## Related Documentation

- [Principal](./PRINCIPAL.md) - Principal representation
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Resource principal management



