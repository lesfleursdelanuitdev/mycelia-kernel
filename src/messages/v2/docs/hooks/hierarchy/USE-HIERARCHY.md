# useHierarchy Hook

## Overview

The `useHierarchy` hook provides child and parent subsystem management capabilities to subsystems. It wraps the `ChildSubsystemRegistry` class and exposes methods for registering, unregistering, and querying child subsystems, as well as managing parent relationships. It enables hierarchical subsystem relationships in a secure, consistent way.

**Key Features:**
- **Child Management**: Register, unregister, and query child subsystems
- **Parent Management**: Set, get, and query parent relationships (setParent, getParent, isRoot, getRoot)
- **Hierarchical Relationships**: Inspect lineage and parent-child relationships
- **Lazy Initialization**: Registry is initialized only when first needed
- **Secure Registration**: Prevents duplicate child names
- **Lineage Tracking**: Get full ancestor chain from root to current subsystem
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'hierarchy',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'hierarchy'
}
```

### Properties

- **`kind`**: `'hierarchy'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing hierarchy facet
- **`required`**: `[]` - No required facets (can be installed independently)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.hierarchy`
- **`source`**: `import.meta.url` - Source file location for debugging
- **`contract`**: `'hierarchy'` - Declares that this facet implements the hierarchy contract

## Configuration

The hook reads configuration from `ctx.config.hierarchy`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    hierarchy: {
      debug: true
    }
  }
});
```

## Facet Methods

### `addChild(child)`

Registers a child subsystem under the current subsystem.

**Signature:**
```javascript
addChild(child) => BaseSubsystem
```

**Parameters:**
- `child` (BaseSubsystem, required) - Child subsystem instance (must have a unique `.name`)

**Returns:** `BaseSubsystem` - The added child subsystem

**Throws:**
- `Error` - If another child with the same name already exists
- `Error` - If child is invalid or missing required properties

**Side Effects:**
- Registers child in internal registry
- Sets parent-child relationship
- Updates subsystem hierarchy
- Logs debug message if debug is enabled

**Example:**
```javascript
const parent = new BaseSubsystem('server', { ms: messageSystem });
const child = new BaseSubsystem('http-bridge', { ms: messageSystem });

parent.use(useHierarchy).build();
parent.hierarchy.addChild(child);
```

### `removeChild(childOrName)`

Removes a registered child subsystem by reference or by name.

**Signature:**
```javascript
removeChild(childOrName) => boolean
```

**Parameters:**
- `childOrName` (BaseSubsystem | string, required) - Child subsystem instance or its string name

**Returns:** `boolean` - `true` if successfully removed, `false` if child was not found

**Side Effects:**
- Removes child from internal registry
- Clears parent-child relationship
- Updates subsystem hierarchy
- Logs debug message if debug is enabled and removal was successful

**Example:**
```javascript
// Remove by name
const removed = parent.hierarchy.removeChild('http-bridge');

// Remove by reference
const removed = parent.hierarchy.removeChild(childSubsystem);
```

### `getChild(name)`

Retrieves a specific child subsystem by name.

**Signature:**
```javascript
getChild(name) => BaseSubsystem | undefined
```

**Parameters:**
- `name` (string, required) - String identifier of the child

**Returns:** `BaseSubsystem | undefined` - Child subsystem instance or `undefined` if not found

**Example:**
```javascript
const child = parent.hierarchy.getChild('http-bridge');
if (child) {
  console.log('Found child:', child.name);
}
```

### `listChildren()`

Returns an array of all currently registered child subsystems.

**Signature:**
```javascript
listChildren() => Array<BaseSubsystem>
```

**Returns:** `Array<BaseSubsystem>` - Array of child subsystem instances

**Example:**
```javascript
const children = parent.hierarchy.listChildren();
console.log(`Parent has ${children.length} children`);
children.forEach(child => {
  console.log(`- ${child.name}`);
});
```

### `getLineage(node)`

Returns the full ancestor chain (from the topmost ancestor down to node).

**Signature:**
```javascript
getLineage(node?) => Array<BaseSubsystem>
```

**Parameters:**
- `node` (BaseSubsystem, optional) - Optional; defaults to the current subsystem

**Returns:** `Array<BaseSubsystem>` - Array of subsystem instances ordered from root → node

**Behavior:**
- If `node` is not provided, returns lineage for the current subsystem
- Returns array ordered from root (first element) to the specified node (last element)
- Includes the node itself in the lineage

