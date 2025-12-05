# Kernel Child Identity Fix Summary

**Date:** December 5, 2025  
**Issue:** Kernel child subsystems were not getting identities that resolve to the kernel's private key  
**Status:** ✅ **FIXED**

---

## Problem Statement

The kernel's child subsystems (access-control, error-manager, response-manager, channel-manager, profile-registry) were not receiving identities during bootstrap, which meant:

1. Child subsystems had no `identity` property
2. Children could not use `sendProtected()` with caller authentication
3. Permission checks would fail for kernel services

---

## Root Causes Identified

### 1. Missing `registerChildSubsystems()` Call

**Location:** `kernel.subsystem.mycelia.js` - `bootstrap()` method

**Problem:** The `bootstrap()` method built the kernel and its children, but never called `registerChildSubsystems()` to wire identities for the kernel's own children.

**Fix:** Added call to `registration.registerChildSubsystems(this, {})` after `build()` completes.

```javascript
async bootstrap(opts) {
  await this.build(opts);
  
  // Wire identities for all kernel child subsystems
  const registration = this.#getRegistration();
  registration.registerChildSubsystems(this, {});
  
  // ... rest of bootstrap
}
```

### 2. Missing `setParent()` Call in `addChild()`

**Location:** `use-hierarchy.mycelia.js` - `addChild()` method

**Problem:** When children were added to the hierarchy, their parent reference was never set. This caused `getRoot()` to return the child itself instead of the kernel, which broke the `wireSubsystem('child', ...)` process.

**Fix:** Added `child.setParent(subsystem)` call before adding to registry.

```javascript
addChild(child) {
  const reg = getRegistry();
  try {
    // Set parent reference on child BEFORE adding to registry
    if (child && typeof child.setParent === 'function') {
      child.setParent(subsystem);
    }
    
    const added = reg.add(child);
    return added;
  } catch (error) {
    throw error;
  }
},
```

---

## How It Works Now

### Identity Creation Flow

```
1. kernel.bootstrap()
   └─> kernel.build()
       ├─> useKernelServices creates child subsystems
       ├─> buildChildren() builds each child
       │   └─> AccessControlSubsystem.build()
       │       └─> usePrincipals creates PrincipalRegistry
       │           └─> PrincipalRegistry constructor
       │               └─> Creates kernel identity (first time only)
       │                   └─> kernel.identity = createIdentity(kernelPkr)
       └─> Returns (kernel now has identity)
   
2. registration.registerChildSubsystems(kernel, {})
   └─> hierarchy.traverse((child) => {
       └─> accessControl.wireSubsystem('child', child)
           ├─> child.getRoot() returns kernel ✅ (parent ref now set)
           ├─> Get kernel.identity.pkr ✅ (identity now exists)
           ├─> principals.createPrincipal('child', { owner: kernelPkr })
           │   └─> register() with owner parameter
           │       └─> resolvePKR(owner) gets kernel's private key
           │       └─> Map child's public key → kernel's private key
           └─> child.identity = principals.createIdentity(childPkr)
   })
```

### Key Insight: Shared Private Key

All kernel child subsystems share the **same private key** as the kernel. This is by design:

```javascript
// In PrincipalRegistry#register()
} else if (owner !== undefined) {
  const ownersPrivate = this.resolvePKR(owner);  // Get owner's private key
  this.#publicToPrivate.set(publicKey, ownersPrivate);  // Map child's public → owner's private
}
```

**Result:** 
- Kernel has unique public key → kernel private key
- Each child has unique public key → **kernel private key** (same as kernel!)
- All children share the same private key as the kernel
- Children have kernel authority when using `sendProtected()`

---

## Test Coverage

Created comprehensive test suite: `kernel-child-identity.test.js`

**14 tests - All passing:**

