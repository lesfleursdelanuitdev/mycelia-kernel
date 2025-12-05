# performRequest Adaptation Plan

## Overview

This document outlines the plan for adapting the `performRequest` function to match the v2 architecture patterns and the provided code structure. The main changes involve using the correct `responseRequired` format, avoiding message metadata mutation, and using proper v2 APIs.

## Current State Analysis

### Current v2 Implementation Issues

1. **Incorrect `responseRequired` format**: Uses `responseRequired: true` with separate `replyPath` option
2. **Mutates message metadata**: Uses `message.meta.updateMutable()` which violates v2 frozen metadata principle
3. **Complex route pattern**: Uses nested path structure
4. **Uses `replyPath` instead of `replyTo`**: Inconsistent with v2 kernel expectations

### v2 Kernel Expectations

From `KernelSubsystem.sendProtected()`:
```javascript
if (options.responseRequired) {
  const { replyTo, timeout } = options.responseRequired;  // Expects OBJECT with replyTo
  responseManager.registerResponseRequiredFor(pkr, message, { replyTo, timeout });
}
```

**Key Finding**: v2 kernel expects `responseRequired` to be an **object** with `{ replyTo, timeout }`, NOT a boolean!

## Required Changes

### 1. Message ID Access

**Current (v2):** ✅ Already correct
```javascript
const messageId = message.getId();
```

**Provided Code:** ❌ Uses `message.id`
```javascript
if (!message.id) { ... }
const replyTo = ... `${message.id}`;
```

**Change Required:**
- Use `message.getId()` instead of `message.id`
- Validate: `if (!message.getId())` or `if (!message.getId?.())`

### 2. responseRequired Format

**Current (v2):** ❌ Incorrect format
```javascript
identity.sendProtected(message, {
  responseRequired: true,  // Wrong: should be object
  replyPath                 // Wrong: should be inside responseRequired
});
```

**Provided Code:** ❌ Also incorrect format
```javascript
identity.sendProtected(message, {
  responseRequired: true,  // Wrong: should be object
  replyTo                   // Wrong: should be inside responseRequired
});
```

**Correct v2 Format:** ✅
```javascript
identity.sendProtected(message, {
  responseRequired: {
    replyTo: replyTo,      // Inside object
    timeout: timeout       // Inside object
  }
});
```

**Change Required:**
- Change `responseRequired: true` to `responseRequired: { replyTo, timeout }`
- Remove separate `replyPath` or `replyTo` from sendOptions
- Include `timeout` in the `responseRequired` object

### 3. Message Metadata Mutation

**Current (v2):** ❌ Mutates frozen metadata
```javascript
message.meta.updateMutable({
  responseRequired: true,
  replyPath
});
```

**Provided Code:** ✅ Correct - does NOT mutate
```javascript
// No mutation - reply semantics live in send options only
```

**Change Required:**
- **Remove** `message.meta.updateMutable()` call
- All reply semantics should be in send options only
- Message metadata is frozen in v2 and should not be mutated

### 4. Route Pattern

**Current (v2):** Complex nested pattern
```javascript
const localPath = localReplyPath ?? `identity/reply/${messageId}`;
const replyPath = explicitReplyPath ?? `${nameString}/${localPath}`;
// Result: "subsystem://identity/reply/msg123"
```

**Provided Code:** Simpler pattern
```javascript
const replyTo = explicitReplyTo ?? `${nameString}://request/oneShot/${message.id}`;
// Result: "subsystem://request/oneShot/msg123"
```

**Change Required:**
- Use simpler route pattern: `${nameString}://request/oneShot/${messageId}`
- Keep support for `explicitReplyTo` option
- Remove `localReplyPath` complexity

### 5. Option Names

**Current (v2):** Uses `replyPath`
```javascript
const { replyPath: explicitReplyPath, ...sendOptions } = opts;
```

**Provided Code:** Uses `replyTo`
```javascript
const { replyTo: explicitReplyTo, ...sendOptions } = opts;
```

