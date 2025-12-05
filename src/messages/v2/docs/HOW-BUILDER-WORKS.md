# How Builder Works

## Overview

The Mycelia Kernel uses a sophisticated two-phase build system that separates **verification** (pure, side-effect-free) from **execution** (transactional, with side effects). This design ensures that subsystems are fully validated before any changes are made, providing safety, predictability, and the ability to inspect build plans before execution.

## The Two-Phase Build System

The build process consists of two distinct phases:

1. **Verify Phase** - Pure validation and planning
2. **Execute Phase** - Transactional execution with side effects

### Why Two Phases?

**Separation of Concerns:**
- Verification is pure and can be run multiple times without side effects
- Execution is transactional and atomic
- Errors are caught before any changes are made

**Benefits:**
- **Dry-Run Capability**: Verify builds without executing them
- **Early Validation**: All errors caught before execution
- **Plan Inspection**: Build plans can be examined before execution
- **Incremental Builds**: Plans can be cached and reused
- **Performance**: Dependency graph results are cached

## Phase 1: Verification (`verifySubsystemBuild`)

The verification phase is a **pure function** that validates the subsystem configuration and creates a build plan. It performs no side effects and can be run multiple times safely.

### Step-by-Step Process

#### 1. Context Resolution

Merges the provided context with the subsystem's existing context:

```javascript
const resolvedCtx = resolveCtx(subsystem, ctx);
// resolvedCtx = { ...subsystem.ctx, ...ctx }
```

**What happens:**
- Base context from `subsystem.ctx` is merged with provided `ctx`
- Deep merge for `config` objects (allows nested configuration)
- Returns a new object (no mutations to original context)

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
- Combined in order: defaults first, then user hooks

#### 3. Hook Metadata Extraction (First Pass)

Extracts metadata from all hooks before execution:

```javascript
for (const hook of hooks) {
  const hookKind = hook.kind;
  const hookOverwrite = hook.overwrite === true;
  const hookRequired = hook.required || [];
  const hookSource = hook.source || '<unknown>';
  
  // Store metadata for dependency checking
  hooksByKind[hookKind] = {
    required: hookRequired,
    source: hookSource,
    overwrite: hookOverwrite
  };
}
```

**What's extracted:**
- `kind` - Facet kind identifier
- `overwrite` - Whether hook allows overwriting existing facets
- `required` - Array of required facet dependencies
- `source` - Source URL or identifier for debugging

#### 4. Facet Creation (Second Pass)

Executes hooks to create facets:

```javascript
for (const hook of hooks) {
  const hookKind = hook.kind;
  
  // Execute hook to create facet
  const facet = await hook(resolvedCtx, subsystem.api, subsystem);
  
  // Check overwrite permissions
  if (facetsByKind[hookKind] && !hook.overwrite && !facet.shouldOverwrite()) {
    throw new Error(`Hook '${hookKind}' cannot overwrite existing facet`);
  }
  
  facetsByKind[hookKind] = facet;
}
```

**What happens:**
- Each hook is executed with `(ctx, api, subsystem)` parameters
- Hook returns a `Facet` instance
- Overwrite permissions are checked (both hook and facet must allow overwrite)
- Facets are stored by kind in `facetsByKind` object

#### 5. Contract Validation

Validates that facets satisfy their declared contracts:

```javascript
for (const [kind, facet] of Object.entries(facetsByKind)) {
  const contract = facet.contract;
  if (contract) {
    contractRegistry.enforce(resolvedCtx, subsystem.api, subsystem, facet);
  }
}
```

**What's validated:**
- Required methods are present
- Required properties are present
- Custom validation functions pass

#### 6. Dependency Graph Construction

Builds a dependency graph from hook and facet metadata:

```javascript
const graph = buildDepGraph(hooksByKind, facetsByKind, subsystem);
```

**Dependency Sources:**
- **Hook metadata**: `hook.required` array
- **Facet metadata**: `facet.getDependencies()` method

**Graph Structure:**
- Directed graph: `dep -> Set(of dependents)`
- In-degree tracking for topological sort
- Special handling for `kernelServices` dependency (skipped if kernel not initialized)

**Example:**
```
listeners (no deps)
  └─> statistics (depends on: listeners)
      └─> processor (depends on: statistics, listeners)
          └─> scheduler (depends on: processor, queue)
```

#### 7. Topological Sort

Sorts facets in dependency order using Kahn's algorithm:

```javascript
const orderedKinds = topoSort(graph, graphCache, cacheKey);
```

**What happens:**
- Uses Kahn's topological sort algorithm
- Ensures dependencies are initialized before dependents
- Caches results in `DependencyGraphCache` for performance
- Detects circular dependencies and throws errors

**Cache Key:**
- Based on hook kinds and their dependencies
- Allows reuse of sort results for identical configurations

#### 8. Return Build Plan

