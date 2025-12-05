import { useState } from 'react';
import { verifySubsystemBuild } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderUtilsVerificationDependenciesTest
 * Tests for dependency graph building and topological sort in verifySubsystemBuild
 */
export function SubsystemBuilderUtilsVerificationDependenciesTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createSubsystem = (options = {}) => {
    return {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      defaultHooks: options.defaultHooks || [],
      hooks: options.hooks || [],
      api: options.api || { name: options.name || 'test-subsystem' },
      ms: options.ms || null
    };
  };

  // Helper to create a simple mock hook
  const createMockHook = (kind, options = {}) => {
    return createHook({
      kind,
      overwrite: options.overwrite || false,
      required: options.required || [],
      attach: options.attach || false,
      source: options.source || `test://${kind}`,
      fn: (ctx, api, subsystem) => {
        const facet = new Facet(kind, {
          attach: options.attach || false,
          source: `test://${kind}`
        });
        // Add facet-level dependencies if provided
        if (options.facetDependencies) {
          options.facetDependencies.forEach(dep => facet.addDependency(dep));
        }
        return facet;
      }
    });
  };

  const testCases = [
    // Dependency Graph Building
    { name: 'Dependency graph - builds from hook.required', category: 'Dependency Graph' },
    { name: 'Dependency graph - builds from facet.getDependencies()', category: 'Dependency Graph' },
    { name: 'Dependency graph - combines hook and facet dependencies', category: 'Dependency Graph' },
    { name: 'Dependency graph - handles hooks with no dependencies', category: 'Dependency Graph' },
    { name: 'Dependency graph - handles facets with no dependencies', category: 'Dependency Graph' },
    { name: 'Dependency graph - validates dependency exists', category: 'Dependency Graph' },
    { name: 'Dependency graph - throws error for missing hook.required dependency', category: 'Dependency Graph' },
    { name: 'Dependency graph - throws error for missing facet dependency', category: 'Dependency Graph' },
    
    // Topological Sort
    { name: 'Topological sort - sorts independent facets', category: 'Topological Sort' },
    { name: 'Topological sort - sorts simple dependency chain', category: 'Topological Sort' },
    { name: 'Topological sort - sorts complex dependency graph', category: 'Topological Sort' },
    { name: 'Topological sort - respects dependency order', category: 'Topological Sort' },
    { name: 'Topological sort - handles multiple dependents', category: 'Topological Sort' },
    { name: 'Topological sort - handles multiple dependencies', category: 'Topological Sort' },
    
    // Cycle Detection
    { name: 'Cycle detection - detects simple cycle', category: 'Cycle Detection' },
    { name: 'Cycle detection - detects complex cycle', category: 'Cycle Detection' },
    { name: 'Cycle detection - throws error with cycle details', category: 'Cycle Detection' },
    { name: 'Cycle detection - identifies all nodes in cycle', category: 'Cycle Detection' },
    
    // Cache Integration
    { name: 'Cache - creates cache key from sorted facet kinds', category: 'Cache Integration' },
    { name: 'Cache - uses cached valid result', category: 'Cache Integration' },
    { name: 'Cache - throws cached error for invalid graph', category: 'Cache Integration' },
    { name: 'Cache - caches valid result after sort', category: 'Cache Integration' },
    { name: 'Cache - caches invalid result after cycle detection', category: 'Cache Integration' },
    { name: 'Cache - same facet kinds produce same cache key', category: 'Cache Integration' },
    { name: 'Cache - different facet kinds produce different cache keys', category: 'Cache Integration' },
    { name: 'Cache - works without cache (null)', category: 'Cache Integration' },
    
    // Return Value
    { name: 'Return value - includes resolvedCtx', category: 'Return Value' },
    { name: 'Return value - includes orderedKinds', category: 'Return Value' },
    { name: 'Return value - includes facetsByKind', category: 'Return Value' },
    { name: 'Return value - includes graphCache', category: 'Return Value' },
    { name: 'Return value - orderedKinds matches facetsByKind keys', category: 'Return Value' },
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
          case 'Dependency graph - builds from hook.required':
            result = testDependencyGraphFromHookRequired();
            break;
          case 'Dependency graph - builds from facet.getDependencies()':
            result = testDependencyGraphFromFacetDependencies();
            break;
          case 'Dependency graph - combines hook and facet dependencies':
            result = testDependencyGraphCombines();
            break;
          case 'Dependency graph - handles hooks with no dependencies':
            result = testDependencyGraphNoHookDeps();
            break;
          case 'Dependency graph - handles facets with no dependencies':
            result = testDependencyGraphNoFacetDeps();
            break;
          case 'Dependency graph - validates dependency exists':
            result = testDependencyGraphValidatesExists();
            break;
          case 'Dependency graph - throws error for missing hook.required dependency':
            result = testDependencyGraphMissingHookDep();
            break;
          case 'Dependency graph - throws error for missing facet dependency':
            result = testDependencyGraphMissingFacetDep();
            break;
          case 'Topological sort - sorts independent facets':
            result = testTopoSortIndependent();
            break;
          case 'Topological sort - sorts simple dependency chain':
            result = testTopoSortSimpleChain();
            break;
          case 'Topological sort - sorts complex dependency graph':
            result = testTopoSortComplex();
            break;
          case 'Topological sort - respects dependency order':
            result = testTopoSortRespectsOrder();
            break;
          case 'Topological sort - handles multiple dependents':
            result = testTopoSortMultipleDependents();
            break;
          case 'Topological sort - handles multiple dependencies':
            result = testTopoSortMultipleDependencies();
            break;
          case 'Cycle detection - detects simple cycle':
            result = testCycleDetectionSimple();
            break;
          case 'Cycle detection - detects complex cycle':
            result = testCycleDetectionComplex();
            break;
          case 'Cycle detection - throws error with cycle details':
            result = testCycleDetectionErrorDetails();
            break;
          case 'Cycle detection - identifies all nodes in cycle':
            result = testCycleDetectionIdentifiesNodes();
            break;
          case 'Cache - creates cache key from sorted facet kinds':
            result = testCacheCreatesKey();
            break;
          case 'Cache - uses cached valid result':
            result = testCacheUsesCachedValid();
            break;
          case 'Cache - throws cached error for invalid graph':
            result = testCacheThrowsCachedError();
            break;
          case 'Cache - caches valid result after sort':
            result = testCacheCachesValid();
            break;
          case 'Cache - caches invalid result after cycle detection':
            result = testCacheCachesInvalid();
            break;
          case 'Cache - same facet kinds produce same cache key':
            result = testCacheSameKey();
            break;
          case 'Cache - different facet kinds produce different cache keys':
            result = testCacheDifferentKeys();
            break;
          case 'Cache - works without cache (null)':
            result = testCacheWorksWithoutCache();
            break;
          case 'Return value - includes resolvedCtx':
            result = testReturnValueResolvedCtx();
            break;
          case 'Return value - includes orderedKinds':
            result = testReturnValueOrderedKinds();
            break;
          case 'Return value - includes facetsByKind':
            result = testReturnValueFacetsByKind();
            break;
          case 'Return value - includes graphCache':
            result = testReturnValueGraphCache();
            break;
          case 'Return value - orderedKinds matches facetsByKind keys':
            result = testReturnValueOrderedMatchesKeys();
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

  // Test functions
  const testDependencyGraphFromHookRequired = () => {
    const depHook = createMockHook('dependency');
    const hook = createMockHook('dependent', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [depHook, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    // dependent should come after dependency in orderedKinds
    const depIndex = plan.orderedKinds.indexOf('dependency');
    const depIndex2 = plan.orderedKinds.indexOf('dependent');
    
    if (depIndex === -1 || depIndex2 === -1) {
      return { success: false, error: 'Both facets should be present' };
    }
    if (depIndex >= depIndex2) {
      return { success: false, error: 'Dependent should come after dependency' };
    }
    
    return {
      success: true,
      message: 'Builds dependency graph from hook.required',
      data: { order: plan.orderedKinds }
    };
  };

  const testDependencyGraphFromFacetDependencies = () => {
    const depHook = createMockHook('dependency');
    const hook = createMockHook('dependent', { facetDependencies: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [depHook, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const depIndex = plan.orderedKinds.indexOf('dependency');
    const depIndex2 = plan.orderedKinds.indexOf('dependent');
    
    if (depIndex >= depIndex2) {
      return { success: false, error: 'Dependent should come after dependency' };
    }
    
    return {
      success: true,
      message: 'Builds dependency graph from facet.getDependencies()',
      data: { order: plan.orderedKinds }
    };
  };

  const testDependencyGraphCombines = () => {
    const dep1 = createMockHook('dep1');
    const dep2 = createMockHook('dep2');
    const hook = createMockHook('dependent', { 
      required: ['dep1'],
      facetDependencies: ['dep2']
    });
    const subsystem = createSubsystem({ defaultHooks: [dep1, dep2, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const dep1Index = plan.orderedKinds.indexOf('dep1');
    const dep2Index = plan.orderedKinds.indexOf('dep2');
    const depIndex2 = plan.orderedKinds.indexOf('dependent');
    
    if (dep1Index >= depIndex2 || dep2Index >= depIndex2) {
      return { success: false, error: 'Should combine hook and facet dependencies' };
    }
    
    return {
      success: true,
      message: 'Combines hook and facet dependencies',
      data: { order: plan.orderedKinds }
    };
  };

  const testDependencyGraphNoHookDeps = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.orderedKinds.length !== 2) {
      return { success: false, error: 'Should handle hooks with no dependencies' };
    }
    
    return {
      success: true,
      message: 'Handles hooks with no dependencies',
      data: { order: plan.orderedKinds }
    };
  };

  const testDependencyGraphNoFacetDeps = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.orderedKinds.length !== 2) {
      return { success: false, error: 'Should handle facets with no dependencies' };
    }
    
    return {
      success: true,
      message: 'Handles facets with no dependencies',
      data: { order: plan.orderedKinds }
    };
  };

  const testDependencyGraphValidatesExists = () => {
    const depHook = createMockHook('dependency');
    const hook = createMockHook('dependent', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [depHook, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['dependency'] || !plan.facetsByKind['dependent']) {
      return { success: false, error: 'Should validate dependencies exist' };
    }
    
    return {
      success: true,
      message: 'Validates dependency exists',
      data: { validated: true }
    };
  };

  const testDependencyGraphMissingHookDep = () => {
    const hook = createMockHook('test', { required: ['missing'] });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error for missing hook.required dependency' };
    } catch (error) {
      if (error.message.includes('requires missing facet')) {
        return { success: true, message: 'Throws error for missing hook.required dependency' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testDependencyGraphMissingFacetDep = () => {
    const hook = createMockHook('test', { facetDependencies: ['missing'] });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error for missing facet dependency' };
    } catch (error) {
      if (error.message.includes('depends on missing')) {
        return { success: true, message: 'Throws error for missing facet dependency' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testTopoSortIndependent = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const hook3 = createMockHook('hook3');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2, hook3] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.orderedKinds.length !== 3) {
      return { success: false, error: 'Should sort all independent facets' };
    }
    
    return {
      success: true,
      message: 'Sorts independent facets',
      data: { order: plan.orderedKinds }
    };
  };

  const testTopoSortSimpleChain = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const hook3 = createMockHook('hook3', { required: ['hook2'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2, hook3] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const idx1 = plan.orderedKinds.indexOf('hook1');
    const idx2 = plan.orderedKinds.indexOf('hook2');
    const idx3 = plan.orderedKinds.indexOf('hook3');
    
    if (idx1 >= idx2 || idx2 >= idx3) {
      return { success: false, error: 'Should sort simple dependency chain' };
    }
    
    return {
      success: true,
      message: 'Sorts simple dependency chain',
      data: { order: plan.orderedKinds }
    };
  };

  const testTopoSortComplex = () => {
    const a = createMockHook('a');
    const b = createMockHook('b', { required: ['a'] });
    const c = createMockHook('c', { required: ['a'] });
    const d = createMockHook('d', { required: ['b', 'c'] });
    const subsystem = createSubsystem({ defaultHooks: [a, b, c, d] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const idxA = plan.orderedKinds.indexOf('a');
    const idxB = plan.orderedKinds.indexOf('b');
    const idxC = plan.orderedKinds.indexOf('c');
    const idxD = plan.orderedKinds.indexOf('d');
    
    if (idxA >= idxB || idxA >= idxC || idxB >= idxD || idxC >= idxD) {
      return { success: false, error: 'Should sort complex dependency graph' };
    }
    
    return {
      success: true,
      message: 'Sorts complex dependency graph',
      data: { order: plan.orderedKinds }
    };
  };

  const testTopoSortRespectsOrder = () => {
    const dep = createMockHook('dependency');
    const dep2 = createMockHook('dependent', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [dep, dep2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const depIndex = plan.orderedKinds.indexOf('dependency');
    const depIndex2 = plan.orderedKinds.indexOf('dependent');
    
    if (depIndex >= depIndex2) {
      return { success: false, error: 'Should respect dependency order' };
    }
    
    return {
      success: true,
      message: 'Respects dependency order',
      data: { order: plan.orderedKinds }
    };
  };

  const testTopoSortMultipleDependents = () => {
    const dep = createMockHook('dependency');
    const dep1 = createMockHook('dependent1', { required: ['dependency'] });
    const dep2 = createMockHook('dependent2', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [dep, dep1, dep2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const depIndex = plan.orderedKinds.indexOf('dependency');
    const dep1Index = plan.orderedKinds.indexOf('dependent1');
    const dep2Index = plan.orderedKinds.indexOf('dependent2');
    
    if (depIndex >= dep1Index || depIndex >= dep2Index) {
      return { success: false, error: 'Should handle multiple dependents' };
    }
    
    return {
      success: true,
      message: 'Handles multiple dependents',
      data: { order: plan.orderedKinds }
    };
  };

  const testTopoSortMultipleDependencies = () => {
    const dep1 = createMockHook('dep1');
    const dep2 = createMockHook('dep2');
    const hook = createMockHook('dependent', { required: ['dep1', 'dep2'] });
    const subsystem = createSubsystem({ defaultHooks: [dep1, dep2, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const dep1Index = plan.orderedKinds.indexOf('dep1');
    const dep2Index = plan.orderedKinds.indexOf('dep2');
    const depIndex2 = plan.orderedKinds.indexOf('dependent');
    
    if (dep1Index >= depIndex2 || dep2Index >= depIndex2) {
      return { success: false, error: 'Should handle multiple dependencies' };
    }
    
    return {
      success: true,
      message: 'Handles multiple dependencies',
      data: { order: plan.orderedKinds }
    };
  };

  const testCycleDetectionSimple = () => {
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should detect simple cycle' };
    } catch (error) {
      if (error.message.includes('dependency cycle')) {
        return { success: true, message: 'Detects simple cycle' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCycleDetectionComplex = () => {
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook3'] });
    const hook3 = createMockHook('hook3', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2, hook3] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should detect complex cycle' };
    } catch (error) {
      if (error.message.includes('dependency cycle')) {
        return { success: true, message: 'Detects complex cycle' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCycleDetectionErrorDetails = () => {
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error with cycle details' };
    } catch (error) {
      if (error.message.includes('dependency cycle') && error.message.includes('hook')) {
        return { success: true, message: 'Throws error with cycle details' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCycleDetectionIdentifiesNodes = () => {
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should identify all nodes in cycle' };
    } catch (error) {
      const hasHook1 = error.message.includes('hook1');
      const hasHook2 = error.message.includes('hook2');
      if (hasHook1 && hasHook2) {
        return { success: true, message: 'Identifies all nodes in cycle' };
      }
      return { success: false, error: `Should identify cycle nodes: ${error.message}` };
    }
  };

  const testCacheCreatesKey = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    verifySubsystemBuild(subsystem, {}, cache);
    
    // Cache should have one entry (the sorted key)
    if (cache.size() === 0) {
      return { success: false, error: 'Should create cache key' };
    }
    
    return {
      success: true,
      message: 'Creates cache key from sorted facet kinds',
      data: { cacheSize: cache.size() }
    };
  };

  const testCacheUsesCachedValid = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    // First call - should cache
    const plan1 = verifySubsystemBuild(subsystem, {}, cache);
    
    // Second call - should use cache
    const plan2 = verifySubsystemBuild(subsystem, {}, cache);
    
    // Results should be the same
    if (JSON.stringify(plan1.orderedKinds) !== JSON.stringify(plan2.orderedKinds)) {
      return { success: false, error: 'Should use cached valid result' };
    }
    
    return {
      success: true,
      message: 'Uses cached valid result',
      data: { cached: true }
    };
  };

  const testCacheThrowsCachedError = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    // First call - should cache error
    try {
      verifySubsystemBuild(subsystem, {}, cache);
    } catch (error) {
      // Expected
    }
    
    // Second call - should throw cached error
    try {
      verifySubsystemBuild(subsystem, {}, cache);
      return { success: false, error: 'Should throw cached error' };
    } catch (error) {
      if (error.message.includes('dependency cycle') || error.message.includes('Cached')) {
        return { success: true, message: 'Throws cached error for invalid graph' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCacheCachesValid = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    verifySubsystemBuild(subsystem, {}, cache);
    
    // Check cache has entry
    const kinds = ['hook1', 'hook2'].sort().join(',');
    const cached = cache.get(kinds);
    
    if (!cached || !cached.valid) {
      return { success: false, error: 'Should cache valid result after sort' };
    }
    
    return {
      success: true,
      message: 'Caches valid result after sort',
      data: { cached: true, valid: cached.valid }
    };
  };

  const testCacheCachesInvalid = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1', { required: ['hook2'] });
    const hook2 = createMockHook('hook2', { required: ['hook1'] });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem, {}, cache);
    } catch (error) {
      // Expected
    }
    
    // Check cache has invalid entry
    const kinds = ['hook1', 'hook2'].sort().join(',');
    const cached = cache.get(kinds);
    
    if (!cached || cached.valid) {
      return { success: false, error: 'Should cache invalid result after cycle detection' };
    }
    
    return {
      success: true,
      message: 'Caches invalid result after cycle detection',
      data: { cached: true, valid: cached.valid }
    };
  };

  const testCacheSameKey = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    
    // Create subsystems with same hooks in different order
    const subsystem1 = createSubsystem({ defaultHooks: [hook1, hook2] });
    const subsystem2 = createSubsystem({ defaultHooks: [hook2, hook1] });
    
    verifySubsystemBuild(subsystem1, {}, cache);
    const plan2 = verifySubsystemBuild(subsystem2, {}, cache);
    
    // Both should produce same cache key and use cache
    if (cache.size() !== 1) {
      return { success: false, error: 'Same facet kinds should produce same cache key' };
    }
    
    return {
      success: true,
      message: 'Same facet kinds produce same cache key',
      data: { cacheSize: cache.size() }
    };
  };

  const testCacheDifferentKeys = () => {
    const cache = new DependencyGraphCache(100);
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const hook3 = createMockHook('hook3');
    
    const subsystem1 = createSubsystem({ defaultHooks: [hook1, hook2] });
    const subsystem2 = createSubsystem({ defaultHooks: [hook1, hook3] });
    
    verifySubsystemBuild(subsystem1, {}, cache);
    verifySubsystemBuild(subsystem2, {}, cache);
    
    // Should have 2 cache entries
    if (cache.size() !== 2) {
      return { success: false, error: 'Different facet kinds should produce different cache keys' };
    }
    
    return {
      success: true,
      message: 'Different facet kinds produce different cache keys',
      data: { cacheSize: cache.size() }
    };
  };

  const testCacheWorksWithoutCache = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem, {}, null);
    
    if (!plan.orderedKinds || plan.orderedKinds.length !== 2) {
      return { success: false, error: 'Should work without cache' };
    }
    
    return {
      success: true,
      message: 'Works without cache (null)',
      data: { order: plan.orderedKinds }
    };
  };

  const testReturnValueResolvedCtx = () => {
    const hook = createMockHook('test');
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ctx: { test: 'value' }
    });
    
    const plan = verifySubsystemBuild(subsystem, { extra: 'provided' });
    
    if (!plan.resolvedCtx || plan.resolvedCtx.test !== 'value' || plan.resolvedCtx.extra !== 'provided') {
      return { success: false, error: 'Should include resolvedCtx' };
    }
    
    return {
      success: true,
      message: 'Includes resolvedCtx',
      data: { hasResolvedCtx: !!plan.resolvedCtx }
    };
  };

  const testReturnValueOrderedKinds = () => {
    const hook = createMockHook('test');
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!Array.isArray(plan.orderedKinds) || !plan.orderedKinds.includes('test')) {
      return { success: false, error: 'Should include orderedKinds' };
    }
    
    return {
      success: true,
      message: 'Includes orderedKinds',
      data: { order: plan.orderedKinds }
    };
  };

  const testReturnValueFacetsByKind = () => {
    const hook = createMockHook('test');
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind || !plan.facetsByKind['test']) {
      return { success: false, error: 'Should include facetsByKind' };
    }
    
    return {
      success: true,
      message: 'Includes facetsByKind',
      data: { facets: Object.keys(plan.facetsByKind) }
    };
  };

  const testReturnValueGraphCache = () => {
    const cache = new DependencyGraphCache(100);
    const hook = createMockHook('test');
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem, {}, cache);
    
    if (plan.graphCache !== cache) {
      return { success: false, error: 'Should include graphCache' };
    }
    
    return {
      success: true,
      message: 'Includes graphCache',
      data: { hasGraphCache: !!plan.graphCache }
    };
  };

  const testReturnValueOrderedMatchesKeys = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const orderedSet = new Set(plan.orderedKinds);
    const keysSet = new Set(Object.keys(plan.facetsByKind));
    
    if (orderedSet.size !== keysSet.size || 
        ![...orderedSet].every(k => keysSet.has(k))) {
      return { success: false, error: 'orderedKinds should match facetsByKind keys' };
    }
    
    return {
      success: true,
      message: 'orderedKinds matches facetsByKind keys',
      data: { 
        orderedCount: plan.orderedKinds.length,
        keysCount: Object.keys(plan.facetsByKind).length
      }
    };
  };

  // UI
  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
        Subsystem Builder Utils - Verification Phase: Dependency Graph & Topological Sort
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Tests for dependency graph building, topological sorting, cycle detection, and cache integration
      </p>

      {/* Test Summary */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Tests</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{testCases.length}</div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Passed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            {Array.from(results.values()).filter(r => r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Failed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
            {Array.from(results.values()).filter(r => !r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Running</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
            {runningTests.size}
          </div>
        </div>
      </div>

      {/* Run All Button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => {
            testCases.forEach(test => {
              if (!results.has(test.name)) {
                runTest(test.name);
              }
            });
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
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
      </div>

      {/* Test Results by Category */}
      {categories.map(category => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            {category}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              
              return (
                <div
                  key={test.name}
                  onClick={() => setSelectedTest(test.name)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: result
                      ? (result.success ? '#d1fae5' : '#fee2e2')
                      : isRunning
                      ? '#dbeafe'
                      : 'white',
                    border: `1px solid ${result ? (result.success ? '#10b981' : '#ef4444') : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isRunning ? '⏳' : result ? (result.success ? '✅' : '❌') : '⚪'}
                    </span>
                    <span style={{ flex: 1, fontWeight: selectedTest === test.name ? '600' : '400' }}>
                      {test.name}
                    </span>
                    {result && result.data && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {JSON.stringify(result.data)}
                      </span>
                    )}
                  </div>
                  {result && result.error && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                      {result.error}
                    </div>
                  )}
                  {result && result.message && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#059669' }}>
                      {result.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Test Details */}
      {selectedTest && results.has(selectedTest) && (
        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
            Test Details: {selectedTest}
          </h3>
          <pre style={{ padding: '12px', backgroundColor: 'white', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
            {JSON.stringify(results.get(selectedTest), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}







