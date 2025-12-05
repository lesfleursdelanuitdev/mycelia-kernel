# Facet Contracts Overview

## Introduction

Facet contracts are a validation system in the Mycelia Kernel that ensure facets implement the expected interface. Contracts define required methods and properties, provide runtime validation, and enable the adapter pattern where different hooks can implement the same contract interface.

## What are Facet Contracts?

A **Facet Contract** is a specification that defines:

- **Required Methods**: Methods that must be implemented on the facet
- **Required Properties**: Properties that must exist on the facet
- **Custom Validation**: Optional validation function for additional checks

Contracts provide:
- **Interface Definition**: Clear specification of what a facet must implement
- **Runtime Validation**: Automatic validation during subsystem build
- **Type Safety**: Ensures facets match expected interfaces
- **Adapter Support**: Enables multiple implementations of the same contract

## Why Contracts?

### Problem Solved

Without contracts, it's difficult to ensure that:
- Facets implement all required methods
- Different implementations are compatible
- Adapters can be swapped safely
- Integration errors are caught early

### Solution

Contracts provide:
- **Early Validation**: Errors caught during build, not runtime
- **Interface Guarantees**: Ensures facets match expected interface
- **Adapter Compatibility**: Multiple implementations can satisfy the same contract
- **Documentation**: Contracts document expected interfaces

## Contract Components

### Required Methods

Methods that must be implemented on the facet:

```javascript
const processorContract = createFacetContract({
  name: 'processor',
  requiredMethods: [
    'accept',
    'processMessage',
    'processTick',
    'processImmediately'
  ]
});
```

**Validation:**
- Checks method exists
- Checks method is a function
- Throws error if missing

### Required Properties

Properties that must exist on the facet:

```javascript
const queueContract = createFacetContract({
  name: 'queue',
  requiredProperties: [
    '_queueManager',
    'queue'
  ]
});
```

**Validation:**
- Checks property exists (using `in` operator)
- Checks property is not `undefined`
- Throws error if missing

### Custom Validation

Optional validation function for complex checks:

```javascript
const queueContract = createFacetContract({
  name: 'queue',
  requiredMethods: ['selectNextMessage'],
  requiredProperties: ['_queueManager'],
  validate: (ctx, api, subsystem, facet) => {
    // Validate internal structure
    if (typeof facet._queueManager !== 'object') {
      throw new Error('Queue facet _queueManager must be an object');
    }
    if (typeof facet._queueManager.enqueue !== 'function') {
      throw new Error('Queue facet _queueManager must have enqueue method');
    }
  }
});
```

## Contract Registry

The **FacetContractRegistry** manages contracts:

### Default Registry

The system provides a default registry with standard contracts:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Check if contract exists
if (defaultContractRegistry.has('router')) {
  // Contract is available
}

// Enforce a contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

**Pre-registered Contracts:**
- `'router'` - Router facet contract
- `'queue'` - Queue facet contract
- `'processor'` - Processor facet contract
- `'listeners'` - Listeners facet contract
- `'hierarchy'` - Hierarchy facet contract
- `'scheduler'` - Scheduler facet contract

### Registry Operations

```javascript
// Register a contract
registry.register(contract);

// Check if contract exists
registry.has('contract-name');

// Get contract
const contract = registry.get('contract-name');

// Enforce contract
registry.enforce('contract-name', ctx, api, subsystem, facet);

// List all contracts
const names = registry.list();
```

## Contract Declaration

### In Hooks

Hooks declare contracts using the `contract` parameter:

```javascript
export const useRouter = createHook({
  kind: 'router',
  contract: 'router',  // Declare contract
  fn: (ctx, api, subsystem) => {
    return new Facet('router', {
      contract: 'router'  // Also declare on facet
    })
    .add({
      // Must implement all contract methods
      registerRoute() { /* ... */ },
      match() { /* ... */ },
      route() { /* ... */ }
    });
  }
});
```

### In Facets

Facets also declare contracts in their constructor:

```javascript
return new Facet('router', {
  contract: 'router'  // Contract name (string)
})
.add({
  // Contract methods and properties
});
```

**Important:**
- Contract name is a **string**, not a contract object
- Contract is looked up from registry during validation
- Both hook and facet should declare the same contract

## Contract Enforcement

Contracts are enforced during the **verification phase** of the build process:

### Enforcement Timing

```
Build Process:
  1. Execute hooks → Create facets
  2. Collect facets
  3. Enforce contracts ← HERE (verification phase)
  4. Build dependency graph
  5. Topological sort
  6. Create build plan
```

