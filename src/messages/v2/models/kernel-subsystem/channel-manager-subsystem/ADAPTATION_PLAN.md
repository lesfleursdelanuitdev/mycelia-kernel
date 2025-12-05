# ChannelManagerSubsystem Adaptation Plan

## Overview

This document outlines the plan for adapting the `ChannelManagerSubsystem` to the v2 architecture. The subsystem manages communication channels with owner-based access control and participant management.

## Location

**Target Directory:** `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/channel-manager-subsystem/`

**Files to Create:**
- `channel-manager.subsystem.mycelia.js` - Main subsystem implementation
- `channel.mycelia.js` - Channel class implementation (if not exists)
- `ADAPTATION_PLAN.md` - This file

## Architecture Integration

### 1. Subsystem Structure

**Pattern:** Follow standard v2 kernel child subsystem pattern (similar to `ResponseManagerSubsystem`, `ErrorManagerSubsystem`)

**Key Changes:**
- Extends `BaseSubsystem` (already correct)
- Uses v2 constructor pattern: `constructor(name = 'channel-manager', options = {})`
- Uses `createSubsystemLogger` for logging instead of `console.log`/`console.warn`
- Uses private fields (`#`) instead of `_` prefix for private properties
- Adds proper `dispose()` method for cleanup

### 2. Constructor Adaptation

**Original:**
```javascript
constructor(name = 'channel-manager', options = {}) {
  super(name, options);
  this._channels = new Map();
  this._channelsByOwner = new Map();
}
```

**v2 Adaptation:**
```javascript
import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { Channel } from './channel.mycelia.js';
import { createSubsystemLogger } from '../../../utils/logger.utils.mycelia.js';

export class ChannelManagerSubsystem extends BaseSubsystem {
  #channels = new Map(); // route -> Channel
  #channelsByOwner = new Map(); // ownerPkr -> Set<Channel>
  #logger;

  constructor(name = 'channel-manager', options = {}) {
    super(name, options);
    this.#logger = createSubsystemLogger(this);
  }
}
```

**Key Changes:**
- Use private fields (`#channels`, `#channelsByOwner`) instead of `_channels`, `_channelsByOwner`
- Initialize logger in constructor
- Remove direct `this.debug` usage (use logger instead)

### 3. Logging Adaptation

**Original:**
```javascript
if (this.debug) {
  console.log(`[ChannelManagerSubsystem] Registered channel "${route}"...`);
}
```

**v2 Adaptation:**
```javascript
this.#logger.log(`Registered channel "${route}" with ${channel.participants.size} participant(s).`);
```

**Key Changes:**
- Replace `console.log` with `logger.log()`
- Replace `console.warn` with `logger.warn()`
- Remove `if (this.debug)` checks (logger handles debug level internally)
- Remove `[ChannelManagerSubsystem]` prefix (logger adds subsystem name automatically)

### 4. Channel Class

**Status:** Channel class needs to be created or adapted

**Required Properties:**
- `route` (string) - Channel route/path
- `ownerPkr` (PKR) - Owner's Public Key Record
- `participants` (Set<PKR>) - Set of participant PKRs
- `metadata` (Object) - Channel metadata

**Required Methods:**
- `addParticipant(pkr)` - Add a participant, returns boolean (true if changed)
- `removeParticipant(pkr)` - Remove a participant, returns boolean (true if removed)
- `canUse(callerPkr)` - Check if caller can use the channel
- `snapshot()` - Get a snapshot of channel state

**Channel Class Structure:**
```javascript
export class Channel {
  constructor({ route, ownerPkr, participants = [], metadata = {} }) {
    this.route = route;
    this.ownerPkr = ownerPkr;
    this.participants = new Set(participants);
    this.metadata = metadata;
  }

  addParticipant(pkr) {
    // Returns true if added (wasn't already a participant)
    if (this.participants.has(pkr)) return false;
    this.participants.add(pkr);
    return true;
  }

  removeParticipant(pkr) {
    // Returns true if removed (was a participant)
    return this.participants.delete(pkr);
  }

  canUse(callerPkr) {
    // Owner can always use
    if (callerPkr === this.ownerPkr) return true;
    // Participants can use
    return this.participants.has(callerPkr);
  }

  snapshot() {
    return {
      route: this.route,
      ownerPkr: this.ownerPkr,
      participants: Array.from(this.participants),
      metadata: { ...this.metadata }
    };
  }
}
```

### 5. Method Adaptations

#### `registerChannel()`

