# sendPooledProtected Design

**Date:** 2025-01-27  
**Status:** Design Phase  
**Purpose:** Combine message pooling performance with kernel security features

---

## Overview

`sendPooledProtected` will be a new method on the `KernelSubsystem` that combines:
- **Message Pooling** (from `MessageSystem.sendPooled()`) - Performance optimization
- **Security Features** (from `Kernel.sendProtected()`) - Caller authentication, ACL enforcement

This provides a high-performance, secure messaging path for kernel operations.

---

## Current Implementations

### 1. `MessageSystem.sendPooled()`

**Location:** `src/messages/v2/models/message-system/message-system.v2.mycelia.js`

**Signature:**
```javascript
async sendPooled(path, body, options = {})
```

**Flow:**
1. Extract `meta` from options
2. Acquire Message from `#messagePool`
3. Call `send(message, sendOptions)`
4. Release Message back to pool in `finally` block

**Key Features:**
- Uses private `#messagePool` instance
- Automatic lifecycle management (acquire/release)
- 10% performance improvement
- 95% memory reduction

### 2. `Kernel.sendProtected()`

**Location:** `src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

**Signature:**
```javascript
async sendProtected(pkr, message, options = {})
```

**Flow:**
1. Validate kernel identity and PKR
2. Strip `callerId` from options (security)
3. Set `callerId` and `callerIdSetBy` in options
4. Handle response management (if `isResponse`)
5. Enforce channel ACL (if channel path)
6. Route via MessageSystem router

**Key Features:**
- Caller authentication (PKR-based)
- Spoofing prevention
- Channel ACL enforcement
- Response management
- Audit logging

---

## Design: `sendPooledProtected`

### Location

**File:** `src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`  
**Class:** `KernelSubsystem`

### Signature

```javascript
/**
 * Send a protected message using pooled Message instance (performance + security optimized)
 * 
 * Combines message pooling (performance) with kernel security features (authentication, ACL).
 * This provides 10% better performance than sendProtected() while maintaining all security guarantees.
 * 
 * SECURITY: This method allows the kernel to set the callerId for authenticated messages.
 * Any callerId in the provided options is stripped to prevent spoofing.
 * The kernel sets both the callerId (from the provided PKR) and callerIdSetBy (kernel's PKR).
 * 
 * Flow:
 * 1. Validate kernel identity and pkr
 * 2. Acquire Message from MessageSystem's pool
 * 3. Strip callerId from options and set callerId/callerIdSetBy
 * 4. Handle response management (if isResponse)
 * 5. Enforce channel ACL (if channel path)
 * 6. Route via MessageSystem router
 * 7. Release Message back to pool
 * 
 * @param {PKR} pkr - The caller's Public Key Record (PKR)
 * @param {string} path - Message path (e.g., 'api://users/123')
 * @param {any} body - Message body/payload
 * @param {Object} [options={}] - Send options
 * @param {Object} [options.meta] - Message metadata
 * @param {boolean} [options.isResponse] - Whether this is a response message
 * @param {string} [options.channel] - Channel identifier (for ACL enforcement)
 * @returns {Promise<Object>} Send result
 * @throws {Error} If kernel identity is missing, MessageSystem is not found, or pkr is invalid
 * 
 * @example
 * // Send a protected pooled message
 * const result = await kernel.sendPooledProtected(
 *   callerPkr,
 *   'api://users/123',
 *   { action: 'get' }
 * );
 * 
 * @example
 * // With metadata and options
 * const result = await kernel.sendPooledProtected(
 *   callerPkr,
 *   'api://users/123',
 *   { action: 'get' },
 *   {
 *     meta: { traceId: 'abc123' },
 *     isResponse: false
 *   }
 * );
 */
