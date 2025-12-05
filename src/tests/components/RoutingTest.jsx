import { useState, useEffect } from 'react';
import { MessageSystem } from '../../messages/kernel/MessageSystem.js';
import { Message } from '../../messages/models/core/Message.js';
import { DummySubsystem1 } from '../subsystems/DummySubsystem1.js';
import { DummySubsystem2 } from '../subsystems/DummySubsystem2.js';
import { DummySubsystem3 } from '../subsystems/DummySubsystem3.js';
import { DummySubsystem4 } from '../subsystems/DummySubsystem4.js';
import { DummySubsystem5 } from '../subsystems/DummySubsystem5.js';

export function RoutingTest() {
  const [messageSystem, setMessageSystem] = useState(null);
  const [results, setResults] = useState(new Map()); // Map<testName, result>
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set()); // Track which tests are currently running

  const initializeSystem = async () => {
    try {
      const system = new MessageSystem({ debug: true });
      
      // Register all dummy subsystems
      const sub1 = new DummySubsystem1('test1', system, { debug: true });
      const sub2 = new DummySubsystem2('test2', system, { debug: true });
      const sub3 = new DummySubsystem3('test3', system, { debug: true });
      const sub4 = new DummySubsystem4('test4', system, { debug: true });
      const sub5 = new DummySubsystem5('test5', system, { debug: true });
      
      await system.registerSubsystem(sub1);
      await system.registerSubsystem(sub2);
      await system.registerSubsystem(sub3);
      await system.registerSubsystem(sub4);
      await system.registerSubsystem(sub5);
      
      setMessageSystem(system);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize system:', error);
      alert(`Failed to initialize: ${error.message}`);
    }
  };

  const testMessages = [
    {
      name: 'Route to Test1',
      path: 'test1://action/create',
      expectedSubsystem: 'test1'
    },
    {
      name: 'Route to Test2',
      path: 'test2://process/item123',
      expectedSubsystem: 'test2'
    },
    {
      name: 'Route to Test3',
      path: 'test3://update/456',
      expectedSubsystem: 'test3'
    },
    {
      name: 'Route to Test4',
      path: 'test4://create/resource',
      expectedSubsystem: 'test4'
    },
    {
      name: 'Route to Test5',
      path: 'test5://delete/target',
      expectedSubsystem: 'test5'
    },
    {
      name: 'Route to Kernel',
      path: 'kernel://error/record/unroutable',
      expectedSubsystem: 'kernel'
    }
  ];

  const runTest = async (testName) => {
    if (!messageSystem) {
      alert('Please initialize the system first');
      return;
    }

    // If test is already running or has results, don't run again
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    const test = testMessages.find(t => t.name === testName);
    if (!test) return;

    setRunningTests(prev => new Set(prev).add(testName));

    try {
      const message = new Message(test.path, { test: 'data' });
      
      // Extract subsystem from message path (this is what MessageRouter uses)
      const extractedSubsystem = message.extractSubsystem();
      const subsystemMatch = extractedSubsystem === test.expectedSubsystem;
      
      // Try to get the subsystem to verify it exists
      // Note: kernel subsystem returns null from getSubsystem('kernel') for security
      let subsystemExists = false;
      if (extractedSubsystem === 'kernel') {
        // Kernel is special - router can still route to it even though getSubsystem returns null
        subsystemExists = true; // Router handles kernel internally
      } else {
        const subsystem = messageSystem.getSubsystem(extractedSubsystem);
        subsystemExists = subsystem !== null;
      }
      
      // Send message through router
      const routeResult = await messageSystem.send(message);
      
      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = {
        name: test.name,
        path: test.path,
        success: routeResult.success && subsystemMatch && subsystemExists,
        expectedSubsystem: test.expectedSubsystem,
        extractedSubsystem: extractedSubsystem,
        subsystemExists: subsystemExists,
        routeResult: routeResult,
        subsystemMatch: subsystemMatch
      };
      
      setResults(prev => new Map(prev).set(testName, result));
    } catch (error) {
      setResults(prev => new Map(prev).set(testName, {
        name: test.name,
        path: test.path,
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
  };

  const runAllTests = async () => {
    if (!messageSystem) {
      alert('Please initialize the system first');
      return;
    }

    for (const test of testMessages) {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        await runTest(test.name);
      }
    }
  };

  // Run test when selected if not already run
  useEffect(() => {
    if (selectedTest && isInitialized && !results.has(selectedTest) && !runningTests.has(selectedTest)) {
      runTest(selectedTest);
    }
  }, [selectedTest, isInitialized]);

  const selectedResult = selectedTest ? results.get(selectedTest) : null;
  const isRunning = selectedTest ? runningTests.has(selectedTest) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Control Panel */}
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
        {!isInitialized ? (
          <div>
            <button 
              onClick={initializeSystem}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              Initialize MessageSystem & Register Subsystems
            </button>
            <span style={{ color: '#4b5563' }}>Click to initialize the message system and register 5 dummy subsystems</span>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'inline-block',
              marginBottom: '8px',
              padding: '8px 12px',
              backgroundColor: '#d1fae5',
              borderRadius: '4px',
              marginRight: '16px'
            }}>
              <span style={{ color: '#065f46' }}>✓ System initialized with 5 dummy subsystems</span>
            </div>
            <button 
              onClick={runAllTests}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Run All Routing Tests
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Side Panel */}
        <div style={{
          width: '250px',
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          padding: '16px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            Test Cases
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {testMessages.map((test, idx) => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              const hasResult = results.has(test.name);
              const isSelected = selectedTest === test.name;
              
              // Determine colors based on state
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
                      padding: '12px',
                      textAlign: 'left',
                      backgroundColor: isSelected ? selectedBgColor : bgColor,
                      border: '2px solid',
                      borderColor: isSelected ? selectedBorderColor : borderColor,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
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
                      fontSize: '16px'
                    }}>
                      {isRunning ? '⟳' : (hasResult ? (result.success ? '✓' : '✗') : '○')}
                    </span>
                    <span>{test.name}</span>
                  </button>
                );
              })}
            </div>
          )}
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
              ) : selectedResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <strong>Path:</strong>{' '}
                  <code style={{
                    backgroundColor: '#f3f4f6',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}>
                    {selectedResult.path}
                  </code>
                </div>
                
                {selectedResult.error ? (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    color: '#dc2626'
                  }}>
                    <strong>Error:</strong> {selectedResult.error}
                    {selectedResult.stack && (
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
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: '16px',
                      backgroundColor: selectedResult.success ? '#f0fdf4' : '#fef2f2',
                      border: `2px solid ${selectedResult.success ? '#86efac' : '#fca5a5'}`,
                      borderRadius: '4px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${selectedResult.success ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        <span style={{ 
                          color: selectedResult.success ? '#16a34a' : '#dc2626',
                          fontWeight: 'bold',
                          fontSize: '20px'
                        }}>
                          {selectedResult.success ? '✓' : '✗'}
                        </span>
                        <span style={{ 
                          color: selectedResult.success ? '#16a34a' : '#dc2626',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {selectedResult.success ? 'Test Passed' : 'Test Failed'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <strong>Expected Subsystem:</strong> {selectedResult.expectedSubsystem}
                        </div>
                        <div>
                          <strong>Extracted Subsystem:</strong> {selectedResult.extractedSubsystem}
                        </div>
                        <div>
                          <strong>Subsystem Match:</strong> 
                          <span style={{ 
                            color: selectedResult.subsystemMatch ? '#16a34a' : '#dc2626',
                            marginLeft: '8px',
                            fontWeight: 'bold'
                          }}>
                            {selectedResult.subsystemMatch ? '✓' : '✗'}
                          </span>
                        </div>
                        <div>
                          <strong>Subsystem Exists:</strong>
                          <span style={{ 
                            color: selectedResult.subsystemExists ? '#16a34a' : '#dc2626',
                            marginLeft: '8px',
                            fontWeight: 'bold'
                          }}>
                            {selectedResult.subsystemExists ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Route Result:</h3>
                      <pre style={{
                        backgroundColor: '#f3f4f6',
                        padding: '16px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto',
                        border: '1px solid #e5e7eb'
                      }}>
                        {JSON.stringify(selectedResult.routeResult, null, 2)}
                      </pre>
                    </div>
                  </>
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
                  <p>Click the test to run it</p>
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
    </div>
  );
}
