# createIdentity Channel Methods Adaptation Plan

## Overview

This document outlines the plan for adding channel management methods to the `createIdentity` function. These methods will provide convenient access to ChannelManagerSubsystem functionality through the identity API.

## Location

**Target File:** `/apps/mycelia-kernel/src/messages/v2/models/security/create-identity.mycelia.js`

## Current State

The current `createIdentity` function provides:
- Permission queries (`canRead`, `canWrite`, `canGrant`)
- Permission wrappers (`requireRead`, `requireWrite`, `requireGrant`, `requireAuth`)
- Grant/revoke helpers (`grantReader`, `grantWriter`, `revokeReader`, `revokeWriter`, `promote`, `demote`)
- Protected messaging (`sendProtected`)

**Missing:** Channel management methods

## Desired State

Add channel management methods that:
- Use ChannelManagerSubsystem via kernel
- Provide convenient access to channel operations
- Use `ownerPkr` as the channel owner
- Handle errors gracefully

## Implementation Plan

### 1. Add ChannelManager Helper Function

**Location:** After `sendProtected` function, before return statement

**Purpose:** Centralized helper to get ChannelManagerSubsystem instance

**Implementation:**
```javascript
/**
 * getChannelManager
 * -----------------
 * Get the ChannelManagerSubsystem instance from the kernel.
 * 
 * Lookup order:
 * 1. kernel.getChannelManager() (preferred - explicit method)
 * 2. kernel.find('channel-manager') (fallback - facet lookup)
 * 
 * @returns {ChannelManagerSubsystem|null} Channel manager instance or null if not available
 */
function getChannelManager() {
  // Preferred: KernelSubsystem exposes an explicit helper
  if (typeof kernel.getChannelManager === 'function') {
    return kernel.getChannelManager();
  }
  
  // Fallback: facet lookup / hierarchy
  if (typeof kernel.find === 'function') {
    return kernel.find('channel-manager');
  }
  
  return null;
}
```

**Key Points:**
- Tries `kernel.getChannelManager()` first (we just added this!)
- Falls back to `kernel.find('channel-manager')` for compatibility
- Returns `null` if not available (callers should handle this)

### 2. Add createChannel Method

**Location:** After `getChannelManager` helper, before return statement

**Purpose:** Register a new channel owned by this identity

**Implementation:**
```javascript
/**
 * createChannel
 * -------------
 * Register a long-lived reply channel owned by this identity.
 * 
 * @param {string} route - Fully qualified channel route, e.g. "ui://channel/layout"
 * @param {Object} [options={}]
 * @param {Array<PKR>} [options.participants=[]] - PKRs allowed to use this channel
 * @param {Object} [options.metadata={}] - Optional channel metadata
 * @returns {Channel} The created channel instance
 * @throws {Error} If ChannelManagerSubsystem is not available
 * @throws {Error} If route is invalid
 * @throws {Error} If channel registration fails
 */
function createChannel(route, { participants = [], metadata = {} } = {}) {
  const cm = getChannelManager();
  if (!cm || typeof cm.registerChannel !== 'function') {
    throw new Error(
      'createIdentity.createChannel: ChannelManagerSubsystem with registerChannel() is not available on kernel.'
    );
  }
  
  if (typeof route !== 'string' || !route.trim()) {
    throw new Error('createIdentity.createChannel: route must be a non-empty string.');
  }
  
  return cm.registerChannel({
    route,
    ownerPkr,
    participants,
    metadata
  });
}
```

**Key Points:**
- Validates ChannelManagerSubsystem availability
- Validates route parameter
- Uses `ownerPkr` (from closure) as channel owner
- Delegates to `cm.registerChannel()`
- Returns Channel instance

### 3. Add getChannel Method

**Location:** After `createChannel`, before return statement

**Purpose:** Look up a channel owned by this identity by name or route

**Implementation:**
```javascript
/**
 * getChannel
 * ----------
 * Look up a channel owned by this identity by name or route.
 * 
 * nameOrRoute can be:
 * - full route: "canvas://channel/layout"
 * - short name: "layout" (searches by metadata.name or route suffix)
 * 
 * @param {string} nameOrRoute - Channel name or full route
 * @returns {Channel|null} Channel instance or null if not found
 * @throws {Error} If ChannelManagerSubsystem is not available
 * @throws {Error} If nameOrRoute is invalid
 */
function getChannel(nameOrRoute) {
  const cm = getChannelManager();
  if (!cm || typeof cm.getChannelFor !== 'function') {
    throw new Error(
      'createIdentity.getChannel: ChannelManagerSubsystem with getChannelFor() is not available on kernel.'
    );
  }
  
  if (typeof nameOrRoute !== 'string' || !nameOrRoute.trim()) {
    throw new Error('createIdentity.getChannel: nameOrRoute must be a non-empty string.');
  }
  
  return cm.getChannelFor(ownerPkr, nameOrRoute);
}
```

