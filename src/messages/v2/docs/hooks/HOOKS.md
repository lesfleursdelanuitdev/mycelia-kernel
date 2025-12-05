# Hooks

## Overview

A **Hook** is a function that creates and returns a **Facet**. Hooks are the primary mechanism for extending subsystem functionality in the Mycelia Kernel. They provide a standardized way to add features like routing, queuing, scheduling, and more to subsystems.

Hooks encapsulate:
- **Metadata**: Information about the hook's kind, dependencies, and behavior
- **Factory Logic**: Code that creates and configures a facet
- **Integration**: How the hook integrates with other facets and the subsystem

## What is a Hook?

A hook is a function with attached metadata that, when called, returns a Facet instance. Hooks are executed during subsystem build to create facets that extend the subsystem's capabilities.

### Hook Structure

A hook has the following structure:

```javascript
function hook(ctx, api, subsystem) {
  // Hook logic that creates and returns a Facet
  return new Facet('kind', { /* options */ })
    .add({ /* methods */ });
}

// Hook metadata (attached to the function)
hook.kind = 'kind';              // Facet kind identifier
hook.overwrite = false;          // Whether hook can overwrite existing hooks
hook.required = [];              // Array of required facet dependencies
hook.attach = false;              // Whether facet should be attached to subsystem
hook.source = 'file://...';      // Source file location
```

### Hook Function Signature

```javascript
function hook(ctx, api, subsystem) => Facet
```

**Parameters:**
- `ctx` - Context object containing system services and configuration. See [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md)
- `api` - Subsystem API object with `name` and `__facets`. See [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md)
- `subsystem` - Subsystem instance with `find()` method. See [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md)

**Returns:**
- `Facet` - A Facet instance that extends the subsystem's capabilities

## Creating Hooks with `createHook`

The `createHook` factory function is the recommended way to create hooks. It ensures consistent metadata structure and validation.

### `createHook` Function

**Signature:**
```javascript
createHook({ kind, overwrite, required, attach, source, fn }) => Hook
```

**Parameters:**
- `kind` (string, required) - The facet kind identifier (e.g., 'queue', 'router', 'scheduler')
- `overwrite` (boolean, default: `false`) - Whether this hook can overwrite an existing hook of the same kind
- `required` (Array<string>, default: `[]`) - Array of facet kinds this hook depends on
- `attach` (boolean, default: `false`) - Whether the resulting facet should be attached to the subsystem
- `source` (string, required) - File location/URL where the hook is defined (typically `import.meta.url`)
- `contract` (string, default: `null`) - Contract name (string) for the facet this hook creates
- `fn` (Function, required) - Hook function: `(ctx, api, subsystem) => Facet`

**Returns:**
- A hook function with attached metadata properties

### Basic Hook Example

```javascript
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';

export const useCustom = createHook({
  kind: 'custom',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Extract configuration
    const config = ctx.config?.custom || {};
    
    // Create custom functionality
    const customService = new CustomService(config);
    
    // Return a Facet
    return new Facet('custom', { 
      attach: true, 
      source: import.meta.url 
    })
    .add({
      doSomething() {
        return customService.doSomething();
      },
      
      getStatus() {
        return customService.getStatus();
      }
    });
  }
});
```

## Hook Metadata

Hooks have metadata attached to them that describes their behavior and requirements:

### `kind` (string, required)

The unique identifier for the facet kind this hook creates. Must match the `kind` of the Facet it returns.

**Example:**
```javascript
createHook({
  kind: 'queue',  // Facet kind
  // ...
})
```

**Important:** The `kind` must be unique within a subsystem (unless `overwrite: true`). It must also match the `kind` passed to the `Facet` constructor.

### `overwrite` (boolean, default: `false`)

Whether this hook is allowed to overwrite an existing hook of the same kind. When `false`, duplicate hooks will cause a build error.

**Example:**
```javascript
createHook({
  kind: 'custom',
  overwrite: true,  // Allows overwriting existing 'custom' hook
  // ...
})
```

**Use cases:**
- Custom implementations that replace default hooks
- Plugin systems where hooks can be replaced
- Testing scenarios where you need to mock hooks

### `required` (Array<string>, default: `[]`)

