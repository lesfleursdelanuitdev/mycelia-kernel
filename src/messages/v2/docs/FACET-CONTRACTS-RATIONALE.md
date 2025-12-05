# Facet Contracts Rationale

## Introduction

This document explains the design decisions that led to the Facet Contracts system in the Mycelia Kernel. It describes the problem of needing to swap different implementations of the same functionality and how contracts provide build-time interface enforcement to ensure compatibility.

## The Discovery: Duplicate Functionality

### The Realization

During the development of the Mycelia Kernel, it became apparent that `useMessageProcessor` and `useSynchronous` were providing essentially the same functionality, but with different implementation strategies:

- **`useMessageProcessor`**: Standard asynchronous message processing with queuing and scheduling
- **`useSynchronous`**: Immediate synchronous message processing that bypasses the queue

Both hooks provided the same core interface:
- `accept(message, options)` - Accept a message
- `processMessage(pairOrMessage, options)` - Process a message
- `processTick()` - Process one tick
- `processImmediately(message, options)` - Process immediately

### The Problem

While both hooks provided the same functionality, there was no guarantee that:

1. **Interface Compatibility**: Both implementations would always have the same methods
2. **Method Signatures**: Method parameters and return types would match
3. **Behavioral Consistency**: Methods would behave in compatible ways
4. **Swappability**: One could be swapped for the other without breaking dependent code

**Without Contracts:**
```javascript
// useMessageProcessor implementation
subsystem.use(useMessageProcessor).build();
subsystem.processor.accept(message);  // ✅ Works

// useSynchronous implementation
subsystem.use(useSynchronous).build();
subsystem.synchronous.accept(message);  // ✅ Works

// But what if we want to swap them?
// How do we know they're compatible?
// What if one is missing a method?
// What if method signatures differ?
```

## The Need for Swappability

### Use Case: Different Processing Strategies

Different subsystems need different processing strategies:

```javascript
// Standard subsystem - needs async processing
const asyncSubsystem = new BaseSubsystem('async', { ms: messageSystem })
  .use(useMessageProcessor)  // Queues messages, uses scheduler
  .build();

// Synchronous subsystem - needs immediate processing
const syncSubsystem = new BaseSubsystem('sync', { ms: messageSystem })
  .use(useSynchronous)  // Processes immediately, no queue
  .build();
```

### The Challenge

The challenge was ensuring that code depending on processor functionality would work with **either** implementation:

```javascript
// Code that depends on processor functionality
function processMessage(subsystem, message) {
  // This code should work with BOTH implementations
  return await subsystem.processor.accept(message);
  // OR
  return await subsystem.synchronous.accept(message);
  
  // But how do we know they're compatible?
  // What if one is missing a method?
  // What if the signature is different?
}
```

### The Risk

Without interface enforcement, swapping implementations could break code:

```javascript
// Implementation A
subsystem.use(useMessageProcessor).build();
subsystem.processor.accept(message);  // ✅ Works

// Later, swap to Implementation B
subsystem.use(useSynchronous).build();
subsystem.synchronous.accept(message);  // ✅ Works

// But what if useSynchronous is missing processTick()?
// What if accept() has different parameters?
// What if return types differ?
// Code breaks at runtime, not build time!
```

## The Solution: Facet Contracts

### Core Insight

The solution was to create a **contract system** that:

1. **Defines Interfaces**: Specifies required methods and properties
2. **Enforces at Build Time**: Validates contracts during subsystem build
3. **Guarantees Compatibility**: Ensures all implementations satisfy the same contract
4. **Enables Swapping**: Allows safe swapping of implementations

### Contract Definition

A contract defines the interface that implementations must satisfy:

```javascript
// Processor Contract
export const processorContract = createFacetContract({
  name: 'processor',
  requiredMethods: [
    'accept',
    'processMessage',
    'processTick',
    'processImmediately'
  ],
  requiredProperties: [],
  validate: null
});
```

**What This Defines:**
- **Required Methods**: All processor implementations must have these methods
- **Method Signatures**: Methods must exist and be callable
- **Interface Guarantee**: Any implementation satisfying this contract is compatible

### Contract Implementation

Both hooks declare they implement the processor contract:

```javascript
// useMessageProcessor - Standard implementation
export const useMessageProcessor = createHook({
  kind: 'processor',
  contract: 'processor',  // Declares contract implementation
  fn: (ctx, api, subsystem) => {
    return new Facet('processor', {
      contract: 'processor'  // Also declare on facet
    })
    .add({
      async accept(message, options) { /* ... */ },
      async processMessage(pairOrMessage, options) { /* ... */ },
      async processTick() { /* ... */ },
      async processImmediately(message, options) { /* ... */ }
    });
  }
});

// useSynchronous - Alternative implementation
export const useSynchronous = createHook({
  kind: 'synchronous',
  contract: 'processor',  // Also implements processor contract
  fn: (ctx, api, subsystem) => {
    return new Facet('synchronous', {
      contract: 'processor'  // Implements processor contract
    })
    .add({
      async accept(message, options) { /* ... */ },
      async processMessage(pairOrMessage, options) { /* ... */ },
      async processTick() { /* ... */ },
      async processImmediately(message, options) { /* ... */ }
    });
  }
});
```

