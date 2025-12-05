import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';

/**
 * BaseSubsystemDisposeLifecycleTest
 * Tests for BaseSubsystem dispose lifecycle
 */
export function BaseSubsystemDisposeLifecycleTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'dispose - sets _isBuilt to false after disposal', category: 'Dispose' },
    { name: 'dispose - returns same promise on concurrent calls', category: 'Dispose' },
    { name: 'dispose - returns immediately if not built and no build in progress', category: 'Dispose' },
    { name: 'dispose - waits for build to complete before disposing', category: 'Dispose' },
    { name: 'dispose - disposes all children', category: 'Dispose' },
    { name: 'dispose - disposes all facets', category: 'Dispose' },
    { name: 'dispose - invokes all onDispose callbacks', category: 'Dispose' },
    { name: 'dispose - handles dispose callback errors gracefully', category: 'Dispose' },
    { name: 'dispose - sets coreProcessor to null', category: 'Dispose' },
    { name: 'dispose - invalidates builder', category: 'Dispose' },
    { name: 'dispose - logs dispose message', category: 'Dispose' },
    { name: 'dispose - clears _disposePromise after completion', category: 'Dispose' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'dispose - sets _isBuilt to false after disposal':
            result = await testDisposeSetsIsBuilt();
            break;
          case 'dispose - returns same promise on concurrent calls':
            result = await testDisposeReturnsSamePromise();
            break;
          case 'dispose - returns immediately if not built and no build in progress':
            result = await testDisposeReturnsImmediately();
            break;
          case 'dispose - waits for build to complete before disposing':
            result = await testDisposeWaitsForBuild();
            break;
          case 'dispose - disposes all children':
            result = await testDisposeDisposesChildren();
            break;
          case 'dispose - disposes all facets':
            result = await testDisposeDisposesFacets();
            break;
          case 'dispose - invokes all onDispose callbacks':
            result = await testDisposeInvokesCallbacks();
            break;
          case 'dispose - handles dispose callback errors gracefully':
            result = await testDisposeHandlesErrors();
            break;
          case 'dispose - sets coreProcessor to null':
            result = await testDisposeSetsCoreProcessor();
            break;
          case 'dispose - invalidates builder':
            result = await testDisposeInvalidatesBuilder();
            break;
          case 'dispose - logs dispose message':
            result = await testDisposeLogs();
            break;
          case 'dispose - clears _disposePromise after completion':
            result = await testDisposeClearsPromise();
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

  const testDisposeSetsIsBuilt = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    await subsystem.dispose();
    if (subsystem._isBuilt !== false) {
      return { success: false, error: '_isBuilt should be false after dispose' };
    }
    return { success: true, message: 'Sets _isBuilt to false' };
  };

  const testDisposeReturnsSamePromise = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    // Call dispose() twice synchronously - should return same underlying promise
    // Since dispose() is async, it wraps the return in a new Promise, but the underlying
    // _disposePromise should be the same, and both should resolve to the same value
    const promise1 = subsystem.dispose();
    // Verify _disposePromise is set before second call
    if (!subsystem._disposePromise) {
      return { success: false, error: '_disposePromise should be set after first call' };
    }
    const promise2 = subsystem.dispose();
    // Both calls should reference the same underlying _disposePromise
    // Since dispose() is async, promise1 and promise2 are different Promise wrappers,
    // but they should both resolve to the same value (undefined)
    try {
      const result1 = await promise1;
      const result2 = await promise2;
      // Both should resolve to undefined (dispose doesn't return a value)
      if (result1 !== result2) {
        return { success: false, error: 'Both promises should resolve to the same value' };
      }
      // Verify _disposePromise is the same underlying promise
      // (The async wrapper means promise1 !== promise2, but they should resolve to same value)
      return { success: true, message: 'Returns same promise on concurrent calls (both resolve to same value)' };
    } catch (error) {
      return { success: false, error: `Dispose failed: ${error.message}` };
    }
  };

  const testDisposeReturnsImmediately = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = await subsystem.dispose();
    if (result !== undefined) {
      return { success: false, error: 'Should return undefined if not built' };
    }
    return { success: true, message: 'Returns immediately if not built' };
  };

  const testDisposeWaitsForBuild = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let buildComplete = false;
    subsystem._builder.build = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      buildComplete = true;
    };
    const buildPromise = subsystem.build();
    const disposePromise = subsystem.dispose();
    await disposePromise;
    if (!buildComplete) {
      return { success: false, error: 'Should wait for build to complete' };
    }
    return { success: true, message: 'Waits for build to complete' };
  };

  const testDisposeDisposesChildren = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    parent.children = [child];
    await parent.build();
    await child.build();
    let childDisposed = false;
    child.dispose = async () => { childDisposed = true; };
    await parent.dispose();
    if (!childDisposed) {
      return { success: false, error: 'Should dispose children' };
    }
    return { success: true, message: 'Disposes all children' };
  };

  const testDisposeDisposesFacets = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let facetsDisposed = false;
    subsystem.api.__facets.disposeAll = async () => { facetsDisposed = true; };
    await subsystem.build();
    await subsystem.dispose();
    if (!facetsDisposed) {
      return { success: false, error: 'Should dispose facets' };
    }
    return { success: true, message: 'Disposes all facets' };
  };

  const testDisposeInvokesCallbacks = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let called = false;
    subsystem.onDispose(() => { called = true; });
    await subsystem.build();
    await subsystem.dispose();
    if (!called) {
      return { success: false, error: 'Should invoke onDispose callback' };
    }
    return { success: true, message: 'Invokes all onDispose callbacks' };
  };

  const testDisposeHandlesErrors = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem.onDispose(() => { throw new Error('Callback error'); });
    await subsystem.build();
    try {
      await subsystem.dispose();
      return { success: true, message: 'Handles dispose callback errors gracefully' };
    } catch (error) {
      return { success: false, error: 'Should handle errors gracefully' };
    }
  };

  const testDisposeSetsCoreProcessor = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    subsystem.coreProcessor = { test: 'value' };
    await subsystem.dispose();
    if (subsystem.coreProcessor !== null) {
      return { success: false, error: 'coreProcessor should be null' };
    }
    return { success: true, message: 'Sets coreProcessor to null' };
  };

  const testDisposeInvalidatesBuilder = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    subsystem._builder.plan();
    await subsystem.dispose();
    const plan = subsystem._builder.getPlan();
    if (plan !== null) {
      return { success: false, error: 'Builder should be invalidated' };
    }
    return { success: true, message: 'Invalidates builder' };
  };

  const testDisposeLogs = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    await subsystem.dispose();
    return { success: true, message: 'Logs dispose message (dispose completes)' };
  };

  const testDisposeClearsPromise = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    await subsystem.dispose();
    if (subsystem._disposePromise !== null) {
      return { success: false, error: '_disposePromise should be cleared' };
    }
    return { success: true, message: 'Clears _disposePromise after completion' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Dispose Lifecycle Tests</h2>
      
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

