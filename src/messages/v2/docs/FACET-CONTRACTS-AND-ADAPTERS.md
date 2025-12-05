# Facet Contracts and Adapters

## Overview

In the Mycelia Kernel, **adapters** are hooks that implement a particular contract. This pattern allows different implementations of the same interface to be swapped in and out, providing flexibility and enabling alternative implementations while maintaining compatibility.

## What are Adapters?

An **Adapter** is a hook that implements a specific contract, providing an alternative implementation of that contract's interface. Adapters allow you to:

- **Swap Implementations**: Replace one implementation with another that satisfies the same contract
- **Provide Alternatives**: Offer different approaches to the same functionality
- **Maintain Compatibility**: Ensure all implementations work with contract-dependent code
- **Enable Flexibility**: Choose the best implementation for your use case

## The Adapter Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Pattern                        │
└─────────────────────────────────────────────────────────────┘

Contract (Interface Definition)
  │
  │ Defines required methods/properties
  │
  ├─► Hook 1 (Implementation A)
  │   └─► Facet A (satisfies contract)
  │
  └─► Hook 2 (Adapter - Implementation B)
      └─► Facet B (satisfies contract)

Both facets satisfy the same contract
Both can be used interchangeably
```

## Key Concept: Contract Implementation

When a hook declares a `contract`, it commits to implementing all required methods and properties defined by that contract. The build system validates this during the verification phase.

### Contract Declaration

```javascript
export const useAdapter = createHook({
  kind: 'adapter-kind',
  contract: 'contract-name',  // Declares contract implementation
  fn: (ctx, api, subsystem) => {
    return new Facet('adapter-kind', {
      contract: 'contract-name'  // Also declare on facet
    })
    .add({
      // Must implement all contract methods
      requiredMethod1() { /* ... */ },
      requiredMethod2() { /* ... */ }
    });
  }
});
```

## Example: Processor Contract Adapters

The `processor` contract is a perfect example of the adapter pattern. Multiple hooks implement this contract, providing different processing strategies.

### Processor Contract

The processor contract requires:
- `accept(message, options)` - Accept a message
- `processMessage(pairOrMessage, options)` - Process a message
- `processTick()` - Process one tick
- `processImmediately(message, options)` - Process immediately

### Standard Processor Implementation

`useMessageProcessor` provides the standard asynchronous processor implementation:

```javascript
export const useMessageProcessor = createHook({
  kind: 'processor',
  contract: 'processor',  // Implements processor contract
  required: ['statistics', 'listeners', 'queries', 'router', 'queue'],
  fn: (ctx, api, subsystem) => {
    // Standard async processing with queue and scheduler
    return new Facet('processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        // Enqueue message for later processing
        // ...
      },
      async processMessage(pairOrMessage, options) {
        // Process through queue and scheduler
        // ...
      },
      async processTick() {
        // Process one message from queue
        // ...
      },
      async processImmediately(message, options) {
        // Process immediately (for queries)
        // ...
      }
    });
  }
});
```

### Synchronous Processor Adapter

`useSynchronous` provides an alternative synchronous processor implementation:

```javascript
export const useSynchronous = createHook({
  kind: 'synchronous',
  contract: 'processor',  // Also implements processor contract
  required: ['processor', 'statistics', 'listeners', 'queries'],
  fn: (ctx, api, subsystem) => {
    // Get underlying processor for delegation
    const processorFacet = api.__facets.processor;
    
    // Synchronous adapter - processes immediately
    return new Facet('synchronous', {
      contract: 'processor'  // Implements processor contract
    })
    .add({
      async accept(message, options) {
        // Process immediately, bypass queue
        message.meta.processImmediately = true;
        return await processorFacet.processImmediately(message, options);
      },
      async processMessage(pairOrMessage, options) {
        // Delegate to underlying processor
        return await processorFacet.processMessage(pairOrMessage, options);
      },
      async processTick() {
        // Delegate to underlying processor
        return await processorFacet.processTick();
      },
      async processImmediately(message, options) {
        // Delegate to underlying processor
        return await processorFacet.processImmediately(message, options);
      }
    });
  }
});
```

**Key Differences:**
- **Standard Processor**: Queues messages, uses scheduler, processes asynchronously
- **Synchronous Adapter**: Processes immediately, bypasses queue, no scheduler needed

**Both satisfy the processor contract**, so they can be used interchangeably where a processor is expected.

## Creating an Adapter

### Step 1: Understand the Contract

First, understand what the contract requires:

```javascript
// Processor contract requires:
// - accept(message, options)
// - processMessage(pairOrMessage, options)
// - processTick()
// - processImmediately(message, options)
```

### Step 2: Create the Adapter Hook

Create a hook that implements the contract:

```javascript
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';

