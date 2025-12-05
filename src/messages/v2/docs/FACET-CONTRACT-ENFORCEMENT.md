# Facet Contract Enforcement

## Overview

Facet contract enforcement is the process by which the build system validates that facets satisfy their declared contracts. This validation occurs during the **verification phase** of the build process, ensuring that all contract requirements are met before any facets are initialized or attached to subsystems.

## When Contracts Are Enforced

Contract enforcement happens during the **verification phase** (`verifySubsystemBuild`), which is:

- **Pure**: No side effects
- **Early**: Before any facets are initialized
- **Complete**: All facets are validated before execution
- **Fail-Fast**: Build fails immediately if any contract is violated

### Build Process Timeline

```
┌─────────────────────────────────────────────────────────────┐
│              Contract Enforcement Timeline                 │
└─────────────────────────────────────────────────────────────┘

1. Hook Execution
   │  Hooks create facets
   │
   ▼
2. Facet Collection
   │  All facets collected in facetsByKind
   │
   ▼
3. Contract Enforcement ← HERE
   │  validateFacets() called
   │  All contracts validated
   │
   ▼
4. Dependency Graph Building
   │  Dependencies resolved
   │
   ▼
5. Topological Sort
   │  Initialization order determined
   │
   ▼
6. Build Plan Created
   │  Plan ready for execution
```

## Enforcement Process

### Step 1: Facet Collection

After all hooks are executed and facets are created, they are collected in the `facetsByKind` object:

```javascript
const facetsByKind = {
  'router': routerFacet,
  'queue': queueFacet,
  'processor': processorFacet,
  // ...
};
```

### Step 2: Contract Validation

The `validateFacets()` function is called to enforce all contracts:

```javascript
// In verifySubsystemBuild()
validateFacets(facetsByKind, resolvedCtx, subsystem, defaultContractRegistry);
```

### Step 3: Iteration Through Facets

For each facet in `facetsByKind`:

```javascript
function validateFacets(facetsByKind, resolvedCtx, subsystem, contractRegistry) {
  for (const [kind, facet] of Object.entries(facetsByKind)) {
    // Process each facet...
  }
}
```

### Step 4: Contract Name Extraction

The facet's contract name is retrieved:

```javascript
const contractName = facet.getContract?.();

// Skip if facet has no contract
if (!contractName || typeof contractName !== 'string' || !contractName.trim()) {
  continue;  // No contract to enforce
}
```

**Contract Name Source:**
- Set when facet is created: `new Facet('kind', { contract: 'contract-name' })`
- Retrieved via: `facet.getContract()`

### Step 5: Registry Lookup

The contract registry is checked to ensure the contract exists:

```javascript
// Check if contract exists in registry
if (!contractRegistry.has(contractName)) {
  const facetSource = facet.getSource?.() || '<unknown>';
  throw new Error(
    `Facet '${kind}' (from ${facetSource}) has contract '${contractName}' ` +
    `which is not registered in the contract registry.`
  );
}
```

**Error if:**
- Contract name is declared but not registered
- Contract name is misspelled
- Contract was never registered

### Step 6: Contract Enforcement

The contract is enforced via the registry:

```javascript
try {
  contractRegistry.enforce(contractName, resolvedCtx, subsystem.api, subsystem, facet);
} catch (error) {
  const facetSource = facet.getSource?.() || '<unknown>';
  throw new Error(
    `Facet '${kind}' (from ${facetSource}) failed contract validation ` +
    `for '${contractName}': ${error.message}`
  );
}
```

## Contract Enforcement Details

### Registry Enforcement

The registry's `enforce()` method looks up the contract and delegates to it:

```javascript
// In FacetContractRegistry.enforce()
enforce(name, ctx, api, subsystem, facet) {
  const contract = this.#contracts.get(name);
  if (!contract) {
    throw new Error(`FacetContractRegistry.enforce: no contract found for name '${name}'`);
  }
  
  // Delegate to contract's enforce method
  contract.enforce(ctx, api, subsystem, facet);
}
```

### Contract Enforcement

The contract's `enforce()` method performs the actual validation:

