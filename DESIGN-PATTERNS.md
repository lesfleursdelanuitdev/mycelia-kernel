# Design Patterns in Mycelia Kernel

## Overview

Mycelia Kernel employs a comprehensive set of design patterns to achieve its goals of modularity, extensibility, and maintainability. This document identifies and explains all design patterns used throughout the codebase.

**Analysis Date:** January 2025  
**Codebase Version:** v2

---

## Primary Patterns

### 1. Message-Driven Architecture (MDA)

**Purpose:** Decouple subsystems through asynchronous message passing.

**Implementation:**
- All subsystem communication via `Message` objects
- Path-based routing (`subsystem://path/to/resource`)
- No direct references between subsystems
- MessageSystem as central coordinator

**Key Components:**
- `MessageSystem` - Central message coordinator
- `MessageRouter` - Routes messages to subsystems
- `Message` - Structured message objects
- `MessageFactory` - Creates messages with metadata

**Example:**
```javascript
// Subsystem A sends message to Subsystem B
const message = new Message('subsystemB://operation/do', { data: 'value' });
await messageSystem.send(message);
```

**Benefits:**
- Loose coupling between subsystems
- Asynchronous processing
- Easy to add new subsystems
- Clear communication boundaries

---

### 2. Hook Pattern

**Purpose:** Extend subsystem functionality through composable hooks.

**Implementation:**
- Hooks are factory functions that create Facets
- Hooks declare dependencies
- Build system resolves dependency order
- Facets provide specific capabilities

**Key Components:**
- `createHook()` - Hook factory function
- `BaseSubsystem.use()` - Hook registration
- `SubsystemBuilder` - Build orchestration
- `FacetManager` - Facet lifecycle management

**Example:**
```javascript
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],
  attach: true,
  fn: (ctx, api, subsystem) => {
    return new Facet('queue', { attach: true })
      .add({
        enqueue(message) { /* ... */ },
        dequeue() { /* ... */ }
      });
  }
});

// Usage
subsystem.use(useQueue);
await subsystem.build();
const queue = subsystem.find('queue');
```

**Benefits:**
- Composable functionality
- Dependency management
- Easy to extend subsystems
- Consistent interface

---

### 3. Facade Pattern

**Purpose:** Provide a unified interface to a complex subsystem.

**Implementation:**
- `BaseSubsystem` provides unified interface
- Hides complexity of hooks, facets, and build system
- Exposes simple methods (`find()`, `use()`, `build()`)
- Manages internal state and lifecycle

**Key Components:**
- `BaseSubsystem` - Main facade class
- `subsystem.find(kind)` - Facet access
- `subsystem.use(hook)` - Hook registration
- `subsystem.build()` - Lifecycle management

**Example:**
```javascript
// Simple interface hides complexity
const subsystem = new BaseSubsystem('my-service', { ms: messageSystem });
subsystem.use(useRouter);
subsystem.use(useQueue);
await subsystem.build();

// Access facets through facade
const router = subsystem.find('router');
const queue = subsystem.find('queue');
```

**Benefits:**
- Simplified API
- Hides implementation complexity
- Consistent interface across subsystems
- Easy to use

---

### 4. Strategy Pattern

**Purpose:** Allow algorithms to be selected at runtime.

**Implementation:**
- Pluggable strategies for scheduling, storage, authentication
- Strategy registry with registration API
- Runtime strategy selection
- Consistent strategy interface

**Key Components:**
- `GlobalScheduler` - Scheduling strategies (round-robin, priority-based)
- `useAuthStrategies` - Authentication strategies (password, apiKey, token)
- `selectStorageBackend()` - Storage backend selection
- Strategy registries

**Example:**
```javascript
// Authentication strategies
const authStrategies = authSubsystem.find('authStrategies');

// Register custom strategy
authStrategies.registerStrategy('oauth', {
  authenticate: async (credentials) => {
    // OAuth authentication logic
  }
});

// Use strategy at runtime
const result = await authStrategies.authenticate('oauth', credentials);
```

**Benefits:**
- Runtime algorithm selection
- Easy to add new strategies
- Testable strategies
- Flexible configuration

---

### 5. Factory Pattern

**Purpose:** Create objects without specifying exact classes.

