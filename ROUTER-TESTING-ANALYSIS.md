# Router-Related Code Testing Analysis

## Overview

This document analyzes all router-related code components and identifies testing gaps, particularly focusing on the integration between `useRouter`, `useMessageProcessor`, and `useRouterWithScopes`.

## Router Components

### 1. **SubsystemRouter** (`subsystem-router.mycelia.js`)
- **Purpose**: Core route matching engine
- **Key Methods**:
  - `register(pattern, handler, metadata)` - Register routes
  - `match(path)` - Match paths against routes
  - `unregister(pattern)` - Remove routes
  - `getRoutes()` - Get all routes
  - `hasRoute(pattern)` - Check if route exists
- **Test Coverage**: ❌ **NO TESTS FOUND**
- **Critical**: This is the foundation - needs comprehensive testing

### 2. **useRouter** (`use-router.mycelia.js`)
- **Purpose**: Hook that wraps SubsystemRouter, provides route registration API
- **Key Features**:
  - Route registration (`registerRoute`, `registerRoutes`)
  - Route matching (`match`)
  - Route execution (`route`)
  - Auth wrapper integration (`getAuthWrapper`)
  - Options sanitization (strips `callerIdSetBy`)
- **Test Coverage**: ✅ **7 tests** - Basic coverage exists
- **Test File**: `use-router.test.js`
- **What's Tested**:
  - ✅ Route registration
  - ✅ Route matching with auth wrapping
  - ✅ Route execution with options sanitization
  - ✅ Error handling
- **What's Missing**:
  - ❌ Integration with `useMessageProcessor`
  - ❌ Full path handling (e.g., `workspace://update` vs `update`)
  - ❌ `callerId` flow through `route()` method
  - ❌ Auth wrapper behavior with different permission types
  - ❌ Options passing to handlers

### 3. **useRouterWithScopes** (`use-router-with-scopes.mycelia.js`)
- **Purpose**: Enhanced router with scope-based permission checking
- **Key Features**:
  - Overwrites `useRouter` facet
  - Adds scope checking before RWS check
  - Requires `getUserRole` function
  - Accesses kernel for ProfileRegistrySubsystem
- **Test Coverage**: ⚠️ **34 tests, 17 failing**
- **Test File**: `use-router-with-scopes.test.js`
- **Current Issues**:
  - ❌ Scope checking not executing (kernel not found?)
  - ❌ Permission denial tests failing
  - ❌ Profile retrieval tests failing

### 4. **useMessageProcessor** (`use-message-processor.mycelia.js`)
- **Purpose**: Core message processing hook
- **Key Features**:
  - `processMessage()` - Process messages from queue
  - `processImmediately()` - Process messages immediately
  - `accept()` - Accept messages into queue
  - `processTick()` - Process one message from queue
  - **CRITICAL**: Uses `getRouterFacet: () => subsystem.find('router')` to get router at runtime
- **Test Coverage**: ✅ **4 tests** - Very basic coverage
- **Test File**: `use-message-processor.test.js`
- **What's Tested**:
  - ✅ Basic message processing
  - ✅ Queue operations
  - ✅ Facet requirements
- **What's Missing**:
  - ❌ **CRITICAL**: Integration with router facet's `route()` method
  - ❌ **CRITICAL**: Testing that `getRouterFacet()` returns correct router (useRouterWithScopes vs useRouter)
  - ❌ Testing `processImmediately()` with router facet
  - ❌ Testing fallback to `routeRegistry.match()` when router facet unavailable
  - ❌ Testing `callerId` flow through `processMessageCore`
  - ❌ Testing error handling and statistics recording

### 5. **processMessageCore** (`process-message.mycelia.js`)
- **Purpose**: Core message processing logic
- **Key Features**:
  - **PREFERRED PATH**: Uses `runtimeRouterFacet.route()` if available
  - **FALLBACK PATH**: Uses `routeRegistry.match()` if router facet unavailable
  - Records statistics
  - Handles errors
- **Test Coverage**: ❌ **NO DIRECT TESTS** (tested indirectly via useMessageProcessor)
- **What's Missing**:
  - ❌ **CRITICAL**: Testing that it calls `routerFacet.route()` when available
  - ❌ **CRITICAL**: Testing that it passes `options` correctly (including `callerId`)
  - ❌ Testing fallback path
  - ❌ Testing error handling

