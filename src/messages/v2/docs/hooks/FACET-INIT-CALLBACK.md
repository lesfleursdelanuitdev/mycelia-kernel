# Facet Init Callback

## Overview

The **facet init callback** is a lifecycle callback that is invoked when a facet is initialized. It provides a way to perform setup operations, access dependencies, and configure the facet after it has been successfully added to the FacetManager but before it is attached to the subsystem.

The init callback is:
- **Registered** via `facet.onInit(callback)`
- **Invoked** automatically when the facet is successfully added (if `opts.init` is `true`)
- **Called once** per facet instance
- **Async-capable** - can return a Promise for asynchronous initialization

## What is the Init Callback?

The init callback is a function that you register on a facet to perform initialization logic. It's called at a specific point in the facet lifecycle:

1. **After** the facet is registered in FacetManager
2. **After** all dependencies are initialized (if using dependency resolution)
3. **Before** the facet is attached to the subsystem (if `attach: true`)
4. **Only once** per facet instance

**Key Characteristics:**
- Provides access to `ctx`, `api`, `subsystem`, and `facet`
- Can perform async operations
- Can access other facets that have already been initialized
- Is called automatically by the build system
- Throws errors if called after the facet is already initialized

## Registering the Init Callback

The init callback is registered using the `onInit()` method on a Facet instance.

### `onInit(callback)`

Registers a callback function that will be invoked when the facet is initialized.

**Signature:**
```javascript
facet.onInit(callback) => Facet
```

**Parameters:**
- `callback` (function, required) - The callback function to register

**Returns:** `Facet` - Returns the facet instance for method chaining

**Throws:**
- `Error` - If callback is not a function
- `Error` - If facet is already initialized

**Example:**
```javascript
const facet = new Facet('database', { attach: true, source: import.meta.url })
  .add({
    query(sql) {
      return this.connection.query(sql);
    }
  })
  .onInit(async ({ ctx, api, subsystem, facet }) => {
    // Initialization logic here
    const config = ctx.config?.database || {};
    this.connection = await createConnection(config);
  });
```

**Important:** The callback must be registered **before** the facet is initialized. Once a facet is initialized, you cannot register or change the callback.

## Callback Interface

The init callback receives a single parameter: an object containing `ctx`, `api`, `subsystem`, and `facet`.

### Callback Signature

```javascript
async function initCallback({ ctx, api, subsystem, facet }) {
  // Initialization logic
}
```

### Callback Parameters

The callback receives an object with the following properties:

#### `ctx` (object, required)

The context object containing system-level services and configuration.

**Structure:**
```javascript
ctx = {
  ms: MessageSystem,        // Reference to the MessageSystem instance
  config: {                  // Configuration object keyed by facet kind
    queue: { /* queue config */ },
    router: { /* router config */ },
    // ... other facet configs
  },
  debug: boolean            // Debug flag
}
```

**Usage:**
```javascript
.onInit(async ({ ctx }) => {
  // Access MessageSystem
  const messageSystem = ctx.ms;
  
  // Access configuration
  const config = ctx.config?.database || {};
  
  // Access debug flag
  const debug = ctx.debug || false;
})
```

**See Also:** [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) for complete documentation on the context object.

#### `api` (object, required)

The subsystem API object containing the subsystem name and FacetManager reference.

**Structure:**
```javascript
api = {
  name: string,              // Subsystem name
  __facets: FacetManager     // FacetManager instance
}
```

**Usage:**
```javascript
.onInit(async ({ api }) => {
  // Access subsystem name
  console.log(`Initializing facet for ${api.name}`);
  
  // Access FacetManager
  const queueFacet = api.__facets.find('queue');
})
```

**See Also:** [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) for complete documentation on the API object.

#### `subsystem` (BaseSubsystem, required)

The subsystem instance itself, providing access to methods like `find()`.

**Usage:**
```javascript
.onInit(async ({ subsystem }) => {
  // Access other facets using subsystem.find()
  const statisticsFacet = subsystem.find('statistics');
  if (statisticsFacet) {
    statisticsFacet.recordEvent('facet-initialized');
  }
})
```

