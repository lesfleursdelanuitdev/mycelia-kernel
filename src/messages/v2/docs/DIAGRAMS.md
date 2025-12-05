# System Architecture Diagrams

This document provides visual representations of the relationships between different components of the Mycelia Kernel subsystem architecture.

## Overview

The Mycelia Kernel uses a hook-based architecture where:
- **Hooks** create **Facets**
- **Facets** are managed by **FacetManager**
- **FacetManager** uses **Transactions** for atomicity
- **DefaultHooks** provides pre-configured hook sets
- **Build Utils** orchestrates the build process

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        Subsystem Build                          │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────┐   │
│  │  DefaultHooks    │────────▶│  verifySubsystemBuild()   │   │
│  │                  │         │  (Verification Phase)      │   │
│  │  - Canonical     │         │                           │   │
│  │  - Synchronous   │         │  - Collect hooks          │   │
│  └──────────────────┘         │  - Create facets          │   │
│           │                   │  - Resolve dependencies  │   │
│           │                   │  - Topological sort      │   │
│           │                   └──────────────────────────┘   │
│           │                              │                    │
│           │                              ▼                    │
│           │                   ┌──────────────────────────┐   │
│           │                   │   buildSubsystem()       │   │
│           │                   │  (Execution Phase)       │   │
│           │                   │                           │   │
│           │                   │  - Assign context        │   │
│           │                   │  - Add facets           │   │
│           │                   │  - Initialize facets     │   │
│           │                   │  - Attach facets        │   │
│           │                   └──────────────────────────┘   │
│           │                              │                    │
└───────────┼──────────────────────────────┼────────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────┐         ┌──────────────────────────┐
│      Hooks       │────────▶│      FacetManager         │
│                  │         │                          │
│  - useQueue      │         │  - add()                 │
│  - useRouter     │         │  - addMany()              │
│  - useScheduler  │         │  - find()                 │
│  - useListeners  │         │  - attach()               │
│  - ...           │         │  - Transactions          │
└──────────────────┘         └──────────────────────────┘
            │                              │
            │                              │
            ▼                              ▼
┌──────────────────┐         ┌──────────────────────────┐
│     Facets       │         │ FacetManagerTransaction  │
│                  │         │                          │
│  - kind          │         │  - beginTransaction()   │
│  - attach        │         │  - commit()              │
│  - required      │         │  - rollback()            │
│  - onInit()      │         │  - trackAddition()       │
│  - onDispose()   │         └──────────────────────────┘
└──────────────────┘
```

## Hook Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Hook Execution Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Hook Registration
   ┌──────────────┐
   │ DefaultHooks │  or  User Hooks
   └──────┬───────┘
          │
          ▼
2. Build System Collection
   ┌──────────────────────────┐
   │ verifySubsystemBuild()   │
   │                          │
   │ - Extract hook metadata │
   │ - Execute hooks          │
   │ - Create facets          │
   └──────┬───────────────────┘
          │
          ▼
3. Hook Execution
   ┌─────────────────────────────────────┐
   │ hook(ctx, api, subsystem)           │
   │                                     │
   │ Parameters:                         │
   │ - ctx: { ms, config, debug }        │
   │ - api: { name, __facets }           │
   │ - subsystem: BaseSubsystem          │
   └──────┬──────────────────────────────┘
          │
          ▼
4. Facet Creation
   ┌─────────────────────────────────────┐
   │ return new Facet(kind, {             │
   │   attach, required, source           │
   │ })                                   │
   │   .add({ methods })                  │
   │   .onInit(callback)                  │
   └──────┬──────────────────────────────┘
          │
          ▼
5. Facet Registration
   ┌─────────────────────────────────────┐
   │ FacetManager.add(facet)             │
   │   - Register facet                  │
   │   - Track in transaction            │
   │   - Initialize (if opts.init)       │
   │   - Attach (if opts.attach)          │
   └─────────────────────────────────────┘
```

## Facet Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      Facet Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

Creation
   │
   ├─▶ Hook executes
   │
   ├─▶ Facet created
   │      │
   │      ├─▶ .add({ methods })
   │      │
   │      ├─▶ .onInit(callback)
   │      │
   │      └─▶ .onDispose(callback)
   │
   ▼
Registration
   │
   ├─▶ FacetManager.add()
   │      │
   │      ├─▶ Register in #facets
   │      │
   │      ├─▶ Track in transaction
   │      │
   │      └─▶ Initialize (if init: true)
   │             │
   │             ├─▶ facet.init(ctx, api, subsystem)
   │             │
   │             └─▶ onInit callback invoked
   │                    │
   │                    └─▶ { ctx, api, subsystem, facet }
   │
   ▼
Attachment (if attach: true)
   │
   ├─▶ FacetManager.attach()
   │
   └─▶ subsystem[kind] = facet
   │
   ▼
Active
   │
   ├─▶ Facet methods available
   │
   └─▶ Facet frozen (immutable)
   │
   ▼
Disposal
   │
   ├─▶ facet.dispose()
   │
   └─▶ onDispose callback invoked
