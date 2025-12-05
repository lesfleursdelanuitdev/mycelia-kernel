import { useState } from 'react';
import { usePrincipals } from '../hooks/principals/use-principals.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * UsePrincipalsTest
 * Tests for usePrincipals hook
 */
export function UsePrincipalsTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Hook Configuration - has correct kind', category: 'Hook Configuration' },
    { name: 'Hook Configuration - has correct overwrite setting', category: 'Hook Configuration' },
    { name: 'Hook Configuration - has correct required dependencies', category: 'Hook Configuration' },
    { name: 'Hook Configuration - has correct attach setting', category: 'Hook Configuration' },
    { name: 'Validation - throws error for missing kernel', category: 'Validation' },
    { name: 'Validation - throws error for undefined kernel', category: 'Validation' },
    { name: 'Validation - accepts valid kernel in config', category: 'Validation' },
    { name: 'Registry Creation - creates PrincipalRegistry instance', category: 'Registry Creation' },
    { name: 'Registry Creation - passes kernel to registry', category: 'Registry Creation' },
    { name: 'Registry Creation - exposes registry property', category: 'Registry Creation' },
    { name: 'Exposed Methods - mint delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - createPrincipal delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - resolvePKR delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - createRWS delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - createIdentity delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - createFriendIdentity delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - isKernel delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - get delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - has delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - refreshPrincipal delegates to registry', category: 'Exposed Methods' },
    { name: 'Exposed Methods - all methods are callable from facet', category: 'Exposed Methods' },
    { name: 'Integration - works with BaseSubsystem', category: 'Integration' },
    { name: 'Integration - facet is accessible via find', category: 'Integration' },
    { name: 'Integration - can create principals via facet', category: 'Integration' },
    { name: 'Integration - can resolve PKRs via facet', category: 'Integration' },
    { name: 'Integration - can create identities via facet', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Hook Configuration - has correct kind':
            result = await testHookHasCorrectKind();
            break;
          case 'Hook Configuration - has correct overwrite setting':
            result = await testHookHasCorrectOverwrite();
            break;
          case 'Hook Configuration - has correct required dependencies':
            result = await testHookHasCorrectRequired();
            break;
          case 'Hook Configuration - has correct attach setting':
            result = await testHookHasCorrectAttach();
            break;
          case 'Validation - throws error for missing kernel':
            result = await testThrowsErrorForMissingKernel();
            break;
          case 'Validation - throws error for undefined kernel':
            result = await testThrowsErrorForUndefinedKernel();
            break;
          case 'Validation - accepts valid kernel in config':
            result = await testAcceptsValidKernel();
            break;
          case 'Registry Creation - creates PrincipalRegistry instance':
            result = await testCreatesRegistry();
            break;
          case 'Registry Creation - passes kernel to registry':
            result = await testPassesKernelToRegistry();
            break;
          case 'Registry Creation - exposes registry property':
            result = await testExposesRegistryProperty();
            break;
          case 'Exposed Methods - mint delegates to registry':
            result = await testMintDelegates();
            break;
          case 'Exposed Methods - createPrincipal delegates to registry':
            result = await testCreatePrincipalDelegates();
            break;
          case 'Exposed Methods - resolvePKR delegates to registry':
            result = await testResolvePKRDelegates();
            break;
          case 'Exposed Methods - createRWS delegates to registry':
            result = await testCreateRWSDelegates();
            break;
          case 'Exposed Methods - createIdentity delegates to registry':
            result = await testCreateIdentityDelegates();
            break;
          case 'Exposed Methods - createFriendIdentity delegates to registry':
            result = await testCreateFriendIdentityDelegates();
            break;
          case 'Exposed Methods - isKernel delegates to registry':
            result = await testIsKernelDelegates();
            break;
          case 'Exposed Methods - get delegates to registry':
            result = await testGetDelegates();
            break;
          case 'Exposed Methods - has delegates to registry':
            result = await testHasDelegates();
            break;
          case 'Exposed Methods - refreshPrincipal delegates to registry':
            result = await testRefreshPrincipalDelegates();
            break;
          case 'Exposed Methods - all methods are callable from facet':
            result = await testAllMethodsCallable();
            break;
          case 'Integration - works with BaseSubsystem':
            result = await testWorksWithBaseSubsystem();
            break;
          case 'Integration - facet is accessible via find':
            result = await testFacetAccessibleViaFind();
            break;
          case 'Integration - can create principals via facet':
            result = await testCanCreatePrincipals();
            break;
          case 'Integration - can resolve PKRs via facet':
            result = await testCanResolvePKRs();
            break;
          case 'Integration - can create identities via facet':
            result = await testCanCreateIdentities();
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

  const testHookHasCorrectKind = async () => {
    if (usePrincipals.kind !== 'principals') {
      return { success: false, error: 'Should have correct kind' };
    }
    return { success: true, message: 'Has correct kind' };
  };

  const testHookHasCorrectOverwrite = async () => {
    if (usePrincipals.overwrite !== false) {
      return { success: false, error: 'Should have correct overwrite setting' };
    }
    return { success: true, message: 'Has correct overwrite setting' };
  };

  const testHookHasCorrectRequired = async () => {
    if (!Array.isArray(usePrincipals.required) || usePrincipals.required.length !== 0) {
      return { success: false, error: 'Should have correct required dependencies' };
    }
    return { success: true, message: 'Has correct required dependencies' };
  };

  const testHookHasCorrectAttach = async () => {
    if (usePrincipals.attach !== false) {
      return { success: false, error: 'Should have correct attach setting' };
    }
    return { success: true, message: 'Has correct attach setting' };
  };

  const testThrowsErrorForMissingKernel = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      await subsystem.use(usePrincipals).build({ config: { principals: {} } });
      return { success: false, error: 'Should throw error for missing kernel' };
    } catch (error) {
      if (error.message.includes('kernel is required')) {
        return { success: true, message: 'Throws error for missing kernel' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForUndefinedKernel = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      await subsystem.use(usePrincipals).build({ config: { principals: { kernel: undefined } } });
      return { success: false, error: 'Should throw error for undefined kernel' };
    } catch (error) {
      if (error.message.includes('kernel is required')) {
        return { success: true, message: 'Throws error for undefined kernel' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testAcceptsValidKernel = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
      const facet = subsystem.find('principals');
      if (!facet) {
        return { success: false, error: 'Should create facet with valid kernel' };
      }
      return { success: true, message: 'Accepts valid kernel in config' };
    } catch (error) {
      return { success: false, error: `Should accept valid kernel: ${error.message}` };
    }
  };

  const testCreatesRegistry = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    if (!facet || !facet.registry) {
      return { success: false, error: 'Should create PrincipalRegistry instance' };
    }
    return { success: true, message: 'Creates PrincipalRegistry instance' };
  };

  const testPassesKernelToRegistry = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    // Registry should have kernel principal created
    if (facet.registry.size === 0) {
      return { success: false, error: 'Should pass kernel to registry' };
    }
    return { success: true, message: 'Passes kernel to registry' };
  };

  const testExposesRegistryProperty = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    if (!facet.registry || typeof facet.registry.get !== 'function') {
      return { success: false, error: 'Should expose registry property' };
    }
    return { success: true, message: 'Exposes registry property' };
  };

  const testMintDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const result = facet.mint(PRINCIPAL_KINDS.RESOURCE);
    if (!result || !result.publicKey) {
      return { success: false, error: 'Should delegate mint to registry' };
    }
    return { success: true, message: 'Delegates mint to registry' };
  };

  const testCreatePrincipalDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    if (!pkr || typeof pkr.uuid !== 'string') {
      return { success: false, error: 'Should delegate createPrincipal to registry' };
    }
    return { success: true, message: 'Delegates createPrincipal to registry' };
  };

  const testResolvePKRDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const priv = facet.resolvePKR(pkr);
    if (priv === undefined) {
      return { success: false, error: 'Should delegate resolvePKR to registry' };
    }
    return { success: true, message: 'Delegates resolvePKR to registry' };
  };

  const testCreateRWSDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = facet.createRWS(pkr);
    if (!rws || typeof rws.canRead !== 'function') {
      return { success: false, error: 'Should delegate createRWS to registry' };
    }
    return { success: true, message: 'Delegates createRWS to registry' };
  };

  const testCreateIdentityDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = facet.createIdentity(pkr);
    if (!identity || typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should delegate createIdentity to registry' };
    }
    return { success: true, message: 'Delegates createIdentity to registry' };
  };

  const testCreateFriendIdentityDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const friendPkr = facet.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    const identity = facet.createFriendIdentity(friendPkr);
    if (!identity || typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should delegate createFriendIdentity to registry' };
    }
    return { success: true, message: 'Delegates createFriendIdentity to registry' };
  };

  const testIsKernelDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    // Get kernel PKR from registry
    const kernelPrincipal = Array.from(facet.registry)[0];
    const isKernel = facet.isKernel(kernelPrincipal.pkr);
    if (isKernel !== true) {
      return { success: false, error: 'Should delegate isKernel to registry' };
    }
    return { success: true, message: 'Delegates isKernel to registry' };
  };

  const testGetDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const principal = facet.get(pkr.uuid);
    if (!principal || principal.uuid !== pkr.uuid) {
      return { success: false, error: 'Should delegate get to registry' };
    }
    return { success: true, message: 'Delegates get to registry' };
  };

  const testHasDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const has = facet.has(pkr.uuid);
    if (has !== true) {
      return { success: false, error: 'Should delegate has to registry' };
    }
    return { success: true, message: 'Delegates has to registry' };
  };

  const testRefreshPrincipalDelegates = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    // Create expired PKR by manipulating time (simplified test)
    const principal = facet.get(pkr.uuid);
    const newPkr = facet.refreshPrincipal(principal);
    if (!newPkr || typeof newPkr.uuid !== 'string') {
      return { success: false, error: 'Should delegate refreshPrincipal to registry' };
    }
    return { success: true, message: 'Delegates refreshPrincipal to registry' };
  };

  const testAllMethodsCallable = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const methods = ['mint', 'createPrincipal', 'resolvePKR', 'createRWS', 'createIdentity', 'createFriendIdentity', 'isKernel', 'get', 'has', 'refreshPrincipal'];
    for (const method of methods) {
      if (typeof facet[method] !== 'function') {
        return { success: false, error: `Should have ${method} method` };
      }
    }
    return { success: true, message: 'All methods are callable from facet' };
  };

  const testWorksWithBaseSubsystem = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    try {
      await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
      const facet = subsystem.find('principals');
      if (!facet) {
        return { success: false, error: 'Should work with BaseSubsystem' };
      }
      return { success: true, message: 'Works with BaseSubsystem' };
    } catch (error) {
      return { success: false, error: `Should work with BaseSubsystem: ${error.message}` };
    }
  };

  const testFacetAccessibleViaFind = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    if (!facet) {
      return { success: false, error: 'Should be accessible via find' };
    }
    return { success: true, message: 'Facet is accessible via find' };
  };

  const testCanCreatePrincipals = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    if (!pkr || typeof pkr.uuid !== 'string') {
      return { success: false, error: 'Should create principals via facet' };
    }
    return { success: true, message: 'Can create principals via facet' };
  };

  const testCanResolvePKRs = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const priv = facet.resolvePKR(pkr);
    if (priv === undefined) {
      return { success: false, error: 'Should resolve PKRs via facet' };
    }
    return { success: true, message: 'Can resolve PKRs via facet' };
  };

  const testCanCreateIdentities = async () => {
    const ms = { name: 'mock-ms', id: 'ms-1' };
    const kernel = createMockKernel();
    const subsystem = new BaseSubsystem('test', { ms });
    await subsystem.use(usePrincipals).build({ config: { principals: { kernel } } });
    const facet = subsystem.find('principals');
    const pkr = facet.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = facet.createIdentity(pkr);
    if (!identity || typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should create identities via facet' };
    }
    return { success: true, message: 'Can create identities via facet' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>UsePrincipals Hook Tests</h2>
      
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


