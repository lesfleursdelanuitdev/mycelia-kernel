# Subsystem Build Utils

## Overview

The **Subsystem Build Utils** (`subsystem-builder.utils.mycelia.js`) provides a two-phase build system for subsystems. It separates verification (pure, side-effect-free) from execution (transactional, with side effects), ensuring that subsystems are validated before any changes are made.

The build system consists of:
- **`verifySubsystemBuild()`** - Pure verification phase that validates hooks, creates facets, and resolves dependencies
- **`buildSubsystem()`** - Transactional execution phase that adds, initializes, and attaches facets

**Key Principles:**
- **Separation of Concerns**: Verification is pure and side-effect-free
- **Early Validation**: All errors are caught before any changes are made
- **Dependency Resolution**: Automatic topological sorting ensures correct initialization order
- **Performance Optimization**: LRU cache for dependency graph results
- **Transaction Safety**: Execution uses FacetManager transactions for atomicity

## Two-Phase Build System

The build system uses a two-phase approach:

1. **Verify Phase** (`verifySubsystemBuild`):
   - Pure function (no side effects)
   - Validates hooks and facets
   - Resolves dependencies
   - Returns a build plan

2. **Execute Phase** (`buildSubsystem`):
   - Transactional execution
   - Uses the plan from verify phase
   - Adds, initializes, and attaches facets
   - Builds child subsystems

**Benefits:**
- Can verify without making changes (dry-run capability)
- All errors caught before execution
- Plan can be inspected before execution
- Supports incremental builds

## verifySubsystemBuild

The verification phase is a pure function that validates the subsystem configuration and creates a build plan.

### Signature

```javascript
function verifySubsystemBuild(subsystem, ctx = {}, graphCache = null) => {
  resolvedCtx: object,
  orderedKinds: string[],
  facetsByKind: { [kind: string]: Facet }
}
```

### Parameters

- `subsystem` (BaseSubsystem, required) - The subsystem to verify
- `ctx` (object, optional) - Additional context to merge with existing context
- `graphCache` (DependencyGraphCache, optional) - LRU cache for dependency graph results

### Returns

An object containing:
- `resolvedCtx` (object) - The merged context object
- `orderedKinds` (string[]) - Facet kinds in dependency order (topologically sorted)
- `facetsByKind` (object) - Map of facet kind to Facet instance

### Process

The verification phase performs the following steps:

#### 1. Context Resolution

Merges the provided context with the subsystem's existing context:

```javascript
const resolvedCtx = resolveCtx(subsystem, ctx);
// resolvedCtx = { ...subsystem.ctx, ...ctx }
```

**Helper Function:** `resolveCtx(subsystem, ctx)`
- Merges `subsystem.ctx` (base) with provided `ctx` (extra)
- Returns a new object (pure, no mutations)
- Handles null/undefined gracefully

#### 2. Hook Collection

Collects hooks from default and user sources:

```javascript
const defaults = Array.isArray(subsystem.defaultHooks)
  ? subsystem.defaultHooks
  : (subsystem.defaultHooks?.list?.() || []);

const user = Array.isArray(subsystem.hooks) ? subsystem.hooks : [];
const hooks = [...defaults, ...user];
```

**Hook Sources:**
- `subsystem.defaultHooks` - Can be an array or `DefaultHooks` instance
- `subsystem.hooks` - User-provided hooks array

#### 3. First Pass: Hook Metadata Extraction

Extracts and validates hook metadata before executing hooks:

```javascript
// Extract hook metadata
const hookKind = hook.kind;
const hookOverwrite = hook.overwrite === true;
const hookRequired = (hook.required && Array.isArray(hook.required)) ? hook.required : [];
const hookSource = hook.source || '<unknown>';

// Validate hook kind
if (!hookKind || typeof hookKind !== 'string') {
  throw new Error(`Hook missing valid kind property (source: ${hookSource}).`);
}

// Check overwrite permission
if (hooksByKind[hookKind] && !hookOverwrite) {
  throw new Error(`Duplicate hook kind '${hookKind}' from [${prevSrc}] and [${hookSource}]. Hook does not allow overwrite.`);
}
```

**Validations:**
- Hook must have a valid `kind` property
- Duplicate hooks must have `overwrite: true`
- Hook metadata is stored for later use

#### 4. Second Pass: Hook Execution and Facet Creation

