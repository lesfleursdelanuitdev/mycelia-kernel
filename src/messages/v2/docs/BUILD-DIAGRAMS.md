# Build Diagrams

This document provides visual representations of the Mycelia Kernel build process, showing how subsystems are built from hooks to facets.

## Build Process Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Subsystem Build Process                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │ BaseSubsystem │
                    │   .build()   │
                    └──────┬───────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  SubsystemBuilder     │
              │    .build()           │
              └──────┬────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│ Verify Phase  │        │ Execute Phase │
│  (Pure)       │───────▶│ (Transactional)│
└───────────────┘        └───────────────┘
```

## Two-Phase Build Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      VERIFY PHASE (Pure)                        │
└─────────────────────────────────────────────────────────────────┘

1. Context Resolution
   ┌──────────────┐
   │ subsystem.ctx│  +  provided ctx
   └──────┬───────┘
          │ merge
          ▼
   ┌──────────────┐
   │ resolvedCtx  │
   └──────┬───────┘
          │
          ▼
2. Hook Collection
   ┌──────────────┐     ┌──────────────┐
   │ defaultHooks │  +  │  user hooks  │
   └──────┬───────┘     └──────┬───────┘
          │                    │
          └────────┬───────────┘
                   │ combine
                   ▼
          ┌──────────────┐
          │  all hooks   │
          └──────┬───────┘
                 │
                 ▼
3. Hook Execution
   ┌─────────────────────────────────────┐
   │  for each hook:                     │
   │    hook(ctx, api, subsystem)        │
   │    └─> returns Facet               │
   └──────┬──────────────────────────────┘
          │
          ▼
   ┌──────────────┐
   │ facetsByKind │
   │ {            │
   │   listeners: Facet,│
   │   queue: Facet,    │
   │   router: Facet,   │
   │   ...              │
   │ }                  │
   └──────┬─────────────┘
          │
          ▼
4. Dependency Graph Construction
   ┌─────────────────────────────────────┐
   │  Build dependency graph:           │
   │                                     │
   │  listeners ──┐                      │
   │              │                       │
   │              ▼                       │
   │  statistics ──┐                     │
   │                │                     │
   │                ▼                     │
   │  processor ──┐                       │
   │              │                       │
   │              ▼                       │
   │  scheduler                           │
   └──────┬──────────────────────────────┘
          │
          ▼
5. Topological Sort
   ┌─────────────────────────────────────┐
   │  Kahn's Algorithm:                 │
   │                                     │
   │  Input: Dependency graph           │
   │  Output: orderedKinds              │
   │                                     │
   │  [listeners, statistics,            │
   │   processor, scheduler]             │
   └──────┬──────────────────────────────┘
          │
          ▼
   ┌─────────────────────────────────────┐
   │         BUILD PLAN                   │
   │  {                                   │
   │    resolvedCtx: {...},              │
   │    orderedKinds: [...],             │
   │    facetsByKind: {...},             │
   │    graphCache: DependencyGraphCache  │
   │  }                                   │
   └─────────────────────────────────────┘
```

## Execute Phase Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  EXECUTE PHASE (Transactional)                  │
└─────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │         BUILD PLAN                   │
   │  {                                   │
   │    resolvedCtx: {...},              │
   │    orderedKinds: [...],             │
   │    facetsByKind: {...}               │
   │  }                                   │
   └──────┬──────────────────────────────┘
          │
          ▼
1. Context Assignment
   ┌──────────────┐
   │ subsystem.ctx│  ←  resolvedCtx
   └──────┬───────┘
          │
          ▼
2. Facet Filtering
   ┌─────────────────────────────────────┐
   │  Filter out existing facets:         │
   │  for kind in orderedKinds:           │
   │    if !subsystem.api.__facets.has(kind):│
   │      facetsToAdd[kind] = facetsByKind[kind]│
   └──────┬──────────────────────────────┘
          │
          ▼