**Change Required:**
- Use `replyTo` instead of `replyPath` (matches v2 kernel expectations)
- Rename option: `replyPath` → `replyTo`

### 6. Subsystem Name Access

**Current (v2):** ✅ Already correct
```javascript
const nameString = subsystem.getNameString?.() || subsystem.name || 'subsystem';
```

**Provided Code:** ✅ Same pattern
```javascript
const nameString = subsystem.getNameString?.() || subsystem.name || 'subsystem';
```

**No Change Required:** This is already correct

## Implementation Plan

### Phase 1: Message ID and Validation
1. Change `message.id` → `message.getId()`
2. Update validation: `if (!message.getId?.())`
3. Update route generation to use `message.getId()`

### Phase 2: responseRequired Format
4. Change `responseRequired: true` → `responseRequired: { replyTo, timeout }`
5. Remove separate `replyPath`/`replyTo` from sendOptions
6. Include `timeout` in `responseRequired` object

### Phase 3: Remove Metadata Mutation
7. Remove `message.meta.updateMutable()` call
8. Ensure all reply semantics are in send options only

### Phase 4: Route Pattern Simplification
9. Simplify route pattern to `${nameString}://request/oneShot/${messageId}`
10. Change option name: `replyPath` → `replyTo`
11. Remove `localReplyPath` complexity

### Phase 5: Testing
12. Test with v2 kernel
13. Verify ResponseManagerSubsystem receives correct format
14. Verify routes are registered correctly
15. Verify timeout handling works

## Detailed Changes

### Change 1: Message ID Access

**Before:**
```javascript
if (!message.id) {
  throw new Error('performRequest: message.id is required...');
}
const replyTo = ... `${message.id}`;
```

