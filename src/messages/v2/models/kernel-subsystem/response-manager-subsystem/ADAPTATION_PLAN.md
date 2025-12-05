# ResponseManagerSubsystem Adaptation Plan

## Overview

This document outlines the plan for adapting the `ResponseManagerSubsystem` to the v2 architecture. The subsystem will be integrated as a kernel child subsystem, following the same patterns as `AccessControlSubsystem` and `ErrorManagerSubsystem`.

## Location

**Target Directory:** `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/response-manager-subsystem/`

**Files to Create:**
- `response-manager.subsystem.mycelia.js` - Main subsystem class
- `pending-response.mycelia.js` - PendingResponse class (extracted for better organization)

## Architecture Integration

### 1. Subsystem Class Structure

**Pattern:** Follow `ErrorManagerSubsystem` pattern (simpler than `AccessControlSubsystem`)

```javascript
export class ResponseManagerSubsystem extends BaseSubsystem {
  constructor(name = 'response-manager', options = {}) {
    super(name, options);
    // No hooks needed initially - simple state management
  }
}
```

**Key Differences from Original:**
- Use `BaseSubsystem` from v2 (`../../base-subsystem/base.subsystem.mycelia.js`)
- Use v2 constructor pattern with `options.ms` instead of direct `messageSystem`
- Use `this.ctx.debug` or `this.debug` for debug logging
- Use `createSubsystemLogger` utility for logging

### 2. Message Class Adaptation

**Changes Needed:**
- Original uses `new Message(replyTo, { timeout, correlationId, reason })`
- v2 Message uses: `new Message(path, body, meta = {})`
- Metadata goes in `message.meta` (MessageMetadata instance)
- Use `message.meta.set()` or `message.meta.get()` for metadata access
- Or access via `message.meta.fixed` and `message.meta.mutable`

**Adaptation:**
```javascript
// Original:
const msg = new Message(replyTo, {
  timeout: timeoutMs,
  correlationId,
  reason: 'Command timed out'
});
msg.meta = {
  ...(msg.meta || {}),
  inReplyTo: correlationId
};

// v2:
const msg = new Message(replyTo, {
  timeout: timeoutMs,
  correlationId,
  reason: 'Command timed out'
}, {
  inReplyTo: correlationId
});
// Or if meta already exists:
msg.meta.set('inReplyTo', correlationId);
```

### 3. Kernel Integration

**Pattern:** Follow `ErrorManagerSubsystem` - no hooks, simple state management

**Integration Points:**

#### A. Add to `useKernelServices` Hook

**File:** `/apps/mycelia-kernel/src/messages/v2/hooks/kernel-services/use-kernel-services.mycelia.js`

**Change:**
```javascript
import { ResponseManagerSubsystem } from '../../models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js';

// In childSubsystems array:
{
  name: 'response-manager',
  SubsystemClass: ResponseManagerSubsystem,
  config: {
    ...(kernelServicesConfig['response-manager'] || {})
  }
}
```

#### B. Add `getResponseManager()` to KernelSubsystem

**File:** `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

**Add method:**
```javascript
/**
 * Get the response manager subsystem reference.
 * 
 * @returns {ResponseManagerSubsystem|null} Response manager subsystem instance or null
 */
getResponseManager() {
  const hierarchy = this.find('hierarchy');
  if (!hierarchy) {
    return null;
  }
  return hierarchy.getChild('response-manager') || null;
}
```

### 4. Kernel.sendProtected() Integration

**File:** `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

**Change:** Update `sendProtected()` method to register response-required commands:

```javascript
async sendProtected(pkr, message, options = {}) {
  // ... existing validation code ...
  
  // Register response-required commands
  if (options.responseRequired) {
    const responseManager = this.getResponseManager();
    if (responseManager) {
      const { replyTo, timeout } = options.responseRequired;
      responseManager.registerResponseRequiredFor(
        pkr,
        message,
        { replyTo, timeout }
      );
    } else if (this.debug) {
      console.warn('KernelSubsystem.sendProtected: responseRequired specified but ResponseManagerSubsystem not found');
    }
  }
  
  // ... rest of existing code ...
}
```

### 5. Response Handling Integration

**Location:** Message routing/handling in kernel or message system

**Pattern:** Kernel should call `handleResponse()` before routing messages with `isResponse: true`

**Integration Point:** This might be in:
- Kernel message processing logic
- MessageSystem routing
- Or a hook that intercepts response messages

**Note:** Need to identify where response messages are processed and add the call there.

### 6. PendingResponse Class

**File:** `pending-response.mycelia.js`

**Changes:**
- Extract to separate file for better organization
- Keep same structure (minimal changes needed)
- Use v2 patterns if any (likely none needed)

### 7. Logging Adaptation

**Changes:**
- Replace `console.log/warn/error` with `createSubsystemLogger`
- Use `this.debug` or `this.ctx.debug` for debug flag
- Follow v2 logging patterns

**Pattern:**
```javascript
import { createSubsystemLogger } from '../../../utils/logger.utils.mycelia.js';

// In constructor or methods:
const logger = createSubsystemLogger(this);
logger.log('Message');
logger.warn('Warning');
logger.error('Error');
```

### 8. Disposal Pattern

**Changes:**
- Use v2 disposal pattern
- Call `super.dispose()` properly
- Follow async disposal pattern

