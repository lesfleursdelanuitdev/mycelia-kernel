# ChildSubsystemRegistry Class

## Overview

The `ChildSubsystemRegistry` class manages child subsystems for a parent subsystem. It handles storage, lineage computation, and hierarchical relationships, providing a secure and consistent way to manage parent-child subsystem relationships.

**Key Features:**
- **Child Storage**: Map-based storage for efficient child lookup by name
- **Name Uniqueness**: Ensures child names are unique within a parent
- **Lineage Computation**: Traverses parent chain to compute ancestor lineage
- **Iterable**: Supports `for...of` loops for easy iteration
- **Query Methods**: Check existence, get by name, list all children
- **Parent Reference**: Maintains reference to parent subsystem

## Constructor

### `new ChildSubsystemRegistry(parent)`

Create a new `ChildSubsystemRegistry` instance.

**Parameters:**
- `parent` (BaseSubsystem, required) - Parent subsystem instance

**Returns:** `ChildSubsystemRegistry` - New instance

**Throws:**
- `Error` - If parent is not an object

**Example:**
```javascript
import { ChildSubsystemRegistry } from './child-subsystem-registry.mycelia.js';

const parent = new BaseSubsystem('server', { ms: messageSystem });
const registry = new ChildSubsystemRegistry(parent);
```

## Core Methods

### `add(child)`

Adds a child subsystem to the registry.

**Signature:**
```javascript
add(child) => BaseSubsystem
```

**Parameters:**
- `child` (BaseSubsystem, required) - Child subsystem instance (must have a unique `.name` property)

**Returns:** `BaseSubsystem` - The added child subsystem

**Throws:**
- `Error` - If child is not an object
- `Error` - If child does not have a string `.name` property
- `Error` - If child with same name already exists

**Side Effects:**
- Adds child to internal `#children` Map
- Child is stored with its name as the key

**Example:**
```javascript
const child1 = new BaseSubsystem('http-bridge', { ms: messageSystem });
const child2 = new BaseSubsystem('websocket-bridge', { ms: messageSystem });

registry.add(child1);
registry.add(child2);

// Duplicate name will throw error
try {
  registry.add(child1);  // ❌ Error: child with name 'http-bridge' already exists
} catch (error) {
  console.error(error.message);
}
```

### `remove(childOrName)`

Removes a child subsystem by reference or by name.

**Signature:**
```javascript
remove(childOrName) => boolean
```

**Parameters:**
- `childOrName` (BaseSubsystem | string, required) - Child instance or its string name

**Returns:** `boolean` - `true` if successfully removed, `false` if child was not found

**Behavior:**
- If `childOrName` is a string, removes child with that name
- If `childOrName` is an object with a `.name` property, removes child with that name
- Returns `false` if child not found or invalid input

**Example:**
```javascript
// Remove by name
const removed = registry.remove('http-bridge');
if (removed) {
  console.log('Child removed');
}

// Remove by reference
const child = registry.get('websocket-bridge');
if (child) {
  const removed = registry.remove(child);
  console.log('Removed:', removed);
}
```

### `get(name)`

Gets a child subsystem by name.

**Signature:**
```javascript
get(name) => BaseSubsystem | undefined
```

**Parameters:**
- `name` (string, required) - Child subsystem name

**Returns:** `BaseSubsystem | undefined` - Child subsystem instance or `undefined` if not found

**Behavior:**
- Returns `undefined` if name is not a string
- Returns `undefined` if child not found
- Returns child instance if found

**Example:**
```javascript
const child = registry.get('http-bridge');
if (child) {
  console.log('Found child:', child.name);
} else {
  console.log('Child not found');
}
```

### `has(name)`

Checks if a child exists in the registry.

**Signature:**
```javascript
has(name) => boolean
```

**Parameters:**
- `name` (string, required) - Child subsystem name

**Returns:** `boolean` - `true` if child exists, `false` otherwise

**Example:**
```javascript
if (registry.has('http-bridge')) {
  console.log('Child exists');
} else {
  console.log('Child does not exist');
}
```

### `list()`

Lists all registered child subsystems.

**Signature:**
```javascript
list() => Array<BaseSubsystem>
```

**Returns:** `Array<BaseSubsystem>` - Array of child subsystem instances (copy)

