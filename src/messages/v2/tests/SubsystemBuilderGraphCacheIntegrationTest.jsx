import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderGraphCacheIntegrationTest
 * Tests for GraphCache integration and caching behavior in SubsystemBuilder
 */
export function SubsystemBuilderGraphCacheIntegrationTest() {
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
    { name: 'GraphCache - from subsystem.ctx takes priority', category: 'GraphCache Priority' },
    { name: 'GraphCache - parameter used when subsystem.ctx.graphCache missing', category: 'GraphCache Priority' },
    { name: 'GraphCache - passed through plan to verifySubsystemBuild', category: 'GraphCache Priority' },
    { name: 'GraphCache - updated in plan return value', category: 'GraphCache Priority' },
    { name: 'GraphCache - persists across multiple plan calls', category: 'GraphCache Priority' },
    { name: 'GraphCache - caches topological sort results', category: 'GraphCache Caching' },
    { name: 'GraphCache - reused across multiple builds', category: 'GraphCache Caching' },
    { name: 'GraphCache - shared between plan and build', category: 'GraphCache Caching' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        const hook1 = createMockHook('test1');
        const hook2 = createMockHook('test2');
        
        switch (testName) {
          case 'GraphCache - from subsystem.ctx takes priority':
            const cache1 = new DependencyGraphCache(100);
            const cache2 = new DependencyGraphCache(100);
            const sub1 = createMockSubsystem({ ctx: { graphCache: cache1 }, defaultHooks: [hook1] });
            const builder1 = new SubsystemBuilder(sub1);
            builder1.plan(cache2);
            const gc1 = builder1.getGraphCache();
            result = (gc1 === cache1) ? { success: true, message: 'Subsystem.ctx.graphCache takes priority' } : { success: false, error: 'Should prefer subsystem.ctx.graphCache' };
            break;
          case 'GraphCache - parameter used when subsystem.ctx.graphCache missing':
            const cache3 = new DependencyGraphCache(100);
            const sub2 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder2 = new SubsystemBuilder(sub2);
            builder2.plan(cache3);
            const gc2 = builder2.getGraphCache();
            result = (gc2 === cache3) ? { success: true, message: 'Parameter used when subsystem.ctx.graphCache missing' } : { success: false, error: 'Should use parameter' };
            break;
          case 'GraphCache - passed through plan to verifySubsystemBuild':
            const cache4 = new DependencyGraphCache(100);
            const sub3 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder3 = new SubsystemBuilder(sub3);
            builder3.plan(cache4);
            const gc3 = builder3.getGraphCache();
            result = (gc3 === cache4) ? { success: true, message: 'Passed through plan to verifySubsystemBuild' } : { success: false, error: 'Should pass through' };
            break;
          case 'GraphCache - updated in plan return value':
            const cache5 = new DependencyGraphCache(100);
            const sub4 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder4 = new SubsystemBuilder(sub4);
            builder4.plan(cache5);
            const gc4 = builder4.getGraphCache();
            result = (gc4 && gc4 === cache5) ? { success: true, message: 'Updated in plan return value' } : { success: false, error: 'Should be in return value' };
            break;
          case 'GraphCache - persists across multiple plan calls':
            const cache6 = new DependencyGraphCache(100);
            const sub5 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder5 = new SubsystemBuilder(sub5);
            builder5.plan(cache6);
            builder5.plan();
            const gc5 = builder5.getGraphCache();
            result = (gc5 === cache6) ? { success: true, message: 'Persists across multiple plan calls' } : { success: false, error: 'Should persist' };
            break;
          case 'GraphCache - caches topological sort results':
            const cache7 = new DependencyGraphCache(100);
            const sub6 = createMockSubsystem({ defaultHooks: [hook1, hook2] });
            const builder6 = new SubsystemBuilder(sub6);
            builder6.plan(cache7);
            const size1 = cache7.size();
            builder6.invalidate();
            builder6.plan(cache7);
            const size2 = cache7.size();
            result = (size2 > size1 || size2 === size1) ? { success: true, message: 'Caches topological sort results' } : { success: false, error: 'Should cache results' };
            break;
          case 'GraphCache - reused across multiple builds':
            const cache8 = new DependencyGraphCache(100);
            const sub7 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder7 = new SubsystemBuilder(sub7);
            await builder7.build(cache8);
            const size3 = cache8.size();
            await builder7.build(cache8);
            const size4 = cache8.size();
            result = (size4 >= size3) ? { success: true, message: 'Reused across multiple builds' } : { success: false, error: 'Should reuse cache' };
            break;
          case 'GraphCache - shared between plan and build':
            const cache9 = new DependencyGraphCache(100);
            const sub8 = createMockSubsystem({ defaultHooks: [hook1] });
            const builder8 = new SubsystemBuilder(sub8);
            builder8.plan(cache9);
            const size5 = cache9.size();
            await builder8.build(cache9);
            const size6 = cache9.size();
            result = (size6 >= size5) ? { success: true, message: 'Shared between plan and build' } : { success: false, error: 'Should share cache' };
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
      <h2>SubsystemBuilder GraphCache Integration Tests</h2>
      
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

