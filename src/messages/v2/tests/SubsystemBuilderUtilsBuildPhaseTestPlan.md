# Build Phase Test Plan

## Overview

This document outlines the test plan for the `buildSubsystem` function, which is the execution phase of the subsystem build process. The build phase is transactional and performs side effects: it assigns context, adds/initializes/attaches facets, and builds child subsystems.

The tests are split into **four test files** for better organization and maintainability:

1. **SubsystemBuilderUtilsBuildPlanTest.jsx** - Plan validation and context assignment
2. **SubsystemBuilderUtilsBuildFacetsTest.jsx** - Facet addition, initialization, and attachment
3. **SubsystemBuilderUtilsBuildTransactionsTest.jsx** - Transaction behavior and error handling
4. **SubsystemBuilderUtilsBuildChildrenTest.jsx** - Child building and integration scenarios

---

## File 1: SubsystemBuilderUtilsBuildPlanTest.jsx

**Focus:** Plan validation and context assignment

### 1. Plan Validation
Tests that verify the build phase validates the plan before execution.

**Test Cases:**
- ✅ Validates plan has orderedKinds
- ✅ Validates plan has facetsByKind
- ✅ Throws error for null plan
- ✅ Throws error for undefined plan
- ✅ Throws error for plan missing orderedKinds
- ✅ Throws error for plan missing facetsByKind
- ✅ Throws error for empty orderedKinds array
- ✅ Throws error for empty facetsByKind object
- ✅ Accepts valid plan structure

### 2. Context Assignment
Tests that verify the resolved context is correctly assigned to the subsystem.

**Test Cases:**
- ✅ Assigns resolvedCtx to subsystem.ctx
- ✅ Overwrites existing subsystem.ctx
- ✅ Preserves all properties from resolvedCtx
- ✅ Includes graphCache in assigned ctx
- ✅ Includes config in assigned ctx (deep merged)
- ✅ Includes ms in assigned ctx
- ✅ Includes debug flag in assigned ctx

**Helper Functions:**
- `createInvalidPlan()` - Creates various invalid plan structures
- `createValidPlan()` - Creates a valid plan structure
- `createMockSubsystem()` - Creates a mock subsystem with FacetManager

---

## File 2: SubsystemBuilderUtilsBuildFacetsTest.jsx

**Focus:** Facet addition, initialization, and attachment

### 3. FacetManager.addMany Integration
Tests that verify facets are added via FacetManager.addMany with correct parameters.

**Test Cases:**
- ✅ Calls addMany with orderedKinds
- ✅ Calls addMany with facetsByKind
- ✅ Passes init: true option
- ✅ Passes attach: true option
- ✅ Passes resolvedCtx as ctx option
- ✅ Passes subsystem.api as api option
- ✅ Facets added in dependency order
- ✅ All facets from plan are added

### 4. Facet Initialization
Tests that verify facets are initialized correctly during the build phase.