3. Transactional Facet Addition
   ┌─────────────────────────────────────┐
   │  FacetManager.beginTransaction()    │
   │                                     │
   │  for kind in orderedKinds:          │
   │    ┌─────────────────────────────┐ │
   │    │ 1. Add facet                │ │
   │    │    __facets.add(kind, facet) │ │
   │    └──────────┬──────────────────┘ │
   │               │                    │
   │               ▼                    │
   │    ┌─────────────────────────────┐ │
   │    │ 2. Initialize facet         │ │
   │    │    facet.init(ctx, api, ss) │ │
   │    └──────────┬──────────────────┘ │
   │               │                    │
   │               ▼                    │
   │    ┌─────────────────────────────┐ │
   │    │ 3. Attach facet (if needed)  │ │
   │    │    if facet.shouldAttach(): │ │
   │    │      __facets.attach(kind)  │ │
   │    └──────────┬──────────────────┘ │
   │               │                    │
   │               ▼                    │
   │    ┌─────────────────────────────┐ │
   │    │ Success: continue           │ │
   │    │ Error: rollback all         │ │
   │    └─────────────────────────────┘ │
   │                                     │
   │  FacetManager.commit()              │
   └──────┬──────────────────────────────┘
          │
          ▼
4. Child Subsystem Building
   ┌─────────────────────────────────────┐
   │  for child in subsystem.children:    │
   │    await child.build({               │
   │      ...parent.ctx,                  │
   │      graphCache: parent.ctx.graphCache│
   │    })                                │
   └──────┬──────────────────────────────┘
          │
          ▼
   ┌─────────────────────────────────────┐
   │      BUILD COMPLETE                  │
   │  All facets added, initialized,      │
   │  and attached. Children built.       │
   └─────────────────────────────────────┘
```

## Dependency Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dependency Resolution                         │
└─────────────────────────────────────────────────────────────────┘

Hook Dependencies:
┌──────────────┐
│ useListeners │  (no dependencies)
└──────┬───────┘
       │
       │ required: []
       │
       ▼
┌──────────────┐
│ useStatistics│  required: ['listeners']
└──────┬───────┘
       │
       │ required: ['statistics', 'listeners']
       │
       ▼
┌──────────────┐
│ useProcessor │  required: ['statistics', 'listeners']
└──────┬───────┘
       │
       │ required: ['processor', 'queue']
       │
       ▼
┌──────────────┐
│ useScheduler │  required: ['processor', 'queue']
└──────────────┘

Dependency Graph:
┌─────────────┐
│  listeners │ (in-degree: 0)
└──────┬──────┘
       │
       │ edge: listeners → statistics
       │
       ▼
┌─────────────┐
│ statistics  │ (in-degree: 1)
└──────┬──────┘
       │
       │ edge: statistics → processor
       │
       ▼
┌─────────────┐
│  processor  │ (in-degree: 2)
└──────┬──────┘
       │
       │ edge: processor → scheduler
       │
       ▼
┌─────────────┐
│  scheduler  │ (in-degree: 1)
└─────────────┘

Topological Sort Result:
[listeners, statistics, processor, scheduler]
```

## Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              FacetManager Transaction Flow                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│  beginTransaction()                  │
│  ┌───────────────────────────────┐  │
│  │ Track additions: []           │  │
│  └───────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       │ For each facet (in order):
       │
       ▼
┌─────────────────────────────────────┐
│  Add Facet                           │
│  ┌───────────────────────────────┐  │
│  │ __facets.set(kind, facet)     │  │
│  │ trackAddition(kind)            │  │
│  └───────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Initialize Facet                    │
│  ┌───────────────────────────────┐  │
│  │ facet.init(ctx, api, ss)     │  │
│  │   └─> may throw error        │  │
│  └───────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       │ Success? ──┐
       │            │
       │            │ Error
       │            │
       ▼            ▼
┌──────────────┐  ┌──────────────────────┐
│  Attach      │  │  ROLLBACK            │
│  Facet       │  │  ┌────────────────┐  │
│  (if needed) │  │  │ Dispose all    │  │
└──────┬───────┘  │  │ facets added   │  │
       │          │  │ in reverse     │  │
       │          │  │ order          │  │
       │          │  │                │  │
       │          │  │ Remove from    │  │
       │          │  │ FacetManager   │  │
       │          │  └────────────────┘  │
       │          │                       │
       │          │  throw error          │
       │          └───────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  commit()                           │
│  ┌───────────────────────────────┐ │
│  │ Clear tracked additions       │ │
│  │ Transaction complete          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## SubsystemBuilder Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SubsystemBuilder Flow                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  new SubsystemBuilder │
│    (subsystem)        │
└──────┬────────────────┘
       │
       ▼
