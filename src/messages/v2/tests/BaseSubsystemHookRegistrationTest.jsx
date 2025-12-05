import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';

/**
 * BaseSubsystemHookRegistrationTest
 * Tests for BaseSubsystem hook registration methods
 */
export function BaseSubsystemHookRegistrationTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'use - adds hook to hooks array', category: 'Hook Registration' },
    { name: 'use - supports method chaining', category: 'Hook Registration' },
    { name: 'use - throws error if subsystem already built', category: 'Hook Registration' },
    { name: 'use - throws error if hook is not a function', category: 'Hook Registration' },
    { name: 'use - allows multiple hooks', category: 'Hook Registration' },
    { name: 'onInit - adds callback to _initCallbacks', category: 'Hook Registration' },
    { name: 'onInit - supports method chaining', category: 'Hook Registration' },
    { name: 'onInit - throws error if callback is not a function', category: 'Hook Registration' },
    { name: 'onInit - allows multiple callbacks', category: 'Hook Registration' },
    { name: 'onDispose - adds callback to _disposeCallbacks', category: 'Hook Registration' },
    { name: 'onDispose - supports method chaining', category: 'Hook Registration' },
    { name: 'onDispose - throws error if callback is not a function', category: 'Hook Registration' },
    { name: 'onDispose - allows multiple callbacks', category: 'Hook Registration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'use - adds hook to hooks array':
            result = await testUseAddsHook();
            break;
          case 'use - supports method chaining':
            result = await testUseChaining();
            break;
          case 'use - throws error if subsystem already built':
            result = await testUseThrowsAfterBuild();
            break;
          case 'use - throws error if hook is not a function':
            result = await testUseThrowsInvalid();
            break;
          case 'use - allows multiple hooks':
            result = await testUseMultiple();
            break;
          case 'onInit - adds callback to _initCallbacks':
            result = await testOnInitAdds();
            break;
          case 'onInit - supports method chaining':
            result = await testOnInitChaining();
            break;
          case 'onInit - throws error if callback is not a function':
            result = await testOnInitThrows();
            break;
          case 'onInit - allows multiple callbacks':
            result = await testOnInitMultiple();
            break;
          case 'onDispose - adds callback to _disposeCallbacks':
            result = await testOnDisposeAdds();
            break;
          case 'onDispose - supports method chaining':
            result = await testOnDisposeChaining();
            break;
          case 'onDispose - throws error if callback is not a function':
            result = await testOnDisposeThrows();
            break;
          case 'onDispose - allows multiple callbacks':
            result = await testOnDisposeMultiple();
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

  const testUseAddsHook = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const hook = () => {};
    subsystem.use(hook);
    if (!subsystem.hooks.includes(hook)) {
      return { success: false, error: 'Hook should be added' };
    }
    return { success: true, message: 'Adds hook to hooks array' };
  };

  const testUseChaining = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = subsystem.use(() => {});
    if (result !== subsystem) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testUseThrowsAfterBuild = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.build();
    try {
      subsystem.use(() => {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('cannot add hooks after build')) {
        return { success: true, message: 'Throws error if already built' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testUseThrowsInvalid = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      subsystem.use('not a function');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('hook must be a function')) {
        return { success: true, message: 'Throws error if hook is not a function' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testUseMultiple = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const hook1 = () => {};
    const hook2 = () => {};
    subsystem.use(hook1).use(hook2);
    if (subsystem.hooks.length !== 2) {
      return { success: false, error: 'Should allow multiple hooks' };
    }
    return { success: true, message: 'Allows multiple hooks' };
  };

  const testOnInitAdds = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const cb = () => {};
    subsystem.onInit(cb);
    if (!subsystem._initCallbacks.includes(cb)) {
      return { success: false, error: 'Callback should be added' };
    }
    return { success: true, message: 'Adds callback to _initCallbacks' };
  };

  const testOnInitChaining = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = subsystem.onInit(() => {});
    if (result !== subsystem) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testOnInitThrows = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      subsystem.onInit('not a function');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('onInit callback must be a function')) {
        return { success: true, message: 'Throws error if callback is not a function' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOnInitMultiple = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const cb1 = () => {};
    const cb2 = () => {};
    subsystem.onInit(cb1).onInit(cb2);
    if (subsystem._initCallbacks.length !== 2) {
      return { success: false, error: 'Should allow multiple callbacks' };
    }
    return { success: true, message: 'Allows multiple callbacks' };
  };

  const testOnDisposeAdds = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const cb = () => {};
    subsystem.onDispose(cb);
    if (!subsystem._disposeCallbacks.includes(cb)) {
      return { success: false, error: 'Callback should be added' };
    }
    return { success: true, message: 'Adds callback to _disposeCallbacks' };
  };

  const testOnDisposeChaining = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = subsystem.onDispose(() => {});
    if (result !== subsystem) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testOnDisposeThrows = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      subsystem.onDispose('not a function');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('onDispose callback must be a function')) {
        return { success: true, message: 'Throws error if callback is not a function' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOnDisposeMultiple = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const cb1 = () => {};
    const cb2 = () => {};
    subsystem.onDispose(cb1).onDispose(cb2);
    if (subsystem._disposeCallbacks.length !== 2) {
      return { success: false, error: 'Should allow multiple callbacks' };
    }
    return { success: true, message: 'Allows multiple callbacks' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Hook Registration Tests</h2>
      
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







