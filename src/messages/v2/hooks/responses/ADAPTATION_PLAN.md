# useResponses Hook Adaptation Plan

## Overview

This document outlines the plan for adapting the `useResponses` hook to the v2 architecture. The hook provides a convenient way to send response messages with proper correlation and integration with the ResponseManagerSubsystem.

## Location

**Target Directory:** `/apps/mycelia-kernel/src/messages/v2/hooks/responses/`

**File to Create:**
- `use-responses.mycelia.js` - Main hook implementation

## Architecture Integration

### 1. Hook Structure

**Pattern:** Follow standard v2 hook pattern (similar to `useMessages`, `useQueries`)

```javascript
export const useResponses = createHook({
  kind: 'responses',
  overwrite: false,
  required: ['messages'],  // Depends on messages facet
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Implementation
  }
});
```

**Key Differences from Original:**
- Uses v2 `createHook` factory (already compatible)
- Uses v2 `Facet` class (already compatible)
- Requires `messages` facet (exists in v2)
- Uses v2 logging patterns (`createSubsystemLogger` or `createLogger`)

### 2. Messages Facet Integration

**Changes Needed:**
- Original checks for `messagesFacet.create` or `messagesFacet.message`
- v2 has `messagesFacet.create(path, body, options)` - use this directly
- No need for fallback checks

**Adaptation:**
```javascript
// Original:
const msg = messagesFacet.create
  ? messagesFacet.create(path, payload)
  : messagesFacet.message
  ? messagesFacet.message(path, payload)
  : null;

// v2:
const msg = messagesFacet.create(path, payload, {
  meta: {
    inReplyTo: correlationId  // Custom metadata goes in meta parameter
  }
});
```

### 3. Identity.sendProtected Integration

**Changes Needed:**
- Original: `identity.sendProtected(msg, options)` - signature is correct!
- v2: `identity.sendProtected(message, options)` - same signature
- v2 identity is created by `createIdentity()` and wraps `kernel.sendProtected(ownerPkr, message, options)`
- The PKR is auto-injected by the identity wrapper

**Adaptation:**
```javascript
// This should work as-is in v2:
return identity.sendProtected(msg, {
  ...options,
  isResponse: true,
  success,
  error
});
```

**Note:** The original code already has the correct signature - no changes needed!

### 4. Message Metadata Handling

**Changes Needed:**
- Original: `msg.meta = { ...(msg.meta || {}), inReplyTo }` - tries to mutate meta
- v2: MessageMetadata is frozen - fixed metadata cannot be mutated after creation
- Solution: Add `inReplyTo` to the `meta` parameter when creating the message

**Adaptation:**
```javascript
// Original (doesn't work in v2):
const msg = messagesFacet.create(path, payload);
msg.meta = {
  ...(msg.meta || {}),
  inReplyTo
};

// v2 (correct approach):
const msg = messagesFacet.create(path, payload, {
  meta: {
    inReplyTo: correlationId  // Goes into fixed metadata during creation
  }
});
```

### 5. Correlation ID Extraction

**Changes Needed:**
- Original: Accesses `originalMessage.id`, `meta.correlationId`, `originalMessage.correlationId`
- v2: Message has `getId()` method, metadata is MessageMetadata instance
- Need to handle v2 MessageMetadata structure

**Adaptation:**
```javascript
function deriveCorrelationId(originalMessage) {
  if (!originalMessage) return null;
  
  // Try message ID first (most reliable)
  if (originalMessage.getId) {
    const id = originalMessage.getId();
    if (id) return String(id);
  }
  
  // Fallback to direct id property
  if (originalMessage.id) return String(originalMessage.id);
  
  // Try metadata (v2 MessageMetadata doesn't expose #fixed directly)
  // Custom fields in meta parameter go into fixed metadata
  // Since we can't access #fixed directly, we rely on message.id above
  // If correlationId was stored in body, check that:
  if (originalMessage.body && typeof originalMessage.body === 'object') {
    if (originalMessage.body.correlationId) {
      return String(originalMessage.body.correlationId);
    }
  }
  
  // Legacy fallback
  if (originalMessage.correlationId) {
    return String(originalMessage.correlationId);
  }
  
  return null;
}
```

### 6. Reply Path Derivation

**Changes Needed:**
- Original: Checks `config.defaultReplyPath`, `meta.replyTo`, `meta.replyPath`
- v2: Can query ResponseManagerSubsystem for `replyTo` stored from `options.responseRequired`
- Also support explicit `replyPath` parameter and configuration defaults

**Adaptation - Option D (Primary) + Option B (Secondary): Query ResponseManagerSubsystem + Metadata Access**

