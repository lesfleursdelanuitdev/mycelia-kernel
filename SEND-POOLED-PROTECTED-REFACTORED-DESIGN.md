# sendPooledProtected - Refactored Design with Extracted Common Logic

**Date:** 2025-01-27  
**Status:** Refactored Design  
**Purpose:** Extract common logic between `sendProtected` and `sendPooledProtected` into shared functions

---

## Overview

This refactored design extracts the common security and routing logic from `sendProtected` into separate functions that both `sendProtected` and `sendPooledProtected` can call. This follows the DRY (Don't Repeat Yourself) principle and makes the code more maintainable.

---

## Current Implementation Analysis

### `KernelProtectedMessaging.sendProtected()` Flow

1. **Validation** (lines 190-198)
   - Validate kernel identity
   - Validate PKR

2. **Security Setup** (lines 200-208)
   - Strip callerId from options
   - Set callerId and callerIdSetBy

3. **Router Setup** (lines 210-219)
   - Get MessageSystem
   - Validate router

4. **Path Extraction** (line 221)
   - Extract path from message

5. **Audit Logging** (lines 223-231)
   - Log protected send event

6. **Response Handling** (lines 233-258)
   - If isResponse: handle response, check one-shot, enforce ACL, route
   - If not response: register response-required, enforce ACL, route

---

## Refactored Design

### Extracted Functions

We'll extract the common logic into these functions in `KernelProtectedMessaging`:

1. **`#validateAndSetupSecurity(pkr, options)`** - Validation and security setup
2. **`#prepareRouting(message, sanitizedOptions)`** - Router validation and path extraction
3. **`#routeProtectedMessage(pkr, message, sanitizedOptions)`** - Core routing logic

### Function Breakdown

#### 1. `#validateAndSetupSecurity(pkr, options)`

**Purpose:** Validate inputs and set up security options

**Input:**
- `pkr` - Caller's PKR
- `options` - Original options object

**Output:**
- `{ sanitizedOptions, validationErrors }` - Sanitized options and any validation errors

**Logic:**
```javascript
#validateAndSetupSecurity(pkr, options) {
  // Validate kernel has identity
  if (!this.kernel.identity || !this.kernel.identity.pkr) {
    throw new Error('KernelProtectedMessaging: Kernel must have an identity with PKR. Ensure kernel is bootstrapped.');
  }

  // Validate pkr
  if (!pkr) {
    throw new Error('KernelProtectedMessaging: pkr is required');
  }

  // SECURITY: Strip any callerId from user-provided options (prevent spoofing)
  const { callerId, ...sanitizedOptions } = options;
  if (callerId !== undefined && this.kernel.debug) {
    console.warn(`KernelProtectedMessaging ${this.kernel.name}: callerId stripped from options - callerId is set by kernel`);
  }

  // Set callerId and callerIdSetBy in options
  sanitizedOptions.callerId = pkr;
  sanitizedOptions.callerIdSetBy = this.kernel.identity.pkr;

  return { sanitizedOptions };
}
```

#### 2. `#prepareRouting(message)`

**Purpose:** Validate router and extract path

**Input:**
- `message` - Message object

**Output:**
- `{ router, path }` - Router facet and message path

**Logic:**
```javascript
#prepareRouting(message) {
  // Get MessageSystem from context
  const ms = this.kernel.messageSystem;
  if (!ms) {
    throw new Error('KernelProtectedMessaging: MessageSystem (ctx.ms) is required but not found.');
  }

  // Use cached MessageSystem router
  if (!this.msRouter || typeof this.msRouter.route !== 'function') {
    throw new Error('KernelProtectedMessaging: messageSystemRouter facet not set. Call setMsRouter() first.');
  }

  const path = message?.path || message?.getPath?.();

  return { router: this.msRouter, path };
}
```

#### 3. `#routeProtectedMessage(pkr, message, sanitizedOptions)`

**Purpose:** Core routing logic with response handling and ACL enforcement

**Input:**
- `pkr` - Caller's PKR
- `message` - Message object
- `sanitizedOptions` - Sanitized options with security fields set

**Output:**
- `Promise<Object>` - Routing result

**Logic:**
```javascript
async #routeProtectedMessage(pkr, message, sanitizedOptions) {
  const { router, path } = this.#prepareRouting(message);

  // Audit log protected send (best-effort)
  if (this.auditLogger) {
    this.auditLogger.log({
      event: 'send_protected',
      caller: pkr?.uuid || pkr,
      path,
      timestamp: Date.now()
    });
  }

  // Handle response messages
  if (sanitizedOptions.isResponse) {
    const responseManager = this.kernel.getResponseManager();
    if (responseManager) {
      const result = responseManager.handleResponse(message);
      if (!result.ok) {
        if (this.kernel.debug) {
          console.warn(`KernelProtectedMessaging.sendProtected: Response handling failed: ${result.reason}`);
        }
        // Continue with message send even if response handling fails
      }
    } else if (this.kernel.debug) {
      console.warn('KernelProtectedMessaging.sendProtected: isResponse specified but ResponseManagerSubsystem not found');
    }

    // Route response message
    // If one-shot path: route directly (skip channel ACL)
    if (this.isOneShotPath(path)) {
      return await router.route(message, sanitizedOptions);
    }

    // Else: enforce channel ACL if channel, then route
    this.enforceChannelAccessIfChannel(pkr, path);
    return await router.route(message, sanitizedOptions);
  }

  // Non-response message (command / event / etc)
  // Register response-required if needed (non-blocking)
  this.registerResponseIfRequired(pkr, message, sanitizedOptions);

  // Enforce channel ACL if this is a channel path
  this.enforceChannelAccessIfChannel(pkr, path);

  // Route normally
  return await router.route(message, sanitizedOptions);
}
```

---

## Refactored Methods

### Refactored `sendProtected()`

```javascript
async sendProtected(pkr, message, options = {}) {
  // Step 1: Validation and security setup
  const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);

  // Step 2: Route message (includes validation, ACL, routing)
  return await this.#routeProtectedMessage(pkr, message, sanitizedOptions);
}
```

### New `sendPooledProtected()`

```javascript
async sendPooledProtected(pkr, path, body, options = {}) {
  // Step 1: Validation and security setup
  const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);

  // Step 2: Get MessageSystem for pool access
  const ms = this.kernel.messageSystem;
  if (!ms) {
    throw new Error('KernelProtectedMessaging.sendPooledProtected: MessageSystem is required but not found.');
  }

  // Step 3: Extract meta from options
  const { meta, ...sendOptions } = sanitizedOptions;

  // Step 4: Acquire message from pool
  const message = ms.acquirePooledMessage(path, body, meta);

  try {
    // Step 5: Route message (includes validation, ACL, routing)
    return await this.#routeProtectedMessage(pkr, message, sendOptions);
  } finally {
    // Step 6: Always release message back to pool
    ms.releasePooledMessage(message);
  }
}
```

---

## Complete Refactored Implementation

### `KernelProtectedMessaging` Class Structure

```javascript
export class KernelProtectedMessaging {
  constructor(kernel, msRouter) {
    this.kernel = kernel;
    this.msRouter = msRouter;
  }

  // Existing helper methods (unchanged)
  isOneShotPath(path) { ... }
  enforceChannelAccessIfChannel(pkr, path) { ... }
  registerResponseIfRequired(pkr, message, options) { ... }

  // NEW: Extracted validation and security setup
  #validateAndSetupSecurity(pkr, options) {
    // Validation and security setup logic
  }

  // NEW: Extracted routing preparation
  #prepareRouting(message) {
    // Router validation and path extraction
  }

  // NEW: Extracted core routing logic
  async #routeProtectedMessage(pkr, message, sanitizedOptions) {
    // Core routing logic with response handling and ACL
  }

  // REFACTORED: Simplified sendProtected
  async sendProtected(pkr, message, options = {}) {
    const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);
    return await this.#routeProtectedMessage(pkr, message, sanitizedOptions);
  }

  // NEW: sendPooledProtected
  async sendPooledProtected(pkr, path, body, options = {}) {
    const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);
    
    const ms = this.kernel.messageSystem;
    if (!ms) {
      throw new Error('KernelProtectedMessaging.sendPooledProtected: MessageSystem is required but not found.');
    }

    const { meta, ...sendOptions } = sanitizedOptions;
    const message = ms.acquirePooledMessage(path, body, meta);

    try {
      return await this.#routeProtectedMessage(pkr, message, sendOptions);
    } finally {
      ms.releasePooledMessage(message);
    }
  }
}
```

### `KernelSubsystem` Wrapper

```javascript
// In KernelSubsystem class

async sendProtected(pkr, message, options = {}) {
  const protectedMessaging = this.#getProtectedMessaging();
  return await protectedMessaging.sendProtected(pkr, message, options);
}

async sendPooledProtected(pkr, path, body, options = {}) {
  const protectedMessaging = this.#getProtectedMessaging();
  return await protectedMessaging.sendPooledProtected(pkr, path, body, options);
}
```

---

## Benefits of Refactoring

### 1. **DRY Principle**
- Common logic is in one place
- Changes to security/routing logic only need to be made once
- Reduces risk of divergence between methods

### 2. **Maintainability**
- Easier to understand the flow
- Clear separation of concerns
- Each function has a single responsibility

### 3. **Testability**
- Private methods can be tested indirectly through public methods
- Or we can make them protected/public for direct testing
- Easier to mock and test individual pieces

### 4. **Extensibility**
- Easy to add new protected messaging methods (e.g., `sendProtectedBatch`)
- New methods can reuse the extracted functions
- Consistent behavior across all protected messaging methods

### 5. **Code Clarity**
- `sendProtected` becomes a simple 2-line method
- `sendPooledProtected` clearly shows the pooling difference
- Intent is clearer

---

## Implementation Plan

### Phase 1: Extract Common Logic

**File:** `src/messages/v2/models/kernel-subsystem/kernel-protected-messaging.mycelia.js`

1. Extract `#validateAndSetupSecurity(pkr, options)`
2. Extract `#prepareRouting(message)`
3. Extract `#routeProtectedMessage(pkr, message, sanitizedOptions)`
4. Refactor `sendProtected()` to use extracted functions

**Testing:**
- All existing tests for `sendProtected()` should still pass
- No behavior changes, just refactoring

### Phase 2: Add sendPooledProtected

**File:** `src/messages/v2/models/kernel-subsystem/kernel-protected-messaging.mycelia.js`

1. Add `sendPooledProtected()` method
2. Use extracted functions for common logic
3. Add pool acquisition/release around routing

**File:** `src/messages/v2/models/message-system/message-system.v2.mycelia.js`

1. Add `acquirePooledMessage(path, body, meta)` method
2. Add `releasePooledMessage(message)` method

**File:** `src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

1. Add `sendPooledProtected()` wrapper method

### Phase 3: Testing

**File:** `src/messages/v2/models/kernel-subsystem/__tests__/kernel-protected-messaging.test.js`

Test cases:
1. `#validateAndSetupSecurity` - validation and security setup
2. `#prepareRouting` - router validation and path extraction
3. `#routeProtectedMessage` - routing logic
4. `sendProtected` - still works after refactoring
5. `sendPooledProtected` - new method works correctly
6. Integration tests - both methods produce same results

### Phase 4: Documentation

Update documentation to reflect the refactored structure.

---

## Code Comparison

### Before (sendProtected - 80 lines)

```javascript
async sendProtected(pkr, message, options = {}) {
  // 80 lines of mixed validation, security, routing logic
  // Hard to understand the flow
  // Difficult to reuse
}
```

### After (sendProtected - 3 lines)

```javascript
async sendProtected(pkr, message, options = {}) {
  const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);
  return await this.#routeProtectedMessage(pkr, message, sanitizedOptions);
}
```

### After (sendPooledProtected - 15 lines)

```javascript
async sendPooledProtected(pkr, path, body, options = {}) {
  const { sanitizedOptions } = this.#validateAndSetupSecurity(pkr, options);
  
  const ms = this.kernel.messageSystem;
  if (!ms) {
    throw new Error('...');
  }

  const { meta, ...sendOptions } = sanitizedOptions;
  const message = ms.acquirePooledMessage(path, body, meta);

  try {
    return await this.#routeProtectedMessage(pkr, message, sendOptions);
  } finally {
    ms.releasePooledMessage(message);
  }
}
```

---

## Function Responsibilities

| Function | Responsibility | Lines | Reusable |
|----------|---------------|-------|----------|
| `#validateAndSetupSecurity` | Validation + Security setup | ~20 | ✅ Yes |
| `#prepareRouting` | Router validation + Path extraction | ~15 | ✅ Yes |
| `#routeProtectedMessage` | Core routing logic | ~50 | ✅ Yes |
| `sendProtected` | Public API wrapper | ~3 | ❌ No |
| `sendPooledProtected` | Pooled + Protected wrapper | ~15 | ❌ No |

---

## Testing Strategy

### Unit Tests for Extracted Functions

Since the extracted functions are private (`#`), we can:

1. **Test through public methods** (recommended)
   - Test `sendProtected()` and `sendPooledProtected()`
   - Verify they produce identical results (except for pooling)
   - This tests the extracted functions indirectly

2. **Make functions protected** (alternative)
   - Change `#` to `_` (protected)
   - Allows direct testing
   - Still indicates internal use

3. **Extract to separate utility class** (if needed)
   - Create `ProtectedMessagingCore` class
   - Public methods for testing
   - Used by `KernelProtectedMessaging`

**Recommendation:** Test through public methods. The extracted functions are implementation details; testing the public API is sufficient.

---

## Migration Path

### Step 1: Refactor sendProtected (No Breaking Changes)

1. Extract functions
2. Refactor `sendProtected()` to use them
3. Run all existing tests
4. Verify no behavior changes

### Step 2: Add sendPooledProtected

1. Add pool access methods to MessageSystem
2. Add `sendPooledProtected()` to KernelProtectedMessaging
3. Add wrapper to KernelSubsystem
4. Add tests

### Step 3: Documentation

1. Update API docs
2. Add examples
3. Document the refactored structure

---

## Summary

**Yes, it's absolutely possible and recommended** to extract the common logic!

**Benefits:**
- ✅ DRY - Single source of truth
- ✅ Maintainable - Changes in one place
- ✅ Testable - Clear separation
- ✅ Extensible - Easy to add new methods
- ✅ Clear - Intent is obvious

**Structure:**
- `#validateAndSetupSecurity()` - Validation + security
- `#prepareRouting()` - Router setup
- `#routeProtectedMessage()` - Core routing logic
- `sendProtected()` - Simple wrapper (3 lines)
- `sendPooledProtected()` - Pooled wrapper (15 lines)

**Next Steps:**
1. Review this refactored design
2. Implement Phase 1 (extract common logic)
3. Implement Phase 2 (add sendPooledProtected)
4. Add comprehensive tests
5. Update documentation

---

**Design Status:** ✅ Ready for Implementation