**Pattern:**
```javascript
async dispose() {
  // Clear timeouts
  for (const entry of this.#pendingByCorrelation.values()) {
    entry.clearTimeout();
  }
  
  // Clear maps
  this.#pendingByCorrelation.clear();
  this.#pendingByOwner.clear();
  
  // Call parent dispose
  await super.dispose();
}
```

### 9. getRoot() Usage

**Changes:**
- Original uses direct kernel reference
- v2 uses `this.getRoot()` from BaseSubsystem
- Verify root is KernelSubsystem before calling `sendProtected()`

**Pattern:**
```javascript
const kernel = this.getRoot();
if (!kernel || typeof kernel.sendProtected !== 'function') {
  throw new Error('ResponseManagerSubsystem: kernel.sendProtected is not available.');
}
```

### 10. Message Metadata Access

**Changes:**
- v2 Message uses `MessageMetadata` class
- Access via `message.meta.get('key')` or `message.meta.fixed.key`
- Check `message.meta.mutable` for mutable metadata

**Pattern:**
```javascript
#deriveCorrelationIdFromMessage(message) {
  if (!message) return null;
  
  const meta = message.meta || {};
  return (
    meta.get?.('inReplyTo') ||
    meta.get?.('correlationId') ||
    meta.fixed?.inReplyTo ||
    meta.fixed?.correlationId ||
    message.inReplyTo ||
    message.correlationId ||
    null
  );
}
```

## Implementation Steps

### Phase 1: Core Structure
1. ✅ Create directory structure
2. Create `pending-response.mycelia.js` (extract PendingResponse class)
3. Create `response-manager.subsystem.mycelia.js` skeleton
4. Adapt constructor and basic structure

### Phase 2: Core Functionality
5. Adapt `registerResponseRequiredFor()` method
6. Adapt `cancel()` method
7. Adapt `handleResponse()` method
8. Adapt timeout handling (`#onTimeout`, `#emitTimeoutResponse`)
9. Adapt `#finalizeEntry()` method

### Phase 3: Integration
10. Add to `useKernelServices` hook
11. Add `getResponseManager()` to KernelSubsystem
12. Update `kernel.sendProtected()` to register responses
13. Integrate response handling in message routing

### Phase 4: Logging & Polish
14. Replace console.log with createSubsystemLogger
15. Update all logging calls
16. Test disposal pattern
17. Verify getRoot() usage

### Phase 5: Testing & Documentation
18. Add JSDoc comments
19. Test timeout scenarios
20. Test response correlation
21. Test disposal
22. Update any relevant documentation

## Key Considerations

### 1. Message Structure
- v2 Message has different constructor signature
- Metadata is in `message.meta` (MessageMetadata instance)
- Need to adapt all message creation and metadata access

### 2. Kernel Access
- Use `this.getRoot()` instead of direct kernel reference
- Verify root is KernelSubsystem before use
- Handle case where root might not be kernel

### 3. Error Handling
- Follow v2 error handling patterns
- Use Result objects if appropriate (like ErrorManagerSubsystem)
- Or throw errors directly (like AccessControlSubsystem)

### 4. Configuration
- Support `config.responseManager` for configuration
- Support timeout defaults
- Support debug configuration

### 5. Hooks
- Initially no hooks needed (simple state management)
- Could add hooks later if needed (e.g., for persistence, metrics)

### 6. Testing
- Test timeout scenarios
- Test response correlation
- Test multiple pending responses
- Test disposal
- Test integration with kernel.sendProtected()

## Dependencies

**Required:**
- `BaseSubsystem` from v2
- `Message` from v2
- `createSubsystemLogger` utility
- KernelSubsystem (for getRoot())

**Optional:**
- No hooks initially
- Could add hooks later for metrics/persistence

## Files to Modify

1. **New Files:**
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js`
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/response-manager-subsystem/pending-response.mycelia.js`

2. **Files to Modify:**
   - `/apps/mycelia-kernel/src/messages/v2/hooks/kernel-services/use-kernel-services.mycelia.js` (add ResponseManagerSubsystem)
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js` (add getResponseManager(), update sendProtected())

3. **Files to Review (for response handling integration):**
   - Message routing logic (where responses are processed)
   - Kernel message processing (where to call handleResponse())

## Open Questions

1. **Response Handling Location:** Where should `handleResponse()` be called?
   - In kernel message processing?
   - In MessageSystem routing?
   - In a hook that intercepts response messages?

2. **Error Handling Pattern:** Should we use Result objects (like ErrorManagerSubsystem) or throw errors (like AccessControlSubsystem)?

3. **Configuration:** What configuration options should be supported?
   - Default timeout?
   - Max pending responses?
   - Timeout cleanup interval?

4. **Metrics:** Should we add metrics/statistics for pending responses?
   - Could use useStatistics hook
   - Or add simple counters

5. **Persistence:** Should pending responses survive restarts?
   - Probably not initially
   - Could add persistence hook later

## Success Criteria

✅ Subsystem extends BaseSubsystem correctly
✅ Follows v2 architecture patterns
✅ Integrates with useKernelServices hook
✅ Accessible via kernel.getResponseManager()
✅ Registers responses from kernel.sendProtected()
✅ Handles incoming responses correctly
✅ Emits timeout responses via kernel.sendProtected()
✅ Proper disposal and cleanup
✅ Uses v2 logging patterns
✅ Uses v2 Message class correctly
✅ All tests pass

