# Core Updates from Math Whiteboard

This document tracks updates made to the core mycelia-kernel codebase based on findings and fixes from the math-whiteboard application.

---

## Kernel Registration Fix (January 2025)

### Issue
When multiple `PrincipalRegistry` instances were created with the same kernel, each would create a new kernel principal, resulting in:
- Multiple kernel PKRs with different UUIDs
- `kernel.identity.pkr` pointing to the last registry's PKR
- The AccessControl registry's kernel PKR not matching `kernel.identity.pkr`
- `isKernel()` and `canGrant()` checks failing in security profile applications

### Root Cause
The `PrincipalRegistry` constructor always created a new kernel principal when passed a kernel, even if the kernel already had an identity from a previous registry.

### Solution
Modified `PrincipalRegistry` constructor to skip kernel registration if the kernel already has an identity:

```javascript
if (existingPkr && existingPkr.kind === PRINCIPAL_KINDS.KERNEL) {
  // Kernel already has an identity from another registry
  // Skip kernel registration - only the first registry should register the kernel
  return;
}
```

### Files Changed
- `/apps/mycelia-kernel/src/messages/v2/models/security/principal-registry.mycelia.js`
- `/apps/math-whiteboard/mycelia-kernel-v2/models/security/principal-registry.mycelia.js`

### Testing
- ✅ All existing tests pass (516 tests in core, 27 tests in math-whiteboard)
- ✅ Kernel registration tests verify single kernel PKR creation
- ✅ Security profiles tests verify kernel can grant permissions correctly

### Impact
- **Breaking Change**: None - this is a bug fix that maintains backward compatibility
- **Behavior Change**: Only the first `PrincipalRegistry` (typically AccessControl) will register the kernel
- **Benefits**: 
  - Ensures single kernel PKR across the system
  - Fixes security profile application failures
  - Makes kernel identity consistent across all registries

### Related Documentation
- See `/apps/math-whiteboard/KERNEL-REGISTRATION-ANALYSIS.md` for detailed analysis
- See `/apps/math-whiteboard/src/server/lib/kernel-registration.test.js` for test coverage

---

## ProcessMessageCore Router Integration Fix (January 2025)

### Issue
The `processMessageCore` function was using `routeRegistry.match()` directly, bypassing the router facet's `route()` method. This meant that any router enhancements (such as `useRouterWithScopes` for scope-based permission checking) were never executed, as they wrap the router facet's `route()` method.

### Root Cause
The message processing pipeline was designed to use the route registry directly for matching, which bypassed any router facet enhancements that wrap the `route()` method.

### Solution
Modified `processMessageCore` to prefer using the router facet's `route()` method if available, falling back to `routeRegistry.match()` for backward compatibility.

**Key Changes:**

1. **use-message-processor.mycelia.js:**
   - Added `getRouterFacet` function to access router facet at runtime (after all facets are attached)
   - Passes both `getRouterFacet` and `routeRegistry` to `createProcessMessageCore`

2. **process-message.mycelia.js:**
   - Updated `processMessage` to check for router facet's `route()` method first
   - Falls back to `routeRegistry.match()` for backward compatibility
   - Added debug logging to track which path is taken

### Files Changed
- `/apps/mycelia-kernel/src/messages/v2/hooks/message-processor/process-message.mycelia.js`
- `/apps/mycelia-kernel/src/messages/v2/hooks/message-processor/use-message-processor.mycelia.js`
- `/apps/math-whiteboard/mycelia-kernel-v2/hooks/message-processor/process-message.mycelia.js`
- `/apps/math-whiteboard/mycelia-kernel-v2/hooks/message-processor/use-message-processor.mycelia.js`

### Testing
- ✅ All existing tests pass (515+ tests in core)
- ✅ Backward compatibility maintained (fallback to routeRegistry.match())
- ✅ Router enhancements now properly executed

### Impact
- **Breaking Change**: None - maintains backward compatibility
- **Behavior Change**: Router facet enhancements (like `useRouterWithScopes`) are now properly executed
- **Benefits**: 
  - Enables scope-based permission checking
  - Allows router hooks to properly intercept and enhance routing
  - Maintains backward compatibility for subsystems not using router enhancements
