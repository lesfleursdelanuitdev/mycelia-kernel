# Find Facet Utilities

## Overview

The `find-facet.utils.mycelia.js` module provides a safe, standardized way to find facets from a FacetManager. This utility ensures consistent facet lookup patterns across all hooks and prevents common errors when accessing facets.

## Purpose

Direct access to facets via `api.__facets[kind]` has several issues:
- **No validation** - Returns `undefined` silently if facet doesn't exist
- **Inconsistent patterns** - Some code uses `api.__facets[kind]`, others use `api.__facets?.[kind]`
- **Error-prone** - Easy to miss null checks, leading to runtime errors
- **No type safety** - No clear indication of whether a facet exists

The `findFacet()` utility provides:
- **Consistent return format** - Always returns `false` or `{result: true, facet: facet}`
- **Safe validation** - Validates facetManager before accessing
- **Clear intent** - Explicitly shows when a facet is required vs optional
- **Error prevention** - Forces explicit handling of missing facets

## API

### `findFacet(facetManager, kind)`

Safely finds a facet by kind from a FacetManager.

**Parameters:**
- `facetManager` (FacetManager, required) - The FacetManager instance (e.g., `api.__facets`)
- `kind` (string, required) - The facet kind to find

**Returns:**
- `false` - If facetManager is invalid, doesn't have a `find` method, or facet is not found
- `{result: true, facet: Object}` - If facet is found successfully

**Validation:**
- Checks if `facetManager` exists and has a `find` method
- Returns `false` if facetManager is invalid
- Returns `false` if facet is not found (facetManager.find() returns undefined/null)

## Usage

### Required Facets

When a facet is required for the hook to function, check the result and throw an error if not found:

```javascript
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useMyHook = createHook({
  kind: 'myhook',
  required: ['router', 'statistics'],
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    
    // Get required router facet
    const routerResult = findFacet(api.__facets, 'router');
    if (!routerResult) {
      throw new Error(`useMyHook ${name}: router facet not found. useRouter must be added before useMyHook.`);
    }
    const routerFacet = routerResult.facet;
    
    // Get required statistics facet
    const statisticsResult = findFacet(api.__facets, 'statistics');
    if (!statisticsResult) {
      throw new Error(`useMyHook ${name}: statistics facet not found. useStatistics must be added before useMyHook.`);
    }
    const statisticsFacet = statisticsResult.facet;
    
    // Use facets...
    return new Facet('myhook', { attach: true })
      .add({
        // ... facet methods using routerFacet and statisticsFacet
      });
  }
});
```

### Optional Facets

When a facet is optional, use a ternary to handle both cases:

```javascript
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useMyHook = createHook({
  kind: 'myhook',
  fn: (ctx, api, subsystem) => {
    // Get optional statistics facet (for callbacks)
    const statisticsResult = findFacet(api.__facets, 'statistics');
    const statisticsFacet = statisticsResult ? statisticsResult.facet : null;
    
    // Use statisticsFacet if available
    const manager = new MyManager({
      onEvent: () => {
        if (statisticsFacet?._statistics) {
          statisticsFacet._statistics.recordEvent();
        }
      }
    });
    
    return new Facet('myhook', { attach: true })
      .add({
        // ... facet methods
      });
  }
});
```

### Multiple Facets

When accessing multiple facets, extract each one separately:

```javascript
// Get required facets
const routerResult = findFacet(api.__facets, 'router');
if (!routerResult) {
  throw new Error(`useMessageProcessor ${name}: router facet not found.`);
}
const routerFacet = routerResult.facet;

const statisticsResult = findFacet(api.__facets, 'statistics');
if (!statisticsResult) {
  throw new Error(`useMessageProcessor ${name}: statistics facet not found.`);
}
const statisticsFacet = statisticsResult.facet;

const queueResult = findFacet(api.__facets, 'queue');
if (!queueResult) {
  throw new Error(`useMessageProcessor ${name}: queue facet not found.`);
}
const queueFacet = queueResult.facet;

// Get optional queries facet
const queriesResult = findFacet(api.__facets, 'queries');
const queriesFacet = queriesResult ? queriesResult.facet : null;
```

## Real-World Examples

### Example: useMessageProcessor Hook

```javascript
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useMessageProcessor = createHook({
  kind: 'processor',
  required: ['router', 'statistics', 'queue', 'listeners', 'queries'],
  fn: (ctx, api, _subsystem) => {
    const { name } = api;
    
    // Get required facets
    const routerResult = findFacet(api.__facets, 'router');
    if (!routerResult) {
      throw new Error(`useMessageProcessor ${name}: router facet not found.`);
    }
    const routerFacet = routerResult.facet;
    
    const statisticsResult = findFacet(api.__facets, 'statistics');
    if (!statisticsResult) {
      throw new Error(`useMessageProcessor ${name}: statistics facet not found.`);
    }
    const statisticsFacet = statisticsResult.facet;
    
    const queueResult = findFacet(api.__facets, 'queue');
    if (!queueResult) {
      throw new Error(`useMessageProcessor ${name}: queue facet not found.`);
    }
    const queueFacet = queueResult.facet;
    
    // Get optional queries facet
    const queriesResult = findFacet(api.__facets, 'queries');
    const queriesFacet = queriesResult ? queriesResult.facet : null;
    
    // Use facets...
  }
});
```

### Example: useQueue Hook (Optional Facet)

