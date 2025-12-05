# Listener Manager Policies

## Overview

The `listener-manager-policies.mycelia.js` module provides pure functions that implement different listener registration policies. These policies control how listeners are registered, ordered, and managed for each message path.

**Key Concepts:**
- **Pure Functions**: Policy functions are pure (no side effects, deterministic)
- **Pluggable**: Policies can be registered and unregistered at runtime
- **Configurable**: Policies can accept options for customization
- **Composable**: Multiple policies can be used in the same system

## Policy Function Interface

All policy functions must follow this interface:

### Function Signature

```javascript
function policyFunction(existingListeners, path, handler, options) {
  // Policy logic
  return {
    success: boolean,
    listeners: Array<Function>,
    error: string | null
  };
}
```

### Parameters

1. **`existingListeners`** (Array<Function>, required)
   - Current handlers already registered for the path
   - Empty array `[]` if no listeners exist yet
   - Array of handler functions (or handler objects for priority policy)

2. **`path`** (string, required)
   - Message path for which the listener is being registered
   - Used for error messages and logging
   - Example: `'layer/create'`, `'domain/register'`

3. **`handler`** (Function, required)
   - New handler function to register
   - Must be a function
   - Will be called with `(message, params)` when path matches

4. **`options`** (Object, required)
   - Policy options object containing:
     - `policy` (string) - Policy name
     - `debug` (boolean) - Debug flag
     - `...policyOptions` - Policy-specific options (spread)

### Return Value

Must return an object with this structure:

```javascript
{
  success: boolean,      // Whether registration succeeded
  listeners: Array,     // New listeners array (after registration attempt)
  error: string | null   // Error message if success === false, null otherwise
}
```

**Fields:**
- **`success`** (boolean, required): `true` if registration should succeed, `false` if it should fail
- **`listeners`** (Array<Function>, required): New array of listeners after applying the policy
  - If `success === true`: Should include the new handler
  - If `success === false`: Should be the same as `existingListeners` (unchanged)
- **`error`** (string | null, required): Error message if `success === false`, `null` if `success === true`

## Writing a Custom Policy

### Requirements

1. **Pure Function**: Must be a pure function with no side effects
   - No mutations of input parameters
   - No external state changes
   - Deterministic (same inputs = same outputs)

2. **Interface Compliance**: Must follow the exact interface specified above

3. **Error Handling**: Must return appropriate error messages when registration fails

### Example: Custom Policy

```javascript
/**
 * Custom Policy - Only allow listeners with specific prefix
 */
function prefixPolicy(existingListeners, path, handler, options) {
  const allowedPrefix = options.allowedPrefix || 'system/';
  
  // Check if path starts with allowed prefix
  if (!path.startsWith(allowedPrefix)) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Path '${path}' must start with '${allowedPrefix}'`
    };
  }
  
  // Check if handler already exists (prevent duplicates)
  if (existingListeners.includes(handler)) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Handler already registered for path '${path}'`
    };
  }
  
  // Add handler
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}

// Register the policy
listenerManager.registerPolicy('prefix', prefixPolicy);
```

### Best Practices

1. **Always Return New Arrays**: Never mutate `existingListeners`
   ```javascript
   // ✅ Good: Create new array
   return {
     success: true,
     listeners: [...existingListeners, handler],
     error: null
   };
   
   // ❌ Bad: Mutate existing array
   existingListeners.push(handler);  // Don't do this!
   ```

2. **Provide Clear Error Messages**: Error messages should be descriptive
   ```javascript
   // ✅ Good
   error: `Maximum ${maxListeners} listeners allowed for path '${path}' with 'limited' policy`
   
   // ❌ Bad
   error: 'Failed'
   ```

3. **Validate Options**: Check and validate policy-specific options
   ```javascript
   const maxListeners = options.maxListeners;
   if (maxListeners !== undefined && (typeof maxListeners !== 'number' || maxListeners < 1)) {
     return {
       success: false,
       listeners: existingListeners,
       error: 'maxListeners must be a positive number'
     };
   }
   ```

