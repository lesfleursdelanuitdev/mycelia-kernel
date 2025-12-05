# Standalone Plugin System

## Overview

The BaseSubsystem architecture can be used as a **standalone plugin system** without requiring a full MessageSystem. This makes it ideal for:

- **Plugin architectures**: Extensible systems where plugins add functionality
- **Modular applications**: Applications that need dependency injection and lifecycle management
- **Component systems**: Systems where components can be dynamically added/removed
- **Service containers**: Lightweight service containers with plugin support

**Key Benefits:**
- **No MessageSystem Required**: Can use an empty object `{}` for the message system
- **Ready-to-Use**: `StandalonePluginSystem` class handles all setup automatically
- **Customizable**: Override methods you don't need as no-ops (cleanest approach)
- **Full Plugin Architecture**: Hooks, facets, transactions, and builder all work standalone
- **Lifecycle Management**: Built-in build/dispose lifecycle
- **Dependency Injection**: Automatic dependency resolution and initialization

**Quick Start:**
```javascript
import { StandalonePluginSystem } from './index.js';
// Or: import { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';

const system = new StandalonePluginSystem('my-app', {
  config: { /* plugin configuration */ }
});

system.use(useDatabase).build();
const db = system.find('database');
```

**Important Requirement:**
- **useListeners Hook**: For standalone plugin systems, it's recommended to install the `useListeners` hook. Many plugins (like `useRouter`) require it as a dependency, and it provides event/listener functionality that plugins often need. `StandalonePluginSystem` automatically installs this for you.

## What is a Standalone Plugin System?

A standalone plugin system uses BaseSubsystem's hook and facet architecture without the message processing capabilities. It provides:

- **Plugin Registration**: Hooks act as plugins that extend functionality
- **Feature Modules**: Facets provide modular features
- **Dependency Management**: Automatic dependency resolution
- **Lifecycle Control**: Build and dispose lifecycle
- **Transaction Safety**: Atomic plugin installation

**Architecture:**
```
Standalone Plugin System
├─ BaseSubsystem (minimal)
│  ├─ Hooks (plugins)
│  ├─ Facets (features)
│  ├─ FacetManager (plugin registry)
│  └─ SubsystemBuilder (plugin installer)
└─ No MessageSystem required
```

## Minimal Setup

### Recommended: StandalonePluginSystem

The easiest way to create a standalone plugin system is to use the `StandalonePluginSystem` class. It automatically:
- Overrides message-specific methods as no-ops
- Installs the `useListeners` hook
- Handles all the setup for you

```javascript
import { StandalonePluginSystem } from './index.js';
// Or: import { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { useDatabase } from './plugins/use-database.mycelia.js';
import { useCache } from './plugins/use-cache.mycelia.js';

// Create standalone plugin system
const system = new StandalonePluginSystem('my-plugin-system', {
  config: {
    database: {
      host: 'localhost',
      port: 5432
    },
    cache: {
      maxSize: 1000
    }
  },
  debug: true
});

// Register plugins
system
  .use(useDatabase)
  .use(useCache)
  .build();

// Use plugins
const db = system.find('database');
const cache = system.find('cache');
```

**Benefits:**
- No need to manually override methods
- `useListeners` is automatically installed
- Clean, simple API
- All message-specific methods are already no-ops

### Alternative: BaseSubsystem with Manual Setup

If you prefer to use `BaseSubsystem` directly, you can create a minimal system:

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';

// Create standalone system with empty message system
const pluginSystem = new BaseSubsystem('my-plugin-system', {
  ms: {},  // Empty object - no MessageSystem needed
  config: {
    // Plugin-specific configuration
  },
  debug: true
});

// Install useListeners hook (recommended for standalone systems)
pluginSystem.use(useListeners);

