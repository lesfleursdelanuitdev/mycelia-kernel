# Hook Function API Parameter

## Overview

The `api` parameter is the second argument passed to hook functions and facet lifecycle callbacks. It provides access to the subsystem's API, including the subsystem name and the FacetManager for accessing other facets.

The API is passed to:
- **Hook functions** as the second parameter: `fn: (ctx, api, subsystem) => { ... }`
- **Facet lifecycle callbacks** as part of the parameters object: `onInit(({ ctx, api, subsystem, facet }) => { ... })`

## API Structure

The API object has the following structure:

```javascript
api = {
  name: string,              // Subsystem name
  __facets: FacetManager     // FacetManager instance for accessing facets
}
```

## API Properties

### `name` (string, required)

The unique name of the subsystem. This is useful for logging, debugging, and creating subsystem-specific resources.

**Usage in Hook Functions:**
```javascript
export const useQueue = createHook({
  kind: 'queue',
  fn: (ctx, api, subsystem) => {
    // Access subsystem name
    const subsystemName = api.name;
    console.log(`Initializing queue for ${subsystemName}`);
    
    return new Facet('queue', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});
```

**Usage in Lifecycle Callbacks:**
```javascript
.onInit(({ api, subsystem }) => {
  console.log(`Facet initialized for subsystem: ${api.name}`);
})
```

### `__facets` (FacetManager, required)

A reference to the FacetManager instance that manages all facets for this subsystem. This is the primary way to access other facets during hook execution.

**Important:** During hook execution, not all facets may be registered yet. Facets are registered in dependency order, so you can only access facets that:
1. Have already been registered (earlier in the build process)
2. Are declared as dependencies in your hook's `required` array

**Usage:**
```javascript
// Access a facet
const queueFacet = api.__facets['queue'];

// With optional chaining (for optional dependencies)
const statisticsFacet = api.__facets?.['statistics'];
```

## Accessing Other Facets

The `api.__facets` property provides access to the FacetManager, which allows you to find and interact with other facets during hook execution.

### Direct Access Pattern

The simplest way to access a facet is through direct property access:

```javascript
fn: (ctx, api, subsystem) => {
  // Access a required facet
  const queueFacet = api.__facets['queue'];
  
  // Use the facet
  const queueStatus = queueFacet.getQueueStatus();
  
  return new Facet('scheduler', { attach: true, source: import.meta.url })
    .add({ /* methods */ });
}
```

### Optional Access Pattern

For optional dependencies, use optional chaining to safely access facets that may not exist:

```javascript
fn: (ctx, api, subsystem) => {
  // Optional facet - may not be installed
  const statisticsFacet = api.__facets?.['statistics'];
  
  // Check if facet exists before using
  if (statisticsFacet) {
    statisticsFacet.recordEvent('hook-executed');
  }
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({ /* methods */ });
}
```

### Using FacetManager Methods

You can also use FacetManager methods for more control:

```javascript
fn: (ctx, api, subsystem) => {
  // Using find() method
  const queueFacet = api.__facets.find('queue');
  
  // Using has() method to check existence
  if (api.__facets.has('statistics')) {
    const statsFacet = api.__facets.find('statistics');
    // Use stats facet
  }
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({ /* methods */ });
}
```

## Checking if Facets are Installed

### Pattern: Deferred Facet Access

For optional facets that might be installed later (after the subsystem is built), you can defer checking for them until they're actually needed. Instead of accessing facets during hook execution, check for them in your facet's methods using `subsystem.find(kind)`:

```javascript
export const useCustom = createHook({
  kind: 'custom',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Don't access optional facets here - they might not be installed yet
    
    return new Facet('custom', { attach: true, source: import.meta.url })
      .add({
        // Check for optional facet when method is called
        recordEvent(event) {
          // Check if statistics facet is available now
          const statisticsFacet = subsystem.find('statistics');
          if (statisticsFacet) {
            statisticsFacet.recordEvent(event);
          }
        },
        
        notifyListeners(message) {
          // Check if listeners facet is available now
          const listenersFacet = subsystem.find('listeners');
          if (listenersFacet) {
            listenersFacet.notify(message);
          }
        }
      });
  }
});
```

**Benefits:**
- Works even if the facet is installed after the subsystem is built
- Lazy evaluation - only checks when the method is called
- No need to store facet references in closure
- More flexible for dynamic facet installation

**When to use:**
- Optional facets that might be added later
- Features that should gracefully degrade if facet is missing
- Methods that are called infrequently (lazy checking is acceptable)

### Pattern: Conditional Feature Based on Facet Availability

This pattern allows your hook to provide different functionality based on which facets are available during hook execution:

