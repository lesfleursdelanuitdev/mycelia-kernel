import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';

/**
 * BaseSubsystemIntegrationTest
 * Tests for BaseSubsystem integration scenarios
 */
export function BaseSubsystemIntegrationTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'Integration - full lifecycle (build → use → dispose)', category: 'Integration' },
    { name: 'Integration - multiple hooks and callbacks', category: 'Integration' },
    { name: 'Integration - hierarchical subsystem relationships', category: 'Integration' },
    { name: 'Integration - context inheritance from parent', category: 'Integration' },
    { name: 'Integration - graphCache sharing across hierarchy', category: 'Integration' },
    { name: 'Integration - error handling during build', category: 'Integration' },
    { name: 'Integration - error handling during dispose', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Integration - full lifecycle (build → use → dispose)':
            result = await testFullLifecycle();
            break;
          case 'Integration - multiple hooks and callbacks':
            result = await testMultipleHooksAndCallbacks();
            break;
          case 'Integration - hierarchical subsystem relationships':
            result = await testHierarchicalRelationships();
            break;
          case 'Integration - context inheritance from parent':
            result = await testContextInheritance();
            break;
          case 'Integration - graphCache sharing across hierarchy':
            result = await testGraphCacheSharing();
            break;
          case 'Integration - error handling during build':
            result = await testErrorHandlingBuild();
            break;
          case 'Integration - error handling during dispose':
            result = await testErrorHandlingDispose();
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

  const testFullLifecycle = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let initCalled = false;
    let disposeCalled = false;
    subsystem.onInit(() => { initCalled = true; });
    subsystem.onDispose(() => { disposeCalled = true; });
    await subsystem.build();
    if (!initCalled || !subsystem.isBuilt) {
      return { success: false, error: 'Build should complete and call onInit' };
    }
    await subsystem.dispose();
    if (!disposeCalled || subsystem.isBuilt) {
      return { success: false, error: 'Dispose should complete and call onDispose' };
    }
    return { success: true, message: 'Full lifecycle works correctly' };
  };

  const testMultipleHooksAndCallbacks = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let initCount = 0;
    let disposeCount = 0;
    subsystem.onInit(() => { initCount++; });
    subsystem.onInit(() => { initCount++; });
    subsystem.onDispose(() => { disposeCount++; });
    subsystem.onDispose(() => { disposeCount++; });
    await subsystem.build();
    if (initCount !== 2) {
      return { success: false, error: 'Should call all onInit callbacks' };
    }
    await subsystem.dispose();
    if (disposeCount !== 2) {
      return { success: false, error: 'Should call all onDispose callbacks' };
    }
    return { success: true, message: 'Multiple hooks and callbacks work correctly' };
  };

  const testHierarchicalRelationships = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child.getParent() !== parent) {
      return { success: false, error: 'Parent relationship should be set' };
    }
    // Child should NOT be root (isRoot() should return false)
    if (child.isRoot()) {
      return { success: false, error: 'Child should not be root' };
    }
    // Parent should be root (isRoot() should return true)
    if (parent.isRoot() !== true) {
      return { success: false, error: 'Parent should be root' };
    }
    if (child.getRoot() !== parent) {
      return { success: false, error: 'getRoot should return parent' };
    }
    return { success: true, message: 'Hierarchical relationships work correctly' };
  };

  const testContextInheritance = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms, config: { parentValue: 'test' } });
    await parent.build();
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    child.ctx.parent = parent.ctx;
    await child.build();
    if (child.ctx.parent.config.parentValue !== 'test') {
      return { success: false, error: 'Child should inherit parent context' };
    }
    return { success: true, message: 'Context inheritance works correctly' };
  };

  const testGraphCacheSharing = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const cache = new DependencyGraphCache(50);
    await parent.build({ graphCache: cache });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    child.ctx.parent = parent.ctx;
    await child.build();
    if (child.ctx.graphCache !== cache) {
      return { success: false, error: 'Child should share parent graphCache' };
    }
    return { success: true, message: 'graphCache sharing works correctly' };
  };

  const testErrorHandlingBuild = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem._builder.build = async () => {
      throw new Error('Build failed');
    };
    try {
      await subsystem.build();
      return { success: false, error: 'Should propagate build error' };
    } catch (error) {
      if (error.message === 'Build failed' && !subsystem.isBuilt) {
        return { success: true, message: 'Error handling during build works correctly' };
      }
      return { success: false, error: 'Error handling incorrect' };
    }
  };

  const testErrorHandlingDispose = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    subsystem.onDispose(() => { throw new Error('Dispose failed'); });
    try {
      await subsystem.dispose();
      // Dispose should handle errors gracefully
      if (!subsystem.isBuilt) {
        return { success: true, message: 'Error handling during dispose works correctly' };
      }
      return { success: false, error: 'Dispose should complete despite errors' };
    } catch (error) {
      return { success: false, error: 'Dispose should handle errors gracefully' };
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Integration Tests</h2>
      
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

