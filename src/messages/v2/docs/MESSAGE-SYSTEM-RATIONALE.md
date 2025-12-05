# Message System Rationale

## Introduction

This document explains the design decisions that led to the Message System architecture in the Mycelia Kernel. It describes the problem of sharing data between independent parts of the system, the issues with previous approaches, and how the Message System provides a centralized, decoupled communication mechanism.

## The Problem: Sharing Data Between Independent Parts

### The Challenge

As the Mycelia Kernel grew, there was a fundamental need to share data and communicate between independent parts of the system. Different subsystems needed to:

- **Query Data**: Request information from other subsystems
- **Share State**: Update shared state across subsystems
- **Coordinate Operations**: Trigger actions in other subsystems
- **Integrate Functionality**: Combine capabilities from different subsystems

### Previous Attempts

Initial attempts to solve this problem led to several issues:

#### 1. Tight Coupling

Direct references between subsystems created tight coupling:

```javascript
// ❌ Bad: Direct references
class CanvasSubsystem {
  constructor() {
    this.storageSubsystem = storageSubsystem;  // Direct reference
    this.cacheSubsystem = cacheSubsystem;       // Direct reference
  }
  
  async saveLayer(layer) {
    // Tightly coupled to storageSubsystem
    return await this.storageSubsystem.save(layer);
  }
}
```

**Problems:**
- Subsystems directly depend on each other
- Hard to test subsystems independently
- Changes in one subsystem break others
- Circular dependencies become common

#### 2. Difficult Testing

Tight coupling made testing difficult:

```javascript
// ❌ Bad: Hard to test
test('CanvasSubsystem saves layer', async () => {
  const canvas = new CanvasSubsystem();
  // Must create real storageSubsystem and cacheSubsystem
  // Must set up entire system just to test one subsystem
  await canvas.saveLayer(layer);
});
```

**Problems:**
- Must create entire system to test one part
- Integration tests become the only way to test
- Unit tests are impossible or meaningless
- Test setup is complex and brittle

#### 3. Painful Integration Tests

Integration tests became painful:

```javascript
// ❌ Bad: Complex integration test setup
test('System integration', async () => {
  // Must create all subsystems
  const storage = new StorageSubsystem();
  const cache = new CacheSubsystem();
  const canvas = new CanvasSubsystem(storage, cache);
  
  // Must wire everything together
  storage.setCache(cache);
  cache.setStorage(storage);
  canvas.setStorage(storage);
  canvas.setCache(cache);
  
  // Now can test
  await canvas.saveLayer(layer);
  
  // But what if we want to test with different implementations?
  // Must rewrite entire test setup
});
```

**Problems:**
- Complex setup for every test
- Hard to swap implementations
- Tests are slow and brittle
- Changes require updating many tests

## The Solution: Message-Driven Architecture

### Core Insight

The solution was to create a **message-driven architecture** where:

1. **Central Communication**: All communication goes through a central Message System
2. **Message-Based**: Subsystems communicate via messages, not direct references
3. **Path-Based Routing**: Messages are routed to subsystems based on paths
4. **Loose Coupling**: Subsystems don't know about each other directly

### Operating System Inspiration

The message passing solution was borrowed from **operating systems**, which face a similar challenge: allowing multiple fully encapsulated processes to exist within the same host without data from one process contaminating another, while still enabling them to share data.

#### The Operating System Problem

Operating systems need to:
- **Encapsulate Processes**: Each process has its own memory space, preventing direct access to other processes' data
- **Prevent Contamination**: Data from one process cannot accidentally contaminate another process
- **Enable Communication**: Processes still need to share data and coordinate operations
- **Manage Resources**: Multiple processes compete for CPU time and other resources

#### The Operating System Solution

Operating systems solve this through:
- **Message Passing**: Processes communicate via messages through the kernel
- **Process Isolation**: Each process has isolated memory space
- **Scheduling**: The kernel schedules CPU time between processes
- **Inter-Process Communication (IPC)**: Standardized mechanisms for process communication

#### Parallels in Mycelia Kernel

The Mycelia Kernel adapts these concepts:

```
Operating System          Mycelia Kernel
─────────────────         ──────────────
Process                   Subsystem
Kernel                    MessageSystem
Message Passing           Message-based communication
Process Isolation         Subsystem encapsulation
CPU Scheduler             Global Scheduler
IPC Mechanisms            Message routing
```