```javascript
export const useCustom = createHook({
  kind: 'custom',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Check if optional facets are available
    const hasStatistics = api.__facets?.has('statistics');
    const hasListeners = api.__facets?.has('listeners');
    
    // Build feature set based on available facets
    const features = {
      statistics: hasStatistics,
      listeners: hasListeners
    };
    
    return new Facet('custom', { attach: true, source: import.meta.url })
      .add({
        // Conditionally expose methods based on available facets
        recordEvent(event) {
          if (features.statistics) {
            const statsFacet = api.__facets.find('statistics');
            statsFacet.recordEvent(event);
          }
        },
        
        notifyListeners(message) {
          if (features.listeners) {
            const listenersFacet = api.__facets.find('listeners');
            listenersFacet.notify(message);
          }
        }
      });
  }
});
```

### Pattern: Graceful Degradation with Deferred Checking

This pattern provides fallback behavior when optional facets are not available, checking at method call time:

```javascript
export const useEnhancedQueue = createHook({
  kind: 'enhanced-queue',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const queueManager = new EnhancedQueueManager();
    
    return new Facet('enhanced-queue', { attach: true, source: import.meta.url })
      .add({
        processMessage(message) {
          // Process message
          const result = queueManager.process(message);
          
          // Check for statistics facet at call time (might be installed later)
          const statisticsFacet = subsystem.find('statistics');
          if (statisticsFacet) {
            statisticsFacet.recordMessageProcessed(message);
          } else {
            // Fallback: just log
            console.log(`Message processed: ${message.id}`);
          }
          
          return result;
        },
        
        getQueueStatus() {
          return queueManager.getStatus();
        }
      });
  }
});
```

### Pattern: Graceful Degradation (During Hook Execution)

This pattern provides fallback behavior when optional facets are not available during hook execution:

```javascript
export const useEnhancedQueue = createHook({
  kind: 'enhanced-queue',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const statisticsFacet = api.__facets?.['statistics'];
    
    // Create queue with optional statistics integration
    const queueManager = new EnhancedQueueManager({
      onMessageProcessed: (message) => {
        // Use statistics if available, otherwise just log
        if (statisticsFacet) {
          statisticsFacet.recordMessageProcessed(message);
        } else {
          console.log(`Message processed: ${message.id}`);
        }
      }
    });
    
    return new Facet('enhanced-queue', { attach: true, source: import.meta.url })
      .add({
        getQueueStatus() {
          return queueManager.getStatus();
        }
      });
  }
});
```

### Pattern: Early Return if Required Facet Missing

This pattern validates that required facets exist before proceeding:

```javascript
export const useDependentFeature = createHook({
  kind: 'dependent-feature',
  required: ['base-feature'],  // Declare dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Verify required facet exists (should always exist due to 'required' declaration)
    const baseFacet = api.__facets['base-feature'];
    
    if (!baseFacet) {
      throw new Error('dependent-feature requires base-feature facet');
    }
    
    // Use base facet
    const baseConfig = baseFacet.getConfig();
    
    return new Facet('dependent-feature', { attach: true, source: import.meta.url })
      .add({
        // Methods that use baseFacet
      });
  }
});
```

### Pattern: Feature Detection and Conditional Registration

This pattern checks for facets and conditionally registers features:

```javascript
export const useAdaptiveFeature = createHook({
  kind: 'adaptive-feature',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const features = {
      hasStatistics: api.__facets?.has('statistics'),
      hasListeners: api.__facets?.has('listeners'),
      hasRouter: api.__facets?.has('router')
    };
    
    // Build feature set based on what's available
    const methods = {
      // Core methods always available
      getStatus() {
        return { enabled: true };
      }
    };
    
    // Add statistics integration if available
    if (features.hasStatistics) {
      const statsFacet = api.__facets.find('statistics');
      methods.recordMetric = (name, value) => {
        statsFacet.recordMetric(name, value);
      };
    }
    
    // Add listener integration if available
    if (features.hasListeners) {
      const listenersFacet = api.__facets.find('listeners');
      methods.subscribe = (event, handler) => {
        listenersFacet.subscribe(event, handler);
      };
    }
    
    return new Facet('adaptive-feature', { attach: true, source: import.meta.url })
      .add(methods);
  }
});
```

## Deferred vs Immediate Facet Access

### When to Access Facets During Hook Execution

Access facets through `api.__facets` during hook execution when:
- The facet is a **required dependency** (declared in `required` array)
- You need the facet reference **immediately** to configure your facet
- The facet is used in **initialization logic** (onInit callbacks)
- You want to **fail fast** if the facet is missing

**Example:**
```javascript
export const useScheduler = createHook({
  kind: 'scheduler',
  required: ['queue', 'processor'],  // Required - safe to access immediately
  fn: (ctx, api, subsystem) => {
    // Safe to access - guaranteed to exist
    const queueFacet = api.__facets['queue'];
    const processorFacet = api.__facets['processor'];
    
    const scheduler = new SubsystemScheduler({
      queue: queueFacet,
      processor: processorFacet
    });
    
    return new Facet('scheduler', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});
```

