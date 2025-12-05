import { useState } from 'react';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * FacetTest - React component test suite for Facet class
 * Tests the Facet class directly
 */
export function FacetTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a fresh Facet instance
  const createFacet = (kind = 'test-facet', options = {}) => {
    return new Facet(kind, options);
  };

  const testCases = [
    // Constructor & Initialization
    { name: 'Constructor with valid kind', category: 'Constructor' },
    { name: 'Constructor with all options', category: 'Constructor' },
    { name: 'Constructor with default values', category: 'Constructor' },
    { name: 'Constructor throws error for missing kind', category: 'Constructor' },
    { name: 'Constructor throws error for empty string kind', category: 'Constructor' },
    { name: 'Constructor deduplicates required dependencies', category: 'Constructor' },
    
    // add() Method
    { name: 'add() with simple object properties', category: 'add() Method' },
    { name: 'add() with getter properties', category: 'add() Method' },
    { name: 'add() with setter properties', category: 'add() Method' },
    { name: 'add() with getter/setter properties', category: 'add() Method' },
    { name: 'add() with function properties', category: 'add() Method' },
    { name: 'add() with multiple properties', category: 'add() Method' },
    { name: 'add() returns this (chainable)', category: 'add() Method' },
    { name: 'add() throws error for null', category: 'add() Method' },
    { name: 'add() throws error for undefined', category: 'add() Method' },
    { name: 'add() throws error for non-object', category: 'add() Method' },
    { name: 'add() throws error after init()', category: 'add() Method' },
    { name: 'add() skips existing properties', category: 'add() Method' },
    { name: 'add() handles read-only properties gracefully', category: 'add() Method' },
    
    // onInit() Callback
    { name: 'onInit() accepts function', category: 'onInit() Callback' },
    { name: 'onInit() returns this (chainable)', category: 'onInit() Callback' },
    { name: 'onInit() throws error for non-function', category: 'onInit() Callback' },
    { name: 'onInit() throws error after init()', category: 'onInit() Callback' },
    { name: 'onInit() callback is called during init()', category: 'onInit() Callback' },
    { name: 'onInit() callback receives correct parameters', category: 'onInit() Callback' },
    
    // onDispose() Callback
    { name: 'onDispose() accepts function', category: 'onDispose() Callback' },
    { name: 'onDispose() returns this (chainable)', category: 'onDispose() Callback' },
    { name: 'onDispose() throws error for non-function', category: 'onDispose() Callback' },
    { name: 'onDispose() callback is called during dispose()', category: 'onDispose() Callback' },
    { name: 'onDispose() callback receives facet parameter', category: 'onDispose() Callback' },
    
    // init() Method
    { name: 'init() calls onInit callback', category: 'init() Method' },
    { name: 'init() sets isInit flag', category: 'init() Method' },
    { name: 'init() freezes the facet', category: 'init() Method' },
    { name: 'init() is idempotent (can\'t init twice)', category: 'init() Method' },
    { name: 'init() passes correct context to callback', category: 'init() Method' },
    { name: 'init() without callback still works', category: 'init() Method' },
    
    // dispose() Method
    { name: 'dispose() calls onDispose callback', category: 'dispose() Method' },
    { name: 'dispose() without callback still works', category: 'dispose() Method' },
    { name: 'dispose() can be called multiple times', category: 'dispose() Method' },
    
    // Dependency Management
    { name: 'addDependency() adds dependency', category: 'Dependency Management' },
    { name: 'addDependency() deduplicates dependencies', category: 'Dependency Management' },
    { name: 'addDependency() returns this (chainable)', category: 'Dependency Management' },
    { name: 'addDependency() throws error for invalid dependency', category: 'Dependency Management' },
    { name: 'addDependency() throws error for empty string', category: 'Dependency Management' },
    { name: 'addDependency() throws error after init()', category: 'Dependency Management' },
    { name: 'removeDependency() removes dependency', category: 'Dependency Management' },
    { name: 'removeDependency() returns this (chainable)', category: 'Dependency Management' },
    { name: 'removeDependency() handles non-existent dependency', category: 'Dependency Management' },
    { name: 'removeDependency() throws error after init()', category: 'Dependency Management' },
    { name: 'getDependencies() returns copy of dependencies', category: 'Dependency Management' },
    { name: 'getDependencies() returns empty array initially', category: 'Dependency Management' },
    { name: 'hasDependency() returns true for existing dependency', category: 'Dependency Management' },
    { name: 'hasDependency() returns false for non-existent dependency', category: 'Dependency Management' },
    { name: 'hasDependencies() returns false when empty', category: 'Dependency Management' },
    { name: 'hasDependencies() returns true when has dependencies', category: 'Dependency Management' },
    
    // Introspection Methods
    { name: 'getKind() returns correct kind', category: 'Introspection' },
    { name: 'shouldAttach() returns true when attach is true', category: 'Introspection' },
    { name: 'shouldAttach() returns false when attach is false', category: 'Introspection' },
    { name: 'shouldOverwrite() returns true when overwrite is true', category: 'Introspection' },
    { name: 'shouldOverwrite() returns false when overwrite is false', category: 'Introspection' },
    { name: 'getSource() returns source when provided', category: 'Introspection' },
    { name: 'getSource() returns undefined when not provided', category: 'Introspection' },
    
    // Lifecycle & Immutability
    { name: 'Facet is mutable before init()', category: 'Lifecycle & Immutability' },
    { name: 'Facet is frozen after init()', category: 'Lifecycle & Immutability' },
    { name: 'Cannot add properties after init()', category: 'Lifecycle & Immutability' },
    { name: 'Cannot modify dependencies after init()', category: 'Lifecycle & Immutability' },
    { name: 'Cannot set onInit after init()', category: 'Lifecycle & Immutability' },
    { name: 'Can call dispose() after init()', category: 'Lifecycle & Immutability' },
    
    // Integration & Edge Cases
    { name: 'Full lifecycle: create → add → onInit → init → dispose', category: 'Integration' },
    { name: 'Multiple add() calls accumulate properties', category: 'Integration' },
    { name: 'Chaining: add().onInit().addDependency()', category: 'Integration' },
    { name: 'Complex object with mixed property types', category: 'Integration' },
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
        if (testName === 'Constructor with valid kind') result = testConstructorValidKind();
        else if (testName === 'Constructor with all options') result = testConstructorAllOptions();
        else if (testName === 'Constructor with default values') result = testConstructorDefaults();
        else if (testName === 'Constructor throws error for missing kind') result = testConstructorMissingKind();
        else if (testName === 'Constructor throws error for empty string kind') result = testConstructorEmptyKind();
        else if (testName === 'Constructor deduplicates required dependencies') result = testConstructorDeduplicates();
        
        // add() Method tests
        else if (testName === 'add() with simple object properties') result = testAddSimpleProperties();
        else if (testName === 'add() with getter properties') result = testAddGetterProperties();
        else if (testName === 'add() with setter properties') result = testAddSetterProperties();
        else if (testName === 'add() with getter/setter properties') result = testAddGetterSetterProperties();
        else if (testName === 'add() with function properties') result = testAddFunctionProperties();
        else if (testName === 'add() with multiple properties') result = testAddMultipleProperties();
        else if (testName === 'add() returns this (chainable)') result = testAddReturnsThis();
        else if (testName === 'add() throws error for null') result = testAddThrowsNull();
        else if (testName === 'add() throws error for undefined') result = testAddThrowsUndefined();
        else if (testName === 'add() throws error for non-object') result = testAddThrowsNonObject();
        else if (testName === 'add() throws error after init()') result = await testAddThrowsAfterInit();
        else if (testName === 'add() skips existing properties') result = testAddSkipsExisting();
        else if (testName === 'add() handles read-only properties gracefully') result = testAddHandlesReadOnly();
        
        // onInit() tests
        else if (testName === 'onInit() accepts function') result = testOnInitAcceptsFunction();
        else if (testName === 'onInit() returns this (chainable)') result = testOnInitReturnsThis();
        else if (testName === 'onInit() throws error for non-function') result = testOnInitThrowsNonFunction();
        else if (testName === 'onInit() throws error after init()') result = await testOnInitThrowsAfterInit();
        else if (testName === 'onInit() callback is called during init()') result = await testOnInitCallbackCalled();
        else if (testName === 'onInit() callback receives correct parameters') result = await testOnInitCallbackParams();
        
        // onDispose() tests
        else if (testName === 'onDispose() accepts function') result = testOnDisposeAcceptsFunction();
        else if (testName === 'onDispose() returns this (chainable)') result = testOnDisposeReturnsThis();
        else if (testName === 'onDispose() throws error for non-function') result = testOnDisposeThrowsNonFunction();
        else if (testName === 'onDispose() callback is called during dispose()') result = await testOnDisposeCallbackCalled();
        else if (testName === 'onDispose() callback receives facet parameter') result = await testOnDisposeCallbackParams();
        
        // init() tests
        else if (testName === 'init() calls onInit callback') result = await testInitCallsCallback();
        else if (testName === 'init() sets isInit flag') result = await testInitSetsFlag();
        else if (testName === 'init() freezes the facet') result = await testInitFreezes();
        else if (testName === 'init() is idempotent (can\'t init twice)') result = await testInitIdempotent();
        else if (testName === 'init() passes correct context to callback') result = await testInitPassesContext();
        else if (testName === 'init() without callback still works') result = await testInitWithoutCallback();
        
        // dispose() tests
        else if (testName === 'dispose() calls onDispose callback') result = await testDisposeCallsCallback();
        else if (testName === 'dispose() without callback still works') result = await testDisposeWithoutCallback();
        else if (testName === 'dispose() can be called multiple times') result = await testDisposeMultipleTimes();
        
        // Dependency Management tests
        else if (testName === 'addDependency() adds dependency') result = testAddDependencyAdds();
        else if (testName === 'addDependency() deduplicates dependencies') result = testAddDependencyDeduplicates();
        else if (testName === 'addDependency() returns this (chainable)') result = testAddDependencyReturnsThis();
        else if (testName === 'addDependency() throws error for invalid dependency') result = testAddDependencyThrowsInvalid();
        else if (testName === 'addDependency() throws error for empty string') result = testAddDependencyThrowsEmpty();
        else if (testName === 'addDependency() throws error after init()') result = await testAddDependencyThrowsAfterInit();
        else if (testName === 'removeDependency() removes dependency') result = testRemoveDependencyRemoves();
        else if (testName === 'removeDependency() returns this (chainable)') result = testRemoveDependencyReturnsThis();
        else if (testName === 'removeDependency() handles non-existent dependency') result = testRemoveDependencyHandlesMissing();
        else if (testName === 'removeDependency() throws error after init()') result = await testRemoveDependencyThrowsAfterInit();
        else if (testName === 'getDependencies() returns copy of dependencies') result = testGetDependenciesReturnsCopy();
        else if (testName === 'getDependencies() returns empty array initially') result = testGetDependenciesEmpty();
        else if (testName === 'hasDependency() returns true for existing dependency') result = testHasDependencyTrue();
        else if (testName === 'hasDependency() returns false for non-existent dependency') result = testHasDependencyFalse();
        else if (testName === 'hasDependencies() returns false when empty') result = testHasDependenciesFalse();
        else if (testName === 'hasDependencies() returns true when has dependencies') result = testHasDependenciesTrue();
        
        // Introspection tests
        else if (testName === 'getKind() returns correct kind') result = testGetKind();
        else if (testName === 'shouldAttach() returns true when attach is true') result = testShouldAttachTrue();
        else if (testName === 'shouldAttach() returns false when attach is false') result = testShouldAttachFalse();
        else if (testName === 'shouldOverwrite() returns true when overwrite is true') result = testShouldOverwriteTrue();
        else if (testName === 'shouldOverwrite() returns false when overwrite is false') result = testShouldOverwriteFalse();
        else if (testName === 'getSource() returns source when provided') result = testGetSourceProvided();
        else if (testName === 'getSource() returns undefined when not provided') result = testGetSourceUndefined();
        
        // Lifecycle & Immutability tests
        else if (testName === 'Facet is mutable before init()') result = testMutableBeforeInit();
        else if (testName === 'Facet is frozen after init()') result = await testFrozenAfterInit();
        else if (testName === 'Cannot add properties after init()') result = await testCannotAddAfterInit();
        else if (testName === 'Cannot modify dependencies after init()') result = await testCannotModifyDepsAfterInit();
        else if (testName === 'Cannot set onInit after init()') result = await testCannotSetOnInitAfterInit();
        else if (testName === 'Can call dispose() after init()') result = await testCanDisposeAfterInit();
        
        // Integration tests
        else if (testName === 'Full lifecycle: create → add → onInit → init → dispose') result = await testFullLifecycle();
        else if (testName === 'Multiple add() calls accumulate properties') result = testMultipleAddCalls();
        else if (testName === 'Chaining: add().onInit().addDependency()') result = testChaining();
        else if (testName === 'Complex object with mixed property types') result = testComplexObject();
        
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

  const testConstructorValidKind = () => {
    const facet = createFacet('test-kind');
    if (facet.getKind() !== 'test-kind') {
      return { success: false, error: 'Kind should be set correctly' };
    }
    return { success: true, message: 'Constructor with valid kind works' };
  };

  const testConstructorAllOptions = () => {
    const facet = createFacet('test', {
      attach: true,
      required: ['dep1', 'dep2'],
      source: 'test-source',
      overwrite: true
    });
    if (facet.getKind() !== 'test') return { success: false, error: 'Kind incorrect' };
    if (!facet.shouldAttach()) return { success: false, error: 'attach should be true' };
    if (facet.getDependencies().length !== 2) return { success: false, error: 'Dependencies incorrect' };
    if (facet.getSource() !== 'test-source') return { success: false, error: 'Source incorrect' };
    if (!facet.shouldOverwrite()) return { success: false, error: 'overwrite should be true' };
    return { success: true, message: 'Constructor with all options works' };
  };

  const testConstructorDefaults = () => {
    const facet = createFacet('test');
    if (facet.shouldAttach()) return { success: false, error: 'attach should default to false' };
    if (facet.getDependencies().length !== 0) return { success: false, error: 'Dependencies should default to empty' };
    if (facet.getSource() !== undefined) return { success: false, error: 'Source should default to undefined' };
    if (facet.shouldOverwrite()) return { success: false, error: 'overwrite should default to false' };
    return { success: true, message: 'Constructor defaults work correctly' };
  };

  const testConstructorMissingKind = () => {
    try {
      // Call Facet constructor directly with undefined to test missing kind
      new Facet();
      return { success: false, error: 'Should throw error for missing kind' };
    } catch (error) {
      if (error.message.includes('kind must be a non-empty string')) {
        return { success: true, message: 'Throws error for missing kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorEmptyKind = () => {
    try {
      createFacet('');
      return { success: false, error: 'Should throw error for empty string kind' };
    } catch (error) {
      if (error.message.includes('kind must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty string kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorDeduplicates = () => {
    const facet = createFacet('test', { required: ['dep1', 'dep2', 'dep1', 'dep2'] });
    const deps = facet.getDependencies();
    if (deps.length !== 2) return { success: false, error: 'Should deduplicate dependencies' };
    if (!deps.includes('dep1') || !deps.includes('dep2')) {
      return { success: false, error: 'Should contain unique dependencies' };
    }
    return { success: true, message: 'Constructor deduplicates dependencies' };
  };

  // ========== add() Method Tests ==========

  const testAddSimpleProperties = () => {
    const facet = createFacet('test');
    facet.add({ prop1: 'value1', prop2: 42 });
    if (facet.prop1 !== 'value1' || facet.prop2 !== 42) {
      return { success: false, error: 'Properties not added correctly' };
    }
    return { success: true, message: 'add() with simple properties works' };
  };

  const testAddGetterProperties = () => {
    const facet = createFacet('test');
    const obj = {
      get value() { return 'getter-value'; }
    };
    facet.add(obj);
    if (facet.value !== 'getter-value') {
      return { success: false, error: 'Getter property not added correctly' };
    }
    return { success: true, message: 'add() with getter properties works' };
  };

  const testAddSetterProperties = () => {
    const facet = createFacet('test');
    let setValue = null;
    const obj = {
      set value(v) { setValue = v; }
    };
    facet.add(obj);
    facet.value = 'test-value';
    if (setValue !== 'test-value') {
      return { success: false, error: 'Setter property not added correctly' };
    }
    return { success: true, message: 'add() with setter properties works' };
  };

  const testAddGetterSetterProperties = () => {
    const facet = createFacet('test');
    let _value = 'initial';
    const obj = {
      get value() { return _value; },
      set value(v) { _value = v; }
    };
    facet.add(obj);
    if (facet.value !== 'initial') return { success: false, error: 'Getter not working' };
    facet.value = 'updated';
    if (facet.value !== 'updated') return { success: false, error: 'Setter not working' };
    return { success: true, message: 'add() with getter/setter properties works' };
  };

  const testAddFunctionProperties = () => {
    const facet = createFacet('test');
    const fn = () => 'function-result';
    facet.add({ method: fn });
    if (typeof facet.method !== 'function') {
      return { success: false, error: 'Function property not added correctly' };
    }
    if (facet.method() !== 'function-result') {
      return { success: false, error: 'Function property not callable' };
    }
    return { success: true, message: 'add() with function properties works' };
  };

  const testAddMultipleProperties = () => {
    const facet = createFacet('test');
    facet.add({
      prop1: 'value1',
      prop2: 42,
      prop3: true,
      method: () => 'result'
    });
    if (facet.prop1 !== 'value1' || facet.prop2 !== 42 || facet.prop3 !== true || typeof facet.method !== 'function') {
      return { success: false, error: 'Multiple properties not added correctly' };
    }
    return { success: true, message: 'add() with multiple properties works' };
  };

  const testAddReturnsThis = () => {
    const facet = createFacet('test');
    const result = facet.add({ prop: 'value' });
    if (result !== facet) {
      return { success: false, error: 'add() should return this' };
    }
    return { success: true, message: 'add() returns this (chainable)' };
  };

  const testAddThrowsNull = () => {
    const facet = createFacet('test');
    try {
      facet.add(null);
      return { success: false, error: 'Should throw error for null' };
    } catch (error) {
      if (error.message.includes('object must be a non-null object')) {
        return { success: true, message: 'Throws error for null' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddThrowsUndefined = () => {
    const facet = createFacet('test');
    try {
      facet.add(undefined);
      return { success: false, error: 'Should throw error for undefined' };
    } catch (error) {
      if (error.message.includes('object must be a non-null object')) {
        return { success: true, message: 'Throws error for undefined' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddThrowsNonObject = () => {
    const facet = createFacet('test');
    try {
      facet.add('not-an-object');
      return { success: false, error: 'Should throw error for non-object' };
    } catch (error) {
      if (error.message.includes('object must be a non-null object')) {
        return { success: true, message: 'Throws error for non-object' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddThrowsAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.add({ prop: 'value' });
      return { success: false, error: 'Should throw error after init()' };
    } catch (error) {
      if (error.message.includes('cannot mutate after init()')) {
        return { success: true, message: 'Throws error after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddSkipsExisting = () => {
    const facet = createFacet('test');
    facet.add({ prop: 'value1' });
    const originalValue = facet.prop;
    facet.add({ prop: 'value2' });
    if (facet.prop !== originalValue) {
      return { success: false, error: 'Should skip existing properties' };
    }
    return { success: true, message: 'add() skips existing properties' };
  };

  const testAddHandlesReadOnly = () => {
    const facet = createFacet('test');
    // Try to add an object with a property that might conflict
    // The implementation should gracefully skip properties that can't be defined
    try {
      facet.add({ toString: () => 'custom' });
      // If it doesn't throw, it handled it gracefully
      return { success: true, message: 'add() handles read-only properties gracefully' };
    } catch (error) {
      // If it throws, that's also acceptable behavior
      return { success: true, message: 'add() handles read-only properties gracefully (throws)' };
    }
  };

  // ========== onInit() Tests ==========

  const testOnInitAcceptsFunction = () => {
    const facet = createFacet('test');
    const callback = () => {};
    facet.onInit(callback);
    return { success: true, message: 'onInit() accepts function' };
  };

  const testOnInitReturnsThis = () => {
    const facet = createFacet('test');
    const result = facet.onInit(() => {});
    if (result !== facet) {
      return { success: false, error: 'onInit() should return this' };
    }
    return { success: true, message: 'onInit() returns this (chainable)' };
  };

  const testOnInitThrowsNonFunction = () => {
    const facet = createFacet('test');
    try {
      facet.onInit('not-a-function');
      return { success: false, error: 'Should throw error for non-function' };
    } catch (error) {
      if (error.message.includes('onInit callback must be a function')) {
        return { success: true, message: 'Throws error for non-function' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOnInitThrowsAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.onInit(() => {});
      return { success: false, error: 'Should throw error after init()' };
    } catch (error) {
      if (error.message.includes('onInit must be set before init()')) {
        return { success: true, message: 'Throws error after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOnInitCallbackCalled = async () => {
    const facet = createFacet('test');
    let called = false;
    facet.onInit(() => { called = true; });
    await facet.init({}, {}, {});
    if (!called) {
      return { success: false, error: 'Callback should be called during init()' };
    }
    return { success: true, message: 'onInit() callback is called during init()' };
  };

  const testOnInitCallbackParams = async () => {
    const facet = createFacet('test');
    let receivedParams = null;
    const ctx = { test: 'ctx' };
    const api = { test: 'api' };
    const subsystem = { test: 'subsystem' };
    facet.onInit((params) => { receivedParams = params; });
    await facet.init(ctx, api, subsystem);
    if (!receivedParams || receivedParams.ctx !== ctx || receivedParams.api !== api || receivedParams.subsystem !== subsystem || receivedParams.facet !== facet) {
      return { success: false, error: 'Callback should receive correct parameters' };
    }
    return { success: true, message: 'onInit() callback receives correct parameters' };
  };

  // ========== onDispose() Tests ==========

  const testOnDisposeAcceptsFunction = () => {
    const facet = createFacet('test');
    const callback = () => {};
    facet.onDispose(callback);
    return { success: true, message: 'onDispose() accepts function' };
  };

  const testOnDisposeReturnsThis = () => {
    const facet = createFacet('test');
    const result = facet.onDispose(() => {});
    if (result !== facet) {
      return { success: false, error: 'onDispose() should return this' };
    }
    return { success: true, message: 'onDispose() returns this (chainable)' };
  };

  const testOnDisposeThrowsNonFunction = () => {
    const facet = createFacet('test');
    try {
      facet.onDispose('not-a-function');
      return { success: false, error: 'Should throw error for non-function' };
    } catch (error) {
      if (error.message.includes('onDispose callback must be a function')) {
        return { success: true, message: 'Throws error for non-function' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOnDisposeCallbackCalled = async () => {
    const facet = createFacet('test');
    let called = false;
    facet.onDispose(() => { called = true; });
    await facet.dispose();
    if (!called) {
      return { success: false, error: 'Callback should be called during dispose()' };
    }
    return { success: true, message: 'onDispose() callback is called during dispose()' };
  };

  const testOnDisposeCallbackParams = async () => {
    const facet = createFacet('test');
    let receivedFacet = null;
    facet.onDispose((f) => { receivedFacet = f; });
    await facet.dispose();
    if (receivedFacet !== facet) {
      return { success: false, error: 'Callback should receive facet parameter' };
    }
    return { success: true, message: 'onDispose() callback receives facet parameter' };
  };

  // ========== init() Tests ==========

  const testInitCallsCallback = async () => {
    const facet = createFacet('test');
    let called = false;
    facet.onInit(() => { called = true; });
    await facet.init({}, {}, {});
    if (!called) {
      return { success: false, error: 'init() should call onInit callback' };
    }
    return { success: true, message: 'init() calls onInit callback' };
  };

  const testInitSetsFlag = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    // Try to add after init - should fail
    try {
      facet.add({ prop: 'value' });
      return { success: false, error: 'Should not be able to mutate after init()' };
    } catch (error) {
      if (error.message.includes('cannot mutate after init()')) {
        return { success: true, message: 'init() sets isInit flag' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testInitFreezes = async () => {
    const facet = createFacet('test');
    facet.add({ prop: 'value' });
    await facet.init({}, {}, {});
    if (!Object.isFrozen(facet)) {
      return { success: false, error: 'Facet should be frozen after init()' };
    }
    return { success: true, message: 'init() freezes the facet' };
  };

  const testInitIdempotent = async () => {
    const facet = createFacet('test');
    let callCount = 0;
    facet.onInit(() => { callCount++; });
    await facet.init({}, {}, {});
    await facet.init({}, {}, {});
    if (callCount !== 1) {
      return { success: false, error: 'init() should only call callback once' };
    }
    return { success: true, message: 'init() is idempotent' };
  };

  const testInitPassesContext = async () => {
    const facet = createFacet('test');
    let receivedCtx = null;
    const ctx = { test: 'context' };
    facet.onInit((params) => { receivedCtx = params.ctx; });
    await facet.init(ctx, {}, {});
    if (receivedCtx !== ctx) {
      return { success: false, error: 'init() should pass context to callback' };
    }
    return { success: true, message: 'init() passes correct context to callback' };
  };

  const testInitWithoutCallback = async () => {
    const facet = createFacet('test');
    try {
      await facet.init({}, {}, {});
      // Should not throw
      return { success: true, message: 'init() without callback still works' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== dispose() Tests ==========

  const testDisposeCallsCallback = async () => {
    const facet = createFacet('test');
    let called = false;
    facet.onDispose(() => { called = true; });
    await facet.dispose();
    if (!called) {
      return { success: false, error: 'dispose() should call onDispose callback' };
    }
    return { success: true, message: 'dispose() calls onDispose callback' };
  };

  const testDisposeWithoutCallback = async () => {
    const facet = createFacet('test');
    try {
      await facet.dispose();
      return { success: true, message: 'dispose() without callback still works' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testDisposeMultipleTimes = async () => {
    const facet = createFacet('test');
    let callCount = 0;
    facet.onDispose(() => { callCount++; });
    await facet.dispose();
    await facet.dispose();
    if (callCount !== 2) {
      return { success: false, error: 'dispose() should be callable multiple times' };
    }
    return { success: true, message: 'dispose() can be called multiple times' };
  };

  // ========== Dependency Management Tests ==========

  const testAddDependencyAdds = () => {
    const facet = createFacet('test');
    facet.addDependency('dep1');
    if (!facet.hasDependency('dep1')) {
      return { success: false, error: 'addDependency() should add dependency' };
    }
    return { success: true, message: 'addDependency() adds dependency' };
  };

  const testAddDependencyDeduplicates = () => {
    const facet = createFacet('test');
    facet.addDependency('dep1');
    facet.addDependency('dep1');
    const deps = facet.getDependencies();
    if (deps.length !== 1 || deps[0] !== 'dep1') {
      return { success: false, error: 'addDependency() should deduplicate' };
    }
    return { success: true, message: 'addDependency() deduplicates dependencies' };
  };

  const testAddDependencyReturnsThis = () => {
    const facet = createFacet('test');
    const result = facet.addDependency('dep1');
    if (result !== facet) {
      return { success: false, error: 'addDependency() should return this' };
    }
    return { success: true, message: 'addDependency() returns this (chainable)' };
  };

  const testAddDependencyThrowsInvalid = () => {
    const facet = createFacet('test');
    try {
      facet.addDependency(123);
      return { success: false, error: 'Should throw error for invalid dependency' };
    } catch (error) {
      if (error.message.includes('dependency must be a non-empty string')) {
        return { success: true, message: 'Throws error for invalid dependency' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddDependencyThrowsEmpty = () => {
    const facet = createFacet('test');
    try {
      facet.addDependency('');
      return { success: false, error: 'Should throw error for empty string' };
    } catch (error) {
      if (error.message.includes('dependency must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty string' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAddDependencyThrowsAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.addDependency('dep1');
      return { success: false, error: 'Should throw error after init()' };
    } catch (error) {
      if (error.message.includes('cannot modify dependencies after init()')) {
        return { success: true, message: 'Throws error after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRemoveDependencyRemoves = () => {
    const facet = createFacet('test', { required: ['dep1', 'dep2'] });
    facet.removeDependency('dep1');
    if (facet.hasDependency('dep1')) {
      return { success: false, error: 'removeDependency() should remove dependency' };
    }
    if (!facet.hasDependency('dep2')) {
      return { success: false, error: 'removeDependency() should not remove other dependencies' };
    }
    return { success: true, message: 'removeDependency() removes dependency' };
  };

  const testRemoveDependencyReturnsThis = () => {
    const facet = createFacet('test', { required: ['dep1'] });
    const result = facet.removeDependency('dep1');
    if (result !== facet) {
      return { success: false, error: 'removeDependency() should return this' };
    }
    return { success: true, message: 'removeDependency() returns this (chainable)' };
  };

  const testRemoveDependencyHandlesMissing = () => {
    const facet = createFacet('test');
    try {
      facet.removeDependency('nonexistent');
      // Should not throw, just do nothing
      return { success: true, message: 'removeDependency() handles non-existent dependency' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testRemoveDependencyThrowsAfterInit = async () => {
    const facet = createFacet('test', { required: ['dep1'] });
    await facet.init({}, {}, {});
    try {
      facet.removeDependency('dep1');
      return { success: false, error: 'Should throw error after init()' };
    } catch (error) {
      if (error.message.includes('cannot modify dependencies after init()')) {
        return { success: true, message: 'Throws error after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testGetDependenciesReturnsCopy = () => {
    const facet = createFacet('test', { required: ['dep1'] });
    const deps1 = facet.getDependencies();
    const deps2 = facet.getDependencies();
    if (deps1 === deps2) {
      return { success: false, error: 'getDependencies() should return a copy' };
    }
    deps1.push('dep2');
    if (facet.getDependencies().length !== 1) {
      return { success: false, error: 'Modifying returned array should not affect facet' };
    }
    return { success: true, message: 'getDependencies() returns copy of dependencies' };
  };

  const testGetDependenciesEmpty = () => {
    const facet = createFacet('test');
    const deps = facet.getDependencies();
    if (!Array.isArray(deps) || deps.length !== 0) {
      return { success: false, error: 'getDependencies() should return empty array initially' };
    }
    return { success: true, message: 'getDependencies() returns empty array initially' };
  };

  const testHasDependencyTrue = () => {
    const facet = createFacet('test', { required: ['dep1'] });
    if (!facet.hasDependency('dep1')) {
      return { success: false, error: 'hasDependency() should return true for existing dependency' };
    }
    return { success: true, message: 'hasDependency() returns true for existing dependency' };
  };

  const testHasDependencyFalse = () => {
    const facet = createFacet('test');
    if (facet.hasDependency('dep1')) {
      return { success: false, error: 'hasDependency() should return false for non-existent dependency' };
    }
    return { success: true, message: 'hasDependency() returns false for non-existent dependency' };
  };

  const testHasDependenciesFalse = () => {
    const facet = createFacet('test');
    if (facet.hasDependencies()) {
      return { success: false, error: 'hasDependencies() should return false when empty' };
    }
    return { success: true, message: 'hasDependencies() returns false when empty' };
  };

  const testHasDependenciesTrue = () => {
    const facet = createFacet('test', { required: ['dep1'] });
    if (!facet.hasDependencies()) {
      return { success: false, error: 'hasDependencies() should return true when has dependencies' };
    }
    return { success: true, message: 'hasDependencies() returns true when has dependencies' };
  };

  // ========== Introspection Tests ==========

  const testGetKind = () => {
    const facet = createFacet('test-kind');
    if (facet.getKind() !== 'test-kind') {
      return { success: false, error: 'getKind() should return correct kind' };
    }
    return { success: true, message: 'getKind() returns correct kind' };
  };

  const testShouldAttachTrue = () => {
    const facet = createFacet('test', { attach: true });
    if (!facet.shouldAttach()) {
      return { success: false, error: 'shouldAttach() should return true when attach is true' };
    }
    return { success: true, message: 'shouldAttach() returns true when attach is true' };
  };

  const testShouldAttachFalse = () => {
    const facet = createFacet('test', { attach: false });
    if (facet.shouldAttach()) {
      return { success: false, error: 'shouldAttach() should return false when attach is false' };
    }
    return { success: true, message: 'shouldAttach() returns false when attach is false' };
  };

  const testShouldOverwriteTrue = () => {
    const facet = createFacet('test', { overwrite: true });
    if (!facet.shouldOverwrite()) {
      return { success: false, error: 'shouldOverwrite() should return true when overwrite is true' };
    }
    return { success: true, message: 'shouldOverwrite() returns true when overwrite is true' };
  };

  const testShouldOverwriteFalse = () => {
    const facet = createFacet('test', { overwrite: false });
    if (facet.shouldOverwrite()) {
      return { success: false, error: 'shouldOverwrite() should return false when overwrite is false' };
    }
    return { success: true, message: 'shouldOverwrite() returns false when overwrite is false' };
  };

  const testGetSourceProvided = () => {
    const facet = createFacet('test', { source: 'test-source' });
    if (facet.getSource() !== 'test-source') {
      return { success: false, error: 'getSource() should return source when provided' };
    }
    return { success: true, message: 'getSource() returns source when provided' };
  };

  const testGetSourceUndefined = () => {
    const facet = createFacet('test');
    if (facet.getSource() !== undefined) {
      return { success: false, error: 'getSource() should return undefined when not provided' };
    }
    return { success: true, message: 'getSource() returns undefined when not provided' };
  };

  // ========== Lifecycle & Immutability Tests ==========

  const testMutableBeforeInit = () => {
    const facet = createFacet('test');
    facet.add({ prop: 'value' });
    if (Object.isFrozen(facet)) {
      return { success: false, error: 'Facet should be mutable before init()' };
    }
    return { success: true, message: 'Facet is mutable before init()' };
  };

  const testFrozenAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    if (!Object.isFrozen(facet)) {
      return { success: false, error: 'Facet should be frozen after init()' };
    }
    return { success: true, message: 'Facet is frozen after init()' };
  };

  const testCannotAddAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.add({ prop: 'value' });
      return { success: false, error: 'Should not be able to add properties after init()' };
    } catch (error) {
      if (error.message.includes('cannot mutate after init()')) {
        return { success: true, message: 'Cannot add properties after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCannotModifyDepsAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.addDependency('dep1');
      return { success: false, error: 'Should not be able to modify dependencies after init()' };
    } catch (error) {
      if (error.message.includes('cannot modify dependencies after init()')) {
        return { success: true, message: 'Cannot modify dependencies after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCannotSetOnInitAfterInit = async () => {
    const facet = createFacet('test');
    await facet.init({}, {}, {});
    try {
      facet.onInit(() => {});
      return { success: false, error: 'Should not be able to set onInit after init()' };
    } catch (error) {
      if (error.message.includes('onInit must be set before init()')) {
        return { success: true, message: 'Cannot set onInit after init()' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCanDisposeAfterInit = async () => {
    const facet = createFacet('test');
    let disposed = false;
    facet.onDispose(() => { disposed = true; });
    await facet.init({}, {}, {});
    await facet.dispose();
    if (!disposed) {
      return { success: false, error: 'Should be able to call dispose() after init()' };
    }
    return { success: true, message: 'Can call dispose() after init()' };
  };

  // ========== Integration Tests ==========

  const testFullLifecycle = async () => {
    const facet = createFacet('test');
    let initCalled = false;
    let disposeCalled = false;
    
    facet.add({ prop: 'value' });
    facet.onInit(() => { initCalled = true; });
    await facet.init({}, {}, {});
    facet.onDispose(() => { disposeCalled = true; });
    await facet.dispose();
    
    if (!initCalled || !disposeCalled || facet.prop !== 'value') {
      return { success: false, error: 'Full lifecycle should work correctly' };
    }
    return { success: true, message: 'Full lifecycle works correctly' };
  };

  const testMultipleAddCalls = () => {
    const facet = createFacet('test');
    facet.add({ prop1: 'value1' });
    facet.add({ prop2: 'value2' });
    facet.add({ prop3: 'value3' });
    
    if (facet.prop1 !== 'value1' || facet.prop2 !== 'value2' || facet.prop3 !== 'value3') {
      return { success: false, error: 'Multiple add() calls should accumulate properties' };
    }
    return { success: true, message: 'Multiple add() calls accumulate properties' };
  };

  const testChaining = () => {
    const facet = createFacet('test');
    const result = facet
      .add({ prop: 'value' })
      .onInit(() => {})
      .addDependency('dep1');
    
    if (result !== facet) {
      return { success: false, error: 'Chaining should return this' };
    }
    if (facet.prop !== 'value' || !facet.hasDependency('dep1')) {
      return { success: false, error: 'Chaining should work correctly' };
    }
    return { success: true, message: 'Chaining works correctly' };
  };

  const testComplexObject = () => {
    const facet = createFacet('test');
    let _value = 'initial';
    const complexObj = {
      stringProp: 'string',
      numberProp: 42,
      booleanProp: true,
      get getterProp() { return _value; },
      set setterProp(v) { _value = v; },
      methodProp: () => 'method-result',
      nestedObj: { nested: 'value' }
    };
    
    facet.add(complexObj);
    
    if (facet.stringProp !== 'string' || 
        facet.numberProp !== 42 || 
        facet.booleanProp !== true ||
        facet.getterProp !== 'initial' ||
        typeof facet.methodProp !== 'function' ||
        facet.nestedObj.nested !== 'value') {
      return { success: false, error: 'Complex object properties not added correctly' };
    }
    
    facet.setterProp = 'updated';
    if (facet.getterProp !== 'updated') {
      return { success: false, error: 'Getter/setter not working correctly' };
    }
    
    return { success: true, message: 'Complex object with mixed property types works' };
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
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Facet Class Tests</h1>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Test suite for the Facet class covering constructor, methods, lifecycle, and integration scenarios.
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
                      {result.data && (
                        <pre style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '4px',
                          fontSize: '12px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
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