**Key Parallels:**

1. **Encapsulation**: Just as OS processes are encapsulated with isolated memory, Mycelia subsystems are encapsulated with isolated state
2. **Message Passing**: Just as OS processes communicate via kernel message passing, Mycelia subsystems communicate via MessageSystem
3. **Scheduling**: Just as OS kernels schedule CPU time between processes, Mycelia's Global Scheduler allocates time slices between subsystems
4. **No Direct Access**: Just as processes cannot directly access each other's memory, subsystems cannot directly access each other's state

**Benefits of OS-Inspired Design:**
- ✅ **Proven Architecture**: Message passing has been proven in operating systems for decades
- ✅ **Isolation**: Subsystems are fully isolated, preventing data contamination
- ✅ **Scalability**: OS message passing scales to thousands of processes
- ✅ **Resource Management**: Scheduling ensures fair resource allocation
- ✅ **Reliability**: Isolated processes prevent cascading failures

### Message System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Message System                          │
└─────────────────────────────────────────────────────────────┘

Subsystem A                    Subsystem B
     │                              │
     │  ┌──────────────────────┐   │
     └─▶│   Message System     │◀──┘
        │                      │
        │  - Routes messages   │
        │  - Manages registry   │
        │  - Coordinates        │
        └──────────────────────┘
```

### How It Works

Instead of direct references, subsystems send messages:

```javascript
// ✅ Good: Message-based communication
class CanvasSubsystem {
  async saveLayer(layer) {
    // Send message to storage subsystem
    const message = messageFactory.createCommand('storage://files/save', {
      path: layer.path,
      data: layer.data
    });
    
    // Message System routes to storage subsystem
    return await this.messageSystem.send(message);
  }
}
```

**Benefits:**
- ✅ No direct references
- ✅ Loose coupling
- ✅ Easy to test (mock MessageSystem)
- ✅ Easy to swap implementations

## Avoiding Monolithic Message System

### The Challenge

The Message System itself could have become a monolithic class, trying to handle everything:

```javascript
// ❌ Bad: Monolithic MessageSystem
class MessageSystem {
  constructor() {
    this.router = new Router();
    this.registry = new Registry();
    this.scheduler = new Scheduler();
    this.messageFactory = new MessageFactory();
    // ... many more components
  }
  