Executes hooks and creates facets:

```javascript
for (const hook of hooks) {
  // Execute hook
  facet = hook(resolvedCtx, subsystem.api, subsystem);
  
  // Validate facet
  if (!(facet instanceof Facet)) {
    throw new Error(`Hook '${hookKind}' did not return a Facet instance.`);
  }
  
  // Validate hook.kind matches facet.kind
  if (hookKind !== facetKind) {
    throw new Error(`Hook '${hookKind}' returned facet with mismatched kind '${facetKind}'.`);
  }
  
  // Check overwrite permission
  if (facetsByKind[facetKind]) {
    const hookOverwrite = hookMeta?.overwrite === true;
    const facetOverwrite = facet.shouldOverwrite?.() === true;
    if (!hookOverwrite && !facetOverwrite) {
      throw new Error(`Duplicate facet kind '${facetKind}'. Neither hook nor facet allows overwrite.`);
    }
  }
}
```

**Validations:**
- Hook must return a Facet instance
- Hook `kind` must match facet `kind`
- Duplicate facets require overwrite permission (hook or facet)
- Facets are stored in `facetsByKind`

#### 5. Dependency Validation

Validates that all required dependencies exist:

```javascript
for (const [kind, hookMeta] of Object.entries(hooksByKind)) {
  for (const dep of hookMeta.required) {
    if (!facetsByKind[dep]) {
      throw new Error(`Hook '${kind}' requires missing facet '${dep}'.`);
    }
  }
}
```

**Validation:**
- All `hook.required` dependencies must exist in `facetsByKind`
- Missing dependencies throw descriptive errors

#### 6. Kernel Services Dependency Stripping

Removes transitional `kernelServices` dependency if kernel is already initialized:

```javascript
if (subsystem?.ms?.isKernelInit?.()) {
  for (const facet of Object.values(facetsByKind)) {
    if (facet.hasDependency?.('kernelServices')) {
      facet.removeDependency('kernelServices');
    }
  }
  // Also remove from hook metadata
  if (hooksByKind['kernelServices']) {
    const hook = hooksByKind['kernelServices'];
    const idx = hook.required.indexOf('kernelServices');
    if (idx !== -1) hook.required.splice(idx, 1);
  }
}
```

**Purpose:**
- `kernelServices` is a transitional dependency used during kernel initialization
- Once kernel is initialized, this dependency is no longer needed
- Removed from both facet dependencies and hook metadata

#### 7. Cache Key Creation and Lookup

Creates a cache key from sorted facet kinds and checks the cache:

```javascript
// Create cache key from sorted facet kinds
const kinds = Object.keys(facetsByKind);
const cacheKey = graphCache ? createCacheKey(kinds) : null;

// Check cache before building graph
if (graphCache && cacheKey) {
  const cached = graphCache.get(cacheKey);
  if (cached) {
    if (cached.valid) {
      // Return cached result (skip graph building and sorting)
      return { resolvedCtx, orderedKinds: cached.orderedKinds, facetsByKind };
    } else {
      // Throw cached error
      throw new Error(cached.error || 'Cached dependency graph error');
    }
  }
}
```

**Helper Function:** `createCacheKey(kinds)`
- Sorts facet kinds alphabetically
- Joins them with commas to create a deterministic key
- Example: `['processor', 'hierarchy', 'listeners']` → `'hierarchy,listeners,processor'`

**Cache Behavior:**
- If cache hit (valid): Returns cached topological sort result immediately
- If cache hit (invalid): Throws cached error immediately
- If cache miss: Proceeds to build graph and sort (result will be cached)

#### 8. Dependency Graph Construction

Builds a dependency graph from hook and facet metadata (only if cache miss):

```javascript
const graph = buildDepGraph(hooksByKind, facetsByKind);
```

**Helper Function:** `buildDepGraph(hooksByKind, facetsByKind)`

Creates a dependency graph with:
- `graph` (Map) - Maps dependency → Set of dependents
- `indeg` (Map) - Maps kind → in-degree (number of dependencies)
- `kinds` (array) - All facet kinds

**Dependency Sources:**
1. **Hook metadata** (`hook.required`) - Dependencies declared in hook
2. **Facet metadata** (`facet.getDependencies()`) - Dependencies declared on facet