## Critical Integration Points

### 1. **Router Facet Resolution** ⚠️ **CRITICAL**

**Flow**:
```
useMessageProcessor → getRouterFacet: () => subsystem.find('router')
  ↓
subsystem.find('router') → Should return useRouterWithScopes facet (if installed)
  ↓
runtimeRouterFacet.route(message, options) → Should call useRouterWithScopes.route()
```

**Potential Issues**:
- ❓ Is `subsystem.find('router')` returning the correct facet?
- ❓ Is `useRouterWithScopes` facet properly attached?
- ❓ Is the overwrite mechanism working correctly?

**Needs Testing**:
- ✅ Verify `getRouterFacet()` returns `useRouterWithScopes` when both hooks installed
- ✅ Verify `getRouterFacet()` returns `useRouter` when only `useRouter` installed
- ✅ Verify router facet's `route()` method is called with correct `options`

### 2. **Options Flow** ⚠️ **CRITICAL**

**Flow**:
```
kernel.sendProtected(pkr, message, options)
  ↓
options.callerId = pkr (set by kernel)
options.callerIdSetBy = kernel.identity.pkr (set by kernel)
  ↓
MessageRouter.route(message, options)
  ↓
subsystem.processImmediately(message, options)
  ↓
useMessageProcessor.processImmediately(message, options)
  ↓
processMessageCore(message, options)
  ↓
runtimeRouterFacet.route(message, options) ← options.callerId should be present
  ↓
useRouterWithScopes.route(message, options) ← checks options.callerId
  ↓
useRouter.route(message, options) ← strips callerIdSetBy, passes callerId to handler
```

**Potential Issues**:
- ❓ Is `options.callerId` being passed through all layers?
- ❓ Is `options` object being mutated somewhere?
- ❓ Is `callerIdSetBy` being stripped at the right time?

**Needs Testing**:
- ✅ Verify `callerId` flows through entire chain
- ✅ Verify `callerIdSetBy` is stripped before handler execution
- ✅ Verify `callerId` is available in `useRouterWithScopes.route()`

### 3. **Path Handling** ⚠️ **POTENTIAL ISSUE**

**Current Behavior**:
- Routes registered with full path: `workspace://update`
- Messages have full path: `workspace://update`
- SubsystemRouter.match() expects: Full path or route part?

**Potential Issues**:
- ❓ Does SubsystemRouter.match() handle full paths correctly?
- ❓ Should routes be registered with full paths or route parts?
- ❓ Is path extraction happening somewhere?

**Needs Testing**:
- ✅ Test route matching with full paths (`workspace://update`)
- ✅ Test route matching with route parts (`update`)
- ✅ Verify path extraction logic

## Recommended Test Additions

### Priority 1: Critical Integration Tests

#### 1. **useMessageProcessor + useRouter Integration**
```javascript
describe('useMessageProcessor + useRouter integration', () => {
  it('should call router facet route() method when processing messages', async () => {
    // Setup: subsystem with useRouter + useMessageProcessor
    // Action: processImmediately(message, { callerId: pkr })
    // Assert: routerFacet.route() called with message and options (including callerId)
  });
  
  it('should pass callerId through processMessageCore to router facet', async () => {
    // Verify callerId is present in options when router.route() is called
  });
  
  it('should fallback to routeRegistry when router facet unavailable', async () => {
    // Test fallback path
  });
});
```

#### 2. **useMessageProcessor + useRouterWithScopes Integration**
```javascript
describe('useMessageProcessor + useRouterWithScopes integration', () => {
  it('should call useRouterWithScopes.route() when both hooks installed', async () => {
    // Verify getRouterFacet() returns useRouterWithScopes facet
    // Verify scope checking is executed
  });
  
  it('should pass callerId to useRouterWithScopes for scope checking', async () => {
    // Verify options.callerId is present when scope check runs
  });
});
```

#### 3. **Options Flow Tests**
```javascript
describe('Options flow through message processing', () => {
  it('should preserve callerId from sendProtected through to router.route()', async () => {
    // Test full flow: kernel.sendProtected → processImmediately → router.route()
  });
  
  it('should strip callerIdSetBy before handler execution', async () => {
    // Verify callerIdSetBy is removed but callerId remains
  });
});
```