4. **Handle Edge Cases**: Consider empty arrays, null/undefined, etc.
   ```javascript
   // Handle empty existingListeners
   if (existingListeners.length === 0) {
     return {
       success: true,
       listeners: [handler],
       error: null
     };
   }
   ```

## Default Policies

### `multiple` Policy

**Function:** `multiplePolicy(existingListeners, path, handler, options)`

**Behavior:** Always allows registration, adds handler to the end of the array.

**Use Case:** Default policy, most flexible, allows unlimited listeners per path.

**Example:**
```javascript
// Register multiple listeners
listenerManager.on('path', handler1);  // [handler1]
listenerManager.on('path', handler2);  // [handler1, handler2]
listenerManager.on('path', handler3);  // [handler1, handler2, handler3]
```

**Implementation:**
```javascript
export function multiplePolicy(existingListeners, path, handler, options) {
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}
```

### `single` Policy

**Function:** `singlePolicy(existingListeners, path, handler, options)`

**Behavior:** Only allows one listener per path. Registration fails if a listener already exists.

**Use Case:** When you want exactly one handler per path (e.g., single event handler).

**Example:**
```javascript
listenerManager.setListenerPolicy('single');
listenerManager.on('path', handler1);  // ✅ Success: [handler1]
listenerManager.on('path', handler2);  // ❌ Fails: "Only one listener allowed..."
```

**Implementation:**
```javascript
export function singlePolicy(existingListeners, path, handler, options) {
  if (existingListeners.length > 0) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Only one listener allowed for path '${path}' with 'single' policy`
    };
  }
  
  return {
    success: true,
    listeners: [handler],
    error: null
  };
}
```

### `replace` Policy

**Function:** `replacePolicy(existingListeners, path, handler, options)`

**Behavior:** Replaces all existing listeners with the new handler.

**Use Case:** When you always want the latest handler to be the only one.

**Example:**
```javascript
listenerManager.setListenerPolicy('replace');
listenerManager.on('path', handler1);  // [handler1]
listenerManager.on('path', handler2);  // [handler2] (handler1 replaced)
listenerManager.on('path', handler3);  // [handler3] (handler2 replaced)
```

**Implementation:**
```javascript
export function replacePolicy(existingListeners, path, handler, options) {
  return {
    success: true,
    listeners: [handler], // Replace all existing
    error: null
  };
}
```

### `append` Policy

**Function:** `appendPolicy(existingListeners, path, handler, options)`

**Behavior:** Always adds handler to the end (same as `multiple`).

**Use Case:** Explicitly append behavior (semantic clarity).

**Example:**
```javascript
listenerManager.setListenerPolicy('append');
listenerManager.on('path', handler1);  // [handler1]
listenerManager.on('path', handler2);  // [handler1, handler2]
```

**Implementation:**
```javascript
export function appendPolicy(existingListeners, path, handler, options) {
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}
```

### `prepend` Policy

**Function:** `prependPolicy(existingListeners, path, handler, options)`

**Behavior:** Always adds handler to the beginning of the array.

**Use Case:** When you want the latest handler to be called first.

**Example:**
```javascript
listenerManager.setListenerPolicy('prepend');
listenerManager.on('path', handler1);  // [handler1]
listenerManager.on('path', handler2);  // [handler2, handler1]
listenerManager.on('path', handler3);  // [handler3, handler2, handler1]
```

**Implementation:**
```javascript
export function prependPolicy(existingListeners, path, handler, options) {
  return {
    success: true,
    listeners: [handler, ...existingListeners],
    error: null
  };
}
```

### `priority` Policy

**Function:** `priorityPolicy(existingListeners, path, handler, options)`

**Behavior:** Adds handler with priority metadata, sorts listeners by priority (highest first).

**Options:**
- `priority` (number, default: `0`) - Handler priority (higher = called first)

**Use Case:** Control execution order based on priority.

**Example:**
```javascript
listenerManager.setListenerPolicy('priority');

// Register with priorities
listenerManager.setListenerPolicy('priority', { priority: 10 });
listenerManager.on('path', handler1);  // Priority: 10