export const useCustomProcessor = createHook({
  kind: 'custom-processor',
  contract: 'processor',  // Declare contract
  required: ['statistics'],  // Dependencies
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.customProcessor || {};
    
    // Custom implementation
    return new Facet('custom-processor', {
      attach: true,
      contract: 'processor'  // Also declare on facet
    })
    .add({
      // Implement all contract methods
      async accept(message, options) {
        // Custom accept implementation
        // ...
      },
      
      async processMessage(pairOrMessage, options) {
        // Custom process implementation
        // ...
      },
      
      async processTick() {
        // Custom tick implementation
        // ...
      },
      
      async processImmediately(message, options) {
        // Custom immediate implementation
        // ...
      }
    });
  }
});
```

### Step 3: Use the Adapter

Use the adapter instead of the standard implementation:

```javascript
// Standard processor
subsystem
  .use(useMessageProcessor)
  .build();

// OR use adapter
subsystem
  .use(useCustomProcessor)
  .build();

// Both work the same way from the subsystem's perspective
await subsystem.accept(message);
await subsystem.process(timeSlice);
```

## Adapter Patterns

### Pattern 1: Delegation Adapter

An adapter that delegates to another implementation while adding behavior:

```javascript
export const useEnhancedProcessor = createHook({
  kind: 'enhanced-processor',
  contract: 'processor',
  required: ['processor'],  // Requires standard processor
  fn: (ctx, api, subsystem) => {
    const baseProcessor = api.__facets.processor;
    
    return new Facet('enhanced-processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        // Add logging before delegating
        console.log('Accepting message:', message.id);
        return await baseProcessor.accept(message, options);
      },
      
      async processMessage(pairOrMessage, options) {
        // Add metrics before delegating
        const start = Date.now();
        const result = await baseProcessor.processMessage(pairOrMessage, options);
        const duration = Date.now() - start;
        // Record metrics
        return result;
      },
      
      // Delegate other methods
      async processTick() {
        return await baseProcessor.processTick();
      },
      
      async processImmediately(message, options) {
        return await baseProcessor.processImmediately(message, options);
      }
    });
  }
});
```

### Pattern 2: Alternative Implementation Adapter

An adapter that provides a completely different implementation:

```javascript
export const useBatchProcessor = createHook({
  kind: 'batch-processor',
  contract: 'processor',
  required: ['queue', 'statistics'],
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.batchProcessor || {};
    const batchSize = config.batchSize || 10;
    
    let messageBatch = [];
    
    return new Facet('batch-processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        // Collect messages into batch
        messageBatch.push(message);
        
        // Process batch when full
        if (messageBatch.length >= batchSize) {
          return await this.processBatch();
        }
        
        return { accepted: true };
      },
      
      async processBatch() {
        const batch = messageBatch.splice(0, batchSize);
        // Process entire batch
        const results = await Promise.all(
          batch.map(msg => this.processMessage(msg))
        );
        return { processed: results.length };
      },
      
      async processMessage(pairOrMessage, options) {
        // Process single message
        // ...
      },
      
      async processTick() {
        // Process batch if ready
        if (messageBatch.length > 0) {
          return await this.processBatch();
        }
        return null;
      },
      
      async processImmediately(message, options) {
        // Process immediately (bypass batching)
        return await this.processMessage(message, options);
      }
    });
  }
});
```

### Pattern 3: Wrapper Adapter

An adapter that wraps another implementation with additional functionality:

```javascript
export const useCachedProcessor = createHook({
  kind: 'cached-processor',
  contract: 'processor',
  required: ['processor'],
  fn: (ctx, api, subsystem) => {
    const baseProcessor = api.__facets.processor;
    const cache = new Map();
    
    return new Facet('cached-processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        // Check cache first
        const cacheKey = message.path + JSON.stringify(message.payload);
        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }
        
        // Process and cache result
        const result = await baseProcessor.accept(message, options);
        cache.set(cacheKey, result);
        return result;
      },
      
      // Delegate other methods
      async processMessage(pairOrMessage, options) {
        return await baseProcessor.processMessage(pairOrMessage, options);
      },
      
      async processTick() {
        return await baseProcessor.processTick();
      },
      
      async processImmediately(message, options) {
        return await baseProcessor.processImmediately(message, options);
      }
    });
  }
});
```

## Contract Validation

The build system automatically validates that adapters satisfy their declared contracts:

### Validation Process

1. **Contract Lookup**: Contract is looked up from registry by name
2. **Method Validation**: Checks all required methods exist and are functions
3. **Property Validation**: Checks all required properties exist
4. **Custom Validation**: Runs custom validation function if provided
5. **Error on Failure**: Throws descriptive error if validation fails

### Validation Errors

If an adapter doesn't satisfy the contract, the build fails with a clear error:

```
FacetContract 'processor': facet is missing required methods: processImmediately
```

This ensures adapters are correct before the subsystem is built.

## Swapping Adapters

Adapters can be swapped by using different hooks:

### Example: Swapping Processor Implementations

```javascript
// Option 1: Standard async processor
const subsystem1 = new BaseSubsystem('async-subsystem', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useMessageProcessor
});

