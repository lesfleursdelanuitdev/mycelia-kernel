import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderContextManagementTest
 * Tests for context management (withCtx, clearCtx) in SubsystemBuilder
 */
export function SubsystemBuilderContextManagementTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createMockSubsystem = (options = {}) => {
    const subsystem = {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      defaultHooks: options.defaultHooks || [],
      hooks: options.hooks || [],
      api: options.api || { name: options.name || 'test-subsystem' }
    };
    subsystem.api.__facets = new FacetManager(subsystem);
    return subsystem;
  };

  // Helper to create a simple mock hook
  const createMockHook = (kind) => {
    return createHook({
      kind,
      overwrite: false,
      required: [],
      attach: false,
      source: `test://${kind}`,
      fn: () => new Facet(kind, { attach: false, source: `test://${kind}` })
    });
  };

  const testCases = [
    // withCtx() Tests
    { name: 'withCtx - merges context (shallow merge)', category: 'withCtx' },
    { name: 'withCtx - supports method chaining', category: 'withCtx' },
    { name: 'withCtx - merges nested config objects (deep merge)', category: 'withCtx' },
    { name: 'withCtx - overwrites existing context properties', category: 'withCtx' },
    { name: 'withCtx - handles empty context object', category: 'withCtx' },
    { name: 'withCtx - handles undefined context (defaults to {})', category: 'withCtx' },
    { name: 'withCtx - preserves non-config properties', category: 'withCtx' },
    { name: 'withCtx - handles multiple calls (accumulation)', category: 'withCtx' },
    
    // clearCtx() Tests
    { name: 'clearCtx - clears all context', category: 'clearCtx' },
    { name: 'clearCtx - supports method chaining', category: 'clearCtx' },
    { name: 'clearCtx - resets context to empty object', category: 'clearCtx' },
    { name: 'clearCtx - after withCtx removes all accumulated context', category: 'clearCtx' },
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
          case 'withCtx - merges context (shallow merge)':
            result = await testWithCtxMergesContext();
            break;
          case 'withCtx - supports method chaining':
            result = await testWithCtxSupportsChaining();
            break;
          case 'withCtx - merges nested config objects (deep merge)':
            result = await testWithCtxMergesConfig();
            break;
          case 'withCtx - overwrites existing context properties':
            result = await testWithCtxOverwritesProperties();
            break;
          case 'withCtx - handles empty context object':
            result = await testWithCtxHandlesEmpty();
            break;
          case 'withCtx - handles undefined context (defaults to {})':
            result = await testWithCtxHandlesUndefined();
            break;
          case 'withCtx - preserves non-config properties':
            result = await testWithCtxPreservesProperties();
            break;
          case 'withCtx - handles multiple calls (accumulation)':
            result = await testWithCtxAccumulation();
            break;
          case 'clearCtx - clears all context':
            result = await testClearCtxClearsContext();
            break;
          case 'clearCtx - supports method chaining':
            result = await testClearCtxSupportsChaining();
            break;
          case 'clearCtx - resets context to empty object':
            result = await testClearCtxResetsContext();
            break;
          case 'clearCtx - after withCtx removes all accumulated context':
            result = await testClearCtxAfterWithCtx();
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
  const testWithCtxMergesContext = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ prop1: 'value1' });
    builder.withCtx({ prop2: 'value2' });
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.prop1 !== 'value1' || plan.resolvedCtx.prop2 !== 'value2') {
      return { success: false, error: 'Context should be merged' };
    }
    
    return { success: true, message: 'Merges context (shallow merge)' };
  };

  const testWithCtxSupportsChaining = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    const result = builder.withCtx({ test: 'value' });
    if (result !== builder) {
      return { success: false, error: 'Should return builder for chaining' };
    }
    
    return { success: true, message: 'Supports method chaining' };
  };

  const testWithCtxMergesConfig = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ config: { queue: { maxSize: 100 } } });
    builder.withCtx({ config: { router: { strict: true } } });
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.config?.queue?.maxSize !== 100 || 
        plan.resolvedCtx.config?.router?.strict !== true) {
      return { success: false, error: 'Config should be deep merged' };
    }
    
    return { success: true, message: 'Merges nested config objects (deep merge)' };
  };

  const testWithCtxOverwritesProperties = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ test: 'old' });
    builder.withCtx({ test: 'new' });
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.test !== 'new') {
      return { success: false, error: 'Should overwrite existing properties' };
    }
    
    return { success: true, message: 'Overwrites existing context properties' };
  };

  const testWithCtxHandlesEmpty = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({});
    
    builder.plan();
    const plan = builder.getPlan();
    if (!plan.resolvedCtx) {
      return { success: false, error: 'Should handle empty context' };
    }
    
    return { success: true, message: 'Handles empty context object' };
  };

  const testWithCtxHandlesUndefined = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx(undefined);
    
    builder.plan();
    const plan = builder.getPlan();
    if (!plan.resolvedCtx) {
      return { success: false, error: 'Should handle undefined context' };
    }
    
    return { success: true, message: 'Handles undefined context (defaults to {})' };
  };

  const testWithCtxPreservesProperties = async () => {
    const subsystem = createMockSubsystem({ ctx: { existing: 'value' } });
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ newProp: 'newValue' });
    
    builder.plan();
    const plan = builder.getPlan();
    // Note: subsystem.ctx is merged with builder context in verifySubsystemBuild
    if (!plan.resolvedCtx.newProp) {
      return { success: false, error: 'Should preserve new properties' };
    }
    
    return { success: true, message: 'Preserves non-config properties' };
  };

  const testWithCtxAccumulation = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ prop1: 'value1' });
    builder.withCtx({ prop2: 'value2' });
    builder.withCtx({ prop3: 'value3' });
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.prop1 !== 'value1' || 
        plan.resolvedCtx.prop2 !== 'value2' || 
        plan.resolvedCtx.prop3 !== 'value3') {
      return { success: false, error: 'Should accumulate context across multiple calls' };
    }
    
    return { success: true, message: 'Handles multiple calls (accumulation)' };
  };

  const testClearCtxClearsContext = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ test: 'value' });
    builder.clearCtx();
    
    // After clearCtx, context should be empty (merged with subsystem.ctx which is empty)
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.test) {
      return { success: false, error: 'Context should be cleared' };
    }
    
    return { success: true, message: 'Clears all context' };
  };

  const testClearCtxSupportsChaining = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    const result = builder.clearCtx();
    if (result !== builder) {
      return { success: false, error: 'Should return builder for chaining' };
    }
    
    return { success: true, message: 'Supports method chaining' };
  };

  const testClearCtxResetsContext = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ prop1: 'value1', prop2: 'value2' });
    builder.clearCtx();
    builder.withCtx({ prop3: 'value3' });
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.prop1 || plan.resolvedCtx.prop2) {
      return { success: false, error: 'Context should be reset to empty' };
    }
    if (plan.resolvedCtx.prop3 !== 'value3') {
      return { success: false, error: 'New context should be set after clear' };
    }
    
    return { success: true, message: 'Resets context to empty object' };
  };

  const testClearCtxAfterWithCtx = async () => {
    const subsystem = createMockSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    
    builder.withCtx({ prop1: 'value1' });
    builder.withCtx({ prop2: 'value2' });
    builder.clearCtx();
    
    builder.plan();
    const plan = builder.getPlan();
    if (plan.resolvedCtx.prop1 || plan.resolvedCtx.prop2) {
      return { success: false, error: 'All accumulated context should be removed' };
    }
    
    return { success: true, message: 'After withCtx removes all accumulated context' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>SubsystemBuilder Context Management Tests</h2>
      
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