### Priority 2: SubsystemRouter Tests

#### 1. **Route Matching Tests**
```javascript
describe('SubsystemRouter', () => {
  it('should match full paths like workspace://update', () => {
    // Test path matching with subsystem:// prefix
  });
  
  it('should match route parts like update', () => {
    // Test path matching without prefix
  });
  
  it('should handle parameterized routes', () => {
    // Test {id} patterns
  });
  
  it('should handle wildcard routes', () => {
    // Test * patterns
  });
});
```

### Priority 3: Enhanced useRouter Tests

#### 1. **Full Path Handling**
```javascript
describe('useRouter full path handling', () => {
  it('should register routes with full paths', () => {
    // Test registering workspace://update
  });
  
  it('should match messages with full paths', () => {
    // Test matching workspace://update
  });
  
  it('should execute handlers with correct params', () => {
    // Test handler execution
  });
});
```

#### 2. **Auth Wrapper Integration**
```javascript
describe('useRouter auth wrapper', () => {
  it('should wrap handlers with requireAuth when required permission specified', () => {
    // Test auth wrapping
  });
  
  it('should pass options to requireAuth correctly', () => {
    // Test options flow to auth wrapper
  });
});
```

## Current Test Status Summary

| Component | Test File | Tests | Status | Critical Gaps |
|-----------|-----------|-------|--------|---------------|
| SubsystemRouter | ❌ None | 0 | ❌ Missing | Route matching, path handling |
| useRouter | ✅ use-router.test.js | 7 | ✅ Passing | Integration, full paths, callerId flow |
| useRouterWithScopes | ⚠️ use-router-with-scopes.test.js | 34 (17 failing) | ⚠️ Partial | Scope checking execution, kernel access |
| useMessageProcessor | ✅ use-message-processor.test.js | 4 | ✅ Passing | Router facet integration, callerId flow |
| processMessageCore | ❌ None (indirect) | 0 | ❌ Missing | Router facet usage, options passing |

## Immediate Action Items

1. **Add integration test**: `useMessageProcessor` + `useRouter` + `useRouterWithScopes`
   - Verify router facet resolution
   - Verify `callerId` flow
   - Verify scope checking execution

2. **Add SubsystemRouter tests**: Test route matching with full paths

3. **Debug current issue**: Why isn't scope checking executing?
   - Add logging to verify `getRouterFacet()` returns correct facet
   - Add logging to verify `options.callerId` is present
   - Add logging to verify kernel is found

4. **Test options flow**: Create end-to-end test from `sendProtected` to handler execution

## Code Flow Analysis

### Current Flow (What Should Happen)
```
1. kernel.sendProtected(pkr, message, {})
   → Sets options.callerId = pkr
   → Sets options.callerIdSetBy = kernel.identity.pkr
   
2. MessageRouter.route(message, options)
   → Routes to subsystem
   
3. subsystem.processImmediately(message, options)
   → Calls useMessageProcessor.processImmediately()
   
4. processMessageCore(message, options)
   → Calls getRouterFacet() → subsystem.find('router')
   → Should return useRouterWithScopes facet
   → Calls runtimeRouterFacet.route(message, options)
   
5. useRouterWithScopes.route(message, options)
   → Checks: scope && required && options.callerId && getUserRole && kernel
   → If all true: checkScopePermission()
   → If permission denied: throw error
   → If permission granted: call originalRoute()
   
6. useRouter.route(message, options)
   → Match route
   → Wrap handler with auth
   → Strip callerIdSetBy
   → Execute handler
```

### Potential Issues

1. **Router Facet Resolution**: `getRouterFacet()` might not be returning `useRouterWithScopes`
2. **Kernel Access**: `useRouterWithScopes` might not be finding kernel correctly
3. **Options Passing**: `options.callerId` might not be reaching `useRouterWithScopes.route()`
4. **Path Matching**: Routes might not be matching correctly

## Recommendations

1. **Create integration test** that verifies the full flow from `sendProtected` to handler execution
2. **Add debug logging** to trace router facet resolution and options flow
3. **Test SubsystemRouter** with full paths to verify matching works
4. **Test useMessageProcessor** with real router facets (not mocks) to verify integration
5. **Fix kernel access** in `useRouterWithScopes` - verify it's finding kernel correctly