1. ✅ Kernel has identity with PKR after bootstrap
2. ✅ Kernel identity resolves to kernel private key
3. ✅ Access-control has identity after bootstrap
4. ✅ Access-control identity resolves to kernel private key
5. ✅ Error-manager has identity and resolves to kernel private key
6. ✅ Response-manager has identity and resolves to kernel private key
7. ✅ Channel-manager has identity and resolves to kernel private key
8. ✅ Profile-registry has identity and resolves to kernel private key
9. ✅ All kernel child subsystems resolve to same private key
10. ✅ Child subsystems ARE recognized as kernel by `isKernel()` (share private key)
11. ✅ Children have different public keys but same private key
12. ✅ Child PKRs have correct kind and resolve to kernel private key
13. ✅ Kernel private key stored in principal registry kernelId
14. ✅ Child subsystems can send protected messages with kernel authority

---

## Verification

All tests pass with the following verified behaviors:

### Identity Properties

```javascript
// Kernel
kernel.identity ✅ exists
kernel.identity.pkr ✅ exists
kernel.identity.pkr.kind === 'kernel' ✅

// Children (all 5 children)
child.identity ✅ exists
child.identity.pkr ✅ exists
child.identity.pkr.kind === 'child' ✅
```

### Private Key Resolution

```javascript
const principals = accessControl.find('principals');
const kernelPrivateKey = principals.resolvePKR(kernel.identity.pkr);

// All children resolve to SAME private key
principals.resolvePKR(accessControl.identity.pkr) === kernelPrivateKey ✅
principals.resolvePKR(errorManager.identity.pkr) === kernelPrivateKey ✅
principals.resolvePKR(responseManager.identity.pkr) === kernelPrivateKey ✅
principals.resolvePKR(channelManager.identity.pkr) === kernelPrivateKey ✅
principals.resolvePKR(profileRegistry.identity.pkr) === kernelPrivateKey ✅
```

### Kernel Authority

```javascript
// ALL children are recognized as having kernel authority
principals.isKernel(accessControl.identity.pkr) === true ✅
principals.isKernel(errorManager.identity.pkr) === true ✅
principals.isKernel(responseManager.identity.pkr) === true ✅
principals.isKernel(channelManager.identity.pkr) === true ✅
principals.isKernel(profileRegistry.identity.pkr) === true ✅
```

### Public Key Uniqueness

```javascript
// All subsystems (kernel + 5 children) have UNIQUE public keys
const publicKeys = [
  kernel.identity.pkr.publicKey,
  accessControl.identity.pkr.publicKey,
  errorManager.identity.pkr.publicKey,
  responseManager.identity.pkr.publicKey,
  channelManager.identity.pkr.publicKey,
  profileRegistry.identity.pkr.publicKey
];

new Set(publicKeys).size === 6 ✅ // All unique
```

---

## Security Implications

### Positive

1. **Kernel Authority**: Child subsystems have kernel authority, which is correct since they are privileged kernel services
2. **Authentication**: Children can use `sendProtected()` with their own PKRs
3. **Unified Identity**: All kernel services share a single authority domain

### Considerations

1. **Indistinguishable Authority**: `isKernel()` returns `true` for all children because they share the kernel's private key
2. **PKR Kind Distinction**: Must use `pkr.kind` to distinguish between kernel and children if needed
3. **Trust Boundary**: All kernel child subsystems are equally trusted with kernel authority

---

## Files Modified

1. **src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js**
   - Added `registerChildSubsystems()` call in `bootstrap()`
   - Added debug logging

2. **src/messages/v2/hooks/hierarchy/use-hierarchy.mycelia.js**
   - Added `setParent()` call in `addChild()`

3. **src/messages/v2/models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js**
   - Added debug logging in `wireSubsystem()`

4. **src/messages/v2/tests/integration/kernel-child-identity.test.js**
   - Created comprehensive test suite (NEW FILE)

---

## Conclusion

The fix ensures that all kernel child subsystems:
- ✅ Have identities attached during bootstrap
- ✅ Resolve to the kernel's private key
- ✅ Can use `sendProtected()` with kernel authority
- ✅ Are properly wired with parent-child relationships
- ✅ Share a unified security domain with the kernel

**All 14 tests passing confirms the implementation is correct.**

