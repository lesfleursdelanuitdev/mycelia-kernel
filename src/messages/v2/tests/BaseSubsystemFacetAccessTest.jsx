import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * BaseSubsystemFacetAccessTest
 * Tests for BaseSubsystem facet access methods
 */
export function BaseSubsystemFacetAccessTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'find - delegates to api.__facets.find', category: 'Facet Access' },
    { name: 'find - returns undefined for non-existent facet', category: 'Facet Access' },
    { name: 'find - returns facet if present', category: 'Facet Access' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'find - delegates to api.__facets.find':
            result = await testFindDelegates();
            break;
          case 'find - returns undefined for non-existent facet':
            result = await testFindReturnsUndefined();
            break;
          case 'find - returns facet if present':
            result = await testFindReturnsFacet();
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

  const testFindDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const facet = new Facet('test', { attach: false });
    subsystem.api.__facets.add('test', facet);
    const found = subsystem.find('test');
    if (found !== facet) {
      return { success: false, error: 'Should delegate to api.__facets.find' };
    }
    return { success: true, message: 'Delegates to api.__facets.find' };
  };

  const testFindReturnsUndefined = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const found = subsystem.find('nonexistent');
    if (found !== undefined) {
      return { success: false, error: 'Should return undefined for non-existent facet' };
    }
    return { success: true, message: 'Returns undefined for non-existent facet' };
  };

  const testFindReturnsFacet = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const facet = new Facet('test', { attach: false });
    subsystem.api.__facets.add('test', facet);
    const found = subsystem.find('test');
    if (found !== facet) {
      return { success: false, error: 'Should return facet if present' };
    }
    return { success: true, message: 'Returns facet if present' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Facet Access Tests</h2>
      
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







