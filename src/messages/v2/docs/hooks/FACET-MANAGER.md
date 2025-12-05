# Facet Manager

## Overview

The **FacetManager** is responsible for managing the lifecycle of facets within a subsystem. It provides a centralized registry for facets, handles their initialization and disposal, manages transactional operations, and enables transparent access to facets through a Proxy pattern.

FacetManager ensures:
- **Ordered initialization**: Facets are initialized in dependency order
- **Transactional safety**: Failed builds can be rolled back atomically
- **Automatic attachment**: Facets can be automatically attached to the subsystem
- **Resource cleanup**: Proper disposal of all facets when the subsystem is disposed
- **Efficient storage**: Uses a `Map` internally for O(1) lookups and efficient iteration

## Creating a FacetManager

FacetManager is created automatically when a subsystem is instantiated:

```javascript
import { FacetManager } from '../facet-manager/facet-manager.mycelia.js';

// Inside BaseSubsystem constructor
this.api = { 
  name, 
  __facets: new FacetManager(this) 
};
```

The FacetManager is accessible via `subsystem.api.__facets`.

## Proxy Pattern

FacetManager uses a JavaScript Proxy to enable transparent access to facets. This allows you to access facets as if they were direct properties:

```javascript
// Instead of: subsystem.api.__facets.find('queue')
// You can use: subsystem.api.__facets.queue

const queueFacet = subsystem.api.__facets.queue;
const routerFacet = subsystem.api.__facets.router;
```

**Important:** The Proxy only intercepts property access. Method calls must still be bound or called directly:

```javascript
// ✅ Works - property access
const queue = subsystem.api.__facets.queue;

// ✅ Works - method call
subsystem.api.__facets.add('queue', facet);

// ❌ Doesn't work - method not bound
const add = subsystem.api.__facets.add;
add('queue', facet); // Error: 'this' is undefined

// ✅ Works - method is auto-bound by Proxy
const add = subsystem.api.__facets.add;
add('queue', facet); // Actually works because Proxy binds functions
```

## Working with Facets

### Adding Facets

#### `add(kind, facet, opts)`

Adds a single facet to the manager. This is the primary method for registering facets.

**Signature:**
```javascript
async add(kind, facet, opts = { 
  init: false, 
  attach: false, 
  ctx: undefined, 
  api: undefined 
})
```

**Parameters:**
- `kind` (string, required) - The facet kind identifier (e.g., 'queue', 'router')
- `facet` (object, required) - The facet instance (must be a Facet instance)
- `opts` (object, optional) - Options object:
  - `init` (boolean, default: `false`) - Whether to initialize the facet immediately
  - `attach` (boolean, default: `false`) - Whether to attach the facet to the subsystem
  - `ctx` (object, optional) - Context object to pass to `facet.init()`. See [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md)
  - `api` (object, optional) - API object to pass to `facet.init()`. See [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md)

**Returns:** `Promise<boolean>` - Always resolves to `true` on success

**Process:**
1. Validates inputs (kind must be string, facet must be object)
2. Checks for duplicate facets (throws if facet with same kind exists)
3. Registers the facet in the internal Map-based registry
4. Tracks the addition for transaction rollback (if in a transaction)
5. Initializes the facet (if `opts.init === true`)
6. Attaches the facet to subsystem (if `opts.attach === true` and `facet.shouldAttach()`)

**Error Handling:**
- If initialization fails, the facet is automatically disposed and removed
- Throws an error if kind is invalid, facet is invalid, or duplicate exists

**Example:**
```javascript
const queueFacet = new Facet('queue', { attach: true, source: import.meta.url })
  .add({ /* methods */ });

await facetManager.add('queue', queueFacet, {
  init: true,
  attach: true,
  ctx: { ms: messageSystem, config: {}, debug: false },
  api: subsystem.api
});
```

#### `addMany(orderedKinds, facetsByKind, opts)`

Adds multiple facets in a single transactional operation. This is the preferred method during subsystem build.

