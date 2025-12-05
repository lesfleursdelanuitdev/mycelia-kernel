# Facet Contract Test Plan

This document outlines the test plan for the facet contract system, including:
- FacetContract class
- FacetContractRegistry class
- Individual contract definitions
- validateFacets integration
- Verification phase integration

## Test File Structure

### 1. FacetContractTest.jsx
Tests for the `FacetContract` class and `createFacetContract` factory function.

#### 1.1 Constructor Tests
- Constructor - creates contract with name and requirements
- Constructor - throws error for missing name
- Constructor - throws error for empty name
- Constructor - throws error for non-string name
- Constructor - throws error for invalid requirements (null)
- Constructor - throws error for invalid requirements (array)
- Constructor - accepts empty requirements object
- Constructor - accepts requiredMethods array
- Constructor - accepts requiredProperties array
- Constructor - accepts validate function
- Constructor - throws error for invalid validate (non-function, non-null)
- Constructor - handles default empty arrays for methods/properties

#### 1.2 Enforce Method Tests
- enforce - validates required methods exist
- enforce - throws error for missing required methods
- enforce - throws error for non-function methods
- enforce - validates required properties exist
- enforce - throws error for missing required properties
- enforce - throws error for undefined properties
- enforce - runs custom validate function
- enforce - throws error when custom validate fails
- enforce - throws error for null facet
- enforce - throws error for non-object facet
- enforce - includes contract name in error messages
- enforce - handles facets with no required methods/properties
- enforce - validates methods before properties
- enforce - validates properties before custom validation

#### 1.3 createFacetContract Factory Tests
- createFacetContract - creates contract with name
- createFacetContract - uses default empty arrays
- createFacetContract - accepts requiredMethods
- createFacetContract - accepts requiredProperties
- createFacetContract - accepts validate function
- createFacetContract - returns FacetContract instance

---

### 2. FacetContractRegistryTest.jsx
Tests for the `FacetContractRegistry` class.

#### 2.1 Constructor Tests
- Constructor - creates empty registry
- Constructor - initializes with no contracts

#### 2.2 Register Method Tests
- register - registers a contract
- register - returns registered contract
- register - throws error for null contract
- register - throws error for non-object contract
- register - throws error for non-FacetContract instance
- register - throws error for contract without name
- register - throws error for contract with non-string name
- register - throws error for duplicate contract name
- register - allows registering multiple different contracts
- register - stores contracts by name

#### 2.3 Has Method Tests
- has - returns true for registered contract
- has - returns false for unregistered contract
- has - returns false for non-string name
- has - returns false for empty string
- has - returns false for null/undefined

#### 2.4 Get Method Tests
- get - returns contract for registered name
- get - returns undefined for unregistered name
- get - returns undefined for non-string name
- get - returns undefined for empty string
- get - returns undefined for null/undefined

#### 2.5 Enforce Method Tests
- enforce - delegates to contract.enforce
- enforce - throws error for unregistered contract name
- enforce - throws error for non-string name
- enforce - throws error for empty string name
- enforce - passes ctx, api, subsystem, facet to contract
- enforce - propagates contract validation errors
- enforce - includes contract name in error messages

#### 2.6 Remove Method Tests
- remove - removes registered contract
- remove - returns true when contract removed
- remove - returns false when contract not found
- remove - returns false for non-string name
- remove - allows re-registering after removal

#### 2.7 List Method Tests
- list - returns array of contract names
- list - returns empty array for empty registry
- list - returns all registered contract names
- list - returns names in registration order

#### 2.8 Size Method Tests
- size - returns 0 for empty registry
- size - returns correct count after registration
- size - decreases after removal
- size - returns 0 after clear

#### 2.9 Clear Method Tests
- clear - removes all contracts
- clear - allows re-registering after clear
- clear - size returns 0 after clear
- clear - list returns empty array after clear

---

### 3. RouterContractTest.jsx
Tests for the router contract definition.

#### 3.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has required properties defined
- Contract - has custom validate function

#### 3.2 Contract Validation Tests
- enforce - passes for valid router facet
- enforce - throws error for missing required methods
- enforce - throws error for missing _routeRegistry property
- enforce - throws error for null _routeRegistry
- enforce - throws error for non-object _routeRegistry
- enforce - validates all required methods exist
- enforce - validates _routeRegistry is object

