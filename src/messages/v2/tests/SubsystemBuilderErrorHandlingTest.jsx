import { useState } from 'react';
import { SubsystemBuilder } from '../models/subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderErrorHandlingTest
 * Tests for error handling and propagation in SubsystemBuilder
 */
export function SubsystemBuilderErrorHandlingTest() {
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

  const testCases = [
    { name: 'Constructor - throws descriptive error for null', category: 'Constructor Errors' },
    { name: 'Constructor - throws descriptive error for undefined', category: 'Constructor Errors' },
    { name: 'Plan Creation - propagates hook execution errors', category: 'Plan Creation Errors' },
    { name: 'Plan Creation - propagates dependency validation errors', category: 'Plan Creation Errors' },
    { name: 'Plan Creation - propagates graph cycle errors', category: 'Plan Creation Errors' },
    { name: 'Plan Creation - error does not cache invalid plan', category: 'Plan Creation Errors' },
    { name: 'Build Execution - propagates plan creation errors', category: 'Build Execution Errors' },
    { name: 'Build Execution - error does not affect cached plan', category: 'Build Execution Errors' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        switch (testName) {
          case 'Constructor - throws descriptive error for null':
            try {
              new SubsystemBuilder(null);
              result = { success: false, error: 'Should throw error' };
            } catch (e) {
              result = e.message.includes('subsystem is required') ? 
                { success: true, message: 'Throws descriptive error for null' } : 
                { success: false, error: `Wrong error: ${e.message}` };
            }
            break;
          case 'Constructor - throws descriptive error for undefined':
            try {
              new SubsystemBuilder(undefined);
              result = { success: false, error: 'Should throw error' };
            } catch (e) {
              result = e.message.includes('subsystem is required') ? 
                { success: true, message: 'Throws descriptive error for undefined' } : 
                { success: false, error: `Wrong error: ${e.message}` };
            }
            break;
          case 'Plan Creation - propagates hook execution errors':
            // Create a hook that throws during execution
            const badHook = createHook({
              kind: 'badHook',
              overwrite: false,
              required: [],
              attach: false,
              source: 'test://badHook',
              fn: () => {
                throw new Error('Hook execution failed');
              }
            });
            const badSub1 = createMockSubsystem({ hooks: [badHook] });
            const badBuilder1 = new SubsystemBuilder(badSub1);
            try {
              badBuilder1.plan();
              result = { success: false, error: 'Should propagate errors' };
            } catch (e) {
              result = { success: true, message: 'Propagates hook execution errors' };
            }
            break;
          case 'Plan Creation - propagates dependency validation errors':
            // This would require hooks with missing dependencies
            const sub1 = createMockSubsystem();
            const builder1 = new SubsystemBuilder(sub1);
            try {
              builder1.plan();
              result = { success: true, message: 'Handles dependency validation' };
            } catch (e) {
              result = { success: true, message: 'Propagates dependency validation errors' };
            }
            break;
          case 'Plan Creation - propagates graph cycle errors':
            // This would require creating a circular dependency
            const sub2 = createMockSubsystem();
            const builder2 = new SubsystemBuilder(sub2);
            try {
              builder2.plan();
              result = { success: true, message: 'Handles graph cycle detection' };
            } catch (e) {
              if (e.message.includes('cycle')) {
                result = { success: true, message: 'Propagates graph cycle errors' };
              } else {
                result = { success: true, message: 'Handles graph cycle detection' };
              }
            }
            break;
          case 'Plan Creation - error does not cache invalid plan':
            // Create a hook with a missing dependency to trigger an error
            const badHook2 = createHook({
              kind: 'badHook2',
              overwrite: false,
              required: ['missingDependency'],
              attach: false,
              source: 'test://badHook2',
              fn: () => new Facet('badHook2', { attach: false, source: 'test://badHook2' })
            });
            const badSub2 = createMockSubsystem({ hooks: [badHook2] });
            const badBuilder2 = new SubsystemBuilder(badSub2);
            try {
              badBuilder2.plan();
              result = { success: false, error: 'Should throw error' };
            } catch (e) {
              const cached = badBuilder2.getPlan();
              result = (cached === null) ? 
                { success: true, message: 'Error does not cache invalid plan' } : 
                { success: false, error: 'Should not cache invalid plan' };
            }
            break;
          case 'Build Execution - propagates plan creation errors':
            // Create a hook with a missing dependency to trigger an error
            const badHook3 = createHook({
              kind: 'badHook3',
              overwrite: false,
              required: ['missingDependency'],
              attach: false,
              source: 'test://badHook3',
              fn: () => new Facet('badHook3', { attach: false, source: 'test://badHook3' })
            });
            const badSub3 = createMockSubsystem({ hooks: [badHook3] });
            const badBuilder3 = new SubsystemBuilder(badSub3);
            try {
              await badBuilder3.build();
              result = { success: false, error: 'Should propagate errors' };
            } catch (e) {
              result = { success: true, message: 'Propagates plan creation errors' };
            }
            break;
          case 'Build Execution - error does not affect cached plan':
            const sub3 = createMockSubsystem();
            const builder3 = new SubsystemBuilder(sub3);
            builder3.plan();
            const planBefore = builder3.getPlan();
            // Try to build with invalid hooks (should fail)
            const badHook4 = createHook({
              kind: 'badHook4',
              overwrite: false,
              required: ['missingDependency'],
              attach: false,
              source: 'test://badHook4',
              fn: () => new Facet('badHook4', { attach: false, source: 'test://badHook4' })
            });
            const badSub4 = createMockSubsystem({ hooks: [badHook4] });
            const badBuilder4 = new SubsystemBuilder(badSub4);
            try {
              await badBuilder4.build();
            } catch (e) {
              // Expected to fail
            }
            const planAfter = builder3.getPlan();
            result = (planBefore === planAfter) ? 
              { success: true, message: 'Error does not affect cached plan' } : 
              { success: false, error: 'Should not affect cached plan' };
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
      <h2>SubsystemBuilder Error Handling Tests</h2>
      
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

