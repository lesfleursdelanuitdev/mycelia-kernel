# MessageSystemRegistry Class

## Overview

The `MessageSystemRegistry` class provides a registry for managing subsystem instances by name. It provides methods to store, retrieve, and query subsystems, with special handling for the kernel subsystem. The kernel subsystem is treated specially - it can only be set once and is hidden from `find()` and `get()` operations, but is included in iteration operations.

**Key Features:**
- **Subsystem Management**: Store, retrieve, and query subsystems by name
- **Kernel Special Handling**: Kernel subsystem is hidden from `find()` and `get()` operations
- **Kernel Protection**: Kernel can only be set once (prevents overwriting)
- **Iteration Support**: Supports iteration over all subsystems (including kernel)
- **Size Tracking**: Tracks number of registered subsystems
- **Map-Based Storage**: Uses internal Map for efficient O(1) lookups

## Constructor

### `new MessageSystemRegistry()`

Create a new `MessageSystemRegistry` instance.

**Signature:**
```javascript
new MessageSystemRegistry()
```

**Parameters:**
- None (no parameters required)

**Throws:**
- No constructor errors

**Initialization:**
- Creates internal `Map` for subsystem storage
- Registry starts empty

**Example:**
```javascript
import { MessageSystemRegistry } from '../../models/message-system/message-system-registry.mycelia.js';

// Create registry
const registry = new MessageSystemRegistry();
```

## Core Methods

### `find(name)`

Find a subsystem by name. Does not return kernel subsystem (kernel is hidden from find operations).

**Signature:**
```javascript
find(name) => BaseSubsystem|undefined
```

**Parameters:**
- `name` (string, required) - Subsystem name

**Returns:** `BaseSubsystem|undefined` - Subsystem instance or undefined if not found

**Behavior:**
- Returns `undefined` if subsystem name is `'kernel'` (kernel is hidden)
- Returns subsystem from registry if found
- Returns `undefined` if not found

**Example:**
```javascript
// Find a subsystem
const canvas = registry.find('canvas');
if (canvas) {
  console.log('Canvas subsystem found');
}

// Kernel is hidden from find
const kernel = registry.find('kernel');
console.log(kernel); // undefined
```

### `get(name)`

Get a subsystem by name. Does not return kernel subsystem (kernel is hidden from get operations).

**Signature:**
```javascript
get(name) => BaseSubsystem|undefined
```

**Parameters:**
- `name` (string, required) - Subsystem name

**Returns:** `BaseSubsystem|undefined` - Subsystem instance or undefined if not found

**Behavior:**
- Returns `undefined` if subsystem name is `'kernel'` (kernel is hidden)
- Returns subsystem from registry if found
- Returns `undefined` if not found

**Note:** `get()` and `find()` have identical behavior (both hide kernel).

**Example:**
```javascript
// Get a subsystem
const canvas = registry.get('canvas');
if (canvas) {
  console.log('Canvas subsystem found');
}

// Kernel is hidden from get
const kernel = registry.get('kernel');
console.log(kernel); // undefined
```

### `getNames()`

Get all subsystem names (excluding kernel).

**Signature:**
```javascript
getNames() => string[]
```

**Returns:** `string[]` - Array of subsystem names (kernel excluded)

**Behavior:**
- Returns array of all subsystem names
- Filters out `'kernel'` from the result
- Returns empty array if no subsystems registered

**Example:**
```javascript
const names = registry.getNames();
console.log('Registered subsystems:', names);
// ['canvas', 'api', 'database'] (kernel not included)
```

### `set(name, subsystem)`

Set a subsystem in the registry. Kernel can only be set if it doesn't already exist.

**Signature:**
```javascript
set(name, subsystem) => boolean
```

**Parameters:**
- `name` (string, required) - Subsystem name
- `subsystem` (BaseSubsystem, required) - Subsystem instance

**Returns:** `boolean` - `true` if successfully set, `false` if kernel already exists

**Throws:**
- `Error` - If name is invalid (not a non-empty string)
- `Error` - If subsystem is missing (not an object)

**Behavior:**
- Kernel can only be set once (returns `false` if kernel already exists)
- Other subsystems can be set multiple times (overwrites existing)
- Returns `true` if successfully set

**Example:**
```javascript
// Register a subsystem
const canvasSubsystem = new BaseSubsystem('canvas', { ms: messageSystem });
const success = registry.set('canvas', canvasSubsystem);

if (success) {
  console.log('Canvas subsystem registered');
}

// Register kernel (can only be set once)
const kernelSet1 = registry.set('kernel', kernel);
console.log(kernelSet1); // true (first time)

const kernelSet2 = registry.set('kernel', anotherKernel);
console.log(kernelSet2); // false (kernel already exists)
```

### `has(name)`

Check if a subsystem exists in the registry.

**Signature:**
```javascript
has(name) => boolean
```

**Parameters:**
- `name` (string, required) - Subsystem name

**Returns:** `boolean` - `true` if subsystem exists

**Behavior:**
- Returns `true` if subsystem exists in registry
- Returns `false` if not found
- **Note:** `has()` returns `true` for kernel if it exists (unlike `find()` and `get()`)

