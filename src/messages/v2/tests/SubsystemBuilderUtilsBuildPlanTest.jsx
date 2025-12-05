import { useState } from 'react';
import { buildSubsystem } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * SubsystemBuilderUtilsBuildPlanTest
 * Tests for plan validation and context assignment in buildSubsystem
 */
export function SubsystemBuilderUtilsBuildPlanTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem with FacetManager
  const createMockSubsystem = (options = {}) => {
    const subsystem = {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      api: options.api || { name: options.name || 'test-subsystem' }
    };
    subsystem.api.__facets = new FacetManager(subsystem);
    return subsystem;
  };

  // Helper to create a valid plan
  const createValidPlan = () => {
    const facet1 = new Facet('test1', { attach: false });
    const facet2 = new Facet('test2', { attach: false });
    return {
      resolvedCtx: { ms: 'mock-ms', config: {} },
      orderedKinds: ['test1', 'test2'],
      facetsByKind: {
        test1: facet1,
        test2: facet2
      }
    };
  };

  // Helper to create invalid plans
  const createInvalidPlan = (type) => {
    switch (type) {
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'missingOrderedKinds':
        return {
          resolvedCtx: {},
          facetsByKind: { test1: new Facet('test1') }
        };
      case 'missingFacetsByKind':
        return {
          resolvedCtx: {},
          orderedKinds: ['test1']
        };
      case 'emptyOrderedKinds':
        return {
          resolvedCtx: {},
          orderedKinds: [],
          facetsByKind: { test1: new Facet('test1') }
        };
      case 'emptyFacetsByKind':
        return {
          resolvedCtx: {},
          orderedKinds: ['test1'],
          facetsByKind: {}
        };
      default:
        return null;
    }
  };

  const testCases = [
    // Plan Validation
    { name: 'Plan validation - validates plan has orderedKinds', category: 'Plan Validation' },
    { name: 'Plan validation - validates plan has facetsByKind', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for null plan', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for undefined plan', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for plan missing orderedKinds', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for plan missing facetsByKind', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for empty orderedKinds array', category: 'Plan Validation' },
    { name: 'Plan validation - throws error for empty facetsByKind object', category: 'Plan Validation' },
    { name: 'Plan validation - accepts valid plan structure', category: 'Plan Validation' },
    
    // Context Assignment
    { name: 'Context assignment - assigns resolvedCtx to subsystem.ctx', category: 'Context Assignment' },
    { name: 'Context assignment - overwrites existing subsystem.ctx', category: 'Context Assignment' },
    { name: 'Context assignment - preserves all properties from resolvedCtx', category: 'Context Assignment' },
    { name: 'Context assignment - includes graphCache in assigned ctx', category: 'Context Assignment' },
    { name: 'Context assignment - includes config in assigned ctx', category: 'Context Assignment' },
    { name: 'Context assignment - includes ms in assigned ctx', category: 'Context Assignment' },
    { name: 'Context assignment - includes debug flag in assigned ctx', category: 'Context Assignment' },
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
          case 'Plan validation - validates plan has orderedKinds':
            result = await testPlanValidatesOrderedKinds();
            break;
          case 'Plan validation - validates plan has facetsByKind':
            result = await testPlanValidatesFacetsByKind();
            break;
          case 'Plan validation - throws error for null plan':
            result = await testPlanThrowsErrorForNull();
            break;
          case 'Plan validation - throws error for undefined plan':
            result = await testPlanThrowsErrorForUndefined();
            break;
          case 'Plan validation - throws error for plan missing orderedKinds':
            result = await testPlanThrowsErrorForMissingOrderedKinds();
            break;
          case 'Plan validation - throws error for plan missing facetsByKind':
            result = await testPlanThrowsErrorForMissingFacetsByKind();
            break;
          case 'Plan validation - throws error for empty orderedKinds array':
            result = await testPlanThrowsErrorForEmptyOrderedKinds();
            break;
          case 'Plan validation - throws error for empty facetsByKind object':
            result = await testPlanThrowsErrorForEmptyFacetsByKind();
            break;
          case 'Plan validation - accepts valid plan structure':
            result = await testPlanAcceptsValidPlan();
            break;
          case 'Context assignment - assigns resolvedCtx to subsystem.ctx':
            result = await testContextAssignsResolvedCtx();
            break;
          case 'Context assignment - overwrites existing subsystem.ctx':
            result = await testContextOverwritesExisting();
            break;
          case 'Context assignment - preserves all properties from resolvedCtx':
            result = await testContextPreservesProperties();
            break;
          case 'Context assignment - includes graphCache in assigned ctx':
            result = await testContextIncludesGraphCache();
            break;
          case 'Context assignment - includes config in assigned ctx':
            result = await testContextIncludesConfig();
            break;
          case 'Context assignment - includes ms in assigned ctx':
            result = await testContextIncludesMs();
            break;
          case 'Context assignment - includes debug flag in assigned ctx':
            result = await testContextIncludesDebug();
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
  const testPlanValidatesOrderedKinds = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('missingOrderedKinds');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for missing orderedKinds' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Validates plan has orderedKinds' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanValidatesFacetsByKind = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('missingFacetsByKind');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for missing facetsByKind' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Validates plan has facetsByKind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForNull = async () => {
    const subsystem = createMockSubsystem();
    
    try {
      await buildSubsystem(subsystem, null);
      return { success: false, error: 'Should throw error for null plan' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for null plan' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForUndefined = async () => {
    const subsystem = createMockSubsystem();
    
    try {
      await buildSubsystem(subsystem, undefined);
      return { success: false, error: 'Should throw error for undefined plan' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for undefined plan' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForMissingOrderedKinds = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('missingOrderedKinds');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for missing orderedKinds' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for plan missing orderedKinds' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForMissingFacetsByKind = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('missingFacetsByKind');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for missing facetsByKind' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for plan missing facetsByKind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForEmptyOrderedKinds = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('emptyOrderedKinds');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for empty orderedKinds' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for empty orderedKinds array' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanThrowsErrorForEmptyFacetsByKind = async () => {
    const subsystem = createMockSubsystem();
    const plan = createInvalidPlan('emptyFacetsByKind');
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: false, error: 'Should throw error for empty facetsByKind' };
    } catch (error) {
      if (error.message.includes('invalid plan')) {
        return { success: true, message: 'Throws error for empty facetsByKind object' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testPlanAcceptsValidPlan = async () => {
    const subsystem = createMockSubsystem();
    const plan = createValidPlan();
    
    try {
      await buildSubsystem(subsystem, plan);
      return { success: true, message: 'Accepts valid plan structure' };
    } catch (error) {
      return { success: false, error: `Should accept valid plan: ${error.message}` };
    }
  };

  const testContextAssignsResolvedCtx = async () => {
    const subsystem = createMockSubsystem({ ctx: { existing: 'value' } });
    const plan = {
      resolvedCtx: { ms: 'mock-ms', newProp: 'newValue' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.newProp !== 'newValue') {
      return { success: false, error: 'resolvedCtx should be assigned to subsystem.ctx' };
    }
    
    return {
      success: true,
      message: 'Assigns resolvedCtx to subsystem.ctx',
      data: { ctx: subsystem.ctx }
    };
  };

  const testContextOverwritesExisting = async () => {
    const subsystem = createMockSubsystem({ ctx: { existing: 'old' } });
    const plan = {
      resolvedCtx: { existing: 'new' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.existing !== 'new') {
      return { success: false, error: 'Should overwrite existing subsystem.ctx' };
    }
    
    return {
      success: true,
      message: 'Overwrites existing subsystem.ctx',
      data: { ctx: subsystem.ctx }
    };
  };

  const testContextPreservesProperties = async () => {
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.prop1 !== 'value1' || subsystem.ctx.prop2 !== 'value2' || subsystem.ctx.prop3 !== 'value3') {
      return { success: false, error: 'Should preserve all properties from resolvedCtx' };
    }
    
    return {
      success: true,
      message: 'Preserves all properties from resolvedCtx',
      data: { ctx: subsystem.ctx }
    };
  };

  const testContextIncludesGraphCache = async () => {
    const mockCache = { size: () => 0 };
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { graphCache: mockCache },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.graphCache !== mockCache) {
      return { success: false, error: 'Should include graphCache in assigned ctx' };
    }
    
    return {
      success: true,
      message: 'Includes graphCache in assigned ctx',
      data: { hasGraphCache: !!subsystem.ctx.graphCache }
    };
  };

  const testContextIncludesConfig = async () => {
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { config: { queue: { capacity: 100 } } },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (!subsystem.ctx.config || subsystem.ctx.config.queue?.capacity !== 100) {
      return { success: false, error: 'Should include config in assigned ctx' };
    }
    
    return {
      success: true,
      message: 'Includes config in assigned ctx',
      data: { config: subsystem.ctx.config }
    };
  };

  const testContextIncludesMs = async () => {
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { ms: 'mock-ms' },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.ms !== 'mock-ms') {
      return { success: false, error: 'Should include ms in assigned ctx' };
    }
    
    return {
      success: true,
      message: 'Includes ms in assigned ctx',
      data: { ms: subsystem.ctx.ms }
    };
  };

  const testContextIncludesDebug = async () => {
    const subsystem = createMockSubsystem();
    const plan = {
      resolvedCtx: { debug: true },
      orderedKinds: [],
      facetsByKind: {}
    };
    
    await buildSubsystem(subsystem, plan);
    
    if (subsystem.ctx.debug !== true) {
      return { success: false, error: 'Should include debug flag in assigned ctx' };
    }
    
    return {
      success: true,
      message: 'Includes debug flag in assigned ctx',
      data: { debug: subsystem.ctx.debug }
    };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Build Phase Tests - Plan Validation & Context Assignment</h2>
      
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