// Build the system
await pluginSystem.build();
```

**Note:** The constructor currently requires `options.ms`, but you can pass an empty object `{}`. The system will work fine as long as your hooks and facets don't try to use MessageSystem features.

**Important:** For standalone plugin systems, it's recommended to install the `useListeners` hook. Some hooks (like `useRouter`) require `listeners` as a dependency, and `useListeners` provides event/listener functionality that many plugins may need.

### Custom Minimal BaseSubsystem

For a truly standalone system, you can create a custom class that overrides message-specific methods as no-ops:

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';

export class PluginSystem extends BaseSubsystem {
  constructor(name, options = {}) {
    // Pass empty object for message system
    super(name, { ...options, ms: options.ms || {} });
    
    // Install useListeners hook (recommended for standalone systems)
    this.use(useListeners);
  }

  // Override message processing methods as no-ops
  async accept(message, options = {}) {
    // No-op: not needed for standalone plugin system
  }

  async process(timeSlice) {
    // No-op: not needed for standalone plugin system
    return null;
  }
  
  // Override routing methods as no-ops
  registerRoute(pattern, handler, routeOptions = {}) {
    // No-op: not needed for standalone plugin system
    return false;
  }

  unregisterRoute(pattern) {
    // No-op: not needed for standalone plugin system
    return false;
  }

  pause() {
    // No-op: not needed for standalone plugin system
    return this;
  }

  resume() {
    // No-op: not needed for standalone plugin system
    return this;
  }
  
  // Keep all lifecycle methods: build(), dispose(), onInit(), onDispose()
  // Keep: find(), use()
  // Keep: Hierarchy methods (setParent, getParent, isRoot, getRoot, getNameString)
  // Keep: State getters (isBuilt, isPaused)
}
```

**Note:** The `useListeners` hook is installed in the constructor. This ensures it's available for any plugins that depend on it (like `useRouter`).

**Important:** Do NOT override lifecycle methods (`build()`, `dispose()`, `onInit()`, `onDispose()`) as no-ops. These are essential for plugin management.

## Creating Plugins (Hooks)

Plugins are created using hooks. Each hook creates a facet that provides functionality.

### Simple Plugin Example

```javascript
import { createHook } from './hooks/create-hook.mycelia.js';
import { Facet } from './models/facet-manager/facet.mycelia.js';

// Plugin: Database connection
export const useDatabase = createHook({
  kind: 'database',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.database || {};
    
    return new Facet('database', { attach: true, source: import.meta.url })
      .add({
        async query(sql) {
          // Database query logic
          return { rows: [] };
        },
        
        async close() {
          // Close connection
        }
      })
      .onInit(async ({ ctx }) => {
        // Initialize database connection
        const config = ctx.config?.database || {};
        this.connection = await createConnection(config);
      })
      .onDispose(async () => {
        // Close database connection
        if (this.connection) {
          await this.connection.close();
        }
      });
  }
});
```

### Plugin with Dependencies

```javascript
// Plugin: Cache (depends on database)
export const useCache = createHook({
  kind: 'cache',
  required: ['database'],  // Declare dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required dependency
    const databaseFacet = api.__facets['database'];
    
    return new Facet('cache', { 
      attach: true, 
      required: ['database'],
      source: import.meta.url 
    })
      .add({
        async get(key) {
          // Check cache, fallback to database
          const cached = this.store.get(key);
          if (cached) return cached;
          
          const data = await databaseFacet.query(`SELECT * FROM cache WHERE key = ?`, [key]);
          this.store.set(key, data);
          return data;
        },
        
        async set(key, value) {
          this.store.set(key, value);
          await databaseFacet.query(`INSERT INTO cache (key, value) VALUES (?, ?)`, [key, value]);
        }
      })
      .onInit(async ({ ctx }) => {
        const config = ctx.config?.cache || {};
        this.store = new Map();
        this.maxSize = config.maxSize || 1000;
      });
  }
});
```

## Using the Plugin System

### Registering Plugins

**Using StandalonePluginSystem (Recommended):**

