# Release Notes - v1.6.0

## Summary

This release focuses on improving developer experience and production readiness by adding production-safe initialization methods and better package exports.

## What's New

### ✅ Production-Safe Initialization

**`getKernelForInit()`** - Production-safe kernel access
```javascript
const kernel = messageSystem.getKernelForInit();
const profileRegistry = kernel.getProfileRegistry();
// Works in production, no debug mode required
```

**`initializeProfiles()`** - Convenient profile initialization
```javascript
await messageSystem.initializeProfiles({
  'user': { 'api:read': 'r', 'api:write': 'rw' },
  'admin': { 'api:*': 'rwg' }
});
// Production-safe, no debug mode required
```

### ✅ Enhanced Exports

Now you can import more classes directly:
```javascript
import {
  MessageSystem,
  KernelSubsystem,
  ProfileRegistrySubsystem,
  AccessControlSubsystem,
  SecurityProfile,
  Principal
} from 'mycelia-kernel';
```

### ✅ Production Patterns Documentation

New guide: `docs/PRODUCTION-PATTERNS.md`
- When to use debug mode vs production-safe methods
- Best practices for initialization
- Migration guide

## Breaking Changes

**None** - All changes are backward compatible.

## Migration Guide

### Profile Initialization

**Before (v1.5.0):**
```javascript
const messageSystem = new MessageSystem('app', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel();
const profileRegistry = kernel.getProfileRegistry();
await profileRegistry.createProfile('user', {...});
```

**After (v1.6.0):**
```javascript
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();
await messageSystem.initializeProfiles({
  'user': {...}
});
```

### Kernel Access

**Before:**
```javascript
const kernel = messageSystem.getKernel(); // Only in debug mode
```

**After:**
```javascript
// For initialization (production-safe)
const kernel = messageSystem.getKernelForInit();

// For testing/debugging (debug mode only)
const kernel = messageSystem.getKernel();
```

## Benefits

1. **No Debug Mode Dependency** - Initialize profiles without debug mode
2. **Better Exports** - More classes available from main package
3. **Clearer Patterns** - Documented production vs development approaches
4. **Production Ready** - Safe initialization methods for production use

## Testing

All 711 tests passing ✅

## Installation

```bash
npm install mycelia-kernel@^1.6.0
```

## Documentation

- [Production Patterns Guide](./docs/PRODUCTION-PATTERNS.md)
- [CHANGELOG.md](./CHANGELOG.md)

