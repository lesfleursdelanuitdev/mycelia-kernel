# SubsystemBuilder Test Plan

## Overview

This document outlines the test plan for the `SubsystemBuilder` class, which provides a fluent API for building subsystems with context management, plan caching, and dependency graph caching.

## Test Categories

### 1. Constructor Tests

#### 1.1 Constructor Validation
- **Test**: Constructor throws error for null subsystem
- **Test**: Constructor throws error for undefined subsystem
- **Test**: Constructor accepts valid subsystem
- **Test**: Constructor initializes with empty context
- **Test**: Constructor initializes with null plan

### 2. Context Management Tests

#### 2.1 withCtx() Method
- **Test**: withCtx() merges context (shallow merge)
- **Test**: withCtx() supports method chaining
- **Test**: withCtx() merges nested config objects (deep merge)
- **Test**: withCtx() overwrites existing context properties
- **Test**: withCtx() handles empty context object
- **Test**: withCtx() handles undefined context (defaults to {})
- **Test**: withCtx() preserves non-config properties
- **Test**: withCtx() handles multiple calls (accumulation)

#### 2.2 clearCtx() Method
- **Test**: clearCtx() clears all context
- **Test**: clearCtx() supports method chaining
- **Test**: clearCtx() resets context to empty object
- **Test**: clearCtx() after withCtx() removes all accumulated context

### 3. Plan Management Tests

#### 3.1 plan() Method
- **Test**: plan() creates plan from subsystem and context
- **Test**: plan() returns plan and graphCache
- **Test**: plan() caches plan internally
- **Test**: plan() uses subsystem.ctx.graphCache if available
- **Test**: plan() uses provided graphCache parameter
- **Test**: plan() prefers subsystem.ctx.graphCache over parameter
- **Test**: plan() returns same plan on subsequent calls (cached)
- **Test**: plan() handles null graphCache
- **Test**: plan() handles undefined graphCache
- **Test**: plan() propagates errors from verifySubsystemBuild
- **Test**: plan() includes resolvedCtx in returned plan
- **Test**: plan() includes orderedKinds in returned plan
- **Test**: plan() includes facetsByKind in returned plan
- **Test**: plan() updates graphCache in returned result

#### 3.2 dryRun() Method
- **Test**: dryRun() is alias for plan()
- **Test**: dryRun() returns same result as plan()
- **Test**: dryRun() caches plan like plan()

#### 3.3 getPlan() Method
- **Test**: getPlan() returns null when no plan cached
- **Test**: getPlan() returns cached plan after plan()
- **Test**: getPlan() returns cached plan after dryRun()
- **Test**: getPlan() returns null after invalidate()

#### 3.4 invalidate() Method
- **Test**: invalidate() clears cached plan
- **Test**: invalidate() supports method chaining
- **Test**: invalidate() allows new plan creation
- **Test**: invalidate() after plan() forces plan regeneration

### 4. Build Execution Tests

#### 4.1 build() Method
- **Test**: build() executes build using cached plan
- **Test**: build() creates plan if none cached
- **Test**: build() uses provided graphCache
- **Test**: build() uses subsystem.ctx.graphCache if available
- **Test**: build() returns subsystem instance
- **Test**: build() calls buildSubsystem with correct plan
- **Test**: build() propagates errors from plan()
- **Test**: build() propagates errors from buildSubsystem()
- **Test**: build() handles null graphCache
- **Test**: build() handles undefined graphCache
- **Test**: build() after plan() reuses cached plan
- **Test**: build() after invalidate() creates new plan

### 5. GraphCache Integration Tests

#### 5.1 GraphCache Priority
- **Test**: GraphCache from subsystem.ctx takes priority
- **Test**: GraphCache parameter used when subsystem.ctx.graphCache missing
- **Test**: GraphCache passed through plan() to verifySubsystemBuild
- **Test**: GraphCache updated in plan() return value
- **Test**: GraphCache persists across multiple plan() calls

#### 5.2 GraphCache Caching Behavior
- **Test**: GraphCache caches topological sort results
- **Test**: GraphCache reused across multiple builds
- **Test**: GraphCache shared between plan() and build()

### 6. Integration Tests

#### 6.1 Fluent API
- **Test**: Method chaining works (withCtx().plan().build())
- **Test**: Method chaining works (withCtx().clearCtx().withCtx().build())
- **Test**: Method chaining works (plan().invalidate().plan().build())

