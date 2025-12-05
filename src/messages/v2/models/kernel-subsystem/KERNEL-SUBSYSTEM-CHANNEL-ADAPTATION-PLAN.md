# KernelSubsystem Channel Integration Adaptation Plan

## Overview

This plan outlines the adaptation of channel integration in `KernelSubsystem.sendProtected()` to align with the v2 architecture. The main changes involve:

1. **One-shot path detection** - Update to match v2 route pattern
2. **Channel access control** - Use v2 ChannelManagerSubsystem API
3. **Response handling** - Align with v2 ResponseManagerSubsystem patterns
4. **Response registration** - Use v2 `responseRequired` object format

## Current State Analysis

### Current Implementation (from user's code snippet)

```javascript
// One-shot path detection
#isOneShotPath(path) {
  return (
    typeof path === 'string' &&
    path.includes('://request/oneShot/')
  );
}

// Channel access enforcement
#enforceChannelAccessIfChannel(pkr, path) {
  const channelManager = this.getChannelManager();
  if (!channelManager) return;
  if (typeof path !== 'string' || !path.trim()) return;
  
  const channel = typeof channelManager.getChannel === 'function'
    ? channelManager.getChannel(path)
    : null;
  
  if (!channel) return;
  
  const ok = typeof channelManager.verifyAccess === 'function'
    ? channelManager.verifyAccess(path, pkr)
    : channelManager.canUseChannel(path, pkr);
  
  if (!ok) {
    if (this.debug) {
      console.warn(`KernelSubsystem.sendProtected: Access denied for PKR on channel "${path}".`);
    }
    throw new Error(
      `KernelSubsystem.sendProtected: caller is not authorized to use channel "${path}".`
    );
  }
}
```

### v2 Architecture Context

1. **One-shot route pattern**: `${subsystemName}://request/oneShot/${messageId}`
   - Example: `"kernel://request/oneShot/1234"`
   - Pattern: `://request/oneShot/` (matches current check)

2. **ChannelManagerSubsystem API** (v2):
   - `getChannel(route)` → `Channel | null`
   - `canUseChannel(route, callerPkr)` → `boolean`
   - `verifyAccess(route, callerPkr)` → `boolean` (with logging)

3. **ResponseManagerSubsystem API** (v2):
   - `handleResponse(message)` → `{ ok: boolean, reason?: string }`
   - `registerResponseRequiredFor(pkr, message, { replyTo, timeout })` → `void`

4. **ResponseRequired format** (v2):
   - Object format: `{ replyTo: string, timeout?: number }`
   - Not boolean: `responseRequired: true` is deprecated

## Adaptation Plan

### 1. One-Shot Path Detection

**Current**: Uses `path.includes('://request/oneShot/')`

**v2**: Same pattern works, but we should:
- Use more precise matching (check for exact pattern)
- Consider edge cases (e.g., `://request/oneShot/` in middle of path)

**Recommendation**: Keep the current check but make it more explicit:

```javascript
#isOneShotPath(path) {
  if (typeof path !== 'string' || !path.trim()) {
    return false;
  }
  // Match pattern: {subsystem}://request/oneShot/{messageId}
  return path.includes('://request/oneShot/');
}
```

**Status**: ✅ Minimal change needed - current implementation is compatible

### 2. Channel Access Enforcement

**Current Issues**:
- Uses optional chaining for method existence checks (defensive but verbose)
- Has fallback from `verifyAccess` to `canUseChannel`
- Uses `console.warn` instead of v2 logging

**v2 Adaptation**:
- ChannelManagerSubsystem always has `getChannel()`, `canUseChannel()`, and `verifyAccess()`
- Use v2 logging utilities (`createSubsystemLogger`)
- Simplify method calls (no need for defensive checks)

**Recommended Implementation**:

```javascript
/**
 * If the path is a registered channel, enforce ACL for the given PKR.
 * If not a channel (or no channel manager), this is a no-op.
 * Throws on unauthorized access.
 * 
 * @private
 * @param {PKR} pkr - Caller's PKR
 * @param {string} path - Message path to check
 * @throws {Error} If caller is not authorized to use the channel
 */
#enforceChannelAccessIfChannel(pkr, path) {
  const channelManager = this.getChannelManager();
  if (!channelManager) {
    // No channel manager available, skip ACL check
    return;
  }

  if (typeof path !== 'string' || !path.trim()) {
    return;
  }

  // Check if path is a registered channel
  const channel = channelManager.getChannel(path);
  if (!channel) {
    // Not a channel, no ACL check needed
    return;
  }

  // Verify access (throws or logs warning on failure)
  const ok = channelManager.verifyAccess(path, pkr);
  if (!ok) {
    // verifyAccess already logs warning, but we throw for security
    throw new Error(
      `KernelSubsystem.sendProtected: caller is not authorized to use channel "${path}".`
    );
  }
}
```

