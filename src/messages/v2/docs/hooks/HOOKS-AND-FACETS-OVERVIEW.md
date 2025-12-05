# Hooks and Facets Overview

## Introduction

The Mycelia Kernel uses a **hook-based architecture** where **hooks** create **facets** that extend subsystem functionality. This pattern provides a composable, extensible way to add features to subsystems without modifying their core implementation.

## What are Hooks and Facets?

### Hooks

A **Hook** is a function that creates and returns a **Facet**. Hooks are executed during subsystem build to extend functionality.

**Key Characteristics:**
- **Factory Functions**: Create facets when called
- **Metadata**: Include information about dependencies and behavior
- **Composable**: Can depend on other hooks/facets
- **Standardized**: Use `createHook` for consistent structure

### Facets

A **Facet** is a composable unit of functionality that extends a subsystem's capabilities. Facets are created by hooks and provide methods and properties.

**Key Characteristics:**
- **Functional Units**: Provide specific capabilities (routing, queuing, etc.)
- **Composable**: Can depend on other facets
- **Lifecycle Aware**: Support initialization and disposal
- **Attachable**: Can be attached to subsystem for easy access

## The Hook → Facet Relationship

```
┌─────────────────────────────────────────────────────────────┐
│              Hook → Facet Relationship                     │
└─────────────────────────────────────────────────────────────┘

Hook (Factory Function)
  │
  │ Executed during build
  │
  ▼
Facet (Functional Unit)
  │
  │ Added to FacetManager
  │
  ▼
Subsystem (Extended Capabilities)
```

### Example

```javascript
// Hook creates a Facet
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],
  attach: true,
  fn: (ctx, api, subsystem) => {
    // Hook logic creates a Facet
    return new Facet('queue', { 
      attach: true,
      source: import.meta.url 
    })
    .add({
      // Facet methods
      getQueueStatus() { /* ... */ },
      enqueue(message) { /* ... */ }
    });
  }
});

// Usage
subsystem.use(useQueue);
await subsystem.build();

// Facet is now available
const queueStatus = subsystem.queue.getQueueStatus();
```

## How They Work Together

### Build Process

1. **Hook Registration**: Hooks are registered via `subsystem.use(hook)`
2. **Build Phase**: During `subsystem.build()`, hooks are executed
3. **Facet Creation**: Each hook creates a facet
4. **Dependency Resolution**: Build system resolves dependencies
5. **Initialization**: Facets are initialized in dependency order
6. **Attachment**: Facets are attached to subsystem (if configured)

### Dependency Management

Hooks declare dependencies, and the build system ensures correct initialization order:

```javascript
// Hook 1: No dependencies
export const useStatistics = createHook({
  kind: 'statistics',
  required: []  // No dependencies
});

// Hook 2: Depends on statistics
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics']  // Statistics must exist first
});

// Hook 3: Depends on queue and processor
export const useScheduler = createHook({
  kind: 'scheduler',
  required: ['queue', 'processor']  // Both must exist first
});
```

**Build System:**
- Validates all dependencies exist
- Topologically sorts facets by dependencies
- Initializes facets in correct order

### Facet Access

Facets can be accessed in multiple ways:

```javascript
// Via FacetManager
const queueFacet = subsystem.api.__facets.find('queue');
const queueFacet = subsystem.api.__facets.queue;  // Proxy access

// Via subsystem.find() (if attached)
const queueFacet = subsystem.find('queue');
const queueFacet = subsystem.queue;  // Direct access (if attach: true)

// In facet methods
fn: (ctx, api, subsystem) => {
  return new Facet('custom', { attach: true })
    .add({
      process() {
        // Access other facets
        const queue = subsystem.find('queue');
        const stats = subsystem.find('statistics');
        // ...
      }
    });
}
```

## Core Concepts

### Hook Metadata

Hooks include metadata that describes their behavior:

- **`kind`**: Facet kind identifier (must match facet kind)
- **`overwrite`**: Whether hook can overwrite existing hooks
- **`required`**: Array of required facet dependencies
- **`attach`**: Whether facet should be attached to subsystem
- **`source`**: Source file location for debugging
- **`contract`**: Contract name for validation

### Facet Options

Facets include options that control their behavior:

- **`attach`**: Whether to attach to subsystem
- **`required`**: Array of dependency facet kinds
- **`source`**: Source file location
- **`overwrite`**: Whether facet can overwrite existing ones
- **`contract`**: Contract name for validation

### Facet Lifecycle

Facets support lifecycle methods:

- **`init(ctx, api, subsystem)`**: Called during initialization
- **`dispose(subsystem)`**: Called during disposal
- **`shouldAttach()`**: Determines if facet should be attached

## Common Patterns

### Basic Hook Pattern

```javascript
export const useCustom = createHook({
  kind: 'custom',
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.custom || {};
    
    return new Facet('custom', { 
      attach: true,
      source: import.meta.url 
    })
    .add({
      doSomething() {
        // Implementation
      }
    });
  }
});
```

### Dependency Pattern

```javascript
export const useProcessor = createHook({
  kind: 'processor',
  required: ['statistics', 'listeners'],  // Dependencies
  attach: true,
  fn: (ctx, api, subsystem) => {
    // Dependencies are guaranteed to exist
    const statistics = api.__facets.statistics;
    const listeners = api.__facets.listeners;
    
    return new Facet('processor', { 
      attach: true,
      required: ['statistics', 'listeners']  // Also declare on facet
    })
    .add({
      async processMessage(message) {
        // Use dependencies
        statistics.recordEvent('message_processed');
        listeners.emit('message:processed', message);
        // ...
      }
    });
  }
});
```

### Configuration Pattern

```javascript
export const useQueue = createHook({
  kind: 'queue',
  required: [],
  attach: true,
  fn: (ctx, api, subsystem) => {
    // Extract configuration
    const config = ctx.config?.queue || {};
    const maxSize = config.maxSize || 100;
    const policy = config.policy || 'drop-oldest';
    
    // Create service with configuration
    const queue = new BoundedQueue(maxSize, policy);
    
    return new Facet('queue', { attach: true })
      .add({
        getQueueStatus() {
          return {
            size: queue.size(),
            capacity: queue.getCapacity()
          };
        },
        enqueue(message) {
          return queue.enqueue(message);
        }
      });
  }
});
```

### Lifecycle Pattern

```javascript
export const useDatabase = createHook({
  kind: 'database',
  required: [],
  attach: true,
  fn: (ctx, api, subsystem) => {
    let connection = null;
    
    return new Facet('database', { attach: true })
      .add({
        async init(ctx, api, subsystem) {
          // Initialize during build
          connection = await connectToDatabase();
        },
        
        async dispose(subsystem) {
          // Cleanup during disposal
          if (connection) {
            await connection.close();
            connection = null;
          }
        },
        
        query(sql) {
          return connection.query(sql);
        }
      });
  }
});
```

## FacetManager

The `FacetManager` manages all facets for a subsystem:

### Responsibilities

- **Storage**: Stores facets in a Map by kind
- **Access**: Provides methods to find, get, and iterate facets
- **Transactions**: Supports transactional operations with rollback
- **Lifecycle**: Manages initialization and disposal

### Key Methods

```javascript
// Find facet by kind
const facet = subsystem.api.__facets.find('queue');

// Check if facet exists
if (subsystem.api.__facets.has('queue')) {
  // ...
}

// Get all facet kinds
const kinds = subsystem.api.__facets.getAllKinds();

// Iterate over facets
for (const [kind, facet] of subsystem.api.__facets) {
  // ...
}
```

## Contracts

Facets can declare contracts that define required methods and properties:

```javascript
// Hook declares contract
export const useRouter = createHook({
  kind: 'router',
  contract: 'router',  // Declares router contract
  fn: (ctx, api, subsystem) => {
    return new Facet('router', { 
      contract: 'router'  // Facet also declares contract
    })
    .add({
      // Must implement all contract methods
      registerRoute(pattern, handler) { /* ... */ },
      matchRoute(path) { /* ... */ }
    });
  }
});
```

**Benefits:**
- **Validation**: Ensures facets implement required methods
- **Type Safety**: Provides contract-based type checking
- **Documentation**: Documents expected interface

## Default Hooks

The system provides pre-configured hook sets:

### Canonical Default Hooks

A standard set of hooks for typical subsystems:

- `useListeners` - Event listener management
- `useStatistics` - Metrics collection
- `useQueries` - Query handler system
- `useRouter` - Route registration and matching
- `useQueue` - Message queuing
- `useMessageProcessor` - Message processing
- `useScheduler` - Message scheduling
- `useHierarchy` - Child subsystem management

### Usage

```javascript
import { createCanonicalDefaultHooks } from './default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});

await subsystem.build();
// All canonical hooks are installed
```

## Best Practices

### Hook Design

1. **Single Responsibility**: Each hook should provide one capability
2. **Clear Dependencies**: Declare all required dependencies
3. **Configuration**: Support configuration via `ctx.config`
4. **Error Handling**: Validate inputs and handle errors gracefully
5. **Documentation**: Document hook behavior and dependencies

### Facet Design

1. **Consistent Interface**: Use consistent method names and signatures
2. **Lifecycle Management**: Implement init/dispose for resource management
3. **Dependency Declaration**: Declare dependencies on both hook and facet
4. **Contract Compliance**: Implement contracts when declared
5. **Error Handling**: Handle errors and provide useful error messages

### Dependency Management

1. **Minimal Dependencies**: Only declare truly required dependencies
2. **Explicit Dependencies**: Use `required` array, not implicit assumptions
3. **Dependency Order**: Consider initialization order when designing
4. **Optional Dependencies**: Check for optional facets at call time

## Common Use Cases

### Adding Routing

```javascript
subsystem.use(useRouter);
await subsystem.build();

subsystem.router.registerRoute('api/users/:id', async (message, params) => {
  const userId = params.id;
  // Handle route
});
```

### Adding Queuing

```javascript
subsystem.use(useQueue);
await subsystem.build();

const status = subsystem.queue.getQueueStatus();
subsystem.queue.enqueue(message);
```

### Adding Statistics

```javascript
subsystem.use(useStatistics);
await subsystem.build();

subsystem.statistics.recordEvent('user_action');
const stats = subsystem.statistics.getStatistics();
```

### Custom Hook

```javascript
// Create custom hook
export const useCache = createHook({
  kind: 'cache',
  required: [],
  attach: true,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.cache || {};
    const cache = new LRUCache(config.maxSize || 100);
    
    return new Facet('cache', { attach: true })
      .add({
        get(key) { return cache.get(key); },
        set(key, value) { cache.set(key, value); }
      });
  }
});

// Use custom hook
subsystem.use(useCache);
await subsystem.build();

// Use cache
subsystem.cache.set('key', 'value');
const value = subsystem.cache.get('key');
```

## Related Documentation

- [Hooks](./HOOKS.md) - Detailed hook documentation
- [Facets](./FACETS.md) - Detailed facet documentation
- [Facet Manager](./FACET-MANAGER.md) - Facet management system
- [Facet Manager Transaction](./FACET-MANAGER-TRANSACTION.md) - Transactional operations
- [Facet Init Callback](./FACET-INIT-CALLBACK.md) - Initialization interface
- [Default Hooks](../DEFAULT-HOOKS.md) - Pre-configured hook sets
- [Facet Contract](../FACET-CONTRACT.md) - Contract system
- [Facet Contract Registry](../FACET-CONTRACT-REGISTRY.md) - Contract management
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Context parameter
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - API parameter
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Subsystem parameter