**Example:**
```javascript
// Get lineage for current subsystem
const lineage = child.hierarchy.getLineage();
console.log(lineage.map(n => n.name));
// ["kernel", "server", "db"]

// Get lineage for a specific node
const lineage = parent.hierarchy.getLineage(someChild);
console.log(lineage.map(n => n.name));
// ["kernel", "server", "someChild"]
```

### Parent Management Methods

The hierarchy facet provides methods for managing parent relationships. These methods operate on the subsystem's `_parent` property, which stores the parent reference.

#### `setParent(parent)`

Sets the parent subsystem for this subsystem.

**Signature:**
```javascript
setParent(parent) => BaseSubsystem
```

**Parameters:**
- `parent` (BaseSubsystem | null, required) - The parent subsystem, or `null` to remove parent

**Returns:** `BaseSubsystem` - The subsystem instance (for chaining)

**Throws:**
- `Error` - If `parent` is provided but is not an object

**Side Effects:**
- Sets `subsystem._parent` property
- Updates hierarchy relationships

**Example:**
```javascript
const parent = new BaseSubsystem('parent', { ms: messageSystem });
const child = new BaseSubsystem('child', { ms: messageSystem });

await parent.build();
await child.build();

// Set parent via hierarchy facet
child.hierarchy.setParent(parent);

// Or use BaseSubsystem method (delegates to hierarchy facet)
child.setParent(parent);
```

#### `getParent()`

Gets the parent subsystem.

**Signature:**
```javascript
getParent() => BaseSubsystem | null
```

**Returns:** `BaseSubsystem | null` - The parent subsystem, or `null` if root

**Example:**
```javascript
const parent = child.hierarchy.getParent();
if (parent) {
  console.log('Has parent:', parent.name);
}

// Or use BaseSubsystem method (delegates to hierarchy facet)
const parent = child.getParent();
```

#### `isRoot()`

Checks if this subsystem is a root (has no parent).

**Signature:**
```javascript
isRoot() => boolean
```

**Returns:** `boolean` - `true` if root (no parent), `false` otherwise

**Example:**
```javascript
if (subsystem.hierarchy.isRoot()) {
  console.log('This is a root subsystem');
}

// Or use BaseSubsystem method (delegates to hierarchy facet)
if (subsystem.isRoot()) {
  console.log('This is a root subsystem');
}
```

#### `getRoot()`

Gets the root subsystem by traversing up the parent chain.

**Signature:**
```javascript
getRoot() => BaseSubsystem
```

**Returns:** `BaseSubsystem` - The root subsystem (subsystem with no parent)

**Behavior:**
- Traverses up the parent chain using `subsystem._parent`
- Returns the root subsystem (subsystem with `_parent === null`)
- If called on a root subsystem, returns itself

**Example:**
```javascript
const root = child.hierarchy.getRoot();
console.log('Root subsystem:', root.name);

// Or use BaseSubsystem method (delegates to hierarchy facet)
const root = child.getRoot();
console.log('Root subsystem:', root.name);
```

#### `traverse(visit)`

Traverses the child subsystem hierarchy in depth-first order.

**Signature:**
```javascript
traverse(visit) => void
```

**Parameters:**
- `visit` (Function, required) - Function that takes a subsystem instance as parameter

**Returns:** `void`

**Behavior:**
- For each child subsystem:
  1. Calls `visit(child)` to process the child
  2. Checks if the child has its own hierarchy facet
  3. If it does, recursively calls `child.hierarchy.traverse(visit)` to traverse its subtree
- Visits children in the order they were added
- Processes entire subtree before moving to next sibling

**Example:**
```javascript
// Traverse all subsystems in the hierarchy
subsystem.hierarchy.traverse((subsystem) => {
  console.log(`Visiting subsystem: ${subsystem.name}`);
});

// Collect all subsystem names
const names = [];
subsystem.hierarchy.traverse((subsystem) => {
  names.push(subsystem.name);
});
```

**Use Case:** Process all subsystems in a hierarchy, such as collecting statistics, performing cleanup, or broadcasting messages.

#### `traverseBFS(visit)`

Traverses the child subsystem hierarchy in breadth-first order.

**Signature:**
```javascript
traverseBFS(visit) => void
```

**Parameters:**
- `visit` (Function, required) - Function that takes a subsystem instance as parameter

**Returns:** `void`

**Behavior:**
- Visits all children at the current level before moving to the next level
- Uses a queue-based approach to process subsystems level by level
- For each child subsystem:
  1. Calls `visit(child)` to process the child
  2. Checks if the child has its own hierarchy facet
  3. If it does, adds its children to the queue for the next level