async sendPooledProtected(pkr, path, body, options = {})
```

### Implementation Flow

```javascript
async sendPooledProtected(pkr, path, body, options = {}) {
  // 1. VALIDATION (same as sendProtected)
  //    - Validate kernel identity
  //    - Validate PKR
  
  // 2. GET MESSAGE POOL
  //    - Access MessageSystem's message pool
  //    - Extract meta from options
  
  // 3. ACQUIRE MESSAGE FROM POOL
  //    - Acquire pooled Message instance
  //    - Message is initialized with path, body, meta
  
  // 4. SECURITY SETUP (same as sendProtected)
  //    - Strip callerId from options
  //    - Set callerId and callerIdSetBy
  
  // 5. ROUTE MESSAGE (same as sendProtected)
  //    - Handle response management
  //    - Enforce channel ACL
  //    - Route via MessageSystem router
  
  // 6. RELEASE MESSAGE
  //    - Release Message back to pool in finally block
}
```

### Detailed Implementation Steps

#### Step 1: Validation
```javascript
// Validate kernel has identity
if (!this.identity || !this.identity.pkr) {
  throw new Error('KernelSubsystem.sendPooledProtected: Kernel must have an identity with PKR. Ensure kernel is bootstrapped.');
}

// Validate pkr
if (!pkr) {
  throw new Error('KernelSubsystem.sendPooledProtected: pkr is required');
}
```

#### Step 2: Get Message Pool
```javascript
// Get MessageSystem from context
const ms = this.messageSystem;
if (!ms) {
  throw new Error('KernelSubsystem.sendPooledProtected: MessageSystem is required but not found.');
}

// Access MessageSystem's message pool
// NOTE: MessageSystem has private #messagePool, so we need a way to access it
// Options:
//   A) Add public getter: messageSystem.getMessagePool()
//   B) Add public method: messageSystem.acquirePooledMessage(path, body, meta)
//   C) Use reflection (not recommended)
//   D) Pass pool reference during bootstrap
```

**Decision Needed:** How should Kernel access MessageSystem's message pool?

#### Step 3: Acquire Message
```javascript
// Extract meta from options
const { meta, ...sendOptions } = options;

// Acquire Message from pool
const message = ms.getMessagePool().acquire(path, body, meta);
// OR
const message = ms.acquirePooledMessage(path, body, meta);
```

#### Step 4: Security Setup
```javascript
// SECURITY: Strip any callerId from user-provided options
const { callerId, ...sanitizedOptions } = sendOptions;
if (callerId !== undefined && this.debug) {
  console.warn(`KernelSubsystem.sendPooledProtected: callerId stripped from options - callerId is set by kernel`);
}

// Set callerId and callerIdSetBy
sanitizedOptions.callerId = pkr;
sanitizedOptions.callerIdSetBy = this.identity.pkr;
```

#### Step 5: Route Message
```javascript
// Get protected messaging helper
const protectedMessaging = this.#getProtectedMessaging();

// Use existing sendProtected logic but with pooled message
// We can either:
//   A) Extract routing logic to shared method
//   B) Call sendProtected with pooled message (but it expects Message object)
//   C) Duplicate routing logic (not ideal)

// Option B seems cleanest - sendProtected already handles Message objects
return await protectedMessaging.sendProtected(pkr, message, sanitizedOptions);
```

**Issue:** `sendProtected` expects a `Message` object, but we're creating it from the pool. This should work, but we need to ensure the message is released after `sendProtected` completes.

#### Step 6: Release Message
```javascript
try {
  // Route message (from Step 5)
  return await protectedMessaging.sendProtected(pkr, message, sanitizedOptions);
} finally {
  // Always release message back to pool
  ms.getMessagePool().release(message);
  // OR
  ms.releasePooledMessage(message);
}
```

---

## Design Decisions

### Decision 1: Message Pool Access

**Problem:** MessageSystem's `#messagePool` is private. Kernel needs access.

**Options:**

#### Option A: Public Getter
```javascript
// In MessageSystem
getMessagePool() {
  return this.#messagePool;
}
```

**Pros:**
- Simple
- Direct access
- Flexible

**Cons:**
- Exposes internal implementation
- Could be misused

#### Option B: Public Pool Methods
```javascript
// In MessageSystem
acquirePooledMessage(path, body, meta) {
  return this.#messagePool.acquire(path, body, meta);
}

releasePooledMessage(message) {
  return this.#messagePool.release(message);
}
```

**Pros:**
- Encapsulates pool access
- Clear API
- Prevents misuse

**Cons:**
- More methods to maintain
- Slightly more overhead