**Signature:**
```javascript
async addMany(orderedKinds, facetsByKind, opts = { 
  init: true, 
  attach: true, 
  ctx: undefined, 
  api: undefined 
})
```

**Parameters:**
- `orderedKinds` (Array<string>, required) - Array of facet kinds in initialization order
- `facetsByKind` (Object, required) - Map of kind → facet instance
- `opts` (object, optional) - Same options as `add()`

**Returns:** `Promise<void>`

**Process:**
1. Begins a transaction
2. Adds each facet in order using `add()`
3. Commits the transaction on success
4. Rolls back all facets on any failure

**Example:**
```javascript
const orderedKinds = ['listeners', 'statistics', 'queue', 'scheduler'];
const facetsByKind = {
  listeners: listenersFacet,
  statistics: statisticsFacet,
  queue: queueFacet,
  scheduler: schedulerFacet
};

await facetManager.addMany(orderedKinds, facetsByKind, {
  init: true,
  attach: true,
  ctx: resolvedCtx,
  api: subsystem.api
});
```

### Facet Initialization

When a facet is initialized via `add()` or `addMany()`, the FacetManager calls `facet.init()` with specific parameters.

#### Expected Inputs to `facet.init()`

The `init()` method on a facet receives three parameters:

```javascript
async facet.init(ctx, api, subsystem)
```

**Parameters:**

1. **`ctx` (object)** - The resolved context object containing:
   - `ms` - MessageSystem instance
   - `config` - Configuration object keyed by facet kind
   - `debug` - Debug flag
   
   **Example:**
   ```javascript
   ctx = {
     ms: messageSystem,
     config: {
       queue: { capacity: 1000, policy: 'drop-oldest' },
       scheduler: { strategy: 'priority', maxMessagesPerSlice: 10 }
     },
     debug: false
   }
   ```

2. **`api` (object)** - The subsystem API object containing:
   - `name` - Subsystem name
   - `__facets` - Reference to the FacetManager itself
   
   **Example:**
   ```javascript
   api = {
     name: 'my-subsystem',
     __facets: facetManagerInstance
   }
   ```

3. **`subsystem` (BaseSubsystem)** - The subsystem instance itself

**Important:** These parameters are passed automatically by FacetManager. You don't need to call `init()` manually - it's handled during the `add()` or `addMany()` process.

**Example: Facet with onInit callback**

```javascript
return new Facet('database', { attach: true, source: import.meta.url })
  .add({
    query(sql) {
      return this.connection.query(sql);
    }
  })
  .onInit(async ({ ctx, api, subsystem, facet }) => {
    // ctx contains ms, config, debug
    const dbConfig = ctx.config?.database || {};
    
    // api contains name and __facets
    console.log(`Initializing database for ${api.name}`);
    
    // subsystem is the full subsystem instance
    this.connection = await createConnection(dbConfig);
    
    // facet is the facet instance itself
    facet._initialized = true;
  });
```

### Finding Facets

#### `find(kind)`

Finds a facet by its kind identifier.

**Signature:**
```javascript
find(kind)
```

**Parameters:**
- `kind` (string, required) - The facet kind to find

**Returns:** `Facet | undefined` - The facet instance or `undefined` if not found

**Example:**
```javascript
const queueFacet = facetManager.find('queue');
if (queueFacet) {
  const status = queueFacet.getQueueStatus();
}
```

**Note:** You can also use Proxy access: `facetManager.queue`

#### `has(kind)`

Checks if a facet with the given kind exists.

**Signature:**
```javascript
has(kind)
```

**Parameters:**
- `kind` (string, required) - The facet kind to check

**Returns:** `boolean` - `true` if facet exists, `false` otherwise

**Example:**
```javascript
if (facetManager.has('queue')) {
  console.log('Queue facet is available');
}
```

### Attaching Facets

#### `attach(facetKind)`

Manually attaches a facet to the subsystem instance. This makes the facet accessible as a property on the subsystem.

**Signature:**
```javascript
attach(facetKind)
```

**Parameters:**
- `facetKind` (string, required) - The facet kind to attach

**Returns:** `Facet` - The attached facet instance

