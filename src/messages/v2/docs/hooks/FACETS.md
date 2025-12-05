# Facets

## Overview

A **Facet** is a composable unit of functionality that extends a subsystem's capabilities. Facets are created by hooks and provide a standardized way to add features like routing, queuing, scheduling, and more to subsystems.

Facets encapsulate:
- **Functionality**: Methods and properties that extend subsystem behavior
- **Metadata**: Information about dependencies, attachment, and source
- **Lifecycle**: Initialization and disposal hooks for resource management

## Creating a Facet

Facets are created by hooks using the `Facet` class constructor:

```javascript
import { Facet } from '../../models/facet-manager/facet.mycelia.js';

return new Facet('queue', { 
  attach: true, 
  source: import.meta.url 
})
.add({
  // Methods and properties go here
});
```

## Constructor Parameters

### Required Parameters

#### `kind` (string, required)
The unique identifier for this facet type. Must be a non-empty string.

**Examples:**
- `'router'` - Routing functionality
- `'queue'` - Message queuing
- `'scheduler'` - Message scheduling
- `'statistics'` - Metrics collection

**Important:** The `kind` must match the hook's `kind` property. This is validated during subsystem build.

### Optional Parameters

All optional parameters are provided as an options object:

```javascript
new Facet(kind, {
  attach: false,        // Whether to attach to subsystem
  required: [],         // Array of dependency facet kinds
  source: undefined,    // Source file location
  overwrite: false,     // Whether this facet can overwrite existing ones
  contract: null        // Contract name (string) for validation
})
```

#### `attach` (boolean, default: `false`)
Whether this facet should be automatically attached to the subsystem instance after initialization. When `true`, the facet becomes accessible via `subsystem.find(kind)` or directly as `subsystem[kind]`.

**Example:**
```javascript
new Facet('router', { attach: true })
// After build, accessible as: subsystem.find('router') or subsystem.router
```

#### `required` (Array<string>, default: `[]`)
An array of facet kinds that this facet depends on. The build system ensures these dependencies are initialized before this facet.

**Example:**
```javascript
new Facet('scheduler', { 
  required: ['queue', 'processor', 'statistics'] 
})
// Ensures queue, processor, and statistics facets exist before scheduler
```

#### `source` (string, default: `undefined`)
The source file location where this facet is defined. Typically set to `import.meta.url` for debugging and error reporting.

**Example:**
```javascript
new Facet('queue', { source: import.meta.url })
```

#### `overwrite` (boolean, default: `false`)
Whether this facet is allowed to overwrite an existing facet of the same kind. When `false`, duplicate facets will cause a build error.

**Example:**
```javascript
new Facet('custom', { overwrite: true })
// Allows this facet to replace an existing 'custom' facet
```

#### `contract` (string, default: `null`)
The contract name (string) that this facet should satisfy. Contracts define required methods and properties that facets must implement. The contract name is used to look up the contract from the registry during validation.

**Example:**
```javascript
new Facet('router', { contract: 'router' })
// Specifies that this facet should satisfy the 'router' contract
```

**Note:** The contract name is a string identifier (e.g., `'router'`, `'queue'`), not a contract object. The actual contract is looked up from the registry when needed. See [Facet Contracts](../FACET-CONTRACT.md) for more information.

## The `add()` Method

### Why `add()` is Required

The `add()` method is **mandatory** and must be called to attach functionality to the facet. Without calling `add()`, the facet will be empty and provide no functionality.

### How `add()` Works

The `add()` method accepts an object containing methods and properties that will be attached to the facet instance. It uses `Object.getOwnPropertyDescriptors()` to properly copy property descriptors, including getters, setters, and other property attributes:

```javascript
return new Facet('queue', { attach: true, source: import.meta.url })
  .add({
    getQueueStatus() {
      return queueManager.getStatus();
    },
    
    clearQueue() {
      queueManager.clear();
    },
    
    // Regular value property
    queue,  // Direct property access
    
    // Private/internal property
    _queueManager: queueManager,
    
    // Getter property (also supported)
    get capacity() {
      return queueManager.getCapacity();
    }
  });
```