### Enforcement Process

1. **Facet Collection**: All facets collected after hook execution
2. **Contract Extraction**: Contract name retrieved from each facet
3. **Registry Lookup**: Contract looked up in registry
4. **Validation**: Contract enforced on facet
5. **Error Handling**: Build fails if validation fails

### Validation Steps

For each facet with a contract:

1. **Method Validation**: Check all required methods exist and are functions
2. **Property Validation**: Check all required properties exist
3. **Custom Validation**: Run custom validation function if provided

**All validation happens before any facets are initialized.**

## Adapters and Contracts

### What are Adapters?

**Adapters** are hooks that implement a particular contract, providing alternative implementations:

```javascript
// Standard processor implementation
export const useMessageProcessor = createHook({
  kind: 'processor',
  contract: 'processor',  // Implements processor contract
  // ...
});

// Synchronous processor adapter
export const useSynchronous = createHook({
  kind: 'synchronous',
  contract: 'processor',  // Also implements processor contract
  // ...
});
```

### Adapter Benefits

- **Swappable Implementations**: Different hooks can implement the same contract
- **Compatibility**: All adapters work with contract-dependent code
- **Flexibility**: Choose the best implementation for your use case
- **Testing**: Easy to create mock adapters for testing

### Example: Processor Adapters

Both `useMessageProcessor` and `useSynchronous` implement the `processor` contract:

```javascript
// Standard async processor
const asyncSubsystem = new BaseSubsystem('async', {
  ms: messageSystem,
  defaultHooks: createCanonicalDefaultHooks()  // Includes useMessageProcessor
});

// Synchronous processor adapter
const syncSubsystem = new BaseSubsystem('sync', {
  ms: messageSystem
});

syncSubsystem
  .use(useMessageProcessor)  // Base processor
  .use(useSynchronous)       // Adapter (also implements processor contract)
  .build();

// Both work the same way
await asyncSubsystem.accept(message);  // Queued
await syncSubsystem.accept(message);   // Immediate
```

## Contract Lifecycle

### 1. Contract Creation

Contracts are created and registered:

```javascript
const routerContract = createFacetContract({
  name: 'router',
  requiredMethods: ['registerRoute', 'match', 'route'],
  requiredProperties: ['_routeRegistry']
});

// Register in registry
defaultContractRegistry.register(routerContract);
```

### 2. Contract Declaration

Hooks and facets declare contracts:

```javascript
export const useRouter = createHook({
  contract: 'router',  // Declare contract
  // ...
});
```

### 3. Contract Enforcement

Contracts are enforced during build:

```javascript
// During verifySubsystemBuild()
validateFacets(facetsByKind, resolvedCtx, subsystem, defaultContractRegistry);
```

### 4. Contract Validation

Validation checks methods, properties, and custom validation:

```javascript
contract.enforce(ctx, api, subsystem, facet);
// Validates: methods, properties, custom validation
```

## Error Handling

### Contract Not Registered

**Error:**
```
Facet 'custom-processor' (from file:///path/to/hook.js) has contract 'processor' 
which is not registered in the contract registry.
```

**Fix:** Register the contract in the registry

### Missing Required Methods

**Error:**
```
Facet 'processor' (from file:///path/to/hook.js) failed contract validation 
for 'processor': FacetContract 'processor': facet is missing required methods: processImmediately
```

**Fix:** Implement all required methods

### Missing Required Properties

**Error:**
```
Facet 'queue' (from file:///path/to/hook.js) failed contract validation 
for 'queue': FacetContract 'queue': facet is missing required properties: _queueManager
```

**Fix:** Add all required properties

### Custom Validation Failure

**Error:**
```
Facet 'queue' (from file:///path/to/hook.js) failed contract validation 
for 'queue': FacetContract 'queue': validation failed: Queue facet _queueManager must be an object
```

**Fix:** Fix the issue identified by custom validation

## Benefits

### 1. Early Error Detection

Contracts are validated during build, not runtime:

- **Fail-Fast**: Errors caught before initialization
- **No Side Effects**: Validation happens in pure verification phase
- **Clear Errors**: Descriptive error messages identify issues

### 2. Interface Guarantees

Contracts ensure facets match expected interfaces:

- **Method Guarantees**: All required methods are present
- **Property Guarantees**: All required properties exist
- **Type Safety**: Methods are functions, properties exist