listenerManager.setListenerPolicy('priority', { priority: 5 });
listenerManager.on('path', handler2);  // Priority: 5

listenerManager.setListenerPolicy('priority', { priority: 15 });
listenerManager.on('path', handler3);  // Priority: 15

// Final order: [handler3 (15), handler1 (10), handler2 (5)]
```

**Implementation:**
```javascript
export function priorityPolicy(existingListeners, path, handler, options) {
  const priority = options.priority || 0;
  
  // Add priority metadata to handler
  const prioritizedHandler = {
    handler,
    priority,
    path
  };
  
  // Add to existing listeners
  const newListeners = [...existingListeners, prioritizedHandler];
  
  // Sort by priority (highest first)
  newListeners.sort((a, b) => b.priority - a.priority);
  
  return {
    success: true,
    listeners: newListeners,
    error: null
  };
}
```

**Note:** With priority policy, handlers are stored as objects `{ handler, priority, path }`, not as functions directly. The `ListenerManager` extracts the handler function when calling.

### `limited` Policy

**Function:** `limitedPolicy(existingListeners, path, handler, options)`

**Behavior:** Allows registration up to a maximum number of listeners per path.

**Options:**
- `maxListeners` (number, default: `10`) - Maximum listeners allowed per path

**Use Case:** Resource management, preventing unbounded listener growth.

**Example:**
```javascript
listenerManager.setListenerPolicy('limited', { maxListeners: 3 });