**Implementation:**
- `createHook()` - Creates hook functions with metadata
- `MessageFactory` - Creates messages with metadata
- `createIdentity()` - Creates identity wrappers
- `createFriendIdentity()` - Creates friend identity wrappers

**Key Components:**
- `createHook()` - Hook factory
- `MessageFactory.create()` - Message factory
- `createIdentity()` - Identity factory
- `createFriendIdentity()` - Friend identity factory

**Example:**
```javascript
// Hook factory
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],
  fn: (ctx, api, subsystem) => {
    return new Facet('queue').add({ /* ... */ });
  }
});

// Message factory
const message = MessageFactory.create('subsystem://path', { data: 'value' }, {
  type: 'command',
  meta: { traceId: '123' }
});
```

**Benefits:**
- Consistent object creation
- Encapsulates creation logic
- Easy to extend
- Centralized creation

---

### 6. Observer Pattern

**Purpose:** One-to-many dependency between objects.

**Implementation:**
- Event/listener system via `useListeners` hook
- Event emission and subscription
- Pattern-based listener matching
- Handler groups for multiple listeners

**Key Components:**
- `useListeners` - Listener hook
- `ListenerManager` - Manages listeners
- `ListenerRegistry` - Listener storage
- `subsystem.listeners.emit()` - Event emission
- `subsystem.listeners.on()` - Listener registration

**Example:**
```javascript
// Register listener
authSubsystem.listeners.on('event://auth/login/success', async (message) => {
  const data = message.getBody();
  await auditStorage.log({ type: 'login', userId: data.userId });
});

// Emit event
authSubsystem.listeners.emit('event://auth/login/success', eventMessage);
```

**Benefits:**
- Decoupled event producers and consumers
- Multiple listeners per event
- Pattern-based matching
- Easy to add/remove listeners

---

### 7. Repository Pattern

**Purpose:** Abstract data access layer.

**Implementation:**
- Storage abstraction via storage hooks
- Multiple storage backends (SQLite, IndexedDB, Memory)
- Consistent storage interface
- Namespace-based organization

**Key Components:**
- `useDBStorage` - Database storage hook
- `useSQLiteStorage` - SQLite backend
- `useIndexedDBStorage` - IndexedDB backend
- `useMemoryStorage` - Memory backend
- Storage contract interface

**Example:**
```javascript
// Storage abstraction
const storage = dbSubsystem.find('storage');

// Same interface for all backends
await storage.set('user:123', userData, { namespace: 'users' });
const result = await storage.get('user:123', { namespace: 'users' });
await storage.query([{ field: 'age', operator: 'gte', value: 18 }], { namespace: 'users' });
```

**Benefits:**
- Backend-agnostic code
- Easy to swap storage backends
- Consistent interface
- Testable with memory backend

---

## Secondary Patterns

### 8. Builder Pattern

**Purpose:** Construct complex objects step by step.

**Implementation:**
- `SubsystemBuilder` - Builds subsystems with dependency resolution
- Fluent interface for configuration
- Build planning and execution
- Transaction support

**Key Components:**
- `SubsystemBuilder` - Main builder class
- `builder.plan()` - Create build plan
- `builder.build()` - Execute build
- `builder.withCtx()` - Context configuration

**Example:**
```javascript
const builder = new SubsystemBuilder(subsystem);
const plan = builder
  .withCtx({ config: { storage: { backend: 'sqlite' } } })
  .plan();

await builder.build();
```

**Benefits:**
- Step-by-step construction
- Validates dependencies
- Caches build plans
- Transaction support

---

### 9. Registry Pattern

**Purpose:** Centralized storage and retrieval of objects.

**Implementation:**
- Multiple registries for different object types
- Map-based storage for O(1) lookups
- Special handling for kernel subsystem
- Iteration support

**Key Components:**
- `MessageSystemRegistry` - Subsystem registry
- `PrincipalRegistry` - Principal registry
- `ChildSubsystemRegistry` - Child subsystem registry
- `ListenerRegistry` - Listener registry
- `FacetContractRegistry` - Contract registry