```javascript
import { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { useDatabase } from './plugins/use-database.mycelia.js';
import { useCache } from './plugins/use-cache.mycelia.js';

// Create plugin system
// Note: useListeners is automatically installed
const system = new StandalonePluginSystem('my-app', {
  config: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'myapp'
    },
    cache: {
      maxSize: 2000
    }
  },
  debug: true
});

// Register plugins
system
  .use(useDatabase)
  .use(useCache)
  .onInit((api, ctx) => {
    console.log('Plugin system initialized');
  })
  .build();
```

**Using BaseSubsystem directly:**

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';
import { useDatabase } from './plugins/use-database.mycelia.js';
import { useCache } from './plugins/use-cache.mycelia.js';

const system = new BaseSubsystem('my-app', { ms: {} });

// Install useListeners first (if needed by other plugins)
system.use(useListeners);

// Then install other plugins
system
  .use(useDatabase)
  .use(useCache)
  .build();
```

### Accessing Plugins (Facets)

```javascript
// After build, access plugins via find()
const database = system.find('database');
const cache = system.find('cache');

// Use plugin functionality
const result = await database.query('SELECT * FROM users');
await cache.set('users', result);
const cached = await cache.get('users');
```

### Plugin Lifecycle

```javascript
// Build system (installs all plugins)
await system.build();

// Use plugins
const db = system.find('database');
await db.query('...');