**Example:**
```javascript
// Traverse all subsystems in breadth-first order
subsystem.hierarchy.traverseBFS((subsystem) => {
  console.log(`Visiting subsystem: ${subsystem.name}`);
});

// Process subsystems level by level
let level = 0;
subsystem.hierarchy.traverseBFS((subsystem) => {
  console.log(`Level ${level}: ${subsystem.name}`);
  // Note: This example doesn't track level changes, but BFS visits level by level
});
```

**Use Case:** Process subsystems level by level, such as initializing subsystems in order of depth or broadcasting messages level by level.

**Difference from `traverse()`:**
- `traverse()`: Depth-first (visits entire subtree before next sibling)
- `traverseBFS()`: Breadth-first (visits all children at current level before next level)

## Facet Properties

### `children` (getter)

Direct reference to the underlying `ChildSubsystemRegistry` instance.

**Type:** `ChildSubsystemRegistry`

**Returns:** The `ChildSubsystemRegistry` instance

**Capabilities:**
- **Iteration**: Supports `for...of` loops
- **Inspection**: Methods like `size()`, `list()`, etc.
- **Hierarchy Analysis**: Methods like `getLineage()`

**Example:**
```javascript
// Direct access to registry
const registry = subsystem.hierarchy.children;

// Iterate over children
for (const child of subsystem.hierarchy.children) {
  console.log('Child:', child.name);
}

// Get registry size
const count = subsystem.hierarchy.children.size();
```

**Note:** This provides direct access to the `ChildSubsystemRegistry` API. Prefer using the facet methods (`addChild()`, `removeChild()`, etc.) when possible for better abstraction.

## Lifecycle Methods

### `init()`

Initialize the hierarchy facet. This is called automatically by `BaseSubsystem` after all hooks are built.

**Signature:**
```javascript
init() => void
```

**Behavior:**
- Ensures registry is initialized (lazy initialization)
- Logs debug message if debug is enabled
- Called automatically during subsystem build

**Note:** The registry is initialized lazily when first needed, so this method mainly ensures it exists and logs initialization.

### `dispose()`

Cleanup when subsystem is disposed.

**Signature:**
```javascript
dispose() => void
```

**Behavior:**
- Clears all children from registry
- Resets registry to null
- Logs debug message if debug is enabled
- Called automatically during subsystem disposal

**Example:**
```javascript
// Dispose is called automatically
await subsystem.dispose();
// Registry is cleared and reset
```

## Encapsulated Functionality

The `useHierarchy` hook encapsulates:

1. **ChildSubsystemRegistry Instance**: A `ChildSubsystemRegistry` instance that handles the actual child management logic
2. **Lazy Initialization**: The registry is only created when first needed (first call to any method)
3. **Parent-Child Relationships**: Manages parent-child relationships between subsystems
4. **Name Uniqueness**: Ensures child names are unique within a parent
5. **Lineage Tracking**: Tracks and provides access to ancestor chains
6. **Debug Logging**: Integrates with debug flag for conditional logging

## Usage Patterns

### Basic Usage

```javascript
import { BaseSubsystem } from './base.subsystem.mycelia.js';
import { useHierarchy } from './hooks/hierarchy/use-hierarchy.mycelia.js';

const parent = new BaseSubsystem('server', {
  ms: messageSystem,
  config: {
    hierarchy: {
      debug: true
    }
  }
});

const child1 = new BaseSubsystem('http-bridge', { ms: messageSystem });
const child2 = new BaseSubsystem('websocket-bridge', { ms: messageSystem });

parent
  .use(useHierarchy)
  .build();

// Register children
parent.hierarchy.addChild(child1);
parent.hierarchy.addChild(child2);

// Query children
const children = parent.hierarchy.listChildren();
console.log(`Server has ${children.length} children`);

// Get specific child
const httpBridge = parent.hierarchy.getChild('http-bridge');
```

### With Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useHierarchy
});

await subsystem.build();

