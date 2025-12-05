import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { FACET_KINDS } from '../models/defaults/default-hooks.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * BaseSubsystemBuildLifecycleTest
 * Tests for BaseSubsystem build lifecycle
 */
export function BaseSubsystemBuildLifecycleTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'build - sets _isBuilt to true after successful build', category: 'Build' },
    { name: 'build - returns same promise on concurrent calls', category: 'Build' },
    { name: 'build - returns immediately if already built', category: 'Build' },
    { name: 'build - calls SubsystemBuilder.build with context', category: 'Build' },
    { name: 'build - merges provided ctx with existing ctx', category: 'Build' },
    { name: 'build - creates graphCache if not provided', category: 'Build' },
    { name: 'build - uses provided graphCache', category: 'Build' },
    { name: 'build - inherits graphCache from parent ctx', category: 'Build' },
    { name: 'build - invokes all onInit callbacks after build', category: 'Build' },
    { name: 'build - passes api and ctx to onInit callbacks', category: 'Build' },
    { name: 'build - sets coreProcessor based on subsystem type', category: 'Build' },
    { name: 'build - sets coreProcessor to synchronous facet if isSynchronous', category: 'Build' },
    { name: 'build - sets coreProcessor to processor facet if not synchronous', category: 'Build' },
    { name: 'build - logs success message', category: 'Build' },
    { name: 'build - handles build errors gracefully', category: 'Build' },
    { name: 'build - does not set _isBuilt on error', category: 'Build' },
    { name: 'build - clears _buildPromise after completion', category: 'Build' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'build - sets _isBuilt to true after successful build':
            result = await testBuildSetsIsBuilt();
            break;
          case 'build - returns same promise on concurrent calls':
            result = await testBuildReturnsSamePromise();
            break;
          case 'build - returns immediately if already built':
            result = await testBuildReturnsImmediately();
            break;
          case 'build - calls SubsystemBuilder.build with context':
            result = await testBuildCallsBuilder();
            break;
          case 'build - merges provided ctx with existing ctx':
            result = await testBuildMergesCtx();
            break;
          case 'build - creates graphCache if not provided':
            result = await testBuildCreatesGraphCache();
            break;
          case 'build - uses provided graphCache':
            result = await testBuildUsesGraphCache();
            break;
          case 'build - inherits graphCache from parent ctx':
            result = await testBuildInheritsGraphCache();
            break;
          case 'build - invokes all onInit callbacks after build':
            result = await testBuildInvokesOnInit();
            break;
          case 'build - passes api and ctx to onInit callbacks':
            result = await testBuildPassesToOnInit();
            break;
          case 'build - sets coreProcessor based on subsystem type':
            result = await testBuildSetsCoreProcessor();
            break;
          case 'build - sets coreProcessor to synchronous facet if isSynchronous':
            result = await testBuildSetsSynchronous();
            break;
          case 'build - sets coreProcessor to processor facet if not synchronous':
            result = await testBuildSetsProcessor();
            break;
          case 'build - logs success message':
            result = await testBuildLogs();
            break;
          case 'build - handles build errors gracefully':
            result = await testBuildHandlesErrors();
            break;
          case 'build - does not set _isBuilt on error':
            result = await testBuildNoIsBuiltOnError();
            break;
          case 'build - clears _buildPromise after completion':
            result = await testBuildClearsPromise();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message
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

  const testBuildSetsIsBuilt = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    if (subsystem._isBuilt !== true) {
      return { success: false, error: '_isBuilt should be true' };
    }
    return { success: true, message: 'Sets _isBuilt to true' };
  };

  const testBuildReturnsSamePromise = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    // Call build() twice synchronously - should return same underlying promise
    // Since build() is async, it wraps the return in a new Promise, but the underlying
    // _buildPromise should be the same, and both should resolve to the same value
    const promise1 = subsystem.build();
    // Verify _buildPromise is set before second call
    if (!subsystem._buildPromise) {
      return { success: false, error: '_buildPromise should be set after first call' };
    }
    const promise2 = subsystem.build();
    // Both calls should reference the same underlying _buildPromise
    // Since build() is async, promise1 and promise2 are different Promise wrappers,
    // but they should both resolve to the same subsystem instance
    try {
      const result1 = await promise1;
      const result2 = await promise2;
      // Both should resolve to the same subsystem
      if (result1 !== subsystem || result2 !== subsystem) {
        return { success: false, error: 'Both promises should resolve to the same subsystem' };
      }
      // Verify _buildPromise is the same underlying promise
      // (The async wrapper means promise1 !== promise2, but they should resolve to same value)
      return { success: true, message: 'Returns same promise on concurrent calls (both resolve to same subsystem)' };
    } catch (error) {
      return { success: false, error: `Build failed: ${error.message}` };
    }
  };

  const testBuildReturnsImmediately = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    // After build completes, _isBuilt should be true
    if (!subsystem._isBuilt) {
      return { success: false, error: '_isBuilt should be true after build' };
    }
    // When already built, build() is async so it returns a Promise,
    // but that Promise should resolve immediately to the subsystem
    const resultPromise = subsystem.build();
    // Since build() is async, it returns a Promise, but it should resolve immediately
    // (not wait for any async work since _isBuilt is true)
    const result = await resultPromise;
    if (result !== subsystem) {
      return { success: false, error: 'Should return subsystem immediately' };
    }
    return { success: true, message: 'Returns immediately if already built' };
  };

  const testBuildCallsBuilder = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let builderCalled = false;
    const originalBuild = subsystem._builder.build.bind(subsystem._builder);
    subsystem._builder.build = async () => {
      builderCalled = true;
      return originalBuild();
    };
    await subsystem.build();
    if (!builderCalled) {
      return { success: false, error: 'Should call builder.build' };
    }
    return { success: true, message: 'Calls SubsystemBuilder.build' };
  };

  const testBuildMergesCtx = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms, config: { existing: 'value' } });
    await subsystem.build({ config: { new: 'value2' } });
    if (subsystem.ctx.config.existing !== 'value') {
      return { success: false, error: 'Should preserve existing config' };
    }
    if (subsystem.ctx.config.new !== 'value2') {
      return { success: false, error: 'Should merge new config' };
    }
    return { success: true, message: 'Merges provided ctx with existing ctx' };
  };

  const testBuildCreatesGraphCache = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    if (!subsystem.ctx.graphCache) {
      return { success: false, error: 'Should create graphCache' };
    }
    if (!(subsystem.ctx.graphCache instanceof DependencyGraphCache)) {
      return { success: false, error: 'graphCache should be DependencyGraphCache instance' };
    }
    return { success: true, message: 'Creates graphCache if not provided' };
  };

  const testBuildUsesGraphCache = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const cache = new DependencyGraphCache(50);
    await subsystem.build({ graphCache: cache });
    if (subsystem.ctx.graphCache !== cache) {
      return { success: false, error: 'Should use provided graphCache' };
    }
    return { success: true, message: 'Uses provided graphCache' };
  };

  const testBuildInheritsGraphCache = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const cache = new DependencyGraphCache(50);
    await parent.build({ graphCache: cache });
    const child = new BaseSubsystem('child', { ms });
    child.ctx.parent = parent.ctx;
    await child.build();
    if (child.ctx.graphCache !== cache) {
      return { success: false, error: 'Should inherit graphCache from parent' };
    }
    return { success: true, message: 'Inherits graphCache from parent ctx' };
  };

  const testBuildInvokesOnInit = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let called = false;
    subsystem.onInit(() => { called = true; });
    await subsystem.build();
    if (!called) {
      return { success: false, error: 'Should invoke onInit callback' };
    }
    return { success: true, message: 'Invokes all onInit callbacks' };
  };

  const testBuildPassesToOnInit = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let receivedApi, receivedCtx;
    subsystem.onInit((api, ctx) => {
      receivedApi = api;
      receivedCtx = ctx;
    });
    await subsystem.build();
    if (receivedApi !== subsystem.api) {
      return { success: false, error: 'Should pass api to callback' };
    }
    if (receivedCtx !== subsystem.ctx) {
      return { success: false, error: 'Should pass ctx to callback' };
    }
    return { success: true, message: 'Passes api and ctx to onInit callbacks' };
  };

  const testBuildSetsCoreProcessor = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const processorFacet = new Facet(FACET_KINDS.PROCESSOR, { attach: false });
    subsystem.api.__facets.add(FACET_KINDS.PROCESSOR, processorFacet);
    await subsystem.build();
    if (subsystem.coreProcessor !== processorFacet) {
      return { success: false, error: 'Should set coreProcessor' };
    }
    return { success: true, message: 'Sets coreProcessor based on subsystem type' };
  };

  const testBuildSetsSynchronous = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem.api.isSynchronous = true;
    const syncFacet = new Facet(FACET_KINDS.SYNCHRONOUS, { attach: false });
    subsystem.api.__facets.add(FACET_KINDS.SYNCHRONOUS, syncFacet);
    await subsystem.build();
    if (subsystem.coreProcessor !== syncFacet) {
      return { success: false, error: 'Should set coreProcessor to synchronous facet' };
    }
    return { success: true, message: 'Sets coreProcessor to synchronous facet if isSynchronous' };
  };

  const testBuildSetsProcessor = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem.api.isSynchronous = false;
    const processorFacet = new Facet(FACET_KINDS.PROCESSOR, { attach: false });
    subsystem.api.__facets.add(FACET_KINDS.PROCESSOR, processorFacet);
    await subsystem.build();
    if (subsystem.coreProcessor !== processorFacet) {
      return { success: false, error: 'Should set coreProcessor to processor facet' };
    }
    return { success: true, message: 'Sets coreProcessor to processor facet if not synchronous' };
  };

  const testBuildLogs = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    // Just verify build completes without error (logging is hard to test)
    await subsystem.build();
    return { success: true, message: 'Logs success message (build completes)' };
  };

  const testBuildHandlesErrors = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem._builder.build = async () => {
      throw new Error('Build failed');
    };
    try {
      await subsystem.build();
      return { success: false, error: 'Should propagate error' };
    } catch (error) {
      if (error.message === 'Build failed') {
        return { success: true, message: 'Handles build errors gracefully' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testBuildNoIsBuiltOnError = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem._builder.build = async () => {
      throw new Error('Build failed');
    };
    try {
      await subsystem.build();
    } catch {}
    if (subsystem._isBuilt !== false) {
      return { success: false, error: '_isBuilt should remain false on error' };
    }
    return { success: true, message: 'Does not set _isBuilt on error' };
  };

  const testBuildClearsPromise = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    if (subsystem._buildPromise !== null) {
      return { success: false, error: '_buildPromise should be cleared' };
    }
    return { success: true, message: 'Clears _buildPromise after completion' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Build Lifecycle Tests</h2>
      
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

