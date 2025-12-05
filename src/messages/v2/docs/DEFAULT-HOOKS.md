# Default Hooks

## Overview

The **DefaultHooks** class and factory functions provide a convenient way to manage the default set of hooks for subsystems. They offer pre-configured hook collections for different subsystem types, making it easy to get started with common subsystem configurations.

**Key Features:**
- **Lightweight Wrapper**: Simple container for managing an ordered list of hooks
- **Two Presets**: Canonical (async) and Synchronous (kernel-like) default hook sets
- **Flexible Management**: Add, remove, clear, and fork hook collections
- **Build-Time Resolution**: Actual dependency order is resolved at build time via topological sort

## What is DefaultHooks?

`DefaultHooks` is a lightweight class that wraps an array of hook functions. It provides methods to manage the hook list and integrates with the subsystem build system.

**Purpose:**
- Provide a consistent way to manage default hooks
- Support different subsystem types (async vs synchronous)
- Allow customization through add/remove operations
- Enable forking for inheritance scenarios

**Important:** The order of hooks in `DefaultHooks` is not the execution order. The build system uses topological sorting to resolve the correct initialization order based on dependencies.

## DefaultHooks Class

### Constructor

```javascript
new DefaultHooks(hooks = [])
```

**Parameters:**
- `hooks` (Array<Function>, optional) - Array of hook functions to initialize with

**Returns:** `DefaultHooks` instance

**Example:**
```javascript
import { DefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { useQueue, useRouter } from './hooks/...';

const defaultHooks = new DefaultHooks([useQueue, useRouter]);
```

### Methods

#### `add(hook)`

Adds a hook to the collection.

**Signature:**
```javascript
add(hook) => DefaultHooks
```

**Parameters:**
- `hook` (Function, required) - Hook function to add

**Returns:** `DefaultHooks` - Returns `this` for method chaining

**Throws:**
- `Error` - If hook is not a function

**Example:**
```javascript
const defaultHooks = new DefaultHooks()
  .add(useQueue)
  .add(useRouter)
  .add(useScheduler);
```

#### `remove(hook)`

Removes a hook from the collection.

**Signature:**
```javascript
remove(hook) => DefaultHooks
```

**Parameters:**
- `hook` (Function, required) - Hook function to remove

**Returns:** `DefaultHooks` - Returns `this` for method chaining

**Example:**
```javascript
const defaultHooks = createCanonicalDefaultHooks()
  .remove(useQueries);  // Remove queries hook
```

#### `clear()`

Removes all hooks from the collection.

**Signature:**
```javascript
clear() => DefaultHooks
```

**Returns:** `DefaultHooks` - Returns `this` for method chaining

**Example:**
```javascript
const defaultHooks = new DefaultHooks()
  .clear();  // Start with empty collection
```

#### `list()`

Returns a copy of the hooks array.

**Signature:**
```javascript
list() => Array<Function>
```

**Returns:** `Array<Function>` - Copy of the hooks array

**Example:**
```javascript
const defaultHooks = createCanonicalDefaultHooks();
const hooks = defaultHooks.list();  // Get array of hooks
```

**Use Case:** This method is used by the build system to extract hooks from `DefaultHooks` instances.

#### `fork()`

Creates a new `DefaultHooks` instance with a copy of the current hooks.

**Signature:**
```javascript
fork() => DefaultHooks
```

**Returns:** `DefaultHooks` - New instance with copied hooks

**Example:**
```javascript
const baseHooks = createCanonicalDefaultHooks();
const customHooks = baseHooks.fork()
  .add(useCustom)
  .remove(useQueries);
```

**Use Case:** Useful for inheriting hooks from a parent subsystem without mutating the original.

## Factory Functions

Two factory functions provide pre-configured hook sets for different subsystem types.

### createCanonicalDefaultHooks()

Creates the canonical (baseline) default hooks for **asynchronous subsystems**.

**Signature:**
```javascript
createCanonicalDefaultHooks() => DefaultHooks
```

**Returns:** `DefaultHooks` instance with canonical hooks