┌──────────────────────┐
│  .withCtx(ctx1)      │  Accumulate context
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  .withCtx(ctx2)      │  Merge additional context
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  .plan(graphCache)   │  VERIFY PHASE
│  ┌────────────────┐  │
│  │ verifySubsystem│  │
│  │ Build()        │  │
│  └──────┬─────────┘  │
│         │            │
│         ▼            │
│  ┌──────────────┐   │
│  │ Build Plan   │   │
│  │ (cached)     │   │
│  └──────────────┘   │
└──────┬───────────────┘
       │
       │ Optional: Inspect plan
       │
       ▼
┌──────────────────────┐
│  .getPlan()           │  Get plan for inspection
│  └─> {                │
│      resolvedCtx,     │
│      orderedKinds,    │
│      facetsByKind     │
│    }                  │
└──────┬────────────────┘
       │
       ▼
┌──────────────────────┐
│  .build(graphCache)  │  EXECUTE PHASE
│  ┌────────────────┐  │
│  │ buildSubsystem │  │
│  │ (plan)         │  │
│  └──────┬─────────┘  │
│         │            │
│         ▼            │
│  ┌──────────────┐   │
│  │ Facets added │   │
│  │ & initialized│   │
│  └──────────────┘   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Built Subsystem     │
└──────────────────────┘
```

## Cache Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dependency Graph Cache Flow                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  verifySubsystemBuild │
│    (subsystem, ctx,   │
│     graphCache)       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Generate Cache Key  │
│  ┌────────────────┐  │
│  │ Based on:      │  │
│  │ - hook kinds   │  │
│  │ - dependencies │  │
│  └──────┬─────────┘  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  graphCache.get(key) │
│  ┌────────────────┐  │
│  │ Check cache    │  │
│  └──────┬─────────┘  │
└──────┬───────────────┘
       │
       │ Hit? ──┐
       │        │
       │        │ Miss
       │        │
       ▼        ▼
┌──────────┐  ┌──────────────────────┐
│ Return   │  │  Build Graph         │
│ Cached   │  │  ┌────────────────┐  │
│ Result   │  │  │ buildDepGraph() │  │
└──────────┘  │  └──────┬─────────┘  │
              │         │            │
              │         ▼            │
              │  ┌──────────────┐   │
              │  │ Topological  │   │
              │  │ Sort         │   │
              │  └──────┬───────┘   │
              │         │           │
              │         ▼           │
              │  ┌──────────────┐   │
              │  │ Cache Result │   │
              │  │ graphCache.  │   │
              │  │ set(key, ...)│   │
              │  └──────────────┘   │
              │                     │
              │         ▼           │
              │  ┌──────────────┐   │
              │  │ Return Result│   │
              │  └──────────────┘   │
              └─────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Handling Flow                          │
└─────────────────────────────────────────────────────────────────┘

VERIFY PHASE ERRORS:
┌──────────────────────┐
│  verifySubsystemBuild │
│    throws error       │
└──────┬───────────────┘
       │
       │ Error Types:
       │ - Missing dependencies
       │ - Circular dependencies
       │ - Contract violations
       │ - Invalid hooks
       │
       ▼
┌──────────────────────┐
│  Error thrown        │
│  No side effects     │
│  No plan created     │
└──────────────────────┘

EXECUTE PHASE ERRORS:
┌──────────────────────┐
│  buildSubsystem      │
│    (plan)            │
└──────┬───────────────┘
       │
       │ For each facet:
       │
       ▼
┌──────────────────────┐
│  facet.init()        │
│    throws error      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  ROLLBACK            │
│  ┌────────────────┐  │
│  │ 1. Dispose all │  │
│  │    facets      │  │
│  │    (reverse)   │  │
│  │                │  │
│  │ 2. Remove from │  │
│  │    FacetManager│  │
│  │                │  │
│  │ 3. Restore     │  │
│  │    state       │  │
│  └────────────────┘  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Error thrown        │
│  Subsystem unchanged │
└──────────────────────┘
```

## Related Documentation

- [How Builder Works](./HOW-BUILDER-WORKS.md) - Detailed explanation of the build process
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Builder API reference
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Two-phase build utilities
- [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) - LRU cache for dependency graphs
- [Facet Manager](./hooks/FACET-MANAGER.md) - Facet management and transactions
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core subsystem class





