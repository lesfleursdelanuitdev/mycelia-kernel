import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { FACET_KINDS } from '../models/defaults/default-hooks.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * BaseSubsystemRoutingTest
 * Tests for BaseSubsystem routing methods
 */
export function BaseSubsystemRoutingTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'registerRoute - delegates to router facet', category: 'Routing' },
    { name: 'registerRoute - throws error if router facet not present', category: 'Routing' },
    { name: 'registerRoute - throws error if router.registerRoute not available', category: 'Routing' },
    { name: 'unregisterRoute - delegates to router facet', category: 'Routing' },
    { name: 'unregisterRoute - throws error if router facet not present', category: 'Routing' },
    { name: 'unregisterRoute - throws error if router.unregisterRoute not available', category: 'Routing' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'registerRoute - delegates to router facet':
            result = await testRegisterRouteDelegates();
            break;
          case 'registerRoute - throws error if router facet not present':
            result = await testRegisterRouteThrowsNoRouter();
            break;
          case 'registerRoute - throws error if router.registerRoute not available':
            result = await testRegisterRouteThrowsNoMethod();
            break;
          case 'unregisterRoute - delegates to router facet':
            result = await testUnregisterRouteDelegates();
            break;
          case 'unregisterRoute - throws error if router facet not present':
            result = await testUnregisterRouteThrowsNoRouter();
            break;
          case 'unregisterRoute - throws error if router.unregisterRoute not available':
            result = await testUnregisterRouteThrowsNoMethod();
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

  const testRegisterRouteDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let registered = false;
    const router = new Facet(FACET_KINDS.ROUTER, { attach: false });
    router.registerRoute = () => { registered = true; };
    subsystem.api.__facets.add(FACET_KINDS.ROUTER, router);
    subsystem.registerRoute('pattern', () => {});
    if (!registered) {
      return { success: false, error: 'Should delegate to router facet' };
    }
    return { success: true, message: 'Delegates to router facet' };
  };

  const testRegisterRouteThrowsNoRouter = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      subsystem.registerRoute('pattern', () => {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing router facet')) {
        return { success: true, message: 'Throws error if router facet not present' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRegisterRouteThrowsNoMethod = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const router = new Facet(FACET_KINDS.ROUTER, { attach: false });
    subsystem.api.__facets.add(FACET_KINDS.ROUTER, router);
    try {
      subsystem.registerRoute('pattern', () => {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing router facet')) {
        return { success: true, message: 'Throws error if router.registerRoute not available' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testUnregisterRouteDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let unregistered = false;
    const router = new Facet(FACET_KINDS.ROUTER, { attach: false });
    router.unregisterRoute = () => { unregistered = true; };
    subsystem.api.__facets.add(FACET_KINDS.ROUTER, router);
    subsystem.unregisterRoute('pattern');
    if (!unregistered) {
      return { success: false, error: 'Should delegate to router facet' };
    }
    return { success: true, message: 'Delegates to router facet' };
  };

  const testUnregisterRouteThrowsNoRouter = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      subsystem.unregisterRoute('pattern');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing router facet')) {
        return { success: true, message: 'Throws error if router facet not present' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testUnregisterRouteThrowsNoMethod = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const router = new Facet(FACET_KINDS.ROUTER, { attach: false });
    subsystem.api.__facets.add(FACET_KINDS.ROUTER, router);
    try {
      subsystem.unregisterRoute('pattern');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing router facet')) {
        return { success: true, message: 'Throws error if router.unregisterRoute not available' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Routing Tests</h2>
      
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







