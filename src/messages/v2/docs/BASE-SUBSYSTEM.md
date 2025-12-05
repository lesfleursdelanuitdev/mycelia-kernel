# Base Subsystem

## Overview

The **BaseSubsystem** class is the core building block of the Mycelia Kernel message system. It provides a flexible, extensible architecture for creating subsystems that can process messages, manage state, and integrate with other subsystems.

**Key Features:**
- **Hook-Based Architecture**: Extend functionality through hooks that create facets
- **Facet Management**: Automatic management of facets through FacetManager
- **Hierarchical Structure**: Support for parent-child subsystem relationships
- **Lifecycle Management**: Built-in build and dispose lifecycle
- **Message Processing**: Accept and process messages through facets
- **State Management**: Built-in state tracking (built status)

## What is BaseSubsystem?

`BaseSubsystem` is a base class that provides the foundation for all subsystems in the Mycelia Kernel. It manages:

- **Hooks**: Functions that create facets to extend functionality
- **Facets**: Objects that provide specific capabilities (routing, queuing, scheduling, etc.)
- **Context**: Configuration and system services
- **Lifecycle**: Build and dispose operations
- **Hierarchy**: Parent-child relationships
- **State**: Built status (pause/resume state managed by scheduler facet)

**Architecture:**
```
BaseSubsystem
├─ Hooks (defaultHooks + hooks)
│  └─ Create Facets
├─ FacetManager (api.__facets)
│  └─ Manages Facets
├─ SubsystemBuilder (_builder)
│  └─ Orchestrates Build
└─ Context (ctx)
   └─ Configuration & Services
```

## Constructor

### Signature

```javascript
new BaseSubsystem(name, options = {})
```

### Parameters

#### `name` (string, required)

The unique name for the subsystem. This name is used for:
- Identification and logging
- Hierarchy path construction
- API object (`api.name`)

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

**Example:**
```javascript
const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem });
```

#### `options` (object, optional)

Configuration options for the subsystem.

##### `options.ms` (MessageSystem, required)

The MessageSystem instance that this subsystem belongs to. This provides:
- System-level services
- Cross-subsystem communication
- Global scheduling
- Subsystem registration

**Validation:**
- Must be provided
- Throws `Error` if missing

**Example:**
```javascript
const subsystem = new BaseSubsystem('server', {
  ms: messageSystem  // Required
});
```

##### `options.config` (object, optional)

Configuration object keyed by facet kind. Each key corresponds to a facet kind (e.g., 'router', 'queue', 'scheduler'), and each value is the configuration object for that specific hook/facet.

**Structure:**
```javascript
{
  queue: { maxSize: 100, policy: 'drop-oldest' },
  router: { strict: true, debug: false },
  scheduler: { strategy: 'priority', maxMessagesPerSlice: 10 }
}
```

**Usage:**
- Passed to hooks via `ctx.config`
- Extracted by hooks using `ctx.config?.<kind>`
- Merged with existing context during build

**Example:**
```javascript
const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  config: {
    queue: { maxSize: 1000 },
    router: { strict: true },
    scheduler: { strategy: 'priority' }
  }
});
```

**Default:** `{}` (empty object)

##### `options.defaultHooks` (DefaultHooks | Array<Function>, optional)

Default hooks to use for this subsystem. Can be:
- A `DefaultHooks` instance (from `createCanonicalDefaultHooks()` or `createSynchronousDefaultHooks()`)
- An array of hook functions

**Usage:**
- Combined with user hooks (`hooks` array) during build
- Processed in order: defaults first, then user hooks
- Dependency order resolved via topological sort

**Example:**
```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});
```

**Default:** `undefined` (no default hooks)

##### `options.debug` (boolean, optional)

Enable debug logging for this subsystem.

**Usage:**
- Logs build/dispose events
- Logs errors during disposal
- Passed to hooks via `ctx.debug`

**Example:**
```javascript
const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  debug: true  // Enable debug logging
});
```

**Default:** `false`

### Return Value

Returns a new `BaseSubsystem` instance.

### Throws

- `Error` - If `name` is not a non-empty string
- `Error` - If `options.ms` is not provided

