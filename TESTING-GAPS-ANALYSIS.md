# Testing Gaps Analysis for Core Package

This document identifies testing gaps in the `@mycelia-kernel` package, particularly focusing on security features and router enhancements.

## Summary

**Critical Missing Tests:**
1. ❌ **useRouterWithScopes** - No tests exist for this hook
2. ⚠️ **Security Profile Integration** - Limited integration tests for profile application to subsystems
3. ⚠️ **Scope Checking Flow** - No tests for the complete scope checking flow (profile → scope → permission)

**Existing Test Coverage:**
- ✅ `useRouter` - Has comprehensive tests
- ✅ `SecurityProfile` - Has unit tests
- ✅ `ProfileRegistrySubsystem` - Has unit and integration tests
- ✅ `PrincipalRegistry` - Has tests
- ✅ `ReaderWriterSet` - Has tests
- ✅ Basic security components are tested

---

## 1. useRouterWithScopes Hook Tests

### Status: ❌ **MISSING - CRITICAL**

**Location:** `src/messages/v2/hooks/router/use-router-with-scopes.mycelia.js`  
**Test File Should Be:** `src/messages/v2/hooks/__tests__/use-router-with-scopes.test.js`

### Why This Is Critical

The `useRouterWithScopes` hook is a **core security feature** that:
- Adds scope-based permission checking on top of RWS checks
- Provides two-layer security (scope check + RWS check)
- Is used by applications (like math-whiteboard) for role-based access control
- Was recently fixed to work with `processMessageCore` (see CORE-UPDATES-FROM-MATH-WHITEBOARD.md)

### What Needs Testing

#### 1.1 Hook Initialization
- ✅ Hook requires 'router' facet from useRouter
- ✅ Hook overwrites router facet correctly
- ✅ Hook validates configuration (getUserRole, scopeMapper)
- ✅ Hook handles missing kernel gracefully
- ✅ Hook handles missing getUserRole gracefully

#### 1.2 Permission Level Checking (`meetsPermissionRequirement`)
- ✅ 'r' permission meets 'read' requirement
- ✅ 'rw' permission meets 'read' requirement
- ✅ 'rw' permission meets 'write' requirement
- ✅ 'rwg' permission meets 'read' requirement
- ✅ 'rwg' permission meets 'write' requirement
- ✅ 'rwg' permission meets 'grant' requirement
- ✅ 'r' permission does NOT meet 'write' requirement
- ✅ 'r' permission does NOT meet 'grant' requirement
- ✅ 'rw' permission does NOT meet 'grant' requirement

#### 1.3 Profile Retrieval (`getProfileForRole`)
- ✅ Returns profile when role exists in ProfileRegistrySubsystem
- ✅ Returns null when role doesn't exist
- ✅ Returns null when kernel is missing
- ✅ Returns null when ProfileRegistrySubsystem is missing
- ✅ Handles errors gracefully

#### 1.4 Scope Permission Checking (`checkScopePermission`)
- ✅ Returns true when user has required permission
- ✅ Returns false when user has no role
- ✅ Returns false when profile doesn't exist for role
- ✅ Returns false when scope not in profile
- ✅ Returns false when scope permission doesn't meet requirement
- ✅ Returns false when kernel is missing
- ✅ Returns false when getUserRole is missing
- ✅ Handles errors gracefully (fail-secure)

#### 1.5 Route Matching (`match` method)
- ✅ Delegates to original router.match()
- ✅ Performs scope check when scope exists
- ✅ Skips scope check when scope is null
- ✅ Skips scope check when required is null
- ✅ Skips scope check when callerId is missing
- ✅ Returns null when scope check fails
- ✅ Returns match result when scope check passes
- ✅ Falls back to fail-secure when scope checking unavailable

#### 1.6 Route Execution (`route` method)
- ✅ Delegates to original router.route() when scope check passes
- ✅ Throws PermissionDenied error when scope check fails
- ✅ Performs scope check before RWS check
- ✅ Handles errors from scope checking
- ✅ Preserves original router functionality (registerRoute, etc.)

#### 1.7 Integration with processMessageCore
- ✅ Scope checking is executed when using processMessageCore
- ✅ Router facet's route() method is called (not routeRegistry.match())
- ✅ Options.callerId is passed correctly
- ✅ Scope metadata is read from route metadata