An array of facet kinds that this hook depends on. The build system ensures these dependencies are initialized before this hook runs.

**Example:**
```javascript
createHook({
  kind: 'scheduler',
  required: ['queue', 'processor', 'statistics'],  // Dependencies
  // ...
})
```

**Benefits:**
- Ensures dependencies are available when hook executes
- Enables dependency resolution and topological sorting
- Provides clear documentation of hook dependencies

**Important:** Dependencies listed in `required` are guaranteed to exist when your hook function executes. You can safely access them via `api.__facets['dependency-name']`.

### `attach` (boolean, default: `false`)

Whether the resulting facet should be automatically attached to the subsystem. When `true`, the facet becomes accessible via `subsystem.find(kind)` or `subsystem[kind]`.

**Example:**
```javascript
createHook({
  kind: 'router',
  attach: true,  // Facet will be attached to subsystem
  // ...
})
```

**Note:** This should match the `attach` option passed to the `Facet` constructor for consistency.

### `source` (string, required)

The file location/URL where the hook is defined. Typically set to `import.meta.url` for debugging and error reporting.

**Example:**
```javascript
createHook({
  kind: 'queue',
  source: import.meta.url,  // Current file URL
  // ...
})
```

**Benefits:**
- Improves error messages with source file information
- Helps with debugging hook conflicts
- Enables better tooling and analysis

### `contract` (string, default: `null`)

The contract name (string) that the facet created by this hook should satisfy. Contracts define required methods and properties that facets must implement. The contract name is used to look up the contract from the registry during validation.

**Example:**
```javascript
createHook({
  kind: 'router',
  contract: 'router',  // Contract name as string
  // ...
})
```

**Note:** The contract name is a string identifier (e.g., `'router'`, `'queue'`), not a contract object. The actual contract is looked up from the registry when needed. The contract name should match the facet's `kind` in most cases. See [Facet Contracts](../FACET-CONTRACT.md) for more information.

## Available Hooks

The following hooks are available in the v2 codebase. All hooks are exported from the main `index.js` file.

### Core Processing Hooks

#### `useMessageProcessor`
- **Kind**: `'processor'`
- **Dependencies**: `['router', 'statistics', 'queue']`
- **Attach**: `true`
- **Contract**: `'processor'`
- **Purpose**: Provides core message processing functionality. Handles message acceptance, processing, and routing. This is the main processing hook for asynchronous subsystems.

#### `useSynchronous`
- **Kind**: `'synchronous'`
- **Dependencies**: `['processor', 'statistics', 'listeners', 'queries']`
- **Attach**: `true`
- **Contract**: `'processor'`
- **Purpose**: Enables immediate (synchronous) message processing. Skips queue and scheduler, processing messages immediately. Used for kernel-like subsystems that need instant processing.

### Routing Hooks

#### `useRouter`
- **Kind**: `'router'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `'router'`
- **Purpose**: Provides route registration and matching functionality. Supports pattern-based routing with parameters and wildcards.

#### `useMessageSystemRouter`
- **Kind**: `'messageSystemRouter'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `null`
- **Purpose**: Provides cross-subsystem message routing functionality. Routes messages to appropriate subsystems based on message paths. Requires `ctx.ms` and `ctx.subsystems`.

### Queue and Scheduling Hooks

#### `useQueue`
- **Kind**: `'queue'`
- **Dependencies**: `['statistics']`
- **Attach**: `true`
- **Contract**: `'queue'`
- **Purpose**: Provides message queuing functionality. Manages message queues with configurable capacity and policies.

#### `useScheduler`
- **Kind**: `'scheduler'`
- **Dependencies**: `['queue', 'processor', 'statistics', 'queries']`
- **Attach**: `true`
- **Contract**: `'scheduler'`
- **Purpose**: Provides message scheduling functionality. Manages processing lifecycle and time-sliced message processing.

#### `useGlobalScheduler`
- **Kind**: `'globalScheduler'`
- **Dependencies**: `[]`
- **Attach**: `false`
- **Contract**: `null`
- **Purpose**: Provides global scheduling functionality. Manages time allocation between subsystems using configurable scheduling strategies. Requires `ctx.ms`.

### Statistics and Monitoring Hooks