**Example:**
```javascript
const children = registry.list();
console.log(`Registry has ${children.length} children`);
children.forEach(child => {
  console.log(`- ${child.name}`);
});
```

### `size()`

Gets the number of registered children.

**Signature:**
```javascript
size() => number
```

**Returns:** `number` - Number of children in the registry

**Example:**
```javascript
const count = registry.size();
console.log(`Registry has ${count} children`);
```

### `clear()`

Clears all children from the registry.

**Signature:**
```javascript
clear() => void
```

**Side Effects:**
- Removes all children from internal `#children` Map
- Registry becomes empty

**Example:**
```javascript
registry.clear();
console.log(registry.size());  // 0
```

## Hierarchy Methods

### `getLineage(node)`

Gets the full lineage (ancestor chain) from root to the given node.

**Signature:**
```javascript
getLineage(node = null) => Array<BaseSubsystem>
```

**Parameters:**
- `node` (BaseSubsystem, optional) - Subsystem node (defaults to parent if not provided)

**Returns:** `Array<BaseSubsystem>` - Array of subsystem instances ordered from root → node

**Behavior:**
- If `node` is not provided, computes lineage for the parent subsystem
- Traverses up the hierarchy by following parent references
- Checks multiple parent property names: `_parent`, `parent`, or `getParent()` method
- Stops at root (when parent is null or same as current)
- Returns array ordered from root (first element) to node (last element)
- Includes the node itself in the lineage

**Parent Detection:**
The method checks for parent in this order:
1. `current._parent`
2. `current.parent`
3. `current.getParent()` (if method exists)
4. `null` (if none found)

**Example:**
```javascript
// Get lineage for parent
const lineage = registry.getLineage();
console.log(lineage.map(n => n.name));
// ["kernel", "server"] (if parent is 'server' under 'kernel')

// Get lineage for a specific node
const child = registry.get('http-bridge');
if (child) {
  const lineage = registry.getLineage(child);
  console.log(lineage.map(n => n.name));
  // ["kernel", "server", "http-bridge"]
}
```

**Lineage Structure:**
```
Root → Parent → Child → Grandchild
[0]    [1]      [2]     [3]
```

## Iterator Support

### `[Symbol.iterator]()`

Iterator for child subsystems (enables `for...of` loops).

**Signature:**
```javascript
*[Symbol.iterator]() => Generator<BaseSubsystem>
```

**Yields:** `BaseSubsystem` - Child subsystem instances

**Example:**
```javascript
// Iterate over children
for (const child of registry) {
  console.log('Child:', child.name);
}

// Works with spread operator
const children = [...registry];
console.log(`Found ${children.length} children`);

// Works with Array.from
const childArray = Array.from(registry);
```

## Accessor Methods

### `getParent()`

Gets the parent subsystem.

**Signature:**
```javascript
getParent() => BaseSubsystem
```

**Returns:** `BaseSubsystem` - Parent subsystem instance

**Example:**
```javascript
const parent = registry.getParent();
console.log('Parent:', parent.name);
```

## Internal Storage

The `ChildSubsystemRegistry` uses a private `Map` for storage:

- **`#children`**: `Map<string, BaseSubsystem>` - Child name → child instance mapping
- **`#parent`**: `BaseSubsystem` - Parent subsystem reference

**Storage Characteristics:**
- O(1) lookup by name
- O(1) insertion
- O(1) deletion
- Maintains insertion order (Map behavior)

## Usage Patterns

### Basic Child Management

```javascript
import { ChildSubsystemRegistry } from './child-subsystem-registry.mycelia.js';

const parent = new BaseSubsystem('server', { ms: messageSystem });
const registry = new ChildSubsystemRegistry(parent);

// Add children
const child1 = new BaseSubsystem('http-bridge', { ms: messageSystem });
const child2 = new BaseSubsystem('websocket-bridge', { ms: messageSystem });

registry.add(child1);
registry.add(child2);

// Query children
console.log(registry.size());  // 2
console.log(registry.has('http-bridge'));  // true

// Get child
const httpBridge = registry.get('http-bridge');

// List all children
const children = registry.list();
children.forEach(child => {
  console.log(`Child: ${child.name}`);
});

// Remove child
registry.remove('http-bridge');
console.log(registry.size());  // 1
```

### Iteration Patterns