// Dispose system (cleans up all plugins)
await system.dispose();
```

## Customizing BaseSubsystem

### Using StandalonePluginSystem (Recommended)

The easiest approach is to use `StandalonePluginSystem`, which already has all methods overridden as no-ops:

```javascript
import { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';

const system = new StandalonePluginSystem('my-app', {
  config: { /* ... */ }
});

// All message-specific methods are already no-ops
// useListeners is already installed
system.use(useDatabase).build();
```

### Creating Your Own Custom Class

If you need to extend `BaseSubsystem` with additional functionality, you can create your own class:

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';

export class MinimalPluginSystem extends BaseSubsystem {
  constructor(name, options = {}) {
    super(name, { ...options, ms: {} });
    
    // Install useListeners hook (recommended)
    this.use(useListeners);
  }

  // Override message flow methods as no-ops
  pause() {
    return this; // No-op
  }

  resume() {
    return this; // No-op
  }

  async accept(message, options = {}) {
    // No-op: not needed for standalone plugin system
  }

  async process(timeSlice) {
    // No-op: not needed for standalone plugin system
    return null;
  }
  
  // Override routing methods as no-ops
  registerRoute(pattern, handler, routeOptions = {}) {
    // No-op: not needed for standalone plugin system
    return false;
  }

  unregisterRoute(pattern) {
    // No-op: not needed for standalone plugin system
    return false;
  }
  
  // Keep all lifecycle methods: build(), dispose(), onInit(), onDispose()
  // Keep: find(), use()
  // Keep: Hierarchy methods (setParent, getParent, isRoot, getRoot, getNameString)
  // Keep: State getters (isBuilt, isPaused)
}
```

**Important:** Do NOT override lifecycle methods (`build()`, `dispose()`, `onInit()`, `onDispose()`) as no-ops. These are essential for plugin management.

### Alternative: Throw Errors (Less Recommended)

If you prefer to explicitly indicate that methods are not available, you can override them to throw errors:

```javascript
export class PluginSystem extends BaseSubsystem {
  constructor(name, options = {}) {
    super(name, { ...options, ms: {} });
  }

  // Override message methods to throw errors
  async accept(message, options = {}) {
    throw new Error('accept() not available in standalone plugin system');
  }

  async process(timeSlice) {
    throw new Error('process() not available in standalone plugin system');
  }

  registerRoute(pattern, handler, routeOptions = {}) {
    throw new Error('registerRoute() not available in standalone plugin system');
  }

  unregisterRoute(pattern) {
    throw new Error('unregisterRoute() not available in standalone plugin system');
  }
}
```

**Note:** No-op overrides are generally preferred as they're cleaner and don't break code that might call these methods.

## Plugin Architecture Patterns

### Pattern: Service Container

Use BaseSubsystem as a service container:

```javascript
// Service plugin
export const useService = createHook({
  kind: 'service',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('service', { attach: true, source: import.meta.url })
      .add({
        // Service methods
        async doWork() {
          // Service logic
        }
      });
  }
});

// Use as service container
const container = new PluginSystem('services', { ms: {} });
container.use(useService);
await container.build();

const service = container.find('service');
await service.doWork();
```

### Pattern: Feature Modules

Use facets as feature modules:

```javascript
// Feature: Authentication
export const useAuth = createHook({
  kind: 'auth',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('auth', { attach: true, source: import.meta.url })
      .add({
        async login(username, password) {
          // Authentication logic
        },
        
        async logout() {
          // Logout logic
        },
        
        isAuthenticated() {
          return this.session !== null;
        }
      })
      .onInit(async ({ ctx }) => {
        const config = ctx.config?.auth || {};
        this.session = null;
        this.secret = config.secret;
      });
  }
});

// Feature: Authorization
export const useAuthz = createHook({
  kind: 'authz',
  required: ['auth'],  // Depends on auth
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const authFacet = api.__facets['auth'];
    
    return new Facet('authz', { attach: true, source: import.meta.url })
      .add({
        async checkPermission(user, permission) {
          if (!authFacet.isAuthenticated()) {
            return false;
          }
          // Permission check logic
          return true;
        }
      });
  }
});
```

### Pattern: Plugin Registry

Create a plugin registry system:

```javascript
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';

class PluginRegistry extends BaseSubsystem {
  constructor(name, options = {}) {
    super(name, { ...options, ms: {} });
    this._plugins = new Map();
    
    // Install useListeners hook (recommended)
    this.use(useListeners);
  }

  // Register plugin by name
  registerPlugin(name, hook) {
    this._plugins.set(name, hook);
    return this.use(hook);
  }

  // Get plugin by name
  getPlugin(name) {
    return this.find(name);
  }

  // List all plugins
  listPlugins() {
    return Array.from(this._plugins.keys());
  }
}

// Usage
const registry = new PluginRegistry('plugins', { ms: {} });

registry
  .registerPlugin('database', useDatabase)
  .registerPlugin('cache', useCache)
  .build();

const db = registry.getPlugin('database');
```

### Pattern: Conditional Plugins

Load plugins conditionally:

```javascript
const system = new PluginSystem('app', { ms: {} });
// Note: useListeners is already installed in PluginSystem constructor

// Always load
system.use(useDatabase);

// Conditionally load
if (process.env.ENABLE_CACHE === 'true') {
  system.use(useCache);
}

if (process.env.ENABLE_AUTH === 'true') {
  system.use(useAuth);
  system.use(useAuthz);
}

await system.build();
```

### Pattern: Using Router in Standalone System

If you want to use routing in a standalone system, you'll need `useListeners`:

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';
import { useRouter } from './hooks/router/use-router.mycelia.js';
import { useStatistics } from './hooks/statistics/use-statistics.mycelia.js';

const system = new BaseSubsystem('app', { ms: {} });

// Install required dependencies for router
system
  .use(useListeners)    // Required by useRouter
  .use(useStatistics)  // Required by useRouter
  .use(useRouter)      // Requires listeners and statistics
  .build();

// Now you can use routing
system.registerRoute('user/{id}', async (message, iterator, params) => {
  return { userId: params.id };
});
```

## Configuration

### Plugin Configuration

Configure plugins via `config`:

```javascript
const system = new PluginSystem('app', {
  ms: {},
  config: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'user',
      password: 'pass'
    },
    cache: {
      maxSize: 1000,
      ttl: 3600
    },
    auth: {
      secret: 'my-secret-key',
      sessionTimeout: 3600
    }
  }
});
```

### Environment-Based Configuration

```javascript
const system = new PluginSystem('app', {
  ms: {},
  config: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'myapp'
    }
  },
  debug: process.env.DEBUG === 'true'
});
```

## Dependency Management

The plugin system automatically handles dependencies:

### Automatic Dependency Resolution

```javascript
// Plugin A (no dependencies)
export const useA = createHook({
  kind: 'a',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('a', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});

// Plugin B (depends on A)
export const useB = createHook({
  kind: 'b',
  required: ['a'],  // Declare dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const aFacet = api.__facets['a'];  // Available because of dependency
    
    return new Facet('b', { attach: true, source: import.meta.url })
      .add({
        doSomething() {
          // Use plugin A
          aFacet.someMethod();
        }
      });
  }
});