```javascript
// In FacetContract.enforce()
enforce(ctx, api, subsystem, facet) {
  // 1. Validate facet is an object
  if (!facet || typeof facet !== 'object') {
    throw new Error(`FacetContract '${this.name}': facet must be an object`);
  }

  // 2. Check required methods
  const missingMethods = [];
  for (const methodName of this.requiredMethods) {
    if (typeof facet[methodName] !== 'function') {
      missingMethods.push(methodName);
    }
  }

  if (missingMethods.length > 0) {
    throw new Error(
      `FacetContract '${this.name}': facet is missing required methods: ` +
      `${missingMethods.join(', ')}`
    );
  }

  // 3. Check required properties
  const missingProperties = [];
  for (const propertyName of this.requiredProperties) {
    if (!(propertyName in facet) || facet[propertyName] === undefined) {
      missingProperties.push(propertyName);
    }
  }

  if (missingProperties.length > 0) {
    throw new Error(
      `FacetContract '${this.name}': facet is missing required properties: ` +
      `${missingProperties.join(', ')}`
    );
  }

  // 4. Run custom validation
  if (this.#validate !== null) {
    try {
      this.#validate(ctx, api, subsystem, facet);
    } catch (error) {
      throw new Error(
        `FacetContract '${this.name}': validation failed: ${error.message}`
      );
    }
  }
}
```

## Validation Steps

### 1. Method Validation

Checks that all required methods exist and are functions:

```javascript
// Required methods: ['accept', 'processMessage', 'processTick']
for (const methodName of this.requiredMethods) {
  if (typeof facet[methodName] !== 'function') {
    missingMethods.push(methodName);
  }
}
```

**Validates:**
- Method exists on facet
- Method is a function (not a property)

**Example Error:**
```
FacetContract 'processor': facet is missing required methods: processImmediately
```

### 2. Property Validation

Checks that all required properties exist:

```javascript
// Required properties: ['_routeRegistry', 'queue']
for (const propertyName of this.requiredProperties) {
  if (!(propertyName in facet) || facet[propertyName] === undefined) {
    missingProperties.push(propertyName);
  }
}
```

**Validates:**
- Property exists on facet (using `in` operator)
- Property is not `undefined`

**Example Error:**
```
FacetContract 'queue': facet is missing required properties: _queueManager, queue
```

### 3. Custom Validation

Runs custom validation function if provided:

```javascript
if (this.#validate !== null) {
  try {
    this.#validate(ctx, api, subsystem, facet);
  } catch (error) {
    throw new Error(
      `FacetContract '${this.name}': validation failed: ${error.message}`
    );
  }
}
```

**Custom Validation Example:**
```javascript
const queueContract = createFacetContract({
  name: 'queue',
  requiredMethods: ['selectNextMessage'],
  requiredProperties: ['_queueManager'],
  validate: (ctx, api, subsystem, facet) => {
    // Validate _queueManager is an object with enqueue method
    if (typeof facet._queueManager !== 'object' || facet._queueManager === null) {
      throw new Error('Queue facet _queueManager must be an object');
    }
    if (typeof facet._queueManager.enqueue !== 'function') {
      throw new Error('Queue facet _queueManager must have enqueue method');
    }
  }
});
```

**Example Error:**
```
FacetContract 'queue': validation failed: Queue facet _queueManager must be an object
```

## Enforcement Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│            Contract Enforcement Flow                       │
└─────────────────────────────────────────────────────────────┘

verifySubsystemBuild()
  │
  ├─ Execute hooks → Create facets
  │
  ├─ Collect facets in facetsByKind
  │
  └─ validateFacets(facetsByKind, ...)
      │
      ├─ For each facet:
      │   │
      │   ├─ Get contract name: facet.getContract()
      │   │   │
      │   │   └─ No contract? → Skip
      │   │
      │   ├─ Check registry: contractRegistry.has(contractName)
      │   │   │
      │   │   └─ Not found? → Throw error
      │   │
      │   └─ Enforce: contractRegistry.enforce(...)
      │       │
      │       ├─ Lookup contract: registry.get(contractName)
      │       │   │
      │       │   └─ Not found? → Throw error
      │       │
      │       └─ contract.enforce(ctx, api, subsystem, facet)
      │           │
      │           ├─ Validate methods
      │           │   └─ Missing? → Throw error
      │           │
      │           ├─ Validate properties
      │           │   └─ Missing? → Throw error
      │           │
      │           └─ Run custom validation
      │               └─ Fails? → Throw error
      │
      └─ All facets validated ✓