// Option 2: Synchronous processor adapter
const subsystem2 = new BaseSubsystem('sync-subsystem', {
  ms: messageSystem
});

subsystem2
  .use(useMessageProcessor)  // Still need base processor
  .use(useSynchronous)       // Override with synchronous adapter
  .build();

// Both subsystems work the same way
await subsystem1.accept(message);
await subsystem2.accept(message);
```

### Example: Custom Adapter

```javascript
// Use custom batch processor adapter
const subsystem = new BaseSubsystem('batch-subsystem', {
  ms: messageSystem
});

subsystem
  .use(useBatchProcessor)  // Custom adapter
  .build();

// Works with all processor-dependent code
await subsystem.accept(message);
```

## Benefits of Adapters

### 1. Flexibility

Different implementations can be chosen based on requirements:

- **Performance**: Choose faster implementation
- **Features**: Choose implementation with needed features
- **Constraints**: Choose implementation that fits constraints

### 2. Compatibility

All adapters work with contract-dependent code:

```javascript
// This code works with any processor adapter
function processMessages(subsystem) {
  // Works with useMessageProcessor, useSynchronous, useBatchProcessor, etc.
  return subsystem.processor.accept(message);
}
```

### 3. Testability

Adapters enable easy testing with mock implementations:

```javascript
// Test adapter
export const useMockProcessor = createHook({
  kind: 'mock-processor',
  contract: 'processor',
  fn: (ctx, api, subsystem) => {
    return new Facet('mock-processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        // Mock implementation for testing
        return { accepted: true, mocked: true };
      },
      // ... other methods
    });
  }
});

// Use in tests
const testSubsystem = new BaseSubsystem('test', { ms: messageSystem });
testSubsystem.use(useMockProcessor).build();
```

### 4. Extensibility

New implementations can be added without changing existing code:

```javascript
// New adapter doesn't break existing code
export const useOptimizedProcessor = createHook({
  kind: 'optimized-processor',
  contract: 'processor',
  // New optimized implementation
});
```

## Best Practices

### 1. Document Contract Requirements

Clearly document what the contract requires:

```javascript
/**
 * Processor Contract Adapter
 * 
 * Implements the processor contract which requires:
 * - accept(message, options)
 * - processMessage(pairOrMessage, options)
 * - processTick()
 * - processImmediately(message, options)
 */