```javascript
// Using for...of
for (const child of registry) {
  console.log(`Processing child: ${child.name}`);
}

// Using list()
const children = registry.list();
children.forEach(child => {
  console.log(`Child: ${child.name}`);
});

// Using spread operator
const childArray = [...registry];
console.log(`Total children: ${childArray.length}`);
```

### Lineage Computation

```javascript
// Get lineage for parent
const parentLineage = registry.getLineage();
console.log('Parent lineage:', parentLineage.map(n => n.name));

// Get lineage for a child
const child = registry.get('http-bridge');
if (child) {
  const childLineage = registry.getLineage(child);
  console.log('Child lineage:', childLineage.map(n => n.name));
  // Shows full path from root to child
}
```

### Hierarchical Structure

```javascript
// Build hierarchy: kernel -> server -> http-bridge
const kernel = new BaseSubsystem('kernel', { ms: messageSystem });
const server = new BaseSubsystem('server', { ms: messageSystem });
const httpBridge = new BaseSubsystem('http-bridge', { ms: messageSystem });

// Set up parent-child relationships
server.setParent(kernel);
httpBridge.setParent(server);

// Create registries
const kernelRegistry = new ChildSubsystemRegistry(kernel);
const serverRegistry = new ChildSubsystemRegistry(server);

// Register children
kernelRegistry.add(server);
serverRegistry.add(httpBridge);

// Get lineage from server registry
const serverLineage = serverRegistry.getLineage();
console.log(serverLineage.map(n => n.name));  // ["kernel", "server"]

// Get lineage for http-bridge
const bridgeLineage = serverRegistry.getLineage(httpBridge);
console.log(bridgeLineage.map(n => n.name));  // ["kernel", "server", "http-bridge"]
```

## Error Handling

### Duplicate Child Names

```javascript
try {
  registry.add(child1);
  registry.add(child2);  // Same name as child1
  // ❌ Error: ChildSubsystemRegistry.add: child with name 'child-name' already exists
} catch (error) {
  console.error('Failed to add child:', error.message);
}
```

### Invalid Child

```javascript
try {
  registry.add(null);  // ❌ Error: ChildSubsystemRegistry.add: child must be an object
} catch (error) {
  console.error('Invalid child:', error.message);
}

try {
  registry.add({});  // ❌ Error: ChildSubsystemRegistry.add: child must have a string .name property
} catch (error) {
  console.error('Invalid child:', error.message);
}
```

### Invalid Parent

```javascript
try {
  const registry = new ChildSubsystemRegistry(null);
  // ❌ Error: ChildSubsystemRegistry: parent must be an object
} catch (error) {
  console.error('Invalid parent:', error.message);
}
```

## Best Practices

1. **Unique Names**: Ensure child names are unique within a parent
2. **Build Before Adding**: Build child subsystems before adding them to registry
3. **Set Parent**: Set parent-child relationships using `setParent()` before adding
4. **Check Before Adding**: Use `has()` to check if child exists before adding
5. **Clean Up**: Clear registry during disposal
6. **Use Lineage**: Use `getLineage()` to understand subsystem relationships
7. **Iterate Efficiently**: Use `for...of` for iteration when possible

## Integration with useHierarchy Hook

The `ChildSubsystemRegistry` is used internally by the `useHierarchy` hook:

```javascript
import { useHierarchy } from './hooks/hierarchy/use-hierarchy.mycelia.js';

const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useHierarchy
});

await subsystem.build();

// Registry is accessible via hierarchy facet
const registry = subsystem.hierarchy.children;

// Or use facet methods
subsystem.hierarchy.addChild(child);
const children = subsystem.hierarchy.listChildren();
```

## Thread Safety

**Note:** The `ChildSubsystemRegistry` is not thread-safe. If used in a multi-threaded environment, external synchronization is required.

## Performance Considerations

- **Lookup**: O(1) - Map-based lookup by name
- **Insertion**: O(1) - Map insertion
- **Deletion**: O(1) - Map deletion
- **List**: O(n) - Creates array copy of all children
- **Lineage**: O(h) - Where h is height of hierarchy (number of ancestors)

## See Also

- [useHierarchy Hook](./USE-HIERARCHY.md) - Hook that uses ChildSubsystemRegistry
- [Base Subsystem](../../BASE-SUBSYSTEM.md) - Parent subsystem class
- [Hooks Documentation](../HOOKS.md) - Understanding hooks

