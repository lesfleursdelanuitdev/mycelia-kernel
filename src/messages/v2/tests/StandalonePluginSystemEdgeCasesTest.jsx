import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';

/**
 * StandalonePluginSystemEdgeCasesTest
 * Tests for StandalonePluginSystem edge cases
 */
export function StandalonePluginSystemEdgeCasesTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Edge Case - works with empty config', category: 'Edge Cases' },
    { name: 'Edge Case - works with undefined options', category: 'Edge Cases' },
    { name: 'Edge Case - works with null message system', category: 'Edge Cases' },
    { name: 'Edge Case - works without any plugins', category: 'Edge Cases' },
    { name: 'Edge Case - works with only useListeners', category: 'Edge Cases' },
    { name: 'Edge Case - can override no-op methods in subclass', category: 'Edge Cases' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Edge Case - works with empty config':
            result = await testEmptyConfig();
            break;
          case 'Edge Case - works with undefined options':
            result = await testUndefinedOptions();
            break;
          case 'Edge Case - works with null message system':
            result = await testNullMessageSystem();
            break;
          case 'Edge Case - works without any plugins':
            result = await testNoPlugins();
            break;
          case 'Edge Case - works with only useListeners':
            result = await testOnlyUseListeners();
            break;
          case 'Edge Case - can override no-op methods in subclass':
            result = await testOverrideNoOpMethods();
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

  const testEmptyConfig = async () => {
    const system = new StandalonePluginSystem('test', { config: {} });
    await system.build();
    if (!system.isBuilt) {
      return { success: false, error: 'Should work with empty config' };
    }
    return { success: true, message: 'Works with empty config' };
  };

  const testUndefinedOptions = async () => {
    const system = new StandalonePluginSystem('test', undefined);
    await system.build();
    if (!system.isBuilt) {
      return { success: false, error: 'Should work with undefined options' };
    }
    return { success: true, message: 'Works with undefined options' };
  };

  const testNullMessageSystem = async () => {
    const system = new StandalonePluginSystem('test', { ms: null });
    // Should use empty object instead of null
    if (system.messageSystem === null) {
      return { success: false, error: 'Should not use null message system' };
    }
    await system.build();
    return { success: true, message: 'Works with null message system (uses empty object)' };
  };

  const testNoPlugins = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Don't add any plugins, just build
    await system.build();
    if (!system.isBuilt) {
      return { success: false, error: 'Should work without any plugins' };
    }
    return { success: true, message: 'Works without any plugins' };
  };

  const testOnlyUseListeners = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Set defaultHooks to use defaults (which contains useListeners)
    system.defaultHooks = system.defaults;
    await system.build();
    const listeners = system.find('listeners');
    if (!listeners) {
      return { success: false, error: 'Should work with only useListeners' };
    }
    return { success: true, message: 'Works with only useListeners' };
  };

  const testOverrideNoOpMethods = async () => {
    class CustomPluginSystem extends StandalonePluginSystem {
      async accept(message) {
        this.acceptedMessage = message;
        return super.accept(message);
      }
    }
    const system = new CustomPluginSystem('test', {});
    await system.accept({ test: 'value' });
    if (!system.acceptedMessage || system.acceptedMessage.test !== 'value') {
      return { success: false, error: 'Should be able to override no-op methods' };
    }
    return { success: true, message: 'Can override no-op methods in subclass' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem Edge Cases Tests</h2>
      
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