export const useCustomProcessor = createHook({
  // ...
});
```

### 2. Implement All Contract Methods

Ensure all required methods are implemented:

```javascript
// ❌ Bad: Missing processImmediately
.add({
  accept() { /* ... */ },
  processMessage() { /* ... */ },
  processTick() { /* ... */ }
  // Missing processImmediately!
});

// ✅ Good: All methods implemented
.add({
  accept() { /* ... */ },
  processMessage() { /* ... */ },
  processTick() { /* ... */ },
  processImmediately() { /* ... */ }
});
```

### 3. Maintain Contract Semantics

Implement methods with the same semantics as the contract:

```javascript
// ✅ Good: Maintains contract semantics
async accept(message, options) {
  // Accepts message (may queue or process immediately)
  return await this.enqueue(message);
}

// ❌ Bad: Changes semantics
async accept(message, options) {
  // This doesn't "accept" - it rejects!
  throw new Error('Rejected');
}
```

### 4. Test Contract Compliance

Test that your adapter satisfies the contract:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Test adapter
const adapter = useCustomProcessor(ctx, api, subsystem);
const facet = adapter;

// Validate contract
defaultContractRegistry.enforce('processor', ctx, api, subsystem, facet);
// Throws if contract not satisfied
```

### 5. Use Descriptive Names

Name adapters to indicate they're alternative implementations:

```javascript
// ✅ Good: Clear it's an adapter
useSynchronousProcessor
useBatchProcessor
useCachedProcessor

// ❌ Bad: Unclear it's an adapter
useProcessor2
useNewProcessor
useBetterProcessor
```

## Real-World Examples

### Example 1: Synchronous vs Asynchronous Processing

```javascript
// Standard async processor
const asyncSubsystem = new BaseSubsystem('async', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // useMessageProcessor
});

// Synchronous adapter
const syncSubsystem = new BaseSubsystem('sync', {
  ms: messageSystem
});

syncSubsystem
  .use(useMessageProcessor)
  .use(useSynchronous)  // Adapter that implements processor contract
  .build();

// Both work the same way
await asyncSubsystem.accept(message);  // Queued
await syncSubsystem.accept(message);   // Immediate
```

### Example 2: Custom Router Adapter

```javascript
// Custom router adapter implementing router contract
export const useCustomRouter = createHook({
  kind: 'custom-router',
  contract: 'router',
  fn: (ctx, api, subsystem) => {
    // Custom routing implementation
    return new Facet('custom-router', {
      contract: 'router'
    })
    .add({
      registerRoute(pattern, handler, options) {
        // Custom registration logic
      },
      match(path) {
        // Custom matching logic
      },
      route(message, options) {
        // Custom routing logic
      },
      // ... other router contract methods
    });
  }
});
```

### Example 3: Testing Adapter

```javascript
// Mock adapter for testing
export const useTestProcessor = createHook({
  kind: 'test-processor',
  contract: 'processor',
  fn: (ctx, api, subsystem) => {
    const calls = [];
    
    return new Facet('test-processor', {
      contract: 'processor'
    })
    .add({
      async accept(message, options) {
        calls.push({ method: 'accept', message, options });
        return { accepted: true, test: true };
      },
      
      async processMessage(pairOrMessage, options) {
        calls.push({ method: 'processMessage', pairOrMessage, options });
        return { processed: true, test: true };
      },
      
      async processTick() {
        calls.push({ method: 'processTick' });
        return null;
      },
      
      async processImmediately(message, options) {
        calls.push({ method: 'processImmediately', message, options });
        return { processed: true, test: true };
      },
      
      // Test helper
      getCalls() {
        return calls;
      },
      
      clearCalls() {
        calls.length = 0;
      }
    });
  }
});
```

## Related Documentation

- [Facet Contract](./FACET-CONTRACT.md) - Creating and using facet contracts
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Managing contracts through the registry
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default contracts
- [Hooks](./hooks/HOOKS.md) - Understanding hooks and how they work
- [Facets](./hooks/FACETS.md) - Understanding facets and contract implementation
- [useSynchronous](./hooks/synchronous/USE-SYNCHRONOUS.md) - Synchronous processor adapter example
- [useMessageProcessor](./hooks/message-processor/USE-MESSAGE-PROCESSOR.md) - Standard processor implementation