#### 6.2 Context Resolution
- **Test**: Context from withCtx() merged with subsystem.ctx
- **Test**: Context deep merges config objects
- **Test**: Context shallow merges non-config properties
- **Test**: Context resolution matches verifySubsystemBuild behavior

#### 6.3 Plan Lifecycle
- **Test**: Plan created, cached, invalidated, recreated
- **Test**: Plan cached between plan() and build()
- **Test**: Plan regenerated after invalidate() and build()

### 7. Error Handling Tests

#### 7.1 Constructor Errors
- **Test**: Constructor throws descriptive error for null
- **Test**: Constructor throws descriptive error for undefined

#### 7.2 Plan Creation Errors
- **Test**: plan() propagates hook execution errors
- **Test**: plan() propagates dependency validation errors
- **Test**: plan() propagates graph cycle errors
- **Test**: plan() error doesn't cache invalid plan

#### 7.3 Build Execution Errors
- **Test**: build() propagates plan creation errors
- **Test**: build() propagates buildSubsystem errors
- **Test**: build() error doesn't affect cached plan

### 8. Edge Cases

#### 8.1 Empty Context
- **Test**: Works with empty context object
- **Test**: Works with no context calls
- **Test**: Works with clearCtx() only

#### 8.2 Empty Subsystem
- **Test**: Works with subsystem with no hooks
- **Test**: Works with subsystem with no default hooks
- **Test**: Works with subsystem with empty hooks array

#### 8.3 GraphCache Edge Cases
- **Test**: Works without graphCache
- **Test**: Works with graphCache at capacity
- **Test**: Works with graphCache that has cached errors

## Test Structure

### Test Files (Split into 8 files):

1. **`SubsystemBuilderConstructorTest.jsx`** - Constructor validation and initialization
2. **`SubsystemBuilderContextManagementTest.jsx`** - Context management (withCtx, clearCtx)
3. **`SubsystemBuilderPlanManagementTest.jsx`** - Plan management (plan, dryRun, getPlan, invalidate)
4. **`SubsystemBuilderBuildExecutionTest.jsx`** - Build execution (build method)
5. **`SubsystemBuilderGraphCacheIntegrationTest.jsx`** - GraphCache integration and caching
6. **`SubsystemBuilderIntegrationTest.jsx`** - Fluent API, context resolution, plan lifecycle
7. **`SubsystemBuilderErrorHandlingTest.jsx`** - Error handling and propagation
8. **`SubsystemBuilderEdgeCasesTest.jsx`** - Edge cases (empty context, empty subsystem, etc.)

## Mock Requirements

### Mock Subsystem
- Must have `ctx` property (optional)
- Must have `hooks` array
- Must have `defaultHooks` (optional)
- Must have `api` with `__facets` (FacetManager)
- Must have `name` property

### Mock GraphCache
- Must implement `get(key)` and `set(key, valid, orderedKinds, error)`
- Must track cache hits/misses for testing

### Mock Hooks
- Must have `kind` property
- Must be callable functions
- Must return Facet instances
- Must have `required` array (optional)
- Must have `source` property (optional)

## Test Data

### Sample Context Objects
```javascript
const ctx1 = { ms: 'mock-ms', debug: true };
const ctx2 = { config: { queue: { maxSize: 100 } } };
const ctx3 = { config: { router: { strict: true } } };
const mergedCtx = { 
  ms: 'mock-ms', 
  debug: true,
  config: { 
    queue: { maxSize: 100 },
    router: { strict: true }
  }
};
```

### Sample Plans
```javascript
const validPlan = {
  resolvedCtx: { ms: 'mock-ms', config: {} },
  orderedKinds: ['statistics', 'queue'],
  facetsByKind: {
    statistics: mockStatisticsFacet,
    queue: mockQueueFacet
  }
};
```

## Success Criteria

1. ✅ All constructor validation tests pass
2. ✅ All context management tests pass
3. ✅ All plan management tests pass
4. ✅ All build execution tests pass
5. ✅ All GraphCache integration tests pass
6. ✅ All integration tests pass
7. ✅ All error handling tests pass
8. ✅ All edge case tests pass

## Notes

- Tests should be isolated (each test creates fresh builder instance)
- Tests should verify both return values and side effects
- Tests should verify method chaining works correctly
- Tests should verify caching behavior
- Tests should verify GraphCache priority and propagation
- Tests should match the structure of `SubsystemBuilderUtilsBuildPlanTest.jsx`

