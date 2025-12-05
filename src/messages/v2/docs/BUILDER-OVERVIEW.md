# Builder Overview

## Introduction

The Mycelia Kernel uses a sophisticated **two-phase build system** that transforms subsystems from their initial configuration into fully functional, message-processing components. The build system is responsible for orchestrating hooks, creating facets, resolving dependencies, and ensuring subsystems are correctly initialized and ready to process messages.

## What is the Builder System?

The builder system is the mechanism that:

- **Transforms Hooks into Facets**: Executes hook functions to create facet objects that provide specific capabilities
- **Resolves Dependencies**: Automatically determines the correct initialization order based on facet dependencies
- **Validates Configuration**: Ensures all required facets are present and contracts are satisfied
- **Initializes Components**: Sets up facets, initializes them, and attaches them to subsystems
- **Manages Transactions**: Provides atomic operations with rollback on failure

## Core Components

### SubsystemBuilder

The `SubsystemBuilder` class provides a fluent API for building subsystems. It wraps the two-phase build system and provides:

- **Context Management**: Accumulate and merge configuration context
- **Plan Caching**: Cache build plans to avoid re-verification
- **Dry-Run Support**: Verify builds without executing them
- **Integration**: Seamlessly integrates with `BaseSubsystem`

### Build Utilities

The build utilities (`subsystem-builder.utils.mycelia.js`) provide the core two-phase build functions:

- **`verifySubsystemBuild()`**: Pure verification phase (no side effects)
- **`buildSubsystem()`**: Transactional execution phase (with side effects)

### Dependency Graph Cache

The `DependencyGraphCache` provides LRU caching for topological sort results, improving performance for subsystems with identical hook configurations.

## The Two-Phase Build System

The build process is divided into two distinct phases:

### Phase 1: Verification (Pure)

The verification phase is **pure** and performs no side effects. It:

1. **Resolves Context**: Merges subsystem context with provided context
2. **Collects Hooks**: Gathers hooks from default and user sources
3. **Creates Facets**: Executes hooks to create facet objects
4. **Validates Contracts**: Ensures facets satisfy their declared contracts
5. **Builds Dependency Graph**: Constructs a graph of facet dependencies
6. **Topological Sort**: Determines the correct initialization order
7. **Returns Build Plan**: Creates a plan object for execution

**Key Characteristics:**
- Can be run multiple times safely
- No side effects
- All errors caught before execution
- Plan can be inspected before execution

### Phase 2: Execution (Transactional)

The execution phase is **transactional** and performs side effects. It:

1. **Validates Plan**: Ensures the plan is complete and consistent
2. **Assigns Context**: Updates subsystem context with resolved context
3. **Filters Facets**: Removes facets that already exist (for rebuilding)
4. **Adds Facets**: Uses FacetManager's transactional `addMany()` to add facets
5. **Initializes Facets**: Calls `facet.init()` for each facet
6. **Attaches Facets**: Attaches facets to subsystem if needed
7. **Builds Children**: Recursively builds child subsystems

**Key Characteristics:**
- Atomic operations (all-or-nothing)
- Automatic rollback on failure
- Side effects (modifies subsystem state)
- Transactional safety

## Why Two Phases?

The separation of verification and execution provides several benefits:

### Safety

- **Early Validation**: All errors are caught before any changes are made
- **No Partial State**: Either the build succeeds completely or fails without side effects
- **Predictable Behavior**: Verification can be run multiple times without consequences

### Flexibility

- **Dry-Run Capability**: Verify builds without executing them
- **Plan Inspection**: Examine build plans before execution
- **Incremental Builds**: Plans can be cached and reused

### Performance

- **Dependency Graph Caching**: Topological sort results are cached
- **Plan Caching**: Build plans are cached when context hasn't changed
- **Efficient Rebuilds**: Only changed facets are re-added

## Build Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Build Process Flow                       │
└─────────────────────────────────────────────────────────────┘

1. User calls subsystem.build()
   │
   ▼
2. SubsystemBuilder.build()
   │
   ▼
3. Verify Phase (verifySubsystemBuild)
   │  ├─ Resolve context
   │  ├─ Collect hooks
   │  ├─ Create facets
   │  ├─ Validate contracts
   │  ├─ Build dependency graph
   │  └─ Topological sort
   │
   ▼
4. Create Build Plan
   │  ├─ resolvedCtx
   │  ├─ orderedKinds
   │  └─ facetsByKind
   │
   ▼
5. Execute Phase (buildSubsystem)
   │  ├─ Validate plan
   │  ├─ Assign context
   │  ├─ Filter facets
   │  ├─ Add facets (transactional)
   │  ├─ Initialize facets
   │  ├─ Attach facets
   │  └─ Build children
   │
   ▼
6. Subsystem Ready
```

## Dependency Resolution

The build system automatically resolves dependencies using topological sorting:

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

### Topological Sort

Uses Kahn's algorithm to determine initialization order:

- **Input**: Dependency graph (which facets depend on which)
- **Output**: Ordered array of facet kinds (dependencies first)
- **Algorithm**: Processes nodes with zero in-degree, removes edges, repeats

**Example:**
```
Dependencies:
  listeners (no deps)
  statistics (depends on: listeners)
  processor (depends on: statistics, listeners)
  scheduler (depends on: processor)

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

- **Cache Key**: Based on hook kinds and their dependencies
- **Cache Storage**: LRU cache with configurable capacity
- **Benefits**: Faster builds for subsystems with identical hook configurations

### Plan Caching

The SubsystemBuilder caches build plans:

- **Cache Key**: Hash of context object
- **Invalidation**: Context changes or manual invalidation
- **Benefits**: Avoids re-verification when context hasn't changed

## Usage Patterns

### Basic Usage

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

await subsystem.build();
```

### With Custom Context

```javascript
await subsystem.build({
  config: {
    queue: { maxSize: 200 },
    router: { strict: true }
  }
});
```

### Using Builder API

```javascript
const builder = new SubsystemBuilder(subsystem);

builder
  .withCtx({ config: { queue: { maxSize: 100 } } })
  .withCtx({ config: { router: { strict: true } } })
  .plan(); // Verify phase

const plan = builder.getPlan();
console.log('Facets to add:', plan.orderedKinds);

await builder.build(); // Execute phase
```

### Dry-Run

```javascript
const builder = new SubsystemBuilder(subsystem);

// Verify without executing
builder.plan();
const plan = builder.getPlan();

// Inspect plan
if (plan.orderedKinds.length === 0) {
  console.warn('No facets to add');
  return;
}

// Execute later
await builder.build();
```

## Related Documentation

- [How Builder Works](./HOW-BUILDER-WORKS.md) - Detailed explanation of the build process
- [Build Diagrams](./BUILD-DIAGRAMS.md) - Visual representations of the build process
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Builder API reference
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Two-phase build utilities
- [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) - LRU cache for dependency graphs
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core subsystem class
- [Facet Manager](./hooks/FACET-MANAGER.md) - Facet management and transactions





