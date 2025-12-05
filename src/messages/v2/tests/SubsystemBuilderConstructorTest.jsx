import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';

/**
 * SubsystemBuilderConstructorTest
 * Tests for SubsystemBuilder constructor validation and initialization
 */
export function SubsystemBuilderConstructorTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createMockSubsystem = (options = {}) => {
    const subsystem = {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      api: options.api || { name: options.name || 'test-subsystem' }
    };
    subsystem.api.__facets = new FacetManager(subsystem);
    return subsystem;
  };

  const testCases = [
    { name: 'Constructor - throws error for null subsystem', category: 'Constructor' },
    { name: 'Constructor - throws error for undefined subsystem', category: 'Constructor' },
    { name: 'Constructor - accepts valid subsystem', category: 'Constructor' },
    { name: 'Constructor - initializes with empty context', category: 'Constructor' },
    { name: 'Constructor - initializes with null plan', category: 'Constructor' },
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
          case 'Constructor - throws error for null subsystem':
            result = await testConstructorThrowsErrorForNull();
            break;
          case 'Constructor - throws error for undefined subsystem':
            result = await testConstructorThrowsErrorForUndefined();
            break;
          case 'Constructor - accepts valid subsystem':
            result = await testConstructorAcceptsValidSubsystem();
            break;
          case 'Constructor - initializes with empty context':
            result = await testConstructorInitializesWithEmptyContext();
            break;
          case 'Constructor - initializes with null plan':
            result = await testConstructorInitializesWithNullPlan();
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
  const testConstructorThrowsErrorForNull = async () => {
    try {
      new SubsystemBuilder(null);
      return { success: false, error: 'Should throw error for null subsystem' };
    } catch (error) {
      if (error.message.includes('subsystem is required')) {
        return { success: true, message: 'Throws error for null subsystem' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForUndefined = async () => {
    try {
      new SubsystemBuilder(undefined);
      return { success: false, error: 'Should throw error for undefined subsystem' };
    } catch (error) {
      if (error.message.includes('subsystem is required')) {
        return { success: true, message: 'Throws error for undefined subsystem' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorAcceptsValidSubsystem = async () => {
    try {
      const subsystem = createMockSubsystem();
      const builder = new SubsystemBuilder(subsystem);
      if (!builder) {
        return { success: false, error: 'Builder should be created' };
      }
      return { success: true, message: 'Accepts valid subsystem' };
    } catch (error) {
      return { success: false, error: `Should accept valid subsystem: ${error.message}` };
    }
  };

  const testConstructorInitializesWithEmptyContext = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    // Check that getPlan returns null (indirect check that plan is null)
    const plan = builder.getPlan();
    if (plan !== null) {
      return { success: false, error: 'Plan should be null initially' };
    }
    
    // Check context by using withCtx and seeing it merges (indirect check)
    builder.withCtx({ test: 'value' });
    builder.plan();
    const resultPlan = builder.getPlan();
    if (!resultPlan || !resultPlan.resolvedCtx) {
      return { success: false, error: 'Context should be accessible' };
    }
    
    return { success: true, message: 'Initializes with empty context' };
  };

  const testConstructorInitializesWithNullPlan = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    const plan = builder.getPlan();
    if (plan !== null) {
      return { success: false, error: 'Plan should be null initially' };
    }
    
    return { success: true, message: 'Initializes with null plan' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>SubsystemBuilder Constructor Tests</h2>
      
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
                      {result.data && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Data:</strong>
                          <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', overflow: 'auto' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
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

