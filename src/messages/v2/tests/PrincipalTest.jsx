import { useState } from 'react';
import { Principal } from '../models/security/principal.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';
import { PKR } from '../models/security/public-key-record.mycelia.js';

/**
 * PrincipalTest
 * Tests for Principal class
 */
export function PrincipalTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Constructor - throws error for missing kind', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-string kind', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-symbol publicKey', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-symbol kernelId (when provided)', category: 'Constructor Validation' },
    { name: 'Constructor - accepts valid parameters', category: 'Constructor Validation' },
    { name: 'Constructor - generates UUID automatically', category: 'Constructor Validation' },
    { name: 'Constructor - sets createdAt timestamp', category: 'Constructor Validation' },
    { name: 'get uuid - returns generated UUID', category: 'Getters' },
    { name: 'get name - returns name or null', category: 'Getters' },
    { name: 'get kind - returns correct kind', category: 'Getters' },
    { name: 'get publicKey - returns correct publicKey', category: 'Getters' },
    { name: 'get metadata - returns metadata object', category: 'Getters' },
    { name: 'get createdAt - returns Date object', category: 'Getters' },
    { name: 'get instance - returns null initially', category: 'Getters' },
    { name: 'attachInstance - throws error if instance already attached', category: 'Instance Binding' },
    { name: 'attachInstance - throws error for non-object', category: 'Instance Binding' },
    { name: 'attachInstance - accepts kernel instance', category: 'Instance Binding' },
    { name: 'attachInstance - accepts topLevel/child instance', category: 'Instance Binding' },
    { name: 'attachInstance - accepts friend instance', category: 'Instance Binding' },
    { name: 'attachInstance - accepts resource instance', category: 'Instance Binding' },
    { name: 'attachInstance - can attach in constructor', category: 'Instance Binding' },
    { name: 'get pkr - creates PKR lazily', category: 'PKR Generation' },
    { name: 'get pkr - returns same PKR on subsequent calls', category: 'PKR Generation' },
    { name: 'get pkr - includes correct UUID', category: 'PKR Generation' },
    { name: 'get pkr - includes correct name', category: 'PKR Generation' },
    { name: 'get pkr - includes kernelId as minter', category: 'PKR Generation' },
    { name: 'refresh - throws error for non-symbol newPublicKey', category: 'PKR Refresh' },
    { name: 'refresh - updates publicKey', category: 'PKR Refresh' },
    { name: 'refresh - creates new PKR', category: 'PKR Refresh' },
    { name: 'refresh - preserves UUID and name', category: 'PKR Refresh' },
    { name: 'refresh - invalidates old PKR cache', category: 'PKR Refresh' },
    { name: 'rename - updates name', category: 'Name Management' },
    { name: 'rename - accepts null to clear name', category: 'Name Management' },
    { name: 'toRecord - returns correct structure', category: 'Serialization' },
    { name: 'equals - returns true for same principal', category: 'Serialization' },
    { name: 'toString - returns formatted string', category: 'Serialization' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - throws error for missing kind':
            result = await testConstructorThrowsErrorForMissingKind();
            break;
          case 'Constructor - throws error for non-string kind':
            result = await testConstructorThrowsErrorForNonStringKind();
            break;
          case 'Constructor - throws error for non-symbol publicKey':
            result = await testConstructorThrowsErrorForNonSymbolPublicKey();
            break;
          case 'Constructor - throws error for non-symbol kernelId (when provided)':
            result = await testConstructorThrowsErrorForNonSymbolKernelId();
            break;
          case 'Constructor - accepts valid parameters':
            result = await testConstructorAcceptsValid();
            break;
          case 'Constructor - generates UUID automatically':
            result = await testConstructorGeneratesUuid();
            break;
          case 'Constructor - sets createdAt timestamp':
            result = await testConstructorSetsCreatedAt();
            break;
          case 'get uuid - returns generated UUID':
            result = await testGetUuid();
            break;
          case 'get name - returns name or null':
            result = await testGetName();
            break;
          case 'get kind - returns correct kind':
            result = await testGetKind();
            break;
          case 'get publicKey - returns correct publicKey':
            result = await testGetPublicKey();
            break;
          case 'get metadata - returns metadata object':
            result = await testGetMetadata();
            break;
          case 'get createdAt - returns Date object':
            result = await testGetCreatedAt();
            break;
          case 'get instance - returns null initially':
            result = await testGetInstance();
            break;
          case 'attachInstance - throws error if instance already attached':
            result = await testAttachInstanceThrowsErrorIfAlreadyAttached();
            break;
          case 'attachInstance - throws error for non-object':
            result = await testAttachInstanceThrowsErrorForNonObject();
            break;
          case 'attachInstance - accepts kernel instance':
            result = await testAttachInstanceAcceptsKernel();
            break;
          case 'attachInstance - accepts topLevel/child instance':
            result = await testAttachInstanceAcceptsTopLevelChild();
            break;
          case 'attachInstance - accepts friend instance':
            result = await testAttachInstanceAcceptsFriend();
            break;
          case 'attachInstance - accepts resource instance':
            result = await testAttachInstanceAcceptsResource();
            break;
          case 'attachInstance - can attach in constructor':
            result = await testAttachInstanceInConstructor();
            break;
          case 'get pkr - creates PKR lazily':
            result = await testGetPkrCreatesLazily();
            break;
          case 'get pkr - returns same PKR on subsequent calls':
            result = await testGetPkrReturnsSame();
            break;
          case 'get pkr - includes correct UUID':
            result = await testGetPkrIncludesUuid();
            break;
          case 'get pkr - includes correct name':
            result = await testGetPkrIncludesName();
            break;
          case 'get pkr - includes kernelId as minter':
            result = await testGetPkrIncludesKernelId();
            break;
          case 'refresh - throws error for non-symbol newPublicKey':
            result = await testRefreshThrowsErrorForNonSymbol();
            break;
          case 'refresh - updates publicKey':
            result = await testRefreshUpdatesPublicKey();
            break;
          case 'refresh - creates new PKR':
            result = await testRefreshCreatesNewPkr();
            break;
          case 'refresh - preserves UUID and name':
            result = await testRefreshPreservesUuidAndName();
            break;
          case 'refresh - invalidates old PKR cache':
            result = await testRefreshInvalidatesOldPkr();
            break;
          case 'rename - updates name':
            result = await testRenameUpdatesName();
            break;
          case 'rename - accepts null to clear name':
            result = await testRenameAcceptsNull();
            break;
          case 'toRecord - returns correct structure':
            result = await testToRecord();
            break;
          case 'equals - returns true for same principal':
            result = await testEqualsReturnsTrue();
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

  const testConstructorThrowsErrorForMissingKind = async () => {
    try {
      new Principal({ publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for missing kind' };
    } catch (error) {
      if (error.message.includes('kind must be a string')) {
        return { success: true, message: 'Throws error for missing kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonStringKind = async () => {
    try {
      new Principal({ kind: 123, publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for non-string kind' };
    } catch (error) {
      if (error.message.includes('kind must be a string')) {
        return { success: true, message: 'Throws error for non-string kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonSymbolPublicKey = async () => {
    try {
      new Principal({ kind: 'test', publicKey: 'not-a-symbol' });
      return { success: false, error: 'Should throw error for non-symbol publicKey' };
    } catch (error) {
      if (error.message.includes('publicKey must be a Symbol')) {
        return { success: true, message: 'Throws error for non-symbol publicKey' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonSymbolKernelId = async () => {
    try {
      new Principal({ kind: 'test', publicKey: Symbol('key'), kernelId: 'not-a-symbol' });
      return { success: false, error: 'Should throw error for non-symbol kernelId' };
    } catch (error) {
      if (error.message.includes('kernelId must be a Symbol')) {
        return { success: true, message: 'Throws error for non-symbol kernelId' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorAcceptsValid = async () => {
    try {
      const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
      if (!principal) {
        return { success: false, error: 'Principal should be created' };
      }
      return { success: true, message: 'Accepts valid parameters' };
    } catch (error) {
      return { success: false, error: `Should accept valid input: ${error.message}` };
    }
  };

  const testConstructorGeneratesUuid = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    if (!principal.uuid || typeof principal.uuid !== 'string') {
      return { success: false, error: 'Should generate UUID automatically' };
    }
    return { success: true, message: 'Generates UUID automatically' };
  };

  const testConstructorSetsCreatedAt = async () => {
    const before = Date.now();
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    const after = Date.now();
    if (!principal.createdAt || !(principal.createdAt instanceof Date)) {
      return { success: false, error: 'Should set createdAt timestamp' };
    }
    const createdAtTime = principal.createdAt.getTime();
    if (createdAtTime < before || createdAtTime > after) {
      return { success: false, error: 'Should set createdAt to current time' };
    }
    return { success: true, message: 'Sets createdAt timestamp' };
  };

  const testGetUuid = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    if (!principal.uuid || typeof principal.uuid !== 'string') {
      return { success: false, error: 'Should return generated UUID' };
    }
    return { success: true, message: 'Returns generated UUID' };
  };

  const testGetName = async () => {
    const principal1 = new Principal({ kind: 'test', publicKey: Symbol('key1'), name: 'test-name' });
    const principal2 = new Principal({ kind: 'test', publicKey: Symbol('key2') });
    if (principal1.name !== 'test-name') {
      return { success: false, error: 'Should return name when provided' };
    }
    if (principal2.name !== null) {
      return { success: false, error: 'Should return null when name not provided' };
    }
    return { success: true, message: 'Returns name or null' };
  };

  const testGetKind = async () => {
    const principal = new Principal({ kind: 'test-kind', publicKey: Symbol('key') });
    if (principal.kind !== 'test-kind') {
      return { success: false, error: 'Should return correct kind' };
    }
    return { success: true, message: 'Returns correct kind' };
  };

  const testGetPublicKey = async () => {
    const publicKey = Symbol('publicKey');
    const principal = new Principal({ kind: 'test', publicKey });
    if (principal.publicKey !== publicKey) {
      return { success: false, error: 'Should return correct publicKey' };
    }
    return { success: true, message: 'Returns correct publicKey' };
  };

  const testGetMetadata = async () => {
    const metadata = { key: 'value' };
    const principal1 = new Principal({ kind: 'test', publicKey: Symbol('key1'), metadata });
    const principal2 = new Principal({ kind: 'test', publicKey: Symbol('key2') });
    if (principal1.metadata !== metadata) {
      return { success: false, error: 'Should return metadata when provided' };
    }
    if (!principal2.metadata || typeof principal2.metadata !== 'object') {
      return { success: false, error: 'Should return empty object when metadata not provided' };
    }
    return { success: true, message: 'Returns metadata object' };
  };

  const testGetCreatedAt = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    if (!principal.createdAt || !(principal.createdAt instanceof Date)) {
      return { success: false, error: 'Should return Date object' };
    }
    return { success: true, message: 'Returns Date object' };
  };

  const testGetInstance = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    if (principal.instance !== null) {
      return { success: false, error: 'Should return null initially' };
    }
    return { success: true, message: 'Returns null initially' };
  };

  const testAttachInstanceThrowsErrorIfAlreadyAttached = async () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.KERNEL, publicKey: Symbol('key') });
    principal.attachInstance({});
    try {
      principal.attachInstance({});
      return { success: false, error: 'Should throw error if instance already attached' };
    } catch (error) {
      if (error.message.includes('instance already attached')) {
        return { success: true, message: 'Throws error if instance already attached' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAttachInstanceThrowsErrorForNonObject = async () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.KERNEL, publicKey: Symbol('key') });
    try {
      principal.attachInstance(null);
      return { success: false, error: 'Should throw error for non-object' };
    } catch (error) {
      if (error.message.includes('requires an object')) {
        return { success: true, message: 'Throws error for non-object' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAttachInstanceAcceptsKernel = async () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.KERNEL, publicKey: Symbol('key') });
    const instance = {};
    principal.attachInstance(instance);
    if (principal.instance !== instance) {
      return { success: false, error: 'Should accept kernel instance' };
    }
    return { success: true, message: 'Accepts kernel instance' };
  };

  const testAttachInstanceAcceptsTopLevelChild = async () => {
    const principal1 = new Principal({ kind: PRINCIPAL_KINDS.TOP_LEVEL, publicKey: Symbol('key1') });
    const principal2 = new Principal({ kind: PRINCIPAL_KINDS.CHILD, publicKey: Symbol('key2') });
    const instance1 = {};
    const instance2 = {};
    principal1.attachInstance(instance1);
    principal2.attachInstance(instance2);
    if (principal1.instance !== instance1 || principal2.instance !== instance2) {
      return { success: false, error: 'Should accept topLevel/child instance' };
    }
    return { success: true, message: 'Accepts topLevel/child instance' };
  };

  const testAttachInstanceAcceptsFriend = async () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.FRIEND, publicKey: Symbol('key') });
    const instance = {};
    principal.attachInstance(instance);
    if (principal.instance !== instance) {
      return { success: false, error: 'Should accept friend instance' };
    }
    return { success: true, message: 'Accepts friend instance' };
  };

  const testAttachInstanceAcceptsResource = async () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.RESOURCE, publicKey: Symbol('key') });
    const instance = {};
    principal.attachInstance(instance);
    if (principal.instance !== instance) {
      return { success: false, error: 'Should accept resource instance' };
    }
    return { success: true, message: 'Accepts resource instance' };
  };

  const testAttachInstanceInConstructor = async () => {
    const instance = {};
    const principal = new Principal({ kind: PRINCIPAL_KINDS.KERNEL, publicKey: Symbol('key'), instance });
    if (principal.instance !== instance) {
      return { success: false, error: 'Should attach instance in constructor' };
    }
    return { success: true, message: 'Can attach in constructor' };
  };

  const testGetPkrCreatesLazily = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    // Access pkr property - should create it
    const pkr = principal.pkr;
    if (!pkr || !(pkr instanceof PKR)) {
      return { success: false, error: 'Should create PKR lazily' };
    }
    return { success: true, message: 'Creates PKR lazily' };
  };

  const testGetPkrReturnsSame = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    const pkr1 = principal.pkr;
    const pkr2 = principal.pkr;
    if (pkr1 !== pkr2) {
      return { success: false, error: 'Should return same PKR on subsequent calls' };
    }
    return { success: true, message: 'Returns same PKR on subsequent calls' };
  };

  const testGetPkrIncludesUuid = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    const pkr = principal.pkr;
    if (pkr.uuid !== principal.uuid) {
      return { success: false, error: 'Should include correct UUID' };
    }
    return { success: true, message: 'Includes correct UUID' };
  };

  const testGetPkrIncludesName = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key'), name: 'test-name' });
    const pkr = principal.pkr;
    if (pkr.name !== 'test-name') {
      return { success: false, error: 'Should include correct name' };
    }
    return { success: true, message: 'Includes correct name' };
  };

  const testGetPkrIncludesKernelId = async () => {
    const kernelId = Symbol('kernelId');
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key'), kernelId });
    const pkr = principal.pkr;
    if (!pkr.isMinter(kernelId)) {
      return { success: false, error: 'Should include kernelId as minter' };
    }
    return { success: true, message: 'Includes kernelId as minter' };
  };

  const testRefreshThrowsErrorForNonSymbol = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key') });
    try {
      principal.refresh('not-a-symbol');
      return { success: false, error: 'Should throw error for non-symbol newPublicKey' };
    } catch (error) {
      if (error.message.includes('newPublicKey must be a Symbol')) {
        return { success: true, message: 'Throws error for non-symbol newPublicKey' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRefreshUpdatesPublicKey = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key1') });
    const oldPublicKey = principal.publicKey;
    const newPublicKey = Symbol('key2');
    principal.refresh(newPublicKey);
    if (principal.publicKey !== newPublicKey) {
      return { success: false, error: 'Should update publicKey' };
    }
    return { success: true, message: 'Updates publicKey' };
  };

  const testRefreshCreatesNewPkr = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key1') });
    const oldPkr = principal.pkr;
    const newPublicKey = Symbol('key2');
    const newPkr = principal.refresh(newPublicKey);
    if (newPkr === oldPkr) {
      return { success: false, error: 'Should create new PKR' };
    }
    if (newPkr.publicKey !== newPublicKey) {
      return { success: false, error: 'New PKR should have new publicKey' };
    }
    return { success: true, message: 'Creates new PKR' };
  };

  const testRefreshPreservesUuidAndName = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key1'), name: 'test-name' });
    const uuid = principal.uuid;
    const newPublicKey = Symbol('key2');
    const newPkr = principal.refresh(newPublicKey);
    if (newPkr.uuid !== uuid || newPkr.name !== 'test-name') {
      return { success: false, error: 'Should preserve UUID and name' };
    }
    return { success: true, message: 'Preserves UUID and name' };
  };

  const testRefreshInvalidatesOldPkr = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key1') });
    const oldPkr = principal.pkr;
    const newPublicKey = Symbol('key2');
    principal.refresh(newPublicKey);
    const newPkr = principal.pkr;
    if (newPkr === oldPkr) {
      return { success: false, error: 'Should invalidate old PKR cache' };
    }
    return { success: true, message: 'Invalidates old PKR cache' };
  };

  const testRenameUpdatesName = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key'), name: 'old-name' });
    principal.rename('new-name');
    if (principal.name !== 'new-name') {
      return { success: false, error: 'Should update name' };
    }
    return { success: true, message: 'Updates name' };
  };

  const testRenameAcceptsNull = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key'), name: 'test-name' });
    principal.rename(null);
    if (principal.name !== null) {
      return { success: false, error: 'Should accept null to clear name' };
    }
    return { success: true, message: 'Accepts null to clear name' };
  };

  const testToRecord = async () => {
    const principal = new Principal({ kind: 'test', publicKey: Symbol('key'), name: 'test-name' });
    const record = principal.toRecord();
    if (record.uuid !== principal.uuid || record.kind !== 'test' || record.name !== 'test-name') {
      return { success: false, error: 'Should return correct structure' };
    }
    if (!record.createdAt || typeof record.publicKey !== 'string') {
      return { success: false, error: 'Should include all fields' };
    }
    return { success: true, message: 'Returns correct structure' };
  };

  const testEqualsReturnsTrue = async () => {
    const publicKey = Symbol('key');
    const principal1 = new Principal({ kind: 'test', publicKey });
    const principal2 = new Principal({ kind: 'test', publicKey: Symbol('key2') });
    // They have different UUIDs, so should not be equal
    if (principal1.equals(principal2)) {
      return { success: false, error: 'Should return false for different principals' };
    }
    // Same principal should equal itself
    if (!principal1.equals(principal1)) {
      return { success: false, error: 'Should return true for same principal' };
    }
    return { success: true, message: 'Returns true for same principal' };
  };

  const testToString = async () => {
    const principal1 = new Principal({ kind: 'test', publicKey: Symbol('key1'), name: 'test-name' });
    const principal2 = new Principal({ kind: 'test', publicKey: Symbol('key2') });
    const str1 = principal1.toString();
    const str2 = principal2.toString();
    if (!str1.includes('test-name') || !str1.includes('test')) {
      return { success: false, error: 'Should format string with name' };
    }
    if (!str2.includes(principal2.uuid) || !str2.includes('test')) {
      return { success: false, error: 'Should format string with uuid when no name' };
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
      <h2>Principal Tests</h2>
      
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