**Property Handling:**
- Regular value properties are copied with their values
- Getters and setters are properly preserved
- Property descriptors (enumerable, writable, configurable) are maintained
- Properties that already exist on the facet instance are skipped
- Non-configurable properties from the prototype chain are skipped

### Important Rules

1. **Must be called before initialization**: `add()` cannot be called after the facet has been initialized (`init()` has been called).

2. **Returns the facet**: `add()` returns the facet instance, enabling method chaining.

3. **Property descriptor copying**: Properties are copied using `Object.getOwnPropertyDescriptors()` and `Object.defineProperty()`, which properly handles:
   - Regular value properties
   - Getters and setters
   - Property descriptors (enumerable, writable, configurable)
   - Skips non-configurable properties from the prototype chain

4. **No mutation after init**: Once initialized, the facet is frozen (`Object.freeze()`) and cannot be modified.

### Example: Complete Facet Creation

```javascript
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';

export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],
  attach: true,
  source: import.meta.url,
  contract: 'queue',
  fn: (ctx, api, subsystem) => {
    // Extract configuration using ctx.config.queue
    const config = ctx.config?.queue || {};
    
    // Create queue manager with configuration
    const queueManager = new SubsystemQueueManager({
      capacity: config.capacity || 1000,
      policy: config.policy || 'drop-oldest',
      debug: config.debug !== undefined ? config.debug : (ctx.debug || false)
    });
    
    const queue = queueManager.getQueue();
    
    return new Facet('queue', { 
      attach: true, 
      source: import.meta.url,
      contract: 'queue'
    })
    .add({
      getQueueStatus(additionalState = {}) {
        return queueManager.getStatus(additionalState);
      },
      
      clearQueue() {
        queueManager.clear();
      },
      
      selectNextMessage() {
        return queueManager.dequeue();
      },
      
      hasMessagesToProcess() {
        return !queueManager.isEmpty();
      },
      
      queue,
      _queueManager: queueManager
    });
  }
});
```

## Context Object

The context object (`ctx`) is a crucial part of facet initialization. It provides access to system-level services and configuration data that facets need to function properly.

### Overview

The context object contains:
- **`ms`**: Reference to the MessageSystem instance
- **`config`**: Configuration object keyed by facet kind (e.g., `ctx.config.queue`, `ctx.config.router`)
- **`debug`**: Boolean flag for debug logging

### Quick Reference

**Extracting Configuration:**
```javascript
// In hook functions
fn: (ctx, api, subsystem) => {
  const config = ctx.config?.queue || {};
  // Use config...
}

// In lifecycle callbacks
.onInit(({ ctx }) => {
  const config = ctx.config?.database || {};
  // Use config...
})
```

**Debug Flag Extraction:**
```javascript
const config = ctx.config?.router || {};
const debug = config.debug !== undefined ? config.debug : (ctx.debug || false);
```

For complete documentation on the context object, including detailed examples, configuration patterns, and best practices, see [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md).

## Lifecycle Callbacks

Facets support two lifecycle callbacks that allow you to perform setup and cleanup operations.

### `onInit(callback)`

Registers a callback that is invoked when the facet is initialized. This is called automatically by the build system after all dependencies are resolved.

**Signature:**
```javascript
facet.onInit(({ ctx, api, subsystem, facet }) => {
  // Initialization logic
})
```