Returns a build plan object:

```javascript
return {
  resolvedCtx,      // Merged context
  orderedKinds,     // Facet kinds in dependency order
  facetsByKind,     // Map of facet kind to Facet instance
  graphCache        // Updated cache reference
};
```

**Plan Structure:**
- `resolvedCtx` - Complete context for execution
- `orderedKinds` - Array of facet kinds in initialization order
- `facetsByKind` - Object mapping kind to Facet instance
- `graphCache` - Cache reference (may be updated with new entries)

## Phase 2: Execution (`buildSubsystem`)

The execution phase is **transactional** and performs side effects. It uses the plan from the verify phase to add, initialize, and attach facets.

### Step-by-Step Process

#### 1. Plan Validation

Validates that the plan is complete and consistent:

```javascript
if (!plan) throw new Error('buildSubsystem: invalid plan');
const { resolvedCtx, orderedKinds, facetsByKind } = plan;

// Validate structure
if (!Array.isArray(orderedKinds)) throw new Error('invalid plan');
if (!facetsByKind || typeof facetsByKind !== 'object') throw new Error('invalid plan');

// Validate consistency
if (orderedKinds.length !== Object.keys(facetsByKind).length) {
  throw new Error('plan inconsistency');
}
```

**What's validated:**
- Plan object exists
- `orderedKinds` is an array
- `facetsByKind` is an object
- Both have matching counts

#### 2. Context Assignment

Assigns resolved context to subsystem:

```javascript
subsystem.ctx = resolvedCtx;
```

**What happens:**
- Subsystem's context is updated with resolved context
- This context is available to all facets during initialization
- Includes `ms`, `config`, `debug`, and `graphCache`

#### 3. Facet Filtering

Filters out facets that already exist (for rebuilding):

```javascript
const facetsToAdd = {};
const kindsToAdd = [];

for (const kind of orderedKinds) {
  if (!subsystem.api.__facets.has(kind)) {
    facetsToAdd[kind] = facetsByKind[kind];
    kindsToAdd.push(kind);
  }
}
```

**What happens:**
- Only adds facets that don't already exist
- Allows incremental builds
- Prevents duplicate facet errors

#### 4. Transactional Facet Addition

Adds facets using FacetManager's transactional `addMany`:

```javascript
await subsystem.api.__facets.addMany(kindsToAdd, facetsToAdd, {
  init: true,
  attach: true,
  ctx: resolvedCtx,
  api: subsystem.api
});
```

**What happens:**
- Begins a transaction
- For each facet (in dependency order):
  1. **Add**: Registers facet in FacetManager
  2. **Init**: Calls `facet.init(ctx, api, subsystem)` if present
  3. **Attach**: Calls `facet.shouldAttach()` and attaches if true
- If any step fails, transaction rolls back
- All facets are disposed and removed on rollback

**Transaction Safety:**
- All-or-nothing: either all facets are added or none
- Automatic rollback on any failure
- Best-effort disposal of failed facets

#### 5. Child Subsystem Building

Builds all child subsystems:

```javascript
await buildChildren(subsystem);
```

**What happens:**
- Collects child subsystems from hierarchy facet or direct children
- For each child:
  - Merges parent's context (including `graphCache`)
  - Calls `child.build(ctx)`
  - Waits for completion
- Children are built recursively (their children are built too)

## SubsystemBuilder Integration

The `SubsystemBuilder` class provides a fluent API that wraps the two-phase build system.

### Builder Flow

```javascript
const builder = new SubsystemBuilder(subsystem);

// 1. Accumulate context
builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .withCtx({ config: { router: { strict: true } } });

// 2. Create plan (verify phase)
builder.plan(graphCache);
const plan = builder.getPlan();

// 3. Inspect plan (optional)
console.log('Facets to add:', plan.orderedKinds);

// 4. Execute build (execution phase)
await builder.build(graphCache);
```

### Plan Caching

The builder caches plans to avoid re-verification:

```javascript
// First call: runs verify phase
builder.plan(graphCache);

// Second call with same context: returns cached plan
builder.plan(graphCache); // Uses cached plan

// Context changed: invalidates cache and re-verifies
builder.withCtx({ config: { queue: { maxSize: 200 } } });
builder.plan(graphCache); // Re-verifies
```

**Cache Invalidation:**
- Context changes (detected via hash comparison)
- Manual invalidation via `builder.invalidate()`
- Subsystem disposal

### Dry-Run Support

The builder supports dry-run (verification without execution):

```javascript
// Verify without executing
builder.plan(graphCache);
const plan = builder.getPlan();

// Inspect plan
console.log('Will add facets:', plan.orderedKinds);
console.log('Dependencies:', plan.facetsByKind);

// Execute later
await builder.build(graphCache);
```

## Dependency Resolution

The build system automatically resolves dependencies using topological sorting.

### Dependency Sources

