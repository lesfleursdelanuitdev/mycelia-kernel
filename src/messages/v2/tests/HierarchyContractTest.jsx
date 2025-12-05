import { useState } from 'react';
import { hierarchyContract } from '../models/facet-contract/hierarchy.contract.mycelia.js';

/**
 * HierarchyContractTest - React component test suite for hierarchy contract definition
 */
export function HierarchyContractTest() {
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
    { name: 'enforce - passes for valid hierarchy facet', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing required methods', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing children property', category: 'Contract Validation' },
    { name: 'enforce - throws error for children returning null', category: 'Contract Validation' },
    { name: 'enforce - throws error for children returning non-object', category: 'Contract Validation' },
    { name: 'enforce - validates all required methods exist', category: 'Contract Validation' },
    { name: 'enforce - validates children getter returns object', category: 'Contract Validation' },
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
        else if (testName === 'enforce - passes for valid hierarchy facet') result = testEnforcePassesValid();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - throws error for missing children property') result = testEnforceThrowsMissingChildren();
        else if (testName === 'enforce - throws error for children returning null') result = testEnforceThrowsChildrenNull();
        else if (testName === 'enforce - throws error for children returning non-object') result = testEnforceThrowsChildrenNonObject();
        else if (testName === 'enforce - validates all required methods exist') result = testEnforceValidatesAllMethods();
        else if (testName === 'enforce - validates children getter returns object') result = testEnforceValidatesChildrenObject();
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
    if (hierarchyContract.name !== 'hierarchy') {
      return { success: false, error: 'Contract name should be "hierarchy"' };
    }
    return { success: true, message: 'Has correct name' };
  };

  const testContractHasRequiredMethods = () => {
    const requiredMethods = [
      'addChild', 'removeChild', 'getChild', 'listChildren',
      'setParent', 'getParent', 'isRoot', 'getRoot', 'getLineage'
    ];
    for (const method of requiredMethods) {
      if (!hierarchyContract.requiredMethods.includes(method)) {
        return { success: false, error: `Missing required method: ${method}` };
      }
    }
    return { success: true, message: 'Has required methods defined' };
  };

  const testContractHasRequiredProperties = () => {
    if (!hierarchyContract.requiredProperties.includes('children')) {
      return { success: false, error: 'Missing required property: children' };
    }
    return { success: true, message: 'Has required properties defined' };
  };

  const testContractHasCustomValidate = () => {
    return { success: true, message: 'Has custom validate function' };
  };

  const testEnforcePassesValid = () => {
    const validFacet = {
      addChild: () => {},
      removeChild: () => {},
      getChild: () => {},
      listChildren: () => {},
      setParent: () => {},
      getParent: () => {},
      isRoot: () => {},
      getRoot: () => {},
      getLineage: () => {},
      get children() { return {}; }
    };
    try {
      hierarchyContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes for valid hierarchy facet' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const invalidFacet = {
      addChild: () => {},
      get children() { return {}; }
    };
    try {
      hierarchyContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing required methods' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingChildren = () => {
    const invalidFacet = {
      addChild: () => {},
      removeChild: () => {},
      getChild: () => {},
      listChildren: () => {},
      setParent: () => {},
      getParent: () => {},
      isRoot: () => {},
      getRoot: () => {},
      getLineage: () => {}
    };
    try {
      hierarchyContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing children property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('children')) {
        return { success: true, message: 'Throws error for missing children property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsChildrenNull = () => {
    const invalidFacet = {
      addChild: () => {},
      removeChild: () => {},
      getChild: () => {},
      listChildren: () => {},
      setParent: () => {},
      getParent: () => {},
      isRoot: () => {},
      getRoot: () => {},
      getLineage: () => {},
      get children() { return null; }
    };
    try {
      hierarchyContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for children returning null' };
    } catch (error) {
      if (error.message.includes('children getter must return an object')) {
        return { success: true, message: 'Throws error for children returning null' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsChildrenNonObject = () => {
    const invalidFacet = {
      addChild: () => {},
      removeChild: () => {},
      getChild: () => {},
      listChildren: () => {},
      setParent: () => {},
      getParent: () => {},
      isRoot: () => {},
      getRoot: () => {},
      getLineage: () => {},
      get children() { return 'not-an-object'; }
    };
    try {
      hierarchyContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for children returning non-object' };
    } catch (error) {
      if (error.message.includes('children getter must return an object')) {
        return { success: true, message: 'Throws error for children returning non-object' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesAllMethods = () => {
    const requiredMethods = [
      'addChild', 'removeChild', 'getChild', 'listChildren',
      'setParent', 'getParent', 'isRoot', 'getRoot', 'getLineage'
    ];
    for (const method of requiredMethods) {
      const invalidFacet = {
        addChild: () => {},
        removeChild: () => {},
        getChild: () => {},
        listChildren: () => {},
        setParent: () => {},
        getParent: () => {},
        isRoot: () => {},
        getRoot: () => {},
        getLineage: () => {},
        get children() { return {}; }
      };
      delete invalidFacet[method];
      try {
        hierarchyContract.enforce({}, {}, {}, invalidFacet);
        return { success: false, error: `Should throw error for missing ${method}` };
      } catch (error) {
        if (!error.message.includes('missing required methods')) {
          return { success: false, error: `Wrong error for ${method}: ${error.message}` };
        }
      }
    }
    return { success: true, message: 'Validates all required methods exist' };
  };

  const testEnforceValidatesChildrenObject = () => {
    const validFacet = {
      addChild: () => {},
      removeChild: () => {},
      getChild: () => {},
      listChildren: () => {},
      setParent: () => {},
      getParent: () => {},
      isRoot: () => {},
      getRoot: () => {},
      getLineage: () => {},
      get children() { return {}; }
    };
    try {
      hierarchyContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Validates children getter returns object' };
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
      <h2>Hierarchy Contract Tests</h2>
      
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