**Key Points:**
- Validates ChannelManagerSubsystem availability
- Validates nameOrRoute parameter
- Uses `ownerPkr` (from closure) for owner-scoped lookup
- Delegates to `cm.getChannelFor(ownerPkr, nameOrRoute)`
- Returns Channel instance or null

### 4. Add listChannels Method

**Location:** After `getChannel`, before return statement

**Purpose:** List all channels owned by this identity

**Implementation:**
```javascript
/**
 * listChannels
 * ------------
 * List all channels owned by this identity.
 * 
 * @returns {Array<Channel>} Array of channel instances owned by this identity
 * @throws {Error} If ChannelManagerSubsystem is not available
 */
function listChannels() {
  const cm = getChannelManager();
  if (!cm || typeof cm.listAllChannelsFor !== 'function') {
    throw new Error(
      'createIdentity.listChannels: ChannelManagerSubsystem with listAllChannelsFor() is not available on kernel.'
    );
  }
  
  return cm.listAllChannelsFor(ownerPkr);
}
```

**Key Points:**
- Validates ChannelManagerSubsystem availability
- Uses `ownerPkr` (from closure) for owner-scoped lookup
- Delegates to `cm.listAllChannelsFor(ownerPkr)`
- Returns array of Channel instances

### 5. Update Return Object

**Location:** In the return statement at the end of the function

**Current:**
```javascript
return {
  pkr: ownerPkr,
  canRead,
  canWrite,
  canGrant,
  requireRead,
  requireWrite,
  requireGrant,
  requireAuth,
  grantReader,
  grantWriter,
  revokeReader,
  revokeWriter,
  promote,
  demote,
  sendProtected
};
```

**Updated:**
```javascript
return {
  pkr: ownerPkr,
  // Permission queries
  canRead,
  canWrite,
  canGrant,
  // Wrappers
  requireRead,
  requireWrite,
  requireGrant,
  requireAuth,
  // Grant/revoke helpers
  grantReader,
  grantWriter,
  revokeReader,
  revokeWriter,
  promote,
  demote,
  // Messaging
  sendProtected,
  // Channels
  createChannel,
  getChannel,
  listChannels
};
```

**Key Points:**
- Add three new methods: `createChannel`, `getChannel`, `listChannels`
- Group methods with comments for clarity
- Maintain backward compatibility (all existing methods remain)

## Implementation Steps

### Phase 1: Helper Function
1. Add `getChannelManager()` helper function
2. Test helper with both lookup methods

### Phase 2: Channel Methods
3. Add `createChannel()` method
4. Add `getChannel()` method
5. Add `listChannels()` method

### Phase 3: Integration
6. Update return object to include channel methods
7. Test all three methods

### Phase 4: Documentation
8. Update JSDoc comments
9. Update CREATE-IDENTITY.md documentation
10. Add usage examples

## Error Handling

### ChannelManagerSubsystem Not Available

**Scenario:** Kernel doesn't have ChannelManagerSubsystem installed

**Behavior:**
- All three methods throw descriptive errors
- Error message indicates which method is missing
- Suggests that ChannelManagerSubsystem needs to be available

**Example Error:**
```javascript
throw new Error(
  'createIdentity.createChannel: ChannelManagerSubsystem with registerChannel() is not available on kernel.'
);
```

### Invalid Parameters

**Scenario:** Invalid route, nameOrRoute, or options

**Behavior:**
- Methods validate parameters before calling ChannelManagerSubsystem
- Throw descriptive errors for invalid input
- ChannelManagerSubsystem may throw additional errors (e.g., duplicate route)

### Channel Not Found

**Scenario:** `getChannel()` called with non-existent channel

**Behavior:**
- Returns `null` (not an error)
- Consistent with ChannelManagerSubsystem behavior

## Dependencies