**Example:**
```javascript
// Subsystem registry
const registry = messageSystem.find('messageSystemRegistry');
registry.set('auth', authSubsystem);
const auth = registry.get('auth');

// Principal registry
const principals = accessControl.find('principals');
const pkr = principals.createPrincipal(PRINCIPAL_KINDS.FRIEND, { name: 'alice' });
const principal = principals.get(pkr.uuid);
```

**Benefits:**
- Centralized management
- Fast lookups
- Easy iteration
- Consistent interface

---

### 10. Adapter Pattern

**Purpose:** Convert interface of a class into another interface.

**Implementation:**
- Storage backend adapters (SQLite, IndexedDB, Memory)
- Web server adapters (Fastify, Express, Hono)
- Contract adapters for facet contracts
- Consistent interface across adapters

**Key Components:**
- `SQLiteStorageBackend` - SQLite adapter
- `IndexedDBStorageBackend` - IndexedDB adapter
- `MemoryStorageBackend` - Memory adapter
- `useFastifyServer`, `useExpressServer`, `useHonoServer` - Server adapters

**Example:**
```javascript
// Storage adapters share same interface
const sqliteBackend = new SQLiteStorageBackend({ dbPath: './data.db' });
const indexedDBBackend = new IndexedDBStorageBackend({ dbName: 'storage' });
const memoryBackend = new MemoryStorageBackend({ capacity: 10000 });

// All implement same interface
await sqliteBackend.set('key', value);
await indexedDBBackend.set('key', value);
await memoryBackend.set('key', value);
```

**Benefits:**
- Interface compatibility
- Easy to swap implementations
- Consistent API
- Environment-specific adapters

---

### 11. Template Method Pattern

**Purpose:** Define skeleton of algorithm in base class.

**Implementation:**
- `BaseSubsystem` lifecycle methods
- Hook execution flow
- Build process template
- Subsystem initialization/disposal

**Key Components:**
- `BaseSubsystem.build()` - Build template
- `BaseSubsystem.dispose()` - Disposal template
- `SubsystemBuilder.build()` - Build execution template
- Lifecycle hooks (`onInit()`, `onDispose()`)

**Example:**
```javascript
// BaseSubsystem defines template
class BaseSubsystem {
  async build(ctx) {
    // 1. Verify build
    // 2. Create facets
    // 3. Initialize facets
    // 4. Attach facets
    // 5. Build children
    // 6. Call onInit callbacks
  }
}

// Subclasses follow template
class AuthSubsystem extends BaseSubsystem {
  // Hooks customize behavior
  constructor() {
    this.use(useAuthStorage);
    this.use(usePasswordManager);
  }
}
```

**Benefits:**
- Consistent lifecycle
- Customizable steps
- Reusable algorithm structure
- Clear extension points

---

### 12. Proxy Pattern

**Purpose:** Provide placeholder or surrogate for another object.

**Implementation:**
- `FacetManager` uses Proxy for dynamic property access
- Transparent facet access via property names
- Map-based storage with property-like access

**Key Components:**
- `FacetManager` - Proxy-based facet access
- Property access to facets
- Map storage with transparent access

**Example:**
```javascript
// FacetManager uses Proxy
const facetManager = new FacetManager(subsystem);

// Property access works
facetManager.queue.enqueue(message);  // Accesses Map.get('queue')

// Direct access also works
facetManager.find('queue').enqueue(message);
```

**Benefits:**
- Transparent access
- Dynamic property resolution
- Clean API
- Map-based storage

---

### 13. Singleton Pattern (Implicit)

**Purpose:** Ensure single instance of critical objects.

**Implementation:**
- `MessageSystem` - Single instance per application
- `KernelSubsystem` - Single kernel instance
- `PrincipalRegistry` - Single registry per kernel
- Implicit through construction patterns

**Key Components:**
- `MessageSystem` - Central coordinator (single instance)
- `KernelSubsystem` - Root subsystem (single instance)
- `PrincipalRegistry` - Principal management (single instance)

**Example:**
```javascript
// MessageSystem is typically single instance
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

// Kernel is single instance within MessageSystem
const kernel = messageSystem.kernel;
```

**Benefits:**
- Single source of truth
- Centralized coordination
- Consistent state
- Resource efficiency

---

### 14. Chain of Responsibility Pattern

**Purpose:** Pass requests along a chain of handlers.