### Example

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    queue: { maxSize: 100 },
    router: { strict: true }
  },
  defaultHooks: createCanonicalDefaultHooks(),
  debug: true
});
```

## Properties

### Public Properties

#### `name` (string, readonly)

The unique name of the subsystem. Set during construction and cannot be changed.

**Usage:**
- Identification
- Logging
- Hierarchy path construction

**Example:**
```javascript
console.log(subsystem.name);  // 'my-subsystem'
```

#### `options` (object, readonly)

The original options object passed to the constructor. Stored for reference.

**Usage:**
- Access original configuration
- Debugging

**Example:**
```javascript
console.log(subsystem.options.config);  // Original config
```

#### `debug` (boolean, readonly)

Debug flag for this subsystem. Set from `options.debug`.

**Usage:**
- Control debug logging
- Passed to hooks via `ctx.debug`

**Example:**
```javascript
if (subsystem.debug) {
  console.log('Debug mode enabled');
}
```

#### `messageSystem` (MessageSystem, readonly)

Reference to the MessageSystem instance. Set from `options.ms`.

**Usage:**
- Access system-level services
- Cross-subsystem communication

**Example:**
```javascript
await subsystem.messageSystem.sendMessage('path://to/subsystem', message);
```

#### `ctx` (object, readonly)

The context object containing system services and configuration. Structure:

```javascript
{
  ms: MessageSystem,        // MessageSystem instance
  config: {                  // Configuration keyed by facet kind
    queue: { /* ... */ },
    router: { /* ... */ },
    graphCache: { capacity: 100 }  // Optional graph cache config
  },
  debug: boolean,            // Debug flag
  graphCache: DependencyGraphCache  // Set during build (if not provided)
}
```

**Usage:**
- Passed to hooks during execution
- Updated during build with resolved context
- Used by facets for configuration
- `graphCache` is set during build (inherited from parent, provided in ctx, or created with default capacity)

**Example:**
```javascript
const config = subsystem.ctx.config?.queue || {};
const graphCache = subsystem.ctx.graphCache; // Available after build
```

#### `defaultHooks` (DefaultHooks | Array<Function> | undefined)

Default hooks for this subsystem. Set from `options.defaultHooks`.

**Usage:**
- Combined with user hooks during build
- Processed by build system

**Example:**
```javascript
if (subsystem.defaultHooks) {
  const hooks = Array.isArray(subsystem.defaultHooks)
    ? subsystem.defaultHooks
    : subsystem.defaultHooks.list();
  console.log('Default hooks:', hooks.length);
}
```

#### `hooks` (Array<Function>)

Array of user-provided hooks. Initially empty, populated via `use()` method.

**Usage:**
- Add custom hooks via `use()`
- Combined with `defaultHooks` during build

**Example:**
```javascript
subsystem.use(useCustom);
console.log(subsystem.hooks.length);  // 1
```

#### `api` (object, readonly)

The subsystem API object. Structure:

```javascript
{
  name: string,              // Subsystem name
  __facets: FacetManager     // FacetManager instance
}
```

**Usage:**
- Access FacetManager via `api.__facets`
- Passed to hooks during execution
- Used by facets to access other facets

**Example:**
```javascript
const queueFacet = subsystem.api.__facets.find('queue');
// Or using Proxy:
const queueFacet = subsystem.api.__facets.queue;
```

### Private Properties

#### `_isBuilt` (boolean, private)

Internal flag indicating whether the subsystem has been built.

**Usage:**
- Checked by `build()` to prevent re-building
- Set to `true` after successful build
- Set to `false` after disposal

**Access:** Via `isBuilt` getter

#### `_buildPromise` (Promise | null, private)

Promise for the current build operation. Used to prevent concurrent builds.

**Usage:**
- Track in-progress builds
- Return same promise if build already in progress

#### `_disposePromise` (Promise | null, private)

Promise for the current dispose operation. Used to prevent concurrent disposal.

**Usage:**
- Track in-progress disposal
- Return same promise if disposal already in progress

#### `_builder` (SubsystemBuilder, private)

The SubsystemBuilder instance for this subsystem.

**Usage:**
- Orchestrates build process
- Manages context and plans
- Created during construction

**Access:** Used internally by `build()` and `dispose()`

#### `_initCallbacks` (Array<Function>, private)

Array of initialization callbacks registered via `onInit()`.

**Usage:**
- Called after successful build
- Receives `(api, ctx)` parameters

#### `_disposeCallbacks` (Array<Function>, private)

Array of disposal callbacks registered via `onDispose()`.

**Usage:**
- Called during disposal
- Best-effort execution (errors logged but don't stop disposal)

#### `_parent` (BaseSubsystem | null, private)

Reference to the parent subsystem. Set via `setParent()`.

**Usage:**
- Hierarchy management
- Name string construction

**Access:** Via `getParent()` method

#### `coreProcessor` (Facet | null, private)

Reference to the core processor facet. Set during build based on subsystem type.

**Usage:**
- Used by `accept()` and `process()` methods
- Set to `synchronous` facet if `api.isSynchronous === true`
- Set to `processor` facet otherwise
- Set to `null` after disposal

**Access:** Used internally by `accept()` and `process()` methods

## Methods

### Hierarchy Management

These methods delegate to the `hierarchy` facet if it exists (from `useHierarchy` hook), otherwise fall back to direct access to `_parent`.

#### `setParent(parent)`

Assigns a parent subsystem to this subsystem.

**Signature:**
```javascript
setParent(parent) => BaseSubsystem
```

**Parameters:**
- `parent` (BaseSubsystem | null, required) - The parent subsystem, or `null` to remove parent

**Returns:** `BaseSubsystem` - Returns `this` for method chaining

**Behavior:**
- If `hierarchy` facet exists, delegates to `hierarchy.setParent(parent)`
- If `hierarchy` facet does not exist, sets `this._parent` directly (fallback)

**Side Effects:**
- Sets `_parent` property (either via hierarchy facet or directly)
- Updates hierarchy relationships

**Throws:**
- `Error` - If `parent` is provided but is not an object

**Example:**
```javascript
const parent = new BaseSubsystem('parent', { ms: messageSystem });
const child = new BaseSubsystem('child', { ms: messageSystem });