listenerManager.on('path', handler1);  // ✅ Success: [handler1]
listenerManager.on('path', handler2);  // ✅ Success: [handler1, handler2]
listenerManager.on('path', handler3);  // ✅ Success: [handler1, handler2, handler3]
listenerManager.on('path', handler4);  // ❌ Fails: "Maximum 3 listeners allowed..."
```

**Implementation:**
```javascript
export function limitedPolicy(existingListeners, path, handler, options) {
  const maxListeners = options.maxListeners || 10;
  
  if (existingListeners.length >= maxListeners) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Maximum ${maxListeners} listeners allowed for path '${path}' with 'limited' policy`
    };
  }
  
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}
```

## Utility Functions

### `getAvailablePolicies()`

Get list of all available policy names.

**Signature:**
```javascript
getAvailablePolicies() => Array<string>
```

**Returns:** Array of policy names (e.g., `['multiple', 'single', 'replace', ...]`)

**Example:**
```javascript
import { getAvailablePolicies } from './listener-manager-policies.mycelia.js';

const policies = getAvailablePolicies();
console.log('Available policies:', policies);
// ['multiple', 'single', 'replace', 'append', 'prepend', 'priority', 'limited']
```

### `validatePolicyOptions(policyName, options)`

Validate policy-specific options.

**Signature:**
```javascript
validatePolicyOptions(policyName, options) => Object
```

**Parameters:**
- `policyName` (string, required) - Policy name to validate
- `options` (object, required) - Options to validate

**Returns:** Validation result object:
```javascript
{
  valid: boolean,    // Whether options are valid
  errors: Array<string>  // Array of error messages (empty if valid)
}
```

**Validated Policies:**

1. **`priority` Policy:**
   - `priority` (optional): Must be a number if provided

2. **`limited` Policy:**
   - `maxListeners` (optional): Must be a positive number (>= 1) if provided

**Example:**
```javascript
import { validatePolicyOptions } from './listener-manager-policies.mycelia.js';

// Valid options
const result1 = validatePolicyOptions('limited', { maxListeners: 5 });
console.log(result1);  // { valid: true, errors: [] }

// Invalid options
const result2 = validatePolicyOptions('limited', { maxListeners: 0 });
console.log(result2);  // { valid: false, errors: ['maxListeners must be a positive number'] }

// Invalid type
const result3 = validatePolicyOptions('priority', { priority: 'high' });
console.log(result3);  // { valid: false, errors: ['priority must be a number'] }
```

## Policy Registry

### `DEFAULT_POLICIES`

A `Map` containing all default policies.

**Structure:**
```javascript
Map<string, Function>
```

**Keys:** Policy names (strings)
**Values:** Policy functions

**Example:**
```javascript
import { DEFAULT_POLICIES } from './listener-manager-policies.mycelia.js';

// Access a policy function
const multiplePolicy = DEFAULT_POLICIES.get('multiple');

// Check if policy exists
if (DEFAULT_POLICIES.has('custom')) {
  // Custom policy registered
}
```

**Note:** Default policies cannot be unregistered. Only custom policies can be removed.

## Policy Function Contract

### Purity Requirements

Policy functions **must** be pure:

1. **No Side Effects:**
   - No mutations of input parameters
   - No external state changes
   - No I/O operations
   - No logging (unless via options.debug)

2. **Deterministic:**
   - Same inputs always produce same outputs
   - No random behavior
   - No time-dependent behavior

3. **No Dependencies:**
   - Should not depend on external state
   - Should only use provided parameters
   - Can use options for configuration

### Interface Contract

All policy functions must:

1. **Accept exactly 4 parameters** (in order):
   - `existingListeners` (Array<Function>)
   - `path` (string)
   - `handler` (Function)
   - `options` (Object)

2. **Return an object** with exactly 3 properties:
   - `success` (boolean)
   - `listeners` (Array<Function>)
   - `error` (string | null)

3. **Never mutate inputs:**
   - Always create new arrays
   - Never modify `existingListeners` directly
   - Never modify `handler` or `options`

4. **Handle all cases:**
   - Empty `existingListeners` array
   - Invalid options
   - Edge cases

## Testing Policy Functions

### Example Test

```javascript
import { multiplePolicy, singlePolicy } from './listener-manager-policies.mycelia.js';

// Test multiple policy
const handler1 = () => {};
const handler2 = () => {};

const result1 = multiplePolicy([handler1], 'path', handler2, {
  policy: 'multiple',
  debug: false
});

console.assert(result1.success === true);
console.assert(result1.listeners.length === 2);
console.assert(result1.listeners[0] === handler1);
console.assert(result1.listeners[1] === handler2);
console.assert(result1.error === null);

// Test single policy (should fail if listener exists)
const result2 = singlePolicy([handler1], 'path', handler2, {
  policy: 'single',
  debug: false
});

console.assert(result2.success === false);
console.assert(result2.listeners.length === 1);
console.assert(result2.listeners[0] === handler1);
console.assert(result2.error !== null);
```

## Common Patterns

### Pattern 1: Check Existing Listeners

```javascript
function myPolicy(existingListeners, path, handler, options) {
  // Check if listener already exists
  if (existingListeners.includes(handler)) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Handler already registered for '${path}'`
    };
  }
  
  // Add handler
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}
```

### Pattern 2: Validate Options

```javascript
function myPolicy(existingListeners, path, handler, options) {
  const maxCount = options.maxCount;
  
  // Validate option
  if (maxCount !== undefined && (typeof maxCount !== 'number' || maxCount < 1)) {
    return {
      success: false,
      listeners: existingListeners,
      error: 'maxCount must be a positive number'
    };
  }
  
  // Use option with default
  const limit = maxCount || 10;
  
  // Apply limit
  if (existingListeners.length >= limit) {
    return {
      success: false,
      listeners: existingListeners,
      error: `Maximum ${limit} listeners allowed`
    };
  }
  
  return {
    success: true,
    listeners: [...existingListeners, handler],
    error: null
  };
}
```

### Pattern 3: Conditional Logic

```javascript
function myPolicy(existingListeners, path, handler, options) {
  const mode = options.mode || 'append';
  
  if (mode === 'prepend') {
    return {
      success: true,
      listeners: [handler, ...existingListeners],
      error: null
    };
  } else {
    return {
      success: true,
      listeners: [...existingListeners, handler],
      error: null
    };
  }
}
```

## See Also

- [ListenerManager](./LISTENER-MANAGER.md) - How policies are used
- [Configuration](./CONFIG.md) - How to configure policies
- [useListeners Hook](./USE-LISTENERS.md) - Hook that uses policies