**Changes:**
- Use `#channels` instead of `_channels`
- Use `#channelsByOwner` instead of `_channelsByOwner`
- Use `#logger.log()` instead of `console.log()`
- Keep validation logic (unchanged)

**Adaptation:**
```javascript
registerChannel({ route, ownerPkr, participants = [], metadata = {} } = {}) {
  // Validation (unchanged)
  if (typeof route !== 'string' || !route.trim()) {
    throw new Error('ChannelManagerSubsystem.registerChannel: route must be a non-empty string.');
  }
  // ... other validations

  const channel = new Channel({ route, ownerPkr, participants, metadata });
  this.#channels.set(route, channel);

  // Index by owner
  let ownedSet = this.#channelsByOwner.get(ownerPkr);
  if (!ownedSet) {
    ownedSet = new Set();
    this.#channelsByOwner.set(ownerPkr, ownedSet);
  }
  ownedSet.add(channel);

  this.#logger.log(
    `Registered channel "${route}" with ${channel.participants.size} participant(s).`
  );

  return channel;
}
```

#### `unregisterChannel()`

**Changes:**
- Use `#channels` instead of `_channels`
- Use `#channelsByOwner` instead of `_channelsByOwner`
- Use `#logger.log()` instead of `console.log()`

#### `getChannel()`

**Changes:**
- Use `#channels` instead of `_channels`
- No other changes needed

#### `listChannels()`

**Changes:**
- Use `#channels` instead of `_channels`
- No other changes needed

#### `listAllChannelsFor()`

**Changes:**
- Use `#channelsByOwner` instead of `_channelsByOwner`
- No other changes needed

#### `getChannelFor()`

**Changes:**
- Use `#channels` instead of `_channels`
- Use `#channelsByOwner` instead of `_channelsByOwner`
- No other changes needed

#### `addParticipant()`

**Changes:**
- Use `#logger.log()` instead of `console.log()`
- No other changes needed

#### `removeParticipant()`

**Changes:**
- Use `#logger.log()` instead of `console.log()`
- No other changes needed

#### `canUseChannel()`

**Changes:**
- No changes needed (already uses `getChannel()` which will be adapted)

#### `verifyAccess()`

**Changes:**
- Use `#logger.warn()` instead of `console.warn()`
- Remove `if (this.debug)` check

**Adaptation:**
```javascript
verifyAccess(route, callerPkr) {
  const ok = this.canUseChannel(route, callerPkr);
  if (!ok) {
    this.#logger.warn(`Access denied for channel "${route}".`);
  }
  return ok;
}
```

#### `getStatus()`

**Changes:**
- Use `#channels` instead of `_channels`
- No other changes needed

### 6. Disposal Method

**New Addition:** Add `dispose()` method for cleanup

```javascript
/**
 * Dispose the subsystem and clean up all channels
 * 
 * @returns {Promise<void>}
 */
async dispose() {
  // Clear all channels
  this.#channels.clear();
  this.#channelsByOwner.clear();

  this.#logger.log('Disposed; all channels cleared.');

  if (typeof super.dispose === 'function') {
    await super.dispose();
  }
}
```

### 7. Integration with useKernelServices Hook

**Changes Needed:**
- Add `ChannelManagerSubsystem` to `useKernelServices` hook
- Add configuration support

**File:** `/apps/mycelia-kernel/src/messages/v2/hooks/kernel-services/use-kernel-services.mycelia.js`

**Adaptation:**
```javascript
import { ChannelManagerSubsystem } from '../../models/kernel-subsystem/channel-manager-subsystem/channel-manager.subsystem.mycelia.js';

// In childSubsystems array:
{
  name: 'channel-manager',
  SubsystemClass: ChannelManagerSubsystem,
  config: {
    ...(kernelServicesConfig['channel-manager'] || {})
  }
}
```

### 8. KernelSubsystem Integration (Optional)

**If needed:** Add getter method to KernelSubsystem for accessing ChannelManagerSubsystem

```javascript
/**
 * Get the channel manager subsystem reference.
 *
 * @returns {ChannelManagerSubsystem|null} Channel manager subsystem instance or null
 */
getChannelManager() {
  const hierarchy = this.find('hierarchy');
  if (!hierarchy) {
    return null;
  }
  return hierarchy.getChild('channel-manager') || null;
}
```

## Implementation Steps

### Phase 1: Channel Class
1. Create `channel.mycelia.js` with Channel class
2. Implement constructor with validation
3. Implement `addParticipant()` method
4. Implement `removeParticipant()` method
5. Implement `canUse()` method
6. Implement `snapshot()` method

