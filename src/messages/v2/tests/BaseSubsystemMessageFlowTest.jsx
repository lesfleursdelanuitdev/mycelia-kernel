import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { FACET_KINDS } from '../models/defaults/default-hooks.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * BaseSubsystemMessageFlowTest
 * Tests for BaseSubsystem message flow methods
 */
export function BaseSubsystemMessageFlowTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'pause - delegates to scheduler facet', category: 'Message Flow' },
    { name: 'pause - returns null if scheduler facet not present', category: 'Message Flow' },
    { name: 'pause - supports method chaining', category: 'Message Flow' },
    { name: 'resume - delegates to scheduler facet', category: 'Message Flow' },
    { name: 'resume - returns null if scheduler facet not present', category: 'Message Flow' },
    { name: 'resume - supports method chaining', category: 'Message Flow' },
    { name: 'accept - delegates to coreProcessor.accept', category: 'Message Flow' },
    { name: 'accept - throws error if coreProcessor not available', category: 'Message Flow' },
    { name: 'accept - throws error if coreProcessor.accept not available', category: 'Message Flow' },
    { name: 'process - delegates to scheduler.process if available', category: 'Message Flow' },
    { name: 'process - falls back to coreProcessor.processTick', category: 'Message Flow' },
    { name: 'process - returns null if no processor available', category: 'Message Flow' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'pause - delegates to scheduler facet':
            result = await testPauseDelegates();
            break;
          case 'pause - returns null if scheduler facet not present':
            result = await testPauseReturnsNull();
            break;
          case 'pause - supports method chaining':
            result = await testPauseChaining();
            break;
          case 'resume - delegates to scheduler facet':
            result = await testResumeDelegates();
            break;
          case 'resume - returns null if scheduler facet not present':
            result = await testResumeReturnsNull();
            break;
          case 'resume - supports method chaining':
            result = await testResumeChaining();
            break;
          case 'accept - delegates to coreProcessor.accept':
            result = await testAcceptDelegates();
            break;
          case 'accept - throws error if coreProcessor not available':
            result = await testAcceptThrowsNoProcessor();
            break;
          case 'accept - throws error if coreProcessor.accept not available':
            result = await testAcceptThrowsNoAccept();
            break;
          case 'process - delegates to scheduler.process if available':
            result = await testProcessDelegates();
            break;
          case 'process - falls back to coreProcessor.processTick':
            result = await testProcessFallsBack();
            break;
          case 'process - returns null if no processor available':
            result = await testProcessReturnsNull();
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

  const testPauseDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let paused = false;
    const scheduler = new Facet(FACET_KINDS.SCHEDULER, { attach: false });
    scheduler.pauseProcessing = () => { paused = true; };
    subsystem.api.__facets.add(FACET_KINDS.SCHEDULER, scheduler);
    subsystem.pause();
    if (!paused) {
      return { success: false, error: 'Should delegate to scheduler facet' };
    }
    return { success: true, message: 'Delegates to scheduler facet' };
  };

  const testPauseReturnsNull = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = subsystem.pause();
    if (result !== null) {
      return { success: false, error: 'Should return null if scheduler not present' };
    }
    return { success: true, message: 'Returns null if scheduler facet not present' };
  };

  const testPauseChaining = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const scheduler = new Facet(FACET_KINDS.SCHEDULER, { attach: false });
    scheduler.pauseProcessing = () => {};
    subsystem.api.__facets.add(FACET_KINDS.SCHEDULER, scheduler);
    const result = subsystem.pause();
    if (result !== subsystem) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testResumeDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let resumed = false;
    const scheduler = new Facet(FACET_KINDS.SCHEDULER, { attach: false });
    scheduler.resumeProcessing = () => { resumed = true; };
    subsystem.api.__facets.add(FACET_KINDS.SCHEDULER, scheduler);
    subsystem.resume();
    if (!resumed) {
      return { success: false, error: 'Should delegate to scheduler facet' };
    }
    return { success: true, message: 'Delegates to scheduler facet' };
  };

  const testResumeReturnsNull = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = subsystem.resume();
    if (result !== null) {
      return { success: false, error: 'Should return null if scheduler not present' };
    }
    return { success: true, message: 'Returns null if scheduler facet not present' };
  };

  const testResumeChaining = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const scheduler = new Facet(FACET_KINDS.SCHEDULER, { attach: false });
    scheduler.resumeProcessing = () => {};
    subsystem.api.__facets.add(FACET_KINDS.SCHEDULER, scheduler);
    const result = subsystem.resume();
    if (result !== subsystem) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testAcceptDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let accepted = false;
    const processor = { accept: async () => { accepted = true; } };
    subsystem.coreProcessor = processor;
    await subsystem.accept({});
    if (!accepted) {
      return { success: false, error: 'Should delegate to coreProcessor.accept' };
    }
    return { success: true, message: 'Delegates to coreProcessor.accept' };
  };

  const testAcceptThrowsNoProcessor = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      await subsystem.accept({});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing core/processor facet')) {
        return { success: true, message: 'Throws error if coreProcessor not available' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAcceptThrowsNoAccept = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    subsystem.coreProcessor = {};
    try {
      await subsystem.accept({});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('missing core/processor facet')) {
        return { success: true, message: 'Throws error if coreProcessor.accept not available' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testProcessDelegates = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let processed = false;
    const scheduler = new Facet(FACET_KINDS.SCHEDULER, { attach: false });
    scheduler.process = async () => { processed = true; return {}; };
    subsystem.api.__facets.add(FACET_KINDS.SCHEDULER, scheduler);
    await subsystem.process(100);
    if (!processed) {
      return { success: false, error: 'Should delegate to scheduler.process' };
    }
    return { success: true, message: 'Delegates to scheduler.process if available' };
  };

  const testProcessFallsBack = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    let processed = false;
    const processor = { processTick: async () => { processed = true; return {}; } };
    subsystem.coreProcessor = processor;
    await subsystem.process(100);
    if (!processed) {
      return { success: false, error: 'Should fall back to coreProcessor.processTick' };
    }
    return { success: true, message: 'Falls back to coreProcessor.processTick' };
  };

  const testProcessReturnsNull = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    const result = await subsystem.process(100);
    if (result !== null) {
      return { success: false, error: 'Should return null if no processor available' };
    }
    return { success: true, message: 'Returns null if no processor available' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Message Flow Tests</h2>
      
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