**Hooks Included:**
1. `useHierarchy` - Parent-child relationship management
2. `useRouter` - Message routing
3. `useMessageProcessor` - Message processing
4. `useQueue` - Message queue management
5. `useScheduler` - Message scheduling
6. `useListeners` - Event listeners
7. `useStatistics` - Statistics tracking
8. `useQueries` - Query handling

**When to Use:**
- Most asynchronous subsystems
- Subsystems that need message queuing and scheduling
- General-purpose subsystems that process messages asynchronously

**Example:**
```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});
```

**Characteristics:**
- Includes queue and scheduler for async message processing
- Full-featured for most use cases
- Supports complex message flows

### createSynchronousDefaultHooks()

Creates default hooks for **synchronous subsystems** (kernel-like subsystems).

**Signature:**
```javascript
createSynchronousDefaultHooks() => DefaultHooks
```

**Returns:** `DefaultHooks` instance with synchronous hooks

**Hooks Included:**
1. `useListeners` - Event listeners
2. `useStatistics` - Statistics tracking
3. `useQueries` - Query handling
4. `useRouter` - Message routing
5. `useQueue` - Message queue management
6. `useMessageProcessor` - Message processing
7. `useSynchronous` - Synchronous message processing (replaces queue/scheduler pattern)
8. `useHierarchy` - Parent-child relationship management

**When to Use:**
- Kernel-like subsystems
- Subsystems that process messages synchronously
- Subsystems that don't need async queuing and scheduling
- Low-latency subsystems

**Example:**
```javascript
import { createSynchronousDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const kernel = new BaseSubsystem('kernel', {
  ms: messageSystem,
  defaultHooks: createSynchronousDefaultHooks()
});
```

**Characteristics:**
- Uses `useSynchronous` instead of queue/scheduler pattern
- Optimized for synchronous processing
- Lower latency, simpler execution model

## FACET_KINDS Constants

The `FACET_KINDS` constant object provides type-safe constants for all facet kind identifiers used in the default hooks. Instead of using string literals throughout your code, you should use these constants to prevent typos and ensure consistency.

### Overview

`FACET_KINDS` is an object mapping constant names to facet kind strings. It includes all facet kinds used by the default hooks:

- `FACET_KINDS.HIERARCHY` → `'hierarchy'`
- `FACET_KINDS.ROUTER` → `'router'`
- `FACET_KINDS.PROCESSOR` → `'processor'`
- `FACET_KINDS.QUEUE` → `'queue'`
- `FACET_KINDS.SCHEDULER` → `'scheduler'`
- `FACET_KINDS.LISTENERS` → `'listeners'`
- `FACET_KINDS.STATISTICS` → `'statistics'`
- `FACET_KINDS.SYNCHRONOUS` → `'synchronous'`
- `FACET_KINDS.QUERIES` → `'queries'`

### Importing

```javascript
import { FACET_KINDS } from './models/defaults/default-hooks.mycelia.js';
// Or from the main v2 export:
import { FACET_KINDS } from './messages/v2/index.js';
```

### Usage

Use `FACET_KINDS` constants instead of string literals when accessing facets:

```javascript
import { FACET_KINDS } from './messages/v2/index.js';

// ✅ Good - using constants
const router = subsystem.find(FACET_KINDS.ROUTER);
const queue = subsystem.find(FACET_KINDS.QUEUE);
const processor = subsystem.find(FACET_KINDS.PROCESSOR);

// ❌ Avoid - using string literals
const router = subsystem.find('router');
const queue = subsystem.find('queue');
```

### Benefits

1. **Type Safety**: Prevents typos in facet kind strings
2. **IDE Support**: Autocomplete for facet kind constants
3. **Refactoring**: Easy to find and update facet kind references
4. **Consistency**: Single source of truth for facet kind strings
5. **Documentation**: Constants serve as documentation of available facet kinds

### Example: Using FACET_KINDS in BaseSubsystem

The `BaseSubsystem` class uses `FACET_KINDS` internally:

```javascript
// In BaseSubsystem methods
pause() {
  this._isPaused = true;
  this.find(FACET_KINDS.SCHEDULER)?.pauseProcessing?.();
  return this;
}

registerRoute(pattern, handler, routeOptions = {}) {
  const router = this.find(FACET_KINDS.ROUTER);
  if (!router?.registerRoute) {
    throw new Error(`${this.name}: missing router facet`);
  }
  return router.registerRoute(pattern, handler, routeOptions);
}
```