```javascript
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useQueue = createHook({
  kind: 'queue',
  required: ['statistics', 'listeners'],
  fn: (ctx, api, _subsystem) => {
    // Get optional statistics facet (for onQueueFull callback)
    const statisticsResult = findFacet(api.__facets, 'statistics');
    const statisticsFacet = statisticsResult ? statisticsResult.facet : null;
    
    const queueManager = new SubsystemQueueManager({
      onQueueFull: () => {
        if (statisticsFacet?._statistics) {
          statisticsFacet._statistics.recordQueueFull();
        }
      }
    });
    
    return new Facet('queue', { attach: true })
      .add({
        // ... facet methods
      });
  }
});
```

### Example: useSynchronous Hook

```javascript
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useSynchronous = createHook({
  kind: 'synchronous',
  required: ['processor', 'statistics', 'listeners', 'queries'],
  fn: (ctx, api, _subsystem) => {
    return new Facet('synchronous', { attach: true })
      .add({
        async accept(message, options = {}) {
          // Find processor facet
          const processorResult = findFacet(api.__facets, 'processor');
          const core = processorResult ? processorResult.facet : null;
          
          if (core?.processImmediately) {
            return await core.processImmediately(message, options);
          }
          // ... fallback logic
        }
      });
  }
});
```

## Migration from Direct Access

### Before (Unsafe)

```javascript
// Direct access - no validation
const routerFacet = api.__facets['router'];
if (!routerFacet) {
  throw new Error('Router facet not found');
}

// Optional with optional chaining
const statisticsFacet = api.__facets?.['statistics'];
```

### After (Safe)

```javascript
// Required facet
const routerResult = findFacet(api.__facets, 'router');
if (!routerResult) {
  throw new Error('Router facet not found');
}
const routerFacet = routerResult.facet;

// Optional facet
const statisticsResult = findFacet(api.__facets, 'statistics');
const statisticsFacet = statisticsResult ? statisticsResult.facet : null;
```

## Return Value Structure

### When Found

```javascript
const result = findFacet(api.__facets, 'router');
// result = { result: true, facet: <router facet object> }

if (result) {
  const routerFacet = result.facet;
  // Use routerFacet...
}
```

### When Not Found

```javascript
const result = findFacet(api.__facets, 'nonexistent');
// result = false

if (!result) {
  // Handle missing facet
}
```

## Validation Details

The utility performs the following validations:

1. **FacetManager exists**: Checks if `facetManager` is truthy
2. **Has find method**: Checks if `facetManager.find` is a function
3. **Facet exists**: Calls `facetManager.find(kind)` and checks if result is truthy

If any validation fails, the function returns `false`.

## Best Practices

1. **Always use `findFacet()`** - Don't use `api.__facets[kind]` directly
2. **Check required facets** - Always validate required facets and throw descriptive errors
3. **Handle optional facets** - Use ternary operator for optional facets
4. **Extract facet immediately** - Extract `facet` from result right after checking
5. **Use descriptive error messages** - Include hook name and dependency in error messages
6. **Match hook.required** - Ensure `findFacet()` calls match the `required` array in hook metadata

### Good Pattern

```javascript
// Required facet with clear error
const routerResult = findFacet(api.__facets, 'router');
if (!routerResult) {
  throw new Error(`useMyHook ${name}: router facet not found. useRouter must be added before useMyHook.`);
}
const routerFacet = routerResult.facet;

// Optional facet with null fallback
const statisticsResult = findFacet(api.__facets, 'statistics');
const statisticsFacet = statisticsResult ? statisticsResult.facet : null;
```

### Avoid

```javascript
// ❌ Direct access without validation
const routerFacet = api.__facets['router'];

// ❌ Optional chaining without explicit handling
const statisticsFacet = api.__facets?.['statistics'];

// ❌ Not extracting facet from result
const result = findFacet(api.__facets, 'router');
if (result) {
  result.facet.someMethod(); // Works but less clear
}
```

## Integration with Hook System

The `findFacet()` utility is used throughout the hook system to access facets. It works seamlessly with:

- **Hook dependencies** - The `required` array in hook metadata
- **FacetManager** - The `api.__facets` FacetManager instance
- **Facet lifecycle** - Facets are available during hook execution

### Relationship to `hook.required`

The `required` array in hook metadata declares dependencies, but `findFacet()` is used to actually access them:

```javascript
export const useMyHook = createHook({
  kind: 'myhook',
  required: ['router', 'statistics'],  // Declares dependencies
  fn: (ctx, api, subsystem) => {
    // Actually access the dependencies
    const routerResult = findFacet(api.__facets, 'router');
    if (!routerResult) {
      throw new Error('router facet required');
    }
    const routerFacet = routerResult.facet;
    // ...
  }
});
```

## Error Messages

When throwing errors for missing required facets, follow this pattern:

```javascript
throw new Error(`useMyHook ${name}: <facet> facet not found. use<Facet> must be added before useMyHook.`);
```

**Example:**
```javascript
throw new Error(`useMessageProcessor ${name}: router facet not found. useRouter must be added before useMessageProcessor.`);
```

This provides:
- **Context** - Which hook is failing
- **Missing dependency** - Which facet is missing
- **Solution** - Which hook needs to be added

## See Also

- [Facet Manager](./hooks/FACET-MANAGER.md) - Learn about FacetManager and how facets are managed
- [Hooks Documentation](./hooks/HOOKS.md) - Learn about hooks and dependencies
- [Facets Documentation](./hooks/FACETS.md) - Learn about facet objects
- [Default Hooks](./DEFAULT-HOOKS.md) - See FACET_KINDS constants for type-safe facet kind strings







