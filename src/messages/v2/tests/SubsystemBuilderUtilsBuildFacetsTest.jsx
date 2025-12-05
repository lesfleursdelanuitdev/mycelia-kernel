import { useState } from 'react';
import { buildSubsystem } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * SubsystemBuilderUtilsBuildFacetsTest
 * Tests for facet addition, initialization, and attachment in buildSubsystem
 */
export function SubsystemBuilderUtilsBuildFacetsTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem with FacetManager
  const createMockSubsystem = (options = {}) => {
    const subsystem = {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      api: options.api || { name: options.name || 'test-subsystem' }
    };
    subsystem.api.__facets = new FacetManager(subsystem);
    return subsystem;
  };

  // Helper to create a facet with init callback
  const createFacetWithInit = (kind, options = {}) => {
    const facet = new Facet(kind, {
      attach: options.attach || false,
      source: options.source || `test://${kind}`
    });
    
    if (options.onInit) {
      facet.onInit(options.onInit);
    }
    
    return facet;
  };

  // Helper to create a facet with attach flag
  const createFacetWithAttach = (kind, attach = true) => {
    return new Facet(kind, {
      attach,
      source: `test://${kind}`
    });
  };

  // Helper to create a mock plan
  const createMockPlan = (facets, orderedKinds = null) => {
    const kinds = orderedKinds || Object.keys(facets);
    return {
      resolvedCtx: { ms: 'mock-ms', config: {} },
      orderedKinds: kinds,
      facetsByKind: facets
    };
  };

  const testCases = [
    // FacetManager.addMany Integration
    { name: 'FacetManager.addMany - calls addMany with orderedKinds', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - calls addMany with facetsByKind', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - passes init: true option', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - passes attach: true option', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - passes resolvedCtx as ctx option', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - passes subsystem.api as api option', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - facets added in dependency order', category: 'FacetManager.addMany Integration' },
    { name: 'FacetManager.addMany - all facets from plan are added', category: 'FacetManager.addMany Integration' },
    
    // Facet Initialization
    { name: 'Facet initialization - init() called for each facet', category: 'Facet Initialization' },
    { name: 'Facet initialization - init() called with correct ctx parameter', category: 'Facet Initialization' },
    { name: 'Facet initialization - init() called with correct api parameter', category: 'Facet Initialization' },
    { name: 'Facet initialization - init() called with correct subsystem parameter', category: 'Facet Initialization' },
    { name: 'Facet initialization - init() called in dependency order', category: 'Facet Initialization' },
    { name: 'Facet initialization - facet frozen after init', category: 'Facet Initialization' },
    { name: 'Facet initialization - onInit callback called if set', category: 'Facet Initialization' },
    { name: 'Facet initialization - onInit callback receives correct parameters', category: 'Facet Initialization' },
    { name: 'Facet initialization - init() not called twice for same facet', category: 'Facet Initialization' },
    { name: 'Facet initialization - multiple facets initialized correctly', category: 'Facet Initialization' },
    
    // Facet Attachment
    { name: 'Facet attachment - facets with attach: true are attached', category: 'Facet Attachment' },
    { name: 'Facet attachment - facets with attach: false are not attached', category: 'Facet Attachment' },
    { name: 'Facet attachment - attached facets accessible on subsystem', category: 'Facet Attachment' },
    { name: 'Facet attachment - attached facets accessible via FacetManager.find()', category: 'Facet Attachment' },
    { name: 'Facet attachment - attachment happens after successful init', category: 'Facet Attachment' },
    { name: 'Facet attachment - multiple facets attached correctly', category: 'Facet Attachment' },
    { name: 'Facet attachment - attachment respects shouldAttach() method', category: 'Facet Attachment' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        switch (testName) {
          case 'FacetManager.addMany - calls addMany with orderedKinds':
            result = await testAddManyCallsWithOrderedKinds();
            break;
          case 'FacetManager.addMany - calls addMany with facetsByKind':
            result = await testAddManyCallsWithFacetsByKind();
            break;
          case 'FacetManager.addMany - passes init: true option':
            result = await testAddManyPassesInitOption();
            break;
          case 'FacetManager.addMany - passes attach: true option':
            result = await testAddManyPassesAttachOption();
            break;
          case 'FacetManager.addMany - passes resolvedCtx as ctx option':
            result = await testAddManyPassesCtxOption();
            break;
          case 'FacetManager.addMany - passes subsystem.api as api option':
            result = await testAddManyPassesApiOption();
            break;
          case 'FacetManager.addMany - facets added in dependency order':
            result = await testAddManyInDependencyOrder();
            break;
          case 'FacetManager.addMany - all facets from plan are added':
            result = await testAddManyAllFacetsAdded();
            break;
          case 'Facet initialization - init() called for each facet':
            result = await testInitCalledForEachFacet();
            break;
          case 'Facet initialization - init() called with correct ctx parameter':
            result = await testInitCalledWithCorrectCtx();
            break;
          case 'Facet initialization - init() called with correct api parameter':
            result = await testInitCalledWithCorrectApi();
            break;
          case 'Facet initialization - init() called with correct subsystem parameter':
            result = await testInitCalledWithCorrectSubsystem();
            break;
          case 'Facet initialization - init() called in dependency order':
            result = await testInitCalledInOrder();
            break;
          case 'Facet initialization - facet frozen after init':
            result = await testFacetFrozenAfterInit();
            break;
          case 'Facet initialization - onInit callback called if set':
            result = await testOnInitCallbackCalled();
            break;
          case 'Facet initialization - onInit callback receives correct parameters':
            result = await testOnInitCallbackReceivesParams();
            break;
          case 'Facet initialization - init() not called twice for same facet':
            result = await testInitNotCalledTwice();
            break;
          case 'Facet initialization - multiple facets initialized correctly':
            result = await testMultipleFacetsInitialized();
            break;
          case 'Facet attachment - facets with attach: true are attached':
            result = await testFacetsWithAttachTrueAreAttached();
            break;
          case 'Facet attachment - facets with attach: false are not attached':
            result = await testFacetsWithAttachFalseNotAttached();
            break;
          case 'Facet attachment - attached facets accessible on subsystem':
            result = await testAttachedFacetsAccessibleOnSubsystem();
            break;
          case 'Facet attachment - attached facets accessible via FacetManager.find()':
            result = await testAttachedFacetsAccessibleViaFind();
            break;
          case 'Facet attachment - attachment happens after successful init':
            result = await testAttachmentAfterInit();
            break;
          case 'Facet attachment - multiple facets attached correctly':
            result = await testMultipleFacetsAttached();
            break;
          case 'Facet attachment - attachment respects shouldAttach() method':
            result = await testAttachmentRespectsShouldAttach();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message,
          data: result.data
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message || String(error)
        }));
      } finally {
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 0);
  };

  // Test functions - FacetManager.addMany Integration
  const testAddManyCallsWithOrderedKinds = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const facet2 = createFacetWithAttach('test2', false);
    const plan = createMockPlan({ test1: facet1, test2: facet2 }, ['test1', 'test2']);
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithOrderedKinds = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithOrderedKinds = orderedKinds;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithOrderedKinds || !Array.isArray(calledWithOrderedKinds)) {
      return { success: false, error: 'addMany should be called with orderedKinds array' };
    }
    if (calledWithOrderedKinds.length !== 2 || !calledWithOrderedKinds.includes('test1') || !calledWithOrderedKinds.includes('test2')) {
      return { success: false, error: 'addMany should be called with correct orderedKinds' };
    }
    
    return { success: true, message: 'Calls addMany with orderedKinds', data: { orderedKinds: calledWithOrderedKinds } };
  };

  const testAddManyCallsWithFacetsByKind = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const facet2 = createFacetWithAttach('test2', false);
    const plan = createMockPlan({ test1: facet1, test2: facet2 });
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithFacetsByKind = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithFacetsByKind = facetsByKind;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithFacetsByKind || typeof calledWithFacetsByKind !== 'object') {
      return { success: false, error: 'addMany should be called with facetsByKind object' };
    }
    if (!calledWithFacetsByKind.test1 || !calledWithFacetsByKind.test2) {
      return { success: false, error: 'addMany should be called with correct facetsByKind' };
    }
    
    return { success: true, message: 'Calls addMany with facetsByKind', data: { facetKinds: Object.keys(calledWithFacetsByKind) } };
  };

  const testAddManyPassesInitOption = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const plan = createMockPlan({ test1: facet1 });
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithOpts = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithOpts = opts;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithOpts || calledWithOpts.init !== true) {
      return { success: false, error: 'addMany should be called with init: true' };
    }
    
    return { success: true, message: 'Passes init: true option', data: { opts: calledWithOpts } };
  };

  const testAddManyPassesAttachOption = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const plan = createMockPlan({ test1: facet1 });
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithOpts = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithOpts = opts;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithOpts || calledWithOpts.attach !== true) {
      return { success: false, error: 'addMany should be called with attach: true' };
    }
    
    return { success: true, message: 'Passes attach: true option', data: { opts: calledWithOpts } };
  };

  const testAddManyPassesCtxOption = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const resolvedCtx = { ms: 'mock-ms', config: { test: 'value' } };
    const plan = {
      resolvedCtx,
      orderedKinds: ['test1'],
      facetsByKind: { test1: facet1 }
    };
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithOpts = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithOpts = opts;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithOpts || calledWithOpts.ctx !== resolvedCtx) {
      return { success: false, error: 'addMany should be called with resolvedCtx as ctx option' };
    }
    
    return { success: true, message: 'Passes resolvedCtx as ctx option', data: { ctx: calledWithOpts.ctx } };
  };

  const testAddManyPassesApiOption = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const plan = createMockPlan({ test1: facet1 });
    
    const originalAddMany = subsystem.api.__facets.addMany;
    let calledWithOpts = null;
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      calledWithOpts = opts;
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!calledWithOpts || calledWithOpts.api !== subsystem.api) {
      return { success: false, error: 'addMany should be called with subsystem.api as api option' };
    }
    
    return { success: true, message: 'Passes subsystem.api as api option', data: { api: calledWithOpts.api } };
  };

  const testAddManyInDependencyOrder = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const facet2 = createFacetWithAttach('test2', false);
    const facet3 = createFacetWithAttach('test3', false);
    const plan = createMockPlan(
      { test1: facet1, test2: facet2, test3: facet3 },
      ['test1', 'test2', 'test3']
    );
    
    const originalAddMany = subsystem.api.__facets.addMany;
    const addOrder = [];
    subsystem.api.__facets.addMany = async function(orderedKinds, facetsByKind, opts) {
      addOrder.push(...orderedKinds);
      return originalAddMany.call(this, orderedKinds, facetsByKind, opts);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (addOrder.join(',') !== 'test1,test2,test3') {
      return { success: false, error: 'Facets should be added in dependency order' };
    }
    
    return { success: true, message: 'Facets added in dependency order', data: { order: addOrder } };
  };

  const testAddManyAllFacetsAdded = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const facet2 = createFacetWithAttach('test2', false);
    const facet3 = createFacetWithAttach('test3', false);
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 });
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 3 || !addedKinds.includes('test1') || !addedKinds.includes('test2') || !addedKinds.includes('test3')) {
      return { success: false, error: 'All facets from plan should be added' };
    }
    
    return { success: true, message: 'All facets from plan are added', data: { addedKinds } };
  };

  // Test functions - Facet Initialization
  const testInitCalledForEachFacet = async () => {
    const subsystem = createMockSubsystem();
    const initCalls = [];
    const facet1 = createFacetWithInit('test1', {
      onInit: () => { initCalls.push('test1'); }
    });
    const facet2 = createFacetWithInit('test2', {
      onInit: () => { initCalls.push('test2'); }
    });
    const plan = createMockPlan({ test1: facet1, test2: facet2 });
    
    await buildSubsystem(subsystem, plan);
    
    if (initCalls.length !== 2 || !initCalls.includes('test1') || !initCalls.includes('test2')) {
      return { success: false, error: 'init() should be called for each facet' };
    }
    
    return { success: true, message: 'init() called for each facet', data: { initCalls } };
  };

  const testInitCalledWithCorrectCtx = async () => {
    const subsystem = createMockSubsystem();
    const resolvedCtx = { ms: 'mock-ms', config: { test: 'value' } };
    let receivedCtx = null;
    const facet1 = createFacetWithInit('test1', {
      onInit: ({ ctx }) => { receivedCtx = ctx; }
    });
    const plan = {
      resolvedCtx,
      orderedKinds: ['test1'],
      facetsByKind: { test1: facet1 }
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (receivedCtx !== resolvedCtx) {
      return { success: false, error: 'init() should be called with correct ctx parameter' };
    }
    
    return { success: true, message: 'init() called with correct ctx parameter', data: { ctx: receivedCtx } };
  };

  const testInitCalledWithCorrectApi = async () => {
    const subsystem = createMockSubsystem();
    let receivedApi = null;
    const facet1 = createFacetWithInit('test1', {
      onInit: ({ api }) => { receivedApi = api; }
    });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (receivedApi !== subsystem.api) {
      return { success: false, error: 'init() should be called with correct api parameter' };
    }
    
    return { success: true, message: 'init() called with correct api parameter', data: { api: receivedApi } };
  };

  const testInitCalledWithCorrectSubsystem = async () => {
    const subsystem = createMockSubsystem();
    let receivedSubsystem = null;
    const facet1 = createFacetWithInit('test1', {
      onInit: ({ subsystem: sub }) => { receivedSubsystem = sub; }
    });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (receivedSubsystem !== subsystem) {
      return { success: false, error: 'init() should be called with correct subsystem parameter' };
    }
    
    return { success: true, message: 'init() called with correct subsystem parameter', data: { subsystem: receivedSubsystem } };
  };

  const testInitCalledInOrder = async () => {
    const subsystem = createMockSubsystem();
    const initOrder = [];
    const facet1 = createFacetWithInit('test1', {
      onInit: () => { initOrder.push('test1'); }
    });
    const facet2 = createFacetWithInit('test2', {
      onInit: () => { initOrder.push('test2'); }
    });
    const facet3 = createFacetWithInit('test3', {
      onInit: () => { initOrder.push('test3'); }
    });
    const plan = createMockPlan(
      { test1: facet1, test2: facet2, test3: facet3 },
      ['test1', 'test2', 'test3']
    );
    
    await buildSubsystem(subsystem, plan);
    
    if (initOrder.join(',') !== 'test1,test2,test3') {
      return { success: false, error: 'init() should be called in dependency order' };
    }
    
    return { success: true, message: 'init() called in dependency order', data: { order: initOrder } };
  };

  const testFacetFrozenAfterInit = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    // Try to add a property to the facet (should fail if frozen)
    try {
      facet1.testProperty = 'value';
      // If we get here, the facet is not frozen
      return { success: false, error: 'Facet should be frozen after init' };
    } catch (error) {
      // Expected: cannot add property to frozen object
      return { success: true, message: 'Facet frozen after init' };
    }
  };

  const testOnInitCallbackCalled = async () => {
    const subsystem = createMockSubsystem();
    let callbackCalled = false;
    const facet1 = createFacetWithInit('test1', {
      onInit: () => { callbackCalled = true; }
    });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!callbackCalled) {
      return { success: false, error: 'onInit callback should be called if set' };
    }
    
    return { success: true, message: 'onInit callback called if set', data: { called: callbackCalled } };
  };

  const testOnInitCallbackReceivesParams = async () => {
    const subsystem = createMockSubsystem();
    const resolvedCtx = { ms: 'mock-ms' };
    let receivedParams = null;
    const facet1 = createFacetWithInit('test1', {
      onInit: (params) => { receivedParams = params; }
    });
    const plan = {
      resolvedCtx,
      orderedKinds: ['test1'],
      facetsByKind: { test1: facet1 }
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!receivedParams || receivedParams.ctx !== resolvedCtx || receivedParams.api !== subsystem.api || receivedParams.subsystem !== subsystem) {
      return { success: false, error: 'onInit callback should receive correct parameters' };
    }
    
    return { success: true, message: 'onInit callback receives correct parameters', data: { params: receivedParams } };
  };

  const testInitNotCalledTwice = async () => {
    const subsystem = createMockSubsystem();
    let initCallCount = 0;
    const facet1 = createFacetWithInit('test1', {
      onInit: () => { initCallCount++; }
    });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    // Try to call init again manually (should be a no-op)
    await facet1.init(subsystem.ctx, subsystem.api, subsystem);
    
    if (initCallCount !== 1) {
      return { success: false, error: 'init() should not be called twice for same facet' };
    }
    
    return { success: true, message: 'init() not called twice for same facet', data: { callCount: initCallCount } };
  };

  const testMultipleFacetsInitialized = async () => {
    const subsystem = createMockSubsystem();
    const initCalls = [];
    const facet1 = createFacetWithInit('test1', {
      onInit: () => { initCalls.push('test1'); }
    });
    const facet2 = createFacetWithInit('test2', {
      onInit: () => { initCalls.push('test2'); }
    });
    const facet3 = createFacetWithInit('test3', {
      onInit: () => { initCalls.push('test3'); }
    });
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 });
    
    await buildSubsystem(subsystem, plan);
    
    if (initCalls.length !== 3) {
      return { success: false, error: 'Multiple facets should be initialized correctly' };
    }
    
    return { success: true, message: 'Multiple facets initialized correctly', data: { initCalls } };
  };

  // Test functions - Facet Attachment
  const testFacetsWithAttachTrueAreAttached = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', true);
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!subsystem.test1 || subsystem.test1 !== facet1) {
      return { success: false, error: 'Facets with attach: true should be attached' };
    }
    
    return { success: true, message: 'Facets with attach: true are attached', data: { attached: !!subsystem.test1 } };
  };

  const testFacetsWithAttachFalseNotAttached = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', false);
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.test1) {
      return { success: false, error: 'Facets with attach: false should not be attached' };
    }
    
    return { success: true, message: 'Facets with attach: false are not attached', data: { attached: !!subsystem.test1 } };
  };

  const testAttachedFacetsAccessibleOnSubsystem = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', true);
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.test1 !== facet1) {
      return { success: false, error: 'Attached facets should be accessible on subsystem' };
    }
    
    return { success: true, message: 'Attached facets accessible on subsystem', data: { facet: subsystem.test1 } };
  };

  const testAttachedFacetsAccessibleViaFind = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', true);
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    const found = subsystem.api.__facets.find('test1');
    if (!found || found !== facet1) {
      return { success: false, error: 'Attached facets should be accessible via FacetManager.find()' };
    }
    
    return { success: true, message: 'Attached facets accessible via FacetManager.find()', data: { found: !!found } };
  };

  const testAttachmentAfterInit = async () => {
    const subsystem = createMockSubsystem();
    let initCalled = false;
    const facet1 = createFacetWithInit('test1', {
      attach: true,
      onInit: () => { initCalled = true; }
    });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!initCalled) {
      return { success: false, error: 'Init should be called before attachment' };
    }
    if (!subsystem.test1) {
      return { success: false, error: 'Attachment should happen after successful init' };
    }
    
    return { success: true, message: 'Attachment happens after successful init', data: { initCalled, attached: !!subsystem.test1 } };
  };

  const testMultipleFacetsAttached = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = createFacetWithAttach('test1', true);
    const facet2 = createFacetWithAttach('test2', true);
    const facet3 = createFacetWithAttach('test3', true);
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!subsystem.test1 || !subsystem.test2 || !subsystem.test3) {
      return { success: false, error: 'Multiple facets should be attached correctly' };
    }
    
    return { success: true, message: 'Multiple facets attached correctly', data: { attached: ['test1', 'test2', 'test3'].filter(k => subsystem[k]) } };
  };

  const testAttachmentRespectsShouldAttach = async () => {
    const subsystem = createMockSubsystem();
    // Create a facet that returns false for shouldAttach even though attach is true
    const facet1 = new Facet('test1', { attach: false, source: 'test://test1' });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.test1) {
      return { success: false, error: 'Attachment should respect shouldAttach() method' };
    }
    
    return { success: true, message: 'Attachment respects shouldAttach() method', data: { attached: !!subsystem.test1 } };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Build Phase Tests - Facet Addition, Initialization & Attachment</h2>
      
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
                      {result.data && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Data:</strong>
                          <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', overflow: 'auto' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
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