#### Option C: Pass Pool Reference
```javascript
// During bootstrap, pass pool reference to kernel
kernel.setMessagePool(messageSystem.#messagePool);
```

**Pros:**
- No public API changes
- Direct access

**Cons:**
- Breaks encapsulation
- Requires bootstrap changes

**Recommendation:** **Option B** - Public pool methods provide clean encapsulation while maintaining flexibility.

### Decision 2: Implementation Strategy

**Problem:** How to combine pooling with protected messaging?

**Options:**

#### Option A: Extract Routing Logic
Extract the routing logic from `sendProtected` to a shared method, then call it from both `sendProtected` and `sendPooledProtected`.

**Pros:**
- DRY (Don't Repeat Yourself)
- Single source of truth
- Easier to maintain

**Cons:**
- Requires refactoring
- More complex

#### Option B: Call sendProtected with Pooled Message
Acquire message from pool, call `sendProtected`, release in finally.

**Pros:**
- Simple
- Reuses existing logic
- Minimal changes

**Cons:**
- `sendProtected` doesn't know about pooling
- Could work but feels like a workaround

#### Option C: Duplicate Logic
Copy routing logic from `sendProtected` to `sendPooledProtected`.

**Pros:**
- No refactoring needed
- Clear separation

**Cons:**
- Code duplication
- Maintenance burden
- Risk of divergence

**Recommendation:** **Option B** - Call `sendProtected` with pooled message. It's the simplest and reuses existing, tested logic. The pooling is transparent to `sendProtected`.

### Decision 3: Error Handling

**Problem:** What if message acquisition fails? What if routing fails?

**Solution:** Use try-finally pattern:
```javascript
const message = ms.acquirePooledMessage(path, body, meta);
try {
  return await protectedMessaging.sendProtected(pkr, message, sanitizedOptions);
} finally {
  ms.releasePooledMessage(message);
}
```

This ensures the message is always released, even if routing throws an error.

### Decision 4: Performance Considerations

**Question:** Should we add any performance optimizations?

**Considerations:**
- Message pooling already provides 10% improvement
- Security checks are necessary overhead
- No additional optimizations needed at this stage

**Decision:** Keep it simple. The pooling provides the performance benefit; security is non-negotiable.

---

## Implementation Plan

### Phase 1: MessageSystem Pool Access (Prerequisite)

**File:** `src/messages/v2/models/message-system/message-system.v2.mycelia.js`

Add public methods for pool access:

```javascript
/**
 * Acquire a pooled Message instance
 * 
 * @param {string} path - Message path
 * @param {any} body - Message body
 * @param {Object} [meta={}] - Message metadata
 * @returns {Message} Pooled Message instance
 */
acquirePooledMessage(path, body, meta = {}) {
  return this.#messagePool.acquire(path, body, meta);
}

/**
 * Release a pooled Message instance
 * 
 * @param {Message} message - Message to release
 * @returns {boolean} True if released, false if discarded
 */
releasePooledMessage(message) {
  return this.#messagePool.release(message);
}
```

### Phase 2: Kernel sendPooledProtected Method

**File:** `src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

Add the new method:

```javascript
async sendPooledProtected(pkr, path, body, options = {}) {
  // Validation
  // Acquire message
  // Security setup
  // Route via sendProtected
  // Release message
}
```

### Phase 3: Testing

**File:** `src/messages/v2/models/kernel-subsystem/__tests__/kernel.sendPooledProtected.test.js`

Test cases:
1. Basic usage - send pooled protected message
2. Security - callerId stripping
3. Security - callerId and callerIdSetBy injection
4. Performance - verify pooling works
5. Error handling - message released on error
6. Channel ACL - enforcement works
7. Response management - works with pooled messages
8. Integration - works with real subsystems

### Phase 4: Documentation

**File:** `src/messages/v2/docs/communication/SEND-POOLED-PROTECTED.md`

Document:
- Purpose and use cases
- API reference
- Examples
- Performance characteristics
- Security guarantees
- When to use vs sendProtected vs sendPooled

---

## API Comparison

### Current APIs

| Method | Location | Purpose | Performance | Security |
|--------|----------|---------|-------------|----------|
| `send()` | MessageSystem | Basic messaging | Standard | None |
| `sendPooled()` | MessageSystem | Pooled messaging | +10% | None |
| `sendProtected()` | Kernel | Secure messaging | Standard | Full |

### New API

| Method | Location | Purpose | Performance | Security |
|--------|----------|---------|-------------|----------|
| `sendPooledProtected()` | Kernel | Pooled + Secure | +10% | Full |

---

## Use Cases

### 1. High-Frequency Secure Messaging

When kernel needs to send many protected messages:
```javascript
// Instead of:
for (const item of items) {
  const msg = new Message('api://process', item);
  await kernel.sendProtected(callerPkr, msg);
}

// Use:
for (const item of items) {
  await kernel.sendPooledProtected(callerPkr, 'api://process', item);
}
```

**Benefit:** 10% faster, 95% less memory

### 2. Kernel Internal Operations

Kernel subsystems sending messages to each other:
```javascript
// In AccessControlSubsystem
await kernel.sendPooledProtected(
  this.identity.pkr,
  'error-manager://log',
  { error: 'Access denied' }
);
```

**Benefit:** Better performance for internal operations

### 3. Response Messages

Sending response messages with pooling:
```javascript
await kernel.sendPooledProtected(
  callerPkr,
  'api://response',
  result,
  { isResponse: true }
);
```

**Benefit:** Faster response handling

---

## Performance Expectations

Based on `sendPooled()` benchmarks:

- **Throughput:** +10% improvement
- **Memory:** 95% reduction in heap growth
- **Reuse Rate:** 100% (perfect efficiency)
- **Latency:** <1ms at p95

Security overhead is minimal (just PKR validation and option manipulation).

---

## Security Guarantees

`sendPooledProtected` maintains all security guarantees of `sendProtected`:

✅ **Caller Authentication** - PKR-based identity  
✅ **Spoofing Prevention** - callerId stripped and set by kernel  
✅ **Channel ACL** - Automatic enforcement  
✅ **Response Management** - Proper tracking  
✅ **Audit Logging** - Best-effort logging  

No security compromises for performance.

---

## Backward Compatibility

✅ **Fully backward compatible** - New method, doesn't change existing APIs  
✅ **Optional** - Can still use `sendProtected()` or `sendPooled()`  
✅ **No breaking changes** - All existing code continues to work  

---

## Future Enhancements

### 1. Batch sendPooledProtected

For sending multiple messages at once:
```javascript
await kernel.sendPooledProtectedBatch([
  { pkr: pkr1, path: 'api://1', body: {} },
  { pkr: pkr2, path: 'api://2', body: {} }
]);
```

### 2. Pool Statistics

Expose pool statistics for monitoring:
```javascript
const stats = kernel.getPoolStats();
console.log('Pool reuse rate:', stats.reuseRate);
```

### 3. Pool Warmup

Pre-allocate messages for known workloads:
```javascript
kernel.warmupPool(1000);
```

---

## Open Questions

1. **Pool Access:** Should we use Option A (getter) or Option B (methods)?  
   **Recommendation:** Option B (methods) for better encapsulation.

2. **Error Handling:** Should we log pool acquisition failures?  
   **Recommendation:** Yes, in debug mode.

3. **Pool Size:** Should kernel have its own pool or share MessageSystem's?  
   **Recommendation:** Share MessageSystem's pool (simpler, efficient).

4. **Documentation:** Should this be in the main README or separate doc?  
   **Recommendation:** Separate doc with link from main README.

---

## Summary

`sendPooledProtected` combines the best of both worlds:
- **Performance** from message pooling (10% faster, 95% less memory)
- **Security** from kernel protected messaging (full authentication and ACL)

**Implementation:**
1. Add pool access methods to MessageSystem
2. Add `sendPooledProtected` to Kernel
3. Use try-finally for lifecycle management
4. Reuse existing `sendProtected` logic

**Benefits:**
- High-performance secure messaging
- Backward compatible
- Minimal code changes
- Full security guarantees

**Next Steps:**
1. Review and approve design
2. Implement Phase 1 (pool access)
3. Implement Phase 2 (sendPooledProtected)
4. Add tests
5. Update documentation

---

**Design Status:** ✅ Ready for Review