**Implementation:**
- Message routing chain
- Route matching and handler execution
- Error handling chain
- Middleware-like processing

**Key Components:**
- `MessageRouter` - Routing chain
- `SubsystemRouter` - Route matching
- Route handlers
- Error propagation

**Example:**
```javascript
// Message routing chain
MessageSystem.send(message)
  → MessageRouter.route(message)
    → Subsystem.accept(message)
      → SubsystemRouter.match(message)
        → Route handler.execute(message)
```

**Benefits:**
- Flexible request handling
- Multiple handlers
- Easy to add/remove handlers
- Decoupled processing

---

### 15. Decorator Pattern

**Purpose:** Attach additional responsibilities to objects dynamically.

**Implementation:**
- Facet contracts as decorators
- Identity wrappers as decorators
- Permission decorators (`requireRead`, `requireWrite`)
- Metadata decorators

**Key Components:**
- `createIdentity()` - Identity wrapper decorator
- `requireRead()`, `requireWrite()` - Permission decorators
- Facet contracts - Interface decorators
- Metadata decorators

**Example:**
```javascript
// Identity wrapper decorates principal
const identity = createIdentity(principals, pkr, kernel);

// Permission decorators
const protectedFunction = identity.requireRead(pkr)(async () => {
  // Function with read permission check
});

// Facet contract decorates facet
const storageFacet = new Facet('storage', { contract: 'storage' });
```

**Benefits:**
- Dynamic behavior addition
- Composable decorators
- Runtime decoration
- Flexible enhancement

---

### 16. Command Pattern

**Purpose:** Encapsulate requests as objects.

**Implementation:**
- Messages as command objects
- Command handlers
- Command routing
- Command execution

**Key Components:**
- `Message` - Command object
- Route handlers - Command handlers
- `useCommands` - Command management hook
- Command execution flow

**Example:**
```javascript
// Message as command
const command = new Message('auth://login', {
  strategy: 'password',
  credentials: { username: 'alice', password: 'secret' }
});

// Command execution
await messageSystem.send(command);

// Command handler
subsystem.registerRoute('auth://login', async (message) => {
  // Execute login command
  return await handleLogin(message);
});
```

**Benefits:**
- Encapsulated requests
- Queuing and logging
- Undo/redo support (potential)
- Decoupled invoker and receiver

---

### 17. State Pattern

**Purpose:** Allow object to alter behavior when internal state changes.

**Implementation:**
- Subsystem build state (`_isBuilt`)
- Message processing state
- Session state management
- Connection state (Friend connected/disconnected)

**Key Components:**
- `BaseSubsystem._isBuilt` - Build state
- `Friend.connected` - Connection state
- Session state management
- Message processing state

**Example:**
```javascript
// Subsystem state
if (!subsystem.isBuilt) {
  await subsystem.build();
}

// Friend connection state
if (friend.connected) {
  await friend.sendProtected(message);
} else {
  friend.connect();
}

// Session state
if (session.expiresAt < Date.now()) {
  // Session expired state
}
```

**Benefits:**
- State-based behavior
- Clear state transitions
- Encapsulated state logic
- Easy to extend states

---

### 18. Flyweight Pattern

**Purpose:** Use sharing to support large numbers of fine-grained objects.

**Implementation:**
- Route tree caching
- Facet instance sharing
- PKR caching
- Identity wrapper reuse

**Key Components:**
- `RouteTreeStore` - Route tree caching
- `PrincipalRegistry` - PKR caching
- Identity wrapper reuse
- Facet instance sharing

**Example:**
```javascript
// Route tree caching (flyweight)
const routeTree = routeTreeStore.get('subsystem://path/to/resource');
// Same route tree reused for multiple messages with same path

// PKR caching
const pkr = principals.get(uuid);
// PKR instance reused across identity wrappers
```

**Benefits:**
- Memory efficiency
- Performance optimization
- Shared state management
- Reduced object creation

---

### 19. Mediator Pattern

**Purpose:** Define how objects interact without direct references.

**Implementation:**
- `MessageSystem` as mediator
- Subsystem communication through messages
- No direct subsystem references
- Centralized coordination

**Key Components:**
- `MessageSystem` - Central mediator
- `MessageRouter` - Routing mediator
- Message-based communication
- Subsystem registry

