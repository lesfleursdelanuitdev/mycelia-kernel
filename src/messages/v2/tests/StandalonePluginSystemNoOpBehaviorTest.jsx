import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';

/**
 * StandalonePluginSystemNoOpBehaviorTest
 * Tests for StandalonePluginSystem no-op behavior
 */
export function StandalonePluginSystemNoOpBehaviorTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'No-Op - message methods don\'t require facets', category: 'No-Op Behavior' },
    { name: 'No-Op - routing methods don\'t require facets', category: 'No-Op Behavior' },
    { name: 'No-Op - can call no-op methods before build', category: 'No-Op Behavior' },
    { name: 'No-Op - can call no-op methods after build', category: 'No-Op Behavior' },
    { name: 'No-Op - can call no-op methods after dispose', category: 'No-Op Behavior' },
    { name: 'No-Op - no-op methods don\'t affect system state', category: 'No-Op Behavior' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'No-Op - message methods don\'t require facets':
            result = await testMessageMethodsNoFacets();
            break;
          case 'No-Op - routing methods don\'t require facets':
            result = await testRoutingMethodsNoFacets();
            break;
          case 'No-Op - can call no-op methods before build':
            result = await testNoOpBeforeBuild();
            break;
          case 'No-Op - can call no-op methods after build':
            result = await testNoOpAfterBuild();
            break;
          case 'No-Op - can call no-op methods after dispose':
            result = await testNoOpAfterDispose();
            break;
          case 'No-Op - no-op methods don\'t affect system state':
            result = await testNoOpNoStateChange();
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

  const testMessageMethodsNoFacets = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Should work without any facets
    await system.accept({});
    await system.process(100);
    system.pause();
    system.resume();
    return { success: true, message: 'Message methods don\'t require facets' };
  };

  const testRoutingMethodsNoFacets = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Should work without router facet
    system.registerRoute('pattern', () => {});
    system.unregisterRoute('pattern');
    return { success: true, message: 'Routing methods don\'t require facets' };
  };

  const testNoOpBeforeBuild = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Should work before build
    await system.accept({});
    await system.process(100);
    system.pause();
    system.resume();
    system.registerRoute('pattern', () => {});
    system.unregisterRoute('pattern');
    return { success: true, message: 'Can call no-op methods before build' };
  };

  const testNoOpAfterBuild = async () => {
    const system = new StandalonePluginSystem('test', {});
    await system.build();
    // Should work after build
    await system.accept({});
    await system.process(100);
    system.pause();
    system.resume();
    system.registerRoute('pattern', () => {});
    system.unregisterRoute('pattern');
    return { success: true, message: 'Can call no-op methods after build' };
  };

  const testNoOpAfterDispose = async () => {
    const system = new StandalonePluginSystem('test', {});
    await system.build();
    await system.dispose();
    // Should work after dispose
    await system.accept({});
    await system.process(100);
    system.pause();
    system.resume();
    system.registerRoute('pattern', () => {});
    system.unregisterRoute('pattern');
    return { success: true, message: 'Can call no-op methods after dispose' };
  };

  const testNoOpNoStateChange = async () => {
    const system = new StandalonePluginSystem('test', {});
    const initialState = system.isBuilt;
    // Call all no-op methods
    await system.accept({});
    await system.process(100);
    system.pause();
    system.resume();
    system.registerRoute('pattern', () => {});
    system.unregisterRoute('pattern');
    // State should not change
    if (system.isBuilt !== initialState) {
      return { success: false, error: 'No-op methods should not change state' };
    }
    return { success: true, message: 'No-op methods don\'t affect system state' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem No-Op Behavior Tests</h2>
      
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