#### `useStatistics`
- **Kind**: `'statistics'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `null`
- **Purpose**: Provides statistics tracking functionality. Tracks message processing metrics, errors, and performance data.

#### `useListeners`
- **Kind**: `'listeners'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `'listeners'`
- **Purpose**: Provides event listener management functionality. Allows subsystems to register and manage event listeners.

### Hierarchy and Registry Hooks

#### `useHierarchy`
- **Kind**: `'hierarchy'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `'hierarchy'`
- **Purpose**: Provides child subsystem management capabilities. Allows subsystems to register, unregister, and query child subsystems in a hierarchical structure.

#### `useMessageSystemRegistry`
- **Kind**: `'messageSystemRegistry'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `null`
- **Purpose**: Provides subsystem registry functionality. Manages subsystem instances by name with special handling for kernel subsystem.

### Message and Query Hooks

#### `useMessages`
- **Kind**: `'messages'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `null`
- **Purpose**: Provides message creation functionality. Exposes convenient methods for creating different types of messages using MessageFactory.

#### `useQueries`
- **Kind**: `'queries'`
- **Dependencies**: `[]`
- **Attach**: `true`
- **Contract**: `null`
- **Purpose**: Provides query handler functionality. Handles query message processing and route registration for query-based communication.

### Default Hook Sets

The codebase provides two factory functions for creating default hook sets:

#### `createCanonicalDefaultHooks()`
Creates a default hook set for general-purpose asynchronous subsystems:
- `useHierarchy`
- `useRouter`
- `useMessageProcessor`
- `useQueue`
- `useScheduler`
- `useListeners`
- `useStatistics`
- `useQueries`

#### `createSynchronousDefaultHooks()`
Creates a default hook set for kernel-like synchronous subsystems:
- `useListeners`
- `useStatistics`
- `useQueries`
- `useRouter`
- `useQueue`
- `useMessageProcessor`
- `useSynchronous`
- `useHierarchy`

**Note:** The actual execution order is determined by dependency resolution (topological sort) at build time, not the order in the array.

### Using Hooks

All hooks can be imported from the main index:

```javascript
import {
  useRouter,
  useQueue,
  useScheduler,
  useMessageProcessor,
  useStatistics,
  useListeners,
  useHierarchy,
  useQueries,
  useSynchronous,
  useGlobalScheduler,
  useMessageSystemRouter,
  useMessageSystemRegistry,
  useMessages,
  createCanonicalDefaultHooks,
  createSynchronousDefaultHooks
} from './index.js';
```

## Hook Execution Process

Hooks are executed during the subsystem build process. Understanding this process helps you write effective hooks.

### Build Process Overview

1. **Verification Phase** (`verifySubsystemBuild`):
   - Collects all hooks (defaults + user hooks)
   - Extracts hook metadata (`kind`, `overwrite`, `required`, `source`)
   - Validates hook metadata
   - Executes hooks to create facets
   - Validates facets
   - Builds dependency graph
   - Performs topological sort

2. **Execution Phase** (`buildSubsystem`):
   - Initializes facets in dependency order
   - Attaches facets to subsystem
   - Builds child subsystems

### Hook Execution Order

Hooks are executed in two phases:

**Phase 1: Metadata Extraction**
- All hooks are examined to extract metadata
- Duplicate hooks are detected (unless `overwrite: true`)
- Hook dependencies are validated

**Phase 2: Facet Creation**
- Hooks are executed to create facets
- Facets are validated
- Dependency graph is built
- Topological sort determines initialization order

**Important:** During hook execution, only facets declared in your `required` array are guaranteed to exist. Other facets may not be registered yet.

### Example: Hook Execution Flow

```javascript
// Hook 1: useStatistics (no dependencies)
export const useStatistics = createHook({
  kind: 'statistics',
  required: [],
  // ...
});

// Hook 2: useQueue (depends on statistics)
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],  // Statistics is guaranteed to exist
  fn: (ctx, api, subsystem) => {
    // Safe to access statistics facet
    const statisticsFacet = api.__facets['statistics'];
    
    return new Facet('queue', { /* ... */ });
  }
});

