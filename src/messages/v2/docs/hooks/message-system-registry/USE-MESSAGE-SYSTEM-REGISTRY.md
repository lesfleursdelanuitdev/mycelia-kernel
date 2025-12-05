# useMessageSystemRegistry Hook

## Overview

The `useMessageSystemRegistry` hook provides subsystem registry functionality to subsystems (typically MessageSystem) using `MessageSystemRegistry`. It manages subsystem instances by name with special handling for the kernel subsystem. The registry allows subsystems to be stored, retrieved, and queried, with the kernel subsystem being hidden from find/get operations but included in iteration operations.

**Key Features:**
- **Subsystem Management**: Store, retrieve, and query subsystems by name
- **Kernel Special Handling**: Kernel subsystem is hidden from `find()` and `get()` operations
- **Kernel Protection**: Kernel can only be set once (prevents overwriting)
- **Iteration Support**: Supports iteration over all subsystems (including kernel)
- **Size Tracking**: Tracks number of registered subsystems
- **Debug Support**: Integrated debug logging via logger utilities

## Hook Metadata

```javascript
{
  kind: 'messageSystemRegistry',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'messageSystemRegistry'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing messageSystemRegistry facet
- **`required`**: `[]` - No dependencies (standalone hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.messageSystemRegistry`
- **`source`**: `import.meta.url` - Source file location for debugging

**Note:** This hook is typically used on MessageSystem instances to maintain a registry of all registered subsystems.

## Configuration

The hook reads configuration from `ctx.config.messageSystemRegistry`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

**Example:**
```javascript
const messageSystem = new MessageSystem('main-system', {
  config: {
    messageSystemRegistry: {
      debug: true
    }
  }
});
```

## Facet Methods

### `find(subsystemName)`

Find a subsystem by name. Does not return kernel subsystem (kernel is hidden from find operations).

**Signature:**
```javascript
find(subsystemName) => BaseSubsystem|undefined
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name

**Returns:** `BaseSubsystem|undefined` - Subsystem instance or undefined if not found

**Behavior:**
- Returns `undefined` if subsystem name is `'kernel'` (kernel is hidden)
- Returns subsystem from registry if found
- Returns `undefined` if not found

**Example:**
```javascript
// Find a subsystem
const canvas = messageSystem.messageSystemRegistry.find('canvas');
if (canvas) {
  console.log('Canvas subsystem found');
}

// Kernel is hidden from find
const kernel = messageSystem.messageSystemRegistry.find('kernel');
console.log(kernel); // undefined
```

### `get(subsystemName)`

Get a subsystem by name. Does not return kernel subsystem (kernel is hidden from get operations).

**Signature:**
```javascript
get(subsystemName) => BaseSubsystem|undefined
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name

**Returns:** `BaseSubsystem|undefined` - Subsystem instance or undefined if not found

**Behavior:**
- Returns `undefined` if subsystem name is `'kernel'` (kernel is hidden)
- Returns subsystem from registry if found
- Returns `undefined` if not found

**Note:** `get()` and `find()` have identical behavior (both hide kernel).

**Example:**
```javascript
// Get a subsystem
const canvas = messageSystem.messageSystemRegistry.get('canvas');
if (canvas) {
  console.log('Canvas subsystem found');
}

// Kernel is hidden from get
const kernel = messageSystem.messageSystemRegistry.get('kernel');
console.log(kernel); // undefined
```

### `getNames()`

Get all subsystem names (excluding kernel).

**Signature:**
```javascript
getNames() => string[]
```

**Returns:** `string[]` - Array of subsystem names (kernel excluded)

**Example:**
```javascript
const names = messageSystem.messageSystemRegistry.getNames();
console.log('Registered subsystems:', names);
// ['canvas', 'api', 'database'] (kernel not included)
```

### `set(subsystemName, subsystemInstance)`

Set a subsystem in the registry. Kernel can only be set if it doesn't already exist.

**Signature:**
```javascript
set(subsystemName, subsystemInstance) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name
- `subsystemInstance` (BaseSubsystem, required) - Subsystem instance

**Returns:** `boolean` - `true` if successfully set, `false` if kernel already exists

**Throws:**
- `Error` if name is invalid (not a non-empty string)
- `Error` if subsystem is missing (not an object)

**Behavior:**
- Kernel can only be set once (returns `false` if kernel already exists)
- Other subsystems can be set multiple times (overwrites existing)
- Returns `true` if successfully set

**Example:**
```javascript
// Register a subsystem
const canvasSubsystem = new BaseSubsystem('canvas', { ms: messageSystem });
const success = messageSystem.messageSystemRegistry.set('canvas', canvasSubsystem);

if (success) {
  console.log('Canvas subsystem registered');
}

// Register kernel (can only be set once)
const kernelSet1 = messageSystem.messageSystemRegistry.set('kernel', kernel);
console.log(kernelSet1); // true (first time)