## Build-Time Enforcement

### The Build Process

Contracts are enforced during the subsystem build process, specifically during the **verification phase**:

```
Build Process:
  1. Verify Phase (Pure, No Side Effects)
     ├─► Resolve Dependencies
     ├─► Validate Contracts  ← Contract enforcement happens here
     └─► Check Requirements
  
  2. Execute Phase (Transactional)
     ├─► Create Facets
     ├─► Initialize Facets
     └─► Attach Facets
```

### Contract Validation

During the verify phase, the build system:

1. **Finds Contract Declarations**: Identifies hooks that declare contracts
2. **Loads Contract Definitions**: Retrieves contract specifications
3. **Validates Facet Methods**: Checks that all required methods exist
4. **Validates Facet Properties**: Checks that all required properties exist
5. **Runs Custom Validation**: Executes any custom validation functions
6. **Throws Errors Early**: Fails fast if contract is not satisfied

**Example Validation:**
```javascript
// Build subsystem with useMessageProcessor
subsystem.use(useMessageProcessor).build();

// During verify phase:
// ✅ Contract 'processor' declared
// ✅ Contract 'processor' loaded
// ✅ Facet has 'accept' method
// ✅ Facet has 'processMessage' method
// ✅ Facet has 'processTick' method
// ✅ Facet has 'processImmediately' method
// ✅ Contract satisfied - build continues

// If a method was missing:
// ❌ Facet missing 'processTick' method
// ❌ Contract 'processor' not satisfied
// ❌ Build fails with clear error message
```

### Early Error Detection

Contract enforcement happens **before** the subsystem is built, catching errors early:

```javascript
// ❌ Bad: Missing required method
export const useBrokenProcessor = createHook({
  contract: 'processor',
  fn: (ctx, api, subsystem) => {
    return new Facet('processor', { contract: 'processor' })
      .add({
        accept() { /* ... */ },
        processMessage() { /* ... */ },
        // Missing processTick() and processImmediately()
      });
  }
});

// Build fails immediately with clear error:
// Error: Facet 'processor' does not satisfy contract 'processor':
//   Missing required method: processTick
//   Missing required method: processImmediately
```

**Benefits:**
- ✅ Errors caught at build time, not runtime
- ✅ Clear error messages indicating what's missing
- ✅ Prevents broken subsystems from being created
- ✅ Saves debugging time

## Swappability Guarantee

### The Promise

When a hook declares a contract, it promises:

1. **Interface Compatibility**: All required methods and properties are present
2. **Method Availability**: Methods can be called safely
3. **Swappability**: Can be swapped with any other implementation of the same contract

### Safe Swapping

With contracts, swapping implementations is safe:

```javascript
// Original implementation
const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem })
  .use(useMessageProcessor)  // Standard async processor
  .build();

// Code that uses processor
async function handleMessage(subsystem, message) {
  // Works with useMessageProcessor
  return await subsystem.processor.accept(message);
}

// Later, swap to synchronous implementation
const subsystem2 = new BaseSubsystem('my-subsystem', { ms: messageSystem })
  .use(useSynchronous)  // Synchronous processor
  .build();

// Same code still works!
async function handleMessage(subsystem, message) {
  // Works with useSynchronous too
  // Contract guarantees accept() method exists
  return await subsystem.synchronous.accept(message);
}
```

### Contract-Based Access

Code can access processors by contract, not by implementation:

```javascript
// Find processor by contract (works with any implementation)
const processor = subsystem.find('processor');  // Finds useMessageProcessor
// OR
const processor = subsystem.find('synchronous');  // Finds useSynchronous

// Both satisfy the processor contract
// Both have accept(), processMessage(), processTick(), processImmediately()
// Code works with either!
```

## The Adapter Pattern

### What Are Adapters?

**Adapters** are hooks that implement a particular contract, providing alternative implementations of the same interface. The term "adapter" comes from the Adapter Pattern in software design, where different implementations are adapted to a common interface.

### Processor Contract Adapters

The processor contract has multiple adapters:

1. **`useMessageProcessor`** (Standard Adapter)
   - Asynchronous processing
   - Uses queue and scheduler
   - Standard message flow

2. **`useSynchronous`** (Alternative Adapter)
   - Synchronous processing
   - Bypasses queue and scheduler
   - Immediate message processing

Both adapters:
- ✅ Implement the same `processor` contract
- ✅ Provide the same interface (methods)
- ✅ Can be swapped safely
- ✅ Work with contract-dependent code

### Creating New Adapters

New adapters can be created by implementing the contract:

```javascript
// Custom processor adapter
export const useCustomProcessor = createHook({
  kind: 'custom-processor',
  contract: 'processor',  // Implements processor contract
  fn: (ctx, api, subsystem) => {
    return new Facet('custom-processor', {
      contract: 'processor'
    })
    .add({
      // Must implement all contract methods
      async accept(message, options) { /* Custom implementation */ },
      async processMessage(pairOrMessage, options) { /* Custom implementation */ },
      async processTick() { /* Custom implementation */ },
      async processImmediately(message, options) { /* Custom implementation */ }
    });
  }
});

// Build system validates contract at build time
// If any method is missing, build fails with clear error
```

