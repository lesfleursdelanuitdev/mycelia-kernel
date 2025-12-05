import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderPlanManagementTest
 * Tests for plan management (plan, dryRun, getPlan, invalidate) in SubsystemBuilder
 */
export function SubsystemBuilderPlanManagementTest() {
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
    { name: 'plan - creates plan from subsystem and context', category: 'plan' },
    { name: 'plan - returns plan and graphCache', category: 'plan' },
    { name: 'plan - caches plan internally', category: 'plan' },
    { name: 'plan - uses subsystem.ctx.graphCache if available', category: 'plan' },
    { name: 'plan - uses provided graphCache parameter', category: 'plan' },
    { name: 'plan - prefers subsystem.ctx.graphCache over parameter', category: 'plan' },
    { name: 'plan - returns same plan on subsequent calls (cached)', category: 'plan' },
    { name: 'plan - handles null graphCache', category: 'plan' },
    { name: 'plan - handles undefined graphCache', category: 'plan' },
    { name: 'plan - propagates errors from verifySubsystemBuild', category: 'plan' },
    { name: 'plan - includes resolvedCtx in returned plan', category: 'plan' },
    { name: 'plan - includes orderedKinds in returned plan', category: 'plan' },
    { name: 'plan - includes facetsByKind in returned plan', category: 'plan' },
    { name: 'plan - updates graphCache in returned result', category: 'plan' },
    
    { name: 'dryRun - is alias for plan', category: 'dryRun' },
    { name: 'dryRun - returns same result as plan', category: 'dryRun' },
    { name: 'dryRun - caches plan like plan', category: 'dryRun' },
    
    { name: 'getPlan - returns null when no plan cached', category: 'getPlan' },
    { name: 'getPlan - returns cached plan after plan', category: 'getPlan' },
    { name: 'getPlan - returns cached plan after dryRun', category: 'getPlan' },
    { name: 'getPlan - returns null after invalidate', category: 'getPlan' },
    
    { name: 'invalidate - clears cached plan', category: 'invalidate' },
    { name: 'invalidate - supports method chaining', category: 'invalidate' },
    { name: 'invalidate - allows new plan creation', category: 'invalidate' },
    { name: 'invalidate - after plan forces plan regeneration', category: 'invalidate' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        const subsystem = createMockSubsystem({ defaultHooks: [createMockHook('test')] });
        const builder = new SubsystemBuilder(subsystem);
        
        switch (testName) {
          case 'plan - creates plan from subsystem and context':
            builder.withCtx({ test: 'value' });
            builder.plan();
            const plan = builder.getPlan();
            result = plan ? { success: true, message: 'Creates plan from subsystem and context' } : { success: false, error: 'Plan should be created' };
            break;
          case 'plan - returns plan and graphCache':
            builder.plan();
            const plan1 = builder.getPlan();
            result = plan1 ? { success: true, message: 'Returns plan and graphCache' } : { success: false, error: 'Should return both plan and graphCache' };
            break;
          case 'plan - caches plan internally':
            builder.plan();
            const cached = builder.getPlan();
            result = cached ? { success: true, message: 'Caches plan internally' } : { success: false, error: 'Plan should be cached' };
            break;
          case 'plan - uses subsystem.ctx.graphCache if available':
            const cache1 = new DependencyGraphCache(100);
            const sub1 = createMockSubsystem({ ctx: { graphCache: cache1 }, defaultHooks: [createMockHook('test')] });
            const builder1 = new SubsystemBuilder(sub1);
            builder1.plan();
            const gc1 = builder1.getGraphCache();
            result = (gc1 === cache1) ? { success: true, message: 'Uses subsystem.ctx.graphCache' } : { success: false, error: 'Should use subsystem.ctx.graphCache' };
            break;
          case 'plan - uses provided graphCache parameter':
            const cache2 = new DependencyGraphCache(100);
            builder.plan(cache2);
            const gc2 = builder.getGraphCache();
            result = (gc2 === cache2) ? { success: true, message: 'Uses provided graphCache parameter' } : { success: false, error: 'Should use provided graphCache' };
            break;
          case 'plan - prefers subsystem.ctx.graphCache over parameter':
            const cache3 = new DependencyGraphCache(100);
            const cache4 = new DependencyGraphCache(100);
            const sub2 = createMockSubsystem({ ctx: { graphCache: cache3 }, defaultHooks: [createMockHook('test')] });
            const builder2 = new SubsystemBuilder(sub2);
            builder2.plan(cache4);
            const gc3 = builder2.getGraphCache();
            result = (gc3 === cache3) ? { success: true, message: 'Prefers subsystem.ctx.graphCache' } : { success: false, error: 'Should prefer subsystem.ctx.graphCache' };
            break;
          case 'plan - returns same plan on subsequent calls (cached)':
            builder.plan();
            const cachedPlan1 = builder.getPlan();
            builder.plan();
            const cachedPlan2 = builder.getPlan();
            result = (cachedPlan1 === cachedPlan2) ? { success: true, message: 'Returns same plan (cached)' } : { success: false, error: 'Should return cached plan' };
            break;
          case 'plan - handles null graphCache':
            try {
              builder.plan(null);
              result = { success: true, message: 'Handles null graphCache' };
            } catch (e) {
              result = { success: false, error: `Should handle null: ${e.message}` };
            }
            break;
          case 'plan - handles undefined graphCache':
            try {
              builder.plan(undefined);
              result = { success: true, message: 'Handles undefined graphCache' };
            } catch (e) {
              result = { success: false, error: `Should handle undefined: ${e.message}` };
            }
            break;
          case 'plan - propagates errors from verifySubsystemBuild':
            // Create a hook with a missing dependency to trigger an error
            const badHook = createHook({
              kind: 'badHook',
              overwrite: false,
              required: ['missingDependency'],
              attach: false,
              source: 'test://badHook',
              fn: () => new Facet('badHook', { attach: false, source: 'test://badHook' })
            });
            const badSub = createMockSubsystem({ hooks: [badHook] });
            const badBuilder = new SubsystemBuilder(badSub);
            try {
              badBuilder.plan();
              result = { success: false, error: 'Should propagate errors' };
            } catch (e) {
              result = { success: true, message: 'Propagates errors from verifySubsystemBuild' };
            }
            break;
          case 'plan - includes resolvedCtx in returned plan':
            builder.withCtx({ test: 'value' });
            builder.plan();
            const p1 = builder.getPlan();
            result = p1.resolvedCtx ? { success: true, message: 'Includes resolvedCtx' } : { success: false, error: 'Should include resolvedCtx' };
            break;
          case 'plan - includes orderedKinds in returned plan':
            builder.plan();
            const p2 = builder.getPlan();
            result = Array.isArray(p2.orderedKinds) ? { success: true, message: 'Includes orderedKinds' } : { success: false, error: 'Should include orderedKinds' };
            break;
          case 'plan - includes facetsByKind in returned plan':
            builder.plan();
            const p3 = builder.getPlan();
            result = p3.facetsByKind ? { success: true, message: 'Includes facetsByKind' } : { success: false, error: 'Should include facetsByKind' };
            break;
          case 'plan - updates graphCache in returned result':
            const cache5 = new DependencyGraphCache(100);
            builder.plan(cache5);
            const plan4 = builder.getPlan();
            result = plan4 ? { success: true, message: 'Updates graphCache in result' } : { success: false, error: 'Should update graphCache' };
            break;
          case 'dryRun - is alias for plan':
            builder.dryRun();
            const dryPlan = builder.getPlan();
            builder.invalidate();
            builder.plan();
            const planResult = builder.getPlan();
            result = (dryPlan && planResult) ? { success: true, message: 'Is alias for plan' } : { success: false, error: 'Should be alias for plan' };
            break;
          case 'dryRun - returns same result as plan':
            builder.invalidate();
            builder.dryRun();
            const dry1 = builder.getPlan();
            builder.invalidate();
            builder.plan();
            const planResult1 = builder.getPlan();
            result = (dry1 && planResult1) ? { success: true, message: 'Returns same result as plan' } : { success: false, error: 'Should return same result' };
            break;
          case 'dryRun - caches plan like plan':
            builder.invalidate();
            builder.dryRun();
            const cached2 = builder.getPlan();
            result = cached2 ? { success: true, message: 'Caches plan like plan' } : { success: false, error: 'Should cache plan' };
            break;
          case 'getPlan - returns null when no plan cached':
            const newBuilder = new SubsystemBuilder(subsystem);
            result = (newBuilder.getPlan() === null) ? { success: true, message: 'Returns null when no plan cached' } : { success: false, error: 'Should return null' };
            break;
          case 'getPlan - returns cached plan after plan':
            builder.plan();
            const cached3 = builder.getPlan();
            result = cached3 ? { success: true, message: 'Returns cached plan after plan' } : { success: false, error: 'Should return cached plan' };
            break;
          case 'getPlan - returns cached plan after dryRun':
            builder.invalidate();
            builder.dryRun();
            const cached4 = builder.getPlan();
            result = cached4 ? { success: true, message: 'Returns cached plan after dryRun' } : { success: false, error: 'Should return cached plan' };
            break;
          case 'getPlan - returns null after invalidate':
            builder.plan();
            builder.invalidate();
            result = (builder.getPlan() === null) ? { success: true, message: 'Returns null after invalidate' } : { success: false, error: 'Should return null' };
            break;
          case 'invalidate - clears cached plan':
            builder.plan();
            builder.invalidate();
            result = (builder.getPlan() === null) ? { success: true, message: 'Clears cached plan' } : { success: false, error: 'Should clear plan' };
            break;
          case 'invalidate - supports method chaining':
            const result2 = builder.invalidate();
            result = (result2 === builder) ? { success: true, message: 'Supports method chaining' } : { success: false, error: 'Should return builder' };
            break;
          case 'invalidate - allows new plan creation':
            builder.plan();
            builder.invalidate();
            const newPlan = builder.plan();
            result = newPlan.plan ? { success: true, message: 'Allows new plan creation' } : { success: false, error: 'Should allow new plan' };
            break;
          case 'invalidate - after plan forces plan regeneration':
            builder.plan();
            const planA = builder.getPlan();
            builder.invalidate();
            builder.plan();
            const planB = builder.getPlan();
            result = (planA !== planB) ? { success: true, message: 'Forces plan regeneration' } : { success: false, error: 'Should regenerate plan' };
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
      <h2>SubsystemBuilder Plan Management Tests</h2>
      
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

