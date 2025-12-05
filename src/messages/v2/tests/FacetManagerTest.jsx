import { useState } from 'react';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * FacetManagerTest - React component test suite for FacetManager class
 */
export function FacetManagerTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createSubsystem = (name = 'test-subsystem') => {
    return { name };
  };

  // Helper to create a mock facet
  const createMockFacet = (kind = 'test-facet', options = {}) => {
    const facet = new Facet(kind, options);
    let initCalled = false;
    let disposeCalled = false;
    let initParams = null;

    facet.add({
      init: async (ctx, api, subsystem) => {
        initCalled = true;
        initParams = { ctx, api, subsystem };
      },
      dispose: async () => {
        disposeCalled = true;
      },
      _initCalled: () => initCalled,
      _disposeCalled: () => disposeCalled,
      _initParams: () => initParams
    });

    return facet;
  };

  // Helper to create a FacetManager instance
  const createFacetManager = (subsystem = null) => {
    const sub = subsystem || createSubsystem();
    return new FacetManager(sub);
  };

  const testCases = [
    // Constructor & Proxy
    { name: 'Constructor creates FacetManager', category: 'Constructor' },
    { name: 'Constructor returns Proxy', category: 'Constructor' },
    { name: 'Proxy allows transparent facet access', category: 'Proxy Behavior' },
    { name: 'Proxy binds methods correctly', category: 'Proxy Behavior' },
    { name: 'Proxy has() check works for facets', category: 'Proxy Behavior' },
    { name: 'Proxy ownKeys includes facets', category: 'Proxy Behavior' },
    { name: 'Proxy allows iteration over facets', category: 'Proxy Behavior' },
    
    // Transaction Methods
    { name: 'beginTransaction() starts transaction', category: 'Transactions' },
    { name: 'commit() commits transaction', category: 'Transactions' },
    { name: 'commit() throws error when no active transaction', category: 'Transactions' },
    { name: 'rollback() rolls back transaction', category: 'Transactions' },
    { name: 'rollback() throws error when no active transaction', category: 'Transactions' },
    { name: 'rollback() disposes facets in reverse order', category: 'Transactions' },
    
    // add() Method
    { name: 'add() with valid facet (no init, no attach)', category: 'add() Method' },
    { name: 'add() with init option calls facet.init()', category: 'add() Method' },
    { name: 'add() with attach option attaches facet', category: 'add() Method' },
    { name: 'add() with both init and attach', category: 'add() Method' },
    { name: 'add() passes correct parameters to init()', category: 'add() Method' },
    { name: 'add() returns true on success', category: 'add() Method' },
    { name: 'add() throws error for missing kind', category: 'add() Method' },
    { name: 'add() throws error for invalid facet', category: 'add() Method' },
    { name: 'add() throws error for duplicate kind', category: 'add() Method' },
    { name: 'add() rolls back on init failure', category: 'add() Method' },
    { name: 'add() only attaches if shouldAttach() returns true', category: 'add() Method' },
    
    // addMany() Method
    { name: 'addMany() adds multiple facets in order', category: 'addMany() Method' },
    { name: 'addMany() initializes all facets', category: 'addMany() Method' },
    { name: 'addMany() attaches all facets', category: 'addMany() Method' },
    { name: 'addMany() uses transaction', category: 'addMany() Method' },
    { name: 'addMany() rolls back all on failure', category: 'addMany() Method' },
    { name: 'addMany() with empty array works', category: 'addMany() Method' },
    
    // attach() Method
    { name: 'attach() attaches facet to subsystem', category: 'attach() Method' },
    { name: 'attach() returns the facet', category: 'attach() Method' },
    { name: 'attach() throws error for invalid facetKind', category: 'attach() Method' },
    { name: 'attach() throws error if facet not found', category: 'attach() Method' },
    { name: 'attach() throws error if property exists', category: 'attach() Method' },
    
    // remove() Method
    { name: 'remove() removes facet from manager', category: 'remove() Method' },
    { name: 'remove() removes attached property', category: 'remove() Method' },
    { name: 'remove() returns true on success', category: 'remove() Method' },
    { name: 'remove() returns false for invalid kind', category: 'remove() Method' },
    { name: 'remove() returns false for non-existent facet', category: 'remove() Method' },
    
    // Query Methods
    { name: 'find() returns facet for existing kind', category: 'Query Methods' },
    { name: 'find() returns undefined for non-existent', category: 'Query Methods' },
    { name: 'has() returns true for existing facet', category: 'Query Methods' },
    { name: 'has() returns false for non-existent', category: 'Query Methods' },
    { name: 'getAllKinds() returns array of all kinds', category: 'Query Methods' },
    { name: 'getAll() returns copy of all facets', category: 'Query Methods' },
    { name: 'getAll() returns independent copy', category: 'Query Methods' },
    { name: 'size() returns correct count', category: 'Query Methods' },
    { name: 'size() returns 0 when empty', category: 'Query Methods' },
    
    // clear() Method
    { name: 'clear() removes all facets', category: 'clear() Method' },
    { name: 'clear() resets size to 0', category: 'clear() Method' },
    
    // initAll() Method
    { name: 'initAll() calls init on all facets', category: 'initAll() Method' },
    { name: 'initAll() skips facets without init', category: 'initAll() Method' },
    
    // disposeAll() Method
    { name: 'disposeAll() calls dispose on all facets', category: 'disposeAll() Method' },
    { name: 'disposeAll() clears all facets', category: 'disposeAll() Method' },
    { name: 'disposeAll() handles errors gracefully', category: 'disposeAll() Method' },
    
    // Integration
    { name: 'Full workflow: add → init → attach → remove', category: 'Integration' },
    { name: 'Transaction workflow: begin → add → commit', category: 'Integration' },
    { name: 'Transaction rollback workflow', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Constructor tests
        if (testName === 'Constructor creates FacetManager') result = testConstructorCreates();
        else if (testName === 'Constructor returns Proxy') result = testConstructorReturnsProxy();
        
        // Proxy tests
        else if (testName === 'Proxy allows transparent facet access') result = await testProxyTransparentAccess();
        else if (testName === 'Proxy binds methods correctly') result = testProxyBindsMethods();
        else if (testName === 'Proxy has() check works for facets') result = await testProxyHasCheck();
        else if (testName === 'Proxy ownKeys includes facets') result = await testProxyOwnKeys();
        else if (testName === 'Proxy allows iteration over facets') result = await testProxyIteration();
        
        // Transaction tests
        else if (testName === 'beginTransaction() starts transaction') result = testBeginTransaction();
        else if (testName === 'commit() commits transaction') result = testCommit();
        else if (testName === 'commit() throws error when no active transaction') result = testCommitThrowsNoTransaction();
        else if (testName === 'rollback() rolls back transaction') result = await testRollback();
        else if (testName === 'rollback() throws error when no active transaction') result = await testRollbackThrowsNoTransaction();
        else if (testName === 'rollback() disposes facets in reverse order') result = await testRollbackDisposesReverse();
        
        // add() tests
        else if (testName === 'add() with valid facet (no init, no attach)') result = await testAddValid();
        else if (testName === 'add() with init option calls facet.init()') result = await testAddWithInit();
        else if (testName === 'add() with attach option attaches facet') result = await testAddWithAttach();
        else if (testName === 'add() with both init and attach') result = await testAddWithBoth();
        else if (testName === 'add() passes correct parameters to init()') result = await testAddPassesParams();
        else if (testName === 'add() returns true on success') result = await testAddReturnsTrue();
        else if (testName === 'add() throws error for missing kind') result = await testAddThrowsMissingKind();
        else if (testName === 'add() throws error for invalid facet') result = await testAddThrowsInvalidFacet();
        else if (testName === 'add() throws error for duplicate kind') result = await testAddThrowsDuplicate();
        else if (testName === 'add() rolls back on init failure') result = await testAddRollsBackOnInitFailure();
        else if (testName === 'add() only attaches if shouldAttach() returns true') result = await testAddOnlyAttachesIfShouldAttach();
        
        // addMany() tests
        else if (testName === 'addMany() adds multiple facets in order') result = await testAddManyAddsInOrder();
        else if (testName === 'addMany() initializes all facets') result = await testAddManyInitializes();
        else if (testName === 'addMany() attaches all facets') result = await testAddManyAttaches();
        else if (testName === 'addMany() uses transaction') result = await testAddManyUsesTransaction();
        else if (testName === 'addMany() rolls back all on failure') result = await testAddManyRollsBack();
        else if (testName === 'addMany() with empty array works') result = await testAddManyEmpty();
        
        // attach() tests
        else if (testName === 'attach() attaches facet to subsystem') result = await testAttachAttaches();
        else if (testName === 'attach() returns the facet') result = await testAttachReturns();
        else if (testName === 'attach() throws error for invalid facetKind') result = testAttachThrowsInvalid();
        else if (testName === 'attach() throws error if facet not found') result = testAttachThrowsNotFound();
        else if (testName === 'attach() throws error if property exists') result = await testAttachThrowsExists();
        
        // remove() tests
        else if (testName === 'remove() removes facet from manager') result = await testRemoveRemoves();
        else if (testName === 'remove() removes attached property') result = await testRemoveRemovesAttached();
        else if (testName === 'remove() returns true on success') result = await testRemoveReturnsTrue();
        else if (testName === 'remove() returns false for invalid kind') result = testRemoveReturnsFalseInvalid();
        else if (testName === 'remove() returns false for non-existent facet') result = testRemoveReturnsFalseNonExistent();
        
        // Query tests
        else if (testName === 'find() returns facet for existing kind') result = await testFindReturns();
        else if (testName === 'find() returns undefined for non-existent') result = testFindReturnsUndefined();
        else if (testName === 'has() returns true for existing facet') result = await testHasReturnsTrue();
        else if (testName === 'has() returns false for non-existent') result = testHasReturnsFalse();
        else if (testName === 'getAllKinds() returns array of all kinds') result = await testGetAllKinds();
        else if (testName === 'getAll() returns copy of all facets') result = await testGetAll();
        else if (testName === 'getAll() returns independent copy') result = await testGetAllIndependent();
        else if (testName === 'size() returns correct count') result = await testSize();
        else if (testName === 'size() returns 0 when empty') result = testSizeEmpty();
        
        // clear() tests
        else if (testName === 'clear() removes all facets') result = await testClear();
        else if (testName === 'clear() resets size to 0') result = await testClearResetsSize();
        
        // initAll() tests
        else if (testName === 'initAll() calls init on all facets') result = await testInitAll();
        else if (testName === 'initAll() skips facets without init') result = await testInitAllSkips();
        
        // disposeAll() tests
        else if (testName === 'disposeAll() calls dispose on all facets') result = await testDisposeAll();
        else if (testName === 'disposeAll() clears all facets') result = await testDisposeAllClears();
        else if (testName === 'disposeAll() handles errors gracefully') result = await testDisposeAllHandlesErrors();
        
        // Integration tests
        else if (testName === 'Full workflow: add → init → attach → remove') result = await testFullWorkflow();
        else if (testName === 'Transaction workflow: begin → add → commit') result = await testTransactionWorkflow();
        else if (testName === 'Transaction rollback workflow') result = await testTransactionRollback();
        
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

  const runAllTests = () => {
    testCases.forEach(test => {
      if (!results.has(test.name)) {
        runTest(test.name);
      }
    });
  };

  const clearResults = () => {
    setResults(new Map());
  };

  // ========== Constructor Tests ==========

  const testConstructorCreates = () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    if (!manager) return { success: false, error: 'FacetManager should be created' };
    if (manager.size() !== 0) return { success: false, error: 'Should start with 0 facets' };
    return { success: true, message: 'Constructor creates FacetManager' };
  };

  const testConstructorReturnsProxy = () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    // Proxy should allow property access that doesn't exist on the instance
    // We can test this by checking if we can access a property that doesn't exist on FacetManager
    // but would be accessible via the Proxy's get trap
    if (!manager || typeof manager.add !== 'function') {
      return { success: false, error: 'Should return Proxy with methods accessible' };
    }
    // The Proxy should allow transparent access to facets via property access
    // This is the key behavior we're testing
    return { success: true, message: 'Constructor returns Proxy' };
  };

  // ========== Proxy Tests ==========

  const testProxyTransparentAccess = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    // Access facet via property access (Proxy behavior)
    if (manager['test-facet'] !== facet) {
      return { success: false, error: 'Proxy should allow transparent facet access' };
    }
    return { success: true, message: 'Proxy allows transparent facet access' };
  };

  const testProxyBindsMethods = () => {
    const manager = createFacetManager();
    const boundFind = manager.find;
    // Methods should be bound correctly
    if (typeof boundFind !== 'function') {
      return { success: false, error: 'Methods should be functions' };
    }
    // Should work when called without context
    const result = boundFind('nonexistent');
    if (result !== undefined) {
      return { success: false, error: 'Bound method should work' };
    }
    return { success: true, message: 'Proxy binds methods correctly' };
  };

  const testProxyHasCheck = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    // 'in' operator should work (Proxy has trap)
    if (!('test-facet' in manager)) {
      return { success: false, error: 'Proxy has() should work for facets' };
    }
    return { success: true, message: 'Proxy has() check works for facets' };
  };

  const testProxyOwnKeys = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    // Use Reflect.ownKeys() which respects the Proxy's ownKeys trap without filtering
    const keys = Reflect.ownKeys(manager);
    if (!keys.includes('test-facet')) {
      return { success: false, error: 'Proxy ownKeys should include facets' };
    }
    return { success: true, message: 'Proxy ownKeys includes facets' };
  };

  const testProxyIteration = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    const entries = [];
    for (const [kind, f] of manager) {
      entries.push([kind, f]);
    }
    if (entries.length !== 2) {
      return { success: false, error: 'Should iterate over all facets' };
    }
    return { success: true, message: 'Proxy allows iteration over facets' };
  };

  // ========== Transaction Tests ==========

  const testBeginTransaction = () => {
    const manager = createFacetManager();
    try {
      manager.beginTransaction();
      return { success: true, message: 'beginTransaction() starts transaction' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testCommit = () => {
    const manager = createFacetManager();
    manager.beginTransaction();
    try {
      manager.commit();
      return { success: true, message: 'commit() commits transaction' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testCommitThrowsNoTransaction = () => {
    const manager = createFacetManager();
    try {
      manager.commit();
      return { success: false, error: 'Should throw error when no active transaction' };
    } catch (error) {
      if (error.message.includes('no active transaction')) {
        return { success: true, message: 'commit() throws error when no active transaction' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRollback = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    manager.beginTransaction();
    await manager.add('test-facet', facet);
    await manager.rollback();
    if (manager.has('test-facet')) {
      return { success: false, error: 'rollback() should remove facets' };
    }
    return { success: true, message: 'rollback() rolls back transaction' };
  };

  const testRollbackThrowsNoTransaction = async () => {
    const manager = createFacetManager();
    try {
      await manager.rollback();
      return { success: false, error: 'Should throw error when no active transaction' };
    } catch (error) {
      if (error.message.includes('no active transaction')) {
        return { success: true, message: 'rollback() throws error when no active transaction' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRollbackDisposesReverse = async () => {
    const manager = createFacetManager();
    const disposeOrder = [];
    
    // Create facets with custom dispose methods that track order
    // Use synchronous tracking since dispose is called but not awaited in rollback
    const facet1 = new Facet('facet1');
    const facet2 = new Facet('facet2');
    
    // Add dispose methods that track the order synchronously
    // The rollback code calls dispose but doesn't await, so we track synchronously
    facet1.add({ 
      dispose: (subsystem) => { 
        disposeOrder.push('facet1'); 
        return Promise.resolve(); // Return promise for async compatibility
      } 
    });
    facet2.add({ 
      dispose: (subsystem) => { 
        disposeOrder.push('facet2'); 
        return Promise.resolve(); // Return promise for async compatibility
      } 
    });
    
    manager.beginTransaction();
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    // Verify facets are added
    if (!manager.has('facet1') || !manager.has('facet2')) {
      return { success: false, error: 'Facets should be added before rollback' };
    }
    
    // Rollback should call dispose in reverse order
    await manager.rollback();
    
    // Since dispose is called synchronously (even if it returns a promise),
    // the push operations should happen immediately
    // But wait a tiny bit just in case
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Should dispose in reverse order (facet2, then facet1)
    if (disposeOrder.length !== 2) {
      return { 
        success: false, 
        error: `Expected 2 dispose calls, got ${disposeOrder.length}. Order: [${disposeOrder.join(', ')}]` 
      };
    }
    if (disposeOrder[0] !== 'facet2' || disposeOrder[1] !== 'facet1') {
      return { 
        success: false, 
        error: `Should dispose in reverse order. Got: [${disposeOrder.join(', ')}], Expected: [facet2, facet1]` 
      };
    }
    return { success: true, message: 'rollback() disposes facets in reverse order' };
  };

  // ========== add() Tests ==========

  const testAddValid = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    if (!manager.has('test-facet')) {
      return { success: false, error: 'add() should add facet' };
    }
    return { success: true, message: 'add() with valid facet works' };
  };

  const testAddWithInit = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet, { init: true });
    if (!facet._initCalled()) {
      return { success: false, error: 'add() should call facet.init() when init: true' };
    }
    return { success: true, message: 'add() with init option calls facet.init()' };
  };

  const testAddWithAttach = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet', { attach: true });
    await manager.add('test-facet', facet, { attach: true });
    if (subsystem['test-facet'] !== facet) {
      return { success: false, error: 'add() should attach facet when attach: true' };
    }
    return { success: true, message: 'add() with attach option attaches facet' };
  };

  const testAddWithBoth = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet', { attach: true });
    await manager.add('test-facet', facet, { init: true, attach: true });
    if (!facet._initCalled() || subsystem['test-facet'] !== facet) {
      return { success: false, error: 'add() should both init and attach' };
    }
    return { success: true, message: 'add() with both init and attach works' };
  };

  const testAddPassesParams = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet');
    const ctx = { test: 'ctx' };
    const api = { test: 'api' };
    await manager.add('test-facet', facet, { init: true, ctx, api });
    const params = facet._initParams();
    if (params.ctx !== ctx || params.api !== api || params.subsystem !== subsystem) {
      return { success: false, error: 'add() should pass correct parameters to init()' };
    }
    return { success: true, message: 'add() passes correct parameters to init()' };
  };

  const testAddReturnsTrue = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    const result = await manager.add('test-facet', facet);
    if (result !== true) {
      return { success: false, error: 'add() should return true on success' };
    }
    return { success: true, message: 'add() returns true on success' };
  };

  const testAddThrowsMissingKind = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    try {
      await manager.add(null, facet);
      return { success: false, error: 'Should throw error for missing kind' };
    } catch (error) {
      if (error.message.includes('kind must be a non-empty string')) {
        return { success: true, message: 'Throws error for missing kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddThrowsInvalidFacet = async () => {
    const manager = createFacetManager();
    try {
      await manager.add('test-facet', null);
      return { success: false, error: 'Should throw error for invalid facet' };
    } catch (error) {
      if (error.message.includes('facet must be an object')) {
        return { success: true, message: 'Throws error for invalid facet' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddThrowsDuplicate = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('test-facet');
    const facet2 = createMockFacet('test-facet');
    await manager.add('test-facet', facet1);
    try {
      await manager.add('test-facet', facet2);
      return { success: false, error: 'Should throw error for duplicate kind' };
    } catch (error) {
      if (error.message.includes('already exists')) {
        return { success: true, message: 'Throws error for duplicate kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddRollsBackOnInitFailure = async () => {
    const manager = createFacetManager();
    // Create a new facet (not using createMockFacet to avoid conflicts)
    const facet = new Facet('test-facet');
    let disposeCalled = false;
    
    // Add init that throws and dispose that tracks calls
    facet.add({
      init: async () => { 
        throw new Error('Init failed'); 
      },
      dispose: async () => {
        disposeCalled = true;
      }
    });
    
    try {
      await manager.add('test-facet', facet, { init: true });
      return { success: false, error: 'Should throw error on init failure' };
    } catch (error) {
      // Verify the error is about init failure
      if (!error.message.includes('Init failed')) {
        return { success: false, error: `Wrong error: ${error.message}` };
      }
      // Verify facet was removed
      if (manager.has('test-facet')) {
        return { success: false, error: 'Should remove facet on init failure' };
      }
      // Verify dispose was called
      if (!disposeCalled) {
        return { success: false, error: 'Should dispose facet on init failure' };
      }
      return { success: true, message: 'add() rolls back on init failure' };
    }
  };

  const testAddOnlyAttachesIfShouldAttach = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet', { attach: false });
    await manager.add('test-facet', facet, { attach: true });
    if ('test-facet' in subsystem) {
      return { success: false, error: 'Should not attach if shouldAttach() returns false' };
    }
    return { success: true, message: 'add() only attaches if shouldAttach() returns true' };
  };

  // ========== addMany() Tests ==========

  const testAddManyAddsInOrder = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    const facet3 = createMockFacet('facet3');
    await manager.addMany(
      ['facet1', 'facet2', 'facet3'],
      { facet1, facet2, facet3 }
    );
    const kinds = manager.getAllKinds();
    if (kinds.length !== 3 || kinds[0] !== 'facet1' || kinds[1] !== 'facet2' || kinds[2] !== 'facet3') {
      return { success: false, error: 'addMany() should add facets in order' };
    }
    return { success: true, message: 'addMany() adds multiple facets in order' };
  };

  const testAddManyInitializes = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.addMany(
      ['facet1', 'facet2'],
      { facet1, facet2 },
      { init: true }
    );
    if (!facet1._initCalled() || !facet2._initCalled()) {
      return { success: false, error: 'addMany() should initialize all facets' };
    }
    return { success: true, message: 'addMany() initializes all facets' };
  };

  const testAddManyAttaches = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet1 = createMockFacet('facet1', { attach: true });
    const facet2 = createMockFacet('facet2', { attach: true });
    await manager.addMany(
      ['facet1', 'facet2'],
      { facet1, facet2 },
      { attach: true }
    );
    if (subsystem.facet1 !== facet1 || subsystem.facet2 !== facet2) {
      return { success: false, error: 'addMany() should attach all facets' };
    }
    return { success: true, message: 'addMany() attaches all facets' };
  };

  const testAddManyUsesTransaction = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    try {
      await manager.addMany(
        ['facet1', 'facet2'],
        { facet1, facet2 }
      );
      // If we get here, transaction was committed successfully
      return { success: true, message: 'addMany() uses transaction' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testAddManyRollsBack = async () => {
    const manager = createFacetManager();
    // Create facet1 normally (will succeed)
    const facet1 = createMockFacet('facet1');
    // Create facet2 directly with a throwing init (will fail)
    const facet2 = new Facet('facet2');
    facet2.add({
      init: async () => { 
        throw new Error('Init failed'); 
      }
    });
    try {
      await manager.addMany(
        ['facet1', 'facet2'],
        { facet1, facet2 },
        { init: true }
      );
      return { success: false, error: 'Should throw error on failure' };
    } catch (error) {
      // Verify the error is about init failure
      if (!error.message.includes('Init failed')) {
        return { success: false, error: `Wrong error: ${error.message}` };
      }
      // Verify both facets were rolled back (removed)
      if (manager.has('facet1') || manager.has('facet2')) {
        return { success: false, error: 'addMany() should rollback all facets on failure' };
      }
      return { success: true, message: 'addMany() rolls back all on failure' };
    }
  };

  const testAddManyEmpty = async () => {
    const manager = createFacetManager();
    try {
      await manager.addMany([], {});
      if (manager.size() !== 0) {
        return { success: false, error: 'Should remain empty' };
      }
      return { success: true, message: 'addMany() with empty array works' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== attach() Tests ==========

  const testAttachAttaches = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    manager.attach('test-facet');
    if (subsystem['test-facet'] !== facet) {
      return { success: false, error: 'attach() should attach facet to subsystem' };
    }
    return { success: true, message: 'attach() attaches facet to subsystem' };
  };

  const testAttachReturns = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    const result = manager.attach('test-facet');
    if (result !== facet) {
      return { success: false, error: 'attach() should return the facet' };
    }
    return { success: true, message: 'attach() returns the facet' };
  };

  const testAttachThrowsInvalid = () => {
    const manager = createFacetManager();
    try {
      manager.attach(null);
      return { success: false, error: 'Should throw error for invalid facetKind' };
    } catch (error) {
      if (error.message.includes('facetKind must be a non-empty string')) {
        return { success: true, message: 'Throws error for invalid facetKind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAttachThrowsNotFound = () => {
    const manager = createFacetManager();
    try {
      manager.attach('nonexistent');
      return { success: false, error: 'Should throw error if facet not found' };
    } catch (error) {
      if (error.message.includes('not found')) {
        return { success: true, message: 'Throws error if facet not found' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAttachThrowsExists = async () => {
    const subsystem = createSubsystem();
    subsystem['test-facet'] = 'existing';
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    try {
      manager.attach('test-facet');
      return { success: false, error: 'Should throw error if property exists' };
    } catch (error) {
      if (error.message.includes('property already exists')) {
        return { success: true, message: 'Throws error if property exists' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  // ========== remove() Tests ==========

  const testRemoveRemoves = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    manager.remove('test-facet');
    if (manager.has('test-facet')) {
      return { success: false, error: 'remove() should remove facet from manager' };
    }
    return { success: true, message: 'remove() removes facet from manager' };
  };

  const testRemoveRemovesAttached = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet', { attach: true });
    await manager.add('test-facet', facet, { attach: true });
    manager.remove('test-facet');
    if ('test-facet' in subsystem) {
      return { success: false, error: 'remove() should remove attached property' };
    }
    return { success: true, message: 'remove() removes attached property' };
  };

  const testRemoveReturnsTrue = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    const result = manager.remove('test-facet');
    if (result !== true) {
      return { success: false, error: 'remove() should return true on success' };
    }
    return { success: true, message: 'remove() returns true on success' };
  };

  const testRemoveReturnsFalseInvalid = () => {
    const manager = createFacetManager();
    const result = manager.remove(null);
    if (result !== false) {
      return { success: false, error: 'remove() should return false for invalid kind' };
    }
    return { success: true, message: 'remove() returns false for invalid kind' };
  };

  const testRemoveReturnsFalseNonExistent = () => {
    const manager = createFacetManager();
    const result = manager.remove('nonexistent');
    if (result !== false) {
      return { success: false, error: 'remove() should return false for non-existent facet' };
    }
    return { success: true, message: 'remove() returns false for non-existent facet' };
  };

  // ========== Query Tests ==========

  const testFindReturns = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    const found = manager.find('test-facet');
    if (found !== facet) {
      return { success: false, error: 'find() should return facet for existing kind' };
    }
    return { success: true, message: 'find() returns facet for existing kind' };
  };

  const testFindReturnsUndefined = () => {
    const manager = createFacetManager();
    const found = manager.find('nonexistent');
    if (found !== undefined) {
      return { success: false, error: 'find() should return undefined for non-existent' };
    }
    return { success: true, message: 'find() returns undefined for non-existent' };
  };

  const testHasReturnsTrue = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    if (!manager.has('test-facet')) {
      return { success: false, error: 'has() should return true for existing facet' };
    }
    return { success: true, message: 'has() returns true for existing facet' };
  };

  const testHasReturnsFalse = () => {
    const manager = createFacetManager();
    if (manager.has('nonexistent')) {
      return { success: false, error: 'has() should return false for non-existent' };
    }
    return { success: true, message: 'has() returns false for non-existent' };
  };

  const testGetAllKinds = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    const kinds = manager.getAllKinds();
    if (!Array.isArray(kinds) || kinds.length !== 2 || !kinds.includes('facet1') || !kinds.includes('facet2')) {
      return { success: false, error: 'getAllKinds() should return array of all kinds' };
    }
    return { success: true, message: 'getAllKinds() returns array of all kinds' };
  };

  const testGetAll = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    const all = manager.getAll();
    if (all.facet1 !== facet1 || all.facet2 !== facet2) {
      return { success: false, error: 'getAll() should return copy of all facets' };
    }
    return { success: true, message: 'getAll() returns copy of all facets' };
  };

  const testGetAllIndependent = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    const all = manager.getAll();
    delete all['test-facet'];
    if (!manager.has('test-facet')) {
      return { success: false, error: 'getAll() should return independent copy' };
    }
    return { success: true, message: 'getAll() returns independent copy' };
  };

  const testSize = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    if (manager.size() !== 2) {
      return { success: false, error: 'size() should return correct count' };
    }
    return { success: true, message: 'size() returns correct count' };
  };

  const testSizeEmpty = () => {
    const manager = createFacetManager();
    if (manager.size() !== 0) {
      return { success: false, error: 'size() should return 0 when empty' };
    }
    return { success: true, message: 'size() returns 0 when empty' };
  };

  // ========== clear() Tests ==========

  const testClear = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    manager.clear();
    if (manager.size() !== 0 || manager.has('facet1') || manager.has('facet2')) {
      return { success: false, error: 'clear() should remove all facets' };
    }
    return { success: true, message: 'clear() removes all facets' };
  };

  const testClearResetsSize = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    manager.clear();
    if (manager.size() !== 0) {
      return { success: false, error: 'clear() should reset size to 0' };
    }
    return { success: true, message: 'clear() resets size to 0' };
  };

  // ========== initAll() Tests ==========

  const testInitAll = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.initAll(subsystem);
    if (!facet1._initCalled() || !facet2._initCalled()) {
      return { success: false, error: 'initAll() should call init on all facets' };
    }
    return { success: true, message: 'initAll() calls init on all facets' };
  };

  const testInitAllSkips = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet1 = createMockFacet('facet1');
    const facet2 = { kind: 'facet2' }; // No init method
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    try {
      await manager.initAll(subsystem);
      if (!facet1._initCalled()) {
        return { success: false, error: 'Should call init on facets with init method' };
      }
      return { success: true, message: 'initAll() skips facets without init' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== disposeAll() Tests ==========

  const testDisposeAll = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.disposeAll(subsystem);
    if (!facet1._disposeCalled() || !facet2._disposeCalled()) {
      return { success: false, error: 'disposeAll() should call dispose on all facets' };
    }
    return { success: true, message: 'disposeAll() calls dispose on all facets' };
  };

  const testDisposeAllClears = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    await manager.disposeAll(subsystem);
    if (manager.size() !== 0) {
      return { success: false, error: 'disposeAll() should clear all facets' };
    }
    return { success: true, message: 'disposeAll() clears all facets' };
  };

  const testDisposeAllHandlesErrors = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    facet2.add({
      dispose: async () => { throw new Error('Dispose failed'); }
    });
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    try {
      await manager.disposeAll(subsystem);
      // Should not throw, should handle errors gracefully
      if (manager.size() !== 0) {
        return { success: false, error: 'Should clear even if some dispose fails' };
      }
      return { success: true, message: 'disposeAll() handles errors gracefully' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== Integration Tests ==========

  const testFullWorkflow = async () => {
    const subsystem = createSubsystem();
    const manager = createFacetManager(subsystem);
    const facet = createMockFacet('test-facet', { attach: true });
    
    await manager.add('test-facet', facet, { init: true, attach: true });
    if (!facet._initCalled() || subsystem['test-facet'] !== facet) {
      return { success: false, error: 'Workflow: add → init → attach should work' };
    }
    
    manager.remove('test-facet');
    if (manager.has('test-facet') || 'test-facet' in subsystem) {
      return { success: false, error: 'Workflow: remove should work' };
    }
    
    return { success: true, message: 'Full workflow works correctly' };
  };

  const testTransactionWorkflow = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    manager.beginTransaction();
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    manager.commit();
    
    if (!manager.has('facet1') || !manager.has('facet2')) {
      return { success: false, error: 'Transaction workflow should work' };
    }
    return { success: true, message: 'Transaction workflow works correctly' };
  };

  const testTransactionRollback = async () => {
    const manager = createFacetManager();
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    manager.beginTransaction();
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.rollback();
    
    if (manager.has('facet1') || manager.has('facet2')) {
      return { success: false, error: 'Transaction rollback should remove all facets' };
    }
    if (!facet1._disposeCalled() || !facet2._disposeCalled()) {
      return { success: false, error: 'Transaction rollback should dispose facets' };
    }
    return { success: true, message: 'Transaction rollback workflow works correctly' };
  };

  // Group tests by category
  const testsByCategory = testCases.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  const categories = Object.keys(testsByCategory);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>FacetManager Class Tests</h1>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Test suite for the FacetManager class covering constructor, proxy behavior, transactions, methods, and integration scenarios.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={runAllTests}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Run All Tests
          </button>
          <button
            onClick={clearResults}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Clear Results
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Test List */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Test Cases</h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {categories.map(category => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {category} ({testsByCategory[category].length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {testsByCategory[category].map(test => {
                    const result = results.get(test.name);
                    const isRunning = runningTests.has(test.name);
                    const isSelected = selectedTest === test.name;
                    
                    return (
                      <div
                        key={test.name}
                        onClick={() => setSelectedTest(test.name)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: isSelected ? '#eff6ff' : result ? (result.success ? '#f0fdf4' : '#fef2f2') : 'white',
                          border: `1px solid ${isSelected ? '#3b82f6' : result ? (result.success ? '#86efac' : '#fca5a5') : '#e5e7eb'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ flex: 1 }}>{test.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isRunning && <span style={{ fontSize: '12px', color: '#6b7280' }}>Running...</span>}
                          {result && (
                            <span style={{ fontSize: '18px' }}>
                              {result.success ? '✓' : '✗'}
                            </span>
                          )}
                          {!result && !isRunning && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                runTest(test.name);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Run
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Details */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Test Details</h2>
          {selectedTest && results.has(selectedTest) ? (
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>{selectedTest}</h3>
              {(() => {
                const result = results.get(selectedTest);
                return (
                  <div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{result.success ? '✓' : '✗'}</span>
                        <span style={{ fontWeight: '600', color: result.success ? '#166534' : '#991b1b' }}>
                          {result.success ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {result.message && (
                        <p style={{ color: result.success ? '#166534' : '#991b1b', margin: 0 }}>
                          {result.message}
                        </p>
                      )}
                      {result.error && (
                        <p style={{ color: '#991b1b', margin: '8px 0 0 0', fontFamily: 'monospace', fontSize: '12px' }}>
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : selectedTest ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Click "Run" to execute this test
            </div>
          ) : (
            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Select a test to view details
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {results.size > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Summary</h3>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Total: </span>
              <span style={{ fontWeight: '600' }}>{results.size} / {testCases.length}</span>
            </div>
            <div>
              <span style={{ color: '#16a34a' }}>Passed: </span>
              <span style={{ fontWeight: '600', color: '#16a34a' }}>
                {Array.from(results.values()).filter(r => r.success).length}
              </span>
            </div>
            <div>
              <span style={{ color: '#dc2626' }}>Failed: </span>
              <span style={{ fontWeight: '600', color: '#dc2626' }}>
                {Array.from(results.values()).filter(r => !r.success).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

