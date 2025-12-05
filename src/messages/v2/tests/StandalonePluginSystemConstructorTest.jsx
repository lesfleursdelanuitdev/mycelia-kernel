import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from '../hooks/listeners/use-listeners.mycelia.js';

/**
 * StandalonePluginSystemConstructorTest
 * Tests for StandalonePluginSystem constructor validation and initialization
 */
export function StandalonePluginSystemConstructorTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Constructor - accepts valid name and options', category: 'Constructor' },
    { name: 'Constructor - passes empty object for ms if not provided', category: 'Constructor' },
    { name: 'Constructor - uses provided ms if provided', category: 'Constructor' },
    { name: 'Constructor - sets defaults to [useListeners]', category: 'Constructor' },
    { name: 'Constructor - calls super with correct parameters', category: 'Constructor' },
    { name: 'Constructor - initializes as BaseSubsystem instance', category: 'Constructor' },
    { name: 'Constructor - inherits all BaseSubsystem properties', category: 'Constructor' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - accepts valid name and options':
            result = await testConstructorAcceptsValid();
            break;
          case 'Constructor - passes empty object for ms if not provided':
            result = await testConstructorPassesEmptyMs();
            break;
          case 'Constructor - uses provided ms if provided':
            result = await testConstructorUsesProvidedMs();
            break;
          case 'Constructor - sets defaults to [useListeners]':
            result = await testConstructorSetsDefaults();
            break;
          case 'Constructor - calls super with correct parameters':
            result = await testConstructorCallsSuper();
            break;
          case 'Constructor - initializes as BaseSubsystem instance':
            result = await testConstructorIsBaseSubsystem();
            break;
          case 'Constructor - inherits all BaseSubsystem properties':
            result = await testConstructorInheritsProperties();
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

  const testConstructorAcceptsValid = async () => {
    try {
      const system = new StandalonePluginSystem('test', { config: { test: 'value' } });
      if (!system) {
        return { success: false, error: 'System should be created' };
      }
      if (system.name !== 'test') {
        return { success: false, error: 'Name should be set correctly' };
      }
      return { success: true, message: 'Accepts valid name and options' };
    } catch (error) {
      return { success: false, error: `Should accept valid input: ${error.message}` };
    }
  };

  const testConstructorPassesEmptyMs = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (!system.messageSystem || typeof system.messageSystem !== 'object') {
      return { success: false, error: 'messageSystem should be an object' };
    }
    if (Object.keys(system.messageSystem).length !== 0) {
      return { success: false, error: 'messageSystem should be empty object when not provided' };
    }
    return { success: true, message: 'Passes empty object for ms if not provided' };
  };

  const testConstructorUsesProvidedMs = async () => {
    const customMs = { name: 'custom-ms', id: 'custom-1' };
    const system = new StandalonePluginSystem('test', { ms: customMs });
    if (system.messageSystem !== customMs) {
      return { success: false, error: 'Should use provided ms' };
    }
    return { success: true, message: 'Uses provided ms if provided' };
  };

  const testConstructorSetsDefaults = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (!Array.isArray(system.defaults)) {
      return { success: false, error: 'defaults should be an array' };
    }
    if (system.defaults.length !== 1) {
      return { success: false, error: 'defaults should contain one hook' };
    }
    if (system.defaults[0] !== useListeners) {
      return { success: false, error: 'defaults should contain useListeners' };
    }
    return { success: true, message: 'Sets defaults to [useListeners]' };
  };

  const testConstructorCallsSuper = async () => {
    const system = new StandalonePluginSystem('test', { config: { test: 'value' }, debug: true });
    if (system.ctx.config.test !== 'value') {
      return { success: false, error: 'Should pass config to super' };
    }
    if (system.ctx.debug !== true) {
      return { success: false, error: 'Should pass debug to super' };
    }
    return { success: true, message: 'Calls super with correct parameters' };
  };

  const testConstructorIsBaseSubsystem = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (!(system instanceof BaseSubsystem)) {
      return { success: false, error: 'Should be instance of BaseSubsystem' };
    }
    return { success: true, message: 'Initializes as BaseSubsystem instance' };
  };

  const testConstructorInheritsProperties = async () => {
    const system = new StandalonePluginSystem('test', {});
    // Check inherited properties
    if (typeof system.build !== 'function') {
      return { success: false, error: 'Should inherit build method' };
    }
    if (typeof system.dispose !== 'function') {
      return { success: false, error: 'Should inherit dispose method' };
    }
    if (typeof system.use !== 'function') {
      return { success: false, error: 'Should inherit use method' };
    }
    if (typeof system.find !== 'function') {
      return { success: false, error: 'Should inherit find method' };
    }
    if (typeof system.setParent !== 'function') {
      return { success: false, error: 'Should inherit setParent method' };
    }
    return { success: true, message: 'Inherits all BaseSubsystem properties' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem Constructor Tests</h2>
      
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