### Phase 2: Subsystem Core
7. Create `channel-manager.subsystem.mycelia.js` skeleton
8. Adapt constructor (private fields, logger)
9. Adapt `registerChannel()` method
10. Adapt `unregisterChannel()` method
11. Adapt `getChannel()` method
12. Adapt `listChannels()` method

### Phase 3: Owner-Scoped Lookup
13. Adapt `listAllChannelsFor()` method
14. Adapt `getChannelFor()` method

### Phase 4: Participant Management
15. Adapt `addParticipant()` method
16. Adapt `removeParticipant()` method
17. Adapt `canUseChannel()` method
18. Adapt `verifyAccess()` method

### Phase 5: Introspection & Cleanup
19. Adapt `getStatus()` method
20. Add `dispose()` method

### Phase 6: Integration
21. Add to `useKernelServices` hook
22. Add getter to KernelSubsystem (if needed)
23. Test integration

### Phase 7: Documentation
24. Add JSDoc comments
25. Test all methods
26. Verify logging works correctly

## Key Adaptations Summary

### ✅ No Changes Needed
- Method signatures (mostly compatible)
- Validation logic (unchanged)
- Business logic (unchanged)
- Map/Set data structures (unchanged)

### 🔄 Changes Required
1. **Private Fields**: Change `_channels` → `#channels`, `_channelsByOwner` → `#channelsByOwner`
2. **Logging**: Replace `console.log`/`console.warn` with `logger.log()`/`logger.warn()`
3. **Debug Checks**: Remove `if (this.debug)` checks (logger handles it)
4. **Logger Initialization**: Add `#logger = createSubsystemLogger(this)` in constructor
5. **Disposal**: Add `dispose()` method for cleanup
6. **Channel Class**: Create or adapt Channel class to match expected interface

## Dependencies

**Required:**
- `BaseSubsystem` (from v2)
- `createSubsystemLogger` (from v2 utils)
- `Channel` class (to be created)

**Optional:**
- Integration with `useKernelServices` hook
- Getter in KernelSubsystem

## Files to Create/Modify

1. **New Files:**
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/channel-manager-subsystem/channel-manager.subsystem.mycelia.js`
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/channel-manager-subsystem/channel.mycelia.js`

2. **Files to Modify:**
   - `/apps/mycelia-kernel/src/messages/v2/hooks/kernel-services/use-kernel-services.mycelia.js`
     - Add ChannelManagerSubsystem to childSubsystems array
   - `/apps/mycelia-kernel/src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js` (optional)
     - Add `getChannelManager()` getter method

## Success Criteria

✅ Subsystem follows v2 patterns
✅ Uses private fields (`#`) instead of `_` prefix
✅ Uses `createSubsystemLogger` for all logging
✅ All methods work correctly
✅ Channel class implements required interface
✅ Integration with useKernelServices works
✅ Disposal method cleans up resources
✅ No linter errors

## Open Questions

1. **Channel Class Location**: Should Channel be in the same directory or separate?
   - **Recommendation**: Same directory (`channel-manager-subsystem/channel.mycelia.js`)
   - Similar to `PendingResponse` in `response-manager-subsystem`

2. **Channel Metadata Structure**: What should metadata contain?
   - **Recommendation**: Keep as generic object, document expected fields if any

3. **Channel Lifecycle**: Should channels be automatically cleaned up?
   - **Recommendation**: Manual cleanup via `unregisterChannel()` for now
   - Could add automatic cleanup in `dispose()` if needed

4. **Integration Priority**: Should this be added to useKernelServices immediately?
   - **Recommendation**: Yes, add it alongside other kernel services

## Usage Example (After Implementation)

```javascript
// ChannelManagerSubsystem is automatically created by useKernelServices
// Access via kernel:
const kernel = messageSystem.getKernel();
const channelManager = kernel.getChannelManager();

// Register a channel
const channel = channelManager.registerChannel({
  route: 'canvas://channel/layout',
  ownerPkr: canvasPkr,
  participants: [userPkr1, userPkr2],
  metadata: { name: 'layout', description: 'Layout channel' }
});

// Add participant
channelManager.addParticipant('canvas://channel/layout', userPkr3);

// Check access
const canUse = channelManager.canUseChannel('canvas://channel/layout', userPkr1);
// true (userPkr1 is a participant)

// Get channel by name
const layoutChannel = channelManager.getChannelFor(canvasPkr, 'layout');
// Returns channel with route ending in '/channel/layout'

// List all channels for owner
const allChannels = channelManager.listAllChannelsFor(canvasPkr);

// Unregister channel
channelManager.unregisterChannel('canvas://channel/layout');
```