await parent.build();
await child.build();

// Delegates to hierarchy facet if present
child.setParent(parent);

// Or use hierarchy facet directly
child.hierarchy.setParent(parent);
```

**Use Case:** Called during child subsystem registration. Works with or without `useHierarchy` hook.

#### `getParent()`

Retrieves the parent subsystem.

**Signature:**
```javascript
getParent() => BaseSubsystem | null
```

**Returns:** `BaseSubsystem | null` - The parent subsystem, or `null` if root

**Behavior:**
- If `hierarchy` facet exists, delegates to `hierarchy.getParent()`
- If `hierarchy` facet does not exist, returns `this._parent` directly (fallback)

**Side Effects:** None

**Example:**
```javascript
const parent = child.getParent();
if (parent) {
  console.log('Has parent:', parent.name);
}

// Or use hierarchy facet directly
const parent = child.hierarchy.getParent();
```

#### `isRoot()`

Checks if this subsystem has no parent (i.e., is a root subsystem).

**Signature:**
```javascript
isRoot() => boolean
```

**Returns:** `boolean` - `true` if root, `false` otherwise

**Behavior:**
- If `hierarchy` facet exists, delegates to `hierarchy.isRoot()`
- If `hierarchy` facet does not exist, returns `this._parent === null` (fallback)

**Side Effects:** None

**Example:**
```javascript
if (subsystem.isRoot()) {
  console.log('This is a root subsystem');
}

// Or use hierarchy facet directly
if (subsystem.hierarchy.isRoot()) {
  console.log('This is a root subsystem');
}
```

#### `getNameString()`

Returns a fully-qualified subsystem name string.

**Signature:**
```javascript
getNameString() => string
```

**Returns:** `string` - Fully-qualified name string

**Format:**
- Root subsystem: `"name://"`
- Child subsystem: `"parent://child"`
- Grandchild: `"parent://child/grandchild"`

**Side Effects:** None

**Example:**
```javascript
const root = new BaseSubsystem('kernel', { ms: messageSystem });
console.log(root.getNameString());  // "kernel://"

const child = new BaseSubsystem('cache', { ms: messageSystem });
child.setParent(root);
console.log(child.getNameString());  // "kernel://cache"
```

#### `getRoot()`

Returns the root subsystem by traversing up the parent chain.

**Signature:**
```javascript
getRoot() => BaseSubsystem
```

**Returns:** `BaseSubsystem` - The root subsystem (subsystem with no parent)

**Behavior:**
- If `hierarchy` facet exists, delegates to `hierarchy.getRoot()`
- If `hierarchy` facet does not exist, implements traversal logic (fallback)
- Traverses up the parent chain until finding a subsystem with `_parent === null`
- Returns the root subsystem
- If called on a root subsystem, returns itself

**Side Effects:** None

**Example:**
```javascript
const root = new BaseSubsystem('kernel', { ms: messageSystem });
const child = new BaseSubsystem('cache', { ms: messageSystem });
const grandchild = new BaseSubsystem('manager', { ms: messageSystem });

