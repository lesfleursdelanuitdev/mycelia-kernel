import { useState } from 'react';
import { Friend } from '../models/security/friend.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * FriendTest
 * Tests for Friend class
 */
export function FriendTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Constructor - accepts name and endpoint', category: 'Constructor' },
    { name: 'Constructor - initializes with default values', category: 'Constructor' },
    { name: 'Constructor - sets connected to false', category: 'Constructor' },
    { name: 'Constructor - sets lastSeen to null', category: 'Constructor' },
    { name: 'get kind - returns PRINCIPAL_KINDS.FRIEND', category: 'Getters' },
    { name: 'get isFriend - returns true', category: 'Getters' },
    { name: 'get name - returns name', category: 'Getters' },
    { name: 'get endpoint - returns endpoint', category: 'Getters' },
    { name: 'get metadata - returns metadata', category: 'Getters' },
    { name: 'get sessionKey - returns sessionKey', category: 'Getters' },
    { name: 'get connected - returns connection status', category: 'Getters' },
    { name: 'connect - sets connected to true', category: 'Connection Management' },
    { name: 'connect - updates lastSeen timestamp', category: 'Connection Management' },
    { name: 'disconnect - sets connected to false', category: 'Connection Management' },
    { name: 'disconnect - does not clear lastSeen', category: 'Connection Management' },
    { name: 'connect - can be called multiple times', category: 'Connection Management' },
    { name: 'sendProtected - throws error if not connected', category: 'Protected Messaging' },
    { name: 'sendProtected - throws error for missing MessageSystem', category: 'Protected Messaging' },
    { name: 'sendProtected - calls MessageSystem.sendProtected', category: 'Protected Messaging' },
    { name: 'sendProtected - passes friend instance', category: 'Protected Messaging' },
    { name: 'sendProtected - passes message', category: 'Protected Messaging' },
    { name: 'getNameString - returns formatted string', category: 'Serialization' },
    { name: 'toRecord - returns correct structure', category: 'Serialization' },
    { name: 'toString - returns formatted string', category: 'Serialization' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - accepts name and endpoint':
            result = await testConstructorAcceptsNameAndEndpoint();
            break;
          case 'Constructor - initializes with default values':
            result = await testConstructorInitializesDefaults();
            break;
          case 'Constructor - sets connected to false':
            result = await testConstructorSetsConnectedFalse();
            break;
          case 'Constructor - sets lastSeen to null':
            result = await testConstructorSetsLastSeenNull();
            break;
          case 'get kind - returns PRINCIPAL_KINDS.FRIEND':
            result = await testGetKind();
            break;
          case 'get isFriend - returns true':
            result = await testGetIsFriend();
            break;
          case 'get name - returns name':
            result = await testGetName();
            break;
          case 'get endpoint - returns endpoint':
            result = await testGetEndpoint();
            break;
          case 'get metadata - returns metadata':
            result = await testGetMetadata();
            break;
          case 'get sessionKey - returns sessionKey':
            result = await testGetSessionKey();
            break;
          case 'get connected - returns connection status':
            result = await testGetConnected();
            break;
          case 'connect - sets connected to true':
            result = await testConnectSetsConnectedTrue();
            break;
          case 'connect - updates lastSeen timestamp':
            result = await testConnectUpdatesLastSeen();
            break;
          case 'disconnect - sets connected to false':
            result = await testDisconnectSetsConnectedFalse();
            break;
          case 'disconnect - does not clear lastSeen':
            result = await testDisconnectDoesNotClearLastSeen();
            break;
          case 'connect - can be called multiple times':
            result = await testConnectCanBeCalledMultipleTimes();
            break;
          case 'sendProtected - throws error if not connected':
            result = await testSendProtectedThrowsErrorIfNotConnected();
            break;
          case 'sendProtected - throws error for missing MessageSystem':
            result = await testSendProtectedThrowsErrorForMissingMs();
            break;
          case 'sendProtected - calls MessageSystem.sendProtected':
            result = await testSendProtectedCallsMsSendProtected();
            break;
          case 'sendProtected - passes friend instance':
            result = await testSendProtectedPassesFriendInstance();
            break;
          case 'sendProtected - passes message':
            result = await testSendProtectedPassesMessage();
            break;
          case 'getNameString - returns formatted string':
            result = await testGetNameString();
            break;
          case 'toRecord - returns correct structure':
            result = await testToRecord();
            break;
          case 'toString - returns formatted string':
            result = await testToString();
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

  const testConstructorAcceptsNameAndEndpoint = async () => {
    const friend = new Friend({ name: 'Alice', endpoint: 'http://alice.example.com' });
    if (friend.name !== 'Alice' || friend.endpoint !== 'http://alice.example.com') {
      return { success: false, error: 'Should accept name and endpoint' };
    }
    return { success: true, message: 'Accepts name and endpoint' };
  };

  const testConstructorInitializesDefaults = async () => {
    const friend = new Friend({});
    if (friend.metadata === undefined || !(friend.metadata instanceof Object)) {
      return { success: false, error: 'Should initialize metadata as empty object' };
    }
    if (friend.sessionKey !== null) {
      return { success: false, error: 'Should initialize sessionKey as null' };
    }
    return { success: true, message: 'Initializes with default values' };
  };

  const testConstructorSetsConnectedFalse = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.connected !== false) {
      return { success: false, error: 'Should set connected to false' };
    }
    return { success: true, message: 'Sets connected to false' };
  };

  const testConstructorSetsLastSeenNull = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.lastSeen !== null) {
      return { success: false, error: 'Should set lastSeen to null' };
    }
    return { success: true, message: 'Sets lastSeen to null' };
  };

  const testGetKind = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.kind !== PRINCIPAL_KINDS.FRIEND) {
      return { success: false, error: 'Should return PRINCIPAL_KINDS.FRIEND' };
    }
    return { success: true, message: 'Returns PRINCIPAL_KINDS.FRIEND' };
  };

  const testGetIsFriend = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.isFriend !== true) {
      return { success: false, error: 'Should return true' };
    }
    return { success: true, message: 'Returns true' };
  };

  const testGetName = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.name !== 'Alice') {
      return { success: false, error: 'Should return name' };
    }
    return { success: true, message: 'Returns name' };
  };

  const testGetEndpoint = async () => {
    const friend = new Friend({ name: 'Alice', endpoint: 'http://alice.example.com' });
    if (friend.endpoint !== 'http://alice.example.com') {
      return { success: false, error: 'Should return endpoint' };
    }
    return { success: true, message: 'Returns endpoint' };
  };

  const testGetMetadata = async () => {
    const metadata = { key: 'value' };
    const friend = new Friend({ name: 'Alice', metadata });
    if (friend.metadata !== metadata) {
      return { success: false, error: 'Should return metadata' };
    }
    return { success: true, message: 'Returns metadata' };
  };

  const testGetSessionKey = async () => {
    const sessionKey = Symbol('session-key');
    const friend = new Friend({ name: 'Alice', sessionKey });
    if (friend.sessionKey !== sessionKey) {
      return { success: false, error: 'Should return sessionKey' };
    }
    return { success: true, message: 'Returns sessionKey' };
  };

  const testGetConnected = async () => {
    const friend = new Friend({ name: 'Alice' });
    if (friend.connected !== false) {
      return { success: false, error: 'Should return connection status' };
    }
    friend.connect();
    if (friend.connected !== true) {
      return { success: false, error: 'Should return updated connection status' };
    }
    return { success: true, message: 'Returns connection status' };
  };

  const testConnectSetsConnectedTrue = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    if (friend.connected !== true) {
      return { success: false, error: 'Should set connected to true' };
    }
    return { success: true, message: 'Sets connected to true' };
  };

  const testConnectUpdatesLastSeen = async () => {
    const friend = new Friend({ name: 'Alice' });
    const before = Date.now();
    friend.connect();
    const after = Date.now();
    if (!friend.lastSeen || !(friend.lastSeen instanceof Date)) {
      return { success: false, error: 'Should update lastSeen timestamp' };
    }
    const lastSeenTime = friend.lastSeen.getTime();
    if (lastSeenTime < before || lastSeenTime > after) {
      return { success: false, error: 'Should set lastSeen to current time' };
    }
    return { success: true, message: 'Updates lastSeen timestamp' };
  };

  const testDisconnectSetsConnectedFalse = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    friend.disconnect();
    if (friend.connected !== false) {
      return { success: false, error: 'Should set connected to false' };
    }
    return { success: true, message: 'Sets connected to false' };
  };

  const testDisconnectDoesNotClearLastSeen = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    const lastSeen = friend.lastSeen;
    friend.disconnect();
    if (friend.lastSeen !== lastSeen) {
      return { success: false, error: 'Should not clear lastSeen' };
    }
    return { success: true, message: 'Does not clear lastSeen' };
  };

  const testConnectCanBeCalledMultipleTimes = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    const firstLastSeen = friend.lastSeen;
    await new Promise(resolve => setTimeout(resolve, 10));
    friend.connect();
    if (friend.lastSeen <= firstLastSeen) {
      return { success: false, error: 'Should update lastSeen on subsequent calls' };
    }
    return { success: true, message: 'Can be called multiple times' };
  };

  const testSendProtectedThrowsErrorIfNotConnected = async () => {
    const friend = new Friend({ name: 'Alice' });
    const mockMs = { sendProtected: () => {} };
    try {
      await friend.sendProtected({}, mockMs);
      return { success: false, error: 'Should throw error if not connected' };
    } catch (error) {
      if (error.message.includes('not connected')) {
        return { success: true, message: 'Throws error if not connected' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testSendProtectedThrowsErrorForMissingMs = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    try {
      await friend.sendProtected({}, null);
      return { success: false, error: 'Should throw error for missing MessageSystem' };
    } catch (error) {
      if (error.message.includes('requires a MessageSystem instance')) {
        return { success: true, message: 'Throws error for missing MessageSystem' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testSendProtectedCallsMsSendProtected = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    let called = false;
    const mockMs = {
      sendProtected: (target, msg) => {
        called = true;
        return Promise.resolve('sent');
      }
    };
    await friend.sendProtected({ test: 'message' }, mockMs);
    if (!called) {
      return { success: false, error: 'Should call MessageSystem.sendProtected' };
    }
    return { success: true, message: 'Calls MessageSystem.sendProtected' };
  };

  const testSendProtectedPassesFriendInstance = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    let receivedTarget = null;
    const mockMs = {
      sendProtected: (target, msg) => {
        receivedTarget = target;
        return Promise.resolve('sent');
      }
    };
    await friend.sendProtected({}, mockMs);
    if (receivedTarget !== friend) {
      return { success: false, error: 'Should pass friend instance' };
    }
    return { success: true, message: 'Passes friend instance' };
  };

  const testSendProtectedPassesMessage = async () => {
    const friend = new Friend({ name: 'Alice' });
    friend.connect();
    const testMessage = { test: 'message' };
    let receivedMessage = null;
    const mockMs = {
      sendProtected: (target, msg) => {
        receivedMessage = msg;
        return Promise.resolve('sent');
      }
    };
    await friend.sendProtected(testMessage, mockMs);
    if (receivedMessage !== testMessage) {
      return { success: false, error: 'Should pass message' };
    }
    return { success: true, message: 'Passes message' };
  };

  const testGetNameString = async () => {
    const friend1 = new Friend({ name: 'Alice' });
    const friend2 = new Friend({});
    const str1 = friend1.getNameString();
    const str2 = friend2.getNameString();
    if (str1 !== 'friend:Alice') {
      return { success: false, error: 'Should format string with name' };
    }
    if (str2 !== 'friend:(anonymous)') {
      return { success: false, error: 'Should format string with anonymous when no name' };
    }
    return { success: true, message: 'Returns formatted string' };
  };

  const testToRecord = async () => {
    const friend = new Friend({ name: 'Alice', endpoint: 'http://alice.example.com', metadata: { key: 'value' } });
    friend.connect();
    const record = friend.toRecord();
    if (record.kind !== PRINCIPAL_KINDS.FRIEND || record.name !== 'Alice' || record.endpoint !== 'http://alice.example.com') {
      return { success: false, error: 'Should return correct structure' };
    }
    if (record.connected !== true || !record.lastSeen || record.metadata.key !== 'value') {
      return { success: false, error: 'Should include all fields' };
    }
    return { success: true, message: 'Returns correct structure' };
  };

  const testToString = async () => {
    const friend1 = new Friend({ name: 'Alice', endpoint: 'http://alice.example.com' });
    const friend2 = new Friend({});
    const str1 = friend1.toString();
    const str2 = friend2.toString();
    if (!str1.includes('Alice') || !str1.includes('http://alice.example.com')) {
      return { success: false, error: 'Should format string with name and endpoint' };
    }
    if (!str2.includes('(anonymous)') || !str2.includes('unknown')) {
      return { success: false, error: 'Should format string with anonymous when no name/endpoint' };
    }
    return { success: true, message: 'Returns formatted string' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Friend Tests</h2>
      
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


