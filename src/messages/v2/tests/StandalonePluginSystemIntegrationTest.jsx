import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * StandalonePluginSystemIntegrationTest
 * Tests for StandalonePluginSystem integration scenarios
 */
export function StandalonePluginSystemIntegrationTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Integration - can install and use plugins', category: 'Integration' },
    { name: 'Integration - can find installed plugins via find()', category: 'Integration' },
    { name: 'Integration - plugins work without message system', category: 'Integration' },
    { name: 'Integration - can use multiple plugins', category: 'Integration' },
    { name: 'Integration - plugin dependencies are resolved', category: 'Integration' },
    { name: 'Integration - plugin lifecycle (init/dispose) works', category: 'Integration' },
    { name: 'Integration - can build and dispose multiple times', category: 'Integration' },
    { name: 'Integration - works with custom hooks', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Integration - can install and use plugins':
            result = await testCanInstallAndUsePlugins();
            break;
          case 'Integration - can find installed plugins via find()':
            result = await testCanFindPlugins();
            break;
          case 'Integration - plugins work without message system':
            result = await testPluginsWorkWithoutMs();
            break;
          case 'Integration - can use multiple plugins':
            result = await testCanUseMultiplePlugins();
            break;
          case 'Integration - plugin dependencies are resolved':
            result = await testPluginDependencies();
            break;
          case 'Integration - plugin lifecycle (init/dispose) works':
            result = await testPluginLifecycle();
            break;
          case 'Integration - can build and dispose multiple times':
            result = await testBuildAndDisposeMultiple();
            break;
          case 'Integration - works with custom hooks':
            result = await testWorksWithCustomHooks();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message
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

  const testCanInstallAndUsePlugins = async () => {
    const system = new StandalonePluginSystem('test', {});
    const testHook = createHook({
      kind: 'test',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://test',
      fn: () => new Facet('test', { attach: false, source: 'test://test' }).add({ testMethod: () => 'test' })
    });
    system.use(testHook);
    await system.build();
    const plugin = system.find('test');
    if (!plugin || typeof plugin.testMethod !== 'function') {
      return { success: false, error: 'Should install and use plugins' };
    }
    return { success: true, message: 'Can install and use plugins' };
  };

  const testCanFindPlugins = async () => {
    const system = new StandalonePluginSystem('test', {});
    const testHook = createHook({
      kind: 'test',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://test',
      fn: () => new Facet('test', { attach: false, source: 'test://test' })
    });
    system.use(testHook);
    await system.build();
    const plugin = system.find('test');
    if (!plugin) {
      return { success: false, error: 'Should find installed plugin' };
    }
    return { success: true, message: 'Can find installed plugins via find()' };
  };

  const testPluginsWorkWithoutMs = async () => {
    const system = new StandalonePluginSystem('test', {});
    const testHook = createHook({
      kind: 'test',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://test',
      fn: () => new Facet('test', { attach: false, source: 'test://test' })
    });
    system.use(testHook);
    await system.build();
    // Should work even though messageSystem is empty object
    if (!system.find('test')) {
      return { success: false, error: 'Plugins should work without message system' };
    }
    return { success: true, message: 'Plugins work without message system' };
  };

  const testCanUseMultiplePlugins = async () => {
    const system = new StandalonePluginSystem('test', {});
    const hook1 = createHook({
      kind: 'plugin1',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://plugin1',
      fn: () => new Facet('plugin1', { attach: false, source: 'test://plugin1' })
    });
    const hook2 = createHook({
      kind: 'plugin2',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://plugin2',
      fn: () => new Facet('plugin2', { attach: false, source: 'test://plugin2' })
    });
    system.use(hook1).use(hook2);
    await system.build();
    if (!system.find('plugin1') || !system.find('plugin2')) {
      return { success: false, error: 'Should install multiple plugins' };
    }
    return { success: true, message: 'Can use multiple plugins' };
  };

  const testPluginDependencies = async () => {
    const system = new StandalonePluginSystem('test', {});
    const depHook = createHook({
      kind: 'dependency',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://dependency',
      fn: () => new Facet('dependency', { attach: false, source: 'test://dependency' })
    });
    const mainHook = createHook({
      kind: 'main',
      overwrite: false,
      required: ['dependency'],
      attach: false,
      source: 'test://main',
      fn: () => new Facet('main', { attach: false, source: 'test://main' })
    });
    system.use(depHook).use(mainHook);
    await system.build();
    if (!system.find('dependency') || !system.find('main')) {
      return { success: false, error: 'Should resolve plugin dependencies' };
    }
    return { success: true, message: 'Plugin dependencies are resolved' };
  };

  const testPluginLifecycle = async () => {
    const system = new StandalonePluginSystem('test', {});
    let initCalled = false;
    let disposeCalled = false;
    const testHook = createHook({
      kind: 'test',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://test',
      fn: () => {
        const facet = new Facet('test', { attach: false, source: 'test://test' });
        facet.onInit(() => { initCalled = true; });
        facet.onDispose(() => { disposeCalled = true; });
        return facet;
      }
    });
    system.use(testHook);
    await system.build();
    if (!initCalled) {
      return { success: false, error: 'Plugin init should be called' };
    }
    await system.dispose();
    if (!disposeCalled) {
      return { success: false, error: 'Plugin dispose should be called' };
    }
    return { success: true, message: 'Plugin lifecycle (init/dispose) works' };
  };

  const testBuildAndDisposeMultiple = async () => {
    const system = new StandalonePluginSystem('test', {});
    const testHook = createHook({
      kind: 'test',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://test',
      fn: () => new Facet('test', { attach: false, source: 'test://test' })
    });
    system.use(testHook);
    await system.build();
    await system.dispose();
    await system.build();
    await system.dispose();
    if (system.isBuilt) {
      return { success: false, error: 'Should be able to build and dispose multiple times' };
    }
    return { success: true, message: 'Can build and dispose multiple times' };
  };

  const testWorksWithCustomHooks = async () => {
    const system = new StandalonePluginSystem('test', {});
    const customHook = createHook({
      kind: 'custom',
      overwrite: false,
      required: [],
      attach: false,
      source: 'test://custom',
      fn: () => new Facet('custom', { attach: false, source: 'test://custom' }).add({ customMethod: () => 'custom' })
    });
    system.use(customHook);
    await system.build();
    const custom = system.find('custom');
    if (!custom || typeof custom.customMethod !== 'function') {
      return { success: false, error: 'Should work with custom hooks' };
    }
    return { success: true, message: 'Works with custom hooks' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem Integration Tests</h2>
      
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







