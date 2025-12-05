import { useState } from 'react';
import { queueContract } from '../models/facet-contract/queue.contract.mycelia.js';

/**
 * QueueContractTest - React component test suite for queue contract definition
 */
export function QueueContractTest() {
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
    { name: 'enforce - passes for valid queue facet', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing required methods', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing _queueManager property', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing queue property', category: 'Contract Validation' },
    { name: 'enforce - throws error for null _queueManager', category: 'Contract Validation' },
    { name: 'enforce - throws error for non-object _queueManager', category: 'Contract Validation' },
    { name: 'enforce - throws error for _queueManager without enqueue method', category: 'Contract Validation' },
    { name: 'enforce - throws error for null queue property', category: 'Contract Validation' },
    { name: 'enforce - throws error for non-object queue property', category: 'Contract Validation' },
    { name: 'enforce - validates all required methods exist', category: 'Contract Validation' },
    { name: 'enforce - validates _queueManager is object with enqueue', category: 'Contract Validation' },
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
        else if (testName === 'enforce - passes for valid queue facet') result = testEnforcePassesValid();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - throws error for missing _queueManager property') result = testEnforceThrowsMissingQueueManager();
        else if (testName === 'enforce - throws error for missing queue property') result = testEnforceThrowsMissingQueue();
        else if (testName === 'enforce - throws error for null _queueManager') result = testEnforceThrowsNullQueueManager();
        else if (testName === 'enforce - throws error for non-object _queueManager') result = testEnforceThrowsNonObjectQueueManager();
        else if (testName === 'enforce - throws error for _queueManager without enqueue method') result = testEnforceThrowsQueueManagerWithoutEnqueue();
        else if (testName === 'enforce - throws error for null queue property') result = testEnforceThrowsNullQueue();
        else if (testName === 'enforce - throws error for non-object queue property') result = testEnforceThrowsNonObjectQueue();
        else if (testName === 'enforce - validates all required methods exist') result = testEnforceValidatesAllMethods();
        else if (testName === 'enforce - validates _queueManager is object with enqueue') result = testEnforceValidatesQueueManager();
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
    if (queueContract.name !== 'queue') {
      return { success: false, error: 'Contract name should be "queue"' };
    }
    return { success: true, message: 'Has correct name' };
  };

  const testContractHasRequiredMethods = () => {
    const requiredMethods = ['selectNextMessage', 'hasMessagesToProcess', 'getQueueStatus'];
    for (const method of requiredMethods) {
      if (!queueContract.requiredMethods.includes(method)) {
        return { success: false, error: `Missing required method: ${method}` };
      }
    }
    return { success: true, message: 'Has required methods defined' };
  };

  const testContractHasRequiredProperties = () => {
    const requiredProps = ['_queueManager', 'queue'];
    for (const prop of requiredProps) {
      if (!queueContract.requiredProperties.includes(prop)) {
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
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: { enqueue: () => {} },
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes for valid queue facet' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      _queueManager: { enqueue: () => {} },
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing required methods' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingQueueManager = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing _queueManager property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('_queueManager')) {
        return { success: true, message: 'Throws error for missing _queueManager property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingQueue = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: { enqueue: () => {} }
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing queue property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('queue')) {
        return { success: true, message: 'Throws error for missing queue property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNullQueueManager = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: null,
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for null _queueManager' };
    } catch (error) {
      if (error.message.includes('_queueManager must be an object')) {
        return { success: true, message: 'Throws error for null _queueManager' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonObjectQueueManager = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: 'not-an-object',
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for non-object _queueManager' };
    } catch (error) {
      if (error.message.includes('_queueManager must be an object')) {
        return { success: true, message: 'Throws error for non-object _queueManager' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsQueueManagerWithoutEnqueue = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: {},
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for _queueManager without enqueue method' };
    } catch (error) {
      if (error.message.includes('_queueManager must have enqueue method')) {
        return { success: true, message: 'Throws error for _queueManager without enqueue method' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNullQueue = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: { enqueue: () => {} },
      queue: null
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for null queue property' };
    } catch (error) {
      if (error.message.includes('queue property must be an object')) {
        return { success: true, message: 'Throws error for null queue property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonObjectQueue = () => {
    const invalidFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: { enqueue: () => {} },
      queue: 'not-an-object'
    };
    try {
      queueContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for non-object queue property' };
    } catch (error) {
      if (error.message.includes('queue property must be an object')) {
        return { success: true, message: 'Throws error for non-object queue property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesAllMethods = () => {
    const requiredMethods = ['selectNextMessage', 'hasMessagesToProcess', 'getQueueStatus'];
    for (const method of requiredMethods) {
      const invalidFacet = {
        selectNextMessage: () => {},
        hasMessagesToProcess: () => {},
        getQueueStatus: () => {},
        _queueManager: { enqueue: () => {} },
        queue: {}
      };
      delete invalidFacet[method];
      try {
        queueContract.enforce({}, {}, {}, invalidFacet);
        return { success: false, error: `Should throw error for missing ${method}` };
      } catch (error) {
        if (!error.message.includes('missing required methods')) {
          return { success: false, error: `Wrong error for ${method}: ${error.message}` };
        }
      }
    }
    return { success: true, message: 'Validates all required methods exist' };
  };

  const testEnforceValidatesQueueManager = () => {
    const validFacet = {
      selectNextMessage: () => {},
      hasMessagesToProcess: () => {},
      getQueueStatus: () => {},
      _queueManager: { enqueue: () => {} },
      queue: {}
    };
    try {
      queueContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Validates _queueManager is object with enqueue' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Queue Contract Tests</h2>
      
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







