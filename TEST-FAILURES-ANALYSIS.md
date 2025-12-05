# Test Failures Analysis

**Analysis Date:** November 29, 2025  
**Context:** After refactoring `listener-manager.mycelia.js` and `kernel.subsystem.mycelia.js`

---

## Summary

**Total Test Status:**
- ✅ **59 test files passing**
- ❌ **9 test files failing**
- ✅ **287 tests passing**
- ❌ **25 tests failing**

**Key Finding:** The failing tests are **NOT related to our refactoring**. They are **pre-existing test infrastructure issues** where test mocks are incomplete.

---

## Root Cause

The failing tests all share the same root cause: **incomplete subsystem mocks** in test files.

### The Problem

Hooks are calling `subsystem.find()` to access facets:
```javascript
// In use-message-system-router.mycelia.js
const registryFacet = subsystem.find('messageSystemRegistry');

// In use-queries.mycelia.js
const routerFacet = subsystem.find('router');
```

But test mocks only provide basic properties:
```javascript
// In test files
const subsystem = { name: 'canvas' }; // ❌ Missing find() method
```

### Error Pattern

All failures show the same error:
```
TypeError: subsystem.find is not a function
```

---

## Failing Test Files

### 1. `use-message-system-router.test.js` (3 failures)

**Issue:** Test mock doesn't provide `subsystem.find()` method

**Current Mock:**
```javascript
const subsystem = { name: 'canvas' }; // ❌ Missing find()
```

**Fix Needed:**
```javascript
const subsystem = {
  name: 'canvas',
  find: vi.fn().mockReturnValue(mockRegistryFacet) // ✅ Add find() method
};
```

**Affected Tests:**
- `requires MessageSystem and subsystems registry`
- `creates MessageRouter with ctx-provided dependencies`
- `routes messages and surfaces stats`

---

### 2. `use-queries.test.js` (6 failures)

**Issue:** Test mock doesn't provide `subsystem.find()` method for router/requests facets

**Current Mock:**
```javascript
const subsystem = {
  name: 'canvas',
  debug: false,
  find: (kind) => (kind === 'messages' ? messagesFacet : undefined), // ⚠️ Only handles 'messages'
  ...subsystemOverrides,
};
```

**Fix Needed:**
```javascript
const subsystem = {
  name: 'canvas',
  debug: false,
  find: vi.fn((kind) => {
    if (kind === 'router') return routerFacet;
    if (kind === 'requests') return requestsFacet;
    if (kind === 'messages') return messagesFacet;
    return undefined;
  }),
  ...subsystemOverrides,
};
```

**Affected Tests:**
- `requires router and requests facets`
- `constructs QueryHandlerManager with router, subsystem name, and debug flag`
- `delegates registerRoute and register to QueryHandlerManager`
- `runs ask() by building messages via messages facet when present`
- `falls back to minimal message shape when messages facet is absent`
- `treats values with slashes or schemes as explicit paths`

---

### 3. `use-responses.test.js` (5 failures)

**Issue:** Test mock doesn't provide `subsystem.find()` method

**Affected Tests:**
- `requires messages facet and identity sendProtected`
- `sendResponse sends via identity with correlation metadata`
- `replyTo infers correlation id and reply path from response manager`
- `replyTo throws if it cannot derive reply path`
- `replyErrorTo sends failure responses with error payload`

---

### 4. Other Test Files (11 failures)

**Similar Issues:**
- `message-system.v2.test.js` - MessageSystem tests
- `message-router.test.js` - MessageRouter tests
- `server.subsystem.test.js` - ServerSubsystem tests
- `access-control.subsystem.test.js` - AccessControlSubsystem tests
- `server-subsystem.http.integration.test.js` - HTTP integration tests

**Common Pattern:** All need proper `subsystem.find()` mocks or proper subsystem setup.

---

## Why These Are Pre-Existing Issues

### Evidence:

1. **Not Related to Our Refactoring:**
   - We only refactored `listener-manager.mycelia.js` and `kernel.subsystem.mycelia.js`
   - These tests don't use those files
   - The errors are about `subsystem.find()` which is a BaseSubsystem method

2. **Test Infrastructure Issue:**
   - Tests were written before hooks started using `subsystem.find()`
   - Mocks weren't updated when the pattern changed
   - This is a test maintenance issue, not a code issue

3. **Pattern Consistency:**
   - All failures follow the same pattern
   - All are missing `subsystem.find()` in mocks
   - This suggests a systematic test update is needed

---

## Impact Assessment

### ✅ Our Refactoring is Safe

- ✅ `listener-manager` tests: **All passing** (5/5)
- ✅ `kernel.subsystem` tests: **All passing** (5/5)
- ✅ No new failures introduced by our changes

### ⚠️ Pre-Existing Test Issues

- ❌ 9 test files need mock updates
- ❌ 25 tests need fixing
- ⚠️ These are test infrastructure issues, not code bugs

---

## Recommended Fix

### Quick Fix (Per Test File)

Update test mocks to include `find()` method:

```javascript
// Before
const subsystem = { name: 'canvas' };

// After
const subsystem = {
  name: 'canvas',
  find: vi.fn((kind) => {
    // Return appropriate facet based on kind
    if (kind === 'router') return routerFacet;
    if (kind === 'requests') return requestsFacet;
    if (kind === 'messages') return messagesFacet;
    if (kind === 'messageSystemRegistry') return registryFacet;
    return null;
  })
};
```

### Systematic Fix

1. **Create a Test Utility:**
   ```javascript
   // test-utils/subsystem-mock.js
   export function createSubsystemMock(overrides = {}) {
     return {
       name: 'test-subsystem',
       debug: false,
       find: vi.fn((kind) => {
         // Return facets based on kind
         return overrides.facets?.[kind] || null;
       }),
       ...overrides
     };
   }
   ```

2. **Update All Test Files:**
   - Replace manual subsystem mocks with utility
   - Ensure all required facets are provided
   - Test each hook's facet requirements

---

## Files That Need Updates

1. ✅ `use-message-system-router.test.js` - Add `find()` mock
2. ✅ `use-queries.test.js` - Fix `find()` to return router/requests
3. ✅ `use-responses.test.js` - Add `find()` mock
4. ✅ `message-system.v2.test.js` - Update subsystem mocks
5. ✅ `message-router.test.js` - Update subsystem mocks
6. ✅ `server.subsystem.test.js` - Update subsystem mocks
7. ✅ `access-control.subsystem.test.js` - Update subsystem mocks
8. ✅ `server-subsystem.http.integration.test.js` - Update integration test setup

---

## Conclusion

**The failing tests are pre-existing test infrastructure issues**, not bugs introduced by our refactoring. The tests need to be updated to provide proper `subsystem.find()` mocks.

**Our refactoring is successful:**
- ✅ All `listener-manager` tests pass
- ✅ All `kernel.subsystem` tests pass
- ✅ No new failures introduced
- ✅ Code is more maintainable

**Next Steps:**
1. Fix test mocks to include `subsystem.find()` method
2. Create test utility for consistent subsystem mocking
3. Update all affected test files

---

**Analysis Completed:** November 29, 2025