await root.build();
await child.build();
await grandchild.build();

child.setParent(root);
grandchild.setParent(child);

console.log(grandchild.getRoot().name);  // "kernel"
console.log(child.getRoot().name);       // "kernel"
console.log(root.getRoot().name);        // "kernel" (returns itself)

// Or use hierarchy facet directly
console.log(grandchild.hierarchy.getRoot().name);  // "kernel"
```

**Use Case:** Access the root subsystem from any subsystem in the hierarchy. Works with or without `useHierarchy` hook.

### State Getters

#### `isBuilt` (getter)

Returns whether the subsystem has been built.

**Signature:**
```javascript
get isBuilt() => boolean
```

**Returns:** `boolean` - `true` if built, `false` otherwise

**Side Effects:** None

**Example:**
```javascript
if (!subsystem.isBuilt) {
  await subsystem.build();
}
```

#### `capabilities` (getter)

Returns an array of all facet kinds (capabilities) available on this subsystem.

**Signature:**
```javascript
get capabilities() => Array<string>
```

**Returns:** `Array<string>` - Array of facet kind identifiers

**Side Effects:** None

**Example:**
```javascript
const capabilities = subsystem.capabilities;
console.log('Available capabilities:', capabilities);
// ['listeners', 'statistics', 'queue', 'scheduler', 'router']
```

**Use Case:** Introspect subsystem capabilities, check if a specific facet is available, or display subsystem features.

### Hook Registration

#### `use(hook)`

Registers a user hook to be executed during build.

**Signature:**
```javascript
use(hook) => BaseSubsystem
```

**Parameters:**
- `hook` (Function, required) - Hook function to register

**Returns:** `BaseSubsystem` - Returns `this` for method chaining

**Side Effects:**
- Adds hook to `hooks` array
- Hook will be executed during next build

**Throws:**
- `Error` - If subsystem is already built
- `Error` - If hook is not a function

**Example:**
```javascript
import { useCustom } from './hooks/custom/use-custom.mycelia.js';

subsystem
  .use(useCustom)
  .use(useAnother);
