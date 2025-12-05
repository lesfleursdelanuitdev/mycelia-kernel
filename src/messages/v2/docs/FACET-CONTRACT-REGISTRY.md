# Facet Contract Registry

## Overview

The **FacetContractRegistry** manages a collection of facet contracts, allowing registration and enforcement of contracts on facets by name. The registry provides a centralized way to manage contracts and enforce them consistently throughout the system.

## What is a Facet Contract Registry?

A FacetContractRegistry is a container that:
- **Stores contracts**: Maintains a map of contract names to FacetContract instances
- **Enforces contracts**: Provides methods to enforce contracts on facets by name
- **Manages contract lifecycle**: Supports registration, lookup, and removal of contracts

## Default Registry

The system provides a default registry with all standard contracts pre-registered:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Check if a contract exists
if (defaultContractRegistry.has('router')) {
  // Contract is available
}

// Enforce a contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

**Pre-registered contracts:**
- `'router'` - Router facet contract
- `'queue'` - Queue facet contract
- `'processor'` - Processor facet contract
- `'listeners'` - Listeners facet contract
- `'hierarchy'` - Hierarchy facet contract
- `'scheduler'` - Scheduler facet contract

See [Default Contracts](./DEFAULT-CONTRACTS.md) for complete documentation.

## Creating a Registry

### Using the Default Registry

For most use cases, use the default registry:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Use default registry
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

### Creating a Custom Registry

You can create a custom registry for specialized use cases:

```javascript
import { FacetContractRegistry } from './models/facet-contract/facet-contract-registry.mycelia.js';
import { createFacetContract } from './models/facet-contract/facet-contract.mycelia.js';

const customRegistry = new FacetContractRegistry();

// Register a custom contract
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process'],
  requiredProperties: []
});

customRegistry.register(customContract);

// Enforce the contract
customRegistry.enforce('custom', ctx, api, subsystem, customFacet);
```

## Registry Methods

### `register(contract)`

Registers a FacetContract instance in the registry.

**Signature:**
```javascript
register(contract: FacetContract): FacetContract
```

**Parameters:**
- `contract` - FacetContract instance to register

**Returns:**
- The registered contract (for chaining)

**Throws:**
- `Error` if contract is invalid
- `Error` if a contract with the same name already exists

**Example:**
```javascript
import { FacetContractRegistry } from './facet-contract-registry.mycelia.js';
import { createFacetContract } from './facet-contract.mycelia.js';

const registry = new FacetContractRegistry();

const routerContract = createFacetContract({
  name: 'router',
  requiredMethods: ['registerRoute', 'match']
});

registry.register(routerContract);
```

### `has(name)`

Checks if a contract exists for the given name.

**Signature:**
```javascript
has(name: string): boolean
```

**Parameters:**
- `name` - Contract name to check

**Returns:**
- `true` if contract exists, `false` otherwise

**Example:**
```javascript
if (defaultContractRegistry.has('router')) {
  console.log('Router contract is registered');
}
```

### `get(name)`

Gets a contract by name.

**Signature:**
```javascript
get(name: string): FacetContract | undefined
```

**Parameters:**
- `name` - Contract name

**Returns:**
- Contract instance or `undefined` if not found

**Example:**
```javascript
const routerContract = defaultContractRegistry.get('router');
if (routerContract) {
  // Use contract directly
  routerContract.enforce(ctx, api, subsystem, routerFacet);
}
```

### `enforce(name, ctx, api, subsystem, facet)`

Enforces a contract on a facet by looking up the contract by name and delegating to its `enforce` method.

**Signature:**
```javascript
enforce(
  name: string,
  ctx: Object,
  api: Object,
  subsystem: BaseSubsystem,
  facet: Facet
): void
```

**Parameters:**
- `name` - Name of the contract to enforce
- `ctx` - Context object
- `api` - Subsystem API object
- `subsystem` - Subsystem instance
- `facet` - Facet to validate

