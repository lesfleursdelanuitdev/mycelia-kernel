import { useState } from 'react';
import { FacetContract, createFacetContract } from '../models/facet-contract/facet-contract.mycelia.js';

/**
 * FacetContractTest - React component test suite for FacetContract class
 * Tests the FacetContract class and createFacetContract factory function
 */
export function FacetContractTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Constructor Tests
    { name: 'Constructor - creates contract with name and requirements', category: 'Constructor' },
    { name: 'Constructor - throws error for missing name', category: 'Constructor' },
    { name: 'Constructor - throws error for empty name', category: 'Constructor' },
    { name: 'Constructor - throws error for non-string name', category: 'Constructor' },
    { name: 'Constructor - throws error for invalid requirements (null)', category: 'Constructor' },
    { name: 'Constructor - throws error for invalid requirements (array)', category: 'Constructor' },
    { name: 'Constructor - accepts empty requirements object', category: 'Constructor' },
    { name: 'Constructor - accepts requiredMethods array', category: 'Constructor' },
    { name: 'Constructor - accepts requiredProperties array', category: 'Constructor' },
    { name: 'Constructor - accepts validate function', category: 'Constructor' },
    { name: 'Constructor - throws error for invalid validate (non-function, non-null)', category: 'Constructor' },
    { name: 'Constructor - handles default empty arrays for methods/properties', category: 'Constructor' },
    
    // Enforce Method Tests
    { name: 'enforce - validates required methods exist', category: 'Enforce Method' },
    { name: 'enforce - throws error for missing required methods', category: 'Enforce Method' },
    { name: 'enforce - throws error for non-function methods', category: 'Enforce Method' },
    { name: 'enforce - validates required properties exist', category: 'Enforce Method' },
    { name: 'enforce - throws error for missing required properties', category: 'Enforce Method' },
    { name: 'enforce - throws error for undefined properties', category: 'Enforce Method' },
    { name: 'enforce - runs custom validate function', category: 'Enforce Method' },
    { name: 'enforce - throws error when custom validate fails', category: 'Enforce Method' },
    { name: 'enforce - throws error for null facet', category: 'Enforce Method' },
    { name: 'enforce - throws error for non-object facet', category: 'Enforce Method' },
    { name: 'enforce - includes contract name in error messages', category: 'Enforce Method' },
    { name: 'enforce - handles facets with no required methods/properties', category: 'Enforce Method' },
    { name: 'enforce - validates methods before properties', category: 'Enforce Method' },
    { name: 'enforce - validates properties before custom validation', category: 'Enforce Method' },
    
    // createFacetContract Factory Tests
    { name: 'createFacetContract - creates contract with name', category: 'Factory Function' },
    { name: 'createFacetContract - uses default empty arrays', category: 'Factory Function' },
    { name: 'createFacetContract - accepts requiredMethods', category: 'Factory Function' },
    { name: 'createFacetContract - accepts requiredProperties', category: 'Factory Function' },
    { name: 'createFacetContract - accepts validate function', category: 'Factory Function' },
    { name: 'createFacetContract - returns FacetContract instance', category: 'Factory Function' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Constructor tests
        if (testName === 'Constructor - creates contract with name and requirements') result = testConstructorCreatesContract();
        else if (testName === 'Constructor - throws error for missing name') result = testConstructorThrowsMissingName();
        else if (testName === 'Constructor - throws error for empty name') result = testConstructorThrowsEmptyName();
        else if (testName === 'Constructor - throws error for non-string name') result = testConstructorThrowsNonStringName();
        else if (testName === 'Constructor - throws error for invalid requirements (null)') result = testConstructorThrowsInvalidRequirementsNull();
        else if (testName === 'Constructor - throws error for invalid requirements (array)') result = testConstructorThrowsInvalidRequirementsArray();
        else if (testName === 'Constructor - accepts empty requirements object') result = testConstructorAcceptsEmptyRequirements();
        else if (testName === 'Constructor - accepts requiredMethods array') result = testConstructorAcceptsRequiredMethods();
        else if (testName === 'Constructor - accepts requiredProperties array') result = testConstructorAcceptsRequiredProperties();
        else if (testName === 'Constructor - accepts validate function') result = testConstructorAcceptsValidateFunction();
        else if (testName === 'Constructor - throws error for invalid validate (non-function, non-null)') result = testConstructorThrowsInvalidValidate();
        else if (testName === 'Constructor - handles default empty arrays for methods/properties') result = testConstructorHandlesDefaultArrays();
        
        // Enforce method tests
        else if (testName === 'enforce - validates required methods exist') result = testEnforceValidatesRequiredMethods();
        else if (testName === 'enforce - throws error for missing required methods') result = testEnforceThrowsMissingMethods();
        else if (testName === 'enforce - throws error for non-function methods') result = testEnforceThrowsNonFunctionMethods();
        else if (testName === 'enforce - validates required properties exist') result = testEnforceValidatesRequiredProperties();
        else if (testName === 'enforce - throws error for missing required properties') result = testEnforceThrowsMissingProperties();
        else if (testName === 'enforce - throws error for undefined properties') result = testEnforceThrowsUndefinedProperties();
        else if (testName === 'enforce - runs custom validate function') result = testEnforceRunsCustomValidate();
        else if (testName === 'enforce - throws error when custom validate fails') result = testEnforceThrowsCustomValidateError();
        else if (testName === 'enforce - throws error for null facet') result = testEnforceThrowsNullFacet();
        else if (testName === 'enforce - throws error for non-object facet') result = testEnforceThrowsNonObjectFacet();
        else if (testName === 'enforce - includes contract name in error messages') result = testEnforceIncludesContractName();
        else if (testName === 'enforce - handles facets with no required methods/properties') result = testEnforceHandlesNoRequirements();
        else if (testName === 'enforce - validates methods before properties') result = testEnforceValidatesMethodsFirst();
        else if (testName === 'enforce - validates properties before custom validation') result = testEnforceValidatesPropertiesBeforeCustom();
        
        // Factory function tests
        else if (testName === 'createFacetContract - creates contract with name') result = testCreateFacetContractCreates();
        else if (testName === 'createFacetContract - uses default empty arrays') result = testCreateFacetContractDefaults();
        else if (testName === 'createFacetContract - accepts requiredMethods') result = testCreateFacetContractAcceptsMethods();
        else if (testName === 'createFacetContract - accepts requiredProperties') result = testCreateFacetContractAcceptsProperties();
        else if (testName === 'createFacetContract - accepts validate function') result = testCreateFacetContractAcceptsValidate();
        else if (testName === 'createFacetContract - returns FacetContract instance') result = testCreateFacetContractReturnsInstance();
        
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

  // ========== Constructor Tests ==========

  const testConstructorCreatesContract = () => {
    const contract = new FacetContract('test-contract', {
      requiredMethods: ['method1'],
      requiredProperties: ['prop1']
    });
    if (contract.name !== 'test-contract') {
      return { success: false, error: 'Contract name should be set' };
    }
    if (contract.requiredMethods.length !== 1 || contract.requiredMethods[0] !== 'method1') {
      return { success: false, error: 'Required methods should be set' };
    }
    if (contract.requiredProperties.length !== 1 || contract.requiredProperties[0] !== 'prop1') {
      return { success: false, error: 'Required properties should be set' };
    }
    return { success: true, message: 'Creates contract with name and requirements' };
  };

  const testConstructorThrowsMissingName = () => {
    try {
      new FacetContract();
      return { success: false, error: 'Should throw error for missing name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for missing name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsEmptyName = () => {
    try {
      new FacetContract('');
      return { success: false, error: 'Should throw error for empty name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsNonStringName = () => {
    try {
      new FacetContract(123);
      return { success: false, error: 'Should throw error for non-string name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for non-string name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsInvalidRequirementsNull = () => {
    try {
      new FacetContract('test', null);
      return { success: false, error: 'Should throw error for null requirements' };
    } catch (error) {
      if (error.message.includes('requirements must be an object')) {
        return { success: true, message: 'Throws error for null requirements' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsInvalidRequirementsArray = () => {
    try {
      new FacetContract('test', []);
      return { success: false, error: 'Should throw error for array requirements' };
    } catch (error) {
      if (error.message.includes('requirements must be an object')) {
        return { success: true, message: 'Throws error for array requirements' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorAcceptsEmptyRequirements = () => {
    const contract = new FacetContract('test', {});
    if (contract.name !== 'test') {
      return { success: false, error: 'Contract name should be set' };
    }
    if (contract.requiredMethods.length !== 0) {
      return { success: false, error: 'Required methods should default to empty array' };
    }
    if (contract.requiredProperties.length !== 0) {
      return { success: false, error: 'Required properties should default to empty array' };
    }
    return { success: true, message: 'Accepts empty requirements object' };
  };

  const testConstructorAcceptsRequiredMethods = () => {
    const contract = new FacetContract('test', {
      requiredMethods: ['method1', 'method2']
    });
    if (contract.requiredMethods.length !== 2) {
      return { success: false, error: 'Required methods should be set' };
    }
    if (!contract.requiredMethods.includes('method1') || !contract.requiredMethods.includes('method2')) {
      return { success: false, error: 'Required methods should contain correct values' };
    }
    return { success: true, message: 'Accepts requiredMethods array' };
  };

  const testConstructorAcceptsRequiredProperties = () => {
    const contract = new FacetContract('test', {
      requiredProperties: ['prop1', 'prop2']
    });
    if (contract.requiredProperties.length !== 2) {
      return { success: false, error: 'Required properties should be set' };
    }
    if (!contract.requiredProperties.includes('prop1') || !contract.requiredProperties.includes('prop2')) {
      return { success: false, error: 'Required properties should contain correct values' };
    }
    return { success: true, message: 'Accepts requiredProperties array' };
  };

  const testConstructorAcceptsValidateFunction = () => {
    const validateFn = () => {};
    const contract = new FacetContract('test', {}, validateFn);
    // Contract should be created successfully
    if (contract.name !== 'test') {
      return { success: false, error: 'Contract should be created' };
    }
    return { success: true, message: 'Accepts validate function' };
  };

  const testConstructorThrowsInvalidValidate = () => {
    try {
      new FacetContract('test', {}, 'not-a-function');
      return { success: false, error: 'Should throw error for invalid validate' };
    } catch (error) {
      if (error.message.includes('validate must be a function or null')) {
        return { success: true, message: 'Throws error for invalid validate' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorHandlesDefaultArrays = () => {
    const contract = new FacetContract('test', {});
    if (!Array.isArray(contract.requiredMethods)) {
      return { success: false, error: 'requiredMethods should be an array' };
    }
    if (!Array.isArray(contract.requiredProperties)) {
      return { success: false, error: 'requiredProperties should be an array' };
    }
    if (contract.requiredMethods.length !== 0) {
      return { success: false, error: 'requiredMethods should default to empty array' };
    }
    if (contract.requiredProperties.length !== 0) {
      return { success: false, error: 'requiredProperties should default to empty array' };
    }
    return { success: true, message: 'Handles default empty arrays' };
  };

  // ========== Enforce Method Tests ==========

  const testEnforceValidatesRequiredMethods = () => {
    const contract = new FacetContract('test', {
      requiredMethods: ['method1']
    });
    const facet = {
      method1: () => {}
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: true, message: 'Validates required methods exist' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingMethods = () => {
    const contract = new FacetContract('test', {
      requiredMethods: ['method1', 'method2']
    });
    const facet = {
      method1: () => {}
      // method2 is missing
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error for missing methods' };
    } catch (error) {
      if (error.message.includes('missing required methods') && error.message.includes('method2')) {
        return { success: true, message: 'Throws error for missing required methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonFunctionMethods = () => {
    const contract = new FacetContract('test', {
      requiredMethods: ['method1']
    });
    const facet = {
      method1: 'not-a-function'
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error for non-function methods' };
    } catch (error) {
      if (error.message.includes('missing required methods') && error.message.includes('method1')) {
        return { success: true, message: 'Throws error for non-function methods' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesRequiredProperties = () => {
    const contract = new FacetContract('test', {
      requiredProperties: ['prop1']
    });
    const facet = {
      prop1: 'value1'
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: true, message: 'Validates required properties exist' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsMissingProperties = () => {
    const contract = new FacetContract('test', {
      requiredProperties: ['prop1', 'prop2']
    });
    const facet = {
      prop1: 'value1'
      // prop2 is missing
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error for missing properties' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('prop2')) {
        return { success: true, message: 'Throws error for missing required properties' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsUndefinedProperties = () => {
    const contract = new FacetContract('test', {
      requiredProperties: ['prop1']
    });
    const facet = {
      prop1: undefined
    };
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error for undefined properties' };
    } catch (error) {
      if (error.message.includes('missing required properties') && error.message.includes('prop1')) {
        return { success: true, message: 'Throws error for undefined properties' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceRunsCustomValidate = () => {
    let validateCalled = false;
    const contract = new FacetContract('test', {}, (ctx, api, subsystem, facet) => {
      validateCalled = true;
    });
    const facet = {};
    try {
      contract.enforce({}, {}, {}, facet);
      if (!validateCalled) {
        return { success: false, error: 'Custom validate should be called' };
      }
      return { success: true, message: 'Runs custom validate function' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceThrowsCustomValidateError = () => {
    const contract = new FacetContract('test', {}, (ctx, api, subsystem, facet) => {
      throw new Error('Custom validation failed');
    });
    const facet = {};
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error when custom validate fails' };
    } catch (error) {
      if (error.message.includes('validation failed') && error.message.includes('Custom validation failed')) {
        return { success: true, message: 'Throws error when custom validate fails' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNullFacet = () => {
    const contract = new FacetContract('test', {});
    try {
      contract.enforce({}, {}, {}, null);
      return { success: false, error: 'Should throw error for null facet' };
    } catch (error) {
      if (error.message.includes('facet must be an object')) {
        return { success: true, message: 'Throws error for null facet' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceThrowsNonObjectFacet = () => {
    const contract = new FacetContract('test', {});
    try {
      contract.enforce({}, {}, {}, 'not-an-object');
      return { success: false, error: 'Should throw error for non-object facet' };
    } catch (error) {
      if (error.message.includes('facet must be an object')) {
        return { success: true, message: 'Throws error for non-object facet' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceIncludesContractName = () => {
    const contract = new FacetContract('my-contract', {
      requiredMethods: ['method1']
    });
    const facet = {};
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes("'my-contract'")) {
        return { success: true, message: 'Includes contract name in error messages' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceHandlesNoRequirements = () => {
    const contract = new FacetContract('test', {});
    const facet = {};
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: true, message: 'Handles facets with no required methods/properties' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testEnforceValidatesMethodsFirst = () => {
    const contract = new FacetContract('test', {
      requiredMethods: ['method1'],
      requiredProperties: ['prop1']
    });
    const facet = {}; // Missing both
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      // Should mention missing methods, not properties
      if (error.message.includes('missing required methods')) {
        return { success: true, message: 'Validates methods before properties' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testEnforceValidatesPropertiesBeforeCustom = () => {
    let validateCalled = false;
    const contract = new FacetContract('test', {
      requiredProperties: ['prop1']
    }, (ctx, api, subsystem, facet) => {
      validateCalled = true;
    });
    const facet = {}; // Missing prop1
    try {
      contract.enforce({}, {}, {}, facet);
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing required properties') && !validateCalled) {
        return { success: true, message: 'Validates properties before custom validation' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  // ========== Factory Function Tests ==========

  const testCreateFacetContractCreates = () => {
    const contract = createFacetContract({ name: 'test' });
    if (contract.name !== 'test') {
      return { success: false, error: 'Contract name should be set' };
    }
    return { success: true, message: 'Creates contract with name' };
  };

  const testCreateFacetContractDefaults = () => {
    const contract = createFacetContract({ name: 'test' });
    if (contract.requiredMethods.length !== 0) {
      return { success: false, error: 'requiredMethods should default to empty array' };
    }
    if (contract.requiredProperties.length !== 0) {
      return { success: false, error: 'requiredProperties should default to empty array' };
    }
    return { success: true, message: 'Uses default empty arrays' };
  };

  const testCreateFacetContractAcceptsMethods = () => {
    const contract = createFacetContract({
      name: 'test',
      requiredMethods: ['method1', 'method2']
    });
    if (contract.requiredMethods.length !== 2) {
      return { success: false, error: 'Required methods should be set' };
    }
    return { success: true, message: 'Accepts requiredMethods' };
  };

  const testCreateFacetContractAcceptsProperties = () => {
    const contract = createFacetContract({
      name: 'test',
      requiredProperties: ['prop1', 'prop2']
    });
    if (contract.requiredProperties.length !== 2) {
      return { success: false, error: 'Required properties should be set' };
    }
    return { success: true, message: 'Accepts requiredProperties' };
  };

  const testCreateFacetContractAcceptsValidate = () => {
    const validateFn = () => {};
    const contract = createFacetContract({
      name: 'test',
      validate: validateFn
    });
    // Should create successfully
    if (contract.name !== 'test') {
      return { success: false, error: 'Contract should be created' };
    }
    return { success: true, message: 'Accepts validate function' };
  };

  const testCreateFacetContractReturnsInstance = () => {
    const contract = createFacetContract({ name: 'test' });
    if (!(contract instanceof FacetContract)) {
      return { success: false, error: 'Should return FacetContract instance' };
    }
    return { success: true, message: 'Returns FacetContract instance' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>FacetContract Tests</h2>
      
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







