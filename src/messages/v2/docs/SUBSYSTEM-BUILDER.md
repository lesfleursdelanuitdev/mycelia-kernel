# Subsystem Builder

## Overview

The **SubsystemBuilder** class provides a fluent, builder-pattern API for building subsystems. It encapsulates the two-phase build process (verification and execution) and provides convenient methods for managing context, creating build plans, and executing builds.

**Key Features:**
- **Fluent API**: Method chaining for easy configuration
- **Context Management**: Accumulate and manage build context
- **Plan Caching**: Cache build plans for reuse
- **Dependency Graph Caching**: LRU cache for topological sort results
- **Dry-Run Support**: Verify builds without executing them
- **Integration**: Seamlessly integrates with BaseSubsystem

## What is SubsystemBuilder?

`SubsystemBuilder` is a builder class that orchestrates the subsystem build process. It provides a high-level API that wraps the lower-level build utilities (`verifySubsystemBuild` and `buildSubsystem`).

**Purpose:**
- Simplify subsystem building with a fluent API
- Manage build context accumulation
- Support plan inspection before execution
- Enable dry-run capabilities
- Cache build plans for efficiency

**Integration:**
- Created automatically by `BaseSubsystem` constructor
- Used internally by `BaseSubsystem.build()`
- Can be used directly for advanced scenarios

## Creating a SubsystemBuilder

`SubsystemBuilder` is typically created automatically by `BaseSubsystem`:

```javascript
// In BaseSubsystem constructor
this._builder = new SubsystemBuilder(this);
```

You can also create it directly:

```javascript
import { SubsystemBuilder } from './models/subsystem-builder/subsystem-builder.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
```

**Constructor:**
```javascript
new SubsystemBuilder(subsystem)
```

**Parameters:**
- `subsystem` (BaseSubsystem, required) - The subsystem to build

**Throws:**
- `Error` - If subsystem is not provided

## Methods

### `withCtx(ctx)`

Adds or merges context into the builder's context.

**Signature:**
```javascript
withCtx(ctx = {}) => SubsystemBuilder
```

**Parameters:**
- `ctx` (object, optional) - Context object to merge

**Returns:** `SubsystemBuilder` - Returns `this` for method chaining

**Behavior:**
- Merges provided context with existing context
- Context is accumulated across multiple calls
- Returns builder instance for chaining

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);

builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .withCtx({ config: { router: { strict: true } } })
  .build();
```

**Use Case:** Accumulate context from multiple sources before building.

### `clearCtx()`

Clears all accumulated context.

**Signature:**
```javascript
clearCtx() => SubsystemBuilder
```

**Returns:** `SubsystemBuilder` - Returns `this` for method chaining

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);

builder
  .withCtx({ config: { queue: {} } })
  .clearCtx()  // Reset context
  .withCtx({ config: { router: {} } })
  .build();
```

**Use Case:** Reset context when reusing a builder instance.

### `plan(graphCache)`

Creates a build plan by running the verification phase.

**Signature:**
```javascript
plan(graphCache = null) => { plan: BuildPlan, graphCache: DependencyGraphCache | null }
```

**Parameters:**
- `graphCache` (DependencyGraphCache, optional) - LRU cache for dependency graph results

**Returns:** Object containing:
- `plan` (object) - Build plan object with:
  - `resolvedCtx` (object) - Resolved context
  - `orderedKinds` (string[]) - Facet kinds in dependency order
  - `facetsByKind` (object) - Map of facet kind to Facet instance
- `graphCache` (DependencyGraphCache | null) - The cache instance (same as input, or null)

**Behavior:**
- Runs `verifySubsystemBuild(subsystem, this.#ctx, graphCache)`
- Caches the plan in `#plan`
- Returns both the plan and the cache for reuse

**Example:**
```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

const { plan, graphCache } = builder.plan(cache);

console.log('Will build facets:', plan.orderedKinds);
console.log('Facets:', Object.keys(plan.facetsByKind));

// Reuse the same cache for subsequent builds
const { plan: plan2 } = builder.plan(graphCache);
```

**Use Case:** Inspect what will be built before executing, with optional caching for performance.

### `dryRun(graphCache)`

Alias for `plan()`. Creates a build plan without executing.

**Signature:**
```javascript
dryRun(graphCache = null) => { plan: BuildPlan, graphCache: DependencyGraphCache | null }
```

**Parameters:**
- `graphCache` (DependencyGraphCache, optional) - LRU cache for dependency graph results

**Returns:** Object containing plan and cache (same as `plan()`)

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