**Process:**
1. Finds the facet
2. Checks if property already exists on subsystem (throws if it does)
3. Attaches facet as `subsystem[facetKind]`
4. Logs attachment if debug is enabled

**Example:**
```javascript
// Facet is registered but not attached
await facetManager.add('queue', queueFacet, { init: true, attach: false });

// Later, manually attach it
facetManager.attach('queue');

// Now accessible as: subsystem.queue
```

**Note:** If `add()` is called with `attach: true` and `facet.shouldAttach()` returns `true`, attachment happens automatically.

### Removing Facets

#### `remove(kind)`

Removes a facet from the manager and detaches it from the subsystem.

**Signature:**
```javascript
remove(kind)
```

**Parameters:**
- `kind` (string, required) - The facet kind to remove

**Returns:** `boolean` - `true` if facet was removed, `false` if not found

**Process:**
1. Removes facet from internal Map-based registry
2. Removes property from subsystem (if attached)
3. Does NOT call `dispose()` - you must dispose manually if needed

**Example:**
```javascript
const removed = facetManager.remove('queue');
if (removed) {
  console.log('Queue facet removed');
}
```

**Important:** This does not dispose the facet. If you need cleanup, call `facet.dispose()` first:

```javascript
const facet = facetManager.find('queue');
if (facet) {
  await facet.dispose();
  facetManager.remove('queue');
}
```

### Querying Facets

#### `getAllKinds()`

Returns an array of all registered facet kinds.

**Signature:**
```javascript
getAllKinds()
```

**Returns:** `Array<string>` - Array of facet kind identifiers

**Example:**
```javascript
const kinds = facetManager.getAllKinds();
console.log('Registered facets:', kinds);
// ['listeners', 'statistics', 'queue', 'scheduler', 'router']
```

#### `getAll()`

Returns a copy of all facets as an object. The internal Map is converted to a plain object.

**Signature:**
```javascript
getAll()
```

**Returns:** `Object` - Object mapping kind → facet instance

**Note:** FacetManager uses a `Map` internally for efficient storage. This method converts the Map to a plain object for compatibility with code expecting an object.

**Example:**
```javascript
const allFacets = facetManager.getAll();
for (const [kind, facet] of Object.entries(allFacets)) {
  console.log(`${kind}:`, facet.getKind());
}
```

#### `size()`

Returns the number of registered facets.

**Signature:**
```javascript
size()
```

**Returns:** `number` - Count of registered facets

**Example:**
```javascript
const count = facetManager.size();
console.log(`Managing ${count} facets`);
```

#### `clear()`

Removes all facets from the manager. Does NOT dispose them.

**Signature:**
```javascript
clear()
```

**Returns:** `void`

**Warning:** This does not dispose facets. Use `disposeAll()` if you need cleanup.

**Example:**
```javascript
facetManager.clear();
console.log(facetManager.size()); // 0
```

## Transaction Management

FacetManager supports transactional operations to ensure atomicity when adding multiple facets. Transaction management is handled by the `FacetManagerTransaction` class. For complete details on transactions, see [Facet Manager Transaction](./FACET-MANAGER-TRANSACTION.md).

### Transaction Methods

#### `beginTransaction()`

Begins a new transaction frame. All facets added after this call are tracked and can be rolled back. Delegates to `FacetManagerTransaction.beginTransaction()`.

**Signature:**
```javascript
beginTransaction()
```

**Returns:** `void`

**Example:**
```javascript
facetManager.beginTransaction();
try {
  await facetManager.add('queue', queueFacet, { init: true });
  await facetManager.add('scheduler', schedulerFacet, { init: true });
  facetManager.commit();
} catch (error) {
  await facetManager.rollback();
  throw error;
}
```

#### `commit()`

Commits the current transaction frame. Facets added in this transaction are now permanent. Delegates to `FacetManagerTransaction.commit()`.

**Signature:**
```javascript
commit()
```

**Returns:** `void`

**Throws:** Error if no active transaction

#### `rollback()`