```

**Use Case:** Add custom hooks before building.

#### `onInit(cb)`

Registers a callback to be invoked after successful build.

**Signature:**
```javascript
onInit(cb) => BaseSubsystem
```

**Parameters:**
- `cb` (Function, required) - Callback function

**Callback Signature:**
```javascript
cb(api, ctx) => void | Promise<void>
```

**Callback Parameters:**
- `api` (object) - Subsystem API object (`{ name, __facets }`)
- `ctx` (object) - Resolved context object

**Returns:** `BaseSubsystem` - Returns `this` for method chaining

**Side Effects:**
- Adds callback to `_initCallbacks` array
- Callback will be invoked after build completes

**Throws:**
- `Error` - If callback is not a function

**Example:**
```javascript
subsystem.onInit((api, ctx) => {
  console.log(`Subsystem ${api.name} initialized`);
  // Perform post-build setup
});
```

**Use Case:** Perform setup after all facets are initialized.

#### `onDispose(cb)`

Registers a callback to be invoked during disposal.

**Signature:**
```javascript
onDispose(cb) => BaseSubsystem
```

**Parameters:**
- `cb` (Function, required) - Callback function

**Callback Signature:**
```javascript
cb() => void | Promise<void>
```

**Returns:** `BaseSubsystem` - Returns `this` for method chaining

**Side Effects:**
- Adds callback to `_disposeCallbacks` array
- Callback will be invoked during disposal (best-effort)

**Throws:**
- `Error` - If callback is not a function

**Example:**
```javascript
subsystem.onDispose(() => {
  console.log('Subsystem disposing');
  // Perform cleanup
});
```

**Use Case:** Perform cleanup during disposal.

### Facet Access

#### `find(kind)`

Finds a facet by its kind identifier.

**Signature:**
```javascript
find(kind) => Facet | undefined
```

**Parameters:**
- `kind` (string, required) - Facet kind identifier

**Returns:** `Facet | undefined` - The facet if found, `undefined` otherwise

**Side Effects:** None

**Facet Dependencies:** None (works with any facet)

**Example:**
```javascript
const queueFacet = subsystem.find('queue');
if (queueFacet) {
  const status = queueFacet.getStatus();
}
```

**Use Case:** Access facets from subsystem methods or external code.

**Note:** This is a convenience method that delegates to `api.__facets.find(kind)`.

### Lifecycle Methods

#### `build(ctx)`

Builds the subsystem by executing hooks and initializing facets.

**Signature:**
```javascript
async build(ctx = {}) => Promise<BaseSubsystem>
```

**Parameters:**
- `ctx` (object, optional) - Additional context to merge with existing context

**Returns:** `Promise<BaseSubsystem>` - Resolves to the built subsystem

**Side Effects:**
- Determines and sets `graphCache` on `ctx` (inherited, provided, or created)
- Merges `ctx` with builder context
- Executes build process via SubsystemBuilder with `graphCache`
- Initializes all facets
- Invokes `_initCallbacks`
- Sets `coreProcessor` based on subsystem type (synchronous or processor facet)
- Sets `_isBuilt` to `true`
- Logs success if debug enabled

**Behavior:**
- Returns immediately if already built
- Returns existing promise if build in progress
- Prevents concurrent builds

**Process:**
1. Check if already built (return if so)
2. Check if build in progress (return existing promise)
3. Create build promise
4. Determine `graphCache`: use provided in `ctx.graphCache`, inherit from parent's `ctx.graphCache`, or create new with default capacity (100, configurable via `ctx.config.graphCache.capacity`)
5. Set `graphCache` on `ctx` for availability after build
6. Merge context with builder
7. Execute builder.build() with `graphCache`
8. Invoke init callbacks
9. Set `coreProcessor` based on subsystem type:
   - If `api.isSynchronous === true`: set to `synchronous` facet
   - Otherwise: set to `processor` facet
10. Mark as built
11. Return subsystem

**Example:**
```javascript
await subsystem.build({
  config: {
    queue: { maxSize: 200 }
  }
});
```

**Use Case:** Build subsystem after configuration and hook registration.

#### `dispose()`

Disposes the subsystem by cleaning up all resources.

**Signature:**
```javascript
async dispose() => Promise<void>
```

**Returns:** `Promise<void>` - Resolves when disposal is complete

**Side Effects:**
- Waits for any in-progress build
- Disposes all child subsystems
- Disposes all facets via FacetManager
- Invokes `_disposeCallbacks` (best-effort)
- Sets `_isBuilt` to `false`
- Sets `coreProcessor` to `null`
- Invalidates builder plan
- Logs success if debug enabled

**Behavior:**
- Returns immediately if not built and no build in progress
- Returns existing promise if disposal in progress
- Prevents concurrent disposal

**Process:**
1. Check if needs disposal
2. Wait for any in-progress build
3. Check if already built
4. Dispose children
5. Dispose all facets
6. Invoke dispose callbacks (best-effort)
7. Reset state
8. Invalidate builder

**Example:**
```javascript
await subsystem.dispose();
```

**Use Case:** Clean up subsystem before shutdown or removal.

### Message Flow Methods

#### `pause()`

Pauses message processing for this subsystem by delegating to the scheduler facet.

**Signature:**
```javascript
pause() => BaseSubsystem | null
```

**Returns:**
- `BaseSubsystem` - Returns `this` for method chaining if scheduler facet exists
- `null` - Returns `null` if scheduler facet is not present (no-op)

**Side Effects:**
- Calls `scheduler.pauseProcessing()` if scheduler facet exists
- No effect if scheduler facet is not present

**Facet Dependencies:**
- **Optional**: `scheduler` facet (required for pause functionality)

**Behavior:**
- If scheduler facet exists, calls `pauseProcessing()` on it
- If scheduler facet does not exist, returns `null` (no-op)
- Pause state is managed entirely by the scheduler facet

**Example:**
```javascript
const result = subsystem.pause();
if (result === null) {
  console.log('No scheduler facet, pause is a no-op');
} else {
  console.log('Paused successfully');
}

