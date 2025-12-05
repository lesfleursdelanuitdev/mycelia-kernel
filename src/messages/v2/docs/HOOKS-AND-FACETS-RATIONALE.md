# Hooks and Facets Rationale

## Introduction

This document explains the architectural decisions that led to the hooks and facets system in the Mycelia Kernel. It describes the problems encountered with earlier approaches and how the current plugin-based architecture solves these issues while providing true encapsulation and dynamic capability attachment.

## The Original Problem: Monolithic BaseSubsystem

### Initial Design

The original `BaseSubsystem` class was designed as a base class for subsystems in a message-driven architecture. As the Mycelia Kernel grew, the class attempted to provide a base implementation for every possible capability that classes extending `BaseSubsystem` might want.

**Original Approach:**
```javascript
class BaseSubsystem {
  // Routing capabilities
  registerRoute() { /* ... */ }
  matchRoute() { /* ... */ }
  
  // Queue capabilities
  enqueue() { /* ... */ }
  dequeue() { /* ... */ }
  
  // Scheduling capabilities
  schedule() { /* ... */ }
  pause() { /* ... */ }
  resume() { /* ... */ }
  
  // Statistics capabilities
  recordEvent() { /* ... */ }
  getStatistics() { /* ... */ }
  
  // ... many more methods for every possible capability
}
```

### Problems with the Monolithic Approach

#### 1. Single Responsibility Principle Violation

The `BaseSubsystem` class violated the Single Responsibility Principle by trying to handle:
- Message routing
- Message queuing
- Message scheduling
- Statistics tracking
- Hierarchy management
- Event listening
- Query handling
- And many more responsibilities

**Result:** A class that was difficult to understand, maintain, and extend.

#### 2. Hard to Reason About

With dozens of methods handling different concerns, it became difficult to:
- Understand what the class actually does
- Know which methods are related
- Determine dependencies between capabilities
- Identify what's needed for a specific use case

#### 3. Bloat and Complexity

As new capabilities were added:
- The class grew larger and larger
- Methods became interdependent in complex ways
- Testing became more difficult
- Changes to one capability could break others

## Attempted Solution: Composition

### Refactoring to Composition

The next attempt was to refactor `BaseSubsystem` to use composition instead of implementing everything directly:

```javascript
class BaseSubsystem {
  constructor() {
    this.router = new Router();
    this.queue = new Queue();
    this.scheduler = new Scheduler();
    this.statistics = new Statistics();
    // ... many more composed objects
  }
  
  // Delegation methods
  registerRoute(pattern, handler) {
    return this.router.registerRoute(pattern, handler);
  }
  
  enqueue(message) {
    return this.queue.enqueue(message);
  }
  
  schedule(message) {
    return this.scheduler.schedule(message);
  }
  
  recordEvent(event) {
    return this.statistics.recordEvent(event);
  }
  
  // ... many more delegation methods
}
```

### Problems with Composition Approach

#### 1. Delegation Boilerplate

Every capability required delegation methods:

```javascript
// For every capability, we need:
method1() { return this.capability1.method1(); }
method2() { return this.capability1.method2(); }
method3() { return this.capability1.method3(); }
// ... repeated for every capability
```

**Result:** The class was still large, with many methods that did nothing but delegate.

#### 2. Still Violated Single Responsibility

Even with composition, `BaseSubsystem` still:
- Managed all capabilities
- Provided delegation methods for everything
- Had to know about all possible capabilities
- Couldn't focus on its core responsibility

#### 3. Static Interface

The interface was still hardcoded in the class file:
- All methods were always present
- Couldn't dynamically add or remove capabilities
- Every subsystem had the same interface, even if it didn't need all capabilities

#### 4. Hard to Extend

Adding new capabilities required:
- Modifying `BaseSubsystem` class
- Adding new composed object
- Adding delegation methods
- Updating all existing code

## The Solution: Plugin System with Hooks, Facets, and Builder

### Core Insight

Instead of trying to provide everything in `BaseSubsystem`, the solution was to:

1. **Keep BaseSubsystem Minimal**: Only include core methods needed for MessageSystem integration
2. **Dynamic Capabilities**: Attach capabilities at runtime through a plugin system
3. **Three Primitives**: Use hooks, facets, and a builder to manage the plugin system

### The Three Primitives

#### 1. Hooks

**Hooks** are factory functions that create facets. They provide:
- **Factory Logic**: Code that creates and configures capabilities
- **Metadata**: Information about dependencies and behavior
- **Encapsulation**: Closure-based encapsulation (see below)

#### 2. Facets

**Facets** are composable units of functionality that extend subsystem capabilities. They provide:
- **Functional Units**: Specific capabilities (routing, queuing, etc.)
- **Dynamic Attachment**: Can be attached to subsystems at runtime
- **Namespacing**: Facet kinds prevent naming collisions

