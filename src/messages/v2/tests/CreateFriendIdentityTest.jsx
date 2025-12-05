import { useState } from 'react';
import { createFriendIdentity } from '../models/security/create-friend-identity.mycelia.js';
import { PrincipalRegistry } from '../models/security/principal-registry.mycelia.js';
import { PKR } from '../models/security/public-key-record.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * CreateFriendIdentityTest
 * Tests for createFriendIdentity function
 */
export function CreateFriendIdentityTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'createFriendIdentity - throws error for invalid PKR', category: 'Validation' },
    { name: 'createFriendIdentity - throws error for unknown PKR', category: 'Validation' },
    { name: 'createFriendIdentity - throws error for missing kernel', category: 'Validation' },
    { name: 'createFriendIdentity - throws error for kernel without sendProtected', category: 'Validation' },
    { name: 'createFriendIdentity - throws error for non-friend principal', category: 'Principal Kind Check' },
    { name: 'createFriendIdentity - throws error for kernel principal', category: 'Principal Kind Check' },
    { name: 'createFriendIdentity - throws error for topLevel principal', category: 'Principal Kind Check' },
    { name: 'createFriendIdentity - throws error for resource principal', category: 'Principal Kind Check' },
    { name: 'createFriendIdentity - accepts friend principal', category: 'Principal Kind Check' },
    { name: 'createFriendIdentity - calls createIdentity', category: 'Identity Creation' },
    { name: 'createFriendIdentity - returns identity wrapper', category: 'Identity Creation' },
    { name: 'createFriendIdentity - includes all identity methods', category: 'Identity Creation' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'createFriendIdentity - throws error for invalid PKR':
            result = await testThrowsErrorForInvalidPKR();
            break;
          case 'createFriendIdentity - throws error for unknown PKR':
            result = await testThrowsErrorForUnknownPKR();
            break;
          case 'createFriendIdentity - throws error for missing kernel':
            result = await testThrowsErrorForMissingKernel();
            break;
          case 'createFriendIdentity - throws error for kernel without sendProtected':
            result = await testThrowsErrorForKernelWithoutSendProtected();
            break;
          case 'createFriendIdentity - throws error for non-friend principal':
            result = await testThrowsErrorForNonFriendPrincipal();
            break;
          case 'createFriendIdentity - throws error for kernel principal':
            result = await testThrowsErrorForKernelPrincipal();
            break;
          case 'createFriendIdentity - throws error for topLevel principal':
            result = await testThrowsErrorForTopLevelPrincipal();
            break;
          case 'createFriendIdentity - throws error for resource principal':
            result = await testThrowsErrorForResourcePrincipal();
            break;
          case 'createFriendIdentity - accepts friend principal':
            result = await testAcceptsFriendPrincipal();
            break;
          case 'createFriendIdentity - calls createIdentity':
            result = await testCallsCreateIdentity();
            break;
          case 'createFriendIdentity - returns identity wrapper':
            result = await testReturnsIdentityWrapper();
            break;
          case 'createFriendIdentity - includes all identity methods':
            result = await testIncludesAllIdentityMethods();
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

  const createMockKernel = () => ({
    sendProtected: async (pkr, message, options) => Promise.resolve('sent')
  });

  const testThrowsErrorForInvalidPKR = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    try {
      createFriendIdentity(registry, null, createMockKernel());
      return { success: false, error: 'Should throw error for invalid PKR' };
    } catch (error) {
      if (error.message.includes('invalid or unknown PKR') || error.message.includes('uuid')) {
        return { success: true, message: 'Throws error for invalid PKR' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForUnknownPKR = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const unknownPKR = new PKR({
      uuid: 'unknown-uuid',
      kind: PRINCIPAL_KINDS.FRIEND,
      publicKey: Symbol('unknown-key')
    });
    try {
      createFriendIdentity(registry, unknownPKR, createMockKernel());
      return { success: false, error: 'Should throw error for unknown PKR' };
    } catch (error) {
      if (error.message.includes('invalid or unknown PKR') || error.message.includes('principal not found')) {
        return { success: true, message: 'Throws error for unknown PKR' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForMissingKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    try {
      createFriendIdentity(registry, friendPkr, null);
      return { success: false, error: 'Should throw error for missing kernel' };
    } catch (error) {
      if (error.message.includes('kernel reference not set')) {
        return { success: true, message: 'Throws error for missing kernel' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForKernelWithoutSendProtected = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    try {
      createFriendIdentity(registry, friendPkr, {});
      return { success: false, error: 'Should throw error for kernel without sendProtected' };
    } catch (error) {
      if (error.message.includes('sendProtected')) {
        return { success: true, message: 'Throws error for kernel without sendProtected' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForNonFriendPrincipal = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const topLevelPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      createFriendIdentity(registry, topLevelPkr, createMockKernel());
      return { success: false, error: 'Should throw error for non-friend principal' };
    } catch (error) {
      if (error.message.includes('expected a friend principal')) {
        return { success: true, message: 'Throws error for non-friend principal' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForKernelPrincipal = async () => {
    const kernel = createMockKernel();
    const registry = new PrincipalRegistry({ kernel });
    // Kernel principal is created automatically
    const kernelPrincipal = registry.get(Array.from(registry)[0].uuid);
    const kernelPkr = kernelPrincipal.pkr;
    try {
      createFriendIdentity(registry, kernelPkr, kernel);
      return { success: false, error: 'Should throw error for kernel principal' };
    } catch (error) {
      if (error.message.includes('expected a friend principal')) {
        return { success: true, message: 'Throws error for kernel principal' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForTopLevelPrincipal = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const topLevelPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      createFriendIdentity(registry, topLevelPkr, createMockKernel());
      return { success: false, error: 'Should throw error for topLevel principal' };
    } catch (error) {
      if (error.message.includes('expected a friend principal')) {
        return { success: true, message: 'Throws error for topLevel principal' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForResourcePrincipal = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const resourcePkr = registry.createPrincipal(PRINCIPAL_KINDS.RESOURCE);
    try {
      createFriendIdentity(registry, resourcePkr, createMockKernel());
      return { success: false, error: 'Should throw error for resource principal' };
    } catch (error) {
      if (error.message.includes('expected a friend principal')) {
        return { success: true, message: 'Throws error for resource principal' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAcceptsFriendPrincipal = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    try {
      const identity = createFriendIdentity(registry, friendPkr, createMockKernel());
      if (!identity) {
        return { success: false, error: 'Should return identity wrapper' };
      }
      return { success: true, message: 'Accepts friend principal' };
    } catch (error) {
      return { success: false, error: `Should accept friend principal: ${error.message}` };
    }
  };

  const testCallsCreateIdentity = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    const identity = createFriendIdentity(registry, friendPkr, createMockKernel());
    // If createIdentity was called, we should have an identity with all its methods
    if (!identity || typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should call createIdentity' };
    }
    return { success: true, message: 'Calls createIdentity' };
  };

  const testReturnsIdentityWrapper = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    const identity = createFriendIdentity(registry, friendPkr, createMockKernel());
    if (!identity || typeof identity !== 'object') {
      return { success: false, error: 'Should return identity wrapper' };
    }
    if (identity.pkr !== friendPkr) {
      return { success: false, error: 'Should include PKR in identity' };
    }
    return { success: true, message: 'Returns identity wrapper' };
  };

  const testIncludesAllIdentityMethods = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const friendPkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    const identity = createFriendIdentity(registry, friendPkr, createMockKernel());
    const requiredMethods = ['canRead', 'canWrite', 'canGrant', 'requireRead', 'requireWrite', 'requireGrant', 'requireAuth', 'grantReader', 'grantWriter', 'revokeReader', 'revokeWriter', 'promote', 'demote', 'sendProtected'];
    for (const method of requiredMethods) {
      if (typeof identity[method] !== 'function') {
        return { success: false, error: `Should include ${method} method` };
      }
    }
    return { success: true, message: 'Includes all identity methods' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>CreateFriendIdentity Tests</h2>
      
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