**Throws:**
- `Error` if contract not found
- `Error` if validation fails (delegated to contract's `enforce` method)

**Example:**
```javascript
import { defaultContractRegistry } from './facet-contract/index.js';

// Enforce router contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

### `remove(name)`

Removes a contract from the registry.

**Signature:**
```javascript
remove(name: string): boolean
```

**Parameters:**
- `name` - Contract name to remove

**Returns:**
- `true` if contract was removed, `false` if not found

**Example:**
```javascript
const removed = defaultContractRegistry.remove('custom');
if (removed) {
  console.log('Custom contract removed');
}
```

### `list()`

Lists all registered contract names.

**Signature:**
```javascript
list(): Array<string>
```

**Returns:**
- Array of contract names

**Example:**
```javascript
const contractNames = defaultContractRegistry.list();
console.log('Registered contracts:', contractNames);
// ['router', 'queue', 'processor', 'listeners', 'hierarchy', 'scheduler']
```

### `size()`

Gets the number of registered contracts.

**Signature:**
```javascript
size(): number
```

**Returns:**
- Number of contracts

**Example:**
```javascript
const count = defaultContractRegistry.size();
console.log(`Registry has ${count} contracts`);
```

### `clear()`

Clears all contracts from the registry.

**Signature:**
```javascript
clear(): void
```

**Example:**
```javascript
defaultContractRegistry.clear();
console.log('Registry cleared');
```

## Usage Patterns

### Pattern: Enforcing Contracts During Build

Contracts can be enforced during subsystem build to validate facets:

```javascript
import { defaultContractRegistry } from './facet-contract/index.js';

// During facet initialization
async function initializeFacet(facet, ctx, api, subsystem) {
  const contractName = facet.getContract();
  
  if (contractName && defaultContractRegistry.has(contractName)) {
    // Enforce contract before initialization
    defaultContractRegistry.enforce(contractName, ctx, api, subsystem, facet);
  }
  
  // Continue with initialization
  await facet.init(ctx, api, subsystem);
}
```

### Pattern: Custom Registry for Testing

Create a custom registry for testing with mock contracts:

```javascript
import { FacetContractRegistry } from './facet-contract-registry.mycelia.js';
import { createFacetContract } from './facet-contract.mycelia.js';

function createTestRegistry() {
  const registry = new FacetContractRegistry();
  
  // Register minimal test contracts
  registry.register(createFacetContract({
    name: 'test',
    requiredMethods: ['testMethod'],
    requiredProperties: []
  }));
  
  return registry;
}
```

### Pattern: Extending Default Registry

You can extend the default registry with custom contracts:

```javascript
import { defaultContractRegistry } from './facet-contract/index.js';
import { createFacetContract } from './facet-contract.mycelia.js';

// Register a custom contract in the default registry
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process'],
  requiredProperties: []
});

defaultContractRegistry.register(customContract);

// Now can enforce custom contract
defaultContractRegistry.enforce('custom', ctx, api, subsystem, customFacet);
```

## Error Handling

### Contract Not Found

If you try to enforce a contract that doesn't exist:

```javascript
try {
  defaultContractRegistry.enforce('nonexistent', ctx, api, subsystem, facet);
} catch (error) {
  console.error(error.message);
  // "FacetContractRegistry.enforce: no contract found for name 'nonexistent'"
}
```

### Validation Failure

If contract validation fails, the error is wrapped with context:

```javascript
try {
  defaultContractRegistry.enforce('router', ctx, api, subsystem, invalidFacet);
} catch (error) {
  console.error(error.message);
  // "FacetContract 'router': facet is missing required methods: match, route"
}
```

## Best Practices

1. **Use the default registry**: For standard contracts, use `defaultContractRegistry`

2. **Register contracts early**: Register contracts before they're needed

3. **Check before enforcing**: Use `has()` to check if a contract exists before enforcing

4. **Handle errors gracefully**: Wrap contract enforcement in try-catch blocks

5. **Use descriptive names**: Contract names should clearly identify the facet type

6. **Don't modify default registry in production**: Avoid modifying the default registry in production code; create custom registries instead

7. **Document custom contracts**: Document any custom contracts you create

## See Also

- [Facet Contract](./FACET-CONTRACT.md) - Learn about creating and using facet contracts
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets and how contracts are used
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks and how to specify contracts