#### 3. Builder

**Builder** orchestrates the build process:
- **Two-Phase Build**: Verification (pure) and execution (transactional)
- **Dependency Resolution**: Automatic topological sorting
- **Contract Validation**: Ensures facets satisfy contracts

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              Plugin System Architecture                    │
└─────────────────────────────────────────────────────────────┘

BaseSubsystem (Minimal Core)
  │
  │ Core methods only:
  │ - build()
  │ - dispose()
  │ - accept()
  │ - process()
  │ - find()
  │
  ├─► Hooks (Dynamic Capabilities)
  │   │
  │   ├─► useRouter → router facet
  │   ├─► useQueue → queue facet
  │   ├─► useScheduler → scheduler facet
  │   └─► ... (any number of hooks)
  │
  └─► Facets (Attached Capabilities)
      │
      ├─► router (attached as subsystem.router)
      ├─► queue (attached as subsystem.queue)
      ├─► scheduler (attached as subsystem.scheduler)
      └─► ... (dynamically attached)
```

### Benefits of the Plugin System

#### 1. Minimal BaseSubsystem

`BaseSubsystem` now only contains core methods:

```javascript
class BaseSubsystem {
  // Core lifecycle
  build() { /* ... */ }
  dispose() { /* ... */ }
  
  // Core message processing
  accept(message, options) { /* ... */ }
  process(timeSlice) { /* ... */ }
  
  // Core facet access
  find(kind) { /* ... */ }
  
  // Core hierarchy (delegates to hierarchy facet if present)
  setParent(parent) { /* ... */ }
  getParent() { /* ... */ }
  // ...
}
```

**Result:** Focused, easy to understand, single responsibility.

#### 2. Dynamic Capability Attachment

Capabilities are attached at runtime:

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

// Attach capabilities dynamically
subsystem
  .use(useRouter)      // Adds routing capability
  .use(useQueue)       // Adds queuing capability
  .use(useScheduler)   // Adds scheduling capability
  .build();

// Capabilities are now available
subsystem.router.registerRoute('api/users', handler);
subsystem.queue.enqueue(message);
subsystem.scheduler.schedule(message);
```

**Result:** Flexible, composable, no hardcoded interface.

#### 3. Namespaced Attachment

Facets are attached with their kind as the property name:

```javascript
// Router facet attached as 'router'
subsystem.router.registerRoute(...);

// Queue facet attached as 'queue'
subsystem.queue.enqueue(...);

// Scheduler facet attached as 'scheduler'
subsystem.scheduler.schedule(...);
```

**Result:** No naming collisions, clear capability access.

#### 4. Single Responsibility

Each facet has a single responsibility:
- `router` facet: Routing only
- `queue` facet: Queuing only
- `scheduler` facet: Scheduling only

**Result:** Easy to understand, test, and maintain.

## JavaScript Encapsulation Problem

### The Challenge

JavaScript's approach to class encapsulation has significant limitations that made it difficult to achieve true encapsulation in a class-based architecture.

### Problem 1: Public Fields by Default

In JavaScript, all class fields are public by default:

```javascript
class BaseSubsystem {
  constructor() {
    this.router = new Router();  // Public - anyone can access
    this.queue = new Queue();     // Public - anyone can access
    this._internal = value;       // Convention says private, but still accessible
  }
}
```

**Problem:** No true encapsulation - everything is accessible from outside.

### Problem 2: Underscore Convention Doesn't Encapsulate

The underscore convention (`_field`) is just a naming convention:

```javascript
class BaseSubsystem {
  constructor() {
    this._router = new Router();  // Convention says private
  }
}

const subsystem = new BaseSubsystem();
subsystem._router.registerRoute(...);  // Still accessible!
```

**Problem:** Convention doesn't provide actual encapsulation - it's just a hint to developers.

### Problem 3: Private Fields (#field) Can't Be Inherited

JavaScript's private fields (`#field`) are tied to the class that declares them:

```javascript
class BaseSubsystem {
  #router = new Router();  // Private to BaseSubsystem
  
  getRouter() {
    return this.#router;  // Can access
  }
}

class MySubsystem extends BaseSubsystem {
  useRouter() {
    // ❌ Cannot access this.#router - it's private to BaseSubsystem
    // ❌ Cannot access super.#router - private fields aren't inherited
    return this.#router;  // Error!
  }
}
```

**Problem:** Private fields can't be accessed by child classes, making inheritance difficult.

### Problem 4: Getters/Setters Make Things Public

To make private fields accessible to child classes, you need getters/setters:

```javascript
class BaseSubsystem {
  #router = new Router();
  
  get router() {
    return this.#router;  // Now accessible to children
  }
}

class MySubsystem extends BaseSubsystem {
  useRouter() {
    return this.router;  // ✅ Can access via getter
  }
}

// But now it's also public!
const subsystem = new MySubsystem();
subsystem.router.registerRoute(...);  // ✅ Also accessible from outside
```

