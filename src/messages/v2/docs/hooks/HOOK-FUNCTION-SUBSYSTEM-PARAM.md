# Hook Function Subsystem Parameter

## Overview

The `subsystem` parameter is the third argument passed to hook functions and facet lifecycle callbacks. It provides access to the subsystem instance itself, including its `find()` method for accessing facets.

The subsystem is passed to:
- **Hook functions** as the third parameter: `fn: (ctx, api, subsystem) => { ... }`
- **Facet lifecycle callbacks** as part of the parameters object: `onInit(({ ctx, api, subsystem, facet }) => { ... })`

## Subsystem Parameter

The `subsystem` parameter is an instance of `BaseSubsystem` (or a subclass). For hooks and facets, the most important method is `find()`, which allows you to access other facets.

### `find(kind)` Method

The `find()` method is the primary way to access facets from within facet methods. It provides a convenient way to look up facets by their kind identifier.

**Signature:**
```javascript
subsystem.find(kind) => Facet | undefined
```

**Parameters:**
- `kind` (string, required) - The facet kind identifier (e.g., 'queue', 'router', 'statistics')

**Returns:**
- `Facet | undefined` - The facet instance if found, or `undefined` if not found

**Usage:**
```javascript
// In hook function
fn: (ctx, api, subsystem) => {
  // Access a facet using subsystem.find()
  const queueFacet = subsystem.find('queue');
  
  if (queueFacet) {
    // Use the facet
    const status = queueFacet.getQueueStatus();
  }
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({ /* methods */ });
}

// In facet methods
.add({
  processMessage(message) {
    // Check for optional facet
    const statisticsFacet = subsystem.find('statistics');
    if (statisticsFacet) {
      statisticsFacet.recordMessageProcessed();
    }
    
    // Process message...
  }
})
```

## Using `subsystem.find()` in Facet Methods

The `subsystem.find()` method is particularly useful when writing facet methods that need to access other facets. This is especially important for optional facets that might be installed later.

### Pattern: Accessing Facets in Facet Methods

When writing methods for your facet, you can use `subsystem.find()` to access other facets:

```javascript
export const useCustom = createHook({
  kind: 'custom',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('custom', { attach: true, source: import.meta.url })
      .add({
        // Method that uses subsystem.find() to access other facets
        processWithStatistics(data) {
          // Find statistics facet
          const statisticsFacet = subsystem.find('statistics');
          
          if (statisticsFacet) {
            // Record statistics before processing
            statisticsFacet.recordEvent('processing-started');
          }
          
          // Process data
          const result = this.processData(data);
          
          if (statisticsFacet) {
            // Record statistics after processing
            statisticsFacet.recordEvent('processing-completed');
          }
          
          return result;
        },
        
        processData(data) {
          // Core processing logic
          return { processed: data };
        }
      });
  }
});
```

### Pattern: Optional Facet Integration

Use `subsystem.find()` to integrate with optional facets that might not be installed:

```javascript
export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics'],  // Required dependency
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required facet during hook execution
    const statisticsFacet = api.__facets['statistics'];
    
    const queueManager = new SubsystemQueueManager({
      onQueueFull: () => {
        statisticsFacet.recordQueueFull();
      }
    });
    
    return new Facet('queue', { attach: true, source: import.meta.url })
      .add({
        getQueueStatus() {
          return queueManager.getStatus();
        },
        
        // Optional feature - check at call time
        enableCaching() {
          // Use subsystem.find() to check for optional cache facet
          const cacheFacet = subsystem.find('cache');
          
          if (cacheFacet) {
            cacheFacet.enableForQueue(this);
            return true;
          }
          
          return false;  // Cache facet not available
        },
        
        // Another optional integration
        recordEvent(event) {
          // Check for optional monitoring facet
          const monitoringFacet = subsystem.find('monitoring');
          if (monitoringFacet) {
            monitoringFacet.recordEvent('queue', event);
          }
        }
      });
  }
});
```

### Pattern: Cross-Facet Communication

Facets can communicate with each other using `subsystem.find()`:

```javascript
export const useMessageProcessor = createHook({
  kind: 'processor',
  required: ['router', 'queue'],  // Required dependencies
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Access required facets during hook execution
    const routerFacet = api.__facets['router'];
    const queueFacet = api.__facets['queue'];
    
    return new Facet('processor', { attach: true, source: import.meta.url })
      .add({
        async processMessage(message) {
          // Use required facets (already available)
          const handler = routerFacet.match(message.path);
          
          // Use subsystem.find() for optional facets in methods
          const statisticsFacet = subsystem.find('statistics');
          if (statisticsFacet) {
            statisticsFacet.recordMessageProcessed();
          }
          
          // Process message
          return await handler(message);
        },
        
        async processBatch(messages) {
          // Access multiple facets using subsystem.find()
          const statisticsFacet = subsystem.find('statistics');
          const listenersFacet = subsystem.find('listeners');
          
          const results = [];
          for (const message of messages) {
            const result = await this.processMessage(message);
            results.push(result);
            
            // Notify listeners if available
            if (listenersFacet) {
              listenersFacet.notify('message-processed', { message, result });
            }
          }
          
          // Record batch statistics if available
          if (statisticsFacet) {
            statisticsFacet.recordBatchProcessed(messages.length);
          }
          
          return results;
        }
      });
  }
});
```