  // Many methods handling different concerns
  route(message) { /* ... */ }
  register(subsystem) { /* ... */ }
  schedule(subsystem) { /* ... */ }
  createMessage(path, payload) { /* ... */ }
  // ... many more methods
}
```

**Problems:**
- Monolithic class with many responsibilities
- Hard to extend or modify
- Violates Single Responsibility Principle
- Same problems as original BaseSubsystem

### The Solution: Hooks and Facets

The Message System avoids being monolithic by using the **hooks and facets system** to build itself:

```javascript
// ✅ Good: MessageSystem extends BaseSubsystem
export class MessageSystem extends BaseSubsystem {
  constructor(name, options = {}) {
    super(name, { ...options, ms: { _isPlaceholder: true } });
    
    // Use hooks and facets to build capabilities
    this.defaultHooks = [
      useGlobalScheduler,      // Global scheduling capability
      useMessages,             // Message creation capability
      useMessageSystemRegistry, // Subsystem registry capability
      useMessageSystemRouter    // Message routing capability
    ];
    
    // Create kernel (but don't build yet)
    this.#kernel = new KernelSubsystem('kernel', {
      ms: this,
      config: options.config?.kernel || {}
    });
  }
}
```

**Benefits:**
- ✅ MessageSystem is a subsystem itself
- ✅ Uses hooks and facets for capabilities
- ✅ Not monolithic - capabilities are separate facets
- ✅ Easy to extend with additional hooks
- ✅ Follows same architecture as other subsystems

### Building Before Bootstrap

The Message System builds itself **before** bootstrapping the kernel:

```javascript
async bootstrap() {
  // 1. Build MessageSystem first (with hooks and facets)
  await this.build({ graphCache: this.#graphCache });
  
  // 2. Set kernel on router (now that router facet exists)
  if (this.messageSystemRouter) {
    this.messageSystemRouter.setKernel(this.#kernel);
  }
  
  // 3. Bootstrap kernel (which builds its own children)
  await this.#kernel.bootstrap({ graphCache: this.#graphCache });
}
```

**Why This Matters:**
- MessageSystem builds its own capabilities first
- Router, registry, and scheduler facets are available
- Kernel can then use MessageSystem's capabilities
- Clean separation of concerns

## Communication Boundaries: Messages vs Direct Calls

### Architectural Rule

**Mycelia enforces a clear communication boundary:**

1. **Top-Level Subsystems**: Must communicate through messages via MessageSystem
2. **Child Subsystems**: Can communicate directly with parent or siblings within the same subsystem

This design balances **decoupling** (for top-level subsystems) with **performance** (for child subsystems).

### Why This Matters

**Top-Level Subsystems (Message-Based):**
- ✅ **Decoupling**: Independent subsystems don't know about each other
- ✅ **Security**: All communication goes through kernel security checks
- ✅ **Flexibility**: Easy to swap implementations, test independently
- ⚠️ **Overhead**: 3-8ms per message (routing, security, validation)

**Child Subsystems (Direct Calls):**
- ✅ **Performance**: Direct calls are < 0.1ms (vs 3-8ms for messages)
- ✅ **Efficiency**: No routing, security, or validation overhead
- ✅ **Trust**: Child subsystems are trusted components of their parent
- ⚠️ **Coupling**: Direct dependencies within subsystem boundary

### Performance Impact

**Direct Calls (Child ↔ Parent, Child ↔ Child):**
- **Latency**: < 0.1ms
- **Overhead**: None (direct method calls)
- **Use Case**: High-frequency internal operations

**Message Routing (Top-Level ↔ Top-Level):**
- **Latency**: 3-8ms (with caches)
- **Overhead**: Routing (1-3ms) + Security (2-5ms)
- **Use Case**: Cross-subsystem communication

**Performance Improvement:**
- Direct calls are **30-80x faster** than message routing
- This makes child subsystem communication highly efficient
- Top-level communication remains decoupled and secure

### Example: Child Subsystem Direct Communication

```javascript
// Child subsystem can call parent directly
class CacheSubsystem extends BaseSubsystem {
  async get(key) {
    // Direct call to parent (no message routing)
    const parent = this.getParent();
    if (parent && parent.find('storage')) {
      // Direct access to parent's storage facet
      return await parent.find('storage').read(key);
    }
    
    // Or access sibling directly
    const sibling = this.hierarchy.getParent()?.hierarchy?.getChild('storage');
    if (sibling) {
      return await sibling.find('storage').read(key);
    }
  }
}
```

### Example: Top-Level Subsystem Message Communication

```javascript
// Top-level subsystems must use messages
class CanvasSubsystem extends BaseSubsystem {
  async saveLayer(layer) {
    // Must use message routing (via MessageSystem)
    const message = messageFactory.createCommand('storage://files/save', {
      path: layer.path,
      data: layer.data
    });
    
    // Message System routes to storage subsystem
    return await this.messageSystem.send(message);
  }
}
```

### When to Use Direct Calls vs Messages

**Use Direct Calls When:**
- ✅ Communicating within the same subsystem (child ↔ parent, child ↔ child)
- ✅ High-frequency operations that need low latency
- ✅ Trusted components that don't need security checks
- ✅ Internal implementation details

**Use Messages When:**
- ✅ Communicating between top-level subsystems
- ✅ Need security and access control
- ✅ Need decoupling and flexibility
- ✅ Cross-boundary communication

## Subsystem Registration

### Top-Level Subsystem Registry

All top-level subsystems are registered with the MessageSystem:

```javascript
// Register subsystems
await messageSystem.registerSubsystem(canvasSubsystem);
await messageSystem.registerSubsystem(storageSubsystem);
await messageSystem.registerSubsystem(cacheSubsystem);

// All subsystems are now in the registry
// Can be found by name
// Can receive messages
```

### Registration Process

When a subsystem is registered:

1. **Build Subsystem**: Subsystem is built with dependency graph cache
2. **Wire Identity**: Kernel assigns identity and access control
3. **Register in Registry**: Subsystem is added to MessageSystem registry
4. **Available for Routing**: Subsystem can now receive messages

```javascript
async registerSubsystem(subsystemInstance, options = {}) {
  // 1. Build subsystem
  await subsystemInstance.build({ 
    ...options, 
    graphCache: this.#graphCache 
  });
  
  // 2. Wire identity via kernel
  const subsystem = this.#kernel.registerSubsystem(
    subsystemInstance, 
    options
  );
  
  // 3. Register in message system registry
  const registry = this.find('messageSystemRegistry');
  registry.set(subsystem.name, subsystem);
  
  return subsystem;
}
```

## Message Path Grammar

### Path Format

The Message System uses a specific grammar for message paths, defined by `BaseSubsystem.getNameString()`:

#### Root Subsystems

Root subsystems use the format: `subsystem://`

```javascript
// Root subsystem "kernel"
subsystem.getNameString();  // "kernel://"

// Root subsystem "canvas"
subsystem.getNameString();  // "canvas://"
```

#### Child Subsystems

Child subsystems use the format: `parent://child`

```javascript
// Child "cache" under "kernel"
subsystem.getNameString();  // "kernel://cache"

// Child "manager" under "kernel://cache"
subsystem.getNameString();  // "kernel://cache/manager"
```

#### Path Construction Rules

1. **Root subsystems**: End with `://`
2. **Child subsystems**: Use `/` separator
3. **No trailing slashes**: Parent path has trailing `//` removed before appending child
4. **Hierarchical**: Path reflects subsystem hierarchy

**Implementation:**
```javascript
getNameString() {
  if (this._parent === null) {
    return `${this.name}://`;
  }
  const parentName = this._parent.getNameString();
  // Ensure no accidental trailing "//"
  return `${parentName.replace(/\/$/, '')}/${this.name}`;
}
```

### Message Routing

Messages are routed based on their path:

```javascript
// Message to root subsystem
const message = messageFactory.createCommand('canvas://layers/create', {
  name: 'background'
});
// Routes to: canvas subsystem