```javascript
function deriveReplyPath(originalMessage, subsystem) {
  // Priority 1: Explicit replyPath parameter (highest priority)
  // (This would be passed to replyTo() method, not this helper)
  
  // Priority 2: Query ResponseManagerSubsystem for stored replyTo (Option D - PRIMARY)
  // When a request is sent with responseRequired: { replyTo, timeout },
  // it's stored in ResponseManagerSubsystem. We can look it up by correlationId.
  const correlationId = deriveCorrelationId(originalMessage);
  if (correlationId) {
    // Get kernel (root subsystem)
    const kernel = subsystem.getRoot?.();
    if (kernel && typeof kernel.getResponseManager === 'function') {
      const responseManager = kernel.getResponseManager();
      if (responseManager && typeof responseManager.getReplyTo === 'function') {
        const replyTo = responseManager.getReplyTo(correlationId);
        if (replyTo) {
          return replyTo;
        }
      }
    }
  }
  
  // Priority 3: Check message metadata (Option B - SECONDARY)
  // Use new metadata access helpers: getCustomField() and getCustomMutableField()
  const meta = originalMessage?.meta;
  if (meta) {
    // Check fixed metadata first (if replyTo was set during message creation)
    if (typeof meta.getCustomField === 'function') {
      const replyTo = meta.getCustomField('replyTo');
      if (replyTo) return replyTo;
      const replyPath = meta.getCustomField('replyPath');
      if (replyPath) return replyPath;
    }
    
    // Check mutable metadata (if replyPath was stored by request-core or similar)
    if (typeof meta.getCustomMutableField === 'function') {
      const replyPath = meta.getCustomMutableField('replyPath');
      if (replyPath) return replyPath;
      const replyTo = meta.getCustomMutableField('replyTo');
      if (replyTo) return replyTo;
    }
  }
  
  // Priority 4: Check message body (fallback)
  if (originalMessage?.body && typeof originalMessage.body === 'object') {
    if (originalMessage.body.replyTo) return originalMessage.body.replyTo;
    if (originalMessage.body.replyPath) return originalMessage.body.replyPath;
  }
  
  // Priority 5: Configuration-level default (lowest priority)
  if (typeof config.defaultReplyPath === 'string') {
    return config.defaultReplyPath;
  }
  
  return null;
}
```

**Required Additions:**

1. **ResponseManagerSubsystem: Add `getReplyTo()` method**

```javascript
/**
 * Get the replyTo path for a pending response by correlationId
 * 
 * @param {string} correlationId - Correlation ID
 * @returns {string|null} Reply-to path or null if not found
 */
getReplyTo(correlationId) {
  if (typeof correlationId !== 'string' || !correlationId.trim()) {
    return null;
  }
  
  const pending = this.#pendingByCorrelation.get(String(correlationId));
  return pending?.replyTo || null;
}
```

2. **MessageMetadata: Add metadata access helpers**

```javascript
/**
 * Get a custom field from fixed metadata
 * 
 * Allows access to custom fields that were added to fixed metadata during creation
 * but don't have dedicated getter methods (e.g., replyTo, replyPath, correlationId).
 * 
 * @param {string} fieldName - Field name to retrieve
 * @returns {any} Field value or undefined if not found
 */
getCustomField(fieldName) {
  if (typeof fieldName !== 'string' || !fieldName.trim()) {
    return undefined;
  }
  return this.#fixed[fieldName];
}

/**
 * Get a custom field from mutable metadata
 * 
 * Allows access to custom fields that were added to mutable metadata during processing
 * (e.g., replyPath stored by request-core).
 * 
 * @param {string} fieldName - Field name to retrieve
 * @returns {any} Field value or undefined if not found
 */
getCustomMutableField(fieldName) {
  if (typeof fieldName !== 'string' || !fieldName.trim()) {
    return undefined;
  }
  return this.#mutable[fieldName];
}
```

**Benefits of Option D:**
- ✅ `replyTo` is already stored when `responseRequired` option is used
- ✅ No need to store in message body or metadata
- ✅ Single source of truth (ResponseManagerSubsystem)
- ✅ Works automatically with existing `responseRequired` flow
- ✅ Falls back to explicit parameter or other options if not found

**Priority Order:**
1. **Explicit `replyPath` parameter** (highest priority - user override)
2. **ResponseManagerSubsystem lookup** (from `options.responseRequired.replyTo`)
3. **Message mutable metadata** (if stored by request-core or similar)
4. **Message body** (if stored there)
5. **Configuration default** (lowest priority)

### 7. Configuration Access

