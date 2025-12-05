# BaseSubsystem Test Plan

This document outlines the test plan for the `BaseSubsystem` class, organized by functional category.

## Test Categories

### 1. Constructor Tests
- Constructor - throws error for null name
- Constructor - throws error for empty string name
- Constructor - throws error for non-string name
- Constructor - throws error for missing options.ms
- Constructor - throws error for undefined options.ms
- Constructor - accepts valid name and options
- Constructor - initializes with default values
- Constructor - initializes ctx with ms, config, and debug
- Constructor - initializes debug property (legacy)
- Constructor - initializes empty hooks array
- Constructor - creates SubsystemBuilder instance
- Constructor - creates FacetManager instance
- Constructor - initializes api object with name and __facets
- Constructor - sets coreProcessor to null initially
- Constructor - sets _isBuilt to false initially

### 2. Hierarchy Management Tests
- setParent - assigns parent subsystem
- setParent - delegates to hierarchy facet if present
- setParent - uses fallback if hierarchy facet not present
- setParent - throws error for invalid parent type
- setParent - supports method chaining
- getParent - returns parent subsystem
- getParent - delegates to hierarchy facet if present
- getParent - uses fallback if hierarchy facet not present
- getParent - returns null for root subsystem
- isRoot - returns true for root subsystem
- isRoot - returns false for child subsystem
- isRoot - delegates to hierarchy facet if present
- isRoot - uses fallback if hierarchy facet not present
- getRoot - returns root subsystem
- getRoot - traverses parent chain correctly
- getRoot - delegates to hierarchy facet if present
- getRoot - uses fallback if hierarchy facet not present
- getNameString - returns correct format for root subsystem
- getNameString - returns correct format for child subsystem
- getNameString - returns correct format for nested children
- getNameString - handles trailing slashes correctly

### 3. State Getters Tests
- isBuilt - returns false initially
- isBuilt - returns true after build
- isBuilt - returns false after dispose

### 4. Hook Registration Tests
- use - adds hook to hooks array
- use - supports method chaining
- use - throws error if subsystem already built
- use - throws error if hook is not a function
- use - allows multiple hooks
- onInit - adds callback to _initCallbacks
- onInit - supports method chaining
- onInit - throws error if callback is not a function
- onInit - allows multiple callbacks
- onDispose - adds callback to _disposeCallbacks
- onDispose - supports method chaining
- onDispose - throws error if callback is not a function
- onDispose - allows multiple callbacks

### 5. Build Lifecycle Tests
- build - sets _isBuilt to true after successful build
- build - returns same promise on concurrent calls
- build - returns immediately if already built
- build - calls SubsystemBuilder.build with context
- build - merges provided ctx with existing ctx
- build - creates graphCache if not provided
- build - uses provided graphCache
- build - inherits graphCache from parent ctx
- build - invokes all onInit callbacks after build
- build - passes api and ctx to onInit callbacks
- build - sets coreProcessor based on subsystem type
- build - sets coreProcessor to synchronous facet if isSynchronous
- build - sets coreProcessor to processor facet if not synchronous
- build - logs success message
- build - handles build errors gracefully
- build - does not set _isBuilt on error
- build - clears _buildPromise after completion

### 6. Dispose Lifecycle Tests
- dispose - sets _isBuilt to false after disposal
- dispose - returns same promise on concurrent calls
- dispose - returns immediately if not built and no build in progress
- dispose - waits for build to complete before disposing
- dispose - disposes all children
- dispose - disposes all facets
- dispose - invokes all onDispose callbacks
- dispose - handles dispose callback errors gracefully
- dispose - sets coreProcessor to null
- dispose - invalidates builder
- dispose - logs dispose message
- dispose - clears _disposePromise after completion

### 7. Message Flow Tests
- pause - delegates to scheduler facet
- pause - returns null if scheduler facet not present
- pause - supports method chaining
- resume - delegates to scheduler facet
- resume - returns null if scheduler facet not present
- resume - supports method chaining
- accept - delegates to coreProcessor.accept
- accept - throws error if coreProcessor not available
- accept - throws error if coreProcessor.accept not available
- process - delegates to scheduler.process if available
- process - falls back to coreProcessor.processTick
- process - returns null if no processor available

### 8. Routing Tests
- registerRoute - delegates to router facet
- registerRoute - throws error if router facet not present
- registerRoute - throws error if router.registerRoute not available
- unregisterRoute - delegates to router facet
- unregisterRoute - throws error if router facet not present
- unregisterRoute - throws error if router.unregisterRoute not available

### 9. Facet Access Tests
- find - delegates to api.__facets.find
- find - returns undefined for non-existent facet
- find - returns facet if present

### 10. Integration Tests
- Integration - full lifecycle (build → use → dispose)
- Integration - multiple hooks and callbacks
- Integration - hierarchical subsystem relationships
- Integration - context inheritance from parent
- Integration - graphCache sharing across hierarchy
- Integration - error handling during build
- Integration - error handling during dispose

## Test File Organization

The tests will be split into separate files by category:

1. `BaseSubsystemConstructorTest.jsx` - Constructor tests
2. `BaseSubsystemHierarchyTest.jsx` - Hierarchy management tests
3. `BaseSubsystemStateTest.jsx` - State getter tests
4. `BaseSubsystemHookRegistrationTest.jsx` - Hook registration tests
5. `BaseSubsystemBuildLifecycleTest.jsx` - Build lifecycle tests
6. `BaseSubsystemDisposeLifecycleTest.jsx` - Dispose lifecycle tests
7. `BaseSubsystemMessageFlowTest.jsx` - Message flow tests
8. `BaseSubsystemRoutingTest.jsx` - Routing tests
9. `BaseSubsystemFacetAccessTest.jsx` - Facet access tests
10. `BaseSubsystemIntegrationTest.jsx` - Integration tests

## Notes

- Tests should mock MessageSystem, FacetManager, and SubsystemBuilder where appropriate
- Tests should verify both facet-based and fallback behavior for hierarchy methods
- Tests should verify error handling and edge cases
- Tests should verify method chaining where applicable
- Tests should verify async behavior (build, dispose) correctly