// Check pause state via scheduler facet
const scheduler = subsystem.find('scheduler');
if (scheduler?.isPaused()) {
  console.log('Subsystem is paused');
}
```

**Use Case:** Temporarily stop message processing. Requires scheduler facet to be installed.

#### `resume()`

Resumes message processing for this subsystem by delegating to the scheduler facet.

**Signature:**
```javascript
resume() => BaseSubsystem | null
```

**Returns:**
- `BaseSubsystem` - Returns `this` for method chaining if scheduler facet exists
- `null` - Returns `null` if scheduler facet is not present (no-op)

**Side Effects:**
- Calls `scheduler.resumeProcessing()` if scheduler facet exists
- No effect if scheduler facet is not present

**Facet Dependencies:**
- **Optional**: `scheduler` facet (required for resume functionality)

**Behavior:**
- If scheduler facet exists, calls `resumeProcessing()` on it
- If scheduler facet does not exist, returns `null` (no-op)
- Resume state is managed entirely by the scheduler facet

**Example:**
```javascript
const result = subsystem.resume();
if (result === null) {
  console.log('No scheduler facet, resume is a no-op');
} else {
  console.log('Resumed successfully');
}

// Check pause state via scheduler facet
const scheduler = subsystem.find('scheduler');
if (scheduler?.isPaused()) {
  console.log('Subsystem is still paused');
} else {
  console.log('Subsystem is not paused');
}
```

**Use Case:** Resume message processing after pause. Requires scheduler facet to be installed.

#### `accept(message, options)`

Accepts a message for processing.

**Signature:**
```javascript
async accept(message, options = {}) => Promise<Result>
```

**Parameters:**
- `message` (Message, required) - The message to accept
- `options` (object, optional) - Processing options

**Returns:** `Promise<Result>` - Processing result

**Side Effects:**
- Message is accepted and queued/processed
- May trigger message processing

**Facet Dependencies:**
- **Required**: `coreProcessor` (set during build to `synchronous` or `processor` facet)

**Throws:**
- `Error` - If `coreProcessor` is missing or doesn't have `accept` method

**Behavior:**
- Uses `coreProcessor` facet set during build
- For synchronous subsystems: uses `synchronous` facet
- For asynchronous subsystems: uses `processor` facet

**Example:**
```javascript
const result = await subsystem.accept(message, { priority: 10 });
```

**Use Case:** Send messages to the subsystem for processing.

**Note:** The `coreProcessor` is automatically set during build based on whether the subsystem is synchronous (`api.isSynchronous === true`) or asynchronous.

#### `process(timeSlice)`

Processes messages for a given time slice. Delegates to scheduler facet if available, otherwise uses coreProcessor.

**Signature:**
```javascript
async process(timeSlice) => Promise<Result | null>
```

**Parameters:**
- `timeSlice` (number, optional) - Time slice duration in milliseconds

**Returns:** `Promise<Result | null>` - Processing result or null

**Side Effects:**
- Processes messages during the time slice
- May trigger message processing

**Facet Dependencies:**
- **Optional**: `scheduler` facet (preferred if available)
- **Fallback**: `coreProcessor` facet (must have `processTick` method)

**Behavior:**
- If scheduler facet exists, calls `scheduler.process(timeSlice)`
- Otherwise, calls `coreProcessor.processTick()` if available
- Returns `null` if no processor available

**Example:**
```javascript
const result = await subsystem.process(50); // Process for 50ms
```

**Use Case:** Process messages during a time slice. Used by global scheduler.

### Routing Methods

#### `registerRoute(pattern, handler, routeOptions)`

Registers a route pattern with a handler function.

**Signature:**
```javascript
registerRoute(pattern, handler, routeOptions = {}) => boolean
```

**Parameters:**
- `pattern` (string, required) - Route pattern (e.g., 'register/domain', '{domain}/store', 'query/*')
- `handler` (Function, required) - Handler function: `async (message, params, options) => result`
- `routeOptions` (object, optional) - Route options
  - `priority` (number, optional) - Route priority (default: 0)
  - `description` (string, optional) - Route description
  - `metadata` (object, optional) - Additional metadata

**Returns:** `boolean` - `true` if registration successful

**Side Effects:**
- Registers route in router facet
- Route becomes available for message routing
- May invalidate route cache

**Facet Dependencies:**
- **Required**: `router` facet (must have `registerRoute` method)

**Throws:**
- `Error` - If `router` facet is missing or doesn't have `registerRoute` method
- `Error` - If pattern is invalid or handler is not a function (from router facet)

**Example:**
```javascript
// Register exact route
subsystem.registerRoute('register/domain', async (message, params, options) => {
  return { success: true };
});

// Register parameter route
subsystem.registerRoute('{domain}/store', async (message, params, options) => {
  const domainName = params.domain;
  // Process message...
  return { domain: domainName };
});