**Changes Needed:**
- Original: `ctx.config?.responses || {}`
- v2: Same pattern - no changes needed

**Adaptation:**
```javascript
const config = ctx.config?.responses || {};
```

### 8. Logging

**Changes Needed:**
- Original: No explicit logging
- v2: Should use `createSubsystemLogger` or `createLogger` for consistency

**Adaptation:**
```javascript
import { createSubsystemLogger } from '../../utils/logger.utils.mycelia.js';

// In hook function:
const logger = createSubsystemLogger(subsystem);

// Use logger for debug messages if needed
if (debug) {
  logger.log('Sending response...');
}
```

### 9. Error Handling

**Changes Needed:**
- Original: Throws errors directly
- v2: Same pattern - no changes needed
- Consider using Result objects if appropriate (but original uses throws, so keep it)

## Implementation Steps

### Phase 1: Core Structure
1. ✅ Create directory structure (already exists)
2. Create `use-responses.mycelia.js` skeleton
3. Set up hook metadata and basic structure

### Phase 2: Message Creation
4. Adapt `sendResponseBase()` to use `messagesFacet.create()` with meta parameter
5. Remove fallback checks for `create` vs `message` methods
6. Add `inReplyTo` to message creation meta parameter

### Phase 3: Correlation & Path Derivation
7. Adapt `deriveCorrelationId()` for v2 Message structure
8. Add metadata access helpers to MessageMetadata (`getCustomField`, `getCustomMutableField`)
9. Add `getReplyTo(correlationId)` method to ResponseManagerSubsystem
10. Adapt `deriveReplyPath()` for v2 - implement Option D (primary) + Option B (secondary)
11. Update to use `message.getId()` method

### Phase 4: Identity Integration
10. Verify `identity.sendProtected()` signature (should work as-is)
11. Test that identity is available on subsystem
12. Add validation for identity presence

### Phase 5: Public API Methods
13. Implement `sendResponse()` method
14. Implement `replyTo()` method
15. Implement `replyErrorTo()` method
16. Export helper methods (`deriveCorrelationId`, `deriveReplyPath`)

### Phase 6: Testing & Documentation
17. Add JSDoc comments
18. Test with v2 Message instances
19. Test with identity.sendProtected
20. Verify integration with ResponseManagerSubsystem

## Key Adaptations Summary

### ✅ No Changes Needed
- Hook structure (uses `createHook` - compatible)
- Facet creation (uses `Facet` - compatible)
- Configuration access (`ctx.config?.responses`)
- Identity.sendProtected signature (already correct)
- Error handling pattern (throws - compatible)