const kernelSet2 = messageSystem.messageSystemRegistry.set('kernel', anotherKernel);
console.log(kernelSet2); // false (kernel already exists)
```

### `has(subsystemName)`

Check if a subsystem exists in the registry.

**Signature:**
```javascript
has(subsystemName) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name

**Returns:** `boolean` - `true` if subsystem exists

**Note:** `has()` returns `true` for kernel if it exists (unlike `find()` and `get()`).

**Example:**
```javascript
// Check if subsystem exists
if (messageSystem.messageSystemRegistry.has('canvas')) {
  console.log('Canvas subsystem is registered');
}

// Check kernel (returns true if kernel exists)
if (messageSystem.messageSystemRegistry.has('kernel')) {
  console.log('Kernel is registered');
}
```

### `delete(subsystemName)`

Delete a subsystem from the registry.

**Signature:**
```javascript
delete(subsystemName) => boolean
```

**Parameters:**
- `subsystemName` (string, required) - Subsystem name

**Returns:** `boolean` - `true` if subsystem was deleted, `false` if not found

**Example:**
```javascript
// Delete a subsystem
const deleted = messageSystem.messageSystemRegistry.delete('canvas');
if (deleted) {
  console.log('Canvas subsystem removed');
}

// Delete kernel (if needed)
const kernelDeleted = messageSystem.messageSystemRegistry.delete('kernel');
```

### `clear()`

Clear all subsystems from the registry.

**Signature:**
```javascript
clear() => void
```

**Example:**
```javascript
messageSystem.messageSystemRegistry.clear();
console.log('All subsystems cleared from registry');
```

### `size` (getter)

Get the number of subsystems in the registry (including kernel).

**Returns:** `number` - Number of subsystems

**Example:**
```javascript
const count = messageSystem.messageSystemRegistry.size;
console.log(`Registry contains ${count} subsystems`);
```

### `values()`

Get all subsystems as an array (including kernel).

**Signature:**
```javascript
values() => BaseSubsystem[]
```

**Returns:** `BaseSubsystem[]` - Array of subsystem instances

**Example:**
```javascript
const allSubsystems = messageSystem.messageSystemRegistry.values();
console.log(`Total subsystems: ${allSubsystems.length}`);

allSubsystems.forEach(subsystem => {
  console.log(`Subsystem: ${subsystem.name}`);
});
```

### `keys()`

Get all subsystem names as an array (including kernel).

**Signature:**
```javascript
keys() => string[]
```

**Returns:** `string[]` - Array of subsystem names

**Example:**
```javascript
const allNames = messageSystem.messageSystemRegistry.keys();
console.log('All subsystem names:', allNames);
// ['kernel', 'canvas', 'api', 'database']
```

### Iteration

The registry is iterable and supports iteration over all subsystems (including kernel).

**Example:**
```javascript
// Iterate over all subsystems
for (const [name, subsystem] of messageSystem.messageSystemRegistry) {
  console.log(`Subsystem: ${name}`);
  console.log(`Instance:`, subsystem);
}

// Convert to array
const entries = [...messageSystem.messageSystemRegistry];
// [[name1, subsystem1], [name2, subsystem2], ...]
```

## Kernel Subsystem Handling

The registry treats the kernel subsystem specially:

### Hidden from Find/Get

The kernel is hidden from `find()` and `get()` operations:

```javascript
// Kernel is hidden
const kernel = registry.find('kernel'); // undefined
const kernel2 = registry.get('kernel'); // undefined

// Other subsystems work normally
const canvas = registry.find('canvas'); // canvas subsystem
```

### Included in Iteration

The kernel is included in iteration operations:

```javascript
// Kernel is included
const names = registry.keys(); // ['kernel', 'canvas', ...]
const subsystems = registry.values(); // [kernel, canvas, ...]

for (const [name, subsystem] of registry) {
  // Includes kernel
  console.log(name, subsystem);
}
```

### Protected from Overwriting

The kernel can only be set once:

```javascript
// First set succeeds
const success1 = registry.set('kernel', kernel); // true

// Second set fails
const success2 = registry.set('kernel', anotherKernel); // false
```

### Checked with Has

The `has()` method returns `true` for kernel if it exists:

```javascript
if (registry.has('kernel')) {
  console.log('Kernel is registered');
}
```

## Usage Patterns

### Registering Subsystems

```javascript
// Register subsystems
const canvas = new BaseSubsystem('canvas', { ms: messageSystem });
const api = new BaseSubsystem('api', { ms: messageSystem });

messageSystem.messageSystemRegistry.set('canvas', canvas);
messageSystem.messageSystemRegistry.set('api', api);

// Register kernel (can only be set once)
messageSystem.messageSystemRegistry.set('kernel', kernel);
```

### Finding Subsystems

```javascript
// Find subsystems (kernel is hidden)
const canvas = messageSystem.messageSystemRegistry.find('canvas');
if (canvas) {
  // Use canvas subsystem
}

// Kernel is not found via find/get
const kernel = messageSystem.messageSystemRegistry.find('kernel');
console.log(kernel); // undefined
```