### When to Defer Facet Access

Use `subsystem.find(kind)` in your facet's methods when:
- The facet is **optional** and might not be installed yet
- The facet might be **installed later** (after subsystem build)
- You want **graceful degradation** if the facet is missing
- The facet is only needed **occasionally** (lazy checking is acceptable)

**Example:**
```javascript
export const useCustom = createHook({
  kind: 'custom',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Don't access optional facets here
    
    return new Facet('custom', { attach: true, source: import.meta.url })
      .add({
        // Check for optional facet when method is called
        logEvent(event) {
          const statisticsFacet = subsystem.find('statistics');
          if (statisticsFacet) {
            statisticsFacet.recordEvent(event);
          }
          // Continue even if statistics facet is missing
        }
      });
  }
});
```

### Hybrid Approach

You can combine both approaches - access required facets immediately, and check for optional facets later:

```javascript
export const useHybrid = createHook({
  kind: 'hybrid',
  required: ['queue'],  // Required dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required facet immediately
    const queueFacet = api.__facets['queue'];
    
    return new Facet('hybrid', { attach: true, source: import.meta.url })
      .add({
        processMessage(message) {
          // Use required facet (already available)
          const pair = queueFacet.selectNextMessage();
          
          // Check for optional facet when needed
          const statisticsFacet = subsystem.find('statistics');
          if (statisticsFacet) {
            statisticsFacet.recordMessageProcessed();
          }
          
          return pair;
        }
      });
  }
});
```

## Common Use Cases

### Use Case: Accessing Required Dependencies

When your hook declares dependencies in the `required` array, those facets are guaranteed to be available:

```javascript
export const useScheduler = createHook({
  kind: 'scheduler',
  required: ['queue', 'processor', 'statistics'],  // Declared dependencies
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // These facets are guaranteed to exist
    const queueFacet = api.__facets['queue'];
    const processorFacet = api.__facets['processor'];
    const statisticsFacet = api.__facets['statistics'];
    
    // Use the facets
    const scheduler = new SubsystemScheduler({
      queue: queueFacet,
      processor: processorFacet,
      statistics: statisticsFacet
    });
    
    return new Facet('scheduler', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});
```

### Use Case: Accessing Optional Dependencies (During Hook Execution)

For optional dependencies that are available during hook execution, use optional chaining and existence checks:

```javascript
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics', 'listeners'],  // Required
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Required facets (guaranteed to exist)
    const statisticsFacet = api.__facets['statistics'];
    
    // Optional facet (may not exist)
    const cacheFacet = api.__facets?.['cache'];
    
    const queueManager = new SubsystemQueueManager({
      onQueueFull: () => {
        // Use required facet
        statisticsFacet.recordQueueFull();
        
        // Use optional facet if available
        if (cacheFacet) {
          cacheFacet.invalidate('queue');
        }
      }
    });
    
    return new Facet('queue', { attach: true, source: import.meta.url })
      .add({ /* methods */ });
  }
});
```

### Use Case: Optional Dependencies Installed Later

For optional dependencies that might be installed after the subsystem is built, check for them in your facet's methods using `subsystem.find(kind)`:

```javascript
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],  // Required
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required facet
    const statisticsFacet = api.__facets['statistics'];
    
    const queueManager = new SubsystemQueueManager({
      onQueueFull: () => {
        // Use required facet
        statisticsFacet.recordQueueFull();
      }
    });
    
    return new Facet('queue', { attach: true, source: import.meta.url })
      .add({
        getQueueStatus() {
          return queueManager.getStatus();
        },
        
        // Optional feature - check at call time (might be installed later)
        enableCaching() {
          // Check if cache facet is available now (might be installed later)
          const cacheFacet = subsystem.find('cache');
          if (cacheFacet) {
            cacheFacet.enableForQueue(this);
            return true;
          }
          return false;  // Cache not available
        },
        
        // Another optional feature
        recordEvent(event) {
          // Check for optional monitoring facet at call time
          const monitoringFacet = subsystem.find('monitoring');
          if (monitoringFacet) {
            monitoringFacet.recordEvent('queue', event);
          }
        }
      });
  }
});
```

### Use Case: Cross-Facet Communication

Facets can communicate with each other through the API:

```javascript
export const useMessageProcessor = createHook({
  kind: 'processor',
  required: ['router', 'statistics', 'queue'],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access multiple facets
    const routerFacet = api.__facets['router'];
    const statisticsFacet = api.__facets['statistics'];
    const queueFacet = api.__facets['queue'];
    
    return new Facet('processor', { attach: true, source: import.meta.url })
      .add({
        async processMessage(message) {
          // Use router to find handler
          const handler = routerFacet.match(message.path);
          
          // Record statistics
          statisticsFacet.recordMessageProcessed();
          
          // Process message
          return await handler(message);
        }
      });
  }
});
```

## Best Practices

1. **Use `required` array for dependencies**: Always declare required facets in the hook's `required` array. This ensures they're available and initialized before your hook runs.

2. **Access required facets immediately**: For required dependencies, access them during hook execution through `api.__facets['facet-name']`.

3. **Defer optional facet access**: For optional facets that might be installed later, use `subsystem.find(kind)` in your facet's methods instead of accessing them during hook execution.

4. **Use optional chaining for optional facets during hook execution**: When accessing optional facets during hook execution, use `api.__facets?.['facet-name']` to safely handle cases where the facet doesn't exist.

5. **Check existence before use**: Always verify optional facets exist before calling their methods:
   ```javascript
   // During hook execution
   const statsFacet = api.__facets?.['statistics'];
   if (statsFacet) {
     statsFacet.recordEvent('something');
   }
   
   // Or in facet methods (for facets installed later)
   recordEvent(event) {
     const statsFacet = subsystem.find('statistics');
     if (statsFacet) {
       statsFacet.recordEvent(event);
     }
   }
   ```

6. **Use FacetManager methods for complex logic**: For more complex facet discovery, use `api.__facets.has()` and `api.__facets.find()` methods.

7. **Don't access facets during hook execution that aren't dependencies**: Only access facets during hook execution that are:
   - Declared in your `required` array
   - Already registered (earlier in the build order)
   - Truly optional (with proper existence checks)

8. **Store facet references in closure for required facets**: If you need to use required facets in methods added to your facet, store references in the hook's closure:
   ```javascript
   fn: (ctx, api, subsystem) => {
     const queueFacet = api.__facets['queue'];  // Required
     
     return new Facet('scheduler', { attach: true, source: import.meta.url })
       .add({
         process() {
           // Use queueFacet from closure
           const message = queueFacet.selectNextMessage();
           // ...
         }
       });
   }
   ```

9. **Use `subsystem.find()` for optional facets in methods**: For optional facets that might be installed later, check for them in your facet's methods:
   ```javascript
   fn: (ctx, api, subsystem) => {
     return new Facet('custom', { attach: true, source: import.meta.url })
       .add({
         logEvent(event) {
           // Check for optional facet at call time
           const statsFacet = subsystem.find('statistics');
           if (statsFacet) {
             statsFacet.recordEvent(event);
           }
         }
       });
   }
   ```

## Common Patterns

### Pattern: Facet Discovery and Integration

```javascript
export const useIntegrator = createHook({
  kind: 'integrator',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Discover available facets
    const availableFacets = {
      queue: api.__facets?.['queue'],
      router: api.__facets?.['router'],
      statistics: api.__facets?.['statistics'],
      listeners: api.__facets?.['listeners']
    };
    
    // Build integration based on what's available
    const integrations = [];
    
    if (availableFacets.queue && availableFacets.statistics) {
      integrations.push({
        type: 'queue-stats',
        setup: () => {
          // Integrate queue with statistics
        }
      });
    }
    
    if (availableFacets.router && availableFacets.listeners) {
      integrations.push({
        type: 'router-listeners',
        setup: () => {
          // Integrate router with listeners
        }
      });
    }
    
    return new Facet('integrator', { attach: true, source: import.meta.url })
      .add({
        getIntegrations() {
          return integrations;
        },
        
        setupAll() {
          integrations.forEach(integration => integration.setup());
        }
      });
  }
});
```

### Pattern: Facet Proxy/Wrapper

```javascript
export const useFacetProxy = createHook({
  kind: 'proxy',
  required: ['target-facet'],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Get the target facet
    const targetFacet = api.__facets['target-facet'];
    
    // Create a proxy that adds additional functionality
    return new Facet('proxy', { attach: true, source: import.meta.url })
      .add({
        // Proxy all methods to target facet
        ...targetFacet,
        
        // Add additional methods
        enhancedMethod() {
          // Do something extra
          const result = targetFacet.originalMethod();
          // Process result
          return result;
        }
      });
  }
});
```

## See Also

- [Hooks Documentation](./HOOKS.md) - Complete guide to creating hooks and how they use the API parameter
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Learn about the `ctx` parameter
- [Hook Function Subsystem Parameter](./HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - Learn about the `subsystem` parameter and using `find()` in facet methods
- [Facets Documentation](./FACETS.md) - Understand how facets work and use the API
- [Facet Manager](./FACET-MANAGER.md) - Learn about FacetManager and how to access facets

