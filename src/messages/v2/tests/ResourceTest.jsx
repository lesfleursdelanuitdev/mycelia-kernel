import { useState } from 'react';
import { Resource } from '../models/security/resource.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * ResourceTest
 * Tests for Resource class
 */
export function ResourceTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Constructor - accepts name and metadata', category: 'Constructor' },
    { name: 'Constructor - initializes with default values', category: 'Constructor' },
    { name: 'Constructor - sets createdAt timestamp', category: 'Constructor' },
    { name: 'Constructor - accepts optional owner', category: 'Constructor' },
    { name: 'get kind - returns PRINCIPAL_KINDS.RESOURCE', category: 'Getters' },
    { name: 'get isResource - returns true', category: 'Getters' },
    { name: 'get name - returns name', category: 'Getters' },
    { name: 'get metadata - returns metadata', category: 'Getters' },
    { name: 'get createdAt - returns Date object', category: 'Getters' },
    { name: 'get owner - returns owner or null', category: 'Getters' },
    { name: 'getNameString - returns simple format without owner', category: 'Name String' },
    { name: 'getNameString - includes owner prefix', category: 'Name String' },
    { name: 'getNameString - handles owner without getNameString', category: 'Name String' },
    { name: 'getNameString - handles trailing slashes', category: 'Name String' },
    { name: 'toRecord - returns correct structure', category: 'Serialization' },
    { name: 'toRecord - includes owner UUID', category: 'Serialization' },
    { name: 'toString - returns formatted string', category: 'Serialization' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - accepts name and metadata':
            result = await testConstructorAcceptsNameAndMetadata();
            break;
          case 'Constructor - initializes with default values':
            result = await testConstructorInitializesDefaults();
            break;
          case 'Constructor - sets createdAt timestamp':
            result = await testConstructorSetsCreatedAt();
            break;
          case 'Constructor - accepts optional owner':
            result = await testConstructorAcceptsOptionalOwner();
            break;
          case 'get kind - returns PRINCIPAL_KINDS.RESOURCE':
            result = await testGetKind();
            break;
          case 'get isResource - returns true':
            result = await testGetIsResource();
            break;
          case 'get name - returns name':
            result = await testGetName();
            break;
          case 'get metadata - returns metadata':
            result = await testGetMetadata();
            break;
          case 'get createdAt - returns Date object':
            result = await testGetCreatedAt();
            break;
          case 'get owner - returns owner or null':
            result = await testGetOwner();
            break;
          case 'getNameString - returns simple format without owner':
            result = await testGetNameStringWithoutOwner();
            break;
          case 'getNameString - includes owner prefix':
            result = await testGetNameStringWithOwner();
            break;
          case 'getNameString - handles owner without getNameString':
            result = await testGetNameStringHandlesOwnerWithoutMethod();
            break;
          case 'getNameString - handles trailing slashes':
            result = await testGetNameStringHandlesTrailingSlashes();
            break;
          case 'toRecord - returns correct structure':
            result = await testToRecord();
            break;
          case 'toRecord - includes owner UUID':
            result = await testToRecordIncludesOwnerUuid();
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

  const testConstructorAcceptsNameAndMetadata = async () => {
    const resource = new Resource({ name: 'test-resource', metadata: { key: 'value' } });
    if (resource.name !== 'test-resource' || resource.metadata.key !== 'value') {
      return { success: false, error: 'Should accept name and metadata' };
    }
    return { success: true, message: 'Accepts name and metadata' };
  };

  const testConstructorInitializesDefaults = async () => {
    const resource = new Resource({});
    if (resource.name !== null) {
      return { success: false, error: 'Should initialize name as null' };
    }
    if (!resource.metadata || typeof resource.metadata !== 'object') {
      return { success: false, error: 'Should initialize metadata as empty object' };
    }
    if (resource.owner !== null) {
      return { success: false, error: 'Should initialize owner as null' };
    }
    return { success: true, message: 'Initializes with default values' };
  };

  const testConstructorSetsCreatedAt = async () => {
    const before = Date.now();
    const resource = new Resource({ name: 'test' });
    const after = Date.now();
    if (!resource.createdAt || !(resource.createdAt instanceof Date)) {
      return { success: false, error: 'Should set createdAt timestamp' };
    }
    const createdAtTime = resource.createdAt.getTime();
    if (createdAtTime < before || createdAtTime > after) {
      return { success: false, error: 'Should set createdAt to current time' };
    }
    return { success: true, message: 'Sets createdAt timestamp' };
  };

  const testConstructorAcceptsOptionalOwner = async () => {
    const mockOwner = { uuid: 'owner-uuid', getNameString: () => 'owner://' };
    const resource = new Resource({ name: 'test', owner: mockOwner });
    if (resource.owner !== mockOwner) {
      return { success: false, error: 'Should accept optional owner' };
    }
    return { success: true, message: 'Accepts optional owner' };
  };

  const testGetKind = async () => {
    const resource = new Resource({ name: 'test' });
    if (resource.kind !== PRINCIPAL_KINDS.RESOURCE) {
      return { success: false, error: 'Should return PRINCIPAL_KINDS.RESOURCE' };
    }
    return { success: true, message: 'Returns PRINCIPAL_KINDS.RESOURCE' };
  };

  const testGetIsResource = async () => {
    const resource = new Resource({ name: 'test' });
    if (resource.isResource !== true) {
      return { success: false, error: 'Should return true' };
    }
    return { success: true, message: 'Returns true' };
  };

  const testGetName = async () => {
    const resource = new Resource({ name: 'test-resource' });
    if (resource.name !== 'test-resource') {
      return { success: false, error: 'Should return name' };
    }
    return { success: true, message: 'Returns name' };
  };

  const testGetMetadata = async () => {
    const metadata = { key: 'value' };
    const resource = new Resource({ name: 'test', metadata });
    if (resource.metadata !== metadata) {
      return { success: false, error: 'Should return metadata' };
    }
    return { success: true, message: 'Returns metadata' };
  };

  const testGetCreatedAt = async () => {
    const resource = new Resource({ name: 'test' });
    if (!resource.createdAt || !(resource.createdAt instanceof Date)) {
      return { success: false, error: 'Should return Date object' };
    }
    return { success: true, message: 'Returns Date object' };
  };

  const testGetOwner = async () => {
    const mockOwner = { uuid: 'owner-uuid' };
    const resource1 = new Resource({ name: 'test', owner: mockOwner });
    const resource2 = new Resource({ name: 'test2' });
    if (resource1.owner !== mockOwner) {
      return { success: false, error: 'Should return owner when set' };
    }
    if (resource2.owner !== null) {
      return { success: false, error: 'Should return null when owner not set' };
    }
    return { success: true, message: 'Returns owner or null' };
  };

  const testGetNameStringWithoutOwner = async () => {
    const resource = new Resource({ name: 'test-resource' });
    const nameStr = resource.getNameString();
    if (nameStr !== 'res.test-resource') {
      return { success: false, error: 'Should return simple format without owner' };
    }
    return { success: true, message: 'Returns simple format without owner' };
  };

  const testGetNameStringWithOwner = async () => {
    const mockOwner = { uuid: 'owner-uuid', getNameString: () => 'owner://' };
    const resource = new Resource({ name: 'test-resource', owner: mockOwner });
    const nameStr = resource.getNameString();
    if (nameStr !== 'owner://res.test-resource') {
      return { success: false, error: 'Should include owner prefix' };
    }
    return { success: true, message: 'Includes owner prefix' };
  };

  const testGetNameStringHandlesOwnerWithoutMethod = async () => {
    const mockOwner = { uuid: 'owner-uuid' }; // No getNameString method
    const resource = new Resource({ name: 'test-resource', owner: mockOwner });
    const nameStr = resource.getNameString();
    if (nameStr !== 'res.test-resource') {
      return { success: false, error: 'Should handle owner without getNameString' };
    }
    return { success: true, message: 'Handles owner without getNameString' };
  };

  const testGetNameStringHandlesTrailingSlashes = async () => {
    const mockOwner = { uuid: 'owner-uuid', getNameString: () => 'owner://' };
    const resource = new Resource({ name: 'test-resource', owner: mockOwner });
    const nameStr = resource.getNameString();
    // Should not have double slashes (except :// protocol separator)
    const withoutProtocol = nameStr.replace(/:\/\//g, '');
    if (withoutProtocol.includes('//')) {
      return { success: false, error: 'Should handle trailing slashes correctly' };
    }
    return { success: true, message: 'Handles trailing slashes' };
  };

  const testToRecord = async () => {
    const resource = new Resource({ name: 'test-resource', metadata: { key: 'value' } });
    const record = resource.toRecord();
    if (record.kind !== PRINCIPAL_KINDS.RESOURCE || record.name !== 'test-resource') {
      return { success: false, error: 'Should return correct structure' };
    }
    if (record.metadata.key !== 'value' || !record.createdAt) {
      return { success: false, error: 'Should include all fields' };
    }
    return { success: true, message: 'Returns correct structure' };
  };

  const testToRecordIncludesOwnerUuid = async () => {
    const mockOwner = { uuid: 'owner-uuid' };
    const resource1 = new Resource({ name: 'test', owner: mockOwner });
    const resource2 = new Resource({ name: 'test2' });
    const record1 = resource1.toRecord();
    const record2 = resource2.toRecord();
    if (record1.owner !== 'owner-uuid') {
      return { success: false, error: 'Should include owner UUID when owner set' };
    }
    if (record2.owner !== null) {
      return { success: false, error: 'Should include null when owner not set' };
    }
    return { success: true, message: 'Includes owner UUID' };
  };

  const testToString = async () => {
    const resource1 = new Resource({ name: 'test-resource' });
    const resource2 = new Resource({});
    const str1 = resource1.toString();
    const str2 = resource2.toString();
    if (!str1.includes('test-resource')) {
      return { success: false, error: 'Should format string with name' };
    }
    if (!str2.includes('(unnamed)')) {
      return { success: false, error: 'Should format string with unnamed when no name' };
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
      <h2>Resource Tests</h2>
      
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


