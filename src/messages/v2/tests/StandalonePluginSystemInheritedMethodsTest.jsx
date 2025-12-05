import { useState } from 'react';
import { StandalonePluginSystem } from '../models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * StandalonePluginSystemInheritedMethodsTest
 * Tests for StandalonePluginSystem inherited methods from BaseSubsystem
 */
export function StandalonePluginSystemInheritedMethodsTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'build - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'build - works correctly with plugins', category: 'Inherited Methods' },
    { name: 'dispose - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'dispose - works correctly with plugins', category: 'Inherited Methods' },
    { name: 'use - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'use - can register plugins', category: 'Inherited Methods' },
    { name: 'find - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'find - can find installed plugins', category: 'Inherited Methods' },
    { name: 'onInit - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'onInit - can register init callbacks', category: 'Inherited Methods' },
    { name: 'onDispose - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'onDispose - can register dispose callbacks', category: 'Inherited Methods' },
    { name: 'setParent - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'getParent - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'isRoot - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'getRoot - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'getNameString - inherits from BaseSubsystem', category: 'Inherited Methods' },
    { name: 'isBuilt - inherits from BaseSubsystem', category: 'Inherited Methods' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'build - inherits from BaseSubsystem':
            result = await testBuildInherits();
            break;
          case 'build - works correctly with plugins':
            result = await testBuildWorksWithPlugins();
            break;
          case 'dispose - inherits from BaseSubsystem':
            result = await testDisposeInherits();
            break;
          case 'dispose - works correctly with plugins':
            result = await testDisposeWorksWithPlugins();
            break;
          case 'use - inherits from BaseSubsystem':
            result = await testUseInherits();
            break;
          case 'use - can register plugins':
            result = await testUseRegistersPlugins();
            break;
          case 'find - inherits from BaseSubsystem':
            result = await testFindInherits();
            break;
          case 'find - can find installed plugins':
            result = await testFindFindsPlugins();
            break;
          case 'onInit - inherits from BaseSubsystem':
            result = await testOnInitInherits();
            break;
          case 'onInit - can register init callbacks':
            result = await testOnInitRegistersCallbacks();
            break;
          case 'onDispose - inherits from BaseSubsystem':
            result = await testOnDisposeInherits();
            break;
          case 'onDispose - can register dispose callbacks':
            result = await testOnDisposeRegistersCallbacks();
            break;
          case 'setParent - inherits from BaseSubsystem':
            result = await testSetParentInherits();
            break;
          case 'getParent - inherits from BaseSubsystem':
            result = await testGetParentInherits();
            break;
          case 'isRoot - inherits from BaseSubsystem':
            result = await testIsRootInherits();
            break;
          case 'getRoot - inherits from BaseSubsystem':
            result = await testGetRootInherits();
            break;
          case 'getNameString - inherits from BaseSubsystem':
            result = await testGetNameStringInherits();
            break;
          case 'isBuilt - inherits from BaseSubsystem':
            result = await testIsBuiltInherits();
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

  const testBuildInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.build !== 'function') {
      return { success: false, error: 'Should inherit build method' };
    }
    await system.build();
    if (!system.isBuilt) {
      return { success: false, error: 'build should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testBuildWorksWithPlugins = async () => {
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
    const facet = system.find('test');
    if (!facet) {
      return { success: false, error: 'Should find installed plugin' };
    }
    return { success: true, message: 'Works correctly with plugins' };
  };

  const testDisposeInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.dispose !== 'function') {
      return { success: false, error: 'Should inherit dispose method' };
    }
    await system.build();
    await system.dispose();
    if (system.isBuilt) {
      return { success: false, error: 'dispose should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testDisposeWorksWithPlugins = async () => {
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
    if (system.isBuilt) {
      return { success: false, error: 'dispose should work with plugins' };
    }
    return { success: true, message: 'Works correctly with plugins' };
  };

  const testUseInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.use !== 'function') {
      return { success: false, error: 'Should inherit use method' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testUseRegistersPlugins = async () => {
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
    if (!system.hooks.includes(testHook)) {
      return { success: false, error: 'Should register plugin' };
    }
    return { success: true, message: 'Can register plugins' };
  };

  const testFindInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.find !== 'function') {
      return { success: false, error: 'Should inherit find method' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testFindFindsPlugins = async () => {
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
    const facet = system.find('test');
    if (!facet) {
      return { success: false, error: 'Should find installed plugin' };
    }
    return { success: true, message: 'Can find installed plugins' };
  };

  const testOnInitInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.onInit !== 'function') {
      return { success: false, error: 'Should inherit onInit method' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testOnInitRegistersCallbacks = async () => {
    const system = new StandalonePluginSystem('test', {});
    let called = false;
    system.onInit(() => { called = true; });
    await system.build();
    if (!called) {
      return { success: false, error: 'Should call init callback' };
    }
    return { success: true, message: 'Can register init callbacks' };
  };

  const testOnDisposeInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.onDispose !== 'function') {
      return { success: false, error: 'Should inherit onDispose method' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testOnDisposeRegistersCallbacks = async () => {
    const system = new StandalonePluginSystem('test', {});
    let called = false;
    system.onDispose(() => { called = true; });
    await system.build();
    await system.dispose();
    if (!called) {
      return { success: false, error: 'Should call dispose callback' };
    }
    return { success: true, message: 'Can register dispose callbacks' };
  };

  const testSetParentInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    const parent = new StandalonePluginSystem('parent', {});
    if (typeof system.setParent !== 'function') {
      return { success: false, error: 'Should inherit setParent method' };
    }
    system.setParent(parent);
    if (system.getParent() !== parent) {
      return { success: false, error: 'setParent should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testGetParentInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    const parent = new StandalonePluginSystem('parent', {});
    if (typeof system.getParent !== 'function') {
      return { success: false, error: 'Should inherit getParent method' };
    }
    system.setParent(parent);
    if (system.getParent() !== parent) {
      return { success: false, error: 'getParent should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testIsRootInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.isRoot !== 'function') {
      return { success: false, error: 'Should inherit isRoot method' };
    }
    if (!system.isRoot()) {
      return { success: false, error: 'isRoot should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testGetRootInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.getRoot !== 'function') {
      return { success: false, error: 'Should inherit getRoot method' };
    }
    if (system.getRoot() !== system) {
      return { success: false, error: 'getRoot should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testGetNameStringInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (typeof system.getNameString !== 'function') {
      return { success: false, error: 'Should inherit getNameString method' };
    }
    const nameStr = system.getNameString();
    if (nameStr !== 'test://') {
      return { success: false, error: 'getNameString should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const testIsBuiltInherits = async () => {
    const system = new StandalonePluginSystem('test', {});
    if (system.isBuilt === undefined) {
      return { success: false, error: 'Should inherit isBuilt getter' };
    }
    if (system.isBuilt !== false) {
      return { success: false, error: 'isBuilt should work' };
    }
    return { success: true, message: 'Inherits from BaseSubsystem' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>StandalonePluginSystem Inherited Methods Tests</h2>
      
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