**After:**
```javascript
const messageId = message.getId?.();
if (!messageId) {
  throw new Error('performRequest: message.getId() must return a valid id for oneShot requests.');
}
const replyTo = explicitReplyTo ?? `${nameString}://request/oneShot/${messageId}`;
```

### Change 2: Options Normalization

**Before:**
```javascript
const {
  timeout = 10_000,
  localReplyPath,
  replyPath: explicitReplyPath,
  ...sendOptions
} = opts;
```

**After:**
```javascript
const {
  timeout = 10_000,
  replyTo: explicitReplyTo,
  ...sendOptions
} = opts;
```

### Change 3: Route Generation

**Before:**
```javascript
const messageId = message.getId();
const localPath = localReplyPath ?? `identity/reply/${messageId}`;
const replyPath = explicitReplyPath ?? `${nameString}/${localPath}`;
```

**After:**
```javascript
const messageId = message.getId?.();
if (!messageId) {
  throw new Error('performRequest: message.getId() must return a valid id for oneShot requests.');
}
const replyTo = explicitReplyTo ?? `${nameString}://request/oneShot/${messageId}`;
```

### Change 4: Remove Metadata Mutation

**Before:**
```javascript
// Set response metadata on message
message.meta.updateMutable({
  responseRequired: true,
  replyPath
});
```

**After:**
```javascript
// No mutation - reply semantics live in send options only
// Message metadata is frozen in v2
```

### Change 5: Send Options Format

**Before:**
```javascript
identity.sendProtected(message, {
  ...sendOptions,
  responseRequired: true,
  replyPath
});
```

**After:**
```javascript
identity.sendProtected(message, {
  ...sendOptions,
  responseRequired: {
    replyTo,
    timeout
  }
});
```

### Change 6: Route Variable Name

**Before:**
```javascript
const routeForHandler = replyPath;
routerFacet.registerRoute(replyPath, ...);
routerFacet.unregisterRoute(replyPath);
```

**After:**
```javascript
const routeForHandler = replyTo;
routerFacet.registerRoute(replyTo, ...);
routerFacet.unregisterRoute(replyTo);
```

## Complete Adapted Function Structure

```javascript
export async function performRequest(subsystem, handler, message, timeoutOrOptions) {
  // Get router facet
  const routerFacet = subsystem.router || subsystem.find?.('router');
  if (!routerFacet) {
    throw new Error('performRequest: subsystem requires router facet');
  }

  // Get identity
  const identity = subsystem.identity;
  if (!identity?.sendProtected) {
    throw new Error('performRequest: subsystem requires identity.sendProtected()');
  }

  // Normalize options
  let opts = {};
  if (typeof timeoutOrOptions === 'number') {
    opts.timeout = timeoutOrOptions;
  } else if (typeof timeoutOrOptions === 'object' && timeoutOrOptions !== null) {
    opts = { ...timeoutOrOptions };
  }

  const {
    timeout = 10_000,
    replyTo: explicitReplyTo,
    ...sendOptions
  } = opts;

  // Get subsystem name
  const nameString = subsystem.getNameString?.() || subsystem.name || 'subsystem';

  // Get message ID (v2 uses getId() method)
  const messageId = message.getId?.();
  if (!messageId) {
    throw new Error('performRequest: message.getId() must return a valid id for oneShot requests.');
  }

  // Generate reply route
  const replyTo = explicitReplyTo ?? `${nameString}://request/oneShot/${messageId}`;
  const routeForHandler = replyTo;

  // NO metadata mutation - reply semantics live in send options only

  return new Promise((resolve, reject) => {
    let timeoutId = null;

    const wrappedHandler = async (responseMessage, params, localHandlerOptions = {}) => {
      try {
        routerFacet.unregisterRoute(routeForHandler);
        if (timeoutId) clearTimeout(timeoutId);
        const result = await handler(responseMessage, params, localHandlerOptions);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    try {
      routerFacet.registerRoute(routeForHandler, wrappedHandler, {
        metadata: { description: `Auto reply route for message ${messageId}` }
      });
    } catch (err) {
      return reject(err);
    }

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        routerFacet.unregisterRoute(routeForHandler);
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    }

    identity.sendProtected(message, {
      ...sendOptions,
      responseRequired: {
        replyTo,
        timeout
      }
    }).catch((err) => {
      routerFacet.unregisterRoute(routeForHandler);
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
}
```

## Key Differences Summary

| Aspect | Current v2 | Provided Code | Correct v2 |
|--------|-----------|---------------|-------------|
| Message ID | `message.getId()` ✅ | `message.id` ❌ | `message.getId()` ✅ |
| responseRequired | `true` + `replyPath` ❌ | `true` + `replyTo` ❌ | `{ replyTo, timeout }` ✅ |
| Metadata Mutation | `updateMutable()` ❌ | None ✅ | None ✅ |
| Route Pattern | Complex nested ❌ | Simple ✅ | Simple ✅ |
| Option Name | `replyPath` ❌ | `replyTo` ✅ | `replyTo` ✅ |
| Timeout Location | Separate ❌ | Separate ❌ | In `responseRequired` ✅ |

## Testing Checklist

- [ ] Message ID validation works with `message.getId()`
- [ ] Route generation uses correct pattern
- [ ] `responseRequired` format matches v2 kernel expectations
- [ ] ResponseManagerSubsystem receives correct `replyTo` and `timeout`
- [ ] Routes are registered and unregistered correctly
- [ ] Timeout handling works correctly
- [ ] No metadata mutation occurs
- [ ] Explicit `replyTo` option works
- [ ] Error handling works correctly

## Success Criteria

✅ Uses `message.getId()` instead of `message.id`
✅ Uses `responseRequired: { replyTo, timeout }` format
✅ Does NOT mutate message metadata
✅ Uses simpler route pattern
✅ Uses `replyTo` option name (not `replyPath`)
✅ Includes `timeout` in `responseRequired` object
✅ Works correctly with v2 kernel and ResponseManagerSubsystem
✅ No breaking changes to function signature
✅ No linter errors