#### 1.8 Edge Cases
- ✅ Routes without scope metadata (should skip scope check)
- ✅ Routes without required permission (should skip scope check)
- ✅ Multiple routes with different scopes
- ✅ Scope mapper function (if provided)
- ✅ Debug logging when enabled

### Estimated Test Count: **~40-50 tests**

---

## 2. Security Profile Integration Tests

### Status: ⚠️ **PARTIAL - NEEDS ENHANCEMENT**

**Existing Tests:**
- ✅ `security-profile.test.js` - Unit tests for SecurityProfile class
- ✅ `profile-registry.subsystem.test.js` - Unit tests for ProfileRegistrySubsystem
- ✅ `profile-registry.integration.test.js` - Basic integration tests

**Missing Test Coverage:**

#### 2.1 Profile Application to Subsystem RWS
- ❌ Applying profile grants permissions on subsystem identity RWS
- ❌ Kernel can grant permissions on subsystem RWS
- ❌ Profile grants are correctly mapped to RWS permissions (r → addReader, rw/rwg → addWriter)
- ❌ Multiple profiles can be applied to same principal
- ❌ Profile updates reflect in RWS permissions
- ❌ Profile removal removes RWS permissions

#### 2.2 Profile + Scope Integration
- ❌ Profile scopes are checked correctly by useRouterWithScopes
- ❌ Profile permission levels match scope requirements
- ❌ Multiple scopes in profile work correctly
- ❌ Missing scopes in profile deny access correctly

#### 2.3 Profile Application Flow
- ❌ Complete flow: Create profile → Apply to principal → Check permissions → Route message
- ❌ Profile application works with kernel identity
- ❌ Profile application works with subsystem identities
- ❌ Profile application handles errors gracefully

### Estimated Additional Tests: **~20-30 tests**

---

## 3. Scope Checking Flow Tests

### Status: ❌ **MISSING**

**What This Tests:**
The complete end-to-end flow of scope-based permission checking:
1. User has role → Role maps to Security Profile
2. Profile has scopes → Scopes map to permission levels
3. Route requires scope → Scope check validates permission
4. Permission check → RWS check validates access
5. Handler executes → If both checks pass

**Test Scenarios:**

#### 3.1 Complete Flow - Success Path
- ✅ User with role → Profile exists → Scope in profile → Permission level sufficient → RWS allows → Handler executes

#### 3.2 Complete Flow - Failure Paths
- ✅ User with no role → Scope check fails
- ✅ User with role → Profile missing → Scope check fails
- ✅ User with role → Profile exists → Scope missing → Scope check fails
- ✅ User with role → Profile exists → Scope exists → Permission insufficient → Scope check fails
- ✅ Scope check passes → RWS check fails → Handler doesn't execute

#### 3.3 Integration with Message Processing
- ✅ Scope check is called from processMessageCore
- ✅ Scope check receives correct callerId
- ✅ Scope check receives correct route metadata
- ✅ Errors are properly propagated

### Estimated Test Count: **~15-20 tests**

---

## 4. PrincipalRegistry Kernel Registration Tests

### Status: ⚠️ **PARTIAL - NEEDS ENHANCEMENT**

**Existing Tests:**
- ✅ `principal-registry.test.js` - Has basic tests
- ✅ Tests verify kernel principal creation

**Missing Test Coverage:**

#### 4.1 Duplicate Kernel Registration Prevention
- ❌ First PrincipalRegistry registers kernel
- ❌ Second PrincipalRegistry skips kernel registration (if kernel already has identity)
- ❌ Kernel PKR is consistent across registries
- ❌ Kernel identity is shared correctly
- ❌ Kernel can grant permissions after duplicate prevention fix

#### 4.2 Kernel PKR Consistency
- ❌ kernel.identity.pkr matches AccessControl registry's kernel PKR
- ❌ isKernel() returns true for kernel PKR
- ❌ canGrant() works with kernel PKR
- ❌ Kernel PKR resolution works correctly

### Estimated Additional Tests: **~10-15 tests**

---

## 5. ReaderWriterSet Permission Granting Tests

### Status: ⚠️ **PARTIAL - NEEDS ENHANCEMENT**

**Existing Tests:**
- ✅ `reader-writer-set.test.js` - Has basic tests

**Missing Test Coverage:**

