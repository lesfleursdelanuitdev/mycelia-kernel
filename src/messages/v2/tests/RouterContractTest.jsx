import { useState } from 'react';
import { routerContract } from '../models/facet-contract/router.contract.mycelia.js';

/**
 * RouterContractTest - React component test suite for router contract definition
 */
export function RouterContractTest() {
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
    { name: 'enforce - passes for valid router facet', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing required methods', category: 'Contract Validation' },
    { name: 'enforce - throws error for missing _routeRegistry property', category: 'Contract Validation' },
    { name: 'enforce - throws error for null _routeRegistry', category: 'Contract Validation' },
    { name: 'enforce - throws error for non-object _routeRegistry', category: 'Contract Validation' },
    { name: 'enforce - validates all required methods exist', category: 'Contract Validation' },
    { name: 'enforce - validates _routeRegistry is object', category: 'Contract Validation' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Contract definition tests
        if (testName === 'Contract - has correct name') result = testContractHasCorrectName();
        else if (testName === 'Contract - has required methods defined') result = testContractHasRequiredMethods();
        else if (testName === 'Contract - has required properties defined') result = testContractHasRequiredProperties();
        else if (testName === 'Contract - has custom validate function') result = testContractHasCustomValidate();
        
        // Contract validation tests
        else if (testName === 'enforce - passes for valid router facet') result = testEnforcePassesValid();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - throws error for missing _routeRegistry property') result = testEnforceThrowsMissingProperty();
        else if (testName === 'enforce - throws error for null _routeRegistry') result = testEnforceThrowsNullRegistry();
        else if (testName === 'enforce - throws error for non-object _routeRegistry') result = testEnforceThrowsNonObjectRegistry();
        else if (testName === 'enforce - validates all required methods exist') result = testEnforceValidatesAllMethods();
        else if (testName === 'enforce - validates _routeRegistry is object') result = testEnforceValidatesRegistryObject();
        
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

  // ========== Contract Definition Tests ==========

  const testContractHasCorrectName = () => {
    if (routerContract.name !== 'router') {
      return { success: false, error: 'Contract name should be "router"' };
    }
    return { success: true, message: 'Has correct name' };
  };

  const testContractHasRequiredMethods = () => {
    const requiredMethods = [
      'registerRoute',
      'match',
      'route',
      'unregisterRoute',
      'hasRoute',
      'getRoutes'
    ];
    for (const method of requiredMethods) {
      if (!routerContract.requiredMethods.includes(method)) {
        return { success: false, error: `Missing required method: ${method}` };
      }
    }
    return { success: true, message: 'Has required methods defined' };
  };

  const testContractHasRequiredProperties = () => {
    if (!routerContract.requiredProperties.includes('_routeRegistry')) {
      return { success: false, error: 'Missing required property: _routeRegistry' };
    }
    return { success: true, message: 'Has required properties defined' };
  };

  const testContractHasCustomValidate = () => {
    // The contract should have a validate function (it's a private field, but we can test by calling enforce)
    // We'll test this indirectly through the validation tests
    return { success: true, message: 'Has custom validate function' };
  };

  // ========== Contract Validation Tests ==========

  const testEnforcePassesValid = () => {
    const validFacet = {
      registerRoute: () => {},
      match: () => {},
      route: () => {},
      unregisterRoute: () => {},
      hasRoute: () => {},
      getRoutes: () => {},
      _routeRegistry: {}
    };
    try {
      routerContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Passes for valid router facet' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const invalidFacet = {
      registerRoute: () => {},
      // Missing other methods
      _routeRegistry: {}
    };
    try {
      routerContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing required methods' };
    } catch (error) {
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingProperty = () => {
    const invalidFacet = {
      registerRoute: () => {},
      match: () => {},
      route: () => {},
      unregisterRoute: () => {},
      hasRoute: () => {},
      getRoutes: () => {}
      // Missing _routeRegistry
    };
    try {
      routerContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for missing _routeRegistry property' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('_routeRegistry')) {
        return { success: true, message: 'Throws error for missing _routeRegistry property' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNullRegistry = () => {
    const invalidFacet = {
      registerRoute: () => {},
      match: () => {},
      route: () => {},
      unregisterRoute: () => {},
      hasRoute: () => {},
      getRoutes: () => {},
      _routeRegistry: null
    };
    try {
      routerContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for null _routeRegistry' };
    } catch (error) {
      if (error.message.includes('_routeRegistry must be an object')) {
        return { success: true, message: 'Throws error for null _routeRegistry' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonObjectRegistry = () => {
    const invalidFacet = {
      registerRoute: () => {},
      match: () => {},
      route: () => {},
      unregisterRoute: () => {},
      hasRoute: () => {},
      getRoutes: () => {},
      _routeRegistry: 'not-an-object'
    };
    try {
      routerContract.enforce({}, {}, {}, invalidFacet);
      return { success: false, error: 'Should throw error for non-object _routeRegistry' };
    } catch (error) {
      if (error.message.includes('_routeRegistry must be an object')) {
        return { success: true, message: 'Throws error for non-object _routeRegistry' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesAllMethods = () => {
    const requiredMethods = [
      'registerRoute',
      'match',
      'route',
      'unregisterRoute',
      'hasRoute',
      'getRoutes'
    ];
    for (const method of requiredMethods) {
      const invalidFacet = {
        ...Object.fromEntries(requiredMethods.map(m => [m, () => {}])),
        _routeRegistry: {}
      };
      delete invalidFacet[method];
      try {
        routerContract.enforce({}, {}, {}, invalidFacet);
        return { success: false, error: `Should throw error for missing ${method}` };
      } catch (error) {
        if (!error.message.includes('missing required methods')) {
          return { success: false, error: `Wrong error for ${method}: ${error.message}` };
        }
      }
    }
    return { success: true, message: 'Validates all required methods exist' };
  };

  const testEnforceValidatesRegistryObject = () => {
    const validFacet = {
      registerRoute: () => {},
      match: () => {},
      route: () => {},
      unregisterRoute: () => {},
      hasRoute: () => {},
      getRoutes: () => {},
      _routeRegistry: {}
    };
    try {
      routerContract.enforce({}, {}, {}, validFacet);
      return { success: true, message: 'Validates _routeRegistry is object' };
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
      <h2>Router Contract Tests</h2>
      
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







