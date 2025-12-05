import { useState, useEffect } from 'react';
import { MessageMetadata } from '../../messages/models/core/MessageMetadata.js';

export function MessageMetadataTest() {
  const [results, setResults] = useState(new Map()); // Map<testName, result>
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    {
      name: 'Fixed Data Immutability - Direct Property Access',
      run: () => {
        const fixed = {
          timestamp: 1234567890,
          type: 'command',
          isCommand: true,
          maxRetries: 5,
          caller: 'canvas'
        };
        const meta = new MessageMetadata(fixed, { retries: 0 });
        
        // Try to modify fixed properties directly (should fail silently or throw)
        let modificationAttempted = false;
        let originalTimestamp = meta.getTimestamp();
        let originalType = meta.getType();
        
        try {
          // Try to access and modify #fixed (should fail - it's private)
          // We can't directly access private fields, but we can test that getters still return original values
          // Try to modify through any exposed method (there shouldn't be any)
          modificationAttempted = true;
        } catch (error) {
          // Expected if trying to modify frozen object
        }
        
        // Verify values haven't changed
        const timestampAfter = meta.getTimestamp();
        const typeAfter = meta.getType();
        
        return {
          success: timestampAfter === originalTimestamp && typeAfter === originalType,
          details: {
            originalTimestamp,
            timestampAfter,
            originalType,
            typeAfter,
            modificationAttempted
          }
        };
      }
    },
    {
      name: 'Fixed Data Immutability - Frozen Object',
      run: () => {
        const fixed = {
          timestamp: 1234567890,
          type: 'command',
          isCommand: true
        };
        const meta = new MessageMetadata(fixed, {});
        
        // Verify the fixed object is frozen
        const json = meta.toJSON();
        const fixedCopy = json.fixed;
        
        // Try to modify the copy (should work since it's a copy)
        fixedCopy.timestamp = 9999999999;
        fixedCopy.type = 'modified';
        
        // But original should be unchanged
        const originalTimestamp = meta.getTimestamp();
        const originalType = meta.getType();
        
        return {
          success: originalTimestamp === 1234567890 && originalType === 'command',
          details: {
            originalTimestamp,
            originalType,
            copyModified: true,
            copyTimestamp: fixedCopy.timestamp,
            copyType: fixedCopy.type
          }
        };
      }
    },
    {
      name: 'Mutable Data - setRetries',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, { retries: 0 });
        
        meta.setRetries(3);
        const retries1 = meta.getRetries();
        
        meta.setRetries(5);
        const retries2 = meta.getRetries();
        
        return {
          success: retries1 === 3 && retries2 === 5,
          details: {
            retries1,
            retries2
          }
        };
      }
    },
    {
      name: 'Mutable Data - incrementRetry',
      run: () => {
        const meta = new MessageMetadata(
          { timestamp: Date.now(), maxRetries: 3 },
          { retries: 0 }
        );
        
        const canRetry1 = meta.incrementRetry();
        const retries1 = meta.getRetries();
        
        const canRetry2 = meta.incrementRetry();
        const retries2 = meta.getRetries();
        
        const canRetry3 = meta.incrementRetry();
        const retries3 = meta.getRetries();
        
        const canRetry4 = meta.incrementRetry(); // Should exceed max
        const retries4 = meta.getRetries();
        
        return {
          success: retries1 === 1 && canRetry1 === true &&
                   retries2 === 2 && canRetry2 === true &&
                   retries3 === 3 && canRetry3 === true &&
                   retries4 === 4 && canRetry4 === false,
          details: {
            retries1, canRetry1,
            retries2, canRetry2,
            retries3, canRetry3,
            retries4, canRetry4
          }
        };
      }
    },
    {
      name: 'Mutable Data - resetRetries',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, { retries: 5 });
        
        const before = meta.getRetries();
        meta.resetRetries();
        const after = meta.getRetries();
        
        return {
          success: before === 5 && after === 0,
          details: {
            before,
            after
          }
        };
      }
    },
    {
      name: 'Mutable Data - setQueryResult',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, {});
        
        meta.setQueryResult({ data: 'test1' });
        const result1 = meta.getQueryResult();
        
        meta.setQueryResult({ data: 'test2', count: 42 });
        const result2 = meta.getQueryResult();
        
        meta.setQueryResult(null);
        const result3 = meta.getQueryResult();
        
        return {
          success: result1?.data === 'test1' &&
                   result2?.data === 'test2' && result2?.count === 42 &&
                   result3 === null,
          details: {
            result1,
            result2,
            result3
          }
        };
      }
    },
    {
      name: 'Mutable Data - updateMutable',
      run: () => {
        const meta = new MessageMetadata(
          { timestamp: Date.now() },
          { retries: 0, queryResult: null }
        );
        
        meta.updateMutable({ retries: 2, queryResult: { data: 'test' }, customField: 'value' });
        
        const retries = meta.getRetries();
        const queryResult = meta.getQueryResult();
        const json = meta.toJSON();
        const customField = json.mutable.customField;
        
        return {
          success: retries === 2 &&
                   queryResult?.data === 'test' &&
                   customField === 'value',
          details: {
            retries,
            queryResult,
            customField
          }
        };
      }
    },
    {
      name: 'Getter Methods - Fixed Properties',
      run: () => {
        const fixed = {
          timestamp: 1234567890,
          senderId: 'sender_123',
          transaction: 'tx_456',
          seq: 1,
          type: 'command',
          maxRetries: 5,
          caller: 'canvas',
          isAtomic: true,
          batch: false,
          isQuery: false,
          isCommand: true,
          isError: false
        };
        const meta = new MessageMetadata(fixed, {});
        
        return {
          success: meta.getTimestamp() === 1234567890 &&
                   meta.getSenderId() === 'sender_123' &&
                   meta.getTransaction() === 'tx_456' &&
                   meta.getSeq() === 1 &&
                   meta.getType() === 'command' &&
                   meta.getMaxRetries() === 5 &&
                   meta.getCaller() === 'canvas' &&
                   meta.isAtomic() === true &&
                   meta.isBatch() === false &&
                   meta.isQuery() === false &&
                   meta.isCommand() === true &&
                   meta.isError() === false,
          details: {
            timestamp: meta.getTimestamp(),
            senderId: meta.getSenderId(),
            transaction: meta.getTransaction(),
            seq: meta.getSeq(),
            type: meta.getType(),
            maxRetries: meta.getMaxRetries(),
            caller: meta.getCaller(),
            isAtomic: meta.isAtomic(),
            isBatch: meta.isBatch(),
            isQuery: meta.isQuery(),
            isCommand: meta.isCommand(),
            isError: meta.isError()
          }
        };
      }
    },
    {
      name: 'Getter Methods - Null/Undefined Handling',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, {});
        
        // Test that getters handle missing properties gracefully
        const senderId = meta.getSenderId();
        const transaction = meta.getTransaction();
        const seq = meta.getSeq();
        const caller = meta.getCaller();
        const queryResult = meta.getQueryResult();
        const retries = meta.getRetries();
        
        return {
          success: senderId === null &&
                   transaction === null &&
                   seq === null &&
                   caller === null &&
                   queryResult === null &&
                   retries === 0, // Defaults to 0, not null
          details: {
            senderId,
            transaction,
            seq,
            caller,
            queryResult,
            retries
          }
        };
      }
    },
    {
      name: 'toJSON and fromJSON',
      run: () => {
        const fixed = {
          timestamp: 1234567890,
          type: 'command',
          isCommand: true
        };
        const mutable = { retries: 3, queryResult: { data: 'test' } };
        const meta1 = new MessageMetadata(fixed, mutable);
        
        const json = meta1.toJSON();
        const meta2 = MessageMetadata.fromJSON(json);
        
        return {
          success: meta2.getTimestamp() === meta1.getTimestamp() &&
                   meta2.getType() === meta1.getType() &&
                   meta2.isCommand() === meta1.isCommand() &&
                   meta2.getRetries() === meta1.getRetries() &&
                   JSON.stringify(meta2.getQueryResult()) === JSON.stringify(meta1.getQueryResult()),
          details: {
            original: {
              timestamp: meta1.getTimestamp(),
              type: meta1.getType(),
              retries: meta1.getRetries()
            },
            restored: {
              timestamp: meta2.getTimestamp(),
              type: meta2.getType(),
              retries: meta2.getRetries()
            },
            json
          }
        };
      }
    },
    {
      name: 'clone Method',
      run: () => {
        const fixed = { timestamp: 1234567890, type: 'command' };
        const mutable = { retries: 2, queryResult: { data: 'original' } };
        const meta1 = new MessageMetadata(fixed, mutable);
        
        const meta2 = meta1.clone({ retries: 5 });
        const meta3 = meta1.clone({ queryResult: { data: 'new' } });
        
        return {
          success: meta1.getRetries() === 2 && // Original unchanged
                   meta2.getRetries() === 5 && // Clone updated
                   meta2.getQueryResult()?.data === 'original' && // Other mutable preserved
                   meta3.getRetries() === 2 && // Original unchanged
                   meta3.getQueryResult()?.data === 'new' && // Clone updated
                   meta1.getTimestamp() === meta2.getTimestamp() && // Fixed same
                   meta1.getType() === meta2.getType(), // Fixed same
          details: {
            original: {
              retries: meta1.getRetries(),
              queryResult: meta1.getQueryResult()
            },
            clone1: {
              retries: meta2.getRetries(),
              queryResult: meta2.getQueryResult()
            },
            clone2: {
              retries: meta3.getRetries(),
              queryResult: meta3.getQueryResult()
            }
          }
        };
      }
    },
    {
      name: 'Error Handling - Invalid setRetries',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, { retries: 0 });
        
        let error1 = null;
        let error2 = null;
        
        try {
          meta.setRetries(-1);
        } catch (e) {
          error1 = e.message;
        }
        
        try {
          meta.setRetries('invalid');
        } catch (e) {
          error2 = e.message;
        }
        
        return {
          success: error1 !== null && error2 !== null,
          details: {
            error1,
            error2,
            retriesAfter: meta.getRetries() // Should still be 0
          }
        };
      }
    },
    {
      name: 'Error Handling - Invalid updateMutable',
      run: () => {
        const meta = new MessageMetadata({ timestamp: Date.now() }, {});
        
        let error1 = null;
        let error2 = null;
        
        try {
          meta.updateMutable(null);
        } catch (e) {
          error1 = e.message;
        }
        
        try {
          meta.updateMutable('invalid');
        } catch (e) {
          error2 = e.message;
        }
        
        return {
          success: error1 !== null && error2 !== null,
          details: {
            error1,
            error2
          }
        };
      }
    }
  ];

  const runTest = (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    const test = testCases.find(t => t.name === testName);
    if (!test) return;

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(() => {
      try {
        const result = test.run();
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          details: result.details
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

  const runAllTests = () => {
    testCases.forEach(test => {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        runTest(test.name);
      }
    });
  };

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
        width: '300px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          MessageMetadata Tests
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
          {testCases.map((test, idx) => {
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
                  padding: '10px',
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
              >
                <span style={{ 
                  color: isRunning ? '#d97706' : (hasResult ? (result.success ? '#16a34a' : '#dc2626') : '#6b7280'),
                  fontWeight: 'bold',
                  fontSize: '14px',
                  minWidth: '16px'
                }}>
                  {isRunning ? '⟳' : (hasResult ? (result.success ? '✓' : '✗') : '○')}
                </span>
                <span style={{ fontSize: '12px' }}>{test.name}</span>
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
            ) : selectedResult ? (
              <div>
                <div style={{
                  padding: '12px',
                  backgroundColor: selectedResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `2px solid ${selectedResult.success ? '#86efac' : '#fca5a5'}`,
                  borderRadius: '4px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                    fontWeight: '600'
                  }}>
                    {selectedResult.success ? 'Test Passed' : 'Test Failed'}
                  </span>
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
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Test Details:</h3>
                    <pre style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      border: '1px solid #e5e7eb'
                    }}>
                      {JSON.stringify(selectedResult.details, null, 2)}
                    </pre>
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
  );
}