Rolls back the current transaction frame. All facets added in this transaction are disposed and removed in reverse order. Delegates to `FacetManagerTransaction.rollback()`.

**Signature:**
```javascript
async rollback()
```

**Returns:** `Promise<void>`

**Process:**
1. Gets the current transaction frame
2. Iterates through added facets in reverse order
3. Calls `facet.dispose()` for each facet (best-effort)
4. Removes each facet from the registry
5. Removes transaction frame

**Throws:** Error if no active transaction

**See Also:** [Facet Manager Transaction](./FACET-MANAGER-TRANSACTION.md) for detailed information on the rollback process.

**Example:**
```javascript
facetManager.beginTransaction();
try {
  await facetManager.add('queue', queueFacet, { init: true });
  await facetManager.add('scheduler', schedulerFacet, { init: true });
  
  // If anything fails, rollback everything
  if (someCondition) {
    throw new Error('Build failed');
  }
  
  facetManager.commit();
} catch (error) {
  // All facets added in this transaction are automatically disposed and removed
  await facetManager.rollback();
  throw error;
}
```

### Nested Transactions

Transactions can be nested. Each `beginTransaction()` creates a new frame on the stack. For detailed information on nested transactions, see [Facet Manager Transaction](./FACET-MANAGER-TRANSACTION.md#nested-transactions).

```javascript
facetManager.beginTransaction(); // Frame 1
try {
  await facetManager.add('queue', queueFacet);
  
  facetManager.beginTransaction(); // Frame 2
  try {
    await facetManager.add('scheduler', schedulerFacet);
    facetManager.commit(); // Commit Frame 2
  } catch (error) {
    await facetManager.rollback(); // Rollback Frame 2 only
  }
  
  facetManager.commit(); // Commit Frame 1
} catch (error) {
  await facetManager.rollback(); // Rollback Frame 1 (includes Frame 2's work)
}
```

## Legacy Helpers

### `initAll(subsystem)`

Legacy helper that initializes all facets. This is typically not needed as `addMany()` handles initialization automatically.

**Signature:**
```javascript
async initAll(subsystem)
```

**Parameters:**
- `subsystem` (BaseSubsystem) - The subsystem instance

**Returns:** `Promise<void>`

**Note:** This method does NOT pass `ctx` or `api` to `facet.init()`. It only passes the subsystem. This is a legacy method and should not be used in new code.

### `disposeAll(subsystem)`

Disposes all facets and clears the registry. This is called automatically during subsystem disposal.

**Signature:**
```javascript
async disposeAll(subsystem)
```

**Parameters:**
- `subsystem` (BaseSubsystem) - The subsystem instance

**Returns:** `Promise<void>`

**Process:**
1. Iterates through all facets
2. Calls `facet.dispose()` for each (best-effort, errors are collected)
3. Logs errors if debug is enabled
4. Clears the registry

**Example:**
```javascript
// Called automatically during subsystem.dispose()
await facetManager.disposeAll(subsystem);
```

## Integration with Subsystem Build

FacetManager is tightly integrated with the subsystem build process:

### Build Process Flow

1. **Verification Phase** (`verifySubsystemBuild`):
   - Hooks are executed to create facets
   - Dependencies are resolved
   - Topological sort determines initialization order

2. **Execution Phase** (`buildSubsystem`):
   - FacetManager receives ordered facets
   - `addMany()` is called with `init: true, attach: true`
   - Transaction ensures atomicity
   - All facets are initialized and attached

**Example from build process:**

```javascript
// In subsystem-builder.utils.mycelia.js
export async function buildSubsystem(subsystem, plan) {
  const { resolvedCtx, orderedKinds, facetsByKind } = plan;
  
  subsystem.ctx = resolvedCtx;
  
  // FacetManager handles initialization and attachment
  await subsystem.api.__facets.addMany(orderedKinds, facetsByKind, {
    init: true,
    attach: true,
    ctx: resolvedCtx,      // Passed to facet.init(ctx, api, subsystem)
    api: subsystem.api     // Passed to facet.init(ctx, api, subsystem)
  });
  
  await buildChildren(subsystem);
}
```

## Best Practices

1. **Use `addMany()` for builds**: Always use `addMany()` during subsystem build to ensure transactional safety.

2. **Don't call `init()` manually**: Let FacetManager handle initialization through `add()` or `addMany()`.

3. **Always dispose before remove**: If manually removing facets, dispose them first:
   ```javascript
   const facet = facetManager.find('queue');
   if (facet) {
     await facet.dispose();
     facetManager.remove('queue');
   }
   ```

4. **Use transactions for multiple adds**: When adding multiple facets manually, use transactions:
   ```javascript
   facetManager.beginTransaction();
   try {
     await facetManager.add('facet1', facet1);
     await facetManager.add('facet2', facet2);
     facetManager.commit();
   } catch (error) {
     await facetManager.rollback();
   }
   ```

5. **Access facets via Proxy**: Use the Proxy pattern for cleaner code:
   ```javascript
   // ✅ Preferred
   const queue = subsystem.api.__facets.queue;
   
   // ✅ Also works
   const queue = subsystem.api.__facets.find('queue');
   ```

6. **Check existence before use**: Always check if a facet exists before using it:
   ```javascript
   const queueFacet = subsystem.find('queue');
   if (queueFacet) {
     queueFacet.getQueueStatus();
   }
   ```

7. **Use iteration for bulk operations**: FacetManager is iterable, making it efficient to process all facets:
   ```javascript
   // Iterate over all facets
   for (const [kind, facet] of facetManager) {
     // Process each facet
   }
   ```

## Common Patterns

### Pattern: Conditional Facet Access

```javascript
const routerFacet = subsystem.api.__facets.router;
if (routerFacet) {
  routerFacet.registerRoute('api/*', handler);
} else {
  throw new Error('Router facet not available');
}
```

### Pattern: Iterating Over All Facets

FacetManager is iterable and supports direct iteration over facets:

```javascript
// Direct iteration (FacetManager implements Symbol.iterator)
for (const [kind, facet] of subsystem.api.__facets) {
  console.log(`Facet ${kind}:`, facet.getKind());
}

// Convert to array
const facets = [...subsystem.api.__facets];
// [[kind1, facet1], [kind2, facet2], ...]
```

**Note:** FacetManager uses a `Map` internally, so iteration order is insertion order (the order facets were added).

### Pattern: Manual Facet Management

```javascript
// Add facet without auto-init/attach
await facetManager.add('custom', customFacet, { 
  init: false, 
  attach: false 
});

// Later, initialize manually
await customFacet.init(ctx, api, subsystem);

// Then attach
facetManager.attach('custom');
```

## Error Handling

FacetManager provides robust error handling:

1. **Validation errors**: Thrown immediately for invalid inputs
2. **Duplicate errors**: Thrown when adding a facet with an existing kind
3. **Init errors**: Caught and trigger automatic rollback
4. **Dispose errors**: Collected and logged (best-effort cleanup)

**Example error handling:**

```javascript
try {
  await facetManager.add('queue', queueFacet, { init: true });
} catch (error) {
  if (error.message.includes('already exists')) {
    console.error('Facet already registered');
  } else if (error.message.includes('init')) {
    console.error('Facet initialization failed:', error);
    // Facet was automatically disposed and removed
  } else {
    throw error;
  }
}
```

## See Also

- [Facet Manager Transaction](./FACET-MANAGER-TRANSACTION.md) - Complete guide to transaction management in FacetManager
- [Facet Init Callback](./FACET-INIT-CALLBACK.md) - Complete guide to the init callback that FacetManager calls during initialization
- [Hooks Documentation](./HOOKS.md) - Complete guide to hooks and how they create facets managed by FacetManager
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - Learn how to access facets through `api.__facets`
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Learn how to use `subsystem.find()` to access facets in facet methods
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Understand the context object passed during initialization
- [Facets Documentation](./FACETS.md) - Learn about the Facet class
- [Subsystem Build Utils](../SUBSYSTEM-BUILD-UTILS.md) - See how FacetManager is used in the build process