### 3. Adapter Support

Contracts enable the adapter pattern:

- **Multiple Implementations**: Different hooks can implement the same contract
- **Swappable**: Adapters can be swapped without breaking code
- **Compatible**: All adapters work with contract-dependent code

### 4. Documentation

Contracts document expected interfaces:

- **Clear Specification**: Contracts define what facets must implement
- **Self-Documenting**: Contract names and requirements are explicit
- **Reference**: Contracts serve as interface documentation

## Usage Patterns

### Pattern 1: Standard Contract Implementation

```javascript
export const useRouter = createHook({
  kind: 'router',
  contract: 'router',
  fn: (ctx, api, subsystem) => {
    return new Facet('router', {
      contract: 'router'
    })
    .add({
      // Implement all contract methods
      registerRoute() { /* ... */ },
      match() { /* ... */ },
      route() { /* ... */ }
    });
  }
});
```

### Pattern 2: Adapter Implementation

```javascript
export const useSynchronous = createHook({
  kind: 'synchronous',
  contract: 'processor',  // Implements processor contract
  required: ['processor'],
  fn: (ctx, api, subsystem) => {
    const baseProcessor = api.__facets.processor;
    
    return new Facet('synchronous', {
      contract: 'processor'  // Also implements processor contract
    })
    .add({
      // Implement all contract methods (delegating to base)
      async accept(message, options) {
        return await baseProcessor.processImmediately(message, options);
      },
      // ... other methods
    });
  }
});
```

### Pattern 3: Custom Contract

```javascript
// Create custom contract
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process', 'getStatus'],
  requiredProperties: ['_service']
});

// Register contract
defaultContractRegistry.register(customContract);

// Use in hook
export const useCustom = createHook({
  kind: 'custom',
  contract: 'custom',
  fn: (ctx, api, subsystem) => {
    return new Facet('custom', {
      contract: 'custom'
    })
    .add({
      process() { /* ... */ },
      getStatus() { /* ... */ },
      _service: service
    });
  }
});
```

## Best Practices

### 1. Name Contracts After Facet Kinds

Use the same name as the facet kind:

```javascript
// ✅ Good
contract: 'router'  // Matches kind: 'router'

// ❌ Bad
contract: 'routing'  // Doesn't match kind
```

### 2. Declare Contracts Consistently

Declare contracts on both hook and facet:

```javascript
export const useRouter = createHook({
  contract: 'router',  // Declare on hook
  fn: (ctx, api, subsystem) => {
    return new Facet('router', {
      contract: 'router'  // Also declare on facet
    });
  }
});
```

### 3. Implement All Requirements

Ensure all required methods and properties are implemented:

```javascript
// ✅ Good: All methods implemented
.add({
  registerRoute() { /* ... */ },
  match() { /* ... */ },
  route() { /* ... */ },
  unregisterRoute() { /* ... */ },
  hasRoute() { /* ... */ },
  getRoutes() { /* ... */ }
});

// ❌ Bad: Missing methods
.add({
  registerRoute() { /* ... */ },
  match() { /* ... */ }
  // Missing: route, unregisterRoute, hasRoute, getRoutes
});
```

### 4. Use Custom Validation for Complex Checks

Use custom validation for checks beyond simple existence:

```javascript
validate: (ctx, api, subsystem, facet) => {
  // Validate internal structure
  if (typeof facet._queueManager !== 'object') {
    throw new Error('Queue facet _queueManager must be an object');
  }
  if (typeof facet._queueManager.enqueue !== 'function') {
    throw new Error('Queue facet _queueManager must have enqueue method');
  }
}
```

### 5. Register Custom Contracts Early

Register custom contracts before they're needed:

```javascript
// Register before building subsystems
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process']
});

defaultContractRegistry.register(customContract);

// Now can use in hooks
subsystem.use(useCustom).build();
```

## Related Documentation

- [Facet Contracts and Adapters](./FACET-CONTRACTS-AND-ADAPTERS.md) - Understanding adapters as contract implementations
- [Facet Contract Enforcement](./FACET-CONTRACT-ENFORCEMENT.md) - How contracts are enforced during the build process
- [Facet Contract](./FACET-CONTRACT.md) - Creating and using facet contracts for validation
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Managing contracts through the registry
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Hooks and Facets Overview](./hooks/HOOKS-AND-FACETS-OVERVIEW.md) - Understanding hooks and facets
- [How Builder Works](./HOW-BUILDER-WORKS.md) - Build process details