// Register with options
subsystem.registerRoute('query/*', handler, {
  priority: 10,
  description: 'Query operations',
  metadata: { requiresAuth: true }
});
```

**Use Case:** Register message handlers for specific route patterns.

**Note:** Delegates to `router.registerRoute()` method. See router facet documentation for pattern syntax details.

#### `unregisterRoute(pattern)`

Unregisters a route pattern.

**Signature:**
```javascript
unregisterRoute(pattern) => boolean
```

**Parameters:**
- `pattern` (string, required) - Route pattern to unregister

**Returns:** `boolean` - `true` if route was found and removed, `false` if not found

**Side Effects:**
- Removes route from router facet
- May invalidate route cache

**Facet Dependencies:**
- **Required**: `router` facet (must have `unregisterRoute` method)

**Throws:**
- `Error` - If `router` facet is missing or doesn't have `unregisterRoute` method

**Example:**
```javascript
// Unregister a route
const removed = subsystem.unregisterRoute('register/domain');
if (removed) {
  console.log('Route removed');
} else {
  console.log('Route not found');
}
```

**Use Case:** Remove route handlers dynamically.

**Note:** Delegates to `router.unregisterRoute()` method.

## Working with Hooks and Facets

### Hook Execution Flow

```
1. Subsystem Creation
   │
   ├─▶ defaultHooks set (if provided)
   │
   └─▶ hooks array initialized (empty)
   │
   ▼
2. Hook Registration (before build)
   │
   ├─▶ subsystem.use(hook1)
   │
   ├─▶ subsystem.use(hook2)
   │
   └─▶ hooks array populated
   │
   ▼
3. Build Initiation
   │
   ├─▶ subsystem.build(ctx)
   │
   └─▶ SubsystemBuilder.build()
   │
   ▼
4. Verification Phase
   │
   ├─▶ Collect hooks (defaultHooks + hooks)
   │
   ├─▶ Extract hook metadata
   │
   ├─▶ Execute hooks → create facets
   │      │
   │      └─▶ hook(ctx, api, subsystem) → Facet
   │
   ├─▶ Build dependency graph
   │
   └─▶ Topological sort
   │
   ▼
5. Execution Phase
   │
   ├─▶ Add facets in dependency order
   │
   ├─▶ Initialize facets
   │      │
   │      └─▶ facet.init(ctx, api, subsystem)
   │             │
   │             └─▶ onInit callback invoked
   │
   └─▶ Attach facets (if attach: true)
   │
   ▼
6. Post-Build
   │
   └─▶ Init callbacks invoked
```

### Facet Access Patterns

#### Direct Access via FacetManager

```javascript
// Via FacetManager
const queueFacet = subsystem.api.__facets.find('queue');

// Via Proxy (if facet is attached)
const queueFacet = subsystem.api.__facets.queue;
```

#### Via find() Method

```javascript
// Convenience method
const queueFacet = subsystem.find('queue');
```

#### In Facet Methods

```javascript
// In facet method, use subsystem.find()
.add({
  processMessage(message) {
    const statisticsFacet = subsystem.find('statistics');
    if (statisticsFacet) {
      statisticsFacet.recordEvent('message-processed');
    }
  }
})
```

### Facet Dependencies

Some methods depend on specific facets:

| Method | Facet Dependency | Type | Behavior |
|--------|------------------|------|----------|
| `setParent()` | `hierarchy` | Optional | Delegates to `hierarchy.setParent()` if present, falls back to direct `_parent` access |
| `getParent()` | `hierarchy` | Optional | Delegates to `hierarchy.getParent()` if present, falls back to direct `_parent` access |
| `isRoot()` | `hierarchy` | Optional | Delegates to `hierarchy.isRoot()` if present, falls back to checking `_parent === null` |
| `getRoot()` | `hierarchy` | Optional | Delegates to `hierarchy.getRoot()` if present, falls back to traversal logic |
| `pause()` | `scheduler` | Optional | Calls `pauseProcessing()` if present, returns `null` if missing |
| `resume()` | `scheduler` | Optional | Calls `resumeProcessing()` if present, returns `null` if missing |
| `accept()` | `core` or `processor` | Required | Throws error if missing |
| `process()` | `scheduler` (preferred) or `core`/`processor` (fallback) | Optional | Returns `null` if none present |
| `registerRoute()` | `router` | Required | Throws error if missing |
| `unregisterRoute()` | `router` | Required | Throws error if missing |

**Required Facets:**
- `accept()` requires `core` or `processor` facet with `accept` method
- `registerRoute()` requires `router` facet with `registerRoute` method
- `unregisterRoute()` requires `router` facet with `unregisterRoute` method

**Optional Facets:**
- `setParent()`/`getParent()`/`isRoot()`/`getRoot()` delegate to `hierarchy` facet if present, otherwise use fallback behavior
- `pause()`/`resume()` return `null` if `scheduler` facet is not present (no-op)
- `process()` returns `null` if no processing facets available

**Notes:**
- **Hierarchy methods**: Parent state is stored in `subsystem._parent`. The hierarchy facet methods operate on this property. BaseSubsystem methods delegate to the hierarchy facet when available, ensuring consistent behavior.
- **Pause/resume state**: Managed by the scheduler facet. To check pause state, use `subsystem.find('scheduler')?.isPaused()` or `subsystem.scheduler?.isPaused()` if the facet is attached.

## Common Patterns

### Pattern: Basic Subsystem

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('server', {
  ms: messageSystem,
  config: {
    queue: { maxSize: 1000 },
    router: { strict: true }
  },
  defaultHooks: createCanonicalDefaultHooks(),
  debug: true
});

await subsystem.build();
```