// Hierarchy is already available
subsystem.hierarchy.addChild(child);
```

### Hierarchical Structure

```javascript
// Create hierarchy: kernel -> server -> http-bridge
const kernel = new BaseSubsystem('kernel', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

const server = new BaseSubsystem('server', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

const httpBridge = new BaseSubsystem('http-bridge', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

await kernel.build();
await server.build();
await httpBridge.build();

// Build hierarchy
kernel.hierarchy.addChild(server);
server.hierarchy.addChild(httpBridge);

// Get lineage
const lineage = httpBridge.hierarchy.getLineage();
console.log(lineage.map(n => n.name));
// ["kernel", "server", "http-bridge"]
```

### Dynamic Child Management

```javascript
// Add children dynamically
parent.hierarchy.addChild(newChild);

// Remove children
const removed = parent.hierarchy.removeChild('old-child');
if (removed) {
  console.log('Child removed successfully');
}

// Check if child exists
const child = parent.hierarchy.getChild('child-name');
if (child) {
  console.log('Child exists:', child.name);
} else {
  console.log('Child not found');
}
```

### Iterating Over Children

```javascript
// Using listChildren()
const children = parent.hierarchy.listChildren();
children.forEach(child => {
  console.log(`Child: ${child.name}`);
});

// Using direct registry access
for (const child of parent.hierarchy.children) {
  console.log(`Child: ${child.name}`);
}
```

### Traversing Hierarchy

```javascript
// Depth-first traversal (visits entire subtree before next sibling)
subsystem.hierarchy.traverse((subsystem) => {
  console.log(`Visiting: ${subsystem.name}`);
  // Process subsystem
});

// Breadth-first traversal (visits all at current level before next level)
subsystem.hierarchy.traverseBFS((subsystem) => {
  console.log(`Visiting: ${subsystem.name}`);
  // Process subsystem level by level
});

// Collect all subsystem names in hierarchy
const allNames = [];
subsystem.hierarchy.traverse((subsystem) => {
  allNames.push(subsystem.name);
});
console.log('All subsystems:', allNames);
```

## Error Handling

- **Duplicate Child Names**: `addChild()` throws an error if a child with the same name already exists
- **Invalid Child**: `addChild()` validates the child and throws if invalid
- **Child Not Found**: `getChild()` returns `undefined` if child not found
- **Remove Non-Existent**: `removeChild()` returns `false` if child not found

**Example:**
```javascript
try {
  parent.hierarchy.addChild(child1);
  parent.hierarchy.addChild(child2);  // Same name as child1
  // ❌ Error: Child with name 'child-name' already exists
} catch (error) {
  console.error('Failed to add child:', error.message);
}
```

## Debug Logging

The hook uses the logger utility for debug output:

```javascript
// Enable debug in config
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    hierarchy: {
      debug: true
    }
  }
});
```

Debug messages include:
- Registry initialization
- Child addition
- Child removal
- Registry disposal

## Dependencies

The `useHierarchy` hook has no required facets and can be installed independently.

**Installation Order:**
The hook should be installed early in the canonical default hook order to ensure other hooks (like schedulers or bridges) can rely on hierarchical context.

## Best Practices

1. **Install Early**: Install `useHierarchy` early in the hook order
2. **Unique Names**: Ensure child names are unique within a parent
3. **Build Before Adding**: Build child subsystems before adding them to parents
4. **Clean Up**: Children are automatically cleaned up during disposal
5. **Use Lineage**: Use `getLineage()` to understand subsystem relationships
6. **Check Before Adding**: Check if child exists before adding to avoid errors

## Integration with BaseSubsystem

The `useHierarchy` hook provides parent management methods that `BaseSubsystem` delegates to:

- **`setParent()`**: Sets the parent subsystem (operates on `subsystem._parent`)
- **`getParent()`**: Returns the parent subsystem
- **`isRoot()`**: Returns `true` if no parent
- **`getRoot()`**: Returns root subsystem by traversing up the parent chain

**Delegation Pattern:**
When `BaseSubsystem` methods (`setParent()`, `getParent()`, `isRoot()`, `getRoot()`) are called, they check for the hierarchy facet and delegate to it if present. If the hierarchy facet is not available, `BaseSubsystem` falls back to direct access to `_parent`.

**Example:**
```javascript
parent.hierarchy.addChild(child);

// Child's parent is automatically set via addChild()
// These methods delegate to hierarchy facet if present
console.log(child.getParent().name);  // "parent"
console.log(child.isRoot());           // false
console.log(child.getRoot().name);     // "kernel" (if kernel is root)
console.log(child.getNameString());    // "kernel://parent/child"

// Can also use hierarchy facet directly
console.log(child.hierarchy.getParent().name);  // "parent"
console.log(child.hierarchy.isRoot());          // false
console.log(child.hierarchy.getRoot().name);    // "kernel"
```

**Note:** Parent state is stored in `subsystem._parent`. The hierarchy facet methods operate on this property, ensuring a single source of truth.

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [ChildSubsystemRegistry](./child-subsystem-registry.mycelia.js) - The underlying registry implementation
- [Debug Flag Utilities](../../DEBUG-FLAG-UTILS.md) - Debug flag extraction
- [Logger Utilities](../../LOGGER-UTILS.md) - Logging abstraction

