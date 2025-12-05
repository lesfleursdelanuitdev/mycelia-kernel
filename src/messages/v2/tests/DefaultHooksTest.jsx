import { useState } from 'react';
import { 
  DefaultHooks, 
  createCanonicalDefaultHooks, 
  createSynchronousDefaultHooks,
  FACET_KINDS 
} from '../models/defaults/default-hooks.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';

/**
 * DefaultHooksTest - React component test suite for DefaultHooks
 * Tests DefaultHooks class and factory functions
 */
export function DefaultHooksTest() {
  const [results, setResults] = useState(new Map()); // Map<testName, result>
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'DefaultHooks Constructor (empty)', category: 'Constructor' },
    { name: 'DefaultHooks Constructor (with hooks)', category: 'Constructor' },
    { name: 'add() method', category: 'Methods' },
    { name: 'remove() method', category: 'Methods' },
    { name: 'clear() method', category: 'Methods' },
    { name: 'list() method', category: 'Methods' },
    { name: 'fork() method', category: 'Methods' },
    { name: 'add() validation (non-function)', category: 'Error Handling' },
    { name: 'createCanonicalDefaultHooks()', category: 'Factory Functions' },
    { name: 'createSynchronousDefaultHooks()', category: 'Factory Functions' },
    { name: 'FACET_KINDS constants', category: 'Constants' },
    { name: 'FACET_KINDS completeness', category: 'Constants' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(() => {
      try {
        let result;
        
        switch (testName) {
          case 'DefaultHooks Constructor (empty)':
            result = testConstructorEmpty();
            break;
          case 'DefaultHooks Constructor (with hooks)':
            result = testConstructorWithHooks();
            break;
          case 'add() method':
            result = testAdd();
            break;
          case 'remove() method':
            result = testRemove();
            break;
          case 'clear() method':
            result = testClear();
            break;
          case 'list() method':
            result = testList();
            break;
          case 'fork() method':
            result = testFork();
            break;
          case 'add() validation (non-function)':
            result = testAddValidation();
            break;
          case 'createCanonicalDefaultHooks()':
            result = testCreateCanonical();
            break;
          case 'createSynchronousDefaultHooks()':
            result = testCreateSynchronous();
            break;
          case 'FACET_KINDS constants':
            result = testFacetKindsConstants();
            break;
          case 'FACET_KINDS completeness':
            result = testFacetKindsCompleteness();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message,
          stack: error.stack
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

  const testConstructorEmpty = () => {
    const hooks = new DefaultHooks();
    const list = hooks.list();
    
    if (!Array.isArray(list)) {
      return { success: false, error: 'list() should return an array' };
    }
    if (list.length !== 0) {
      return { success: false, error: `Expected empty array, got length ${list.length}` };
    }
    
    return {
      success: true,
      message: 'DefaultHooks created successfully with empty hooks array',
      data: { hooksCount: list.length }
    };
  };

  const testConstructorWithHooks = () => {
    const hooks = new DefaultHooks([useRouter, useQueue]);
    const list = hooks.list();
    
    if (list.length !== 2) {
      return { success: false, error: `Expected 2 hooks, got ${list.length}` };
    }
    if (list[0] !== useRouter || list[1] !== useQueue) {
      return { success: false, error: 'Hooks not in expected order' };
    }
    
    return {
      success: true,
      message: 'DefaultHooks created successfully with initial hooks',
      data: { hooksCount: list.length, hooks: list.map(h => h.kind || 'unknown') }
    };
  };

  const testAdd = () => {
    const hooks = new DefaultHooks();
    hooks.add(useRouter);
    hooks.add(useQueue);
    const list = hooks.list();
    
    if (list.length !== 2) {
      return { success: false, error: `Expected 2 hooks after add, got ${list.length}` };
    }
    if (list[0] !== useRouter || list[1] !== useQueue) {
      return { success: false, error: 'Hooks not added in correct order' };
    }
    
    // Test chaining
    const chained = hooks.add(useStatistics);
    if (chained !== hooks) {
      return { success: false, error: 'add() should return this for chaining' };
    }
    
    return {
      success: true,
      message: 'add() method works correctly with chaining',
      data: { hooksCount: hooks.list().length }
    };
  };

  const testRemove = () => {
    const hooks = new DefaultHooks([useRouter, useQueue, useStatistics]);
    hooks.remove(useQueue);
    const list = hooks.list();
    
    if (list.length !== 2) {
      return { success: false, error: `Expected 2 hooks after remove, got ${list.length}` };
    }
    if (list.includes(useQueue)) {
      return { success: false, error: 'Hook not removed' };
    }
    if (!list.includes(useRouter) || !list.includes(useStatistics)) {
      return { success: false, error: 'Wrong hooks removed' };
    }
    
    // Test removing non-existent hook
    hooks.remove(useQueue); // Already removed
    if (hooks.list().length !== 2) {
      return { success: false, error: 'Removing non-existent hook should be safe' };
    }
    
    // Test chaining
    const chained = hooks.remove(useRouter);
    if (chained !== hooks) {
      return { success: false, error: 'remove() should return this for chaining' };
    }
    
    return {
      success: true,
      message: 'remove() method works correctly',
      data: { hooksCount: hooks.list().length }
    };
  };

  const testClear = () => {
    const hooks = new DefaultHooks([useRouter, useQueue, useStatistics]);
    hooks.clear();
    const list = hooks.list();
    
    if (list.length !== 0) {
      return { success: false, error: `Expected empty array after clear, got length ${list.length}` };
    }
    
    // Test chaining
    const chained = hooks.clear();
    if (chained !== hooks) {
      return { success: false, error: 'clear() should return this for chaining' };
    }
    
    return {
      success: true,
      message: 'clear() method works correctly',
      data: { hooksCount: list.length }
    };
  };

  const testList = () => {
    const hooks = new DefaultHooks([useRouter, useQueue]);
    const list1 = hooks.list();
    const list2 = hooks.list();
    
    // Should return copies, not same reference
    if (list1 === list2) {
      return { success: false, error: 'list() should return a new array each time' };
    }
    
    // But should have same content
    if (list1.length !== list2.length || list1[0] !== list2[0] || list1[1] !== list2[1]) {
      return { success: false, error: 'list() should return arrays with same content' };
    }
    
    // Modifying returned array should not affect internal state
    list1.push(useStatistics);
    if (hooks.list().length !== 2) {
      return { success: false, error: 'Modifying returned array should not affect internal state' };
    }
    
    return {
      success: true,
      message: 'list() returns independent copies',
      data: { hooksCount: hooks.list().length }
    };
  };

  const testFork = () => {
    const original = new DefaultHooks([useRouter, useQueue]);
    const forked = original.fork();
    
    // Should be different instances
    if (original === forked) {
      return { success: false, error: 'fork() should return a new instance' };
    }
    
    // Should have same hooks initially
    if (original.list().length !== forked.list().length) {
      return { success: false, error: 'Forked instance should have same hooks' };
    }
    
    // Modifying fork should not affect original
    forked.add(useStatistics);
    if (original.list().length !== 2) {
      return { success: false, error: 'Modifying fork should not affect original' };
    }
    if (forked.list().length !== 3) {
      return { success: false, error: 'Fork should be modifiable independently' };
    }
    
    // Modifying original should not affect fork
    original.remove(useQueue);
    if (forked.list().length !== 3) {
      return { success: false, error: 'Modifying original should not affect fork' };
    }
    if (original.list().length !== 1) {
      return { success: false, error: 'Original should be modifiable independently' };
    }
    
    return {
      success: true,
      message: 'fork() creates independent copy',
      data: { 
        originalCount: original.list().length,
        forkedCount: forked.list().length
      }
    };
  };

  const testAddValidation = () => {
    const hooks = new DefaultHooks();
    
    try {
      hooks.add('not-a-function');
      return { success: false, error: 'add() should throw error for non-function' };
    } catch (error) {
      if (!error.message.includes('hook must be a function')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    try {
      hooks.add(null);
      return { success: false, error: 'add() should throw error for null' };
    } catch (error) {
      if (!error.message.includes('hook must be a function')) {
        return { success: false, error: `Wrong error message for null: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'add() validates input correctly',
      data: {}
    };
  };

  const testCreateCanonical = () => {
    const hooks = createCanonicalDefaultHooks();
    const list = hooks.list();
    
    if (!(hooks instanceof DefaultHooks)) {
      return { success: false, error: 'Should return DefaultHooks instance' };
    }
    
    // Check that expected hooks are present
    const expectedKinds = ['hierarchy', 'router', 'processor', 'queue', 'scheduler', 'listeners', 'statistics', 'queries'];
    const actualKinds = list.map(h => h.kind).filter(Boolean);
    
    for (const kind of expectedKinds) {
      if (!actualKinds.includes(kind)) {
        return { success: false, error: `Missing expected hook kind: ${kind}` };
      }
    }
    
    if (list.length !== 8) {
      return { success: false, error: `Expected 8 hooks, got ${list.length}` };
    }
    
    return {
      success: true,
      message: 'createCanonicalDefaultHooks() returns correct hooks',
      data: { 
        hooksCount: list.length,
        hookKinds: actualKinds
      }
    };
  };

  const testCreateSynchronous = () => {
    const hooks = createSynchronousDefaultHooks();
    const list = hooks.list();
    
    if (!(hooks instanceof DefaultHooks)) {
      return { success: false, error: 'Should return DefaultHooks instance' };
    }
    
    // Check that expected hooks are present
    const expectedKinds = ['listeners', 'statistics', 'queries', 'router', 'queue', 'processor', 'synchronous', 'hierarchy'];
    const actualKinds = list.map(h => h.kind).filter(Boolean);
    
    for (const kind of expectedKinds) {
      if (!actualKinds.includes(kind)) {
        return { success: false, error: `Missing expected hook kind: ${kind}` };
      }
    }
    
    if (list.length !== 8) {
      return { success: false, error: `Expected 8 hooks, got ${list.length}` };
    }
    
    // Check that synchronous is present
    if (!actualKinds.includes('synchronous')) {
      return { success: false, error: 'Synchronous hooks should include synchronous hook' };
    }
    
    return {
      success: true,
      message: 'createSynchronousDefaultHooks() returns correct hooks',
      data: { 
        hooksCount: list.length,
        hookKinds: actualKinds
      }
    };
  };

  const testFacetKindsConstants = () => {
    const expectedKinds = [
      'HIERARCHY', 'ROUTER', 'PROCESSOR', 'QUEUE', 
      'SCHEDULER', 'LISTENERS', 'STATISTICS', 'SYNCHRONOUS', 'QUERIES'
    ];
    
    for (const kind of expectedKinds) {
      if (!(kind in FACET_KINDS)) {
        return { success: false, error: `Missing FACET_KINDS.${kind}` };
      }
      if (typeof FACET_KINDS[kind] !== 'string') {
        return { success: false, error: `FACET_KINDS.${kind} should be a string` };
      }
    }
    
    // Check values match expected strings
    if (FACET_KINDS.HIERARCHY !== 'hierarchy') {
      return { success: false, error: 'FACET_KINDS.HIERARCHY should be "hierarchy"' };
    }
    if (FACET_KINDS.ROUTER !== 'router') {
      return { success: false, error: 'FACET_KINDS.ROUTER should be "router"' };
    }
    
    return {
      success: true,
      message: 'FACET_KINDS constants are correctly defined',
      data: { 
        constants: Object.keys(FACET_KINDS),
        values: Object.entries(FACET_KINDS).map(([k, v]) => `${k}: "${v}"`)
      }
    };
  };

  const testFacetKindsCompleteness = () => {
    // Get all hooks from canonical defaults
    const canonical = createCanonicalDefaultHooks();
    const canonicalKinds = canonical.list().map(h => h.kind).filter(Boolean);
    
    // Get all hooks from synchronous defaults
    const synchronous = createSynchronousDefaultHooks();
    const synchronousKinds = synchronous.list().map(h => h.kind).filter(Boolean);
    
    // Combine and get unique kinds
    const allKinds = [...new Set([...canonicalKinds, ...synchronousKinds])];
    
    // Check that all kinds have corresponding FACET_KINDS constants
    for (const kind of allKinds) {
      const constantName = kind.toUpperCase();
      if (!(constantName in FACET_KINDS)) {
        return { 
          success: false, 
          error: `Hook kind "${kind}" missing from FACET_KINDS (expected FACET_KINDS.${constantName})` 
        };
      }
      if (FACET_KINDS[constantName] !== kind) {
        return { 
          success: false, 
          error: `FACET_KINDS.${constantName} value "${FACET_KINDS[constantName]}" doesn't match hook kind "${kind}"` 
        };
      }
    }
    
    return {
      success: true,
      message: 'FACET_KINDS includes all hook kinds from default hooks',
      data: { 
        hookKinds: allKinds,
        facetKinds: Object.keys(FACET_KINDS)
      }
    };
  };

  const runAllTests = () => {
    testCases.forEach(test => {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        runTest(test.name);
      }
    });
  };

  const clearResults = () => {
    setResults(new Map());
    setSelectedTest(null);
  };

  const selectedResult = selectedTest ? results.get(selectedTest) : null;
  const isRunning = selectedTest ? runningTests.has(selectedTest) : false;

  // Group tests by category
  const testsByCategory = testCases.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
      {/* Side Panel */}
      <div style={{
        width: '300px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          DefaultHooks Tests
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={runAllTests}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Run All
          </button>
          <button 
            onClick={clearResults}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            Clear
          </button>
        </div>

        {/* Test Categories */}
        {Object.entries(testsByCategory).map(([category, tests]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              {category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tests.map((test, idx) => {
                const result = results.get(test.name);
                const isRunning = runningTests.has(test.name);
                const hasResult = results.has(test.name);
                const isSelected = selectedTest === test.name;
                
                let bgColor, borderColor, selectedBgColor, selectedBorderColor;
                if (isRunning) {
                  bgColor = '#fef3c7';
                  borderColor = '#fcd34d';
                  selectedBgColor = '#fde68a';
                  selectedBorderColor = '#fbbf24';
                } else if (hasResult) {
                  bgColor = result.success ? '#f0fdf4' : '#fef2f2';
                  borderColor = result.success ? '#86efac' : '#fca5a5';
                  selectedBgColor = result.success ? '#dcfce7' : '#fee2e2';
                  selectedBorderColor = result.success ? '#4ade80' : '#f87171';
                } else {
                  bgColor = '#f3f4f6';
                  borderColor = '#d1d5db';
                  selectedBgColor = '#e5e7eb';
                  selectedBorderColor = '#9ca3af';
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTest(test.name);
                      if (!hasResult && !isRunning) {
                        runTest(test.name);
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: isSelected ? selectedBgColor : bgColor,
                      border: '2px solid',
                      borderColor: isSelected ? selectedBorderColor : borderColor,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: isSelected ? '600' : '400'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        if (hasResult) {
                          e.target.style.backgroundColor = result.success ? '#dcfce7' : '#fee2e2';
                          e.target.style.borderColor = result.success ? '#4ade80' : '#f87171';
                        } else {
                          e.target.style.backgroundColor = '#e5e7eb';
                          e.target.style.borderColor = '#9ca3af';
                        }
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = bgColor;
                        e.target.style.borderColor = borderColor;
                      }
                    }}
                  >
                    <span style={{ 
                      color: isRunning ? '#d97706' : (hasResult ? (result.success ? '#16a34a' : '#dc2626') : '#6b7280'),
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {isRunning ? '⟳' : (hasResult ? (result.success ? '✓' : '✗') : '○')}
                    </span>
                    <span>{test.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Panel */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {selectedTest ? (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              {selectedTest}
            </h2>
            
            {isRunning ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '2px solid #fcd34d',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>⟳</span>
                <span>Running test...</span>
              </div>
            ) : selectedResult && selectedResult.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #86efac',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>Test Passed</span>
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Message:</h3>
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedResult.message}
                  </div>
                </div>
                {selectedResult.data && Object.keys(selectedResult.data).length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Data:</h3>
                    <pre style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      border: '1px solid #e5e7eb'
                    }}>
                      {JSON.stringify(selectedResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : selectedResult ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: '4px',
                color: '#dc2626'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '20px' }}>✗</span>
                  <strong>Test Failed</strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error:</strong> {selectedResult.error}
                </div>
                {selectedResult.stack && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Stack Trace</summary>
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fee2e2',
                      borderRadius: '4px',
                      fontSize: '11px',
                      overflow: 'auto'
                    }}>
                      {selectedResult.stack}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '200px',
                color: '#6b7280'
              }}>
                <p>Click the test name to run it</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            <p>Select a test from the side panel to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}