---

### 4. QueueContractTest.jsx
Tests for the queue contract definition.

#### 4.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has required properties defined
- Contract - has custom validate function

#### 4.2 Contract Validation Tests
- enforce - passes for valid queue facet
- enforce - throws error for missing required methods
- enforce - throws error for missing _queueManager property
- enforce - throws error for missing queue property
- enforce - throws error for null _queueManager
- enforce - throws error for non-object _queueManager
- enforce - throws error for _queueManager without enqueue method
- enforce - throws error for null queue property
- enforce - throws error for non-object queue property
- enforce - validates all required methods exist
- enforce - validates _queueManager is object with enqueue

---

### 5. ProcessorContractTest.jsx
Tests for the processor contract definition.

#### 5.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has no required properties
- Contract - has no custom validate function

#### 5.2 Contract Validation Tests
- enforce - passes for valid processor facet
- enforce - throws error for missing required methods
- enforce - passes with no required properties
- enforce - validates all required methods exist

---

### 6. ListenersContractTest.jsx
Tests for the listeners contract definition.

#### 6.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has required properties defined
- Contract - has custom validate function

#### 6.2 Contract Validation Tests
- enforce - passes for valid listeners facet
- enforce - throws error for missing required methods
- enforce - throws error for missing listeners property
- enforce - throws error for missing _listenerManager property
- enforce - throws error for non-function _listenerManager
- enforce - throws error for _listenerManager returning invalid value
- enforce - validates _listenerManager is function
- enforce - validates listeners property exists
- enforce - validates _listenerManager() returns object or null

---

### 7. HierarchyContractTest.jsx
Tests for the hierarchy contract definition.

#### 7.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has required properties defined
- Contract - has custom validate function

#### 7.2 Contract Validation Tests
- enforce - passes for valid hierarchy facet
- enforce - throws error for missing required methods
- enforce - throws error for missing children property
- enforce - throws error for children returning null
- enforce - throws error for children returning non-object
- enforce - validates all required methods exist
- enforce - validates children getter returns object

---

### 8. SchedulerContractTest.jsx
Tests for the scheduler contract definition.

#### 8.1 Contract Definition Tests
- Contract - has correct name
- Contract - has required methods defined
- Contract - has required properties defined
- Contract - has custom validate function

#### 8.2 Contract Validation Tests
- enforce - passes for valid scheduler facet
- enforce - throws error for missing required methods
- enforce - throws error for missing _scheduler property
- enforce - throws error for null _scheduler
- enforce - throws error for non-object _scheduler
- enforce - validates all required methods exist
- enforce - validates _scheduler is object

---

### 9. FacetContractIndexTest.jsx
Tests for the default contract registry and exports.

#### 9.1 Default Registry Tests
- defaultContractRegistry - is FacetContractRegistry instance
- defaultContractRegistry - has all standard contracts registered
- defaultContractRegistry - has router contract
- defaultContractRegistry - has queue contract
- defaultContractRegistry - has processor contract
- defaultContractRegistry - has listeners contract
- defaultContractRegistry - has hierarchy contract
- defaultContractRegistry - has scheduler contract
- defaultContractRegistry - size returns 6
- defaultContractRegistry - list returns all contract names

#### 9.2 Export Tests
- Exports - FacetContractRegistry is exported
- Exports - FacetContract is exported
- Exports - createFacetContract is exported
- Exports - routerContract is exported
- Exports - queueContract is exported
- Exports - processorContract is exported
- Exports - listenersContract is exported
- Exports - hierarchyContract is exported
- Exports - schedulerContract is exported

---

### 10. ValidateFacetsIntegrationTest.jsx
Tests for the `validateFacets` function integration in `subsystem-builder.utils.mycelia.js`.

#### 10.1 Basic Validation Tests
- validateFacets - skips facets without contracts
- validateFacets - validates facets with contracts
- validateFacets - uses defaultContractRegistry by default
- validateFacets - passes ctx, api, subsystem to contract.enforce
- validateFacets - passes facet to contract.enforce

#### 10.2 Error Handling Tests
- validateFacets - throws error for unregistered contract name
- validateFacets - includes facet kind in error message
- validateFacets - includes facet source in error message
- validateFacets - includes contract name in error message
- validateFacets - propagates contract validation errors
- validateFacets - wraps contract errors with context