**Example:**
```javascript
// MessageSystem mediates communication
// Subsystem A doesn't know about Subsystem B
const message = new Message('subsystemB://operation', { data: 'value' });
await messageSystem.send(message);  // MessageSystem routes to Subsystem B
```

**Benefits:**
- Decoupled communication
- Centralized coordination
- Easy to add/remove subsystems
- Clear communication flow

---

### 20. Composite Pattern

**Purpose:** Compose objects into tree structures.

**Implementation:**
- Subsystem hierarchy (parent-child)
- Nested subsystem structure
- Hierarchical path names
- Tree traversal

**Key Components:**
- `BaseSubsystem` - Component interface
- `useHierarchy` - Hierarchy management
- `ChildSubsystemRegistry` - Child management
- `getNameString()` - Hierarchical paths

**Example:**
```javascript
// Subsystem hierarchy
kernel (root)
  ├── access-control (child)
  ├── error-manager (child)
  └── cache (child)
      └── manager (grandchild)

// Hierarchical paths
kernel.getNameString();  // "kernel://"
cache.getNameString();   // "kernel://cache"
manager.getNameString(); // "kernel://cache/manager"
```

**Benefits:**
- Tree structure
- Uniform interface
- Recursive composition
- Easy traversal

---

## Pattern Combinations

### Hook + Factory Pattern

Hooks use factory pattern to create facets:

```javascript
// Hook is factory for facets
export const useQueue = createHook({
  kind: 'queue',
  fn: (ctx, api, subsystem) => {
    // Factory creates facet
    return new Facet('queue').add({ /* ... */ });
  }
});
```

### Registry + Strategy Pattern

Registries store strategies:

```javascript
// Strategy registry
const strategies = new Map();
strategies.set('password', passwordStrategy);
strategies.set('apiKey', apiKeyStrategy);

// Runtime strategy selection
const strategy = strategies.get(strategyName);
await strategy.authenticate(credentials);
```

### Facade + Builder Pattern

Facade uses builder for construction:

```javascript
// Facade provides simple interface
class BaseSubsystem {
  async build() {
    // Builder handles complexity
    return await this._builder.build();
  }
}
```

### Observer + Mediator Pattern

Observer pattern with MessageSystem as mediator:

```javascript
// Event emission through mediator
authSubsystem.listeners.emit('event://auth/login', message);

// Listeners receive through mediator
auditSubsystem.listeners.on('event://auth/login', handler);
```

---

## Pattern Usage Statistics

**Most Used Patterns:**
1. **Hook Pattern** - Core extensibility mechanism (30+ hooks)
2. **Factory Pattern** - Object creation (hooks, messages, identities)
3. **Registry Pattern** - Centralized storage (5+ registries)
4. **Strategy Pattern** - Pluggable algorithms (scheduling, storage, auth)
5. **Facade Pattern** - Unified interfaces (BaseSubsystem)

**Pattern Distribution:**
- **Primary Patterns**: 7 patterns (core architecture)
- **Secondary Patterns**: 13 patterns (supporting architecture)
- **Total Patterns**: 20+ identified patterns

---

## Benefits of Pattern Usage

1. **Modularity** - Clear separation of concerns
2. **Extensibility** - Easy to add new features
3. **Testability** - Patterns enable unit testing
4. **Maintainability** - Consistent patterns across codebase
5. **Flexibility** - Runtime configuration and selection
6. **Performance** - Optimized patterns (flyweight, caching)
7. **Scalability** - Patterns support growth

---

## Related Documentation

- [CODEBASE_ANALYSIS-2025-JANUARY-UPDATED.md](./CODEBASE_ANALYSIS-2025-JANUARY-UPDATED.md) - Overall codebase analysis
- [HOOKS-AND-FACETS-RATIONALE.md](./src/messages/v2/docs/HOOKS-AND-FACETS-RATIONALE.md) - Hook pattern rationale
- [MESSAGE-SYSTEM-RATIONALE.md](./src/messages/v2/docs/MESSAGE-SYSTEM-RATIONALE.md) - Message-driven architecture rationale

---

**Document Version:** 1.0  
**Last Updated:** January 2025

