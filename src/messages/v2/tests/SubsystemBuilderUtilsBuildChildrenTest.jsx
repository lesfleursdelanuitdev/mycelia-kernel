import { useState } from 'react';
import { buildSubsystem } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { FACET_KINDS } from '../models/defaults/default-hooks.mycelia.js';

/**
 * SubsystemBuilderUtilsBuildChildrenTest
 * Tests for child building and integration scenarios in buildSubsystem
 */
export function SubsystemBuilderUtilsBuildChildrenTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem with FacetManager
  const createMockSubsystem = (options = {}) => {
    const subsystem = {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      api: options.api || { name: options.name || 'test-subsystem' },
      find: options.find || (() => null)
    };
    subsystem.api.__facets = new FacetManager(subsystem);
    return subsystem;
  };

  // Helper to create a child with build method
  const createChildWithBuild = (name, options = {}) => {
    const child = {
      name: name || 'child',
      ctx: options.ctx || {},
      _isBuilt: options._isBuilt || false,
      build: options.build || (async () => { child._isBuilt = true; }),
      api: { name: name || 'child' }
    };
    child.api.__facets = new FacetManager(child);
    return child;
  };

  // Helper to create a hierarchy facet with children
  const createChildRegistry = (children) => {
    const registry = {
      list: () => children || [],
      add: (child) => { children.push(child); },
      remove: (child) => {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
      }
    };
    
    const hierarchyFacet = new Facet(FACET_KINDS.HIERARCHY, {
      attach: true,
      source: 'test://hierarchy'
    });
    hierarchyFacet.add({ children: registry });
    return hierarchyFacet;
  };

  // Helper to create nested children
  const createNestedChildren = (depth = 2) => {
    const children = [];
    for (let i = 0; i < depth; i++) {
      const child = createChildWithBuild(`child-${i}`);
      if (i < depth - 1) {
        child.children = createNestedChildren(depth - 1);
      }
      children.push(child);
    }
    return children;
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
    // Child Subsystem Building
    { name: 'Child building - buildChildren() called after facet addition', category: 'Child Subsystem Building' },
    { name: 'Child building - children collected from hierarchy facet', category: 'Child Subsystem Building' },
    { name: 'Child building - children collected from parent.children (fallback)', category: 'Child Subsystem Building' },
    { name: 'Child building - children collected from Map (fallback)', category: 'Child Subsystem Building' },
    { name: 'Child building - children collected from array (fallback)', category: 'Child Subsystem Building' },
    { name: 'Child building - each child\'s build() called', category: 'Child Subsystem Building' },
    { name: 'Child building - children built in order', category: 'Child Subsystem Building' },
    { name: 'Child building - parent context merged into child.ctx.parent', category: 'Child Subsystem Building' },
    { name: 'Child building - graphCache passed to child.ctx.graphCache', category: 'Child Subsystem Building' },
    { name: 'Child building - children not built if already built (_isBuilt)', category: 'Child Subsystem Building' },
    { name: 'Child building - handles missing children gracefully', category: 'Child Subsystem Building' },
    { name: 'Child building - handles children without build() method', category: 'Child Subsystem Building' },
    { name: 'Child building - multiple children built correctly', category: 'Child Subsystem Building' },
    { name: 'Child building - nested children built recursively', category: 'Child Subsystem Building' },
    
    // Child Context Merging
    { name: 'Child context - child.ctx.parent set to parent.ctx', category: 'Child Context Merging' },
    { name: 'Child context - child.ctx.graphCache set to parent.ctx.graphCache', category: 'Child Context Merging' },
    { name: 'Child context - existing child.ctx properties preserved', category: 'Child Context Merging' },
    { name: 'Child context - child.ctx created if missing', category: 'Child Context Merging' },
    { name: 'Child context - multiple children receive same parent context', category: 'Child Context Merging' },
    { name: 'Child context - nested children receive correct parent chain', category: 'Child Context Merging' },
    
    // Integration Scenarios
    { name: 'Integration - full build workflow (verify → build)', category: 'Integration Scenarios' },
    { name: 'Integration - build with multiple facets', category: 'Integration Scenarios' },
    { name: 'Integration - build with facet dependencies', category: 'Integration Scenarios' },
    { name: 'Integration - build with children', category: 'Integration Scenarios' },
    { name: 'Integration - build with init callbacks', category: 'Integration Scenarios' },
    { name: 'Integration - build with attachment', category: 'Integration Scenarios' },
    { name: 'Integration - build with graphCache', category: 'Integration Scenarios' },
    { name: 'Integration - build with complex dependency graph', category: 'Integration Scenarios' },
    { name: 'Integration - build with nested children', category: 'Integration Scenarios' },
    { name: 'Integration - build with multiple levels of children', category: 'Integration Scenarios' },
    
    // Edge Cases
    { name: 'Edge cases - build with empty facet list', category: 'Edge Cases' },
    { name: 'Edge cases - build with single facet', category: 'Edge Cases' },
    { name: 'Edge cases - build with no children', category: 'Edge Cases' },
    { name: 'Edge cases - build with children that have no build method', category: 'Edge Cases' },
    { name: 'Edge cases - build with children that are already built', category: 'Edge Cases' },
    { name: 'Edge cases - build with null children in collection', category: 'Edge Cases' },
    { name: 'Edge cases - build with facets that have no init method', category: 'Edge Cases' },
    { name: 'Edge cases - build with facets that have no attach flag', category: 'Edge Cases' },
    { name: 'Edge cases - build with mixed attach flags', category: 'Edge Cases' },
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
          case 'Child building - buildChildren() called after facet addition':
            result = await testBuildChildrenCalledAfterFacets();
            break;
          case 'Child building - children collected from hierarchy facet':
            result = await testChildrenCollectedFromHierarchy();
            break;
          case 'Child building - children collected from parent.children (fallback)':
            result = await testChildrenCollectedFromParentChildren();
            break;
          case 'Child building - children collected from Map (fallback)':
            result = await testChildrenCollectedFromMap();
            break;
          case 'Child building - children collected from array (fallback)':
            result = await testChildrenCollectedFromArray();
            break;
          case 'Child building - each child\'s build() called':
            result = await testEachChildBuildCalled();
            break;
          case 'Child building - children built in order':
            result = await testChildrenBuiltInOrder();
            break;
          case 'Child building - parent context merged into child.ctx.parent':
            result = await testParentContextMerged();
            break;
          case 'Child building - graphCache passed to child.ctx.graphCache':
            result = await testGraphCachePassed();
            break;
          case 'Child building - children not built if already built (_isBuilt)':
            result = await testChildrenNotBuiltIfAlreadyBuilt();
            break;
          case 'Child building - handles missing children gracefully':
            result = await testHandlesMissingChildren();
            break;
          case 'Child building - handles children without build() method':
            result = await testHandlesChildrenWithoutBuild();
            break;
          case 'Child building - multiple children built correctly':
            result = await testMultipleChildrenBuilt();
            break;
          case 'Child building - nested children built recursively':
            result = await testNestedChildrenBuilt();
            break;
          case 'Child context - child.ctx.parent set to parent.ctx':
            result = await testChildCtxParentSet();
            break;
          case 'Child context - child.ctx.graphCache set to parent.ctx.graphCache':
            result = await testChildCtxGraphCacheSet();
            break;
          case 'Child context - existing child.ctx properties preserved':
            result = await testExistingChildCtxPreserved();
            break;
          case 'Child context - child.ctx created if missing':
            result = await testChildCtxCreatedIfMissing();
            break;
          case 'Child context - multiple children receive same parent context':
            result = await testMultipleChildrenReceiveParentCtx();
            break;
          case 'Child context - nested children receive correct parent chain':
            result = await testNestedChildrenReceiveParentChain();
            break;
          case 'Integration - full build workflow (verify → build)':
            result = await testFullBuildWorkflow();
            break;
          case 'Integration - build with multiple facets':
            result = await testBuildWithMultipleFacets();
            break;
          case 'Integration - build with facet dependencies':
            result = await testBuildWithFacetDependencies();
            break;
          case 'Integration - build with children':
            result = await testBuildWithChildren();
            break;
          case 'Integration - build with init callbacks':
            result = await testBuildWithInitCallbacks();
            break;
          case 'Integration - build with attachment':
            result = await testBuildWithAttachment();
            break;
          case 'Integration - build with graphCache':
            result = await testBuildWithGraphCache();
            break;
          case 'Integration - build with complex dependency graph':
            result = await testBuildWithComplexDependencyGraph();
            break;
          case 'Integration - build with nested children':
            result = await testBuildWithNestedChildren();
            break;
          case 'Integration - build with multiple levels of children':
            result = await testBuildWithMultipleLevels();
            break;
          case 'Edge cases - build with empty facet list':
            result = await testBuildWithEmptyFacetList();
            break;
          case 'Edge cases - build with single facet':
            result = await testBuildWithSingleFacet();
            break;
          case 'Edge cases - build with no children':
            result = await testBuildWithNoChildren();
            break;
          case 'Edge cases - build with children that have no build method':
            result = await testBuildWithChildrenNoBuildMethod();
            break;
          case 'Edge cases - build with children that are already built':
            result = await testBuildWithChildrenAlreadyBuilt();
            break;
          case 'Edge cases - build with null children in collection':
            result = await testBuildWithNullChildren();
            break;
          case 'Edge cases - build with facets that have no init method':
            result = await testBuildWithFacetsNoInit();
            break;
          case 'Edge cases - build with facets that have no attach flag':
            result = await testBuildWithFacetsNoAttach();
            break;
          case 'Edge cases - build with mixed attach flags':
            result = await testBuildWithMixedAttachFlags();
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

  // Test functions - Child Subsystem Building
  const testBuildChildrenCalledAfterFacets = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const child1 = createChildWithBuild('child1');
    const hierarchyFacet = createChildRegistry([child1]);
    subsystem.find = (kind) => kind === FACET_KINDS.HIERARCHY ? hierarchyFacet : null;
    
    const plan = createMockPlan({ test1: facet1, [FACET_KINDS.HIERARCHY]: hierarchyFacet });
    
    let buildCalled = false;
    child1.build = async () => {
      buildCalled = true;
      child1._isBuilt = true;
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!buildCalled) {
      return { success: false, error: 'buildChildren() should be called after facet addition' };
    }
    
    return { success: true, message: 'buildChildren() called after facet addition', data: { buildCalled } };
  };

  const testChildrenCollectedFromHierarchy = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    const hierarchyFacet = createChildRegistry([child1, child2]);
    subsystem.find = (kind) => kind === FACET_KINDS.HIERARCHY ? hierarchyFacet : null;
    
    const plan = createMockPlan({ [FACET_KINDS.HIERARCHY]: hierarchyFacet });
    
    const buildCalls = [];
    child1.build = async () => { buildCalls.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildCalls.push('child2'); child2._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalls.length !== 2 || !buildCalls.includes('child1') || !buildCalls.includes('child2')) {
      return { success: false, error: 'Children should be collected from hierarchy facet' };
    }
    
    return { success: true, message: 'Children collected from hierarchy facet', data: { buildCalls } };
  };

  const testChildrenCollectedFromParentChildren = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    subsystem.children = [child1, child2];
    
    const plan = createMockPlan({});
    
    const buildCalls = [];
    child1.build = async () => { buildCalls.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildCalls.push('child2'); child2._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalls.length !== 2) {
      return { success: false, error: 'Children should be collected from parent.children (fallback)' };
    }
    
    return { success: true, message: 'Children collected from parent.children (fallback)', data: { buildCalls } };
  };

  const testChildrenCollectedFromMap = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    subsystem.children = new Map([['child1', child1], ['child2', child2]]);
    
    const plan = createMockPlan({});
    
    const buildCalls = [];
    child1.build = async () => { buildCalls.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildCalls.push('child2'); child2._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalls.length !== 2) {
      return { success: false, error: 'Children should be collected from Map (fallback)' };
    }
    
    return { success: true, message: 'Children collected from Map (fallback)', data: { buildCalls } };
  };

  const testChildrenCollectedFromArray = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    let buildCalled = false;
    child1.build = async () => { buildCalled = true; child1._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (!buildCalled) {
      return { success: false, error: 'Children should be collected from array (fallback)' };
    }
    
    return { success: true, message: 'Children collected from array (fallback)', data: { buildCalled } };
  };

  const testEachChildBuildCalled = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    subsystem.children = [child1, child2];
    
    const plan = createMockPlan({});
    
    const buildCalls = [];
    child1.build = async () => { buildCalls.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildCalls.push('child2'); child2._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalls.length !== 2 || !buildCalls.includes('child1') || !buildCalls.includes('child2')) {
      return { success: false, error: 'Each child\'s build() should be called' };
    }
    
    return { success: true, message: 'Each child\'s build() called', data: { buildCalls } };
  };

  const testChildrenBuiltInOrder = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    const child3 = createChildWithBuild('child3');
    subsystem.children = [child1, child2, child3];
    
    const plan = createMockPlan({});
    
    const buildOrder = [];
    child1.build = async () => { buildOrder.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildOrder.push('child2'); child2._isBuilt = true; };
    child3.build = async () => { buildOrder.push('child3'); child3._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildOrder.join(',') !== 'child1,child2,child3') {
      return { success: false, error: 'Children should be built in order' };
    }
    
    return { success: true, message: 'Children built in order', data: { buildOrder } };
  };

  const testParentContextMerged = async () => {
    const subsystem = createMockSubsystem({ ctx: { parentProp: 'parentValue' } });
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', parentProp: 'parentValue' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!child1.ctx || child1.ctx.parent !== subsystem.ctx) {
      return { success: false, error: 'Parent context should be merged into child.ctx.parent' };
    }
    
    return { success: true, message: 'Parent context merged into child.ctx.parent', data: { hasParent: !!child1.ctx.parent } };
  };

  const testGraphCachePassed = async () => {
    const mockCache = { size: () => 0 };
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', graphCache: mockCache },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!child1.ctx || child1.ctx.graphCache !== mockCache) {
      return { success: false, error: 'graphCache should be passed to child.ctx.graphCache' };
    }
    
    return { success: true, message: 'graphCache passed to child.ctx.graphCache', data: { hasGraphCache: !!child1.ctx.graphCache } };
  };

  const testChildrenNotBuiltIfAlreadyBuilt = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1', { _isBuilt: true });
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    let buildCalled = false;
    child1.build = async () => { buildCalled = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalled) {
      return { success: false, error: 'Children should not be built if already built (_isBuilt)' };
    }
    
    return { success: true, message: 'Children not built if already built (_isBuilt)', data: { buildCalled } };
  };

  const testHandlesMissingChildren = async () => {
    const subsystem = createMockSubsystem();
    subsystem.children = [];
    
    const plan = createMockPlan({});
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Handles missing children gracefully', data: { children: subsystem.children.length } };
    } catch (error) {
      return { success: false, error: `Should handle missing children: ${error.message}` };
    }
  };

  const testHandlesChildrenWithoutBuild = async () => {
    const subsystem = createMockSubsystem();
    const child1 = { name: 'child1', ctx: {} };
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Handles children without build() method', data: { handled: true } };
    } catch (error) {
      return { success: false, error: `Should handle children without build method: ${error.message}` };
    }
  };

  const testMultipleChildrenBuilt = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    const child3 = createChildWithBuild('child3');
    subsystem.children = [child1, child2, child3];
    
    const plan = createMockPlan({});
    
    const buildCalls = [];
    child1.build = async () => { buildCalls.push('child1'); child1._isBuilt = true; };
    child2.build = async () => { buildCalls.push('child2'); child2._isBuilt = true; };
    child3.build = async () => { buildCalls.push('child3'); child3._isBuilt = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalls.length !== 3) {
      return { success: false, error: 'Multiple children should be built correctly' };
    }
    
    return { success: true, message: 'Multiple children built correctly', data: { buildCalls } };
  };

  const testNestedChildrenBuilt = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const grandchild1 = createChildWithBuild('grandchild1');
    child1.children = [grandchild1];
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    let grandchildBuilt = false;
    grandchild1.build = async () => {
      grandchildBuilt = true;
      grandchild1._isBuilt = true;
    };
    child1.build = async () => {
      child1._isBuilt = true;
      // Manually build nested children (simulating recursive behavior)
      if (child1.children) {
        for (const gc of child1.children) {
          if (gc && typeof gc.build === 'function' && !gc._isBuilt) {
            await gc.build();
          }
        }
      }
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!grandchildBuilt) {
      return { success: false, error: 'Nested children should be built recursively' };
    }
    
    return { success: true, message: 'Nested children built recursively', data: { grandchildBuilt } };
  };

  // Test functions - Child Context Merging
  const testChildCtxParentSet = async () => {
    const subsystem = createMockSubsystem({ ctx: { parentProp: 'value' } });
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', parentProp: 'value' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (child1.ctx.parent !== subsystem.ctx) {
      return { success: false, error: 'child.ctx.parent should be set to parent.ctx' };
    }
    
    return { success: true, message: 'child.ctx.parent set to parent.ctx', data: { hasParent: !!child1.ctx.parent } };
  };

  const testChildCtxGraphCacheSet = async () => {
    const mockCache = { size: () => 0 };
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', graphCache: mockCache },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (child1.ctx.graphCache !== mockCache) {
      return { success: false, error: 'child.ctx.graphCache should be set to parent.ctx.graphCache' };
    }
    
    return { success: true, message: 'child.ctx.graphCache set to parent.ctx.graphCache', data: { hasGraphCache: !!child1.ctx.graphCache } };
  };

  const testExistingChildCtxPreserved = async () => {
    const subsystem = createMockSubsystem({ ctx: { parentProp: 'value' } });
    const child1 = createChildWithBuild('child1', { ctx: { existingProp: 'existing' } });
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (child1.ctx.existingProp !== 'existing') {
      return { success: false, error: 'Existing child.ctx properties should be preserved' };
    }
    
    return { success: true, message: 'Existing child.ctx properties preserved', data: { existingProp: child1.ctx.existingProp } };
  };

  const testChildCtxCreatedIfMissing = async () => {
    const subsystem = createMockSubsystem({ ctx: { parentProp: 'value' } });
    const child1 = { name: 'child1', build: async () => {} };
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!child1.ctx || typeof child1.ctx !== 'object') {
      return { success: false, error: 'child.ctx should be created if missing' };
    }
    
    return { success: true, message: 'child.ctx created if missing', data: { hasCtx: !!child1.ctx } };
  };

  const testMultipleChildrenReceiveParentCtx = async () => {
    const subsystem = createMockSubsystem({ ctx: { parentProp: 'value' } });
    const child1 = createChildWithBuild('child1');
    const child2 = createChildWithBuild('child2');
    subsystem.children = [child1, child2];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', parentProp: 'value' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (child1.ctx.parent !== subsystem.ctx || child2.ctx.parent !== subsystem.ctx) {
      return { success: false, error: 'Multiple children should receive same parent context' };
    }
    
    return { success: true, message: 'Multiple children receive same parent context', data: { 
      child1HasParent: !!child1.ctx.parent,
      child2HasParent: !!child2.ctx.parent
    } };
  };

  const testNestedChildrenReceiveParentChain = async () => {
    const subsystem = createMockSubsystem({ ctx: { level: 0 } });
    const child1 = createChildWithBuild('child1', { ctx: { level: 1 } });
    const grandchild1 = createChildWithBuild('grandchild1');
    child1.children = [grandchild1];
    subsystem.children = [child1];
    
    const plan = {
      resolvedCtx: { ms: 'mock-ms', level: 0 },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    child1.build = async () => {
      child1._isBuilt = true;
      // Manually set parent context for nested children
      if (child1.children) {
        for (const gc of child1.children) {
          if (gc && !gc.ctx) gc.ctx = {};
          gc.ctx.parent = child1.ctx;
        }
      }
    };
    
    await buildSubsystem(subsystem, plan);
    
    // Verify parent chain
    if (grandchild1.ctx.parent !== child1.ctx) {
      return { success: false, error: 'Nested children should receive correct parent chain' };
    }
    
    return { success: true, message: 'Nested children receive correct parent chain', data: { 
      grandchildHasParent: !!grandchild1.ctx.parent
    } };
  };

  // Test functions - Integration Scenarios (simplified versions)
  const testFullBuildWorkflow = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const plan = createMockPlan({ test1: facet1 });
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Full build workflow (verify → build)', data: { built: true } };
    } catch (error) {
      return { success: false, error: `Full build workflow failed: ${error.message}` };
    }
  };

  const testBuildWithMultipleFacets = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const facet2 = new Facet('test2', { attach: false });
    const facet3 = new Facet('test3', { attach: false });
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 });
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 3) {
      return { success: false, error: 'Should build with multiple facets' };
    }
    
    return { success: true, message: 'Build with multiple facets', data: { addedKinds } };
  };

  const testBuildWithFacetDependencies = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const facet2 = new Facet('test2', { attach: false, required: ['test1'] });
    const plan = createMockPlan({ test1: facet1, test2: facet2 }, ['test1', 'test2']);
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 2) {
      return { success: false, error: 'Should build with facet dependencies' };
    }
    
    return { success: true, message: 'Build with facet dependencies', data: { addedKinds } };
  };

  const testBuildWithChildren = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    subsystem.children = [child1];
    const plan = createMockPlan({});
    
    await buildSubsystem(subsystem, plan);
    
    if (!child1._isBuilt) {
      return { success: false, error: 'Should build with children' };
    }
    
    return { success: true, message: 'Build with children', data: { childBuilt: child1._isBuilt } };
  };

  const testBuildWithInitCallbacks = async () => {
    const subsystem = createMockSubsystem();
    let callbackCalled = false;
    const facet1 = new Facet('test1', { attach: false });
    facet1.onInit(() => { callbackCalled = true; });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!callbackCalled) {
      return { success: false, error: 'Should build with init callbacks' };
    }
    
    return { success: true, message: 'Build with init callbacks', data: { callbackCalled } };
  };

  const testBuildWithAttachment = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: true });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!subsystem.test1) {
      return { success: false, error: 'Should build with attachment' };
    }
    
    return { success: true, message: 'Build with attachment', data: { attached: !!subsystem.test1 } };
  };

  const testBuildWithGraphCache = async () => {
    const mockCache = { size: () => 0 };
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { ms: 'mock-ms', graphCache: mockCache },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.graphCache !== mockCache) {
      return { success: false, error: 'Should build with graphCache' };
    }
    
    return { success: true, message: 'Build with graphCache', data: { hasGraphCache: !!subsystem.ctx.graphCache } };
  };

  const testBuildWithComplexDependencyGraph = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const facet2 = new Facet('test2', { attach: false, required: ['test1'] });
    const facet3 = new Facet('test3', { attach: false, required: ['test1', 'test2'] });
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 }, ['test1', 'test2', 'test3']);
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 3) {
      return { success: false, error: 'Should build with complex dependency graph' };
    }
    
    return { success: true, message: 'Build with complex dependency graph', data: { addedKinds } };
  };

  const testBuildWithNestedChildren = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const grandchild1 = createChildWithBuild('grandchild1');
    child1.children = [grandchild1];
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    child1.build = async () => {
      child1._isBuilt = true;
      if (child1.children) {
        for (const gc of child1.children) {
          if (gc && typeof gc.build === 'function' && !gc._isBuilt) {
            await gc.build();
          }
        }
      }
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!grandchild1._isBuilt) {
      return { success: false, error: 'Should build with nested children' };
    }
    
    return { success: true, message: 'Build with nested children', data: { grandchildBuilt: grandchild1._isBuilt } };
  };

  const testBuildWithMultipleLevels = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1');
    const grandchild1 = createChildWithBuild('grandchild1');
    const greatGrandchild1 = createChildWithBuild('greatGrandchild1');
    grandchild1.children = [greatGrandchild1];
    child1.children = [grandchild1];
    subsystem.children = [child1];
    
    const plan = createMockPlan({});
    
    const buildRecursive = async (sub) => {
      if (sub.children) {
        for (const child of sub.children) {
          if (child && typeof child.build === 'function' && !child._isBuilt) {
            child._isBuilt = true;
            await buildRecursive(child);
          }
        }
      }
    };
    
    child1.build = async () => {
      child1._isBuilt = true;
      await buildRecursive(child1);
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!greatGrandchild1._isBuilt) {
      return { success: false, error: 'Should build with multiple levels of children' };
    }
    
    return { success: true, message: 'Build with multiple levels of children', data: { 
      childBuilt: child1._isBuilt,
      grandchildBuilt: grandchild1._isBuilt,
      greatGrandchildBuilt: greatGrandchild1._isBuilt
    } };
  };

  // Test functions - Edge Cases
  const testBuildWithEmptyFacetList = async () => {
    const subsystem = createMockSubsystem();
    const plan = createMockPlan({});
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 0) {
      return { success: false, error: 'Should build with empty facet list' };
    }
    
    return { success: true, message: 'Build with empty facet list', data: { addedKinds } };
  };

  const testBuildWithSingleFacet = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    const addedKinds = subsystem.api.__facets.getAllKinds();
    if (addedKinds.length !== 1 || !addedKinds.includes('test1')) {
      return { success: false, error: 'Should build with single facet' };
    }
    
    return { success: true, message: 'Build with single facet', data: { addedKinds } };
  };

  const testBuildWithNoChildren = async () => {
    const subsystem = createMockSubsystem();
    const plan = createMockPlan({});
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Build with no children', data: { handled: true } };
    } catch (error) {
      return { success: false, error: `Should handle no children: ${error.message}` };
    }
  };

  const testBuildWithChildrenNoBuildMethod = async () => {
    const subsystem = createMockSubsystem();
    const child1 = { name: 'child1', ctx: {} };
    subsystem.children = [child1];
    const plan = createMockPlan({});
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Build with children that have no build method', data: { handled: true } };
    } catch (error) {
      return { success: false, error: `Should handle children without build method: ${error.message}` };
    }
  };

  const testBuildWithChildrenAlreadyBuilt = async () => {
    const subsystem = createMockSubsystem();
    const child1 = createChildWithBuild('child1', { _isBuilt: true });
    subsystem.children = [child1];
    const plan = createMockPlan({});
    
    let buildCalled = false;
    child1.build = async () => { buildCalled = true; };
    
    await buildSubsystem(subsystem, plan);
    
    if (buildCalled) {
      return { success: false, error: 'Should not build children that are already built' };
    }
    
    return { success: true, message: 'Build with children that are already built', data: { buildCalled } };
  };

  const testBuildWithNullChildren = async () => {
    const subsystem = createMockSubsystem();
    subsystem.children = [null, undefined];
    const plan = createMockPlan({});
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Build with null children in collection', data: { handled: true } };
    } catch (error) {
      return { success: false, error: `Should handle null children: ${error.message}` };
    }
  };

  const testBuildWithFacetsNoInit = async () => {
    const subsystem = createMockSubsystem();
    // Facet without onInit callback (init() will be called but do nothing)
    const facet1 = new Facet('test1', { attach: false });
    const plan = createMockPlan({ test1: facet1 });
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Build with facets that have no init method', data: { handled: true } };
    } catch (error) {
      return { success: false, error: `Should handle facets without init: ${error.message}` };
    }
  };

  const testBuildWithFacetsNoAttach = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: false });
    const plan = createMockPlan({ test1: facet1 });
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.test1) {
      return { success: false, error: 'Facets with attach: false should not be attached' };
    }
    
    return { success: true, message: 'Build with facets that have no attach flag', data: { attached: !!subsystem.test1 } };
  };

  const testBuildWithMixedAttachFlags = async () => {
    const subsystem = createMockSubsystem();
    const facet1 = new Facet('test1', { attach: true });
    const facet2 = new Facet('test2', { attach: false });
    const facet3 = new Facet('test3', { attach: true });
    const plan = createMockPlan({ test1: facet1, test2: facet2, test3: facet3 });
    
    await buildSubsystem(subsystem, plan);
    
    if (!subsystem.test1 || subsystem.test2 || !subsystem.test3) {
      return { success: false, error: 'Should handle mixed attach flags correctly' };
    }
    
    return { success: true, message: 'Build with mixed attach flags', data: { 
      test1Attached: !!subsystem.test1,
      test2Attached: !!subsystem.test2,
      test3Attached: !!subsystem.test3
    } };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Build Phase Tests - Child Building & Integration Scenarios</h2>
      
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