## Benefits of Contracts

### 1. Interface Guarantees

Contracts guarantee that implementations have the expected interface:

```javascript
// Contract defines interface
const processorContract = {
  requiredMethods: ['accept', 'processMessage', 'processTick', 'processImmediately']
};

// All implementations must satisfy this
useMessageProcessor  // ✅ Has all methods
useSynchronous       // ✅ Has all methods
useCustomProcessor   // ✅ Has all methods (if implemented correctly)
```

### 2. Build-Time Validation

Errors are caught early, before runtime:

```javascript
// Build fails immediately if contract not satisfied
subsystem.use(useBrokenProcessor).build();
// Error: Contract 'processor' not satisfied: missing 'processTick'

// No need to wait for runtime errors
// No need to test every code path
// Clear error message tells you exactly what's wrong
```

### 3. Documentation

Contracts serve as documentation:

```javascript
// Contract documents expected interface
const processorContract = {
  name: 'processor',
  requiredMethods: [
    'accept',              // Accept a message
    'processMessage',       // Process a message
    'processTick',         // Process one tick
    'processImmediately'   // Process immediately
  ]
};

// Developers know exactly what methods must be implemented
// No guessing, no reading source code
// Contract is the source of truth
```

### 4. Swappability

Implementations can be swapped safely:

```javascript
// Swap implementations without breaking code
subsystem.use(useMessageProcessor).build();  // Works
subsystem.use(useSynchronous).build();       // Also works
subsystem.use(useCustomProcessor).build();   // Also works

// All satisfy the same contract
// All work with contract-dependent code
```

### 5. Type Safety

Contracts provide a form of type safety:

```javascript
// Contract ensures methods exist
const processor = subsystem.find('processor');
processor.accept(message);        // ✅ Guaranteed to exist
processor.processMessage(msg);   // ✅ Guaranteed to exist
processor.processTick();         // ✅ Guaranteed to exist
processor.processImmediately();  // ✅ Guaranteed to exist

// No need for defensive checks
// No need for optional chaining
// Contract guarantees methods are present
```

## Real-World Impact

### Before Contracts

```javascript
// No guarantee of compatibility
subsystem.use(useMessageProcessor).build();
subsystem.processor.accept(message);  // ✅ Works

// Swap implementation
subsystem.use(useSynchronous).build();
subsystem.synchronous.accept(message);  // ✅ Works (by luck)

// But what if useSynchronous was missing a method?
// What if method signatures differed?
// Code breaks at runtime, hard to debug
```

**Problems:**
- ❌ No interface guarantee
- ❌ Runtime errors
- ❌ Hard to debug
- ❌ No swappability guarantee

### After Contracts

```javascript
// Contract guarantees interface
subsystem.use(useMessageProcessor).build();
// ✅ Contract validated at build time
// ✅ All methods present
// ✅ Interface guaranteed

// Swap implementation
subsystem.use(useSynchronous).build();
// ✅ Contract validated at build time
// ✅ All methods present
// ✅ Interface guaranteed
// ✅ Safe to swap
```

**Benefits:**
- ✅ Interface guarantee
- ✅ Build-time errors
- ✅ Easy to debug
- ✅ Swappability guaranteed

## Summary

Facet Contracts were created to solve the problem of needing to swap different implementations of the same functionality. The key insights were:

1. **Discovery**: `useMessageProcessor` and `useSynchronous` provided the same functionality with different implementations
2. **Need**: Ability to swap implementations while ensuring code doesn't break
3. **Solution**: Contracts that enforce interfaces at build time
4. **Result**: Safe swappability, early error detection, and interface guarantees

The contract system provides:
- **Interface Definition**: Clear specification of required methods and properties
- **Build-Time Enforcement**: Validation during subsystem build
- **Swappability Guarantee**: Safe swapping of implementations
- **Early Error Detection**: Errors caught before runtime
- **Documentation**: Contracts serve as interface documentation

This enables the adapter pattern, where different hooks can implement the same contract, providing alternative implementations while maintaining compatibility.

## Related Documentation

- [Facet Contracts Overview](./FACET-CONTRACTS-OVERVIEW.md) - High-level overview of the facet contract system
- [Facet Contracts and Adapters](./FACET-CONTRACTS-AND-ADAPTERS.md) - Understanding adapters as contract implementations
- [Facet Contract Enforcement](./FACET-CONTRACT-ENFORCEMENT.md) - How contracts are enforced during the build process
- [Facet Contract](./FACET-CONTRACT.md) - Creating and using facet contracts for validation
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Managing and enforcing contracts through the registry
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [useMessageProcessor Hook](./hooks/message-processor/USE-MESSAGE-PROCESSOR.md) - Standard processor implementation
- [useSynchronous Hook](./hooks/synchronous/USE-SYNCHRONOUS.md) - Synchronous processor adapter





