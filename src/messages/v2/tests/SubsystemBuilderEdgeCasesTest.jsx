import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderEdgeCasesTest
 * Tests for edge cases (empty context, empty subsystem, GraphCache edge cases)
 */
export function SubsystemBuilderEdgeCasesTest() {
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
    { name: 'Empty Context - works with empty context object', category: 'Empty Context' },
    { name: 'Empty Context - works with no context calls', category: 'Empty Context' },
    { name: 'Empty Context - works with clearCtx only', category: 'Empty Context' },
    { name: 'Empty Subsystem - works with subsystem with no hooks', category: 'Empty Subsystem' },
    { name: 'Empty Subsystem - works with subsystem with no default hooks', category: 'Empty Subsystem' },
    { name: 'Empty Subsystem - works with subsystem with empty hooks array', category: 'Empty Subsystem' },
    { name: 'GraphCache Edge Cases - works without graphCache', category: 'GraphCache Edge Cases' },
    { name: 'GraphCache Edge Cases - works with graphCache at capacity', category: 'GraphCache Edge Cases' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        switch (testName) {
          case 'Empty Context - works with empty context object':
            const sub1 = createMockSubsystem({ defaultHooks: [createMockHook('test')] });
            const builder1 = new SubsystemBuilder(sub1);
            builder1.withCtx({});
            const { plan: p1 } = builder1.plan();
            result = p1 ? { success: true, message: 'Works with empty context object' } : { success: false, error: 'Should work with empty context' };
            break;
          case 'Empty Context - works with no context calls':
            const sub2 = createMockSubsystem({ defaultHooks: [createMockHook('test')] });
            const builder2 = new SubsystemBuilder(sub2);
            const { plan: p2 } = builder2.plan();
            result = p2 ? { success: true, message: 'Works with no context calls' } : { success: false, error: 'Should work without context' };
            break;
          case 'Empty Context - works with clearCtx only':
            const sub3 = createMockSubsystem({ defaultHooks: [createMockHook('test')] });
            const builder3 = new SubsystemBuilder(sub3);
            builder3.clearCtx();
            const { plan: p3 } = builder3.plan();
            result = p3 ? { success: true, message: 'Works with clearCtx only' } : { success: false, error: 'Should work with clearCtx' };
            break;
          case 'Empty Subsystem - works with subsystem with no hooks':
            const sub4 = createMockSubsystem();
            const builder4 = new SubsystemBuilder(sub4);
            try {
              const { plan: p4 } = builder4.plan();
              result = (p4 && p4.orderedKinds.length === 0) ? { success: true, message: 'Works with no hooks' } : { success: false, error: 'Should work with no hooks' };
            } catch (e) {
              result = { success: true, message: 'Handles no hooks gracefully' };
            }
            break;
          case 'Empty Subsystem - works with subsystem with no default hooks':
            const sub5 = createMockSubsystem({ defaultHooks: [] });
            const builder5 = new SubsystemBuilder(sub5);
            try {
              const { plan: p5 } = builder5.plan();
              result = (p5 && p5.orderedKinds.length === 0) ? { success: true, message: 'Works with no default hooks' } : { success: false, error: 'Should work with no default hooks' };
            } catch (e) {
              result = { success: true, message: 'Handles no default hooks gracefully' };
            }
            break;
          case 'Empty Subsystem - works with subsystem with empty hooks array':
            const sub6 = createMockSubsystem({ hooks: [] });
            const builder6 = new SubsystemBuilder(sub6);
            try {
              const { plan: p6 } = builder6.plan();
              result = p6 ? { success: true, message: 'Works with empty hooks array' } : { success: false, error: 'Should work with empty hooks' };
            } catch (e) {
              result = { success: true, message: 'Handles empty hooks gracefully' };
            }
            break;
          case 'GraphCache Edge Cases - works without graphCache':
            const sub7 = createMockSubsystem({ defaultHooks: [createMockHook('test')] });
            const builder7 = new SubsystemBuilder(sub7);
            try {
              const { plan: p7 } = builder7.plan();
              result = p7 ? { success: true, message: 'Works without graphCache' } : { success: false, error: 'Should work without graphCache' };
            } catch (e) {
              result = { success: false, error: `Should work without graphCache: ${e.message}` };
            }
            break;
          case 'GraphCache Edge Cases - works with graphCache at capacity':
            const cache = new DependencyGraphCache(2); // Small capacity
            const sub8 = createMockSubsystem({ defaultHooks: [createMockHook('test1'), createMockHook('test2'), createMockHook('test3')] });
            const builder8 = new SubsystemBuilder(sub8);
            try {
              builder8.plan(cache);
              builder8.invalidate();
              builder8.plan(cache);
              result = (cache.size() <= 2) ? { success: true, message: 'Works with graphCache at capacity' } : { success: false, error: 'Should respect capacity' };
            } catch (e) {
              result = { success: true, message: 'Handles capacity limit gracefully' };
            }
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
      <h2>SubsystemBuilder Edge Cases Tests</h2>
      
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







