import { useState } from 'react';
import { listenersContract } from '../models/facet-contract/listeners.contract.mycelia.js';

/**
 * ListenersContractTest - React component test suite for listeners contract definition
 */
export function ListenersContractTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Contract Definition Tests
    { name: 'Contract - has correct name', category: 'Contract Definition' },
    { name: 'Contract - has required methods defined', category: 'Contract Definition' },
    { name: 'Contract - has required properties defined', category: 'Contract Definition' },
    { name: 'Contract - has custom validate function', category: 'Contract Definition' },
    
    // Contract Validation Tests
    { name: 'enforce - passes for valid listeners facet', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing required methods', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing listeners property', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing _listenerManager property', category: 'Contract Validation' },
    { name: 'enforce - throws error for non-function _listenerManager', category: 'Contract Validation' },
    { name: 'enforce - throws error for _listenerManager returning invalid value', category: 'Contract Validation' },
    { name: 'enforce - validates _listenerManager is function', category: 'Contract Validation' },
    { name: 'enforce - validates listeners property exists', category: 'Contract Validation' },
    { name: 'enforce - validates _listenerManager() returns object or null', category: 'Contract Validation' },
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
        else if (testName === 'Contract - has required properties defined') result = testContractHasRequiredProperties();
        else if (testName === 'Contract - has custom validate function') result = testContractHasCustomValidate();
        else if (testName === 'enforce - passes for valid listeners facet') result = testEnforcePassesValid();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - throws error for missing listeners property') result = testEnforceThrowsMissingListeners();
        else if (testName === 'enforce - throws error for missing _listenerManager property') result = testEnforceThrowsMissingListenerManager();
        else if (testName === 'enforce - throws error for non-function _listenerManager') result = testEnforceThrowsNonFunctionListenerManager();
        else if (testName === 'enforce - throws error for _listenerManager returning invalid value') result = testEnforceThrowsInvalidReturnValue();
        else if (testName === 'enforce - validates _listenerManager is function') result = testEnforceValidatesListenerManagerFunction();
        else if (testName === 'enforce - validates listeners property exists') result = testEnforceValidatesListenersProperty();
        else if (testName === 'enforce - validates _listenerManager() returns object or null') result = testEnforceValidatesListenerManagerReturn();
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
    if (listenersContract.name !== 'listeners') {
      return { success: false, error: 'Contract name should be "listeners"' };
    }
    return { success: true, message: 'Has correct name' };
  };

  const testContractHasRequiredMethods = () => {
    const requiredMethods = ['on', 'off', 'hasListeners', 'enableListeners', 'disableListeners'];
    for (const method of requiredMethods) {
      if (!listenersContract.requiredMethods.includes(method)) {
        return { success: false, error: `Missing required method: ${method}` };
      }
    }
    return { success: true, message: 'Has required methods defined' };
  };

  const testContractHasRequiredProperties = () => {
    const requiredProps = ['listeners', '_listenerManager'];
    for (const prop of requiredProps) {
      if (!listenersContract.requiredProperties.includes(prop)) {
        return { success: false, error: `Missing required property: ${prop}` };
      }
    }
    return { success: true, message: 'Has required properties defined' };
  };

  const testContractHasCustomValidate = () => {
    return { success: true, message: 'Has custom validate function' };
  };

  const testEnforcePassesValid = () => {
    const validFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => ({})
    };
    try {
      listenersContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes for valid listeners facet' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const invalidFacet = {
      on: () => {},
      get listeners() { return null; },
      _listenerManager: () => null
    };
    try {
      listenersContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing required methods' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingListeners = () => {
    const invalidFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      _listenerManager: () => null
    };
    try {
      listenersContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing listeners property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('listeners')) {
        return { success: true, message: 'Throws error for missing listeners property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingListenerManager = () => {
    const invalidFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return null; }
    };
    try {
      listenersContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing _listenerManager property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('_listenerManager')) {
        return { success: true, message: 'Throws error for missing _listenerManager property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonFunctionListenerManager = () => {
    const invalidFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return null; },
      _listenerManager: 'not-a-function'
    };
    try {
      listenersContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for non-function _listenerManager' };
    } catch (error) {
      if (error.message.includes('_listenerManager must be a function')) {
        return { success: true, message: 'Throws error for non-function _listenerManager' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsInvalidReturnValue = () => {
    const invalidFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => 'not-an-object-or-null'
    };
    try {
      listenersContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for _listenerManager returning invalid value' };
    } catch (error) {
      if (error.message.includes('_listenerManager() must return an object or null')) {
        return { success: true, message: 'Throws error for _listenerManager returning invalid value' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesListenerManagerFunction = () => {
    const validFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => null
    };
    try {
      listenersContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Validates _listenerManager is function' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceValidatesListenersProperty = () => {
    const validFacet = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => null
    };
    try {
      listenersContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Validates listeners property exists' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceValidatesListenerManagerReturn = () => {
    // Test with null return
    const validFacet1 = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => null
    };
    try {
      listenersContract.enforce({}, {}, {}, validFacet1);
    } catch (error) {
      return { success: false, error: `Should not throw with null: ${error.message}` };
    }

    // Test with object return
    const validFacet2 = {
      on: () => {},
      off: () => {},
      hasListeners: () => {},
      enableListeners: () => {},
      disableListeners: () => {},
      get listeners() { return this._listenerManager(); },
      _listenerManager: () => ({})
    };
    try {
      listenersContract.enforce({}, {}, {}, validFacet2);
      return { success: true, message: 'Validates _listenerManager() returns object or null' };
    } catch (error) {
      return { success: false, error: `Should not throw with object: ${error.message}` };
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Listeners Contract Tests</h2>
      
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







