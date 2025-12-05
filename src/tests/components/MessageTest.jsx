import { useState, useEffect } from 'react';
import { Message } from '../../messages/models/core/Message.js';
import { MessageFactory } from '../../messages/factories/MessageFactory.js';

export function MessageTest() {
  const [results, setResults] = useState(new Map()); // Map<testName, result>
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set()); // Track which tests are currently running

  const testMessages = [
    {
      name: 'Simple Message',
      create: () => new Message('test1://action/create', { data: 'test' })
    },
    {
      name: 'Atomic Message',
      create: () => Message.create('test2://process/item1', { item: 'data' }, { type: 'atomic' })
    },
    {
      name: 'Query Message',
      create: () => Message.create('test3://query/get-data', { filters: {} })
    },
    {
      name: 'Command Message',
      create: () => Message.create('test4://command/execute', { action: 'save' }, { type: 'command' })
    },
    {
      name: 'Transaction Message',
      create: () => Message.create('test5://transaction/update', { id: '123' }, { 
        type: 'transaction',
        transaction: 'tx_123',
        seq: 1
      })
    },
    {
      name: 'Error Message',
      create: () => Message.create('kernel://error/record/unroutable', { 
        originalMessage: new Message('invalid://path', {})
      }, { type: 'error' })
    },
    {
      name: 'Complex Path with Dots',
      create: () => new Message('test1://layers.background.create/item', { name: 'test' })
    },
    {
      name: 'Retry Message',
      create: () => Message.create('test2://retry/operation', { data: 'retry' }, { 
        type: 'retry',
        maxRetries: 5
      })
    }
  ];

  const runTest = (testName) => {
    // If test is already running or has results, don't run again
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    const test = testMessages.find(t => t.name === testName);
    if (!test) return;

    setRunningTests(prev => new Set(prev).add(testName));

    // Run test asynchronously
    setTimeout(() => {
      try {
        const message = test.create();
        const routeTree = message.getRouteTree();
        
        const result = {
          name: test.name,
          success: true,
          message: {
            id: message.getId(),
            path: message.getPath(),
            type: message.getMeta().getType(),
            isAtomic: message.isAtomic(),
            isQuery: message.isQuery(),
            isCommand: message.isCommand(),
            isError: message.isError(),
            caller: message.getCaller(),
            timestamp: message.getTimestamp()
          },
          routeTree: {
            subsystem: routeTree.getSubsystem(),
            pieces: routeTree.getPieces(),
            decomposedPieces: routeTree.getDecomposedPieces(),
            depth: routeTree.getDepth(),
            isValid: routeTree.isValid(),
            subsystemPath: routeTree.getSubsystemPath()
          }
        };
        
        setResults(prev => new Map(prev).set(testName, result));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: test.name,
          success: false,
          error: error.message
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

  const runAllTests = () => {
    testMessages.forEach(test => {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        runTest(test.name);
      }
    });
  };

  // Run test when selected if not already run
  useEffect(() => {
    if (selectedTest && !results.has(selectedTest) && !runningTests.has(selectedTest)) {
      runTest(selectedTest);
    }
  }, [selectedTest]);

  const selectedResult = selectedTest ? results.get(selectedTest) : null;
  const isRunning = selectedTest ? runningTests.has(selectedTest) : false;

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
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
        <button 
          onClick={runAllTests}
          style={{
            width: '100%',
            marginBottom: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          Run All Tests
        </button>
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
                  <pre style={{
                    backgroundColor: '#f3f4f6',
                    padding: '16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    border: '1px solid #e5e7eb'
                  }}>
                    {JSON.stringify(selectedResult.message, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Route Tree:</h3>
                  <pre style={{
                    backgroundColor: '#f3f4f6',
                    padding: '16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    border: '1px solid #e5e7eb'
                  }}>
                    {JSON.stringify(selectedResult.routeTree, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
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
                <div><strong>Error:</strong> {selectedResult.error}</div>
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
            <p>{selectedTest ? 'Test is running...' : 'Select a test from the side panel to view results'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