**Graph Structure:**
```javascript
graph = Map {
  'queue' => Set(['scheduler', 'processor']),
  'router' => Set(['processor']),
  'scheduler' => Set([])
}

indeg = Map {
  'queue' => 0,
  'router' => 0,
  'scheduler' => 2,
  'processor' => 2
}
```

#### 9. Topological Sort

Sorts facets by dependency order and caches the result:

```javascript
const orderedKinds = topoSort(graph, graphCache, cacheKey);
```

**Helper Function:** `topoSort({ graph, indeg, kinds }, graphCache = null, cacheKey = null)`

**Caching:**
- Checks cache at start (redundant but safe)
- If cache miss, performs topological sort
- Caches valid results after successful sort
- Caches invalid results (errors) when cycles are detected

Uses Kahn's algorithm for topological sorting:
1. Start with nodes that have no dependencies (in-degree = 0)
2. Process each node and decrement in-degree of dependents
3. Add nodes with in-degree = 0 to queue
4. Repeat until all nodes are processed

**Cycle Detection:**
If not all nodes are processed, a cycle is detected:
```javascript
if (ordered.length !== kinds.length) {
  const stuck = kinds.filter(k => (indeg.get(k) || 0) > 0);
  const error = `Facet dependency cycle detected among: ${stuck.join(', ')}`;
  
  // Cache invalid result
  if (graphCache && cacheKey) {
    graphCache.set(cacheKey, false, null, error);
  }
  
  throw new Error(error);
}
```

**Result Caching:**
After successful sort, the result is cached:
```javascript
// Cache valid result
if (graphCache && cacheKey) {
  graphCache.set(cacheKey, true, ordered, null);
}
```

**Example:**
```javascript
// Dependencies:
// scheduler → queue
// processor → queue, router

// Topological order:
['queue', 'router', 'scheduler', 'processor']
```

### Error Handling

The verification phase throws descriptive errors for:

1. **Invalid Hook Kind:**
   ```
   Hook missing valid kind property (source: <source>).
   ```

2. **Duplicate Hook (No Overwrite):**
   ```
   Duplicate hook kind 'queue' from [source1] and [source2]. Hook does not allow overwrite.
   ```

3. **Hook Execution Failure:**
   ```
   Hook 'queue' (from <source>) failed during execution: <error message>
   ```

4. **Invalid Facet Return:**
   ```
   Hook 'queue' (from <source>) did not return a Facet instance (got <type>).
   ```

5. **Missing Facet Kind:**
   ```
   Facet from hook 'queue' (source: <source>) missing valid kind (facet source: <facetSource>).
   ```

6. **Kind Mismatch:**
   ```
   Hook 'queue' (from <source>) returned facet with mismatched kind 'router'.
   ```

7. **Duplicate Facet (No Overwrite):**
   ```
   Duplicate facet kind 'queue' from [source1] and [source2]. Neither hook nor facet allows overwrite.
   ```

8. **Missing Dependency:**
   ```
   Hook 'scheduler' (from <source>) requires missing facet 'queue'.
   ```

9. **Dependency Cycle:**
   ```
   Facet dependency cycle detected among: queue, scheduler, processor
   ```

### Example

```javascript
// Verify subsystem build (without cache)
const plan = verifySubsystemBuild(subsystem, {
  config: {
    queue: { maxSize: 100 },
    router: { strict: true }
  }
});

// With cache (typically via SubsystemBuilder)
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';

const cache = new DependencyGraphCache(100);
const plan = verifySubsystemBuild(subsystem, {
  config: {
    queue: { maxSize: 100 },
    router: { strict: true }
  }
}, cache);

// Plan contains:
// {
//   resolvedCtx: { ms, config: {...}, debug: false },
//   orderedKinds: ['queue', 'router', 'scheduler', 'processor'],
//   facetsByKind: {
//     queue: Facet('queue'),
//     router: Facet('router'),
//     scheduler: Facet('scheduler'),
//     processor: Facet('processor')
//   }
// }
```

## buildSubsystem

The execution phase is a transactional function that uses the plan from verification to build the subsystem.

### Signature

```javascript
async function buildSubsystem(subsystem, plan) => Promise<void>
```

### Parameters