### Pattern: Conditional Feature Based on Available Facets

Use `subsystem.find()` to conditionally enable features based on available facets:

```javascript
export const useAdaptiveFeature = createHook({
  kind: 'adaptive-feature',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('adaptive-feature', { attach: true, source: import.meta.url })
      .add({
        // Core method - always available
        getStatus() {
          return { enabled: true };
        },
        
        // Method that adapts based on available facets
        processWithEnhancements(data) {
          // Check for optional enhancement facets
          const cacheFacet = subsystem.find('cache');
          const statisticsFacet = subsystem.find('statistics');
          const monitoringFacet = subsystem.find('monitoring');
          
          // Use cache if available
          if (cacheFacet) {
            const cached = cacheFacet.get(data.id);
            if (cached) {
              return cached;
            }
          }
          
          // Record start if statistics available
          if (statisticsFacet) {
            statisticsFacet.recordEvent('processing-started');
          }
          
          // Process data
          const result = this.process(data);
          
          // Store in cache if available
          if (cacheFacet) {
            cacheFacet.set(data.id, result);
          }
          
          // Record completion if statistics available
          if (statisticsFacet) {
            statisticsFacet.recordEvent('processing-completed');
          }
          
          // Notify monitoring if available
          if (monitoringFacet) {
            monitoringFacet.recordMetric('processing-time', result.duration);
          }
          
          return result;
        },
        
        process(data) {
          // Core processing logic
          return { processed: data };
        }
      });
  }
});
```

### Pattern: Facet Discovery and Integration

Use `subsystem.find()` to discover and integrate with facets dynamically:

```javascript
export const useIntegrator = createHook({
  kind: 'integrator',
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('integrator', { attach: true, source: import.meta.url })
      .add({
        // Discover and integrate facets when method is called
        integrate() {
          const integrations = [];
          
          // Check for various facets using subsystem.find()
          const queueFacet = subsystem.find('queue');
          const statisticsFacet = subsystem.find('statistics');
          const routerFacet = subsystem.find('router');
          const listenersFacet = subsystem.find('listeners');
          
          // Integrate queue with statistics if both available
          if (queueFacet && statisticsFacet) {
            integrations.push({
              type: 'queue-stats',
              setup: () => {
                // Set up integration
                queueFacet.onMessageProcessed((msg) => {
                  statisticsFacet.recordMessageProcessed(msg);
                });
              }
            });
          }
          
          // Integrate router with listeners if both available
          if (routerFacet && listenersFacet) {
            integrations.push({
              type: 'router-listeners',
              setup: () => {
                routerFacet.onRouteMatched((route) => {
                  listenersFacet.notify('route-matched', route);
                });
              }
            });
          }
          
          // Setup all discovered integrations
          integrations.forEach(integration => integration.setup());
          
          return integrations;
        },
        
        // Check if specific integration is possible
        canIntegrateQueueStats() {
          return subsystem.find('queue') && subsystem.find('statistics');
        }
      });
  }
});
```

## When to Use `subsystem.find()`

### Use `subsystem.find()` When:

1. **Accessing facets in facet methods**: When writing methods for your facet that need to access other facets
2. **Optional facets**: For facets that might not be installed or might be installed later
3. **Runtime facet discovery**: When you need to check for facets at method call time rather than during hook execution
4. **Graceful degradation**: When you want your facet to work even if optional dependencies are missing
5. **Dynamic integration**: When integrating with facets that may be added dynamically

### Don't Use `subsystem.find()` When:

1. **Required dependencies during hook execution**: Use `api.__facets['facet-name']` for required dependencies (declared in `required` array)
2. **Initialization logic**: Use `api.__facets` during hook execution for setup that needs to happen immediately
3. **Performance-critical paths**: If you're calling a method frequently, consider storing the facet reference in closure instead of calling `find()` repeatedly

## Best Practices

1. **Check for existence**: Always check if `subsystem.find()` returns a facet before using it:
   ```javascript
   const statisticsFacet = subsystem.find('statistics');
   if (statisticsFacet) {
     statisticsFacet.recordEvent('something');
   }
   ```

2. **Use for optional facets**: Prefer `subsystem.find()` for optional facets that might not be installed:
   ```javascript
   // In facet method
   enableFeature() {
     const cacheFacet = subsystem.find('cache');
     if (cacheFacet) {
       cacheFacet.enable();
       return true;
     }
     return false;
   }
   ```