### Pattern: Custom Hooks

```javascript
import { useCustom } from './hooks/custom/use-custom.mycelia.js';

const subsystem = new BaseSubsystem('custom', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

subsystem
  .use(useCustom)
  .onInit((api, ctx) => {
    console.log('Custom subsystem ready');
  })
  .build();
```

### Pattern: Hierarchical Subsystems

```javascript
const parent = new BaseSubsystem('parent', { ms: messageSystem });
const child = new BaseSubsystem('child', { ms: messageSystem });

child.setParent(parent);

console.log(child.getNameString());  // "parent://child"
```

### Pattern: Message Processing

```javascript
// Accept messages
await subsystem.accept(message);

// Process messages
const result = await subsystem.process(100);  // 100ms time slice
```

### Pattern: Route Registration

```javascript
// Register routes
subsystem.registerRoute('user/{id}', async (message, iterator, params) => {
  const userId = params.id;
  // Handle user message
  return { userId };
});

subsystem.registerRoute('posts/*', async (message, iterator, params) => {
  // Handle posts messages
  return { handled: true };
});

// Unregister route
subsystem.unregisterRoute('user/{id}');
```

### Pattern: Root Access

```javascript
// Get root subsystem from any level
const root = subsystem.getRoot();
console.log('Root subsystem:', root.name);

// Access root from deep hierarchy
const grandchild = parent.getChild('child').getChild('grandchild');
const root = grandchild.getRoot();  // Returns top-level subsystem
```

### Pattern: Lifecycle Management

```javascript
// Build
await subsystem.build();

// Use
// ... subsystem operations ...

// Dispose
await subsystem.dispose();
```

## Best Practices

1. **Always Build Before Use**: Call `build()` before using the subsystem.

2. **Register Hooks Before Build**: Use `use()` to register hooks before calling `build()`.

3. **Use DefaultHooks**: Use `createCanonicalDefaultHooks()` or `createSynchronousDefaultHooks()` for common functionality.

4. **Check Facet Availability**: Use `find()` to check if optional facets exist before using them.

5. **Handle Required Facets**: Ensure required facets (like `core` or `processor`) are installed for `accept()` to work.

6. **Use onInit for Post-Build Setup**: Use `onInit()` for setup that depends on all facets being initialized.

7. **Use onDispose for Cleanup**: Use `onDispose()` for cleanup operations.

8. **Dispose Before Removal**: Always call `dispose()` before removing a subsystem.

## See Also

- [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) - Learn how to use BaseSubsystem as a standalone plugin system
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Learn about the builder that orchestrates builds
- [Debug Flag Utilities](./DEBUG-FLAG-UTILS.md) - Standardized debug flag extraction
- [Logger Utilities](./LOGGER-UTILS.md) - Logging abstraction for testability
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Learn about the build utilities
- [Default Hooks](./DEFAULT-HOOKS.md) - Learn about default hook sets
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets
- [Facet Manager](./hooks/FACET-MANAGER.md) - Learn about facet management
- [Diagrams](./DIAGRAMS.md) - Visual representations of system architecture

