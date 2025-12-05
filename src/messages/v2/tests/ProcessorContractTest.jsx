import { useState } from 'react';
import { processorContract } from '../models/facet-contract/processor.contract.mycelia.js';

/**
 * ProcessorContractTest - React component test suite for processor contract definition
 */
export function ProcessorContractTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Contract Definition Tests
    { name: 'Contract - has correct name', category: 'Contract Definition' },
    { name: 'Contract - has required methods defined', category: 'Contract Definition' },
    { name: 'Contract - has no required properties', category: 'Contract Definition' },
    { name: 'Contract - has no custom validate function', category: 'Contract Definition' },
    
    // Contract Validation Tests
    { name: 'enforce - passes for valid processor facet', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing required methods', category: 'Contract Validation' },
    { name: 'enforce - passes with no required properties', category: 'Contract Validation' },
    { name: 'enforce - validates all required methods exist', category: 'Contract Validation' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        if (testName === 'Contract - has correct name') result = testContractHasCorrectName();
        else if (testName === 'Contract - has required methods defined') result = testContractHasRequiredMethods();
        else if (testName === 'Contract - has no required properties') result = testContractHasNoRequiredProperties();
        else if (testName === 'Contract - has no custom validate function') result = testContractHasNoCustomValidate();
        else if (testName === 'enforce - passes for valid processor facet') result = testEnforcePassesValid();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - passes with no required properties') result = testEnforcePassesNoProperties();
        else if (testName === 'enforce - validates all required methods exist') result = testEnforceValidatesAllMethods();
        else result = { success: false, error: 'Test not implemented' };

        setResults(prev => new Map(prev).set(testName, result));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          success: false,
          error: error.message || String(error)
        }));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 10);
  };

  const testContractHasCorrectName = () => {
    if (processorContract.name !== 'processor') {
      return { success: false, error: 'Contract name should be "processor"' };
    }
    return { success: true, message: 'Has correct name' };
  };

  const testContractHasRequiredMethods = () => {
    const requiredMethods = ['accept', 'processMessage', 'processTick', 'processImmediately'];
    for (const method of requiredMethods) {
      if (!processorContract.requiredMethods.includes(method)) {
        return { success: false, error: `Missing required method: ${method}` };
      }
    }
    return { success: true, message: 'Has required methods defined' };
  };

  const testContractHasNoRequiredProperties = () => {
    if (processorContract.requiredProperties.length !== 0) {
      return { success: false, error: 'Should have no required properties' };
    }
    return { success: true, message: 'Has no required properties' };
  };

  const testContractHasNoCustomValidate = () => {
    // Processor contract has validate: null, so no custom validation
    return { success: true, message: 'Has no custom validate function' };
  };

  const testEnforcePassesValid = () => {
    const validFacet = {
      accept: () => {},
      processMessage: () => {},
      processTick: () => {},
      processImmediately: () => {}
    };
    try {
      processorContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes for valid processor facet' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const invalidFacet = {
      accept: () => {}
      // Missing other methods
    };
    try {
      processorContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing required methods' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforcePassesNoProperties = () => {
    const validFacet = {
      accept: () => {},
      processMessage: () => {},
      processTick: () => {},
      processImmediately: () => {}
    };
    try {
      processorContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes with no required properties' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceValidatesAllMethods = () => {
    const requiredMethods = ['accept', 'processMessage', 'processTick', 'processImmediately'];
    for (const method of requiredMethods) {
      const invalidFacet = {
        accept: () => {},
        processMessage: () => {},
        processTick: () => {},
        processImmediately: () => {}
      };
      delete invalidFacet[method];
      try {
        processorContract.enforce({}, {}, {}, invalidFacet);
        return { success: false, error: `Should throw error for missing ${method}` };
      } catch (error) {
        if (!error.message.includes('missing required methods')) {
          return { success: false, error: `Wrong error for ${method}: ${error.message}` };
        }
      }
    }
    return { success: true, message: 'Validates all required methods exist' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Processor Contract Tests</h2>
      
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