// Hook 3: useScheduler (depends on queue, processor, statistics, and queries)
export const useScheduler = createHook({
  kind: 'scheduler',
  required: ['queue', 'processor', 'statistics', 'queries'],  // All guaranteed to exist
  fn: (ctx, api, subsystem) => {
    // Safe to access all dependencies
    const queueFacet = api.__facets['queue'];
    const processorFacet = api.__facets['processor'];
    const statisticsFacet = api.__facets['statistics'];
    const queriesFacet = api.__facets['queries'];
    
    return new Facet('scheduler', { /* ... */ });
  }
});
```

**Execution order:**
1. `useStatistics` executes first (no dependencies)
2. `useQueue` executes (statistics exists)
3. `useMessageProcessor` executes (router, statistics, queue exist)
4. `useQueries` executes (no dependencies)
5. `useScheduler` executes (queue, processor, statistics, queries exist)

**Note:** This is a simplified example. See the [Available Hooks](#available-hooks) section for complete dependency information for all hooks.

## How Hooks Work with Facets

Hooks create facets, and facets extend subsystem functionality. Understanding this relationship is crucial.

### Hook → Facet Relationship

```javascript
// Hook creates and returns a Facet
export const useQueue = createHook({
  kind: 'queue',
  fn: (ctx, api, subsystem) => {
    // Hook logic creates a Facet
    return new Facet('queue', { 
      attach: true,
      source: import.meta.url 
    })
    .add({
      // Facet methods
      getQueueStatus() { /* ... */ }
    });
  }
});
```

**Key points:**
- Hook's `kind` must match Facet's `kind`
- Hook's `attach` should match Facet's `attach` option
- Hook's `required` should match Facet's `required` option (for consistency)
- Hook's `overwrite` should match Facet's `overwrite` option (for consistency)

### Facet Creation in Hooks

When creating a facet in your hook, follow these patterns:

**Pattern 1: Simple Facet**
```javascript
fn: (ctx, api, subsystem) => {
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({
      method1() { /* ... */ },
      method2() { /* ... */ }
    });
}
```

**Pattern 2: Facet with Configuration**
```javascript
fn: (ctx, api, subsystem) => {
  const config = ctx.config?.custom || {};
  const service = new CustomService(config);
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({
      process(data) {
        return service.process(data);
      }
    });
}
```

**Pattern 3: Facet with Dependencies**
```javascript
fn: (ctx, api, subsystem) => {
  // Access required dependencies
  const queueFacet = api.__facets['queue'];
  const statisticsFacet = api.__facets['statistics'];
  
  return new Facet('scheduler', { attach: true, source: import.meta.url })
    .add({
      process() {
        // Use dependencies
        const message = queueFacet.selectNextMessage();
        statisticsFacet.recordMessageProcessed();
        // ...
      }
    });
}
```

**Pattern 4: Facet with Optional Dependencies**
```javascript
fn: (ctx, api, subsystem) => {
  // Required dependency
  const queueFacet = api.__facets['queue'];
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({
      process() {
        const message = queueFacet.selectNextMessage();
        
        // Optional dependency - check in method
        const cacheFacet = subsystem.find('cache');
        if (cacheFacet) {
          cacheFacet.set(message.id, message);
        }
        
        return message;
      }
    });
}
```

## How Hooks Work with FacetManager

The FacetManager is responsible for managing facets created by hooks. Understanding this relationship helps you write hooks that integrate well with the system.

### Hook Execution → FacetManager

During subsystem build:

1. **Hooks are executed** → Create facets
2. **Facets are collected** → Stored by kind
3. **FacetManager receives facets** → Via `addMany()`
4. **Facets are initialized** → In dependency order
5. **Facets are attached** → To subsystem (if `attach: true`)

### Accessing Facets During Hook Execution

During hook execution, you can access facets through `api.__facets`:

```javascript
fn: (ctx, api, subsystem) => {
  // Access required dependencies
  const queueFacet = api.__facets['queue'];
  const statisticsFacet = api.__facets['statistics'];
  
  // Access optional facets (may not exist)
  const cacheFacet = api.__facets?.['cache'];
  
  // Use FacetManager methods
  if (api.__facets.has('monitoring')) {
    const monitoringFacet = api.__facets.find('monitoring');
    // ...
  }
  
  return new Facet('custom', { /* ... */ });
}
```

**Important:** Only facets declared in your `required` array are guaranteed to exist. Other facets may not be registered yet.

### Accessing Facets in Facet Methods

After the subsystem is built, facets can access other facets using `subsystem.find()`:

```javascript
fn: (ctx, api, subsystem) => {
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({
      process() {
        // Check for optional facet at call time
        const statisticsFacet = subsystem.find('statistics');
        if (statisticsFacet) {
          statisticsFacet.recordEvent('processing');
        }
        
        // Process...
      }
    });
}
```

## Complete Hook Example

Here's a complete example showing all aspects of hook creation:

```javascript
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { CustomService } from './custom-service.mycelia.js';