const { plan } = builder.dryRun(cache);  // Same as plan(cache)
```

**Use Case:** Semantic clarity when you only want to verify, not build.

### `getPlan()`

Returns the cached build plan, or `null` if no plan exists.

**Signature:**
```javascript
getPlan() => BuildPlan | null
```

**Returns:** Cached build plan or `null`

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);

builder.plan();  // Create and cache plan
const plan = builder.getPlan();  // Retrieve cached plan
```

**Use Case:** Access cached plan without recreating it.

### `invalidate()`

Invalidates the cached build plan.

**Signature:**
```javascript
invalidate() => SubsystemBuilder
```

**Returns:** `SubsystemBuilder` - Returns `this` for method chaining

**Behavior:**
- Clears the cached plan (`#plan = null`)
- Next call to `plan()` or `build()` will create a new plan

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);

builder.plan();  // Create plan
builder.invalidate();  // Clear plan
builder.plan();  // Create new plan
```

**Use Case:** Force plan regeneration when subsystem configuration changes.

### `build(graphCache)`

Executes the build process using the cached plan or creating a new one.

**Signature:**
```javascript
async build(graphCache = null) => Promise<BaseSubsystem>
```

**Parameters:**
- `graphCache` (DependencyGraphCache, optional) - LRU cache for dependency graph results

**Returns:** `Promise<BaseSubsystem>` - Resolves to the built subsystem

**Behavior:**
1. Uses cached plan if available, otherwise calls `plan(graphCache)` to create one
2. Calls `buildSubsystem(subsystem, plan)` to execute the build
3. Returns the subsystem instance

**Example:**
```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

await builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .build(cache);
```

**Use Case:** Execute the complete build process with optional caching for performance.

## Usage Patterns

### Pattern: Basic Build

```javascript
// In BaseSubsystem.build()
async build(ctx = {}) {
  this._builder.withCtx(ctx);
  await this._builder.build();
  return this;
}
```

### Pattern: Plan Inspection

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// Create plan and inspect
const { plan } = builder.plan(cache);

// Check what will be built
if (plan.orderedKinds.includes('queue')) {
  console.log('Queue facet will be built');
}

// Build if plan looks good (reuse cache)
await builder.build(cache);
```

### Pattern: Dry Run

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// Verify without building
const { plan } = builder.dryRun(cache);

// Validate plan
if (isValidPlan(plan)) {
  await builder.build(cache);
} else {
  console.error('Invalid build plan');
}
```

### Pattern: Context Accumulation

```javascript
const builder = new SubsystemBuilder(subsystem);

// Accumulate context from multiple sources
builder
  .withCtx(getBaseContext())
  .withCtx(getUserContext())
  .withCtx(getEnvironmentContext())
  .build();
```

### Pattern: Plan Caching

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// Create plan once
const { plan } = builder.plan(cache);

// Use cached plan multiple times
if (shouldBuild) {
  await builder.build(cache);  // Uses cached plan
}

// Invalidate if configuration changes
if (configurationChanged) {
  builder.invalidate();
  await builder.build(cache);  // Creates new plan
}
```

### Pattern: Conditional Build

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// Create plan
const { plan } = builder.plan(cache);

// Check if build is needed
if (needsBuild(plan)) {
  await builder.build(cache);
} else {
  console.log('Subsystem already configured correctly');
}
```

## Integration with BaseSubsystem

`SubsystemBuilder` is tightly integrated with `BaseSubsystem`:

### Automatic Creation

```javascript
// In BaseSubsystem constructor
this._builder = new SubsystemBuilder(this);
```

### Build Method Integration

```javascript
// In BaseSubsystem.build()
async build(ctx = {}) {
  if (this._isBuilt) return this;
  if (this._buildPromise) return this._buildPromise;

  this._buildPromise = (async () => {
    try {
      this._builder.withCtx(ctx);  // Add context
      await this._builder.build();  // Execute build
      // ... post-build logic
      return this;
    } finally {
      this._buildPromise = null;
    }
  })();

  return this._buildPromise;
}
```

### Disposal Integration

```javascript
// In BaseSubsystem.dispose()
async dispose() {
  // ... disposal logic
  this._builder.invalidate();  // Clear cached plan
}
```

## Build Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SubsystemBuilder Build Flow                     │
└─────────────────────────────────────────────────────────────┘

1. Builder Creation
   │
   ├─▶ new SubsystemBuilder(subsystem)
   │      │
   │      └─▶ #subsystem = subsystem
   │      └─▶ #ctx = {}
   │      └─▶ #plan = null
   │
   ▼
2. Context Accumulation (Optional)
   │
   ├─▶ builder.withCtx(ctx1)
   │      │
   │      └─▶ #ctx = { ...ctx1 }
   │
   ├─▶ builder.withCtx(ctx2)
   │      │
   │      └─▶ #ctx = { ...ctx1, ...ctx2 }
   │
   ▼
3. Plan Creation (Optional)
   │
   ├─▶ builder.plan(graphCache)
   │      │
   │      ├─▶ verifySubsystemBuild(subsystem, #ctx, graphCache)
   │      │      │
   │      │      ├─▶ Create cache key from sorted facet kinds
   │      │      │
   │      │      ├─▶ Check cache for topological sort result
   │      │      │      │
   │      │      │      ├─▶ Cache hit (valid): Return cached orderedKinds
   │      │      │      │
   │      │      │      └─▶ Cache hit (invalid): Throw cached error
   │      │      │
   │      │      ├─▶ Cache miss: Build graph and sort
   │      │      │      │
   │      │      │      └─▶ Cache result (valid or invalid)
   │      │      │
   │      │      └─▶ Returns: { resolvedCtx, orderedKinds, facetsByKind }
   │      │
   │      └─▶ #plan = plan
   │      └─▶ Returns: { plan, graphCache }
   │
   ▼
4. Build Execution
   │
   ├─▶ builder.build(graphCache)
   │      │
   │      ├─▶ plan = #plan ?? plan(graphCache)  // Use cached or create
   │      │
   │      └─▶ buildSubsystem(subsystem, plan)
   │             │
   │             ├─▶ Assign resolvedCtx to subsystem
   │             │
   │             ├─▶ FacetManager.addMany(...)
   │             │      │
   │             │      └─▶ Add, init, attach facets
   │             │
   │             └─▶ buildChildren(subsystem)
   │
   ▼
5. Complete
   │
   └─▶ Subsystem built with all facets initialized
```

