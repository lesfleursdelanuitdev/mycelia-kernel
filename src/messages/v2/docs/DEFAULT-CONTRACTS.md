# Default Facet Contracts

## Overview

This document describes all default facet contracts that are pre-registered in the `defaultContractRegistry`. These contracts define the required interface for standard facet types used throughout the Mycelia Kernel.

All default contracts are registered in `models/facet-contract/index.js` and can be enforced using the default registry:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce a contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

## Contract List

- [Router Contract](#router-contract)
- [Queue Contract](#queue-contract)
- [Processor Contract](#processor-contract)
- [Listeners Contract](#listeners-contract)
- [Hierarchy Contract](#hierarchy-contract)
- [Scheduler Contract](#scheduler-contract)

---

## Router Contract

**Contract Name:** `'router'`

**Location:** `models/facet-contract/router.contract.mycelia.js`

### Required Methods

- `registerRoute(pattern, handler, routeOptions)` - Register a route pattern with a handler
- `match(path)` - Match a path against registered routes
- `route(message, options)` - Route a message by matching its path and executing the handler
- `unregisterRoute(pattern)` - Unregister a route pattern
- `hasRoute(pattern)` - Check if a route pattern is registered
- `getRoutes()` - Get all registered routes

### Required Properties

- `_routeRegistry` - Internal router instance (used by useMessageProcessor)

### Custom Validation

Validates that `_routeRegistry` is an object (not null or primitive).

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce router contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
```

### Related Hook

- [useRouter](./hooks/router/USE-ROUTER.md) - Router hook implementation

---

## Queue Contract

**Contract Name:** `'queue'`

**Location:** `models/facet-contract/queue.contract.mycelia.js`

### Required Methods

- `selectNextMessage()` - Dequeue and return the next message-options pair
- `hasMessagesToProcess()` - Check if queue has messages to process
- `getQueueStatus(additionalState)` - Get queue status information (size, capacity, utilization, etc.)

### Required Properties

- `_queueManager` - Internal queue manager instance (used by useMessageProcessor for enqueueing)
- `queue` - Direct access to underlying BoundedQueue instance

### Custom Validation

- Validates that `_queueManager` is an object with `enqueue` method
- Validates that `queue` property is an object

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce queue contract
defaultContractRegistry.enforce('queue', ctx, api, subsystem, queueFacet);
```

### Related Hook

- [useQueue](./hooks/queue/USE-QUEUE.md) - Queue hook implementation

---

## Processor Contract

**Contract Name:** `'processor'`

**Location:** `models/facet-contract/processor.contract.mycelia.js`

### Required Methods

- `accept(message, options)` - Accept a message and place it on the queue (or process immediately for queries)
- `processMessage(pairOrMessage, options)` - Process a message through the complete processing pipeline
- `processTick()` - Process a single message from the queue (process one tick)
- `processImmediately(message, options)` - Process a message immediately without queuing

### Required Properties

- None (processor doesn't expose internal properties)

### Custom Validation

- None (methods are validated by requiredMethods check)

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce processor contract
defaultContractRegistry.enforce('processor', ctx, api, subsystem, processorFacet);
```

### Related Hook

- [useMessageProcessor](./hooks/message-processor/USE-MESSAGE-PROCESSOR.md) - Message processor hook implementation

---

## Listeners Contract

**Contract Name:** `'listeners'`

**Location:** `models/facet-contract/listeners.contract.mycelia.js`

### Required Methods

- `on(path, handlers, options)` - Register a listener for a specific message path
- `off(path, handlers, options)` - Unregister a listener for a specific message path
- `hasListeners()` - Check if listeners are enabled
- `enableListeners(listenerOptions)` - Enable listeners and initialize ListenerManager
- `disableListeners()` - Disable listeners (but keep manager instance)

### Required Properties

- `listeners` - Getter for direct access to ListenerManager instance (can be null)
- `_listenerManager` - Function accessor that returns ListenerManager or null

### Custom Validation

- Validates that `_listenerManager` is a function
- Validates that `listeners` property exists
- Validates that `_listenerManager()` returns object or null

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce listeners contract
defaultContractRegistry.enforce('listeners', ctx, api, subsystem, listenersFacet);
```

### Related Hook

- [useListeners](./hooks/listeners/USE-LISTENERS.md) - Listeners hook implementation

---

## Hierarchy Contract

**Contract Name:** `'hierarchy'`

**Location:** `models/facet-contract/hierarchy.contract.mycelia.js`

### Required Methods

- `addChild(child)` - Register a child subsystem under the current subsystem
- `removeChild(childOrName)` - Remove a registered child subsystem by reference or by name
- `getChild(name)` - Retrieve a specific child subsystem by name
- `listChildren()` - Return an array of all currently registered child subsystems
- `setParent(parent)` - Set the parent subsystem
- `getParent()` - Get the parent subsystem
- `isRoot()` - Check if this subsystem is a root (has no parent)
- `getRoot()` - Get the root subsystem by traversing up the parent chain
- `getLineage(node)` - Return the full ancestor chain (from root to node)

### Required Properties

- `children` - Getter for direct access to registry instance (returns an object)

### Custom Validation

- Validates that `children` getter returns an object (not null or primitive)

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce hierarchy contract
defaultContractRegistry.enforce('hierarchy', ctx, api, subsystem, hierarchyFacet);
```

### Related Hook

- [useHierarchy](./hooks/hierarchy/USE-HIERARCHY.md) - Hierarchy hook implementation

---

## Scheduler Contract

**Contract Name:** `'scheduler'`

**Location:** `models/facet-contract/scheduler.contract.mycelia.js`

### Required Methods

- `process(timeSlice)` - Process messages during a time slice
- `pauseProcessing()` - Pause message processing
- `resumeProcessing()` - Resume message processing
- `isPaused()` - Check if processing is paused
- `isProcessing()` - Check if currently processing
- `getPriority()` - Get subsystem priority
- `setPriority(newPriority)` - Set subsystem priority
- `configureScheduler(schedulerOptions)` - Configure scheduler options
- `getScheduler()` - Get scheduler instance

### Required Properties

- `_scheduler` - Internal scheduler instance (used internally by other hooks)

### Custom Validation

- Validates that `_scheduler` is an object (not null or primitive)

### Example

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce scheduler contract
defaultContractRegistry.enforce('scheduler', ctx, api, subsystem, schedulerFacet);
```

### Related Hook

- [useScheduler](./hooks/scheduler/USE-SCHEDULER.md) - Scheduler hook implementation

---

## Using Default Contracts

### Enforcing Contracts

All default contracts can be enforced using the default registry:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

// Enforce any default contract
defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
defaultContractRegistry.enforce('queue', ctx, api, subsystem, queueFacet);
defaultContractRegistry.enforce('processor', ctx, api, subsystem, processorFacet);
defaultContractRegistry.enforce('listeners', ctx, api, subsystem, listenersFacet);
defaultContractRegistry.enforce('hierarchy', ctx, api, subsystem, hierarchyFacet);
defaultContractRegistry.enforce('scheduler', ctx, api, subsystem, schedulerFacet);
```

### Checking Contract Existence

Check if a contract exists before enforcing:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

if (defaultContractRegistry.has('router')) {
  defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
}
```

### Listing All Contracts

Get a list of all registered contract names:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';

const contractNames = defaultContractRegistry.list();
console.log('Available contracts:', contractNames);
// ['router', 'queue', 'processor', 'listeners', 'hierarchy', 'scheduler']
```

## Contract Enforcement in Hooks

Default hooks specify their contracts using the `contract` parameter:

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
      // ...
    });
  }
});
```

## Creating Custom Contracts

You can create custom contracts and register them in the default registry:

```javascript
import { defaultContractRegistry } from './models/facet-contract/index.js';
import { createFacetContract } from './models/facet-contract/facet-contract.mycelia.js';

// Create custom contract
const customContract = createFacetContract({
  name: 'custom',
  requiredMethods: ['process', 'getStatus'],
  requiredProperties: ['_service'],
  validate: (ctx, api, subsystem, facet) => {
    if (typeof facet._service !== 'object' || facet._service === null) {
      throw new Error('Custom facet _service must be an object');
    }
  }
});

// Register in default registry
defaultContractRegistry.register(customContract);

// Now can enforce
defaultContractRegistry.enforce('custom', ctx, api, subsystem, customFacet);
```

## See Also

- [Facet Contract](./FACET-CONTRACT.md) - Learn about creating and using facet contracts
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Learn about the contract registry system
- [Facets Documentation](./hooks/FACETS.md) - Learn about facets and how contracts are used
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks and how to specify contracts