### 🔄 Changes Required
1. **Message Creation**: Use `messagesFacet.create(path, body, { meta: { inReplyTo } })` instead of mutating `msg.meta`
2. **Correlation ID**: Use `message.getId()` method, handle v2 MessageMetadata structure
3. **Reply Path**: Handle MessageMetadata limitations (can't access custom fixed fields directly)
4. **Logging**: Add v2 logging utilities (optional but recommended)

## Open Questions

1. **Reply Path Storage**: Where should `replyTo` be stored in request messages?
   - **Option D: Query ResponseManagerSubsystem** (PRIMARY - IMPLEMENTED)
     - When `responseRequired: { replyTo, timeout }` is passed in options, it's stored in ResponseManagerSubsystem
     - Add `getReplyTo(correlationId)` method to ResponseManagerSubsystem
     - Query it when replying: `kernel.getResponseManager()?.getReplyTo(correlationId)`
     - **Benefits**: Single source of truth, already stored, no need to duplicate in message
   - **Option B: In message metadata during creation** (SECONDARY - IMPLEMENTED)
     - Store `replyTo` or `replyPath` in message metadata during creation
     - Use new `getCustomField()` and `getCustomMutableField()` helpers to access
     - **Benefits**: Works even if ResponseManagerSubsystem not available, supports custom flows
   - Option C: Always require explicit `replyPath` parameter (override)
   - Option A: In message body (fallback)
   - **Recommendation**: **Option D (ResponseManagerSubsystem lookup)** as primary, **Option B (metadata)** as secondary, with Option C (explicit parameter) as override, and Option A (body) as fallback

2. **Correlation ID Storage**: Where should `correlationId` be stored in responses?
   - Option A: In message body (e.g., `message.body.inReplyTo`)
   - Option B: In message metadata during creation (goes to fixed metadata)
   - **Recommendation**: Option B (metadata) - already handled by adding to `meta` parameter during message creation
   - **Note**: Also store in body for easier access: `message.body.inReplyTo = correlationId`

3. **Metadata Access**: Should we add a helper to access custom fixed metadata fields?
   - ✅ **IMPLEMENTED**: Add `getCustomField(name)` method to MessageMetadata for fixed metadata
   - ✅ **IMPLEMENTED**: Add `getCustomMutableField(name)` method to MessageMetadata for mutable metadata
   - **Benefits**: Clean API, type-safe, allows Option B (metadata storage) to work properly

4. **Error Handling**: Should we use Result objects instead of throws?
   - Original uses throws - keep it for consistency
   - **Recommendation**: Keep throws pattern

## Success Criteria

✅ Hook follows v2 patterns
✅ Uses `messagesFacet.create()` correctly
✅ Adds `inReplyTo` to message metadata during creation
✅ `identity.sendProtected()` works correctly
✅ Correlation ID extraction works with v2 Messages
✅ Reply path derivation handles v2 MessageMetadata limitations
✅ All public methods work correctly
✅ Integration with ResponseManagerSubsystem works
✅ No linter errors

## Dependencies

**Required:**
- `messages` facet (from `useMessages` hook)
- `subsystem.identity` (from AccessControl wiring)
- `identity.sendProtected()` method

**Optional:**
- Logging utilities (`createSubsystemLogger`)
- Configuration (`ctx.config.responses`)

## Files to Create

1. **New Files:**
   - `/apps/mycelia-kernel/src/messages/v2/hooks/responses/use-responses.mycelia.js`

2. **Files to Modify:**
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js`
     - Add `getReplyTo(correlationId)` method for useResponses hook to query stored replyTo paths
   - `/apps/mycelia-kernel/src/messages/v2/models/message/message-metadata.mycelia.js`
     - Add `getCustomField(fieldName)` method to access custom fixed metadata fields
     - Add `getCustomMutableField(fieldName)` method to access custom mutable metadata fields

3. **Files to Review (for integration):**
   - ResponseManagerSubsystem (to verify correlation works)
   - useMessages hook (to verify create() method signature)
   - createIdentity (to verify sendProtected signature)
   - KernelSubsystem (to verify getResponseManager() access)

## Usage Example (After Implementation)

```javascript
// In a subsystem handler
const subsystem = useBase('my-subsystem', { ms: messageSystem })
  .use(useMessages)
  .use(useResponses)
  .build();

// Scenario 1: Request sent with responseRequired option
// Sender:
await identity.sendProtected(requestMessage, {
  responseRequired: {
    replyTo: 'my-subsystem://replies',  // Stored in ResponseManagerSubsystem
    timeout: 5000
  }
});

// Receiver handler - replyTo is automatically retrieved from ResponseManagerSubsystem
subsystem.registerRoute('command://execute', async (message, params) => {
  const result = { success: true, data: processedData };
  
  // replyTo is automatically looked up from ResponseManagerSubsystem
  // using message.getId() as correlationId
  await subsystem.responses.replyTo(message, result);
  
  return result;
});

// Scenario 2: Explicit replyPath override
await subsystem.responses.replyTo(message, result, {
  replyPath: 'custom://reply/path'  // Overrides ResponseManagerSubsystem lookup
});

// Scenario 3: Generic response with explicit path
await subsystem.responses.sendResponse({
  path: 'subsystem://channel/replies',
  inReplyTo: originalMessage.getId(),
  payload: { result: 'success' },
  success: true
});
```

## Reply Path Resolution Priority

When `replyTo()` is called, the reply path is resolved in this order:

1. **Explicit `replyPath` parameter** (highest priority - user override)
   ```javascript
   responses.replyTo(message, payload, { replyPath: 'explicit/path' })
   ```

2. **ResponseManagerSubsystem lookup** (PRIMARY - from `options.responseRequired.replyTo`)
   ```javascript
   // When request was sent with:
   identity.sendProtected(message, {
     responseRequired: { replyTo: 'stored/path', timeout: 5000 }
   })
   // This path is automatically retrieved via:
   // kernel.getResponseManager().getReplyTo(correlationId)
   ```

3. **Message metadata** (SECONDARY - using new access helpers)
   ```javascript
   // Fixed metadata (if set during creation):
   // meta.getCustomField('replyTo') or meta.getCustomField('replyPath')
   
   // Mutable metadata (if stored by request-core or similar):
   // meta.getCustomMutableField('replyPath') or meta.getCustomMutableField('replyTo')
   ```

4. **Message body** (fallback)
   ```javascript
   // If stored in: message.body.replyTo or message.body.replyPath
   ```

5. **Configuration default** (lowest priority)
   ```javascript
   // From: ctx.config.responses.defaultReplyPath
   ```