#### 10.3 Contract Registry Tests
- validateFacets - accepts custom contract registry
- validateFacets - uses custom registry when provided
- validateFacets - works with empty registry
- validateFacets - works with registry containing contracts

#### 10.4 Facet Contract Detection Tests
- validateFacets - calls facet.getContract()
- validateFacets - handles facets without getContract method
- validateFacets - handles getContract returning null
- validateFacets - handles getContract returning undefined
- validateFacets - handles getContract returning empty string
- validateFacets - handles getContract returning non-string
- validateFacets - trims contract name whitespace

---

### 11. VerifySubsystemBuildIntegrationTest.jsx
Tests to ensure `verifySubsystemBuild` still works correctly with contract validation.

#### 11.1 Integration with verifySubsystemBuild
- verifySubsystemBuild - calls validateFacets
- verifySubsystemBuild - validates facets before dependency graph
- verifySubsystemBuild - validates facets after facet creation
- verifySubsystemBuild - passes resolvedCtx to validateFacets
- verifySubsystemBuild - passes subsystem to validateFacets
- verifySubsystemBuild - uses defaultContractRegistry

#### 11.2 Error Propagation Tests
- verifySubsystemBuild - propagates contract validation errors
- verifySubsystemBuild - includes facet info in error messages
- verifySubsystemBuild - fails fast on first contract error
- verifySubsystemBuild - error prevents build plan creation

#### 11.3 Facets Without Contracts Tests
- verifySubsystemBuild - works with facets without contracts
- verifySubsystemBuild - works with mixed facets (some with contracts, some without)
- verifySubsystemBuild - validates only facets with contracts

#### 11.4 Build Flow Tests
- verifySubsystemBuild - contract validation happens before dependency validation
- verifySubsystemBuild - contract validation happens after facet creation
- verifySubsystemBuild - successful validation allows build to continue
- verifySubsystemBuild - contract errors prevent dependency graph building

#### 11.5 Real-World Scenarios
- verifySubsystemBuild - validates router facet with router contract
- verifySubsystemBuild - validates queue facet with queue contract
- verifySubsystemBuild - validates processor facet with processor contract
- verifySubsystemBuild - validates listeners facet with listeners contract
- verifySubsystemBuild - validates hierarchy facet with hierarchy contract
- verifySubsystemBuild - validates scheduler facet with scheduler contract
- verifySubsystemBuild - validates multiple facets with contracts
- verifySubsystemBuild - works with custom contract registry

---

## Test Categories Summary

1. **FacetContract Class** (1 file, ~25 tests)
   - Constructor validation
   - Enforce method validation
   - Factory function

2. **FacetContractRegistry Class** (1 file, ~35 tests)
   - Registry management
   - Contract registration
   - Contract lookup and enforcement
   - Registry operations (list, size, clear, remove)

3. **Individual Contracts** (6 files, ~12-15 tests each = ~80 tests)
   - Router contract
   - Queue contract
   - Processor contract
   - Listeners contract
   - Hierarchy contract
   - Scheduler contract

4. **Default Registry** (1 file, ~15 tests)
   - Default registry initialization
   - Export verification

5. **validateFacets Integration** (1 file, ~20 tests)
   - Function behavior
   - Error handling
   - Registry integration

6. **verifySubsystemBuild Integration** (1 file, ~25 tests)
   - Integration with build process
   - Error propagation
   - Real-world scenarios

**Total: 11 test files, ~200 test cases**

---

## Test Implementation Notes

1. **Mock Objects**: Create mock facets, subsystems, APIs, and contexts for testing
2. **Error Messages**: Verify error messages include relevant context (facet kind, source, contract name)
3. **Edge Cases**: Test null/undefined/empty values, missing methods, wrong types
4. **Integration**: Ensure contract validation integrates seamlessly with existing verification phase
5. **Performance**: Contract validation should not significantly impact build performance
6. **Backward Compatibility**: Facets without contracts should continue to work as before

---

## Test Execution Order

1. Unit tests for FacetContract and FacetContractRegistry (foundation)
2. Individual contract tests (contract definitions)
3. Default registry tests (integration of contracts)
4. validateFacets integration tests (function behavior)
5. verifySubsystemBuild integration tests (end-to-end)

