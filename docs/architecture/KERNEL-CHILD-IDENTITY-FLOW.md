# Kernel Child Identity Flow Analysis

## Problem
Kernel child subsystems are not getting identities that resolve to the kernel's private key.

## Expected Flow

### 1. Kernel Bootstrap Initialization
```
kernel.bootstrap()
  └─> kernel.build()
      ├─> Install hooks (including useKernelServices)
      ├─> Execute hooks
      │   └─> useKernelServices creates child subsystems:
      │       ├─> AccessControlSubsystem (with usePrincipals hook)
      │       ├─> ErrorManagerSubsystem
      │       ├─> ResponseManagerSubsystem
      │       ├─> ChannelManagerSubsystem
      │       └─> ProfileRegistrySubsystem
      └─> buildChildren()
          └─> For each child:
              └─> child.build()
                  └─> AccessControlSubsystem.build()
                      └─> usePrincipals hook executed
                          └─> PrincipalRegistry constructor
                              └─> Creates kernel identity (IF not exists)
                                  └─> kernel.identity = createIdentity(kernelPkr)
```

### 2. Identity Wiring Phase
```
After kernel.build() completes:
  └─> registration.registerChildSubsystems(kernel, {})
      └─> Get kernel's hierarchy
      └─> hierarchy.traverse((child) => {
          └─> accessControl.wireSubsystem('child', child, options)
              ├─> Get root subsystem: child.getRoot()
              ├─> Check root.identity?.pkr EXISTS ❌ FAILS HERE
              ├─> Get owner PKR from root.identity.pkr
              └─> principals.createPrincipal('child', { owner: ownerPkr })
                  └─> register() with owner parameter
                      └─> resolvePKR(owner) to get owner's private key
                      └─> Map child's public key to owner's private key
      })
```

## Root Cause Analysis

The error "root subsystem must have an identity with a PKR for child subsystems" occurs at the wire check.

### Possible Issues:

1. **Timing Issue**: Kernel identity created during build, but reference not available when wiring
2. **Multiple PrincipalRegistry**: AccessControl and ProfileRegistry both create PrincipalRegistries
3. **Parent Reference**: Children might not have correct parent reference to kernel

### Check: Where is kernel identity created?

PrincipalRegistry constructor (line 25-49):
```javascript
constructor(opts = {}) {
  this.#kernel = opts.kernel || null;
  if (opts.kernel) {
    const existingIdentity = opts.kernel.identity;
    if (existingIdentity?.pkr?.kind === PRINCIPAL_KINDS.KERNEL) {
      return; // Skip if already has identity
    }
    // Create kernel identity
    const pkr = this.createPrincipal(PRINCIPAL_KINDS.KERNEL, { instance: opts.kernel });
    opts.kernel.identity = this.createIdentity(pkr);
  }
}
```

This happens when:
- AccessControlSubsystem builds → usePrincipals creates PrincipalRegistry → kernel gets identity
- ProfileRegistrySubsystem builds → useProfiles creates another PrincipalRegistry → kernel already has identity, skip

## Solution

The issue is that `kernel.identity` is set during child build, but we're trying to wire children AFTER kernel build completes. The kernel should already have its identity by then.

**Hypothesis**: The error might be caused by the child subsystems not having the correct parent reference to the kernel when `getRoot()` is called.

### Test: Check Parent References

When useKernelServices creates children:
```javascript
hierarchy.addChild(childSubsystem);
```

Does `addChild` correctly set the parent reference on the child?

### Check hierarchy.addChild implementation:

```javascript
addChild(child) {
  if (!child || typeof child !== 'object') {
    throw new Error('addChild: child must be a valid subsystem instance');
  }
  
  // Set parent reference on child
  child.setParent(this.#subsystem);
  
  this.#children.push(child);
  return this.#subsystem;
}
```

So the parent IS set. Then `getRoot()` should return the kernel.

### Alternative Hypothesis

Maybe the issue is that `registerChildSubsystems` is being called BEFORE the children are built? Let me check the bootstrap flow again:

```javascript
async bootstrap(opts) {
  await this.build(opts);  // This builds children too
  
  // Wire identities for children
  const registration = this.#getRegistration();
  registration.registerChildSubsystems(this, {});  // Should work...
}
```

Wait! I see it now. In `build()`, the kernel builds its children via `buildChildren()`. But the kernel itself DOESN'T have its identity until AccessControlSubsystem is built (which is a child).