```

## Error Handling

### Error Types

#### 1. Contract Not Registered

**When:** Facet declares a contract that doesn't exist in the registry

**Error:**
```
Facet 'custom-processor' (from file:///path/to/hook.js) has contract 'processor' 
which is not registered in the contract registry.
```

**Cause:**
- Contract was never registered
- Contract name is misspelled
- Using custom registry that doesn't have the contract

**Fix:**
- Register the contract in the registry
- Fix contract name spelling
- Use the correct registry

#### 2. Missing Required Methods

**When:** Facet doesn't implement all required methods

**Error:**
```
Facet 'processor' (from file:///path/to/hook.js) failed contract validation 
for 'processor': FacetContract 'processor': facet is missing required methods: processImmediately
```

**Cause:**
- Method not implemented
- Method name misspelled
- Method is a property, not a function

**Fix:**
- Implement all required methods
- Check method names match contract
- Ensure methods are functions

#### 3. Missing Required Properties

**When:** Facet doesn't have all required properties

**Error:**
```
Facet 'queue' (from file:///path/to/hook.js) failed contract validation 
for 'queue': FacetContract 'queue': facet is missing required properties: _queueManager, queue
```

**Cause:**
- Property not defined
- Property name misspelled
- Property is `undefined`

**Fix:**
- Add all required properties
- Check property names match contract
- Ensure properties are not `undefined`

#### 4. Custom Validation Failure

**When:** Custom validation function throws an error

**Error:**
```
Facet 'queue' (from file:///path/to/hook.js) failed contract validation 
for 'queue': FacetContract 'queue': validation failed: Queue facet _queueManager must be an object
```

**Cause:**
- Custom validation logic failed
- Internal structure doesn't match expectations

**Fix:**
- Fix the issue identified by validation
- Ensure internal structure matches contract requirements

## Enforcement Timing

### Why During Verification?

Contract enforcement happens during the verification phase for several reasons:

1. **Early Detection**: Errors are caught before any side effects occur
2. **Pure Validation**: Verification phase is pure (no side effects)
3. **Fail-Fast**: Build fails immediately if contracts are violated
4. **No Partial State**: Either all facets are valid or none are added

### Before Dependency Resolution

Contract enforcement happens **before** dependency graph building:

```javascript
// In verifySubsystemBuild()

// 1. Execute hooks and create facets
// ...

// 2. Validate contracts (BEFORE dependency graph)
validateFacets(facetsByKind, resolvedCtx, subsystem, defaultContractRegistry);

// 3. Build dependency graph (AFTER contract validation)
const graph = buildDepGraph(hooksByKind, facetsByKind, subsystem);
```

**Why:**
- Ensures all facets are valid before resolving dependencies
- Prevents invalid facets from being included in dependency graph
- Catches contract violations early

## Registry Used

The build system uses the **default contract registry**:

```javascript
import { defaultContractRegistry } from '../facet-contract/index.js';

// In verifySubsystemBuild()
validateFacets(facetsByKind, resolvedCtx, subsystem, defaultContractRegistry);
```

**Default Registry Contains:**
- `'router'` - Router contract
- `'queue'` - Queue contract
- `'processor'` - Processor contract
- `'listeners'` - Listeners contract
- `'hierarchy'` - Hierarchy contract
- `'scheduler'` - Scheduler contract

## Example: Complete Enforcement Flow

### Example Hook

```javascript
export const useProcessor = createHook({
  kind: 'processor',
  contract: 'processor',  // Declares processor contract
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
```

### Enforcement Process

1. **Hook Executed**: `useProcessor` creates a facet
2. **Facet Collected**: Facet stored in `facetsByKind['processor']`
3. **Contract Name Retrieved**: `facet.getContract()` returns `'processor'`
4. **Registry Check**: `defaultContractRegistry.has('processor')` returns `true`
5. **Contract Lookup**: `defaultContractRegistry.get('processor')` returns contract
6. **Method Validation**: Checks `accept`, `processMessage`, `processTick`, `processImmediately`
7. **Property Validation**: Checks required properties (none for processor)
8. **Custom Validation**: Runs custom validation (none for processor)
9. **Success**: Facet passes validation ✓

### Failure Example

If the facet is missing a method:

```javascript
// Missing processImmediately method
return new Facet('processor', { contract: 'processor' })
  .add({
    async accept(message, options) { /* ... */ },
    async processMessage(pairOrMessage, options) { /* ... */ },
    async processTick() { /* ... */ }
    // Missing: processImmediately
  });
```

**Enforcement Result:**
```
Facet 'processor' (from file:///path/to/hook.js) failed contract validation 
for 'processor': FacetContract 'processor': facet is missing required methods: processImmediately
```

**Build Fails**: Subsystem build is aborted, no facets are added.

## Best Practices

### 1. Declare Contracts Consistently

Declare contracts on both hook and facet:

```javascript
export const useRouter = createHook({
  kind: 'router',
  contract: 'router',  // Declare on hook
  fn: (ctx, api, subsystem) => {
    return new Facet('router', {
      contract: 'router'  // Also declare on facet
    })
    .add({ /* ... */ });
  }
});
```

### 2. Implement All Contract Requirements

Ensure all required methods and properties are implemented:

```javascript
// ✅ Good: All methods implemented
.add({
  registerRoute() { /* ... */ },
  match() { /* ... */ },
  route() { /* ... */ },
  unregisterRoute() { /* ... */ },
  hasRoute() { /* ... */ },
  getRoutes() { /* ... */ },
  _routeRegistry: router  // Required property
});

// ❌ Bad: Missing methods
.add({
  registerRoute() { /* ... */ },
  match() { /* ... */ }
  // Missing: route, unregisterRoute, hasRoute, getRoutes
});
```

### 3. Use Descriptive Error Messages

Custom validation should throw clear errors:

```javascript
validate: (ctx, api, subsystem, facet) => {
  // ✅ Good: Clear error message
  if (typeof facet._queueManager !== 'object') {
    throw new Error('Queue facet _queueManager must be an object');
  }
  
  // ❌ Bad: Vague error message
  if (typeof facet._queueManager !== 'object') {
    throw new Error('Invalid');
  }
}
```

### 4. Test Contract Compliance

Test that your facets satisfy contracts:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Test facet
const facet = useRouter(ctx, api, subsystem);

// Validate contract
try {
  defaultContractRegistry.enforce('router', ctx, api, subsystem, facet);
  console.log('Contract satisfied ✓');
} catch (error) {
  console.error('Contract violation:', error.message);
}
```

### 5. Register Custom Contracts

If using custom contracts, register them before building:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';
import { createFacetContract } from './models/facet-contract/facet-contract.mycelia.js';

// Register custom contract
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process'],
  requiredProperties: []
});

defaultContractRegistry.register(customContract);

// Now can use in hooks
export const useCustom = createHook({
  kind: 'custom',
  contract: 'custom',  // Now registered
  // ...
});
```

## Performance Considerations

### Enforcement Overhead

Contract enforcement has minimal overhead:

- **Method Check**: O(n) where n = number of required methods
- **Property Check**: O(m) where m = number of required properties
- **Custom Validation**: Depends on validation function complexity

**Typical Performance:**
- Simple contracts: < 1ms per facet
- Complex contracts with custom validation: < 5ms per facet

### When Enforcement Happens

Enforcement happens:
- **Once per build**: During verification phase
- **Before execution**: No runtime overhead
- **Fail-fast**: Stops immediately on first error

## Related Documentation

- [Facet Contracts and Adapters](./FACET-CONTRACTS-AND-ADAPTERS.md) - Understanding adapters as contract implementations
- [Facet Contract](./FACET-CONTRACT.md) - Creating and using facet contracts
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Managing contracts through the registry
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default contracts
- [How Builder Works](./HOW-BUILDER-WORKS.md) - Detailed explanation of the build process
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Two-phase build system utilities