3. **Cache frequently-used facets**: If you use a facet frequently in a method, cache the result:
   ```javascript
   processMany(items) {
     const statisticsFacet = subsystem.find('statistics');
     
     // Cache the reference for reuse in the loop
     if (statisticsFacet) {
       for (const item of items) {
         this.process(item);
         statisticsFacet.recordItemProcessed();
       }
     } else {
       // Process without statistics
       for (const item of items) {
         this.process(item);
       }
     }
   }
   ```

4. **Combine with required facets**: You can combine `api.__facets` for required facets with `subsystem.find()` for optional ones:
   ```javascript
   fn: (ctx, api, subsystem) => {
     // Required facet - access during hook execution
     const queueFacet = api.__facets['queue'];
     
     return new Facet('custom', { attach: true, source: import.meta.url })
       .add({
         process() {
           // Use required facet
           const message = queueFacet.selectNextMessage();
           
           // Check for optional facet
           const statisticsFacet = subsystem.find('statistics');
           if (statisticsFacet) {
             statisticsFacet.recordMessageProcessed();
           }
           
           return message;
         }
       });
   }
   ```

5. **Document optional dependencies**: If your facet methods use `subsystem.find()` for optional facets, document which facets are optional:
   ```javascript
   /**
    * Process message with optional statistics recording
    * 
    * Optional dependencies:
    * - statistics: If available, records message processing statistics
    * - monitoring: If available, records processing metrics
    */
   async processMessage(message) {
     const statisticsFacet = subsystem.find('statistics');
     const monitoringFacet = subsystem.find('monitoring');
     
     // Process message...
   }
   ```

## Common Patterns

### Pattern: Optional Enhancement

```javascript
.add({
  process(data) {
    // Core processing
    const result = this.coreProcess(data);
    
    // Optional enhancement - check if available
    const cacheFacet = subsystem.find('cache');
    if (cacheFacet) {
      cacheFacet.set(data.id, result);
    }
    
    return result;
  },
  
  coreProcess(data) {
    // Core logic
    return { processed: data };
  }
})
```

### Pattern: Feature Flag Based on Facet Availability

```javascript
.add({
  hasFeature(featureName) {
    const featureMap = {
      caching: () => subsystem.find('cache') !== undefined,
      statistics: () => subsystem.find('statistics') !== undefined,
      monitoring: () => subsystem.find('monitoring') !== undefined
    };
    
    const checker = featureMap[featureName];
    return checker ? checker() : false;
  },
  
  processWithFeatures(data) {
    if (this.hasFeature('caching')) {
      const cacheFacet = subsystem.find('cache');
      const cached = cacheFacet.get(data.id);
      if (cached) return cached;
    }
    
    const result = this.process(data);
    
    if (this.hasFeature('caching')) {
      subsystem.find('cache').set(data.id, result);
    }
    
    return result;
  }
})
```

### Pattern: Facet Proxy

```javascript
.add({
  // Proxy method that delegates to another facet if available
  getMetrics() {
    const statisticsFacet = subsystem.find('statistics');
    
    if (statisticsFacet) {
      // Delegate to statistics facet
      return statisticsFacet.getMetrics();
    }
    
    // Fallback: return basic metrics
    return {
      processed: 0,
      errors: 0
    };
  }
})
```

## Comparison: `api.__facets` vs `subsystem.find()`

| Aspect | `api.__facets['kind']` | `subsystem.find('kind')` |
|--------|------------------------|--------------------------|
| **When to use** | During hook execution | In facet methods |
| **Best for** | Required dependencies | Optional dependencies |
| **Timing** | At build time | At runtime (method call time) |
| **Performance** | Faster (direct access) | Slightly slower (method call) |
| **Flexibility** | Fixed at build time | Dynamic (works for facets installed later) |
| **Error handling** | Throws if not found (unless optional chaining) | Returns `undefined` if not found |

**Example combining both:**
```javascript
fn: (ctx, api, subsystem) => {
  // Required facet - use api.__facets during hook execution
  const queueFacet = api.__facets['queue'];
  
  return new Facet('custom', { attach: true, source: import.meta.url })
    .add({
      process() {
        // Use required facet (from closure)
        const message = queueFacet.selectNextMessage();
        
        // Optional facet - use subsystem.find() in method
        const statisticsFacet = subsystem.find('statistics');
        if (statisticsFacet) {
          statisticsFacet.recordMessageProcessed();
        }
        
        return message;
      }
    });
}
```

## See Also

- [Hooks Documentation](./HOOKS.md) - Complete guide to creating hooks and how they use the subsystem parameter
- [Hook Function Context](./HOOK-FUNCTION-CONTEXT.md) - Learn about the `ctx` parameter
- [Hook Function API Parameter](./HOOK-FUNCTION-API-PARAM.md) - Learn about the `api` parameter and `api.__facets`
- [Facets Documentation](./FACETS.md) - Understand how facets work and use the subsystem parameter
- [Facet Manager](./FACET-MANAGER.md) - Learn about FacetManager and facet access