#### 5.1 Kernel Granting Permissions
- ❌ Kernel can grant permissions on subsystem RWS
- ❌ Kernel PKR is recognized as granter
- ❌ addReader/addWriter succeed when kernel is granter
- ❌ Granting permissions works after kernel registration fix

#### 5.2 Profile-Based Permission Granting
- ❌ Profile application grants permissions correctly
- ❌ Multiple permissions from profile are granted
- ❌ Permission levels are correctly mapped (r → reader, rw/rwg → writer)

### Estimated Additional Tests: **~10-15 tests**

---

## 6. Message Processing Integration Tests

### Status: ⚠️ **PARTIAL - NEEDS ENHANCEMENT**

**Existing Tests:**
- ✅ `use-message-processor.test.js` - Has basic tests

**Missing Test Coverage:**

#### 6.1 Router Facet Integration
- ❌ processMessageCore uses router facet's route() method
- ❌ Router enhancements (like useRouterWithScopes) are executed
- ❌ Fallback to routeRegistry.match() works when router facet unavailable
- ❌ Options are passed correctly to router.route()

#### 6.2 Scope Checking in Message Processing
- ❌ Scope check is performed during message processing
- ❌ Scope check errors are handled correctly
- ❌ Statistics are recorded correctly

### Estimated Additional Tests: **~8-12 tests**

---

## Priority Recommendations

### High Priority (Critical for Security)

1. **useRouterWithScopes Tests** ⭐⭐⭐
   - **Why:** Core security feature, recently fixed, no test coverage
   - **Impact:** High - affects all applications using scope-based permissions
   - **Effort:** Medium (40-50 tests)

2. **Scope Checking Flow Tests** ⭐⭐⭐
   - **Why:** End-to-end security validation
   - **Impact:** High - ensures complete security flow works
   - **Effort:** Medium (15-20 tests)

3. **Profile Application to Subsystem RWS** ⭐⭐
   - **Why:** Critical for security profile functionality
   - **Impact:** High - affects profile-based access control
   - **Effort:** Medium (20-30 tests)

### Medium Priority (Important for Correctness)

4. **Kernel Registration Consistency Tests** ⭐⭐
   - **Why:** Recently fixed bug, needs regression tests
   - **Impact:** Medium - affects kernel identity consistency
   - **Effort:** Low (10-15 tests)

5. **Message Processing Router Integration** ⭐
   - **Why:** Recently fixed, needs validation
   - **Impact:** Medium - affects router enhancements
   - **Effort:** Low (8-12 tests)

### Low Priority (Nice to Have)

6. **RWS Permission Granting Enhancement** ⭐
   - **Why:** Would improve test coverage
   - **Impact:** Low - basic functionality works
   - **Effort:** Low (10-15 tests)

---

## Test File Structure Recommendations

### For useRouterWithScopes Tests

```javascript
describe('useRouterWithScopes', () => {
  describe('Hook Initialization', () => { ... });
  describe('Permission Level Checking', () => { ... });
  describe('Profile Retrieval', () => { ... });
  describe('Scope Permission Checking', () => { ... });
  describe('Route Matching', () => { ... });
  describe('Route Execution', () => { ... });
  describe('Integration with processMessageCore', () => { ... });
  describe('Edge Cases', () => { ... });
});
```

### For Scope Checking Flow Tests

```javascript
describe('Scope Checking Flow', () => {
  describe('Complete Flow - Success Path', () => { ... });
  describe('Complete Flow - Failure Paths', () => { ... });
  describe('Integration with Message Processing', () => { ... });
});
```

---

## Estimated Total Test Count

- **useRouterWithScopes:** ~40-50 tests
- **Security Profile Integration:** ~20-30 tests
- **Scope Checking Flow:** ~15-20 tests
- **Kernel Registration:** ~10-15 tests
- **Message Processing Integration:** ~8-12 tests
- **RWS Permission Granting:** ~10-15 tests

**Total: ~103-142 new tests**

---

## Notes

1. **Test Utilities:** Consider creating test utilities similar to `KernelTestContext` from math-whiteboard for consistent testing
2. **Integration Tests:** Some tests should be integration tests (full MessageSystem + Kernel setup)
3. **Mocking:** Some tests can use mocks, but integration tests should use real instances
4. **Documentation:** Tests should serve as documentation for how these features work