- `subsystem` (BaseSubsystem, required) - The subsystem to build
- `plan` (object, required) - The build plan from `verifySubsystemBuild()`
  - `resolvedCtx` (object) - Resolved context
  - `orderedKinds` (string[]) - Facet kinds in dependency order
  - `facetsByKind` (object) - Map of facet kind to Facet instance

### Process

The execution phase performs the following steps:

#### 1. Plan Validation

Validates that the plan is valid:

```javascript
const { resolvedCtx, orderedKinds, facetsByKind } = plan || {};
if (!orderedKinds || !facetsByKind) {
  throw new Error('buildSubsystem: invalid plan');
}
```

#### 2. Context Assignment

Assigns the resolved context to the subsystem:

```javascript
subsystem.ctx = resolvedCtx;
```

**Note:** This is the first side effect in the build process.

#### 3. Facet Addition

Adds, initializes, and attaches facets using `FacetManager.addMany()`:

```javascript
await subsystem.api.__facets.addMany(orderedKinds, facetsByKind, {
  init: true,
  attach: true,
  ctx: resolvedCtx,
  api: subsystem.api
});
```

**Process:**
- Uses `FacetManager.addMany()` for transactional addition
- Facets are added in dependency order (`orderedKinds`)
- Each facet is initialized (`init: true`)
- Each facet is attached if `shouldAttach()` returns true (`attach: true`)
- Context and API are passed to `facet.init()`

**Transaction Safety:**
- `addMany()` uses transactions internally
- If any facet fails to initialize, all facets are rolled back
- Ensures atomicity (all or nothing)

#### 4. Child Subsystem Building

Builds child subsystems recursively:

```javascript
await buildChildren(subsystem);
```

**Helper Function:** `buildChildren(parent)`
- Collects child subsystems from `parent._children`
- Builds each child subsystem
- Handles errors gracefully

### Error Handling

The execution phase can throw errors from:

1. **Invalid Plan:**
   ```
   buildSubsystem: invalid plan
   ```

2. **Facet Initialization Failure:**
   - Thrown by `FacetManager.addMany()`
   - Causes transaction rollback
   - All facets added in the transaction are disposed and removed

3. **Child Build Failure:**
   - Thrown by `buildChildren()`
   - Does not rollback parent facets (children are built after parent)

### Example

```javascript
// Verify first
const plan = verifySubsystemBuild(subsystem, ctx);

// Then execute
await buildSubsystem(subsystem, plan);

// Subsystem is now built with all facets initialized and attached
```

## Two-Phase Build Flow

The complete build flow:

```
1. verifySubsystemBuild(subsystem, ctx, graphCache)
   ├─ Resolve context
   ├─ Collect hooks
   ├─ Extract hook metadata (first pass)
   ├─ Execute hooks and create facets (second pass)
   ├─ Validate dependencies
   ├─ Strip kernelServices dependency (if needed)
   ├─ Create cache key from sorted facet kinds
   ├─ Check cache for topological sort result
   │   ├─ Cache hit (valid): Return cached result
   │   └─ Cache hit (invalid): Throw cached error
   ├─ Build dependency graph (if cache miss)
   └─ Topologically sort facets (if cache miss)
       └─ Cache result (valid or invalid)
   → Returns: { resolvedCtx, orderedKinds, facetsByKind }

2. buildSubsystem(subsystem, plan)
   ├─ Validate plan
   ├─ Assign resolved context
   ├─ Add/init/attach facets (transactional)
   └─ Build children
   → Returns: Promise<void>
```

## Integration with SubsystemBuilder

The build utils are typically used through `SubsystemBuilder`:

```javascript
// In BaseSubsystem
async build(ctx = {}) {
  this._builder.withCtx(ctx);
  await this._builder.build();  // Uses verifySubsystemBuild + buildSubsystem
}
```

**SubsystemBuilder Flow:**
1. `builder.plan(graphCache)` → calls `verifySubsystemBuild(subsystem, ctx, graphCache)`, returns `{ plan, graphCache }`
2. `builder.build(graphCache)` → calls `plan(graphCache)` then `buildSubsystem()`

**Cache Integration:**
- `SubsystemBuilder` accepts a cache as a parameter (does not create or store it internally)
- Cache is passed to `verifySubsystemBuild()` for dependency graph caching
- Cache key is created from alphabetically sorted facet kinds
- Cache stores topologically sorted results (or errors for invalid graphs)
- Cache can be shared across multiple builders or managed externally