// Plugin C (depends on B, which depends on A)
export const useC = createHook({
  kind: 'c',
  required: ['b'],  // Only need to declare direct dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const bFacet = api.__facets['b'];
    // Plugin A is also available (transitive dependency)
    
    return new Facet('c', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});

// Register in any order - dependencies resolved automatically
const system = new PluginSystem('app', { ms: {} });
system
  .use(useC)  // Registered first, but initialized last
  .use(useB)  // Registered second, initialized second
  .use(useA)  // Registered last, but initialized first
  .build();

// Initialization order: A → B → C
```

## Transaction Safety

The plugin system uses transactions to ensure atomic installation:

### Atomic Plugin Installation

```javascript
const system = new PluginSystem('app', { ms: {} });

try {
  system
    .use(useDatabase)
    .use(useCache)  // Depends on database
    .use(useAuth)   // Depends on database
    .build();
  
  // All plugins installed successfully
} catch (error) {
  // If any plugin fails, all are rolled back
  console.error('Plugin installation failed:', error);
  // System is in clean state
}
```

### Transaction Benefits

- **All or Nothing**: Either all plugins install or none do
- **Automatic Rollback**: Failed installations are automatically cleaned up
- **Clean State**: System remains in a consistent state

## Lifecycle Management

### Build Lifecycle

```javascript
const system = new PluginSystem('app', { ms: {} });

// 1. Register plugins
system
  .use(useDatabase)
  .use(useCache);

// 2. Register lifecycle callbacks
system
  .onInit((api, ctx) => {
    console.log('System initialized');
    // Post-build setup
  })
  .onDispose(() => {
    console.log('System disposing');
    // Cleanup
  });

// 3. Build (installs all plugins)
await system.build();

// 4. Use plugins
const db = system.find('database');

// 5. Dispose (cleans up all plugins)
await system.dispose();
```

### Plugin Lifecycle

Each plugin (facet) has its own lifecycle:

```javascript
export const usePlugin = createHook({
  kind: 'plugin',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('plugin', { attach: true, source: import.meta.url })
      .add({
        // Plugin methods
      })
      .onInit(async ({ ctx, api, subsystem, facet }) => {
        // Called during build
        // Initialize plugin resources
        this.initialized = true;
      })
      .onDispose(async () => {
        // Called during dispose
        // Clean up plugin resources
        this.initialized = false;
      });
  }
});
```

## Complete Example

### Full Standalone Plugin System

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from './hooks/listeners/use-listeners.mycelia.js';
import { createHook } from './hooks/create-hook.mycelia.js';
import { Facet } from './models/facet-manager/facet.mycelia.js';

// Using StandalonePluginSystem (Recommended)
import { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';

// Or extend it if you need custom functionality
class PluginSystem extends StandalonePluginSystem {
  // All message-specific methods are already no-ops
  // useListeners is already installed
  // Add any custom methods here if needed
}

// Plugin: Logger
const useLogger = createHook({
  kind: 'logger',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.logger || {};
    
    return new Facet('logger', { attach: true, source: import.meta.url })
      .add({
        log(level, message) {
          console.log(`[${level}] ${message}`);
        },
        
        error(message) {
          this.log('ERROR', message);
        },
        
        info(message) {
          this.log('INFO', message);
        }
      })
      .onInit(async ({ ctx }) => {
        const config = ctx.config?.logger || {};
        this.level = config.level || 'INFO';
      });
  }
});

// Plugin: Storage (depends on logger)
const useStorage = createHook({
  kind: 'storage',
  required: ['logger'],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const loggerFacet = api.__facets['logger'];
    
    return new Facet('storage', { attach: true, source: import.meta.url })
      .add({
        async save(key, value) {
          loggerFacet.info(`Saving ${key}`);
          // Save logic
        },
        
        async load(key) {
          loggerFacet.info(`Loading ${key}`);
          // Load logic
          return null;
        }
      });
  }
});

// Create and use plugin system
// Note: PluginSystem constructor automatically installs useListeners
const system = new PluginSystem('my-app', {
  config: {
    logger: {
      level: 'DEBUG'
    }
  },
  debug: true
});

system
  .use(useLogger)
  .use(useStorage)
  .onInit((api, ctx) => {
    console.log('Plugin system ready');
  })
  .build();

// Use plugins
const logger = system.find('logger');
const storage = system.find('storage');

logger.info('Application started');
await storage.save('config', { setting: 'value' });

// Cleanup
await system.dispose();
```