## Context Management

`SubsystemBuilder` manages context accumulation:

### Context Merging

```javascript
const builder = new SubsystemBuilder(subsystem);

// Context is merged, not replaced
builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .withCtx({ config: { router: { strict: true } } });

// Final context:
// {
//   config: {
//     queue: { maxSize: 100 },
//     router: { strict: true }
//   }
// }
```

### Context Resolution

The context is resolved during `plan()`:

```javascript
// In verifySubsystemBuild
const resolvedCtx = resolveCtx(subsystem, this.#ctx);
// resolvedCtx = { ...subsystem.ctx, ...this.#ctx }
```

**Note:** The builder's context (`#ctx`) is merged with the subsystem's existing context (`subsystem.ctx`).

## Plan Caching

`SubsystemBuilder` caches build plans for efficiency:

### Caching Behavior

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// First call creates and caches plan
const { plan: plan1 } = builder.plan(cache);

// Second call returns cached plan (plan is cached internally)
const { plan: plan2 } = builder.plan(cache);  // Same plan, no re-verification

// Build uses cached plan
await builder.build(cache);  // Uses cached plan
```

### Cache Invalidation

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

builder.plan(cache);  // Cache plan

// Configuration changes
subsystem.hooks.push(newHook);

// Invalidate plan cache
builder.invalidate();

// Next plan() or build() creates new plan (graph cache still valid)
await builder.build(cache);  // Creates new plan, but graph cache may still be used
```

## Dependency Graph Caching

`SubsystemBuilder` maintains an LRU (Least Recently Used) cache for dependency graph topological sort results. This significantly improves performance when building subsystems with the same set of facets.

### How It Works

The cache stores the topologically sorted result for each unique combination of facet kinds:

1. **Cache Key**: Alphabetically sorted, comma-separated facet kinds (e.g., `'hierarchy,listeners,processor,queries,router,statistics'`)
2. **Cache Value**: The topologically sorted array of facet kinds, or an error if the graph is invalid
3. **LRU Eviction**: When the cache reaches capacity, the least recently used entry is evicted

### Benefits

- **Performance**: Skips expensive graph building and topological sorting for known facet combinations
- **Error Caching**: Invalid dependency graphs (e.g., cycles) are cached to avoid repeated failures
- **Deterministic**: Same set of facets always produces the same cache key and result

### Cache Behavior

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(50);  // Cache capacity: 50

// First build with facets: [hierarchy, listeners, processor]
await builder.build(cache);  // Builds graph, sorts, caches result

// Second build with same facets
await builder.build(cache);  // Uses cached topological sort (skips graph building)

// Build with different facets: [hierarchy, router, scheduler]
await builder.build(cache);  // New cache entry (different key)
```

### Cache Key Generation

The cache key is created from the sorted facet kinds **after** all processing (including kernelServices stripping):

```javascript
// Facets: ['processor', 'hierarchy', 'listeners']
// Cache key: 'hierarchy,listeners,processor' (alphabetically sorted)

// Same facets in different order produce same key
// Facets: ['listeners', 'processor', 'hierarchy']
// Cache key: 'hierarchy,listeners,processor' (same key)
```

### Cache Capacity

You create the cache with your desired capacity:

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

// Small cache for memory-constrained environments
const cache = new DependencyGraphCache(10);
const builder = new SubsystemBuilder(subsystem);

// Large cache for systems with many facet combinations
const cache = new DependencyGraphCache(500);
const builder = new SubsystemBuilder(subsystem);
```