## Helper Functions

### resolveCtx(subsystem, ctx)

Pure function that merges context objects.

**Signature:**
```javascript
function resolveCtx(subsystem, ctx) => object
```

**Process:**
- Merges `subsystem.ctx` (base) with `ctx` (extra)
- Returns new object (no mutations)
- Handles null/undefined gracefully

**Example:**
```javascript
const resolved = resolveCtx(subsystem, { config: { queue: {} } });
// resolved = { ...subsystem.ctx, config: { queue: {} } }
```

### createCacheKey(kinds)

Creates a deterministic cache key from facet kinds.

**Signature:**
```javascript
function createCacheKey(kinds) => string
```

**Process:**
- Sorts facet kinds alphabetically
- Joins them with commas
- Returns deterministic key string

**Example:**
```javascript
createCacheKey(['processor', 'hierarchy', 'listeners'])
// Returns: 'hierarchy,listeners,processor'
```

### buildDepGraph(hooksByKind, facetsByKind)

Builds a dependency graph from hook and facet metadata.

**Signature:**
```javascript
function buildDepGraph(hooksByKind, facetsByKind) => {
  graph: Map<string, Set<string>>,
  indeg: Map<string, number>,
  kinds: string[]
}
```

**Process:**
1. Initialize graph and in-degree maps for all kinds
2. Add dependencies from hook metadata (`hook.required`)
3. Add dependencies from facet metadata (`facet.getDependencies()`)
4. Return graph, in-degree map, and kinds array

**Graph Structure:**
- `graph` - Maps dependency → Set of dependents
- `indeg` - Maps kind → in-degree count
- `kinds` - Array of all facet kinds

**Example:**
```javascript
// Dependencies:
// scheduler → queue
// processor → queue, router

const { graph, indeg, kinds } = buildDepGraph(hooksByKind, facetsByKind);

// graph:
//   'queue' => Set(['scheduler', 'processor'])
//   'router' => Set(['processor'])

// indeg:
//   'queue' => 0
//   'router' => 0
//   'scheduler' => 1
//   'processor' => 2
```

### topoSort({ graph, indeg, kinds }, graphCache, cacheKey)

Performs topological sort using Kahn's algorithm with optional caching.

**Signature:**
```javascript
function topoSort({ graph, indeg, kinds }, graphCache = null, cacheKey = null) => string[]
```

**Parameters:**
- `{ graph, indeg, kinds }` (object, required) - Dependency graph structure
- `graphCache` (DependencyGraphCache, optional) - LRU cache for results
- `cacheKey` (string, optional) - Cache key (sorted facet kinds string)

**Process:**
1. Check cache if provided (redundant but safe)
2. Start with nodes that have no dependencies (in-degree = 0)
3. Process each node:
   - Add to ordered list
   - Decrement in-degree of all dependents
   - Add dependents with in-degree = 0 to queue
4. Repeat until queue is empty
5. Check for cycles (if not all nodes processed)
6. Cache result (valid or invalid) if cache provided

**Returns:**
- Array of facet kinds in dependency order

**Throws:**
- `Error` - If dependency cycle is detected (error is cached if cache provided)

**Caching:**
- Valid results are cached with `graphCache.set(cacheKey, true, ordered, null)`
- Invalid results (cycles) are cached with `graphCache.set(cacheKey, false, null, error)`

**Example:**
```javascript
// Dependencies:
// scheduler → queue
// processor → queue, router

const ordered = topoSort({ graph, indeg, kinds });
// ordered = ['queue', 'router', 'scheduler', 'processor']
```

## Dependency Graph Caching

The build system includes an LRU cache for dependency graph topological sort results, significantly improving performance for repeated builds with the same facet combinations.

**See Also:** [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) for complete documentation on the `DependencyGraphCache` class.

### How It Works

1. **Cache Key**: Created from alphabetically sorted facet kinds (e.g., `'hierarchy,listeners,processor'`)
2. **Cache Lookup**: Before building the graph, the cache is checked using the key
3. **Cache Hit (Valid)**: Returns cached topological sort result immediately (skips graph building and sorting)
4. **Cache Hit (Invalid)**: Throws cached error immediately (avoids repeated failures)
5. **Cache Miss**: Builds graph, performs sort, and caches the result

### Benefits