// Message to child subsystem
const message = messageFactory.createCommand('kernel://cache/get', {
  key: 'user-data'
});
// Routes to: kernel://cache subsystem

// Message to grandchild subsystem
const message = messageFactory.createCommand('kernel://cache/manager/clear', {});
// Routes to: kernel://cache/manager subsystem
```

### Query Route Pattern

Queries always follow a specific route pattern: `subsystem://query/*` (where `subsystem` is the name of the subsystem):

```javascript
// Query pattern: subsystem://query/<operation>
const query = messageFactory.createQuery('storage://query/files', {
  path: '/documents'
});
// Routes to: storage subsystem, query operation 'files'

const query = messageFactory.createQuery('canvas://query/layers', {
  filter: 'active'
});
// Routes to: canvas subsystem, query operation 'layers'

const query = messageFactory.createQuery('kernel://query/errors', {
  type: 'internal'
});
// Routes to: kernel subsystem, query operation 'errors'
```

**Key Points:**
- **Pattern**: All queries use `subsystem://query/<operation>` format
- **Subsystem**: The subsystem name determines where the query is routed
- **Operation**: The operation name (after `query/`) determines which query handler processes it
- **Synchronous**: Queries are processed synchronously and return results immediately

### Kernel Special Handling

Kernel messages (`kernel://*`) are handled specially:

```javascript
// Kernel messages route to kernel subsystem
const message = messageFactory.createCommand('kernel://error/record/internal', {
  error: 'Something went wrong'
});
// Routes to: kernel subsystem (not in registry, special handling)
```

## Sharing Data via Messages

### Querying Data

To query data from any subsystem, send a message using the query route pattern `subsystem://query/*`:

```javascript
// Query data from storage subsystem
// Pattern: subsystem://query/<operation>
const query = messageFactory.createQuery('storage://query/files', {
  path: '/documents/file.txt'
});

const result = await messageSystem.send(query);
// Message System routes to storage subsystem
// Storage subsystem processes query via query handler
// Result returned synchronously (queries are synchronous)

// Another example: Query layers from canvas subsystem
const query = messageFactory.createQuery('canvas://query/layers', {
  filter: 'active'
});

const result = await messageSystem.send(query);
// Routes to: canvas subsystem
// Query handler processes 'layers' operation
// Returns active layers synchronously
```

**Query Route Pattern:**
- All queries must use the pattern: `subsystem://query/<operation>`
- The subsystem name determines routing destination
- The operation name (after `query/`) determines which query handler processes it
- Queries are processed synchronously and return results immediately

### Updating Data

To update data in any subsystem, send a command:

```javascript
// Update data in cache subsystem
const command = messageFactory.createCommand('cache://set', {
  key: 'user-data',
  value: userData
});

await messageSystem.send(command);
// Message System routes to cache subsystem
// Cache subsystem processes command
```

### Cross-Subsystem Communication

Subsystems can communicate without direct references:

```javascript
// Canvas subsystem needs to save to storage
class CanvasSubsystem {
  async saveLayer(layer) {
    // No direct reference to storage subsystem
    // Just send a message
    const message = messageFactory.createCommand('storage://files/save', {
      path: layer.path,
      data: layer.data
    });
    
    // Message System handles routing
    return await this.messageSystem.send(message);
  }
}
```

## Benefits of Message System

### 1. Loose Coupling

Subsystems don't know about each other:

```javascript
// ✅ Good: No direct references
class CanvasSubsystem {
  constructor(messageSystem) {
    this.messageSystem = messageSystem;  // Only depends on MessageSystem
  }
  
  async saveLayer(layer) {
    // Doesn't know about storage subsystem
    // Just sends message to path
    return await this.messageSystem.send(
      messageFactory.createCommand('storage://files/save', layer)
    );
  }
}
```

### 2. Easy Testing

Subsystems can be tested independently:

```javascript
// ✅ Good: Easy to test
test('CanvasSubsystem saves layer', async () => {
  // Mock MessageSystem
  const mockMessageSystem = {
    send: jest.fn().mockResolvedValue({ success: true })
  };
  
  const canvas = new CanvasSubsystem(mockMessageSystem);
  await canvas.saveLayer(layer);
  
  // Verify message was sent
  expect(mockMessageSystem.send).toHaveBeenCalledWith(
    expect.objectContaining({
      path: 'storage://files/save'
    })
  );
});
```

**Benefits:**
- ✅ No need to create real subsystems
- ✅ Fast unit tests
- ✅ Easy to mock MessageSystem
- ✅ Test one subsystem at a time

### 3. Easy Integration

Integration tests are simpler:

```javascript
// ✅ Good: Simple integration test
test('System integration', async () => {
  const messageSystem = new MessageSystem('test-system');
  await messageSystem.bootstrap();
  
  // Register subsystems
  await messageSystem.registerSubsystem(canvasSubsystem);
  await messageSystem.registerSubsystem(storageSubsystem);
  
  // Test communication via messages
  const message = messageFactory.createCommand('canvas://layers/create', {
    name: 'background'
  });
  
  const result = await messageSystem.send(message);
  expect(result).toBeDefined();
});
```

**Benefits:**
- ✅ Simple setup
- ✅ Subsystems registered automatically
- ✅ Communication via messages
- ✅ Easy to add/remove subsystems

### 4. Flexible Routing

Messages can be routed to any subsystem:

```javascript
// Route to any registered subsystem
await messageSystem.send(
  messageFactory.createCommand('canvas://layers/create', data)
);

await messageSystem.send(
  messageFactory.createCommand('storage://files/save', data)
);

await messageSystem.send(
  messageFactory.createCommand('cache://set', data)
);

// All use the same interface
// All routed automatically
// No special handling needed
```

### 5. Extensibility

Easy to add new subsystems:

```javascript
// Add new subsystem
const newSubsystem = new NewSubsystem('new-subsystem', {
  ms: messageSystem
});

// Register with MessageSystem
await messageSystem.registerSubsystem(newSubsystem);

// Immediately available for messaging
await messageSystem.send(
  messageFactory.createCommand('new-subsystem://action', data)
);
```

### 6. Implementation Flexibility

Any subsystem can have any implementation, as long as it provides the routes that other subsystems expect:

```javascript
// Storage subsystem implementation A: File-based storage
class FileStorageSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    this.use(useRouter).use(useMessageProcessor);
  }
  
  async build() {
    await super.build();
    // Register expected routes
    this.router.registerRoute('files/save', this.handleSave.bind(this));
    this.router.registerRoute('files/read', this.handleRead.bind(this));
  }
  
  handleSave(message) {
    // File-based implementation
    return fs.writeFile(message.payload.path, message.payload.data);
  }
  
  handleRead(message) {
    // File-based implementation
    return fs.readFile(message.payload.path);
  }
}

// Storage subsystem implementation B: Database storage
class DatabaseStorageSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    this.use(useRouter).use(useMessageProcessor);
  }
  
  async build() {
    await super.build();
    // Register same routes, different implementation
    this.router.registerRoute('files/save', this.handleSave.bind(this));
    this.router.registerRoute('files/read', this.handleRead.bind(this));
  }
  
  handleSave(message) {
    // Database implementation
    return db.insert('files', message.payload);
  }
  
  handleRead(message) {
    // Database implementation
    return db.select('files', { path: message.payload.path });
  }
}

// Both implementations work with the same client code
class CanvasSubsystem {
  async saveLayer(layer) {
    // Same message, works with either implementation
    return await this.messageSystem.send(
      messageFactory.createCommand('storage://files/save', {
        path: layer.path,
        data: layer.data
      })
    );
  }
}
```

**Benefits:**
- ✅ **Interface Contract**: Routes define the interface, not the implementation
- ✅ **Swappable Implementations**: Can swap implementations without changing client code
- ✅ **Multiple Implementations**: Can have different implementations for different environments
- ✅ **Testing Flexibility**: Can use mock implementations for testing
- ✅ **Evolution**: Can evolve implementations independently

**Example Use Cases:**
- **Development vs Production**: Use file-based storage in development, database in production
- **Testing**: Use in-memory implementations for fast tests
- **Migration**: Gradually migrate from one implementation to another
- **A/B Testing**: Test different implementations side-by-side

## Real-World Impact

### Before Message System

```javascript
// ❌ Bad: Tight coupling
class CanvasSubsystem {
  constructor(storage, cache, router, scheduler) {
    this.storage = storage;
    this.cache = cache;
    this.router = router;
    this.scheduler = scheduler;
  }
  
  async saveLayer(layer) {
    // Direct dependencies
    await this.storage.save(layer);
    await this.cache.set(layer.id, layer);
  }
}

// Hard to test
// Hard to swap implementations
// Tight coupling
// Complex integration tests
```

### After Message System

```javascript
// ✅ Good: Loose coupling
class CanvasSubsystem {
  constructor(messageSystem) {
    this.messageSystem = messageSystem;  // Only one dependency
  }
  
  async saveLayer(layer) {
    // Message-based communication
    await this.messageSystem.send(
      messageFactory.createCommand('storage://files/save', layer)
    );
    await this.messageSystem.send(
      messageFactory.createCommand('cache://set', {
        key: layer.id,
        value: layer
      })
    );
  }
}

// Easy to test
// Easy to swap implementations
// Loose coupling
// Simple integration tests
```

## Summary

The Message System was created to solve the problem of sharing data between independent parts of the system. The key insights were:

1. **Problem**: Previous attempts led to tight coupling, difficult testing, and painful integration tests
2. **Solution**: Message-driven architecture with centralized communication
3. **Architecture**: MessageSystem extends BaseSubsystem, uses hooks and facets to avoid being monolithic
4. **Registration**: All top-level subsystems registered with MessageSystem
5. **Communication**: Share/query data by sending messages to correct paths
6. **Grammar**: Specific path grammar based on subsystem hierarchy

The Message System provides:
- **Loose Coupling**: Subsystems don't know about each other
- **Easy Testing**: Subsystems can be tested independently
- **Simple Integration**: Integration tests are straightforward
- **Flexible Routing**: Messages route to any subsystem
- **Extensibility**: Easy to add new subsystems
- **Implementation Flexibility**: Any subsystem can have any implementation, as long as it provides expected routes

This enables a scalable, maintainable architecture where subsystems can communicate without tight coupling, making the system easier to test, extend, and maintain.

## Related Documentation

- [Message System](./message/MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [Messages Overview](./message/MESSAGES-OVERVIEW.md) - High-level overview of the message system
- [Message](./message/MESSAGE.md) - Message class for inter-subsystem communication
- [Message Factory](./message/MESSAGE-FACTORY.md) - Centralized factory for creating messages
- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core building block for all subsystems (includes getNameString grammar)
- [Hooks and Facets Rationale](./HOOKS-AND-FACETS-RATIONALE.md) - Design decisions for hooks and facets architecture
- [Message Router](./hooks/message-system-router/MESSAGE-ROUTER.md) - Message routing implementation
- [Message System Registry](./hooks/message-system-registry/MESSAGE-SYSTEM-REGISTRY.md) - Subsystem registry implementation