**Problem:** Getters/setters make the field accessible to everyone, not just child classes.

### Problem 5: Shared State Issues

Even with private fields, there's a fundamental issue with shared state:

```javascript
class BaseSubsystem {
  #router = new Router();  // Shared across all instances
  
  get router() {
    return this.#router;
  }
}

const subsystem1 = new BaseSubsystem();
const subsystem2 = new BaseSubsystem();

// If router is shared (static or singleton)
subsystem1.router.registerRoute('route1', handler1);
subsystem2.router.registerRoute('route2', handler2);

// Both subsystems see both routes!
// This is a global value, not instance-specific
```

**Problem:** Private fields don't solve the shared state problem - they're still essentially global if accessed via getters.

## The Solution: Closures for True Encapsulation

### How Hooks Provide Encapsulation

Hooks solve the encapsulation problem by using **closures** instead of class fields:

```javascript
export const useRouter = createHook({
  kind: 'router',
  fn: (ctx, api, subsystem) => {
    // Closure variables - truly private
    const router = new Router();
    const routes = new Map();
    let routeCount = 0;
    
    // These variables are only accessible within this closure
    // No way to access them from outside
    
    return new Facet('router', { attach: true })
      .add({
        // Public methods that can access closure variables
        registerRoute(pattern, handler) {
          routes.set(pattern, handler);
          routeCount++;
          return router.register(pattern, handler);
        },
        
        match(path) {
          return router.match(path, routes);
        },
        
        getRouteCount() {
          return routeCount;  // Access private closure variable
        }
      });
  }
});
```

### Why Closures Work

#### 1. True Encapsulation

Closure variables are truly private:

```javascript
// Inside hook
const router = new Router();  // Private to this closure

// Outside hook
const subsystem = new BaseSubsystem();
subsystem.use(useRouter).build();

// ❌ Cannot access router directly
subsystem.router._router  // undefined - doesn't exist
subsystem.router.#router  // Error - not accessible

// ✅ Can only access via public methods
subsystem.router.registerRoute(...);  // Public API
```

**Result:** True encapsulation - internal state is inaccessible from outside.

#### 2. Instance-Specific State

Each hook execution creates a new closure with its own state:

```javascript
const subsystem1 = new BaseSubsystem('sub1', { ms: messageSystem });
const subsystem2 = new BaseSubsystem('sub2', { ms: messageSystem });

subsystem1.use(useRouter).build();
subsystem2.use(useRouter).build();

// Each has its own router instance
subsystem1.router.registerRoute('route1', handler1);
subsystem2.router.registerRoute('route2', handler2);

// Routes are separate - no shared state
subsystem1.router.match('route1');  // ✅ Matches
subsystem2.router.match('route1');  // ❌ Doesn't match (different instance)
```

**Result:** Each subsystem has its own isolated state.

#### 3. No Inheritance Issues

Closures don't have inheritance problems:

```javascript
// Hook creates closure
export const useRouter = createHook({
  fn: (ctx, api, subsystem) => {
    const router = new Router();  // Private to this closure
    
    return new Facet('router')
      .add({
        registerRoute(pattern, handler) {
          // Can access router - it's in the closure
          return router.register(pattern, handler);
        }
      });
  }
});

// No inheritance needed - each hook execution is independent
// No need to access parent class private fields
// No getters/setters needed
```

**Result:** No inheritance complexity - each hook execution is independent.

#### 4. Flexible Access Control

Public methods can access private closure variables:

```javascript
export const useRouter = createHook({
  fn: (ctx, api, subsystem) => {
    // Private state
    const router = new Router();
    const debugLog = [];
    
    return new Facet('router')
      .add({
        // Public method - can access private state
        registerRoute(pattern, handler) {
          if (ctx.debug) {
            debugLog.push(`Registering route: ${pattern}`);
          }
          return router.register(pattern, handler);
        },
        
        // Public method - exposes only what's needed
        getDebugLog() {
          return [...debugLog];  // Return copy, not reference
        }
      });
  }
});
```

**Result:** Fine-grained control over what's exposed.

## Architecture Comparison

### Before: Monolithic BaseSubsystem

```javascript
class BaseSubsystem {
  // 50+ methods for every possible capability
  registerRoute() { /* ... */ }
  enqueue() { /* ... */ }
  schedule() { /* ... */ }
  recordEvent() { /* ... */ }
  // ... many more
  
  // All capabilities always present
  // Hard to understand
  // Violates SRP
  // No true encapsulation
}
```

**Problems:**
- ❌ Monolithic
- ❌ Hard to reason about
- ❌ Violates Single Responsibility Principle
- ❌ No true encapsulation
- ❌ Static interface

### After: Plugin System