**See Also:** [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) for complete documentation on the subsystem parameter.

#### `facet` (Facet, required)

The facet instance itself. This is useful for:
- Storing initialization state on the facet
- Accessing facet metadata
- Performing facet-specific operations

**Usage:**
```javascript
.onInit(async ({ facet }) => {
  // Store initialization state
  facet._initialized = true;
  facet._initTime = Date.now();
  
  // Access facet metadata
  const kind = facet.getKind();
  const source = facet.getSource();
})
```

## When the Callback is Called

The init callback is called automatically during the facet addition process, specifically:

### Call Timing

1. **During `FacetManager.add()`**: When `opts.init` is `true`
2. **After registration**: The facet is already registered in FacetManager
3. **After dependencies**: All declared dependencies are initialized first (via topological sort)
4. **Before attachment**: The facet is not yet attached to the subsystem
5. **Once per facet**: The callback is only called once, even if `init()` is called multiple times

### Call Flow

```javascript
// In FacetManager.add()
async add(kind, facet, opts = { init: false, attach: false, ctx, api }) {
  // 1. Register facet
  this.#facets[kind] = facet;
  
  // 2. Track for transaction rollback
  this.#txn.trackAddition(kind);
  
  // 3. Initialize (calls onInit callback if registered)
  if (opts.init && typeof facet.init === 'function') {
    await facet.init(opts.ctx, opts.api, this.#subsystem);
    // ↑ This is where onInit callback is invoked
  }
  
  // 4. Attach to subsystem (if attach: true)
  if (opts.attach && facet.shouldAttach?.()) {
    this.attach(kind);
  }
}
```

### During Subsystem Build

During subsystem build, facets are initialized in dependency order:

```javascript
// In buildSubsystem()
await subsystem.api.__facets.addMany(orderedKinds, facetsByKind, {
  init: true,        // ← All facets are initialized
  attach: true,
  ctx: resolvedCtx,
  api: subsystem.api
});
```

**Order of Operations:**
1. Facets are topologically sorted by dependencies
2. Each facet is added in order
3. For each facet:
   - Facet is registered
   - `facet.init(ctx, api, subsystem)` is called
   - `onInit` callback is invoked (if registered)
   - Facet is attached (if `attach: true`)

## Async Initialization

The init callback can be asynchronous. It can return a Promise, and the initialization process will wait for it to complete.

### Async Example

```javascript
.onInit(async ({ ctx, api, subsystem, facet }) => {
  // Async operations
  const config = ctx.config?.database || {};
  
  // Connect to database
  this.connection = await createConnection(config);
  
  // Load initial data
  this.cache = await loadCache(config.cachePath);
  
  // Register event listeners
  await this.setupEventListeners(subsystem);
})
```

### Error Handling

If the init callback throws an error or returns a rejected Promise, the facet addition fails:

```javascript
// In FacetManager.add()
try {
  if (opts.init && typeof facet.init === 'function') {
    await facet.init(opts.ctx, opts.api, this.#subsystem);
    // ↑ If this throws, the catch block handles it
  }
} catch (err) {
  // Local rollback for this facet
  try { 
    facet?.dispose?.(this.#subsystem); 
  } catch { /* best-effort disposal */ }
  delete this.#facets[kind];
  throw err;  // ← Error is rethrown
}
```

**Important:** If initialization fails, the facet is automatically disposed and removed from FacetManager. If the facet was added within a transaction, the entire transaction is rolled back.

## Common Use Cases

### Use Case: Database Connection

Initialize a database connection when the facet is initialized:

```javascript
return new Facet('database', { attach: true, source: import.meta.url })
  .add({
    query(sql) {
      return this.connection.query(sql);
    }
  })
  .onInit(async ({ ctx }) => {
    const config = ctx.config?.database || {};
    this.connection = await createConnection({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password
    });
  });
```

### Use Case: Accessing Dependencies