### Cache Management

The dependency graph cache is managed externally:
- **LRU Eviction**: Least recently used entries are evicted when capacity is reached
- **Shared or Per-Builder**: You can create one cache to share across builders, or one per builder
- **Persistent**: Cache persists across multiple `plan()` and `build()` calls when you pass the same instance

**Note**: The dependency graph cache is separate from the build plan cache. The plan cache stores complete build plans, while the dependency graph cache stores only the topological sort results.

For complete details on the dependency graph cache, see [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md).

**Example: Shared Cache**
```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

// Create one cache to share across multiple builders
const sharedCache = new DependencyGraphCache(200);

const builder1 = new SubsystemBuilder(subsystem1);
const builder2 = new SubsystemBuilder(subsystem2);

// Both builders can use the same cache
await builder1.build(sharedCache);
await builder2.build(sharedCache);
```

## Error Handling

### Build Errors

Errors from `verifySubsystemBuild` or `buildSubsystem` propagate:

```javascript
const builder = new SubsystemBuilder(subsystem);

try {
  await builder.build();
} catch (error) {
  if (error.message.includes('dependency cycle')) {
    // Handle dependency cycle
  } else if (error.message.includes('missing facet')) {
    // Handle missing dependency
  } else {
    // Handle other errors
  }
}
```

### Plan Errors

Errors during `plan()` are thrown immediately:

```javascript
const builder = new SubsystemBuilder(subsystem);

try {
  const plan = builder.plan();
} catch (error) {
  // Verification failed
  console.error('Build plan validation failed:', error);
}
```

## Best Practices

1. **Use Builder for Complex Builds**: When you need to accumulate context or inspect plans before building.

2. **Cache Plans When Possible**: If you need to inspect a plan multiple times, use `plan()` once and `getPlan()` for subsequent access.

3. **Invalidate on Changes**: If subsystem configuration changes (hooks added/removed), call `invalidate()` before building.

4. **Use Dry-Run for Validation**: Use `dryRun()` to validate builds before executing them.

5. **Chain Methods**: Take advantage of method chaining for fluent API:

   ```javascript
   builder
     .withCtx(ctx1)
     .withCtx(ctx2)
     .plan()
     .build();
   ```

6. **Handle Errors Appropriately**: Wrap build calls in try-catch to handle validation and execution errors.

## Common Patterns

### Pattern: Incremental Context

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

// Build with minimal context
await builder
  .withCtx({ config: { queue: {} } })
  .build(cache);

// Add more context later
await builder
  .withCtx({ config: { router: {} } })
  .invalidate()  // Force new plan
  .build(cache);
```

### Pattern: Plan Validation

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

function validatePlan(plan) {
  const requiredFacets = ['queue', 'router', 'scheduler'];
  const hasAll = requiredFacets.every(kind => 
    plan.orderedKinds.includes(kind)
  );
  return hasAll;
}

const { plan } = builder.plan(cache);

if (validatePlan(plan)) {
  await builder.build(cache);
} else {
  throw new Error('Build plan missing required facets');
}
```

### Pattern: Conditional Execution

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

const { plan } = builder.plan(cache);

// Check if build is needed
const needsBuild = !subsystem._isBuilt || 
                   plan.orderedKinds.length !== subsystem.api.__facets.size();

if (needsBuild) {
  await builder.build(cache);
}
```

## Comparison: Direct vs Builder API

### Direct API

```javascript
import { verifySubsystemBuild, buildSubsystem } from './subsystem-builder.utils.mycelia.js';

const plan = verifySubsystemBuild(subsystem, ctx);
await buildSubsystem(subsystem, plan);
```

### Builder API

```javascript
import { DependencyGraphCache } from './dependency-graph-cache.mycelia.js';

const builder = new SubsystemBuilder(subsystem);
const cache = new DependencyGraphCache(100);

await builder
  .withCtx(ctx)
  .build(cache);
```

**Benefits of Builder API:**
- Fluent method chaining
- Context accumulation
- Plan caching
- Dependency graph caching (LRU)
- Dry-run support
- Better integration with BaseSubsystem

## See Also

- [Base Subsystem](./BASE-SUBSYSTEM.md) - Complete guide to BaseSubsystem and how it uses SubsystemBuilder
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Learn about the underlying build utilities
- [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) - LRU cache for dependency graph results
- [Default Hooks](./DEFAULT-HOOKS.md) - Learn about default hook sets
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks that create facets
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets
- [Facet Manager](./hooks/FACET-MANAGER.md) - Learn how facets are managed