- **Performance**: Skips expensive operations for known facet combinations
- **Error Caching**: Invalid graphs (cycles) are cached to avoid repeated failures
- **Deterministic**: Same set of facets always produces the same cache key

### Usage

The cache is passed as a parameter to `SubsystemBuilder` methods:

```javascript
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);  // Cache capacity: 100
await builder.build(cache);  // Pass cache explicitly
```

For direct API usage, pass the cache:

```javascript
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';

const cache = new DependencyGraphCache(100);
const plan = verifySubsystemBuild(subsystem, ctx, cache);
```

### Cache Key Generation

The cache key is created **after** all facet processing (including kernelServices stripping):

```javascript
// Facets after processing: ['processor', 'hierarchy', 'listeners']
// Cache key: 'hierarchy,listeners,processor' (alphabetically sorted)
```

This ensures that:
- Same set of facets always produces the same key
- Key is deterministic regardless of hook order
- Key reflects the final set of facets (after kernelServices stripping)

## Best Practices

1. **Always Verify Before Building:**
   ```javascript
   const plan = verifySubsystemBuild(subsystem, ctx);
   // Inspect plan if needed
   await buildSubsystem(subsystem, plan);
   ```

2. **Use SubsystemBuilder for Convenience:**
   ```javascript
   import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
   
   const builder = new SubsystemBuilder(subsystem);
   const cache = new DependencyGraphCache(100);
   await builder.withCtx(ctx).build(cache);  // Pass cache explicitly
   ```

3. **Leverage Caching for Performance:**
   ```javascript
   import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
   
   // Create cache once and reuse
   const cache = new DependencyGraphCache(200);  // Larger cache
   const builder = new SubsystemBuilder(subsystem);
   
   // Multiple builds with same facets will use cache
   await builder.build(cache);
   await builder.invalidate().build(cache);  // Still uses graph cache if facets unchanged
   ```

4. **Handle Errors Appropriately:**
   ```javascript
   try {
     const plan = verifySubsystemBuild(subsystem, ctx);
     await buildSubsystem(subsystem, plan);
   } catch (error) {
     // Handle verification or execution errors
   }
   ```

5. **Inspect Plan for Debugging:**
   ```javascript
   const plan = verifySubsystemBuild(subsystem, ctx);
   console.log('Ordered kinds:', plan.orderedKinds);
   console.log('Facets:', Object.keys(plan.facetsByKind));
   ```

6. **Use Dry-Run for Testing:**
   ```javascript
   const builder = new SubsystemBuilder(subsystem);
   const plan = builder.dryRun();  // Calls verifySubsystemBuild
   // Inspect plan without building
   ```

## Common Patterns

### Pattern: Verify and Inspect

```javascript
const plan = verifySubsystemBuild(subsystem, ctx);

// Inspect the plan
console.log('Will build facets in order:', plan.orderedKinds);
console.log('Facets:', Object.keys(plan.facetsByKind));

// Build if plan looks good
if (planIsValid(plan)) {
  await buildSubsystem(subsystem, plan);
}
```

### Pattern: Incremental Build

```javascript
// Build with minimal context
const plan1 = verifySubsystemBuild(subsystem, {});
await buildSubsystem(subsystem, plan1);

// Add more context later
const plan2 = verifySubsystemBuild(subsystem, { config: { queue: {} } });
await buildSubsystem(subsystem, plan2);
```

### Pattern: Error Recovery

```javascript
try {
  const plan = verifySubsystemBuild(subsystem, ctx);
  await buildSubsystem(subsystem, plan);
} catch (error) {
  if (error.message.includes('dependency cycle')) {
    // Handle cycle
  } else if (error.message.includes('missing facet')) {
    // Handle missing dependency
  } else {
    // Handle other errors
  }
}
```

## See Also

- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - High-level builder API that uses these utilities
- [Default Hooks](./DEFAULT-HOOKS.md) - Learn about DefaultHooks and how it's used in the build system
- [Facet Manager](./hooks/FACET-MANAGER.md) - Learn how facets are added and managed
- [Facet Manager Transaction](./hooks/FACET-MANAGER-TRANSACTION.md) - Understand transaction safety
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks that create facets
- [Facets Documentation](./hooks/FACETS.md) - Learn about the Facet class
- [Facet Init Callback](./hooks/FACET-INIT-CALLBACK.md) - Learn about the init callback called during build