/**
 * useCustom Hook
 * 
 * Provides custom functionality to subsystems.
 * 
 * Dependencies:
 * - statistics: Required for recording events
 * - cache: Optional for caching results
 */
export const useCustom = createHook({
  kind: 'custom',
  overwrite: false,
  required: ['statistics'],  // Required dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    
    // Extract configuration
    const config = ctx.config?.custom || {};
    const debug = config.debug !== undefined ? config.debug : (ctx.debug || false);
    
    // Access required dependency
    const statisticsFacet = api.__facets['statistics'];
    
    // Create service
    const service = new CustomService({
      name,
      config,
      debug,
      onEvent: (event) => {
        // Use required dependency
        statisticsFacet.recordEvent(event);
      }
    });
    
    // Return facet
    return new Facet('custom', { 
      attach: true,
      required: ['statistics'],  // Match hook's required
      source: import.meta.url 
    })
    .add({
      /**
       * Process data with optional caching
       */
      async process(data) {
        // Check for optional cache facet at call time
        const cacheFacet = subsystem.find('cache');
        
        if (cacheFacet) {
          const cached = cacheFacet.get(data.id);
          if (cached) {
            return cached;
          }
        }
        
        // Process data
        const result = await service.process(data);
        
        // Cache result if available
        if (cacheFacet) {
          cacheFacet.set(data.id, result);
        }
        
        return result;
      },
      
      /**
       * Get service status
       */
      getStatus() {
        return service.getStatus();
      },
      
      /**
       * Configure service
       */
      configure(options) {
        service.configure(options);
      },
      
      // Internal service reference
      _service: service
    });
  }
});
```

## Hook Registration

Hooks can be registered in two ways:

### 1. Default Hooks

Default hooks are provided by the subsystem's `defaultHooks` property. See [Default Hooks](../DEFAULT-HOOKS.md) for complete documentation.

```javascript
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()
});
```

### 2. User Hooks

User hooks are added via the `use()` method or `hooks` array:

```javascript
import { useCustom } from './hooks/custom/use-custom.mycelia.js';

// Method 1: Using use() method
subsystem.use(useCustom);

// Method 2: Using hooks array
subsystem.hooks.push(useCustom);