```

## Dependency Resolution

```
┌─────────────────────────────────────────────────────────────┐
│                  Dependency Resolution                        │
└─────────────────────────────────────────────────────────────┘

Hooks with Dependencies
   │
   ├─▶ Hook Metadata: hook.required = ['queue', 'router']
   │
   ├─▶ Facet Metadata: facet.getDependencies() = ['statistics']
   │
   ▼
Dependency Graph Construction
   │
   ├─▶ buildDepGraph(hooksByKind, facetsByKind)
   │      │
   │      ├─▶ Extract hook.required dependencies
   │      │
   │      └─▶ Extract facet.getDependencies()
   │
   ▼
Topological Sort
   │
   ├─▶ topoSort(graph)
   │      │
   │      ├─▶ Kahn's Algorithm
   │      │
   │      └─▶ Order by dependencies
   │
   ▼
Execution Order
   │
   ├─▶ ['queue', 'router', 'statistics', 'scheduler', 'processor']
   │      │
   │      └─▶ Dependencies initialized before dependents
   │
   ▼
Initialization
   │
   └─▶ Facets initialized in dependency order
```

## Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Transaction Flow                          │
└─────────────────────────────────────────────────────────────┘

Build Start
   │
   ├─▶ FacetManager.beginTransaction()
   │      │
   │      └─▶ FacetManagerTransaction.beginTransaction()
   │             │
   │             └─▶ Push frame to #txnStack
   │
   ▼
Facet Addition
   │
   ├─▶ FacetManager.add(facet, { init: true })
   │      │
   │      ├─▶ Register facet
   │      │
   │      ├─▶ trackAddition(kind)
   │      │      │
   │      │      └─▶ Add to current frame.added
   │      │
   │      ├─▶ facet.init(ctx, api, subsystem)
   │      │      │
   │      │      └─▶ onInit callback invoked
   │      │
   │      └─▶ attach() (if attach: true)
   │
   ▼
Success Path
   │
   ├─▶ FacetManager.commit()
   │      │
   │      └─▶ FacetManagerTransaction.commit()
   │             │
   │             └─▶ Pop frame from #txnStack
   │
   ▼
Complete
   │
   └─▶ All facets added and initialized
```

```
Error Path
   │
   ├─▶ Error during facet.init()
   │      │
   │      └─▶ FacetManager.rollback()
   │             │
   │             └─▶ FacetManagerTransaction.rollback()
   │                    │
   │                    ├─▶ Get current frame
   │                    │
   │                    ├─▶ For each facet in frame.added (reverse order):
   │                    │      │
   │                    │      ├─▶ facet.dispose() (best-effort)
   │                    │      │
   │                    │      └─▶ FacetManager.remove(kind)
   │                    │
   │                    └─▶ Pop frame from #txnStack
   │
   ▼
Rolled Back
   │
   └─▶ All facets in transaction removed
```

## Parameter Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Parameter Flow                            │
└─────────────────────────────────────────────────────────────┘

Build System
   │
   ├─▶ verifySubsystemBuild(subsystem, ctx)
   │      │
   │      └─▶ resolveCtx(subsystem, ctx)
   │             │
   │             └─▶ resolvedCtx = { ...subsystem.ctx, ...ctx }
   │
   ▼
Hook Execution
   │
   ├─▶ hook(resolvedCtx, subsystem.api, subsystem)
   │      │
   │      ├─▶ ctx: { ms, config, debug }
   │      │      │
   │      │      └─▶ System services and configuration
   │      │
   │      ├─▶ api: { name, __facets }
   │      │      │
   │      │      └─▶ Subsystem API and FacetManager
   │      │
   │      └─▶ subsystem: BaseSubsystem
   │             │
   │             └─▶ Subsystem instance with find() method
   │
   ▼
Facet Initialization
   │
   ├─▶ facet.init(ctx, api, subsystem)
   │      │
   │      └─▶ onInit({ ctx, api, subsystem, facet })
   │             │
   │             └─▶ Same parameters as hook execution
```

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  Component Hierarchy                         │
└─────────────────────────────────────────────────────────────┘

BaseSubsystem
   │
   ├─▶ defaultHooks: DefaultHooks
   │      │
   │      ├─▶ createCanonicalDefaultHooks()
   │      │      │
   │      │      └─▶ [useHierarchy, useRouter, useMessageProcessor,
   │      │             useQueue, useScheduler, useListeners,
   │      │             useStatistics, useQueries]
   │      │
   │      └─▶ createSynchronousDefaultHooks()
   │             │
   │             └─▶ [useListeners, useStatistics, useQueries,
   │                    useRouter, useQueue, useMessageProcessor,
   │                    useSynchronous, useHierarchy]
   │
   ├─▶ hooks: Array<Hook>
   │      │
   │      └─▶ User-provided hooks
   │
   ├─▶ api: { name, __facets: FacetManager }
   │      │
   │      └─▶ FacetManager
   │             │
   │             ├─▶ #facets: { [kind: string]: Facet }
   │             │
   │             ├─▶ #txn: FacetManagerTransaction
   │             │      │
   │             │      └─▶ #txnStack: Array<TransactionFrame>
   │             │
   │             └─▶ Methods:
   │                    - add(kind, facet, opts)
   │                    - addMany(orderedKinds, facetsByKind, opts)
   │                    - find(kind)
   │                    - attach(kind)
   │                    - beginTransaction()
   │                    - commit()
   │                    - rollback()
   │
   └─▶ ctx: { ms, config, debug }
          │
          └─▶ Resolved context from build system
```

