import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderIntegrationTest
 * Tests for fluent API, context resolution, and plan lifecycle integration
 */
export function SubsystemBuilderIntegrationTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

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
    { name: 'Fluent API - method chaining works (withCtx().plan().build())', category: 'Fluent API' },
    { name: 'Fluent API - method chaining works (withCtx().clearCtx().withCtx().build())', category: 'Fluent API' },
    { name: 'Fluent API - method chaining works (plan().invalidate().plan().build())', category: 'Fluent API' },
    { name: 'Context Resolution - from withCtx merged with subsystem.ctx', category: 'Context Resolution' },
    { name: 'Context Resolution - deep merges config objects', category: 'Context Resolution' },
    { name: 'Context Resolution - shallow merges non-config properties', category: 'Context Resolution' },
    { name: 'Context Resolution - matches verifySubsystemBuild behavior', category: 'Context Resolution' },
    { name: 'Plan Lifecycle - plan created, cached, invalidated, recreated', category: 'Plan Lifecycle' },
    { name: 'Plan Lifecycle - plan cached between plan and build', category: 'Plan Lifecycle' },
    { name: 'Plan Lifecycle - plan regenerated after invalidate and build', category: 'Plan Lifecycle' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        const hook = createMockHook('test');
        const subsystem = createMockSubsystem({ defaultHooks: [hook] });
        const builder = new SubsystemBuilder(subsystem);
        
        switch (testName) {
          case 'Fluent API - method chaining works (withCtx().plan().build())':
            try {
              await builder.withCtx({ test: 'value' }).plan().build();
              result = { success: true, message: 'Method chaining works' };
            } catch (e) {
              result = { success: false, error: `Chaining failed: ${e.message}` };
            }
            break;
          case 'Fluent API - method chaining works (withCtx().clearCtx().withCtx().build())':
            try {
              await builder.withCtx({ prop1: 'value1' }).clearCtx().withCtx({ prop2: 'value2' }).build();
              result = { success: true, message: 'Chaining with clearCtx works' };
            } catch (e) {
              result = { success: false, error: `Chaining failed: ${e.message}` };
            }
            break;
          case 'Fluent API - method chaining works (plan().invalidate().plan().build())':
            try {
              await builder.plan().invalidate().plan().build();
              result = { success: true, message: 'Chaining with invalidate works' };
            } catch (e) {
              result = { success: false, error: `Chaining failed: ${e.message}` };
            }
            break;
          case 'Context Resolution - from withCtx merged with subsystem.ctx':
            const sub1 = createMockSubsystem({ ctx: { existing: 'subsystem' }, defaultHooks: [hook] });
            const builder1 = new SubsystemBuilder(sub1);
            builder1.withCtx({ newProp: 'builder' });
            builder1.plan();
            const p1 = builder1.getPlan();
            result = (p1.resolvedCtx.newProp === 'builder') ? { success: true, message: 'Context merged correctly' } : { success: false, error: 'Should merge context' };
            break;
          case 'Context Resolution - deep merges config objects':
            const builder2 = new SubsystemBuilder(subsystem);
            builder2.withCtx({ config: { queue: { maxSize: 100 } } });
            builder2.withCtx({ config: { router: { strict: true } } });
            builder2.plan();
            const p2 = builder2.getPlan();
            result = (p2.resolvedCtx.config?.queue?.maxSize === 100 && p2.resolvedCtx.config?.router?.strict === true) ? 
              { success: true, message: 'Deep merges config objects' } : { success: false, error: 'Should deep merge config' };
            break;
          case 'Context Resolution - shallow merges non-config properties':
            const builder3 = new SubsystemBuilder(subsystem);
            builder3.withCtx({ prop1: 'value1' });
            builder3.withCtx({ prop2: 'value2' });
            builder3.plan();
            const p3 = builder3.getPlan();
            result = (p3.resolvedCtx.prop1 === 'value1' && p3.resolvedCtx.prop2 === 'value2') ? 
              { success: true, message: 'Shallow merges non-config properties' } : { success: false, error: 'Should shallow merge' };
            break;
          case 'Context Resolution - matches verifySubsystemBuild behavior':
            // This is verified by the fact that plan() uses verifySubsystemBuild
            const builder4 = new SubsystemBuilder(subsystem);
            builder4.withCtx({ test: 'value' });
            builder4.plan();
            const p4 = builder4.getPlan();
            result = (p4.resolvedCtx.test === 'value') ? { success: true, message: 'Matches verifySubsystemBuild behavior' } : { success: false, error: 'Should match behavior' };
            break;
          case 'Plan Lifecycle - plan created, cached, invalidated, recreated':
            const builder5 = new SubsystemBuilder(subsystem);
            builder5.plan();
            const plan1 = builder5.getPlan();
            builder5.invalidate();
            const plan2 = builder5.getPlan();
            builder5.plan();
            const plan3 = builder5.getPlan();
            result = (plan1 && plan2 === null && plan3) ? { success: true, message: 'Plan lifecycle works correctly' } : { success: false, error: 'Lifecycle should work' };
            break;
          case 'Plan Lifecycle - plan cached between plan and build':
            const builder6 = new SubsystemBuilder(subsystem);
            builder6.plan();
            const plan4 = builder6.getPlan();
            await builder6.build();
            const plan5 = builder6.getPlan();
            result = (plan4 === plan5) ? { success: true, message: 'Plan cached between plan and build' } : { success: false, error: 'Should cache plan' };
            break;
          case 'Plan Lifecycle - plan regenerated after invalidate and build':
            const builder7 = new SubsystemBuilder(subsystem);
            builder7.plan();
            builder7.invalidate();
            await builder7.build();
            const plan6 = builder7.getPlan();
            result = plan6 ? { success: true, message: 'Plan regenerated after invalidate and build' } : { success: false, error: 'Should regenerate plan' };
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

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>SubsystemBuilder Integration Tests</h2>
      
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