**Parameters:**
- `ctx` - The resolved context object (see [Context Object](#context-object) section above)
  - `ctx.ms` - MessageSystem instance
  - `ctx.config` - Configuration object keyed by facet kind
  - `ctx.debug` - Debug flag
  - See [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) for complete details
- `api` - The subsystem API object containing:
  - `api.name` - Subsystem name
  - `api.__facets` - Reference to the FacetManager
  - See [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) for complete details
- `subsystem` - The subsystem instance (BaseSubsystem)
  - `subsystem.find(kind)` - Method to find facets by kind
  - See [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) for complete details
- `facet` - The facet instance itself

**When it's called:**
- After all dependencies are initialized
- Before the facet is attached to the subsystem (if `attach: true`)
- Only once per facet instance

**See Also:** [Facet Init Callback](./FACET-INIT-CALLBACK.md) for complete documentation on the init callback interface, usage patterns, and best practices.

**Example:**
```javascript
return new Facet('database', { attach: true, source: import.meta.url })
  .add({
    query(sql) {
      return this.connection.query(sql);
    }
  })
  .onInit(async ({ ctx, subsystem }) => {
    // Extract configuration using ctx.config.database
    const config = ctx.config?.database || {};
    
    // Establish database connection during initialization
    this.connection = await createConnection({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'mydb'
    });
    
    console.log(`Database facet initialized for ${subsystem.name}`);
  });
```

**Important:**
- Must be called **before** `init()` is invoked
- The callback can be `async`
- If initialization fails, the facet will be rolled back

### `onDispose(callback)`

Registers a callback that is invoked when the facet is disposed. This is called automatically when the subsystem is disposed.

**Signature:**
```javascript
facet.onDispose((facet) => {
  // Cleanup logic
})
```

**Parameters:**
- `facet` - The facet instance being disposed

**When it's called:**
- When `subsystem.dispose()` is called
- After child subsystems are disposed
- In reverse order of initialization (dependencies disposed first)

**Example:**
```javascript
return new Facet('database', { attach: true, source: import.meta.url })
  .add({
    query(sql) {
      return this.connection.query(sql);
    }
  })
  .onInit(async ({ ctx }) => {
    // Extract configuration using ctx.config.database
    const config = ctx.config?.database || {};
    this.connection = await createConnection(config);
  })
  .onDispose(async (facet) => {
    // Close database connection during disposal
    if (facet.connection) {
      await facet.connection.close();
      console.log('Database connection closed');
    }
  });
```

**Important:**
- The callback can be `async`
- Best-effort cleanup: errors during disposal are logged but don't prevent other facets from disposing
- Should clean up any resources allocated in `onInit`

### Complete Lifecycle Example

```javascript
let fileHandle = null;

return new Facet('file-logger', { attach: true, source: import.meta.url })
  .add({
    log(message) {
      return fileHandle.write(message + '\n');
    }
  })
  .onInit(async ({ ctx, subsystem }) => {
    // Extract configuration using ctx.config['file-logger']
    const config = ctx.config?.['file-logger'] || {};
    
    // Open file during initialization
    const logPath = config.path || `./logs/${subsystem.name}.log`;
    fileHandle = await fs.open(logPath, 'a');
    console.log(`File logger initialized: ${logPath}`);
  })
  .onDispose(async (facet) => {
    // Close file during disposal
    if (fileHandle) {
      await fileHandle.close();
      console.log('File logger disposed');
    }
  });
```

## Dependency Management

Facets can declare dependencies on other facets. Dependencies are resolved automatically during the build process using topological sorting.

### Declaring Dependencies

Dependencies can be declared in two ways:

1. **In the constructor:**
```javascript
new Facet('scheduler', { 
  required: ['queue', 'processor', 'statistics'] 
})
```

2. **Dynamically using `addDependency()`:**
```javascript
const facet = new Facet('scheduler', { attach: true });
facet.addDependency('queue');
facet.addDependency('processor');
```

### Dependency Resolution

- Dependencies are resolved before the facet is initialized
- Circular dependencies are detected and cause build errors
- Missing dependencies cause build errors with clear messages

### Example: Dependent Facet

```javascript
export const useScheduler = createHook({
  kind: 'scheduler',
  required: ['queue', 'processor', 'statistics', 'queries'],
  attach: true,
  source: import.meta.url,
  contract: 'scheduler',
  fn: (ctx, api, subsystem) => {
    // These facets are guaranteed to exist and be initialized
    const queueFacet = api.__facets['queue'];
    const processorFacet = api.__facets['processor'];
    const statisticsFacet = api.__facets['statistics'];
    const queriesFacet = api.__facets['queries'];
    
    return new Facet('scheduler', { 
      attach: true, 
      source: import.meta.url,
      contract: 'scheduler'
    })
    .add({
      async process(timeSlice) {
        // Use queue and processor facets
        const pair = queueFacet.selectNextMessage();
        if (!pair) {
          return { processed: 0, remainingTime: timeSlice };
        }
        return await processorFacet.processMessage(pair);
      }
    });
  }
});
```

**Note:** In the hook function, you can access required dependencies via `api.__facets['dependency-name']` since they're guaranteed to exist. In facet methods (after build), use `subsystem.find('dependency-name')` to access other facets.

## Introspection Methods

Facets provide several methods for introspection:

### `getKind()`
Returns the facet's kind identifier.

```javascript
facet.getKind(); // 'queue'
```

### `shouldAttach()`
Returns whether this facet should be attached to the subsystem.

```javascript
facet.shouldAttach(); // true or false
```

### `shouldOverwrite()`
Returns whether this facet can overwrite existing facets.

```javascript
facet.shouldOverwrite(); // true or false
```

### `getDependencies()`
Returns a copy of the dependency array.

```javascript
facet.getDependencies(); // ['queue', 'processor']
```

### `hasDependency(dep)`
Checks if the facet depends on a specific facet kind.

```javascript
facet.hasDependency('queue'); // true or false
```

### `hasDependencies()`
Checks if the facet has any dependencies.

```javascript
facet.hasDependencies(); // true or false
```

### `getSource()`
Returns the source file location.

```javascript
facet.getSource(); // 'file:///path/to/hook.js'
```

### `getContract()`
Returns the contract name (string) or `null` if no contract is specified.

```javascript
facet.getContract(); // 'router' or null
```

## Best Practices

1. **Always call `add()`**: Every facet must call `add()` with at least an empty object to provide functionality.

2. **Use `source` for debugging**: Always set `source: import.meta.url` to improve error messages.

3. **Declare dependencies explicitly**: Use the `required` array to make dependencies clear and ensure correct initialization order.

4. **Clean up in `onDispose`**: Always clean up resources allocated in `onInit` to prevent memory leaks.

5. **Use `attach: true` for public APIs**: Set `attach: true` for facets that should be part of the subsystem's public API.

6. **Keep facets focused**: Each facet should provide a single, well-defined capability.

7. **Use private properties**: Prefix internal properties with `_` (e.g., `_queueManager`) to indicate they're not part of the public API.

## Common Patterns

### Pattern: Facet with Internal State

```javascript
let internalState = null;

return new Facet('cache', { attach: true, source: import.meta.url })
  .add({
    get(key) {
      return internalState?.get(key);
    },
    set(key, value) {
      return internalState?.set(key, value);
    }
  })
  .onInit(() => {
    internalState = new Map();
  })
  .onDispose(() => {
    internalState?.clear();
    internalState = null;
  });
```

### Pattern: Facet Wrapping External Library

```javascript
import { ExternalLibrary } from 'external-lib';

let libraryInstance = null;

return new Facet('external', { attach: true, source: import.meta.url })
  .add({
    doSomething() {
      return libraryInstance.doSomething();
    }
  })
  .onInit(({ ctx }) => {
    libraryInstance = new ExternalLibrary(ctx.config.external);
  })
  .onDispose(() => {
    libraryInstance?.cleanup();
    libraryInstance = null;
  });
```

### Pattern: Facet with Configuration

```javascript
return new Facet('configurable', { attach: true, source: import.meta.url })
  .add({
    getConfig() {
      return this._config;
    },
    updateConfig(newConfig) {
      this._config = { ...this._config, ...newConfig };
    }
  })
  .onInit(({ ctx }) => {
    // Extract configuration using ctx.config.configurable
    const config = ctx.config?.configurable || {};
    this._config = config;
  });
```

## See Also

- [Facet Init Callback](./FACET-INIT-CALLBACK.md) - Complete guide to the init callback interface, when it's called, and how to use it
- [Hooks Documentation](./HOOKS.md) - Complete guide to creating hooks that return facets
- [Facet Contracts](../FACET-CONTRACT.md) - Learn about facet contracts and validation
- [Facet Contract Registry](../FACET-CONTRACT-REGISTRY.md) - Learn about the contract registry system
- [Default Contracts](../DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Complete guide to the context object (`ctx`) used in hooks and facets
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - Complete guide to the `api` parameter for accessing facets
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Complete guide to the `subsystem` parameter and using `find()` in facet methods
- [Subsystem Build Utils](../SUBSYSTEM-BUILD-UTILS.md) - Understand how facets are built into subsystems
- [Facet Manager](./FACET-MANAGER.md) - Learn about facet lifecycle management