```javascript
class BaseSubsystem {
  // Minimal core methods only
  build() { /* ... */ }
  dispose() { /* ... */ }
  accept() { /* ... */ }
  process() { /* ... */ }
  find() { /* ... */ }
}

// Capabilities added dynamically
subsystem
  .use(useRouter)      // Adds routing
  .use(useQueue)       // Adds queuing
  .use(useScheduler)   // Adds scheduling
  .build();

// Each capability is isolated
subsystem.router.registerRoute(...);
subsystem.queue.enqueue(...);
subsystem.scheduler.schedule(...);
```

**Benefits:**
- ✅ Minimal core
- ✅ Easy to understand
- ✅ Single Responsibility Principle
- ✅ True encapsulation via closures
- ✅ Dynamic interface

## Key Design Principles

### 1. Separation of Concerns

Each facet handles one concern:
- **Router facet**: Routing only
- **Queue facet**: Queuing only
- **Scheduler facet**: Scheduling only

**Result:** Clear boundaries, easy to understand and maintain.

### 2. Composition over Inheritance

Capabilities are composed, not inherited:

```javascript
// ✅ Good: Compose capabilities
subsystem.use(useRouter).use(useQueue).build();

// ❌ Bad: Inherit everything
class MySubsystem extends BaseSubsystem {
  // Inherits all 50+ methods, even if not needed
}
```

**Result:** Only include what you need.

### 3. Encapsulation via Closures

Private state is encapsulated in closures:

```javascript
// ✅ Good: Closure encapsulation
const router = new Router();  // Private to closure
return new Facet('router').add({
  registerRoute() { return router.register(...); }
});

// ❌ Bad: Public fields
this.router = new Router();  // Public, accessible from outside
```

**Result:** True encapsulation, no leakage of internal state.

### 4. Dynamic Interface

Interface is built at runtime:

```javascript
// Interface depends on installed hooks
subsystem.use(useRouter).build();
// Interface: { router: {...} }

subsystem.use(useRouter).use(useQueue).build();
// Interface: { router: {...}, queue: {...} }
```

**Result:** Flexible, composable, no hardcoded interface.

## Real-World Impact

### Before: Adding a New Capability

```javascript
// 1. Modify BaseSubsystem class
class BaseSubsystem {
  constructor() {
    this.cache = new Cache();  // Add new capability
  }
  
  // 2. Add delegation methods
  get(key) {
    return this.cache.get(key);
  }
  
  set(key, value) {
    return this.cache.set(key, value);
  }
  
  clear() {
    return this.cache.clear();
  }
}

// 3. Update all existing code
// 4. Risk breaking existing functionality
```

**Problems:**
- ❌ Modifies core class
- ❌ Adds boilerplate
- ❌ Risk of breaking changes
- ❌ All subsystems get capability (even if not needed)

### After: Adding a New Capability

```javascript
// 1. Create hook
export const useCache = createHook({
  kind: 'cache',
  fn: (ctx, api, subsystem) => {
    const cache = new Cache();  // Encapsulated in closure
    
    return new Facet('cache', { attach: true })
      .add({
        get(key) { return cache.get(key); },
        set(key, value) { return cache.set(key, value); },
        clear() { return cache.clear(); }
      });
  }
});

// 2. Use in subsystems that need it
subsystem.use(useCache).build();

// 3. No changes to BaseSubsystem
// 4. No risk to existing code
```

**Benefits:**
- ✅ No core class changes
- ✅ No boilerplate
- ✅ No breaking changes
- ✅ Only subsystems that need it use it

## Summary

The hooks and facets system was designed to solve fundamental architectural problems:

1. **Monolithic BaseSubsystem**: Solved by keeping core minimal and attaching capabilities dynamically
2. **Single Responsibility Violation**: Solved by separating concerns into individual facets
3. **Delegation Boilerplate**: Solved by direct facet attachment (no delegation needed)
4. **JavaScript Encapsulation**: Solved by using closures for true encapsulation
5. **Static Interface**: Solved by building interface at runtime based on installed hooks

The result is a flexible, composable, and maintainable architecture that:
- Keeps `BaseSubsystem` focused on core MessageSystem integration
- Allows dynamic capability attachment
- Provides true encapsulation via closures
- Enables easy extension without modifying core classes
- Maintains clear separation of concerns

## Related Documentation

- [Hooks and Facets Overview](./hooks/HOOKS-AND-FACETS-OVERVIEW.md) - High-level overview of hooks and facets
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core subsystem class
- [Hooks](./hooks/HOOKS.md) - Understanding hooks and how they work
- [Facets](./hooks/FACETS.md) - Understanding facets and their lifecycle
- [How Builder Works](./HOW-BUILDER-WORKS.md) - Detailed explanation of the build process
- [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) - Using BaseSubsystem as a standalone plugin system