**Changes**:
1. ✅ Remove defensive method existence checks (v2 guarantees API)
2. ✅ Use `verifyAccess()` directly (it logs warnings internally)
3. ✅ Keep error throwing for security
4. ✅ Add JSDoc comments

### 3. Response Handling Integration

**Current State** (from user's code):
- Has `#handleResponse(message)` method
- Checks ResponseManagerSubsystem availability
- Throws on failure

**v2 State** (from kernel.subsystem.mycelia.js):
- Already has response handling in `sendProtected()`
- Uses `responseManager.handleResponse(message, { correlationId })`
- Continues on failure (non-blocking)

**Recommendation**: 
- The current v2 implementation already handles responses
- We should ensure channel ACL is enforced for response messages too
- One-shot responses should skip channel ACL (already handled)

**No changes needed** - v2 implementation is already correct

### 4. Response Registration Integration

**Current State** (from user's code):
- Has `#registerResponseIfRequired(pkr, message, options)`
- Checks for `options.responseRequired` (boolean)
- Extracts `options.replyTo` and `options.timeout` separately

**v2 State** (from kernel.subsystem.mycelia.js):
- Already handles `options.responseRequired` as object
- Extracts `{ replyTo, timeout }` from `options.responseRequired`

**Adaptation Needed**:
- Current user code expects boolean `responseRequired` and separate `replyTo`/`timeout`
- v2 expects object: `responseRequired: { replyTo, timeout }`
- Need to update the method to handle v2 format

**Recommended Implementation**:

```javascript
/**
 * Called for *non-response* messages that require a response.
 * Registers the command with ResponseManager.
 * 
 * @private
 * @param {PKR} pkr - Caller's PKR
 * @param {Message} message - Message to register
 * @param {Object} options - Send options
 * @throws {Error} If responseRequired is invalid or ResponseManager is unavailable
 */
#registerResponseIfRequired(pkr, message, options) {
  const responseRequired = options.responseRequired;
  if (!responseRequired) {
    return; // No response required
  }

  // v2 format: responseRequired is an object { replyTo, timeout? }
  if (typeof responseRequired !== 'object' || responseRequired === null) {
    throw new Error(
      'KernelSubsystem.sendProtected: responseRequired must be an object with { replyTo, timeout? }, ' +
      'got: ' + typeof responseRequired
    );
  }

  const { replyTo, timeout } = responseRequired;

  if (typeof replyTo !== 'string' || !replyTo.trim()) {
    throw new Error(
      'KernelSubsystem.sendProtected: responseRequired.replyTo must be a non-empty string.'
    );
  }

  // Get message ID (v2 uses getId() method)
  const messageId = message.getId?.() || message.id;
  if (!messageId) {
    throw new Error(
      'KernelSubsystem.sendProtected: responseRequired requires message.getId() to return a valid id.'
    );
  }

  const responseManager = this.getResponseManager();
  if (!responseManager) {
    if (this.debug) {
      console.warn(
        'KernelSubsystem.sendProtected: responseRequired specified but ResponseManagerSubsystem not found.'
      );
    }
    return; // Non-blocking: continue without registration
  }

  if (typeof responseManager.registerResponseRequiredFor !== 'function') {
    throw new Error(
      'KernelSubsystem.sendProtected: ResponseManagerSubsystem.registerResponseRequiredFor() not available.'
    );
  }

  try {
    responseManager.registerResponseRequiredFor(pkr, message, {
      replyTo,
      timeout
    });
  } catch (err) {
    if (this.debug) {
      console.warn(`KernelSubsystem.sendProtected: Failed to register response-required command:`, err);
    }
    // Non-blocking: continue with message send even if registration fails
  }
}
```

**Changes**:
1. ✅ Handle `responseRequired` as object (not boolean)
2. ✅ Extract `replyTo` and `timeout` from object
3. ✅ Use `message.getId()` for v2 compatibility
4. ✅ Make registration non-blocking (log warning, continue)
5. ✅ Add validation for object structure

### 5. sendProtected Method Flow

**Current Flow** (from user's code):
1. Validate kernel identity and pkr
2. Strip callerId from options
3. Set callerId and callerIdSetBy
4. Get MessageSystem router
5. **If isResponse**:
   - Handle response via ResponseManager
   - Check if one-shot path → route directly (no channel ACL)
   - Else if channel → enforce ACL, then route
   - Else → route normally
6. **Else (non-response)**:
   - Register response-required if needed
   - Enforce channel ACL if channel path
   - Route normally

**v2 Flow** (from kernel.subsystem.mycelia.js):
1. Validate kernel identity and pkr
2. **If isResponse**: Handle response (non-blocking)
3. **If responseRequired**: Register response (non-blocking)
4. Strip callerId from options
5. Set callerId and callerIdSetBy
6. Get MessageSystem router
7. Route message

**Recommended v2 Flow** (with channel integration):
1. Validate kernel identity and pkr
2. Strip callerId from options
3. Set callerId and callerIdSetBy
4. Get MessageSystem router
5. **If isResponse**:
   - Handle response via ResponseManager (non-blocking)
   - **If one-shot path**: Route directly (skip channel ACL)
   - **Else**: Enforce channel ACL if channel, then route
6. **Else (non-response)**:
   - Register response-required if needed (non-blocking)
   - Enforce channel ACL if channel path
   - Route normally

**Key Differences**:
- Channel ACL enforcement happens **before** routing (for both responses and non-responses)
- One-shot paths skip channel ACL (they're temporary routes, not channels)
- Response handling is non-blocking (warnings, but continues)

## Implementation Checklist

### Phase 1: Channel Access Enforcement
- [ ] Update `#enforceChannelAccessIfChannel()` to use v2 ChannelManagerSubsystem API
- [ ] Remove defensive method existence checks
- [ ] Use `verifyAccess()` directly (it handles logging)
- [ ] Add JSDoc comments

### Phase 2: Response Registration
- [ ] Update `#registerResponseIfRequired()` to handle v2 `responseRequired` object format
- [ ] Extract `replyTo` and `timeout` from object
- [ ] Use `message.getId()` for v2 compatibility
- [ ] Make registration non-blocking (log warnings, continue)
- [ ] Add validation for object structure

### Phase 3: One-Shot Path Detection
- [ ] Verify `#isOneShotPath()` works with v2 route pattern
- [ ] Add explicit type checking
- [ ] Add JSDoc comments

### Phase 4: Integration in sendProtected
- [ ] Integrate channel ACL enforcement for responses (non-one-shot)
- [ ] Integrate channel ACL enforcement for non-responses
- [ ] Ensure one-shot paths skip channel ACL
- [ ] Test flow: response → channel ACL → route
- [ ] Test flow: non-response → register → channel ACL → route

### Phase 5: Error Handling & Logging
- [ ] Use v2 logging utilities (if needed)
- [ ] Ensure errors are descriptive
- [ ] Ensure warnings are logged appropriately
- [ ] Test error scenarios

## Testing Considerations

### Test Cases

1. **One-shot path detection**:
   - ✅ `"kernel://request/oneShot/1234"` → should skip channel ACL
   - ✅ `"canvas://request/oneShot/5678"` → should skip channel ACL
   - ✅ `"kernel://channel/replies"` → should check channel ACL

2. **Channel access enforcement**:
   - ✅ Channel exists, caller is owner → should allow
   - ✅ Channel exists, caller is participant → should allow
   - ✅ Channel exists, caller is not authorized → should throw
   - ✅ Path is not a channel → should skip ACL (no-op)

3. **Response registration**:
   - ✅ `responseRequired: { replyTo: "...", timeout: 5000 }` → should register
   - ✅ `responseRequired: { replyTo: "..." }` → should register (no timeout)
   - ✅ `responseRequired: null` → should skip
   - ✅ Missing `replyTo` → should throw
   - ✅ Missing message ID → should throw

4. **Response handling**:
   - ✅ `isResponse: true` on one-shot path → should skip channel ACL
   - ✅ `isResponse: true` on channel path → should enforce ACL
   - ✅ `isResponse: true` on regular path → should route normally

## Summary

The main adaptations needed are:

1. **Channel Access Enforcement**: Simplify to use v2 ChannelManagerSubsystem API directly
2. **Response Registration**: Update to handle v2 `responseRequired` object format
3. **One-Shot Detection**: Verify compatibility (should work as-is)
4. **Integration**: Ensure channel ACL is enforced at the right points in the flow

The v2 architecture already has most of the infrastructure in place. The main work is:
- Updating method signatures and validation
- Ensuring proper error handling
- Integrating channel ACL at the correct points in the flow

