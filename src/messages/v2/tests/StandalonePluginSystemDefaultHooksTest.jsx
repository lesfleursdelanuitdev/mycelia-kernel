import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { useListeners } from '../hooks/listeners/use-listeners.mycelia.js';

/**
 * StandalonePluginSystemDefaultHooksTest
 * Tests for StandalonePluginSystem default hooks (useListeners)
 */
export function StandalonePluginSystemDefaultHooksTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'defaults - contains useListeners hook', category: 'Default Hooks' },
    { name: 'defaults - is set as array', category: 'Default Hooks' },
    { name: 'defaults - useListeners is installed during build', category: 'Default Hooks' },
    { name: 'defaults - useListeners facet is available after build', category: 'Default Hooks' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'defaults - contains useListeners hook':
            result = await testDefaultsContainsUseListeners();
            break;
          case 'defaults - is set as array':
            result = await testDefaultsIsArray();
            break;
          case 'defaults - useListeners is installed during build':
            result = await testDefaultsInstalledDuringBuild();
            break;
          case 'defaults - useListeners facet is available after build':
            result = await testDefaultsFacetAvailable();
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

  const testDefaultsContainsUseListeners = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (!system.defaults || !Array.isArray(system.defaults)) {
      return { success: false, error: 'defaults should be an array' };
    }
    if (system.defaults.length !== 1) {
      return { success: false, error: 'defaults should contain one hook' };
    }
    if (system.defaults[0] !== useListeners) {
      return { success: false, error: 'defaults should contain useListeners' };
    }
    return { success: true, message: 'Contains useListeners hook' };
  };

  const testDefaultsIsArray = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (!Array.isArray(system.defaults)) {
      return { success: false, error: 'defaults should be an array' };
    }
    return { success: true, message: 'Is set as array' };
  };

  const testDefaultsInstalledDuringBuild = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Set defaultHooks to use defaults
    system.defaultHooks = system.defaults;
    await system.build();
    // useListeners should be installed
    const listeners = system.find('listeners');
    if (!listeners) {
      return { success: false, error: 'useListeners should be installed during build' };
    }
    return { success: true, message: 'useListeners is installed during build' };
  };

  const testDefaultsFacetAvailable = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Set defaultHooks to use defaults
    system.defaultHooks = system.defaults;
    await system.build();
    const listeners = system.find('listeners');
    if (!listeners) {
      return { success: false, error: 'useListeners facet should be available' };
    }
    if (typeof listeners.on !== 'function') {
      return { success: false, error: 'listeners facet should have on method' };
    }
    return { success: true, message: 'useListeners facet is available after build' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem Default Hooks Tests</h2>
      
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