1. **Hook Metadata**: `hook.required` array
   ```javascript
   export const useProcessor = createHook({
     kind: 'processor',
     required: ['statistics', 'listeners']
   });
   ```

2. **Facet Metadata**: `facet.getDependencies()` method
   ```javascript
   facet.getDependencies = () => ['queue', 'router'];
   ```

### Topological Sort Algorithm

Uses Kahn's algorithm for topological sorting:

1. **Build Graph**: Create dependency graph
2. **Track In-Degrees**: Count incoming dependencies for each node
3. **Process Queue**: Start with nodes having zero in-degree
4. **Remove Edges**: As nodes are processed, remove their outgoing edges
5. **Update In-Degrees**: Decrement in-degrees of dependent nodes
6. **Detect Cycles**: If queue becomes empty before all nodes processed, cycle exists

**Example:**
```
Initial state:
  listeners: in-degree=0
  statistics: in-degree=1 (depends on listeners)
  processor: in-degree=2 (depends on statistics, listeners)
  scheduler: in-degree=1 (depends on processor)

Processing:
  1. Process 'listeners' (in-degree=0)
     - Remove edge: listeners -> statistics
     - statistics: in-degree=0 (ready)
  2. Process 'statistics' (in-degree=0)
     - Remove edge: statistics -> processor
     - processor: in-degree=1
  3. Process 'processor' (in-degree=0)
     - Remove edge: processor -> scheduler
     - scheduler: in-degree=0 (ready)
  4. Process 'scheduler' (in-degree=0)

Result: [listeners, statistics, processor, scheduler]
```

## Error Handling

### Verification Phase Errors

Errors in verification are caught before any changes:

- **Missing Dependencies**: Thrown during graph construction
- **Circular Dependencies**: Detected during topological sort
- **Contract Violations**: Thrown during contract validation
- **Invalid Hooks**: Thrown during hook execution

**All errors prevent execution** - no side effects occur.

### Execution Phase Errors

Errors in execution trigger transaction rollback:

- **Init Failures**: If `facet.init()` throws, transaction rolls back
- **Attach Failures**: If attach fails, transaction rolls back
- **Child Build Failures**: If child build fails, parent transaction may roll back

**Rollback Process:**
1. Dispose all facets added in this transaction (in reverse order)
2. Remove facets from FacetManager
3. Restore previous state
4. Throw error to caller

## Performance Optimizations

### Dependency Graph Caching

The build system caches topological sort results:

```javascript
const cacheKey = generateCacheKey(hooksByKind);
const cached = graphCache.get(cacheKey);

if (cached && cached.valid) {
  return cached.orderedKinds; // Use cached result
}

// Otherwise, compute and cache
const orderedKinds = topoSort(graph);
graphCache.set(cacheKey, { orderedKinds, valid: true });
```

**Cache Key:**
- Based on hook kinds and their dependencies
- Identical configurations produce identical keys
- Allows reuse across subsystems with same hook sets

**Benefits:**
- Faster builds for subsystems with identical hook configurations
- Reduced CPU usage for topological sorting
- LRU eviction prevents unbounded memory growth

### Plan Caching

The SubsystemBuilder caches build plans:

```javascript
// Cache plan based on context hash
const ctxHash = hashCtx(ctx);
if (this.#plan && this.#lastCtxHash === ctxHash) {
  return this.#plan; // Use cached plan
}
```

**Benefits:**
- Avoids re-verification when context hasn't changed
- Faster incremental builds
- Supports dry-run without re-verification

## Best Practices

### 1. Use Builder API for Complex Builds

```javascript
// Good: Use builder for complex context accumulation
const builder = new SubsystemBuilder(subsystem);
builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .withCtx({ config: { router: { strict: true } } })
  .plan();

await builder.build();
```

### 2. Inspect Plans Before Execution

```javascript
// Good: Verify before executing
builder.plan();
const plan = builder.getPlan();

if (plan.orderedKinds.length === 0) {
  console.warn('No facets to add');
  return;
}

await builder.build();
```

### 3. Reuse Graph Cache

```javascript
// Good: Reuse cache across subsystems
const graphCache = new DependencyGraphCache(100);

await parent.build({ graphCache });
await child1.build({ graphCache });
await child2.build({ graphCache });
```

### 4. Handle Errors Gracefully

```javascript
// Good: Handle verification errors
try {
  builder.plan();
} catch (error) {
  if (error.message.includes('missing facet')) {
    console.error('Dependency error:', error);
    // Fix dependencies and retry
  }
  throw error;
}
```

## Related Documentation

- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Builder API reference
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Two-phase build utilities
- [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) - LRU cache for dependency graphs
- [Build Diagrams](./BUILD-DIAGRAMS.md) - Visual representations of the build process
- [Facet Manager](./hooks/FACET-MANAGER.md) - Facet management and transactions
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core subsystem class