So the flow is:
1. kernel.build() starts
2. Children are created (not yet built)
3. buildChildren() is called
4. AccessControlSubsystem is built FIRST
5. During AccessControlSubsystem build, kernel gets its identity
6. Other children are built
7. kernel.build() completes
8. registerChildSubsystems() is called
9. It should work because kernel has identity by now...

**BUT WAIT**: What if the build order is NOT guaranteed to build AccessControlSubsystem first?

## Build Order Investigation

The children are built in the order they appear in the hierarchy. Let me check the order in useKernelServices:

```javascript
const childSubsystems = [
  { name: 'access-control', SubsystemClass: AccessControlSubsystem, ... },
  { name: 'error-manager', SubsystemClass: ErrorManagerSubsystem, ... },
  { name: 'response-manager', SubsystemClass: ResponseManagerSubsystem, ... },
  { name: 'channel-manager', SubsystemClass: ChannelManagerSubsystem, ... },
  { name: 'profile-registry', SubsystemClass: ProfileRegistrySubsystem, ... }
];

for (const childDef of childSubsystems) {
  const childSubsystem = new childDef.SubsystemClass(...);
  hierarchy.addChild(childSubsystem);
}
```

So they're added in order: access-control, error-manager, response-manager, channel-manager, profile-registry.

And `buildChildren()` builds them in the order they're stored in the hierarchy.

So AccessControlSubsystem should be built FIRST, which means the kernel should get its identity FIRST.

## Real Issue?

Maybe the problem is that the MessageSystem test is not in debug mode, so `messageSystem.debug` is false? Let me check if that affects anything...

Actually, looking at the test:
```javascript
kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  debug: false  // ← Debug is false!
});
```

But that shouldn't matter for identity creation.

## Actual Root Cause

I think I found it! Let me re-read the wireSubsystem code for 'child' type:

```javascript
if (type === 'child') {
  const rootSubsystem = subsystemInstance.getRoot();
  if (!rootSubsystem) {
    throw new Error('AccessControlSubsystem.wireSubsystem: unable to get root subsystem for child.');
  }
  owner = rootSubsystem.identity?.pkr;
  if (!owner) {
    throw new Error('AccessControlSubsystem.wireSubsystem: root subsystem must have an identity with a PKR for child subsystems.');
  }
}
```

The child calls `getRoot()` which should return the kernel. But what if the child is NOT properly linked to the kernel via parent references?

Let me check if `setParent()` is working correctly...

Actually, I realize the issue: When we call `registration.registerChildSubsystems(this, {})`, we're passing `this` (the kernel) as the parent. But then it traverses the hierarchy and for each child, it tries to wire it as a 'child' type, which requires the child to call `getRoot()`.

But `getRoot()` is called on the CHILD, not the parent! So the child needs to have its parent reference set correctly to the kernel so that `getRoot()` can traverse up to the kernel.

And the children SHOULD have their parent set because `hierarchy.addChild()` calls `child.setParent(this.#subsystem)`.

So why is it failing?

**AHA!** I think I see it now. The error message says "root subsystem must have an identity". This means `getRoot()` successfully returned the kernel, but `rootSubsystem.identity` is undefined!

So the kernel doesn't have its identity when we try to wire children.

Why? Because the build order might not guarantee that AccessControlSubsystem is built before we try to wire children!

Actually, wait. Let me re-read the bootstrap code:

```javascript
async bootstrap(opts) {
  await this.build(opts);  // This FULLY builds kernel AND all children
  
  // Wire identities for children
  const registration = this.#getRegistration();
  registration.registerChildSubsystems(this, {});  
}
```

By the time `build()` completes, ALL children have been built, including AccessControlSubsystem. So the kernel SHOULD have its identity.

Unless... what if the kernel identity is being set on a DIFFERENT kernel instance? No, that doesn't make sense.

Or... what if there's an issue with the test setup? Let me check if the MessageSystem bootstrap is setting up the kernel correctly.

Looking at MessageSystem.bootstrap():
```javascript
await this.build({ graphCache: this.#graphCache });
const router = this.find('messageSystemRouter'); 
if(router){
  router.setKernel(this.#kernel);
  this.#kernel.setMsRouter(router); 
}
await this.#kernel.bootstrap({graphCache: this.#graphCache});
```

So it builds the MessageSystem first, then bootstraps the kernel.

## Conclusion

I think the issue is that we're trying to wire children TOO EARLY. The kernel identity is created during the build of AccessControlSubsystem, but maybe we need to wait for ALL children to finish building before wiring them.

Actually, that doesn't make sense either because `build()` waits for `buildChildren()` to complete.

Let me add some debug logging to figure out what's happening.