## Best Practices

1. **Install useListeners Hook**: For standalone plugin systems, install `useListeners` hook. Many plugins (like `useRouter`) require it as a dependency, and it provides event/listener functionality that plugins often need.

2. **Use Empty Object for MessageSystem**: Pass `{}` for `ms` when not needed.

3. **Override Unused Methods as No-Ops**: Override methods you don't need (accept, process, routing, pause, resume) as no-ops. This is the cleanest and recommended approach. Do NOT override lifecycle methods (`build()`, `dispose()`, `onInit()`, `onDispose()`) as no-ops.

4. **Declare Dependencies**: Always declare dependencies in `required` array for proper initialization order.

5. **Use Configuration**: Pass plugin configuration via `config` object.

6. **Handle Errors**: Wrap `build()` in try-catch to handle plugin installation failures.

7. **Clean Up Resources**: Use `onDispose` callbacks to clean up plugin resources.

8. **Use Transactions**: The system automatically uses transactions - trust the atomicity.

9. **Test Plugins Independently**: Test plugins in isolation before integrating.

10. **Install useListeners Early**: If using plugins that depend on `listeners`, install `useListeners` before those plugins.

## Common Patterns

### Pattern: Plugin Loader

```javascript
class PluginLoader {
  constructor() {
    this.system = new PluginSystem('loader', { ms: {} });
    this.plugins = new Map();
  }

  async loadPlugin(name, hook) {
    this.plugins.set(name, hook);
    this.system.use(hook);
  }

  async build() {
    await this.system.build();
  }

  getPlugin(name) {
    return this.system.find(name);
  }

  async unload() {
    await this.system.dispose();
  }
}

// Usage
const loader = new PluginLoader();
await loader.loadPlugin('database', useDatabase);
await loader.loadPlugin('cache', useCache);
await loader.build();

const db = loader.getPlugin('database');
```

### Pattern: Feature Flags

```javascript
const system = new PluginSystem('app', { ms: {} });

// Load plugins based on feature flags
if (features.database) {
  system.use(useDatabase);
}

if (features.cache) {
  system.use(useCache);
}

if (features.auth) {
  system.use(useAuth);
}

await system.build();
```

### Pattern: Plugin Discovery

```javascript
async function discoverPlugins(pluginDir) {
  const plugins = [];
  // Discover plugin files
  // ...
  return plugins;
}

const system = new PluginSystem('app', { ms: {} });

// Load discovered plugins
const plugins = await discoverPlugins('./plugins');
for (const plugin of plugins) {
  system.use(plugin);
}

await system.build();
```

## See Also

- [Base Subsystem](./BASE-SUBSYSTEM.md) - Complete guide to BaseSubsystem
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about creating plugins (hooks)
- [Facets Documentation](./hooks/FACETS.md) - Learn about plugin features (facets)
- [Facet Manager](./hooks/FACET-MANAGER.md) - Learn about plugin registry
- [Facet Manager Transaction](./hooks/FACET-MANAGER-TRANSACTION.md) - Learn about atomic plugin installation
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Learn about the plugin installer
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Learn about the build process

