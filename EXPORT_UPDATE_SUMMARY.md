# Export Update Summary - v1.5.0

## Changes Made

### 1. Added MessageSystem Export
**File**: `src/messages/v2/index.js`
```javascript
export { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
```

### 2. Added Message Export
**File**: `src/messages/v2/index.js`
```javascript
export { Message } from './models/message/message.mycelia.js';
```

### 3. Version Bump
**File**: `package.json`
- Updated from `1.4.7` → `1.5.0` (minor version)

### 4. Changelog Updated
**File**: `CHANGELOG.md`
- Added entry for v1.5.0 with migration guide

## Verification

✅ All mycelia-kernel tests passing (711 tests)
✅ All gateway tests passing (61 tests)
✅ Exports verified:
  - `MessageSystem` - ✅ Available
  - `Message` - ✅ Available
  - `BaseSubsystem` - ✅ Available
  - `useRouter` - ✅ Available

## Next Steps

1. **Publish to npm**:
   ```bash
   cd /apps/mycelia-kernel
   npm publish
   ```

2. **Update gateway to use published version**:
   ```bash
   cd /apps/ligneous-gedcom-gateway
   npm install mycelia-kernel@^1.5.0
   ```

## Benefits

- **Better DX**: No more deep path imports
- **Cleaner code**: `import { MessageSystem, Message } from 'mycelia-kernel'`
- **Backward compatible**: Existing code continues to work
- **Type-safe**: Better IDE support with main exports

## Files Modified

1. `/apps/mycelia-kernel/src/messages/v2/index.js` - Added exports
2. `/apps/mycelia-kernel/package.json` - Version bump
3. `/apps/mycelia-kernel/CHANGELOG.md` - Release notes
4. `/apps/mycelia-kernel/RELEASE_NOTES_1.5.0.md` - Detailed release notes (new)

