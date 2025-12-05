import { useState } from 'react';
import { FacetContractRegistry } from '../models/facet-contract/facet-contract-registry.mycelia.js';
import { FacetContract } from '../models/facet-contract/facet-contract.mycelia.js';

/**
 * FacetContractRegistryTest - React component test suite for FacetContractRegistry class
 */
export function FacetContractRegistryTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Constructor Tests
    { name: 'Constructor - creates empty registry', category: 'Constructor' },
    { name: 'Constructor - initializes with no contracts', category: 'Constructor' },
    
    // Register Method Tests
    { name: 'register - registers a contract', category: 'Register Method' },
    { name: 'register - returns registered contract', category: 'Register Method' },
    { name: 'register - throws error for null contract', category: 'Register Method' },
    { name: 'register - throws error for non-object contract', category: 'Register Method' },
    { name: 'register - throws error for non-FacetContract instance', category: 'Register Method' },
    { name: 'register - throws error for contract without name', category: 'Register Method' },
    { name: 'register - throws error for contract with non-string name', category: 'Register Method' },
    { name: 'register - throws error for duplicate contract name', category: 'Register Method' },
    { name: 'register - allows registering multiple different contracts', category: 'Register Method' },
    { name: 'register - stores contracts by name', category: 'Register Method' },
    
    // Has Method Tests
    { name: 'has - returns true for registered contract', category: 'Has Method' },
    { name: 'has - returns false for unregistered contract', category: 'Has Method' },
    { name: 'has - returns false for non-string name', category: 'Has Method' },
    { name: 'has - returns false for empty string', category: 'Has Method' },
    { name: 'has - returns false for null/undefined', category: 'Has Method' },
    
    // Get Method Tests
    { name: 'get - returns contract for registered name', category: 'Get Method' },
    { name: 'get - returns undefined for unregistered name', category: 'Get Method' },
    { name: 'get - returns undefined for non-string name', category: 'Get Method' },
    { name: 'get - returns undefined for empty string', category: 'Get Method' },
    { name: 'get - returns undefined for null/undefined', category: 'Get Method' },
    
    // Enforce Method Tests
    { name: 'enforce - delegates to contract.enforce', category: 'Enforce Method' },
    { name: 'enforce - throws error for unregistered contract name', category: 'Enforce Method' },
    { name: 'enforce - throws error for non-string name', category: 'Enforce Method' },
    { name: 'enforce - throws error for empty string name', category: 'Enforce Method' },
    { name: 'enforce - passes ctx, api, subsystem, facet to contract', category: 'Enforce Method' },
    { name: 'enforce - propagates contract validation errors', category: 'Enforce Method' },
    { name: 'enforce - includes contract name in error messages', category: 'Enforce Method' },
    
    // Remove Method Tests
    { name: 'remove - removes registered contract', category: 'Remove Method' },
    { name: 'remove - returns true when contract removed', category: 'Remove Method' },
    { name: 'remove - returns false when contract not found', category: 'Remove Method' },
    { name: 'remove - returns false for non-string name', category: 'Remove Method' },
    { name: 'remove - allows re-registering after removal', category: 'Remove Method' },
    
    // List Method Tests
    { name: 'list - returns array of contract names', category: 'List Method' },
    { name: 'list - returns empty array for empty registry', category: 'List Method' },
    { name: 'list - returns all registered contract names', category: 'List Method' },
    { name: 'list - returns names in registration order', category: 'List Method' },
    
    // Size Method Tests
    { name: 'size - returns 0 for empty registry', category: 'Size Method' },
    { name: 'size - returns correct count after registration', category: 'Size Method' },
    { name: 'size - decreases after removal', category: 'Size Method' },
    { name: 'size - returns 0 after clear', category: 'Size Method' },
    
    // Clear Method Tests
    { name: 'clear - removes all contracts', category: 'Clear Method' },
    { name: 'clear - allows re-registering after clear', category: 'Clear Method' },
    { name: 'clear - size returns 0 after clear', category: 'Clear Method' },
    { name: 'clear - list returns empty array after clear', category: 'Clear Method' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Constructor tests
        if (testName === 'Constructor - creates empty registry') result = testConstructorCreatesEmpty();
        else if (testName === 'Constructor - initializes with no contracts') result = testConstructorInitializesEmpty();
        
        // Register method tests
        else if (testName === 'register - registers a contract') result = testRegisterRegistersContract();
        else if (testName === 'register - returns registered contract') result = testRegisterReturnsContract();
        else if (testName === 'register - throws error for null contract') result = testRegisterThrowsNull();
        else if (testName === 'register - throws error for non-object contract') result = testRegisterThrowsNonObject();
        else if (testName === 'register - throws error for non-FacetContract instance') result = testRegisterThrowsNonFacetContract();
        else if (testName === 'register - throws error for contract without name') result = testRegisterThrowsNoName();
        else if (testName === 'register - throws error for contract with non-string name') result = testRegisterThrowsNonStringName();
        else if (testName === 'register - throws error for duplicate contract name') result = testRegisterThrowsDuplicate();
        else if (testName === 'register - allows registering multiple different contracts') result = testRegisterAllowsMultiple();
        else if (testName === 'register - stores contracts by name') result = testRegisterStoresByName();
        
        // Has method tests
        else if (testName === 'has - returns true for registered contract') result = testHasReturnsTrue();
        else if (testName === 'has - returns false for unregistered contract') result = testHasReturnsFalse();
        else if (testName === 'has - returns false for non-string name') result = testHasReturnsFalseNonString();
        else if (testName === 'has - returns false for empty string') result = testHasReturnsFalseEmpty();
        else if (testName === 'has - returns false for null/undefined') result = testHasReturnsFalseNull();
        
        // Get method tests
        else if (testName === 'get - returns contract for registered name') result = testGetReturnsContract();
        else if (testName === 'get - returns undefined for unregistered name') result = testGetReturnsUndefined();
        else if (testName === 'get - returns undefined for non-string name') result = testGetReturnsUndefinedNonString();
        else if (testName === 'get - returns undefined for empty string') result = testGetReturnsUndefinedEmpty();
        else if (testName === 'get - returns undefined for null/undefined') result = testGetReturnsUndefinedNull();
        
        // Enforce method tests
        else if (testName === 'enforce - delegates to contract.enforce') result = testEnforceDelegates();
        else if (testName === 'enforce - throws error for unregistered contract name') result = testEnforceThrowsUnregistered();
        else if (testName === 'enforce - throws error for non-string name') result = testEnforceThrowsNonString();
        else if (testName === 'enforce - throws error for empty string name') result = testEnforceThrowsEmpty();
        else if (testName === 'enforce - passes ctx, api, subsystem, facet to contract') result = testEnforcePassesParams();
        else if (testName === 'enforce - propagates contract validation errors') result = testEnforcePropagatesErrors();
        else if (testName === 'enforce - includes contract name in error messages') result = testEnforceIncludesContractName();
        
        // Remove method tests
        else if (testName === 'remove - removes registered contract') result = testRemoveRemovesContract();
        else if (testName === 'remove - returns true when contract removed') result = testRemoveReturnsTrue();
        else if (testName === 'remove - returns false when contract not found') result = testRemoveReturnsFalse();
        else if (testName === 'remove - returns false for non-string name') result = testRemoveReturnsFalseNonString();
        else if (testName === 'remove - allows re-registering after removal') result = testRemoveAllowsReregister();
        
        // List method tests
        else if (testName === 'list - returns array of contract names') result = testListReturnsArray();
        else if (testName === 'list - returns empty array for empty registry') result = testListReturnsEmpty();
        else if (testName === 'list - returns all registered contract names') result = testListReturnsAll();
        else if (testName === 'list - returns names in registration order') result = testListReturnsInOrder();
        
        // Size method tests
        else if (testName === 'size - returns 0 for empty registry') result = testSizeReturnsZero();
        else if (testName === 'size - returns correct count after registration') result = testSizeReturnsCount();
        else if (testName === 'size - decreases after removal') result = testSizeDecreases();
        else if (testName === 'size - returns 0 after clear') result = testSizeReturnsZeroAfterClear();
        
        // Clear method tests
        else if (testName === 'clear - removes all contracts') result = testClearRemovesAll();
        else if (testName === 'clear - allows re-registering after clear') result = testClearAllowsReregister();
        else if (testName === 'clear - size returns 0 after clear') result = testClearSizeZero();
        else if (testName === 'clear - list returns empty array after clear') result = testClearListEmpty();
        
        else result = { success: false, error: 'Test not implemented' };

        setResults(prev => new Map(prev).set(testName, result));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          success: false,
          error: error.message || String(error)
        }));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 10);
  };

  // ========== Constructor Tests ==========

  const testConstructorCreatesEmpty = () => {
    const registry = new FacetContractRegistry();
    if (registry.size() !== 0) {
      return { success: false, error: 'Registry should be empty' };
    }
    return { success: true, message: 'Creates empty registry' };
  };

  const testConstructorInitializesEmpty = () => {
    const registry = new FacetContractRegistry();
    if (registry.list().length !== 0) {
      return { success: false, error: 'Registry should have no contracts' };
    }
    if (registry.size() !== 0) {
      return { success: false, error: 'Size should be 0' };
    }
    return { success: true, message: 'Initializes with no contracts' };
  };

  // ========== Register Method Tests ==========

  const testRegisterRegistersContract = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    if (!registry.has('test')) {
      return { success: false, error: 'Contract should be registered' };
    }
    return { success: true, message: 'Registers a contract' };
  };

  const testRegisterReturnsContract = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    const returned = registry.register(contract);
    if (returned !== contract) {
      return { success: false, error: 'Should return registered contract' };
    }
    return { success: true, message: 'Returns registered contract' };
  };

  const testRegisterThrowsNull = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.register(null);
      return { success: false, error: 'Should throw error for null contract' };
    } catch (error) {
      if (error.message.includes('contract must be an object')) {
        return { success: true, message: 'Throws error for null contract' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterThrowsNonObject = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.register('not-an-object');
      return { success: false, error: 'Should throw error for non-object contract' };
    } catch (error) {
      if (error.message.includes('contract must be an object')) {
        return { success: true, message: 'Throws error for non-object contract' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterThrowsNonFacetContract = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.register({ name: 'test' });
      return { success: false, error: 'Should throw error for non-FacetContract instance' };
    } catch (error) {
      if (error.message.includes('contract must be a FacetContract instance')) {
        return { success: true, message: 'Throws error for non-FacetContract instance' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterThrowsNoName = () => {
    const registry = new FacetContractRegistry();
    const contract = Object.create(FacetContract.prototype);
    contract.name = null;
    try {
      registry.register(contract);
      return { success: false, error: 'Should throw error for contract without name' };
    } catch (error) {
      if (error.message.includes('contract must have a string name property')) {
        return { success: true, message: 'Throws error for contract without name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterThrowsNonStringName = () => {
    const registry = new FacetContractRegistry();
    const contract = Object.create(FacetContract.prototype);
    contract.name = 123;
    try {
      registry.register(contract);
      return { success: false, error: 'Should throw error for contract with non-string name' };
    } catch (error) {
      if (error.message.includes('contract must have a string name property')) {
        return { success: true, message: 'Throws error for contract with non-string name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterThrowsDuplicate = () => {
    const registry = new FacetContractRegistry();
    const contract1 = new FacetContract('test', {});
    const contract2 = new FacetContract('test', {});
    registry.register(contract1);
    try {
      registry.register(contract2);
      return { success: false, error: 'Should throw error for duplicate contract name' };
    } catch (error) {
      if (error.message.includes('already exists')) {
        return { success: true, message: 'Throws error for duplicate contract name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterAllowsMultiple = () => {
    const registry = new FacetContractRegistry();
    const contract1 = new FacetContract('test1', {});
    const contract2 = new FacetContract('test2', {});
    registry.register(contract1);
    registry.register(contract2);
    if (!registry.has('test1') || !registry.has('test2')) {
      return { success: false, error: 'Both contracts should be registered' };
    }
    if (registry.size() !== 2) {
      return { success: false, error: 'Size should be 2' };
    }
    return { success: true, message: 'Allows registering multiple different contracts' };
  };

  const testRegisterStoresByName = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    const retrieved = registry.get('test');
    if (retrieved !== contract) {
      return { success: false, error: 'Contract should be retrievable by name' };
    }
    return { success: true, message: 'Stores contracts by name' };
  };

  // ========== Has Method Tests ==========

  const testHasReturnsTrue = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    if (!registry.has('test')) {
      return { success: false, error: 'Should return true for registered contract' };
    }
    return { success: true, message: 'Returns true for registered contract' };
  };

  const testHasReturnsFalse = () => {
    const registry = new FacetContractRegistry();
    if (registry.has('nonexistent')) {
      return { success: false, error: 'Should return false for unregistered contract' };
    }
    return { success: true, message: 'Returns false for unregistered contract' };
  };

  const testHasReturnsFalseNonString = () => {
    const registry = new FacetContractRegistry();
    if (registry.has(123)) {
      return { success: false, error: 'Should return false for non-string name' };
    }
    return { success: true, message: 'Returns false for non-string name' };
  };

  const testHasReturnsFalseEmpty = () => {
    const registry = new FacetContractRegistry();
    if (registry.has('')) {
      return { success: false, error: 'Should return false for empty string' };
    }
    return { success: true, message: 'Returns false for empty string' };
  };

  const testHasReturnsFalseNull = () => {
    const registry = new FacetContractRegistry();
    if (registry.has(null) || registry.has(undefined)) {
      return { success: false, error: 'Should return false for null/undefined' };
    }
    return { success: true, message: 'Returns false for null/undefined' };
  };

  // ========== Get Method Tests ==========

  const testGetReturnsContract = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    const retrieved = registry.get('test');
    if (retrieved !== contract) {
      return { success: false, error: 'Should return contract for registered name' };
    }
    return { success: true, message: 'Returns contract for registered name' };
  };

  const testGetReturnsUndefined = () => {
    const registry = new FacetContractRegistry();
    const retrieved = registry.get('nonexistent');
    if (retrieved !== undefined) {
      return { success: false, error: 'Should return undefined for unregistered name' };
    }
    return { success: true, message: 'Returns undefined for unregistered name' };
  };

  const testGetReturnsUndefinedNonString = () => {
    const registry = new FacetContractRegistry();
    const retrieved = registry.get(123);
    if (retrieved !== undefined) {
      return { success: false, error: 'Should return undefined for non-string name' };
    }
    return { success: true, message: 'Returns undefined for non-string name' };
  };

  const testGetReturnsUndefinedEmpty = () => {
    const registry = new FacetContractRegistry();
    const retrieved = registry.get('');
    if (retrieved !== undefined) {
      return { success: false, error: 'Should return undefined for empty string' };
    }
    return { success: true, message: 'Returns undefined for empty string' };
  };

  const testGetReturnsUndefinedNull = () => {
    const registry = new FacetContractRegistry();
    const retrieved1 = registry.get(null);
    const retrieved2 = registry.get(undefined);
    if (retrieved1 !== undefined || retrieved2 !== undefined) {
      return { success: false, error: 'Should return undefined for null/undefined' };
    }
    return { success: true, message: 'Returns undefined for null/undefined' };
  };

  // ========== Enforce Method Tests ==========

  const testEnforceDelegates = () => {
    const registry = new FacetContractRegistry();
    let enforceCalled = false;
    const contract = new FacetContract('test', {});
    // Override enforce to track calls
    contract.enforce = (ctx, api, subsystem, facet) => {
      enforceCalled = true;
    };
    registry.register(contract);
    const facet = {};
    registry.enforce('test', {}, {}, {}, facet);
    if (!enforceCalled) {
      return { success: false, error: 'Should delegate to contract.enforce' };
    }
    return { success: true, message: 'Delegates to contract.enforce' };
  };

  const testEnforceThrowsUnregistered = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.enforce('nonexistent', {}, {}, {}, {});
      return { success: false, error: 'Should throw error for unregistered contract name' };
    } catch (error) {
      if (error.message.includes('no contract found')) {
        return { success: true, message: 'Throws error for unregistered contract name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonString = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.enforce(123, {}, {}, {}, {});
      return { success: false, error: 'Should throw error for non-string name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for non-string name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsEmpty = () => {
    const registry = new FacetContractRegistry();
    try {
      registry.enforce('', {}, {}, {}, {});
      return { success: false, error: 'Should throw error for empty string name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty string name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforcePassesParams = () => {
    const registry = new FacetContractRegistry();
    let receivedCtx, receivedApi, receivedSubsystem, receivedFacet;
    const contract = new FacetContract('test', {});
    contract.enforce = (ctx, api, subsystem, facet) => {
      receivedCtx = ctx;
      receivedApi = api;
      receivedSubsystem = subsystem;
      receivedFacet = facet;
    };
    registry.register(contract);
    const ctx = { config: {} };
    const api = { __facets: {} };
    const subsystem = { name: 'test' };
    const facet = { method1: () => {} };
    registry.enforce('test', ctx, api, subsystem, facet);
    if (receivedCtx !== ctx || receivedApi !== api || receivedSubsystem !== subsystem || receivedFacet !== facet) {
      return { success: false, error: 'Should pass all parameters to contract.enforce' };
    }
    return { success: true, message: 'Passes ctx, api, subsystem, facet to contract' };
  };

  const testEnforcePropagatesErrors = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {
      requiredMethods: ['method1']
    });
    registry.register(contract);
    const facet = {}; // Missing method1
    try {
      registry.enforce('test', {}, {}, {}, facet);
      return { success: false, error: 'Should propagate contract validation errors' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Propagates contract validation errors' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceIncludesContractName = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('my-contract', {
      requiredMethods: ['method1']
    });
    registry.register(contract);
    const facet = {}; // Missing method1
    try {
      registry.enforce('my-contract', {}, {}, {}, facet);
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes("'my-contract'")) {
        return { success: true, message: 'Includes contract name in error messages' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  // ========== Remove Method Tests ==========

  const testRemoveRemovesContract = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    registry.remove('test');
    if (registry.has('test')) {
      return { success: false, error: 'Contract should be removed' };
    }
    return { success: true, message: 'Removes registered contract' };
  };

  const testRemoveReturnsTrue = () => {
    const registry = new FacetContractRegistry();
    const contract = new FacetContract('test', {});
    registry.register(contract);
    const result = registry.remove('test');
    if (result !== true) {
      return { success: false, error: 'Should return true when contract removed' };
    }
    return { success: true, message: 'Returns true when contract removed' };
  };

  const testRemoveReturnsFalse = () => {
    const registry = new FacetContractRegistry();
    const result = registry.remove('nonexistent');
    if (result !== false) {
      return { success: false, error: 'Should return false when contract not found' };
    }
    return { success: true, message: 'Returns false when contract not found' };
  };

  const testRemoveReturnsFalseNonString = () => {
    const registry = new FacetContractRegistry();
    const result = registry.remove(123);
    if (result !== false) {
      return { success: false, error: 'Should return false for non-string name' };
    }
    return { success: true, message: 'Returns false for non-string name' };
  };

  const testRemoveAllowsReregister = () => {
    const registry = new FacetContractRegistry();
    const contract1 = new FacetContract('test', {});
    registry.register(contract1);
    registry.remove('test');
    const contract2 = new FacetContract('test', {});
    registry.register(contract2);
    if (!registry.has('test')) {
      return { success: false, error: 'Should allow re-registering after removal' };
    }
    return { success: true, message: 'Allows re-registering after removal' };
  };

  // ========== List Method Tests ==========

  const testListReturnsArray = () => {
    const registry = new FacetContractRegistry();
    const list = registry.list();
    if (!Array.isArray(list)) {
      return { success: false, error: 'Should return an array' };
    }
    return { success: true, message: 'Returns array of contract names' };
  };

  const testListReturnsEmpty = () => {
    const registry = new FacetContractRegistry();
    const list = registry.list();
    if (list.length !== 0) {
      return { success: false, error: 'Should return empty array for empty registry' };
    }
    return { success: true, message: 'Returns empty array for empty registry' };
  };

  const testListReturnsAll = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.register(new FacetContract('test3', {}));
    const list = registry.list();
    if (list.length !== 3) {
      return { success: false, error: 'Should return all registered contract names' };
    }
    if (!list.includes('test1') || !list.includes('test2') || !list.includes('test3')) {
      return { success: false, error: 'Should include all registered names' };
    }
    return { success: true, message: 'Returns all registered contract names' };
  };

  const testListReturnsInOrder = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.register(new FacetContract('test3', {}));
    const list = registry.list();
    // Note: Map iteration order is insertion order in ES6+
    if (list[0] !== 'test1' || list[1] !== 'test2' || list[2] !== 'test3') {
      return { success: false, error: 'Should return names in registration order' };
    }
    return { success: true, message: 'Returns names in registration order' };
  };

  // ========== Size Method Tests ==========

  const testSizeReturnsZero = () => {
    const registry = new FacetContractRegistry();
    if (registry.size() !== 0) {
      return { success: false, error: 'Should return 0 for empty registry' };
    }
    return { success: true, message: 'Returns 0 for empty registry' };
  };

  const testSizeReturnsCount = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    if (registry.size() !== 2) {
      return { success: false, error: 'Should return correct count after registration' };
    }
    return { success: true, message: 'Returns correct count after registration' };
  };

  const testSizeDecreases = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    const sizeBefore = registry.size();
    registry.remove('test1');
    const sizeAfter = registry.size();
    if (sizeAfter !== sizeBefore - 1) {
      return { success: false, error: 'Size should decrease after removal' };
    }
    return { success: true, message: 'Decreases after removal' };
  };

  const testSizeReturnsZeroAfterClear = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.clear();
    if (registry.size() !== 0) {
      return { success: false, error: 'Size should return 0 after clear' };
    }
    return { success: true, message: 'Returns 0 after clear' };
  };

  // ========== Clear Method Tests ==========

  const testClearRemovesAll = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.clear();
    if (registry.has('test1') || registry.has('test2')) {
      return { success: false, error: 'Should remove all contracts' };
    }
    return { success: true, message: 'Removes all contracts' };
  };

  const testClearAllowsReregister = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test', {}));
    registry.clear();
    registry.register(new FacetContract('test', {}));
    if (!registry.has('test')) {
      return { success: false, error: 'Should allow re-registering after clear' };
    }
    return { success: true, message: 'Allows re-registering after clear' };
  };

  const testClearSizeZero = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.clear();
    if (registry.size() !== 0) {
      return { success: false, error: 'Size should return 0 after clear' };
    }
    return { success: true, message: 'Size returns 0 after clear' };
  };

  const testClearListEmpty = () => {
    const registry = new FacetContractRegistry();
    registry.register(new FacetContract('test1', {}));
    registry.register(new FacetContract('test2', {}));
    registry.clear();
    const list = registry.list();
    if (list.length !== 0) {
      return { success: false, error: 'List should return empty array after clear' };
    }
    return { success: true, message: 'List returns empty array after clear' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>FacetContractRegistry Tests</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            testCases.forEach(t => {
              if (!results.has(t.name) && !runningTests.has(t.name)) {
                runTest(t.name);
              }
            });
          }}
          disabled={runningTests.size > 0}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Run All Tests
        </button>
        <button
          onClick={() => setResults(new Map())}
          style={{ padding: '8px 16px' }}
        >
          Clear Results
        </button>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '30px' }}>
          <h3>{category}</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              const hasResult = results.has(test.name);
              
              return (
                <div
                  key={test.name}
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: isRunning ? '#fff3cd' : hasResult ? (result.success ? '#d4edda' : '#f8d7da') : '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTest(selectedTest === test.name ? null : test.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{test.name}</span>
                    <div>
                      {isRunning && <span style={{ color: '#856404' }}>Running...</span>}
                      {hasResult && !isRunning && (
                        <span style={{ color: result.success ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                          {result.success ? '✓' : '✗'}
                        </span>
                      )}
                      {!hasResult && !isRunning && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runTest(test.name);
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Run
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedTest === test.name && result && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
                      {result.message && <div><strong>Message:</strong> {result.message}</div>}
                      {result.error && <div style={{ color: '#721c24' }}><strong>Error:</strong> {result.error}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}







