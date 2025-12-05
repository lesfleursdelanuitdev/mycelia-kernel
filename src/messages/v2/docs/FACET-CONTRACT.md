# Facet Contract

## Overview

A **FacetContract** defines the interface that facets must satisfy, including required methods, required properties, and optional custom validation logic. Contracts provide runtime validation to ensure facets implement the expected interface, improving system reliability and catching integration errors early.

## What is a Facet Contract?

A FacetContract is a specification that defines:
- **Required Methods**: Methods that must be implemented on the facet
- **Required Properties**: Properties that must exist on the facet
- **Custom Validation**: Optional validation function for additional checks

Contracts are enforced during facet validation to ensure compatibility and correctness.

## Creating a Facet Contract

### Using `createFacetContract` (Recommended)

The `createFacetContract` factory function is the recommended way to create contracts:

```javascript
import { createFacetContract } from './facet-contract.mycelia.js';

const routerContract = createFacetContract({
  name: 'router',
  requiredMethods: ['registerRoute', 'match', 'route'],
  requiredProperties: ['_routeRegistry'],
  validate: (ctx, api, subsystem, facet) => {
    // Custom validation
    if (typeof facet._routeRegistry !== 'object') {
      throw new Error('Router facet _routeRegistry must be an object');
    }
  }
});
```

### Using `FacetContract` Constructor

You can also create contracts directly using the constructor:

```javascript
import { FacetContract } from './facet-contract.mycelia.js';

const routerContract = new FacetContract(
  'router',
  {
    requiredMethods: ['registerRoute', 'match', 'route'],
    requiredProperties: ['_routeRegistry']
  },
  (ctx, api, subsystem, facet) => {
    // Custom validation
    if (typeof facet._routeRegistry !== 'object') {
      throw new Error('Router facet _routeRegistry must be an object');
    }
  }
);
```

## Contract Parameters

### `name` (string, required)

The unique identifier for the contract. Typically matches the facet kind (e.g., `'router'`, `'queue'`).

**Example:**
```javascript
createFacetContract({
  name: 'router',
  // ...
})
```

### `requiredMethods` (Array<string>, default: `[]`)

An array of method names that must be implemented on the facet. Each method must exist and be a function.

**Example:**
```javascript
createFacetContract({
  name: 'queue',
  requiredMethods: [
    'selectNextMessage',
    'hasMessagesToProcess',
    'getQueueStatus'
  ],
  // ...
})
```

**Validation:**
- Checks that each method exists on the facet
- Checks that each method is a function
- Throws error listing all missing methods if any are missing

### `requiredProperties` (Array<string>, default: `[]`)

An array of property names that must exist on the facet. Properties can be any value (not just functions).

**Example:**
```javascript
createFacetContract({
  name: 'queue',
  requiredProperties: [
    '_queueManager',
    'queue'
  ],
  // ...
})
```

**Validation:**
- Checks that each property exists on the facet (using `in` operator)
- Checks that each property is not `undefined`
- Throws error listing all missing properties if any are missing

### `validate` (Function, default: `null`)

An optional custom validation function that performs additional checks beyond method and property validation.

**Signature:**
```javascript
validate: (ctx, api, subsystem, facet) => void
```

**Parameters:**
- `ctx` - Context object (same as passed to hooks)
- `api` - Subsystem API object
- `subsystem` - Subsystem instance
- `facet` - Facet instance to validate

**Example:**
```javascript
createFacetContract({
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
})
```

**Important:**
- Validation function should throw an `Error` if validation fails
- Errors thrown are wrapped with contract name for better error messages
- Validation runs after required methods and properties are checked

## Enforcing Contracts

### Direct Enforcement

You can enforce a contract directly on a facet:

```javascript
import { routerContract } from './router.contract.mycelia.js';

// Enforce contract on a facet
routerContract.enforce(ctx, api, subsystem, routerFacet);
```

**Throws:**
- `Error` if required methods are missing
- `Error` if required properties are missing
- `Error` if custom validation fails

### Registry-Based Enforcement