### Querying Registry

```javascript
// Get all names (excluding kernel)
const names = messageSystem.messageSystemRegistry.getNames();
console.log('Registered subsystems:', names);

// Get all names (including kernel)
const allNames = messageSystem.messageSystemRegistry.keys();
console.log('All subsystems:', allNames);

// Get all subsystems (including kernel)
const allSubsystems = messageSystem.messageSystemRegistry.values();
console.log(`Total: ${allSubsystems.length} subsystems`);

// Check if subsystem exists
if (messageSystem.messageSystemRegistry.has('canvas')) {
  console.log('Canvas is registered');
}
```

### Iterating Over Subsystems

```javascript
// Iterate over all subsystems (including kernel)
for (const [name, subsystem] of messageSystem.messageSystemRegistry) {
  console.log(`Subsystem: ${name}`);
  // Process subsystem
}

// Convert to array
const entries = [...messageSystem.messageSystemRegistry];
```

### Managing Registry

```javascript
// Delete a subsystem
const deleted = messageSystem.messageSystemRegistry.delete('canvas');
if (deleted) {
  console.log('Canvas removed');
}

// Clear all subsystems
messageSystem.messageSystemRegistry.clear();

// Check size
const count = messageSystem.messageSystemRegistry.size;
console.log(`Registry size: ${count}`);
```

## Integration with MessageSystem

The `useMessageSystemRegistry` hook is automatically installed by `MessageSystem`:

```javascript
// MessageSystem includes useMessageSystemRegistry in default hooks
const messageSystem = new MessageSystem('main-system');

await messageSystem.bootstrap();

// Access registry
const registry = messageSystem.messageSystemRegistry;

// Register subsystems
registry.set('canvas', canvasSubsystem);
registry.set('api', apiSubsystem);

// Find subsystems
const canvas = registry.find('canvas');
```

### MessageSystem Methods

The MessageSystem uses the registry for subsystem management:

```javascript
// MessageSystem.registerSubsystem() uses registry
await messageSystem.registerSubsystem(canvasSubsystem);
// Subsystem is automatically added to registry

// MessageSystem.getSubsystem() uses registry
const canvas = messageSystem.getSubsystem('canvas');
// Delegates to registry.find()

// MessageSystem.getSubsystems() uses registry
const subsystems = messageSystem.getSubsystems();
// Delegates to registry.values()
```

## Integration with MessageRouter

The `MessageRouter` uses the registry for routing:

```javascript
// MessageRouter uses registry to find subsystems
const router = messageSystem.messageSystemRouter;

// Router uses registry.get() to find target subsystems
const result = await router.route(message);
// Router looks up subsystem via registry
```

## Error Handling

### Invalid Name

If name is invalid:

```javascript
try {
  registry.set('', subsystem); // Empty string
} catch (error) {
  console.error(error.message);
  // "MessageSystemRegistry.set: name must be a non-empty string"
}
```

### Missing Subsystem

If subsystem is missing:

```javascript
try {
  registry.set('canvas', null);
} catch (error) {
  console.error(error.message);
  // "MessageSystemRegistry.set: subsystem must be an object"
}
```

### Kernel Already Exists

If trying to set kernel when it already exists:

```javascript
// First set succeeds
const success1 = registry.set('kernel', kernel); // true

// Second set fails (returns false, doesn't throw)
const success2 = registry.set('kernel', anotherKernel); // false
if (!success2) {
  console.log('Kernel already exists');
}
```

## Best Practices

1. **Use MessageSystem**: Typically accessed via `MessageSystem`, not created directly
2. **Register After Build**: Register subsystems after they are built
3. **Check for Existence**: Use `has()` to check if subsystem exists before using
4. **Use Find/Get**: Use `find()` or `get()` to retrieve subsystems (kernel is hidden)
5. **Use GetNames**: Use `getNames()` to get subsystem names without kernel
6. **Use Keys/Values**: Use `keys()` or `values()` to get all subsystems including kernel
7. **Iterate Efficiently**: Use iteration for bulk operations

## Performance Considerations

### Lookup Performance

- **Find/Get**: O(1) - Map-based lookup
- **Has**: O(1) - Map-based lookup
- **GetNames**: O(n) - Array creation and filtering
- **Keys/Values**: O(n) - Array creation

### Memory Usage

- Each subsystem reference is stored in a Map
- Minimal memory overhead per subsystem
- Kernel is stored but hidden from find/get operations

## See Also

- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work
- [Facets Documentation](../FACETS.md) - Understanding facet objects
- [MessageSystemRegistry](./MESSAGE-SYSTEM-REGISTRY.md) - MessageSystemRegistry class implementation
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator that uses this hook
- [useMessageSystemRouter](../message-system-router/USE-MESSAGE-SYSTEM-ROUTER.md) - Message router that uses this registry

