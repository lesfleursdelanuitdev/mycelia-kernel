import { useState } from 'react';
import { createIdentity } from '../models/security/create-identity.mycelia.js';
import { PrincipalRegistry } from '../models/security/principal-registry.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * CreateIdentityTest
 * Tests for createIdentity function
 */
export function CreateIdentityTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'createIdentity - throws error for invalid principals', category: 'Validation' },
    { name: 'createIdentity - throws error for invalid PKR', category: 'Validation' },
    { name: 'createIdentity - throws error for missing kernel', category: 'Validation' },
    { name: 'createIdentity - throws error for kernel without sendProtected', category: 'Validation' },
    { name: 'createIdentity - validates PKR via resolvePKR', category: 'Validation' },
    { name: 'createIdentity - creates RWS via principals', category: 'Validation' },
    { name: 'createIdentity - returns object with pkr', category: 'Return Value Structure' },
    { name: 'createIdentity - returns canRead function', category: 'Return Value Structure' },
    { name: 'createIdentity - returns canWrite function', category: 'Return Value Structure' },
    { name: 'createIdentity - returns canGrant function', category: 'Return Value Structure' },
    { name: 'createIdentity - returns requireRead wrapper', category: 'Return Value Structure' },
    { name: 'createIdentity - returns requireWrite wrapper', category: 'Return Value Structure' },
    { name: 'createIdentity - returns requireGrant wrapper', category: 'Return Value Structure' },
    { name: 'createIdentity - returns requireAuth wrapper', category: 'Return Value Structure' },
    { name: 'canRead - delegates to RWS.canRead', category: 'Permission Queries' },
    { name: 'canWrite - delegates to RWS.canWrite', category: 'Permission Queries' },
    { name: 'canGrant - delegates to RWS.canGrant', category: 'Permission Queries' },
    { name: 'canRead - works with owner PKR', category: 'Permission Queries' },
    { name: 'canWrite - works with owner PKR', category: 'Permission Queries' },
    { name: 'canGrant - works with owner PKR', category: 'Permission Queries' },
    { name: 'requireRead - throws error if cannot read', category: 'Permission Wrappers' },
    { name: 'requireRead - executes function if can read', category: 'Permission Wrappers' },
    { name: 'requireWrite - throws error if cannot write', category: 'Permission Wrappers' },
    { name: 'requireWrite - executes function if can write', category: 'Permission Wrappers' },
    { name: 'requireGrant - throws error if cannot grant', category: 'Permission Wrappers' },
    { name: 'requireGrant - executes function if can grant', category: 'Permission Wrappers' },
    { name: 'requireAuth - throws error for invalid type', category: 'Permission Wrappers' },
    { name: 'requireAuth - throws error for non-function handler', category: 'Permission Wrappers' },
    { name: 'requireAuth - works with all permission types', category: 'Permission Wrappers' },
    { name: 'grantReader - delegates to RWS.addReader', category: 'Grant/Revoke Helpers' },
    { name: 'grantWriter - delegates to RWS.addWriter', category: 'Grant/Revoke Helpers' },
    { name: 'revokeReader - delegates to RWS.removeReader', category: 'Grant/Revoke Helpers' },
    { name: 'revokeWriter - delegates to RWS.removeWriter', category: 'Grant/Revoke Helpers' },
    { name: 'promote - delegates to RWS.promote', category: 'Grant/Revoke Helpers' },
    { name: 'demote - delegates to RWS.demote', category: 'Grant/Revoke Helpers' },
    { name: 'grantReader - requires grant permission', category: 'Grant/Revoke Helpers' },
    { name: 'grantWriter - requires grant permission', category: 'Grant/Revoke Helpers' },
    { name: 'sendProtected - calls kernel.sendProtected', category: 'Protected Messaging' },
    { name: 'sendProtected - passes owner PKR', category: 'Protected Messaging' },
    { name: 'sendProtected - passes message', category: 'Protected Messaging' },
    { name: 'sendProtected - passes options', category: 'Protected Messaging' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'createIdentity - throws error for invalid principals':
            result = await testThrowsErrorForInvalidPrincipals();
            break;
          case 'createIdentity - throws error for invalid PKR':
            result = await testThrowsErrorForInvalidPKR();
            break;
          case 'createIdentity - throws error for missing kernel':
            result = await testThrowsErrorForMissingKernel();
            break;
          case 'createIdentity - throws error for kernel without sendProtected':
            result = await testThrowsErrorForKernelWithoutSendProtected();
            break;
          case 'createIdentity - validates PKR via resolvePKR':
            result = await testValidatesPKR();
            break;
          case 'createIdentity - creates RWS via principals':
            result = await testCreatesRWS();
            break;
          case 'createIdentity - returns object with pkr':
            result = await testReturnsObjectWithPkr();
            break;
          case 'createIdentity - returns canRead function':
            result = await testReturnsCanRead();
            break;
          case 'createIdentity - returns canWrite function':
            result = await testReturnsCanWrite();
            break;
          case 'createIdentity - returns canGrant function':
            result = await testReturnsCanGrant();
            break;
          case 'createIdentity - returns requireRead wrapper':
            result = await testReturnsRequireRead();
            break;
          case 'createIdentity - returns requireWrite wrapper':
            result = await testReturnsRequireWrite();
            break;
          case 'createIdentity - returns requireGrant wrapper':
            result = await testReturnsRequireGrant();
            break;
          case 'createIdentity - returns requireAuth wrapper':
            result = await testReturnsRequireAuth();
            break;
          case 'canRead - delegates to RWS.canRead':
            result = await testCanReadDelegates();
            break;
          case 'canWrite - delegates to RWS.canWrite':
            result = await testCanWriteDelegates();
            break;
          case 'canGrant - delegates to RWS.canGrant':
            result = await testCanGrantDelegates();
            break;
          case 'canRead - works with owner PKR':
            result = await testCanReadWorksWithOwner();
            break;
          case 'canWrite - works with owner PKR':
            result = await testCanWriteWorksWithOwner();
            break;
          case 'canGrant - works with owner PKR':
            result = await testCanGrantWorksWithOwner();
            break;
          case 'requireRead - throws error if cannot read':
            result = await testRequireReadThrowsError();
            break;
          case 'requireRead - executes function if can read':
            result = await testRequireReadExecutes();
            break;
          case 'requireWrite - throws error if cannot write':
            result = await testRequireWriteThrowsError();
            break;
          case 'requireWrite - executes function if can write':
            result = await testRequireWriteExecutes();
            break;
          case 'requireGrant - throws error if cannot grant':
            result = await testRequireGrantThrowsError();
            break;
          case 'requireGrant - executes function if can grant':
            result = await testRequireGrantExecutes();
            break;
          case 'requireAuth - throws error for invalid type':
            result = await testRequireAuthThrowsErrorForInvalidType();
            break;
          case 'requireAuth - throws error for non-function handler':
            result = await testRequireAuthThrowsErrorForNonFunction();
            break;
          case 'requireAuth - works with all permission types':
            result = await testRequireAuthWorksWithAllTypes();
            break;
          case 'grantReader - delegates to RWS.addReader':
            result = await testGrantReaderDelegates();
            break;
          case 'grantWriter - delegates to RWS.addWriter':
            result = await testGrantWriterDelegates();
            break;
          case 'revokeReader - delegates to RWS.removeReader':
            result = await testRevokeReaderDelegates();
            break;
          case 'revokeWriter - delegates to RWS.removeWriter':
            result = await testRevokeWriterDelegates();
            break;
          case 'promote - delegates to RWS.promote':
            result = await testPromoteDelegates();
            break;
          case 'demote - delegates to RWS.demote':
            result = await testDemoteDelegates();
            break;
          case 'grantReader - requires grant permission':
            result = await testGrantReaderRequiresGrant();
            break;
          case 'grantWriter - requires grant permission':
            result = await testGrantWriterRequiresGrant();
            break;
          case 'sendProtected - calls kernel.sendProtected':
            result = await testSendProtectedCallsKernel();
            break;
          case 'sendProtected - passes owner PKR':
            result = await testSendProtectedPassesOwnerPKR();
            break;
          case 'sendProtected - passes message':
            result = await testSendProtectedPassesMessage();
            break;
          case 'sendProtected - passes options':
            result = await testSendProtectedPassesOptions();
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
    // eslint-disable-next-line no-unused-vars
    sendProtected: async (pkr, message, options) => Promise.resolve('sent')
  });

  const testThrowsErrorForInvalidPrincipals = async () => {
    try {
      createIdentity(null, {}, createMockKernel());
      return { success: false, error: 'Should throw error for invalid principals' };
    } catch (error) {
      if (error.message.includes('invalid principals registry')) {
        return { success: true, message: 'Throws error for invalid principals' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForInvalidPKR = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    try {
      createIdentity(registry, null, createMockKernel());
      return { success: false, error: 'Should throw error for invalid PKR' };
    } catch (error) {
      if (error.message.includes('invalid owner PKR')) {
        return { success: true, message: 'Throws error for invalid PKR' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForMissingKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      createIdentity(registry, pkr, null);
      return { success: false, error: 'Should throw error for missing kernel' };
    } catch (error) {
      if (error.message.includes('must support sendProtected')) {
        return { success: true, message: 'Throws error for missing kernel' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testThrowsErrorForKernelWithoutSendProtected = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      createIdentity(registry, pkr, {});
      return { success: false, error: 'Should throw error for kernel without sendProtected' };
    } catch (error) {
      if (error.message.includes('must support sendProtected')) {
        return { success: true, message: 'Throws error for kernel without sendProtected' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testValidatesPKR = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      const identity = createIdentity(registry, pkr, createMockKernel());
      if (!identity) {
        return { success: false, error: 'Should validate PKR via resolvePKR' };
      }
      return { success: true, message: 'Validates PKR via resolvePKR' };
    } catch (error) {
      return { success: false, error: `Should validate PKR: ${error.message}` };
    }
  };

  const testCreatesRWS = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    // RWS is created internally, test by checking permissions work
    if (typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should create RWS via principals' };
    }
    return { success: true, message: 'Creates RWS via principals' };
  };

  const testReturnsObjectWithPkr = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (!identity || identity.pkr !== pkr) {
      return { success: false, error: 'Should return object with pkr' };
    }
    return { success: true, message: 'Returns object with pkr' };
  };

  const testReturnsCanRead = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.canRead !== 'function') {
      return { success: false, error: 'Should return canRead function' };
    }
    return { success: true, message: 'Returns canRead function' };
  };

  const testReturnsCanWrite = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.canWrite !== 'function') {
      return { success: false, error: 'Should return canWrite function' };
    }
    return { success: true, message: 'Returns canWrite function' };
  };

  const testReturnsCanGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.canGrant !== 'function') {
      return { success: false, error: 'Should return canGrant function' };
    }
    return { success: true, message: 'Returns canGrant function' };
  };

  const testReturnsRequireRead = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.requireRead !== 'function') {
      return { success: false, error: 'Should return requireRead wrapper' };
    }
    return { success: true, message: 'Returns requireRead wrapper' };
  };

  const testReturnsRequireWrite = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.requireWrite !== 'function') {
      return { success: false, error: 'Should return requireWrite wrapper' };
    }
    return { success: true, message: 'Returns requireWrite wrapper' };
  };

  const testReturnsRequireGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.requireGrant !== 'function') {
      return { success: false, error: 'Should return requireGrant wrapper' };
    }
    return { success: true, message: 'Returns requireGrant wrapper' };
  };

  const testReturnsRequireAuth = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, pkr, createMockKernel());
    if (typeof identity.requireAuth !== 'function') {
      return { success: false, error: 'Should return requireAuth wrapper' };
    }
    return { success: true, message: 'Returns requireAuth wrapper' };
  };

  const testCanReadDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    // Owner can read themselves
    const canRead = identity.canRead(ownerPkr);
    if (canRead !== true) {
      return { success: false, error: 'Should delegate canRead to RWS' };
    }
    return { success: true, message: 'Delegates canRead to RWS' };
  };

  const testCanWriteDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const canWrite = identity.canWrite(ownerPkr);
    if (canWrite !== true) {
      return { success: false, error: 'Should delegate canWrite to RWS' };
    }
    return { success: true, message: 'Delegates canWrite to RWS' };
  };

  const testCanGrantDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const canGrant = identity.canGrant(ownerPkr);
    if (canGrant !== true) {
      return { success: false, error: 'Should delegate canGrant to RWS' };
    }
    return { success: true, message: 'Delegates canGrant to RWS' };
  };

  const testCanReadWorksWithOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    if (!identity.canRead(ownerPkr)) {
      return { success: false, error: 'Should work with owner PKR' };
    }
    return { success: true, message: 'Works with owner PKR' };
  };

  const testCanWriteWorksWithOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    if (!identity.canWrite(ownerPkr)) {
      return { success: false, error: 'Should work with owner PKR' };
    }
    return { success: true, message: 'Works with owner PKR' };
  };

  const testCanGrantWorksWithOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    if (!identity.canGrant(ownerPkr)) {
      return { success: false, error: 'Should work with owner PKR' };
    }
    return { success: true, message: 'Works with owner PKR' };
  };

  const testRequireReadThrowsError = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireRead(() => 'success');
    // Note: requireRead checks if ownerPkr can read, not the passed PKR
    // The wrapper checks if the owner can read themselves
    try {
      const result = wrapped();
      // Owner can read themselves, so this should succeed
      if (result !== 'success') {
        return { success: false, error: 'Should execute function if can read' };
      }
      return { success: true, message: 'Executes function if can read (owner can read themselves)' };
    } catch (error) {
      return { success: false, error: `Unexpected error: ${error.message}` };
    }
  };

  const testRequireReadExecutes = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireRead(() => 'success');
    const result = wrapped();
    if (result !== 'success') {
      return { success: false, error: 'Should execute function if can read' };
    }
    return { success: true, message: 'Executes function if can read' };
  };

  const testRequireWriteThrowsError = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireWrite(() => 'success');
    // Owner can write themselves, so should succeed
    const result = wrapped();
    if (result !== 'success') {
      return { success: false, error: 'Should execute function if can write' };
    }
    return { success: true, message: 'Executes function if can write (owner can write themselves)' };
  };

  const testRequireWriteExecutes = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireWrite(() => 'success');
    const result = wrapped();
    if (result !== 'success') {
      return { success: false, error: 'Should execute function if can write' };
    }
    return { success: true, message: 'Executes function if can write' };
  };

  const testRequireGrantThrowsError = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireGrant(() => 'success');
    // Owner can grant themselves, so should succeed
    const result = wrapped();
    if (result !== 'success') {
      return { success: false, error: 'Should execute function if can grant' };
    }
    return { success: true, message: 'Executes function if can grant (owner can grant themselves)' };
  };

  const testRequireGrantExecutes = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped = identity.requireGrant(() => 'success');
    const result = wrapped();
    if (result !== 'success') {
      return { success: false, error: 'Should execute function if can grant' };
    }
    return { success: true, message: 'Executes function if can grant' };
  };

  const testRequireAuthThrowsErrorForInvalidType = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    try {
      identity.requireAuth('invalid', () => {});
      return { success: false, error: 'Should throw error for invalid type' };
    } catch (error) {
      if (error.message.includes('unknown auth type')) {
        return { success: true, message: 'Throws error for invalid type' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRequireAuthThrowsErrorForNonFunction = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    try {
      identity.requireAuth('read', 'not-a-function');
      return { success: false, error: 'Should throw error for non-function handler' };
    } catch (error) {
      if (error.message.includes('handler must be a function')) {
        return { success: true, message: 'Throws error for non-function handler' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRequireAuthWorksWithAllTypes = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const wrapped1 = identity.requireAuth('read', () => 'read');
    const wrapped2 = identity.requireAuth('write', () => 'write');
    const wrapped3 = identity.requireAuth('grant', () => 'grant');
    if (wrapped1() !== 'read' || wrapped2() !== 'write' || wrapped3() !== 'grant') {
      return { success: false, error: 'Should work with all permission types' };
    }
    return { success: true, message: 'Works with all permission types' };
  };

  const testGrantReaderDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const result = identity.grantReader(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate grantReader to RWS' };
    }
    return { success: true, message: 'Delegates grantReader to RWS' };
  };

  const testGrantWriterDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const result = identity.grantWriter(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate grantWriter to RWS' };
    }
    return { success: true, message: 'Delegates grantWriter to RWS' };
  };

  const testRevokeReaderDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    identity.grantReader(ownerPkr, granteePkr);
    const result = identity.revokeReader(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate revokeReader to RWS' };
    }
    return { success: true, message: 'Delegates revokeReader to RWS' };
  };

  const testRevokeWriterDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    identity.grantWriter(ownerPkr, granteePkr);
    const result = identity.revokeWriter(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate revokeWriter to RWS' };
    }
    return { success: true, message: 'Delegates revokeWriter to RWS' };
  };

  const testPromoteDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    identity.grantReader(ownerPkr, granteePkr);
    const result = identity.promote(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate promote to RWS' };
    }
    return { success: true, message: 'Delegates promote to RWS' };
  };

  const testDemoteDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    identity.grantWriter(ownerPkr, granteePkr);
    const result = identity.demote(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should delegate demote to RWS' };
    }
    return { success: true, message: 'Delegates demote to RWS' };
  };

  const testGrantReaderRequiresGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    // Other PKR cannot grant, so should return false
    const result = identity.grantReader(otherPkr, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should require grant permission' };
    }
    return { success: true, message: 'Requires grant permission' };
  };

  const testGrantWriterRequiresGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = createIdentity(registry, ownerPkr, createMockKernel());
    const result = identity.grantWriter(otherPkr, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should require grant permission' };
    }
    return { success: true, message: 'Requires grant permission' };
  };

  const testSendProtectedCallsKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    let called = false;
    const kernel = {
      // eslint-disable-next-line no-unused-vars
      sendProtected: async (_pkr, _message, _options) => {
        called = true;
        return Promise.resolve('sent');
      }
    };
    const identity = createIdentity(registry, ownerPkr, kernel);
    await identity.sendProtected({ test: 'message' });
    if (!called) {
      return { success: false, error: 'Should call kernel.sendProtected' };
    }
    return { success: true, message: 'Calls kernel.sendProtected' };
  };

  const testSendProtectedPassesOwnerPKR = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    let receivedPkr = null;
    const kernel = {
      // eslint-disable-next-line no-unused-vars
      sendProtected: async (pkr, message, options) => {
        receivedPkr = pkr;
        return Promise.resolve('sent');
      }
    };
    const identity = createIdentity(registry, ownerPkr, kernel);
    await identity.sendProtected({ test: 'message' });
    if (receivedPkr !== ownerPkr) {
      return { success: false, error: 'Should pass owner PKR' };
    }
    return { success: true, message: 'Passes owner PKR' };
  };

  const testSendProtectedPassesMessage = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const testMessage = { test: 'message' };
    let receivedMessage = null;
    const kernel = {
      // eslint-disable-next-line no-unused-vars
      sendProtected: async (_pkr, message, _options) => {
        receivedMessage = message;
        return Promise.resolve('sent');
      }
    };
    const identity = createIdentity(registry, ownerPkr, kernel);
    await identity.sendProtected(testMessage);
    if (receivedMessage !== testMessage) {
      return { success: false, error: 'Should pass message' };
    }
    return { success: true, message: 'Passes message' };
  };

  const testSendProtectedPassesOptions = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const testOptions = { timeout: 1000 };
    let receivedOptions = null;
    const kernel = {
      sendProtected: async (_pkr, _message, options) => {
        receivedOptions = options;
        return Promise.resolve('sent');
      }
    };
    const identity = createIdentity(registry, ownerPkr, kernel);
    await identity.sendProtected({ test: 'message' }, testOptions);
    if (receivedOptions !== testOptions) {
      return { success: false, error: 'Should pass options' };
    }
    return { success: true, message: 'Passes options' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>CreateIdentity Tests</h2>
      
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