**Test Cases:**
- ✅ Facet.init() called for each facet
- ✅ init() called with correct ctx parameter
- ✅ init() called with correct api parameter
- ✅ init() called with correct subsystem parameter
- ✅ init() called in dependency order
- ✅ Facet frozen after init (cannot mutate)
- ✅ onInit callback called if set
- ✅ onInit callback receives correct parameters
- ✅ Facet marked as initialized (#isInit = true)
- ✅ init() not called twice for same facet
- ✅ Multiple facets initialized correctly

### 5. Facet Attachment
Tests that verify facets are attached to the subsystem when appropriate.

**Test Cases:**
- ✅ Facets with attach: true are attached
- ✅ Facets with attach: false are not attached
- ✅ Attached facets accessible on subsystem
- ✅ Attached facets accessible via FacetManager.find()
- ✅ Attachment happens after successful init
- ✅ Multiple facets attached correctly
- ✅ Attachment respects shouldAttach() method

**Helper Functions:**
- `createFacetWithInit()` - Creates facet with init callback
- `createFacetWithAttach()` - Creates facet with attach flag
- `createFacetWithOnInit()` - Creates facet with onInit callback
- `createMockFacet()` - Creates a facet with configurable init/attach behavior
- `createMockPlan()` - Creates a valid build plan

---

## File 3: SubsystemBuilderUtilsBuildTransactionsTest.jsx

**Focus:** Transaction behavior and error handling

### 6. Transaction Behavior
Tests that verify transactional behavior and rollback on failures.

**Test Cases:**
- ✅ Transaction started before adding facets
- ✅ Transaction committed after all facets added
- ✅ Rollback on facet init failure
- ✅ All facets disposed on rollback
- ✅ All facets removed from FacetManager on rollback
- ✅ Rollback happens in reverse order
- ✅ Partial success: facets added before failure are rolled back
- ✅ No side effects if transaction fails
- ✅ subsystem.ctx not modified if transaction fails

### 7. Facet Initialization Failures
Tests that verify error handling when facet initialization fails.

**Test Cases:**
- ✅ Throws error when facet.init() throws
- ✅ Error message includes facet kind
- ✅ Error message includes hook source
- ✅ All previously added facets rolled back
- ✅ FacetManager state restored (no facets added)
- ✅ subsystem.ctx not modified on failure
- ✅ Handles async init errors
- ✅ Handles sync init errors

### 10. Error Handling
Tests that verify error handling throughout the build phase.

**Test Cases:**
- ✅ Invalid plan errors thrown immediately
- ✅ Facet init errors propagate correctly
- ✅ Child build errors propagate correctly
- ✅ Error messages are descriptive
- ✅ Error includes context about which facet failed
- ✅ Error includes context about which child failed
- ✅ Handles null/undefined gracefully where appropriate

**Helper Functions:**
- `createFacetWithFailingInit()` - Creates facet that throws during init
- `createFacetWithAsyncError()` - Creates facet with async init error
- `createFacetManagerWithTracking()` - Creates FacetManager that tracks operations

---

## File 4: SubsystemBuilderUtilsBuildChildrenTest.jsx

**Focus:** Child building and integration scenarios

### 8. Child Subsystem Building
Tests that verify child subsystems are built correctly.

**Test Cases:**
- ✅ buildChildren() called after facet addition
- ✅ Children collected from hierarchy facet
- ✅ Children collected from parent.children (fallback)
- ✅ Children collected from Map (fallback)
- ✅ Children collected from array (fallback)
- ✅ Each child's build() called
- ✅ Children built in order
- ✅ Parent context merged into child.ctx.parent
- ✅ graphCache passed to child.ctx.graphCache
- ✅ Children not built if already built (_isBuilt)
- ✅ Handles missing children gracefully
- ✅ Handles children without build() method
- ✅ Multiple children built correctly
- ✅ Nested children built recursively

### 9. Child Context Merging
Tests that verify parent context is correctly merged into child contexts.

**Test Cases:**
- ✅ child.ctx.parent set to parent.ctx
- ✅ child.ctx.graphCache set to parent.ctx.graphCache
- ✅ Existing child.ctx properties preserved
- ✅ child.ctx created if missing
- ✅ Multiple children receive same parent context
- ✅ Nested children receive correct parent chain

### 11. Integration Scenarios
Tests that verify complete build workflows.

**Test Cases:**
- ✅ Full build workflow (verify → build)
- ✅ Build with multiple facets
- ✅ Build with facet dependencies
- ✅ Build with children
- ✅ Build with init callbacks
- ✅ Build with attachment
- ✅ Build with graphCache
- ✅ Build with complex dependency graph
- ✅ Build with nested children
- ✅ Build with multiple levels of children

### 12. Edge Cases
Tests that verify edge case handling.

**Test Cases:**
- ✅ Build with empty facet list
- ✅ Build with single facet
- ✅ Build with no children
- ✅ Build with children that have no build method
- ✅ Build with children that are already built
- ✅ Build with null children in collection
- ✅ Build with facets that have no init method
- ✅ Build with facets that have no attach flag
- ✅ Build with mixed attach flags

**Helper Functions:**
- `createChildWithBuild()` - Creates child with build method
- `createChildRegistry()` - Creates hierarchy facet with children
- `createNestedChildren()` - Creates parent with nested children
- `createMockChild()` - Creates a mock child subsystem

---

## Shared Helper Functions

These helper functions will be used across multiple test files:

1. **createMockSubsystem()** - Creates a mock subsystem with FacetManager
2. **createMockFacet()** - Creates a facet with configurable init/attach behavior
3. **createMockPlan()** - Creates a valid build plan
4. **createMockChild()** - Creates a mock child subsystem
5. **createMockFacetManager()** - Creates a FacetManager with tracking capabilities

## Test Structure

Each test file will be organized as a React component following the existing test pattern:

```javascript
export function SubsystemBuilderUtilsBuild[Plan|Facets|Transactions|Children]Test() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper functions for creating mocks
  // Test case definitions
  // Test execution functions
  // UI rendering
}
```

## Key Assertions

For each test, we'll verify:
- Correct function calls (with spies/mocks)
- Correct parameter passing
- Correct state changes
- Correct error handling
- Correct transaction behavior
- Correct child building

## Dependencies

Tests will need to mock:
- `FacetManager.addMany()`
- `Facet.init()`
- `Facet.shouldAttach()`
- `buildChildren()`
- `collectChildren()`
- Child subsystem `build()` methods

## Notes

- Tests should be isolated (each test creates fresh mocks)
- Tests should verify both success and failure paths
- Tests should verify transactional behavior (all or nothing)
- Tests should verify order of operations
- Tests should verify side effects (ctx assignment, facet attachment)
- Tests should use real FacetManager instances where possible (not fully mocked)
- Tests should verify actual behavior, not just mocks

## Test Count Summary

- **File 1 (Plan Test):** ~16 tests
- **File 2 (Facets Test):** ~26 tests
- **File 3 (Transactions Test):** ~24 tests
- **File 4 (Children Test):** ~38 tests
- **Total:** ~104 tests