### Example: Checking for Facets

```javascript
import { FACET_KINDS } from './messages/v2/index.js';

// Check if a subsystem has specific facets
if (subsystem.find(FACET_KINDS.ROUTER)) {
  // Router facet is available
  subsystem.registerRoute('pattern', handler);
}

if (subsystem.find(FACET_KINDS.SCHEDULER)) {
  // Scheduler facet is available
  await subsystem.process(timeSlice);
}
```

### Example: Accessing Facets in Hooks

When creating custom hooks, use `FACET_KINDS` to access required facets:

```javascript
import { FACET_KINDS } from './models/defaults/default-hooks.mycelia.js';

export const useCustom = createHook({
  kind: 'custom',
  required: [FACET_KINDS.ROUTER, FACET_KINDS.STATISTICS],
  fn: (ctx, api, subsystem) => {
    const routerFacet = api.__facets[FACET_KINDS.ROUTER];
    const statisticsFacet = api.__facets[FACET_KINDS.STATISTICS];
    
    // Use facets...
  }
});
```

### Note on 'core' Facet Kind

The `'core'` facet kind is not included in `FACET_KINDS` because it's not part of the default hooks. It's a legacy/placeholder kind that may be used in some subsystems. If you need to reference it, use the string literal `'core'` directly:

```javascript
// For 'core' facet (not in default hooks)
const core = subsystem.find('core') || subsystem.find(FACET_KINDS.PROCESSOR);
```

## Differences: Canonical vs Synchronous

### Canonical Default Hooks

**Use Case:** Asynchronous subsystems

**Key Features:**
- Queue-based message processing
- Scheduler for managing message order
- Full async message flow

**Architecture:**
```
Message → Queue → Scheduler → Processor → Handler
```

**Best For:**
- Most subsystems
- Complex message flows
- When you need queuing and scheduling

### Synchronous Default Hooks

**Use Case:** Kernel-like, synchronous subsystems

**Key Features:**
- Direct synchronous processing
- No queue/scheduler overhead
- Lower latency

**Architecture:**
```
Message → Synchronous Processor → Handler
```

**Best For:**
- Kernel subsystems
- Low-latency requirements
- Simple, direct message processing

## Usage Patterns

### Pattern: Using Canonical Defaults

```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

await subsystem.build();
```

### Pattern: Using Synchronous Defaults

```javascript
import { createSynchronousDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const kernel = new BaseSubsystem('kernel', {
  ms: messageSystem,
  defaultHooks: createSynchronousDefaultHooks()
});

await kernel.build();
```

### Pattern: Customizing Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { useCustom } from './hooks/custom/use-custom.mycelia.js';

const defaultHooks = createCanonicalDefaultHooks()
  .add(useCustom)        // Add custom hook
  .remove(useQueries);   // Remove queries hook

const subsystem = new BaseSubsystem('custom', {
  ms: messageSystem,
  defaultHooks
});
```

### Pattern: Forking Default Hooks

```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const baseHooks = createCanonicalDefaultHooks();

// Fork for child subsystem without mutating parent
const childHooks = baseHooks.fork()
  .add(useChildSpecific);