## Build Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Build Process Overview                       │
└─────────────────────────────────────────────────────────────┘

1. Subsystem Creation
   │
   ├─▶ new BaseSubsystem(name, options)
   │      │
   │      ├─▶ defaultHooks: DefaultHooks
   │      │
   │      ├─▶ hooks: []
   │      │
   │      └─▶ api.__facets: FacetManager
   │
   ▼
2. Build Initiation
   │
   ├─▶ subsystem.build(ctx)
   │      │
   │      └─▶ SubsystemBuilder.build()
   │
   ▼
3. Verification Phase
   │
   ├─▶ verifySubsystemBuild(subsystem, ctx)
   │      │
   │      ├─▶ Resolve context
   │      │
   │      ├─▶ Collect hooks (defaults + user)
   │      │
   │      ├─▶ Extract hook metadata
   │      │
   │      ├─▶ Execute hooks → create facets
   │      │
   │      ├─▶ Validate dependencies
   │      │
   │      ├─▶ Build dependency graph
   │      │
   │      └─▶ Topological sort
   │
   ▼
4. Execution Phase
   │
   ├─▶ buildSubsystem(subsystem, plan)
   │      │
   │      ├─▶ Assign resolved context
   │      │
   │      ├─▶ FacetManager.beginTransaction()
   │      │
   │      ├─▶ FacetManager.addMany(orderedKinds, facetsByKind, {
   │      │      init: true,
   │      │      attach: true,
   │      │      ctx: resolvedCtx,
   │      │      api: subsystem.api
   │      │    })
   │      │      │
   │      │      └─▶ For each facet in order:
   │      │             │
   │      │             ├─▶ Register facet
   │      │             │
   │      │             ├─▶ Track in transaction
   │      │             │
   │      │             ├─▶ Initialize (calls onInit)
   │      │             │
   │      │             └─▶ Attach to subsystem
   │      │
   │      ├─▶ FacetManager.commit()
   │      │
   │      └─▶ buildChildren(subsystem)
   │
   ▼
5. Complete
   │
   └─▶ Subsystem built with all facets initialized
```

## Hook Parameter Relationships

```
┌─────────────────────────────────────────────────────────────┐
│              Hook Parameter Relationships                     │
└─────────────────────────────────────────────────────────────┘

Hook Function
   │
   ├─▶ Parameters:
   │      │
   │      ├─▶ ctx: Hook Function Context
   │      │      │
   │      │      ├─▶ ms: MessageSystem
   │      │      │      │
   │      │      │      └─▶ System-level services
   │      │      │
   │      │      ├─▶ config: { [kind: string]: Config }
   │      │      │      │
   │      │      │      └─▶ Configuration per facet kind
   │      │      │
   │      │      └─▶ debug: boolean
   │      │             │
   │      │             └─▶ Debug flag
   │      │
   │      ├─▶ api: Hook Function API Parameter
   │      │      │
   │      │      ├─▶ name: string
   │      │      │      │
   │      │      │      └─▶ Subsystem name
   │      │      │
   │      │      └─▶ __facets: FacetManager
   │      │             │
   │      │             └─▶ Access to other facets
   │      │
   │      └─▶ subsystem: Hook Function Subsystem Parameter
   │             │
   │             ├─▶ find(kind): Facet | undefined
   │             │      │
   │             │      └─▶ Find facets by kind
   │             │
   │             └─▶ Other subsystem methods
   │
   ▼
Facet Creation
   │
   └─▶ Same parameters passed to onInit callback
```

## See Also

- [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) - Learn how to use this architecture as a standalone plugin system
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - High-level builder API
- [Hooks Documentation](./hooks/HOOKS.md) - Complete guide to hooks
- [Facets Documentation](./hooks/FACETS.md) - Complete guide to facets
- [Facet Manager](./hooks/FACET-MANAGER.md) - Facet management system
- [Facet Manager Transaction](./hooks/FACET-MANAGER-TRANSACTION.md) - Transaction system
- [Facet Init Callback](./hooks/FACET-INIT-CALLBACK.md) - Initialization callbacks
- [Default Hooks](./DEFAULT-HOOKS.md) - Default hook sets
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Build system utilities
- [Hook Function Context](./hooks/HOOK-FUNCTION-CONTEXT.md) - Context parameter
- [Hook Function API Parameter](./hooks/HOOK-FUNCTION-API-PARAM.md) - API parameter
- [Hook Function Subsystem Parameter](./hooks/HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Subsystem parameter