**Required:**
- ChannelManagerSubsystem must be installed in kernel (via useKernelServices)
- Kernel must have `getChannelManager()` method (we just added this!)
- Kernel must support `find()` method for fallback lookup

**Optional:**
- None

## Testing Considerations

### Test Cases

1. **ChannelManagerSubsystem Available:**
   - `createChannel()` creates channel successfully
   - `getChannel()` finds channel by route
   - `getChannel()` finds channel by name
   - `listChannels()` returns all channels for owner

2. **ChannelManagerSubsystem Not Available:**
   - All three methods throw appropriate errors

3. **Invalid Parameters:**
   - `createChannel()` with invalid route throws error
   - `getChannel()` with invalid nameOrRoute throws error

4. **Edge Cases:**
   - `getChannel()` with non-existent channel returns null
   - `listChannels()` with no channels returns empty array
   - Multiple channels for same owner

## Usage Examples

### Example 1: Create a Channel

```javascript
const identity = createIdentity(principals, ownerPkr, kernel);

// Create a channel
const channel = identity.createChannel('canvas://channel/layout', {
  participants: [userPkr1, userPkr2],
  metadata: { name: 'layout', description: 'Layout channel' }
});
```

### Example 2: Get Channel by Route

```javascript
// Get channel by full route
const channel = identity.getChannel('canvas://channel/layout');
if (channel) {
  console.log('Found channel:', channel.route);
}
```

### Example 3: Get Channel by Name

```javascript
// Get channel by short name (searches metadata.name or route suffix)
const channel = identity.getChannel('layout');
if (channel) {
  console.log('Found channel:', channel.route);
}
```

### Example 4: List All Channels

```javascript
// List all channels owned by this identity
const channels = identity.listChannels();
console.log(`Found ${channels.length} channels`);
channels.forEach(ch => {
  console.log(`- ${ch.route} (${ch.participants.size} participants)`);
});
```

### Example 5: Error Handling

```javascript
try {
  const channel = identity.createChannel('canvas://channel/layout');
} catch (error) {
  if (error.message.includes('ChannelManagerSubsystem')) {
    console.error('ChannelManagerSubsystem not available');
  } else {
    console.error('Failed to create channel:', error.message);
  }
}
```

## Documentation Updates

### File: `/apps/mycelia-kernel/src/messages/v2/docs/security/CREATE-IDENTITY.md`

**Add Section:** "Channel Management"

Document:
- `createChannel()` method
- `getChannel()` method
- `listChannels()` method
- Usage examples
- Error handling

## Key Adaptations Summary

### ✅ No Changes Needed
- Existing permission methods (unchanged)
- Existing grant/revoke methods (unchanged)
- Existing `sendProtected` method (unchanged)
- Function signature (unchanged)

### 🔄 Changes Required
1. **Add `getChannelManager()` helper** - Centralized ChannelManagerSubsystem lookup
2. **Add `createChannel()` method** - Register channels owned by identity
3. **Add `getChannel()` method** - Lookup channels by name or route
4. **Add `listChannels()` method** - List all channels for owner
5. **Update return object** - Export new channel methods
6. **Update documentation** - Document new methods

## Success Criteria

✅ All three channel methods work correctly
✅ Methods use `ownerPkr` from closure
✅ Error handling is appropriate
✅ Fallback lookup works if `getChannelManager()` not available
✅ Return object includes all new methods
✅ Documentation is updated
✅ No breaking changes to existing API
✅ No linter errors

## Open Questions

1. **Should we add participant management methods?**
   - Option: Add `addParticipant(route, pkr)` and `removeParticipant(route, pkr)`
   - **Recommendation**: Not in initial implementation, can add later if needed

2. **Should we add channel deletion method?**
   - Option: Add `deleteChannel(route)` or `unregisterChannel(route)`
   - **Recommendation**: Not in initial implementation, can add later if needed

3. **Should we add channel access checking?**
   - Option: Add `canUseChannel(route, callerPkr)` method
   - **Recommendation**: Not in initial implementation, can add later if needed

4. **Error message format:**
   - Current: `'createIdentity.createChannel: ...'`
   - **Recommendation**: Keep consistent with existing error message format

## Notes

- The implementation leverages the existing ChannelManagerSubsystem we just created
- All methods use `ownerPkr` from the closure, ensuring channels are scoped to the identity
- Error messages are descriptive and help with debugging
- The fallback lookup ensures compatibility even if `getChannelManager()` method is not available
- Methods follow the same pattern as existing identity methods

