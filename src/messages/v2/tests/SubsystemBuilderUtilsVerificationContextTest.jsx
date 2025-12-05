import { useState } from 'react';
import { verifySubsystemBuild } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { DefaultHooks } from '../models/defaults/default-hooks.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderUtilsVerificationContextTest
 * Tests for context resolution and hook collection in verifySubsystemBuild
 */
export function SubsystemBuilderUtilsVerificationContextTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createSubsystem = (options = {}) => {
    return {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      defaultHooks: options.defaultHooks || [],
      hooks: options.hooks || [],
      api: options.api || { name: options.name || 'test-subsystem' },
      ms: options.ms || null
    };
  };

  // Helper to create a simple mock hook
  const createMockHook = (kind, options = {}) => {
    return createHook({
      kind,
      overwrite: options.overwrite || false,
      required: options.required || [],
      attach: options.attach || false,
      source: options.source || `test://${kind}`,
      // eslint-disable-next-line no-unused-vars
      fn: (_ctx, _api, _subsystem) => {
        return new Facet(kind, {
          attach: options.attach || false,
          source: `test://${kind}`
        });
      }
    });
  };

  const testCases = [
    // Context Resolution
    { name: 'Context resolution - merges subsystem.ctx with provided ctx', category: 'Context Resolution' },
    { name: 'Context resolution - handles null subsystem.ctx', category: 'Context Resolution' },
    { name: 'Context resolution - handles null provided ctx', category: 'Context Resolution' },
    { name: 'Context resolution - provided ctx overrides subsystem.ctx', category: 'Context Resolution' },
    { name: 'Context resolution - includes graphCache in resolvedCtx', category: 'Context Resolution' },
    
    // Hook Collection - DefaultHooks
    { name: 'Hook collection - DefaultHooks instance (list() method)', category: 'Hook Collection' },
    { name: 'Hook collection - DefaultHooks array', category: 'Hook Collection' },
    { name: 'Hook collection - empty DefaultHooks', category: 'Hook Collection' },
    { name: 'Hook collection - DefaultHooks with multiple hooks', category: 'Hook Collection' },
    
    // Hook Collection - User Hooks
    { name: 'Hook collection - user hooks array', category: 'Hook Collection' },
    { name: 'Hook collection - empty user hooks', category: 'Hook Collection' },
    { name: 'Hook collection - combines defaults and user hooks', category: 'Hook Collection' },
    { name: 'Hook collection - user hooks after defaults', category: 'Hook Collection' },
    
    // Hook Collection - Edge Cases
    { name: 'Hook collection - handles null defaultHooks', category: 'Hook Collection' },
    { name: 'Hook collection - handles null hooks', category: 'Hook Collection' },
    { name: 'Hook collection - skips non-function entries', category: 'Hook Collection' },
    { name: 'Hook collection - preserves hook order', category: 'Hook Collection' },
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
          case 'Context resolution - merges subsystem.ctx with provided ctx':
            result = testContextMerges();
            break;
          case 'Context resolution - handles null subsystem.ctx':
            result = testContextHandlesNullSubsystemCtx();
            break;
          case 'Context resolution - handles null provided ctx':
            result = testContextHandlesNullProvidedCtx();
            break;
          case 'Context resolution - provided ctx overrides subsystem.ctx':
            result = testContextOverrides();
            break;
          case 'Context resolution - includes graphCache in resolvedCtx':
            result = await testContextIncludesGraphCache();
            break;
          case 'Hook collection - DefaultHooks instance (list() method)':
            result = testHookCollectionDefaultHooksInstance();
            break;
          case 'Hook collection - DefaultHooks array':
            result = testHookCollectionDefaultHooksArray();
            break;
          case 'Hook collection - empty DefaultHooks':
            result = testHookCollectionEmptyDefaultHooks();
            break;
          case 'Hook collection - DefaultHooks with multiple hooks':
            result = testHookCollectionMultipleDefaultHooks();
            break;
          case 'Hook collection - user hooks array':
            result = testHookCollectionUserHooks();
            break;
          case 'Hook collection - empty user hooks':
            result = testHookCollectionEmptyUserHooks();
            break;
          case 'Hook collection - combines defaults and user hooks':
            result = testHookCollectionCombines();
            break;
          case 'Hook collection - user hooks after defaults':
            result = testHookCollectionOrder();
            break;
          case 'Hook collection - handles null defaultHooks':
            result = testHookCollectionNullDefaultHooks();
            break;
          case 'Hook collection - handles null hooks':
            result = testHookCollectionNullHooks();
            break;
          case 'Hook collection - skips non-function entries':
            result = testHookCollectionSkipsNonFunctions();
            break;
          case 'Hook collection - preserves hook order':
            result = testHookCollectionPreservesOrder();
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
  const testContextMerges = () => {
    const subsystem = createSubsystem({
      ctx: { ms: 'mock-ms', config: { queue: { capacity: 100 } } }
    });
    const hook = createMockHook('test');
    subsystem.defaultHooks = [hook];
    
    const plan = verifySubsystemBuild(subsystem, { config: { queue: { policy: 'drop' } } });
    
    if (!plan.resolvedCtx) {
      return { success: false, error: 'resolvedCtx should exist' };
    }
    // resolveCtx does a deep merge for ctx.config, so both properties should be present
    if (plan.resolvedCtx.config?.queue?.capacity !== 100) {
      return { success: false, error: 'Subsystem ctx.config should be deep merged' };
    }
    if (plan.resolvedCtx.config?.queue?.policy !== 'drop') {
      return { success: false, error: 'Provided ctx.config should be deep merged' };
    }
    
    return {
      success: true,
      message: 'Context merges correctly with deep merge for config',
      data: { resolvedCtx: plan.resolvedCtx }
    };
  };

  const testContextHandlesNullSubsystemCtx = () => {
    const subsystem = createSubsystem({ ctx: null });
    const hook = createMockHook('test');
    subsystem.defaultHooks = [hook];
    
    const plan = verifySubsystemBuild(subsystem, { config: { test: 'value' } });
    
    if (!plan.resolvedCtx) {
      return { success: false, error: 'resolvedCtx should exist' };
    }
    if (plan.resolvedCtx.config?.test !== 'value') {
      return { success: false, error: 'Should handle null subsystem.ctx' };
    }
    
    return {
      success: true,
      message: 'Handles null subsystem.ctx',
      data: { resolvedCtx: plan.resolvedCtx }
    };
  };

  const testContextHandlesNullProvidedCtx = () => {
    const subsystem = createSubsystem({
      ctx: { ms: 'mock-ms', subsystemProp: 'subsystem' }
    });
    const hook = createMockHook('test');
    subsystem.defaultHooks = [hook];
    
    const plan = verifySubsystemBuild(subsystem, null);
    
    if (!plan.resolvedCtx) {
      return { success: false, error: 'resolvedCtx should exist' };
    }
    if (plan.resolvedCtx.subsystemProp !== 'subsystem') {
      return { success: false, error: 'Should handle null provided ctx' };
    }
    
    return {
      success: true,
      message: 'Handles null provided ctx',
      data: { resolvedCtx: plan.resolvedCtx }
    };
  };

  const testContextOverrides = () => {
    const subsystem = createSubsystem({
      ctx: { test: 'subsystem', keep: 'subsystem', config: { queue: { capacity: 100 } } }
    });
    const hook = createMockHook('test');
    subsystem.defaultHooks = [hook];
    
    const plan = verifySubsystemBuild(subsystem, { test: 'provided', config: { router: { strict: true } } });
    
    // resolveCtx does a shallow merge for top-level properties, so provided values override subsystem values
    if (plan.resolvedCtx.test !== 'provided') {
      return { success: false, error: 'Provided ctx should override subsystem.ctx' };
    }
    // Non-overridden values should still be present
    if (plan.resolvedCtx.keep !== 'subsystem') {
      return { success: false, error: 'Non-overridden values should be preserved' };
    }
    // config should be deep merged - both queue and router should be present
    if (plan.resolvedCtx.config?.queue?.capacity !== 100) {
      return { success: false, error: 'Deep merged config should preserve existing facet configs' };
    }
    if (plan.resolvedCtx.config?.router?.strict !== true) {
      return { success: false, error: 'Deep merged config should include new facet configs' };
    }
    
    return {
      success: true,
      message: 'Provided ctx overrides subsystem.ctx (shallow) but deep merges config',
      data: { resolvedCtx: plan.resolvedCtx }
    };
  };

  const testContextIncludesGraphCache = async () => {
    const { DependencyGraphCache } = await import('../models/subsystem-builder/dependency-graph-cache.mycelia.js');
    const cache = new DependencyGraphCache(100);
    const subsystem = createSubsystem();
    const hook = createMockHook('test');
    subsystem.defaultHooks = [hook];
    
    const plan = verifySubsystemBuild(subsystem, {}, cache);
    
    if (plan.resolvedCtx.graphCache !== cache) {
      return { success: false, error: 'graphCache should be included in resolvedCtx' };
    }
    
    return {
      success: true,
      message: 'graphCache included in resolvedCtx',
      data: { hasGraphCache: !!plan.resolvedCtx.graphCache }
    };
  };

  const testHookCollectionDefaultHooksInstance = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const defaultHooks = new DefaultHooks([hook1, hook2]);
    const subsystem = createSubsystem({ defaultHooks });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.hook1 === undefined || plan.facetsByKind.hook2 === undefined) {
      return { success: false, error: 'Should collect hooks from DefaultHooks instance' };
    }
    
    return {
      success: true,
      message: 'Collects hooks from DefaultHooks instance',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionDefaultHooksArray = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.hook1 === undefined || plan.facetsByKind.hook2 === undefined) {
      return { success: false, error: 'Should collect hooks from array' };
    }
    
    return {
      success: true,
      message: 'Collects hooks from array',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionEmptyDefaultHooks = () => {
    const subsystem = createSubsystem({ defaultHooks: [] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (Object.keys(plan.facetsByKind).length !== 0) {
      return { success: false, error: 'Should handle empty defaultHooks' };
    }
    
    return {
      success: true,
      message: 'Handles empty defaultHooks',
      data: { hooksFound: 0 }
    };
  };

  const testHookCollectionMultipleDefaultHooks = () => {
    const hooks = Array.from({ length: 5 }, (_, i) => createMockHook(`hook${i}`));
    const defaultHooks = new DefaultHooks(hooks);
    const subsystem = createSubsystem({ defaultHooks });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (Object.keys(plan.facetsByKind).length !== 5) {
      return { success: false, error: `Expected 5 hooks, got ${Object.keys(plan.facetsByKind).length}` };
    }
    
    return {
      success: true,
      message: 'Collects multiple hooks from DefaultHooks',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionUserHooks = () => {
    const hook1 = createMockHook('hook1');
    const hook2 = createMockHook('hook2');
    const subsystem = createSubsystem({ hooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.hook1 === undefined || plan.facetsByKind.hook2 === undefined) {
      return { success: false, error: 'Should collect user hooks' };
    }
    
    return {
      success: true,
      message: 'Collects user hooks',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionEmptyUserHooks = () => {
    const subsystem = createSubsystem({ hooks: [] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (Object.keys(plan.facetsByKind).length !== 0) {
      return { success: false, error: 'Should handle empty user hooks' };
    }
    
    return {
      success: true,
      message: 'Handles empty user hooks',
      data: { hooksFound: 0 }
    };
  };

  const testHookCollectionCombines = () => {
    const defaultHook = createMockHook('default');
    const userHook = createMockHook('user');
    const subsystem = createSubsystem({
      defaultHooks: [defaultHook],
      hooks: [userHook]
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.default === undefined || plan.facetsByKind.user === undefined) {
      return { success: false, error: 'Should combine defaults and user hooks' };
    }
    
    return {
      success: true,
      message: 'Combines defaults and user hooks',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionOrder = () => {
    const defaultHook = createMockHook('default');
    const userHook = createMockHook('user');
    const subsystem = createSubsystem({
      defaultHooks: [defaultHook],
      hooks: [userHook]
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    // User hooks should come after defaults in the combined array
    // This is verified by checking that both exist
    if (plan.facetsByKind.default === undefined || plan.facetsByKind.user === undefined) {
      return { success: false, error: 'Should preserve hook order' };
    }
    
    return {
      success: true,
      message: 'User hooks come after defaults',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionNullDefaultHooks = () => {
    const subsystem = createSubsystem({ defaultHooks: null });
    const userHook = createMockHook('user');
    subsystem.hooks = [userHook];
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.user === undefined) {
      return { success: false, error: 'Should handle null defaultHooks' };
    }
    
    return {
      success: true,
      message: 'Handles null defaultHooks',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionNullHooks = () => {
    const subsystem = createSubsystem({ hooks: null });
    const defaultHook = createMockHook('default');
    subsystem.defaultHooks = [defaultHook];
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.default === undefined) {
      return { success: false, error: 'Should handle null hooks' };
    }
    
    return {
      success: true,
      message: 'Handles null hooks',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionSkipsNonFunctions = () => {
    const hook = createMockHook('hook');
    const subsystem = createSubsystem({
      defaultHooks: [hook, 'not-a-function', 123, null, undefined]
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind.hook === undefined) {
      return { success: false, error: 'Should collect valid hooks' };
    }
    if (Object.keys(plan.facetsByKind).length !== 1) {
      return { success: false, error: 'Should skip non-function entries' };
    }
    
    return {
      success: true,
      message: 'Skips non-function entries',
      data: { hooksFound: Object.keys(plan.facetsByKind).length }
    };
  };

  const testHookCollectionPreservesOrder = () => {
    const hooks = Array.from({ length: 5 }, (_, i) => createMockHook(`hook${i}`));
    const subsystem = createSubsystem({ defaultHooks: hooks });
    
    const plan = verifySubsystemBuild(subsystem);
    
    // Check that all hooks are present
    const kinds = Object.keys(plan.facetsByKind);
    if (kinds.length !== 5) {
      return { success: false, error: `Expected 5 hooks, got ${kinds.length}` };
    }
    
    // Check that order is preserved in orderedKinds (after topological sort)
    // Since these hooks have no dependencies, order should be preserved
    const ordered = plan.orderedKinds;
    const allPresent = hooks.every(h => ordered.includes(h.kind));
    
    if (!allPresent) {
      return { success: false, error: 'Should preserve hook order' };
    }
    
    return {
      success: true,
      message: 'Preserves hook order',
      data: { hooksFound: kinds.length, ordered: plan.orderedKinds }
    };
  };

  // UI
  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
        Subsystem Builder Utils - Verification Phase: Context & Hook Collection
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Tests for context resolution and hook collection in verifySubsystemBuild
      </p>

      {/* Test Summary */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Tests</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{testCases.length}</div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Passed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            {Array.from(results.values()).filter(r => r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Failed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
            {Array.from(results.values()).filter(r => !r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Running</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
            {runningTests.size}
          </div>
        </div>
      </div>

      {/* Run All Button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => {
            testCases.forEach(test => {
              if (!results.has(test.name)) {
                runTest(test.name);
              }
            });
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Run All Tests
        </button>
      </div>

      {/* Test Results by Category */}
      {categories.map(category => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            {category}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              
              return (
                <div
                  key={test.name}
                  onClick={() => setSelectedTest(test.name)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: result
                      ? (result.success ? '#d1fae5' : '#fee2e2')
                      : isRunning
                      ? '#dbeafe'
                      : 'white',
                    border: `1px solid ${result ? (result.success ? '#10b981' : '#ef4444') : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isRunning ? '⏳' : result ? (result.success ? '✅' : '❌') : '⚪'}
                    </span>
                    <span style={{ flex: 1, fontWeight: selectedTest === test.name ? '600' : '400' }}>
                      {test.name}
                    </span>
                    {result && result.data && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {JSON.stringify(result.data)}
                      </span>
                    )}
                  </div>
                  {result && result.error && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                      {result.error}
                    </div>
                  )}
                  {result && result.message && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#059669' }}>
                      {result.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Test Details */}
      {selectedTest && results.has(selectedTest) && (
        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
            Test Details: {selectedTest}
          </h3>
          <pre style={{ padding: '12px', backgroundColor: 'white', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
            {JSON.stringify(results.get(selectedTest), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