**Example:**
```javascript
// Check if subsystem exists
if (registry.has('canvas')) {
  console.log('Canvas subsystem is registered');
}

// Check kernel (returns true if kernel exists)
if (registry.has('kernel')) {
  console.log('Kernel is registered');
}
```

### `delete(name)`

Delete a subsystem from the registry.

**Signature:**
```javascript
delete(name) => boolean
```

**Parameters:**
- `name` (string, required) - Subsystem name

**Returns:** `boolean` - `true` if subsystem was deleted, `false` if not found

**Behavior:**
- Removes subsystem from registry
- Returns `true` if subsystem was deleted
- Returns `false` if subsystem was not found

**Example:**
```javascript
// Delete a subsystem
const deleted = registry.delete('canvas');
if (deleted) {
  console.log('Canvas subsystem removed');
}

// Delete kernel (if needed)
const kernelDeleted = registry.delete('kernel');
```

### `clear()`

Clear all subsystems from the registry.

**Signature:**
```javascript
clear() => void
```

**Behavior:**
- Removes all subsystems from registry
- Registry becomes empty
- Kernel is also cleared

**Example:**
```javascript
registry.clear();
console.log('All subsystems cleared from registry');
```

## Properties

### `size` (getter)

Get the number of subsystems in the registry (including kernel).

**Returns:** `number` - Number of subsystems

**Example:**
```javascript
const count = registry.size;
console.log(`Registry contains ${count} subsystems`);
```

## Iteration Methods

### `values()`

Get all subsystems as an array (including kernel).

**Signature:**
```javascript
values() => BaseSubsystem[]
```

**Returns:** `BaseSubsystem[]` - Array of subsystem instances

**Behavior:**
- Returns array of all subsystem instances
- Includes kernel if it exists
- Returns empty array if no subsystems registered

**Example:**
```javascript
const allSubsystems = registry.values();
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

**Behavior:**
- Returns array of all subsystem names
- Includes `'kernel'` if it exists
- Returns empty array if no subsystems registered

**Example:**
```javascript
const allNames = registry.keys();
console.log('All subsystem names:', allNames);
// ['kernel', 'canvas', 'api', 'database']
```

### Iteration (Symbol.iterator)

The registry is iterable and supports iteration over all subsystems (including kernel).

**Example:**
```javascript
// Iterate over all subsystems
for (const [name, subsystem] of registry) {
  console.log(`Subsystem: ${name}`);
  console.log(`Instance:`, subsystem);
}

// Convert to array
const entries = [...registry];
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
import { MessageSystemRegistry } from './message-system-registry.mycelia.js';

// Create registry
const registry = new MessageSystemRegistry();

// Register subsystems
const canvas = new BaseSubsystem('canvas', { ms: messageSystem });
const api = new BaseSubsystem('api', { ms: messageSystem });

registry.set('canvas', canvas);
registry.set('api', api);

// Register kernel (can only be set once)
registry.set('kernel', kernel);
```

### Finding Subsystems

```javascript
// Find subsystems (kernel is hidden)
const canvas = registry.find('canvas');
if (canvas) {
  // Use canvas subsystem
}

// Kernel is not found via find/get
const kernel = registry.find('kernel');
console.log(kernel); // undefined
```

### Querying Registry

```javascript
// Get all names (excluding kernel)
const names = registry.getNames();
console.log('Registered subsystems:', names);

// Get all names (including kernel)
const allNames = registry.keys();
console.log('All subsystems:', allNames);

// Get all subsystems (including kernel)
const allSubsystems = registry.values();
console.log(`Total: ${allSubsystems.length} subsystems`);

// Check if subsystem exists
if (registry.has('canvas')) {
  console.log('Canvas is registered');
}
```

### Iterating Over Subsystems

```javascript
// Iterate over all subsystems (including kernel)
for (const [name, subsystem] of registry) {
  console.log(`Subsystem: ${name}`);
  // Process subsystem
}

// Convert to array
const entries = [...registry];
```

### Managing Registry

```javascript
// Delete a subsystem
const deleted = registry.delete('canvas');
if (deleted) {
  console.log('Canvas removed');
}

// Clear all subsystems
registry.clear();

// Check size
const count = registry.size;
console.log(`Registry size: ${count}`);
```

## Integration with MessageSystem

The `MessageSystemRegistry` is used by `MessageSystem`:

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

## Best Practices

1. **Use MessageSystem**: Typically accessed via `MessageSystem`, not created directly
2. **Register After Build**: Register subsystems after they are built
3. **Check for Existence**: Use `has()` to check if subsystem exists before using
4. **Use Find/Get**: Use `find()` or `get()` to retrieve subsystems (kernel is hidden)
5. **Use GetNames**: Use `getNames()` to get subsystem names without kernel
6. **Use Keys/Values**: Use `keys()` or `values()` to get all subsystems including kernel
7. **Iterate Efficiently**: Use iteration for bulk operations

## See Also

- [useMessageSystemRegistry](./USE-MESSAGE-SYSTEM-REGISTRY.md) - Hook that provides MessageSystemRegistry functionality
- [Message System](../../message/MESSAGE-SYSTEM.md) - Central coordinator that uses MessageSystemRegistry
- [MessageRouter](../message-system-router/MESSAGE-ROUTER.md) - Message router that uses this registry
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem that is specially handled