Contracts are typically enforced through the registry:

```javascript
import { defaultContractRegistry } from './facet-contract/index.js';

// Enforce contract by name
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

See [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) for more information.

## Contract Structure

### Complete Example

```javascript
import { createFacetContract } from './facet-contract.mycelia.js';

export const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: [
    'process',
    'getStatus',
    'configure'
  ],
  requiredProperties: [
    '_service',
    'config'
  ],
  validate: (ctx, api, subsystem, facet) => {
    // Validate _service is an object
    if (typeof facet._service !== 'object' || facet._service === null) {
      throw new Error('Custom facet _service must be an object');
    }
    
    // Validate config is an object
    if (typeof facet.config !== 'object' || facet.config === null) {
      throw new Error('Custom facet config must be an object');
    }
    
    // Validate _service has required method
    if (typeof facet._service.execute !== 'function') {
      throw new Error('Custom facet _service must have execute method');
    }
  }
});
```

## Error Messages

Contracts provide clear error messages when validation fails:

### Missing Methods

```
FacetContract 'router': facet is missing required methods: match, route
```

### Missing Properties

```
FacetContract 'queue': facet is missing required properties: _queueManager, queue
```

### Custom Validation Failure

```
FacetContract 'queue': validation failed: Queue facet _queueManager must be an object
```

## Using Contracts with Hooks

Contracts are specified in hooks using the `contract` parameter:

```javascript
import { createHook } from '../create-hook.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';

export const useRouter = createHook({
  kind: 'router',
  contract: 'router',  // Contract name (string)
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // ...
    return new Facet('router', {
      attach: true,
      source: import.meta.url,
      contract: 'router'  // Contract name (string)
    })
    .add({
      // Methods and properties that satisfy the contract
      registerRoute(pattern, handler) { /* ... */ },
      match(path) { /* ... */ },
      route(message) { /* ... */ },
      _routeRegistry: router
    });
  }
});
```

**Important:**
- The `contract` parameter is a **string** (contract name), not a contract object
- The contract is looked up from the registry when needed
- The contract name typically matches the facet `kind`

## Best Practices

1. **Name contracts after facet kinds**: Use the same name as the facet kind (e.g., `'router'` for router facets)

2. **Be specific with requirements**: List all methods and properties that are part of the public interface

3. **Use custom validation for complex checks**: Use the `validate` function for checks that go beyond simple existence

4. **Document contract requirements**: Include JSDoc comments explaining what each method/property should do

5. **Validate internal structure**: Use custom validation to check internal properties (like `_queueManager`) that other hooks depend on

6. **Throw descriptive errors**: Custom validation should throw clear error messages explaining what's wrong

7. **Register contracts**: Register contracts in the registry so they can be enforced by name

## Common Patterns

### Pattern: Simple Method Contract

```javascript
export const simpleContract = createFacetContract({
  name: 'simple',
  requiredMethods: ['doSomething', 'getStatus'],
  requiredProperties: []
});
```

### Pattern: Contract with Internal Properties

```javascript
export const internalContract = createFacetContract({
  name: 'internal',
  requiredMethods: ['process'],
  requiredProperties: ['_manager'],
  validate: (ctx, api, subsystem, facet) => {
    if (typeof facet._manager !== 'object' || facet._manager === null) {
      throw new Error('Internal facet _manager must be an object');
    }
    if (typeof facet._manager.execute !== 'function') {
      throw new Error('Internal facet _manager must have execute method');
    }
  }
});
```

### Pattern: Contract with Getters

```javascript
export const getterContract = createFacetContract({
  name: 'getter',
  requiredMethods: ['process'],
  requiredProperties: ['value'],  // Getter property
  validate: (ctx, api, subsystem, facet) => {
    // Validate getter returns expected type
    const value = facet.value;
    if (typeof value !== 'number') {
      throw new Error('Getter facet value must return a number');
    }
  }
});
```

## See Also

- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Learn about the contract registry system
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets and how contracts are used
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks and how to specify contracts