const child = new BaseSubsystem('child', {
  ms: messageSystem,
  parent: parentSubsystem,
  defaultHooks: childHooks
});
```

### Pattern: Starting from Scratch

```javascript
import { DefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { useRouter, useQueue } from './hooks/...';

const defaultHooks = new DefaultHooks()
  .add(useRouter)
  .add(useQueue);

const subsystem = new BaseSubsystem('minimal', {
  ms: messageSystem,
  defaultHooks
});
```

## Integration with Build System

`DefaultHooks` integrates seamlessly with the subsystem build system:

### Build System Usage

The build system (`verifySubsystemBuild`) handles `DefaultHooks` instances:

```javascript
// In verifySubsystemBuild
const defaults = Array.isArray(subsystem.defaultHooks)
  ? subsystem.defaultHooks
  : (subsystem.defaultHooks?.list?.() || []);
```

**Process:**
1. If `defaultHooks` is an array, use it directly
2. If `defaultHooks` is a `DefaultHooks` instance, call `list()` to get hooks
3. Combine with user hooks: `[...defaults, ...user]`

### Hook Execution Order

**Important:** The order of hooks in `DefaultHooks` is **not** the execution order. The build system:

1. Collects all hooks (defaults + user)
2. Extracts hook metadata (dependencies, etc.)
3. Builds a dependency graph
4. Topologically sorts hooks by dependencies
5. Executes hooks in dependency order

**Example:**
```javascript
// DefaultHooks order:
[useHierarchy, useRouter, useMessageProcessor, useQueue, useScheduler]

// Actual execution order (after topo-sort):
[useHierarchy, useRouter, useQueue, useMessageProcessor, useScheduler]
// (queue before processor because processor depends on queue)
```

## Best Practices

1. **Use Factory Functions**: Prefer `createCanonicalDefaultHooks()` or `createSynchronousDefaultHooks()` over creating `DefaultHooks` manually.

2. **Choose the Right Type**: Use canonical defaults for async subsystems, synchronous defaults for kernel-like subsystems.

3. **Fork for Inheritance**: When inheriting hooks from a parent, use `fork()` to avoid mutating the parent's hooks.

4. **Customize After Creation**: Add or remove hooks after creating defaults rather than creating from scratch:

   ```javascript
   // ✅ Good
   const hooks = createCanonicalDefaultHooks().add(useCustom);
   
   // ❌ Less ideal
   const hooks = new DefaultHooks([useHierarchy, useRouter, ..., useCustom]);
   ```

5. **Don't Rely on Order**: Don't assume hooks execute in the order they're added. Dependencies determine execution order.

6. **Use list() for Inspection**: Use `list()` to inspect hooks, but don't modify the returned array directly.

## Common Patterns

### Pattern: Conditional Default Hooks

```javascript
function createDefaultHooks(isKernel = false) {
  return isKernel
    ? createSynchronousDefaultHooks()
    : createCanonicalDefaultHooks();
}

const subsystem = new BaseSubsystem('subsystem', {
  ms: messageSystem,
  defaultHooks: createDefaultHooks(false)
});
```

### Pattern: Extending Defaults

```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { useSecurity, useAuth } from './hooks/security/...';

const secureHooks = createCanonicalDefaultHooks()
  .add(useSecurity)
  .add(useAuth);

const subsystem = new BaseSubsystem('secure-server', {
  ms: messageSystem,
  defaultHooks: secureHooks
});
```

### Pattern: Minimal Configuration

```javascript
import { DefaultHooks } from './models/defaults/default-hooks.mycelia.js';
import { useRouter } from './hooks/router/...';

const minimalHooks = new DefaultHooks()
  .add(useRouter);

const subsystem = new BaseSubsystem('minimal', {
  ms: messageSystem,
  defaultHooks: minimalHooks
});
```

## Error Handling

### Invalid Hook Type

```javascript
const defaultHooks = new DefaultHooks();
defaultHooks.add('not-a-function');  // Error: DefaultHooks.add: hook must be a function
```

### Missing list() Method

The build system expects `DefaultHooks` instances to have a `list()` method. If you create a custom hook container, ensure it implements `list()`:

```javascript
class CustomHooks {
  list() {
    return [...this.hooks];  // Must return array of hooks
  }
}
```

## See Also

- [Base Subsystem](./BASE-SUBSYSTEM.md) - Learn how DefaultHooks is used in BaseSubsystem
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks and how they work
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - See how DefaultHooks is used in the build system
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets created by hooks

## Related Exports

The `default-hooks.mycelia.js` module exports:

- `DefaultHooks` - Class for managing hook collections
- `createCanonicalDefaultHooks()` - Factory for canonical async hooks
- `createSynchronousDefaultHooks()` - Factory for synchronous hooks
- `FACET_KINDS` - Constants for facet kind identifiers

All of these are available from the main v2 export:

```javascript
import {
  DefaultHooks,
  createCanonicalDefaultHooks,
  createSynchronousDefaultHooks,
  FACET_KINDS
} from './messages/v2/index.js';
```