// Method 3: In constructor
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  hooks: [useCustom]
});
```

**Important:** Hooks must be registered before calling `subsystem.build()`.

## Best Practices

1. **Always use `createHook`**: Use the factory function to ensure consistent metadata structure.

2. **Match hook and facet metadata**: Keep `kind`, `attach`, `required`, and `overwrite` consistent between hook and facet.

3. **Set `source` to `import.meta.url`**: This improves error messages and debugging.

4. **Declare dependencies explicitly**: Use the `required` array to make dependencies clear and ensure correct initialization order.

5. **Extract configuration properly**: Use `ctx.config?.<kind>` to extract configuration for your hook.

6. **Access required dependencies safely**: Use `api.__facets['dependency']` for required dependencies (they're guaranteed to exist).

7. **Use `subsystem.find()` for optional facets**: Check for optional facets in facet methods using `subsystem.find()`.

8. **Handle missing optional facets gracefully**: Always check if optional facets exist before using them.

9. **Document your hook**: Include JSDoc comments explaining what the hook does, its dependencies, and configuration options.

10. **Test hook isolation**: Ensure your hook works correctly when dependencies are missing (for optional dependencies).

## Common Patterns

### Pattern: Simple Feature Hook

```javascript
export const useSimple = createHook({
  kind: 'simple',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const service = new SimpleService();
    
    return new Facet('simple', { attach: true, source: import.meta.url })
      .add({
        doSomething() {
          return service.doSomething();
        }
      });
  }
});
```

### Pattern: Hook with Required Dependencies

```javascript
export const useDependent = createHook({
  kind: 'dependent',
  required: ['base'],  // Required dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required dependency
    const baseFacet = api.__facets['base'];
    
    return new Facet('dependent', { attach: true, source: import.meta.url })
      .add({
        process() {
          // Use base facet
          return baseFacet.process();
        }
      });
  }
});
```

### Pattern: Hook with Optional Dependencies

```javascript
export const useOptional = createHook({
  kind: 'optional',
  required: [],  // No required dependencies
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('optional', { attach: true, source: import.meta.url })
      .add({
        process() {
          // Check for optional facet in method
          const enhancementFacet = subsystem.find('enhancement');
          if (enhancementFacet) {
            return enhancementFacet.enhance(this.coreProcess());
          }
          return this.coreProcess();
        },
        
        coreProcess() {
          // Core logic
          return { processed: true };
        }
      });
  }
});
```

### Pattern: Hook with Configuration

```javascript
export const useConfigurable = createHook({
  kind: 'configurable',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Extract configuration
    const config = ctx.config?.configurable || {};
    const debug = config.debug !== undefined ? config.debug : (ctx.debug || false);
    
    const service = new ConfigurableService({
      option1: config.option1 || 'default1',
      option2: config.option2 || 'default2',
      debug
    });
    
    return new Facet('configurable', { attach: true, source: import.meta.url })
      .add({
        getConfig() {
          return service.getConfig();
        },
        
        updateConfig(options) {
          service.updateConfig(options);
        }
      });
  }
});
```

## Hook Validation

The build system validates hooks to ensure correctness:

### Validation Checks

1. **Hook must be a function**: Non-function hooks are skipped
2. **Hook must have `kind`**: Missing or invalid `kind` causes error
3. **Hook `kind` must match facet `kind`**: Mismatch causes error
4. **Duplicate hooks**: Duplicate `kind` causes error (unless `overwrite: true`)
5. **Hook must return Facet**: Non-Facet return value causes error
6. **Dependencies must exist**: Missing required dependencies cause error
7. **Facet metadata validation**: Facet must have valid `kind` and match hook's `kind`

### Error Messages

The build system provides clear error messages:

```javascript
// Example error messages
"Hook missing valid kind property (source: file:///path/to/hook.js)."
"Duplicate hook kind 'queue' from [file:///path1.js] and [file:///path2.js]. Hook does not allow overwrite."
"Hook 'scheduler' (from file:///path.js) requires missing facet 'processor'."
"Hook 'router' (from file:///path.js) did not return a Facet instance (got undefined)."
```

## Hook Lifecycle

Hooks have a simple lifecycle:

1. **Definition**: Hook is created with `createHook()`
2. **Registration**: Hook is added to subsystem (via `defaultHooks` or `hooks`)
3. **Verification**: Hook metadata is extracted and validated
4. **Execution**: Hook function is called to create facet
5. **Initialization**: Facet is initialized (if `init: true`)
6. **Attachment**: Facet is attached to subsystem (if `attach: true`)

**Note:** Hooks themselves are not stored or managed - only the facets they create are managed by FacetManager.

## See Also

- [Standalone Plugin System](../STANDALONE-PLUGIN-SYSTEM.md) - Learn how to use hooks as plugins in a standalone system
- [Default Hooks](../DEFAULT-HOOKS.md) - Learn about DefaultHooks and factory functions for managing default hook sets
- [Facets Documentation](./FACETS.md) - Learn about facets that hooks create
- [Facet Contracts](../FACET-CONTRACT.md) - Learn about facet contracts and validation
- [Facet Contract Registry](../FACET-CONTRACT-REGISTRY.md) - Learn about the contract registry system
- [Default Contracts](../DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Facet Manager](./FACET-MANAGER.md) - Understand how facets are managed and how hooks integrate with FacetManager
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Learn about the `ctx` parameter passed to hooks
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - Learn about the `api` parameter passed to hooks
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Learn about the `subsystem` parameter passed to hooks