Access other facets that have been initialized before this one:

```javascript
return new Facet('processor', { 
  attach: true, 
  required: ['queue', 'router'],
  source: import.meta.url 
})
  .add({
    process(message) {
      // Process message...
    }
  })
  .onInit(async ({ api, subsystem }) => {
    // Access required dependencies
    const queueFacet = api.__facets.find('queue');
    const routerFacet = api.__facets.find('router');
    
    // Set up integration
    this.queue = queueFacet;
    this.router = routerFacet;
    
    // Start processing loop
    this.startProcessing();
  });
```

### Use Case: Optional Feature Integration

Check for optional facets and integrate with them if available:

```javascript
return new Facet('custom', { attach: true, source: import.meta.url })
  .add({
    handleEvent(event) {
      // Handle event...
    }
  })
  .onInit(async ({ subsystem }) => {
    // Check for optional statistics facet
    const statisticsFacet = subsystem.find('statistics');
    if (statisticsFacet) {
      // Integrate with statistics if available
      this.statistics = statisticsFacet;
      this.trackMetrics = true;
    }
    
    // Check for optional cache facet
    const cacheFacet = subsystem.find('cache');
    if (cacheFacet) {
      this.cache = cacheFacet;
      this.useCache = true;
    }
  });
```

### Use Case: Configuration-Based Setup

Use configuration to set up the facet:

```javascript
return new Facet('cache', { attach: true, source: import.meta.url })
  .add({
    get(key) {
      return this.store.get(key);
    },
    set(key, value) {
      return this.store.set(key, value);
    }
  })
  .onInit(async ({ ctx }) => {
    const config = ctx.config?.cache || {};
    
    // Create cache store based on config
    if (config.type === 'memory') {
      this.store = new MemoryStore(config.maxSize);
    } else if (config.type === 'redis') {
      this.store = await createRedisStore(config.redis);
    } else {
      this.store = new DefaultStore();
    }
    
    // Set TTL if configured
    if (config.ttl) {
      this.ttl = config.ttl;
    }
  });
```

### Use Case: Event Listener Registration

Register event listeners during initialization:

```javascript
return new Facet('monitor', { attach: true, source: import.meta.url })
  .add({
    getMetrics() {
      return this.metrics;
    }
  })
  .onInit(async ({ subsystem }) => {
    // Register event listeners
    const listenersFacet = subsystem.find('listeners');
    if (listenersFacet) {
      listenersFacet.on('message:processed', (message) => {
        this.metrics.processed++;
      });
      
      listenersFacet.on('message:error', (error) => {
        this.metrics.errors++;
      });
    }
  });
```

## Best Practices

1. **Extract configuration early**: Get configuration from `ctx.config` at the start of the callback:

   ```javascript
   .onInit(async ({ ctx }) => {
     const config = ctx.config?.myFacet || {};
     // Use config...
   })
   ```

2. **Handle optional dependencies gracefully**: Check for optional facets before using them:

   ```javascript
   .onInit(async ({ subsystem }) => {
     const optionalFacet = subsystem.find('optional');
     if (optionalFacet) {
       // Use optional facet
     }
   })
   ```

3. **Store initialization state on the facet**: Use the `facet` parameter to store state:

   ```javascript
   .onInit(async ({ facet }) => {
     facet._initialized = true;
     facet._initTime = Date.now();
   })
   ```

4. **Use async/await for async operations**: Make the callback async if you need to await operations:

   ```javascript
   .onInit(async ({ ctx }) => {
     this.connection = await createConnection(ctx.config?.database);
   })
   ```

5. **Don't mutate the facet after initialization**: The facet is frozen after initialization, so don't try to add properties or methods:

   ```javascript
   // ❌ Don't do this
   .onInit(async ({ facet }) => {
     facet.newMethod = () => {};  // Will fail - facet is frozen
   })
   
   // ✅ Do this instead
   .onInit(async ({ facet }) => {
     facet._state = {};  // Store state, not methods
   })
   ```

6. **Handle errors appropriately**: Let errors propagate - they will be caught by FacetManager:

   ```javascript
   .onInit(async ({ ctx }) => {
     const config = ctx.config?.database || {};
     if (!config.host) {
       throw new Error('Database host is required');  // Will be caught by FacetManager
     }
     this.connection = await createConnection(config);
   })
   ```

## Common Patterns

### Pattern: Lazy Initialization

Store initialization parameters and initialize lazily:

```javascript
return new Facet('lazy', { attach: true, source: import.meta.url })
  .add({
    async getResource() {
      if (!this._resource) {
        await this._initialize();
      }
      return this._resource;
    }
  })
  .onInit(async ({ ctx }) => {
    // Store config for later
    this._config = ctx.config?.lazy || {};
  });
```

### Pattern: Dependency Injection

Inject dependencies during initialization:

```javascript
return new Facet('service', { 
  attach: true, 
  required: ['database', 'cache'],
  source: import.meta.url 
})
  .add({
    async process(data) {
      // Use injected dependencies
      await this.db.save(data);
      await this.cache.set(data.id, data);
    }
  })
  .onInit(async ({ api }) => {
    // Inject dependencies
    this.db = api.__facets.find('database');
    this.cache = api.__facets.find('cache');
  });
```

### Pattern: Conditional Setup

Set up the facet differently based on configuration:

```javascript
.onInit(async ({ ctx }) => {
  const config = ctx.config?.feature || {};
  
  if (config.mode === 'production') {
    this.setupProduction();
  } else if (config.mode === 'development') {
    this.setupDevelopment();
  } else {
    this.setupDefault();
  }
})
```

## Error Handling

### Initialization Errors

If the init callback throws an error, the facet addition fails and the facet is rolled back:

```javascript
.onInit(async ({ ctx }) => {
  const config = ctx.config?.database || {};
  
  if (!config.host) {
    throw new Error('Database host is required');
  }
  
  try {
    this.connection = await createConnection(config);
  } catch (error) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
})
```

**Error Flow:**
1. Init callback throws error
2. `facet.init()` propagates the error
3. `FacetManager.add()` catches the error
4. Facet is disposed (best-effort)
5. Facet is removed from FacetManager
6. Error is rethrown
7. If in a transaction, the entire transaction is rolled back

### Best-Effort Disposal

If initialization fails, FacetManager attempts to dispose the facet:

```javascript
// In FacetManager.add()
catch (err) {
  // Local rollback for this facet
  try { 
    facet?.dispose?.(this.#subsystem); 
  } catch { 
    /* best-effort disposal - errors ignored */ 
  }
  delete this.#facets[kind];
  throw err;
}
```

## Integration with Facet Lifecycle

The init callback is part of the facet lifecycle:

1. **Facet Creation**: Facet is created in hook function
2. **Callback Registration**: `onInit()` is called to register callback
3. **Facet Addition**: Facet is added to FacetManager
4. **Initialization**: `facet.init()` is called (if `opts.init: true`)
5. **Callback Invocation**: `onInit` callback is invoked
6. **Attachment**: Facet is attached to subsystem (if `attach: true`)
7. **Freezing**: Facet is frozen (cannot be mutated)

**Lifecycle Diagram:**
```
Hook Function
    ↓
Facet Creation
    ↓
onInit(callback) ← Register callback
    ↓
FacetManager.add(facet, { init: true })
    ↓
facet.init(ctx, api, subsystem)
    ↓
onInit callback invoked ← Your callback runs here
    ↓
Facet attached (if attach: true)
    ↓
Facet frozen
```

## See Also

- [Facets Documentation](./FACETS.md) - Learn about the Facet class and lifecycle callbacks
- [Facet Manager](./FACET-MANAGER.md) - Understand how FacetManager calls the init callback
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Complete guide to the `ctx` parameter
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - Complete guide to the `api` parameter
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Complete guide to the `subsystem` parameter
- [Hooks Documentation](./HOOKS.md) - Learn how hooks create facets with init callbacks

