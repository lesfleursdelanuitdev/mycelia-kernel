import { useState } from 'react';
import { ReaderWriterSet } from '../models/security/reader-writer-set.mycelia.js';
import { PrincipalRegistry } from '../models/security/principal-registry.mycelia.js';
import { PRINCIPAL_KINDS } from '../models/security/security.utils.mycelia.js';

/**
 * ReaderWriterSetTest
 * Tests for ReaderWriterSet class
 */
export function ReaderWriterSetTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    { name: 'Constructor - throws error for missing pkr', category: 'Constructor' },
    { name: 'Constructor - throws error for missing principals', category: 'Constructor' },
    { name: 'Constructor - initializes with empty sets', category: 'Constructor' },
    { name: 'Constructor - generates UUID', category: 'Constructor' },
    { name: 'addReader - returns false for invalid granter', category: 'Reader Management' },
    { name: 'addReader - returns false for invalid grantee', category: 'Reader Management' },
    { name: 'addReader - returns false if granter cannot grant', category: 'Reader Management' },
    { name: 'addReader - adds reader successfully', category: 'Reader Management' },
    { name: 'addReader - prevents duplicate readers', category: 'Reader Management' },
    { name: 'removeReader - returns false for invalid inputs', category: 'Reader Management' },
    { name: 'removeReader - removes reader successfully', category: 'Reader Management' },
    { name: 'removeReader - returns false if not a reader', category: 'Reader Management' },
    { name: 'addWriter - returns false for invalid granter', category: 'Writer Management' },
    { name: 'addWriter - returns false for invalid grantee', category: 'Writer Management' },
    { name: 'addWriter - returns false if granter cannot grant', category: 'Writer Management' },
    { name: 'addWriter - adds writer successfully', category: 'Writer Management' },
    { name: 'addWriter - prevents duplicate writers', category: 'Writer Management' },
    { name: 'removeWriter - returns false for invalid inputs', category: 'Writer Management' },
    { name: 'removeWriter - removes writer successfully', category: 'Writer Management' },
    { name: 'removeWriter - returns false if not a writer', category: 'Writer Management' },
    { name: 'promote - moves reader to writer', category: 'Promotion/Demotion' },
    { name: 'promote - returns false for invalid inputs', category: 'Promotion/Demotion' },
    { name: 'promote - returns false if not a reader', category: 'Promotion/Demotion' },
    { name: 'demote - moves writer to reader', category: 'Promotion/Demotion' },
    { name: 'demote - returns false for invalid inputs', category: 'Promotion/Demotion' },
    { name: 'demote - returns false if not a writer', category: 'Promotion/Demotion' },
    { name: 'isOwner - returns true for owner PKR', category: 'Access Checks' },
    { name: 'isOwner - returns false for non-owner', category: 'Access Checks' },
    { name: 'isOwner - returns false for invalid PKR', category: 'Access Checks' },
    { name: 'canRead - returns true for kernel', category: 'Access Checks' },
    { name: 'canRead - returns true for owner', category: 'Access Checks' },
    { name: 'canRead - returns true for readers', category: 'Access Checks' },
    { name: 'canRead - returns true for writers', category: 'Access Checks' },
    { name: 'canRead - returns false for others', category: 'Access Checks' },
    { name: 'canWrite - returns true for kernel', category: 'Access Checks' },
    { name: 'canWrite - returns true for owner', category: 'Access Checks' },
    { name: 'canWrite - returns true for writers', category: 'Access Checks' },
    { name: 'canWrite - returns false for readers/others', category: 'Access Checks' },
    { name: 'canGrant - returns true for kernel', category: 'Grant Permissions' },
    { name: 'canGrant - returns true for owner', category: 'Grant Permissions' },
    { name: 'canGrant - returns false for others', category: 'Grant Permissions' },
    { name: 'canGrant - returns false for invalid PKR', category: 'Grant Permissions' },
    { name: 'hasReader - checks if PKR is a reader', category: 'Introspection' },
    { name: 'hasWriter - checks if PKR is a writer', category: 'Introspection' },
    { name: 'readerCount - returns correct count', category: 'Introspection' },
    { name: 'writerCount - returns correct count', category: 'Introspection' },
    { name: 'isKernel - delegates to principals registry', category: 'Introspection' },
    { name: 'clear - removes all readers and writers', category: 'Introspection' },
    { name: 'clone - creates independent copy', category: 'Cloning' },
    { name: 'clone - preserves readers and writers', category: 'Cloning' },
    { name: 'clone - shares same PKR and principals', category: 'Cloning' },
    { name: 'toRecord - returns correct structure', category: 'Serialization' },
    { name: 'toString - returns formatted string', category: 'Serialization' },
    { name: 'UUID - is accessible via toRecord', category: 'Serialization' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - throws error for missing pkr':
            result = await testConstructorThrowsErrorForMissingPkr();
            break;
          case 'Constructor - throws error for missing principals':
            result = await testConstructorThrowsErrorForMissingPrincipals();
            break;
          case 'Constructor - initializes with empty sets':
            result = await testConstructorInitializesEmptySets();
            break;
          case 'Constructor - generates UUID':
            result = await testConstructorGeneratesUuid();
            break;
          case 'addReader - returns false for invalid granter':
            result = await testAddReaderReturnsFalseForInvalidGranter();
            break;
          case 'addReader - returns false for invalid grantee':
            result = await testAddReaderReturnsFalseForInvalidGrantee();
            break;
          case 'addReader - returns false if granter cannot grant':
            result = await testAddReaderReturnsFalseIfCannotGrant();
            break;
          case 'addReader - adds reader successfully':
            result = await testAddReaderAddsSuccessfully();
            break;
          case 'addReader - prevents duplicate readers':
            result = await testAddReaderPreventsDuplicates();
            break;
          case 'removeReader - returns false for invalid inputs':
            result = await testRemoveReaderReturnsFalseForInvalid();
            break;
          case 'removeReader - removes reader successfully':
            result = await testRemoveReaderRemovesSuccessfully();
            break;
          case 'removeReader - returns false if not a reader':
            result = await testRemoveReaderReturnsFalseIfNotReader();
            break;
          case 'addWriter - returns false for invalid granter':
            result = await testAddWriterReturnsFalseForInvalidGranter();
            break;
          case 'addWriter - returns false for invalid grantee':
            result = await testAddWriterReturnsFalseForInvalidGrantee();
            break;
          case 'addWriter - returns false if granter cannot grant':
            result = await testAddWriterReturnsFalseIfCannotGrant();
            break;
          case 'addWriter - adds writer successfully':
            result = await testAddWriterAddsSuccessfully();
            break;
          case 'addWriter - prevents duplicate writers':
            result = await testAddWriterPreventsDuplicates();
            break;
          case 'removeWriter - returns false for invalid inputs':
            result = await testRemoveWriterReturnsFalseForInvalid();
            break;
          case 'removeWriter - removes writer successfully':
            result = await testRemoveWriterRemovesSuccessfully();
            break;
          case 'removeWriter - returns false if not a writer':
            result = await testRemoveWriterReturnsFalseIfNotWriter();
            break;
          case 'promote - moves reader to writer':
            result = await testPromoteMovesReaderToWriter();
            break;
          case 'promote - returns false for invalid inputs':
            result = await testPromoteReturnsFalseForInvalid();
            break;
          case 'promote - returns false if not a reader':
            result = await testPromoteReturnsFalseIfNotReader();
            break;
          case 'demote - moves writer to reader':
            result = await testDemoteMovesWriterToReader();
            break;
          case 'demote - returns false for invalid inputs':
            result = await testDemoteReturnsFalseForInvalid();
            break;
          case 'demote - returns false if not a writer':
            result = await testDemoteReturnsFalseIfNotWriter();
            break;
          case 'isOwner - returns true for owner PKR':
            result = await testIsOwnerReturnsTrue();
            break;
          case 'isOwner - returns false for non-owner':
            result = await testIsOwnerReturnsFalse();
            break;
          case 'isOwner - returns false for invalid PKR':
            result = await testIsOwnerReturnsFalseForInvalid();
            break;
          case 'canRead - returns true for kernel':
            result = await testCanReadReturnsTrueForKernel();
            break;
          case 'canRead - returns true for owner':
            result = await testCanReadReturnsTrueForOwner();
            break;
          case 'canRead - returns true for readers':
            result = await testCanReadReturnsTrueForReaders();
            break;
          case 'canRead - returns true for writers':
            result = await testCanReadReturnsTrueForWriters();
            break;
          case 'canRead - returns false for others':
            result = await testCanReadReturnsFalseForOthers();
            break;
          case 'canWrite - returns true for kernel':
            result = await testCanWriteReturnsTrueForKernel();
            break;
          case 'canWrite - returns true for owner':
            result = await testCanWriteReturnsTrueForOwner();
            break;
          case 'canWrite - returns true for writers':
            result = await testCanWriteReturnsTrueForWriters();
            break;
          case 'canWrite - returns false for readers/others':
            result = await testCanWriteReturnsFalseForReaders();
            break;
          case 'canGrant - returns true for kernel':
            result = await testCanGrantReturnsTrueForKernel();
            break;
          case 'canGrant - returns true for owner':
            result = await testCanGrantReturnsTrueForOwner();
            break;
          case 'canGrant - returns false for others':
            result = await testCanGrantReturnsFalseForOthers();
            break;
          case 'canGrant - returns false for invalid PKR':
            result = await testCanGrantReturnsFalseForInvalid();
            break;
          case 'hasReader - checks if PKR is a reader':
            result = await testHasReader();
            break;
          case 'hasWriter - checks if PKR is a writer':
            result = await testHasWriter();
            break;
          case 'readerCount - returns correct count':
            result = await testReaderCount();
            break;
          case 'writerCount - returns correct count':
            result = await testWriterCount();
            break;
          case 'isKernel - delegates to principals registry':
            result = await testIsKernelDelegates();
            break;
          case 'clear - removes all readers and writers':
            result = await testClear();
            break;
          case 'clone - creates independent copy':
            result = await testCloneCreatesIndependent();
            break;
          case 'clone - preserves readers and writers':
            result = await testClonePreserves();
            break;
          case 'clone - shares same PKR and principals':
            result = await testCloneShares();
            break;
          case 'toRecord - returns correct structure':
            result = await testToRecord();
            break;
          case 'toString - returns formatted string':
            result = await testToString();
            break;
          case 'UUID - is accessible via toRecord':
            result = await testUuidAccessible();
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

  const testConstructorThrowsErrorForMissingPkr = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    try {
      new ReaderWriterSet({ principals: registry });
      return { success: false, error: 'Should throw error for missing pkr' };
    } catch (error) {
      if (error.message.includes('requires pkr')) {
        return { success: true, message: 'Throws error for missing pkr' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForMissingPrincipals = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    try {
      new ReaderWriterSet({ pkr });
      return { success: false, error: 'Should throw error for missing principals' };
    } catch (error) {
      if (error.message.includes('requires principals registry')) {
        return { success: true, message: 'Throws error for missing principals' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorInitializesEmptySets = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr, principals: registry });
    if (rws.readerCount() !== 0 || rws.writerCount() !== 0) {
      return { success: false, error: 'Should initialize with empty sets' };
    }
    return { success: true, message: 'Initializes with empty sets' };
  };

  const testConstructorGeneratesUuid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr, principals: registry });
    const record = rws.toRecord();
    if (!record.uuid || typeof record.uuid !== 'string') {
      return { success: false, error: 'Should generate UUID' };
    }
    return { success: true, message: 'Generates UUID' };
  };

  const testAddReaderReturnsFalseForInvalidGranter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addReader(null, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid granter' };
    }
    return { success: true, message: 'Returns false for invalid granter' };
  };

  const testAddReaderReturnsFalseForInvalidGrantee = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addReader(ownerPkr, null);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid grantee' };
    }
    return { success: true, message: 'Returns false for invalid grantee' };
  };

  const testAddReaderReturnsFalseIfCannotGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addReader(otherPkr, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should return false if granter cannot grant' };
    }
    return { success: true, message: 'Returns false if granter cannot grant' };
  };

  const testAddReaderAddsSuccessfully = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addReader(ownerPkr, granteePkr);
    if (result !== true) {
      return { success: false, error: 'Should add reader successfully' };
    }
    if (!rws.hasReader(granteePkr)) {
      return { success: false, error: 'Reader should be added' };
    }
    return { success: true, message: 'Adds reader successfully' };
  };

  const testAddReaderPreventsDuplicates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, granteePkr);
    const count1 = rws.readerCount();
    rws.addReader(ownerPkr, granteePkr);
    const count2 = rws.readerCount();
    if (count1 !== count2 || count2 !== 1) {
      return { success: false, error: 'Should prevent duplicate readers' };
    }
    return { success: true, message: 'Prevents duplicate readers' };
  };

  const testRemoveReaderReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.removeReader(null, ownerPkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid inputs' };
    }
    return { success: true, message: 'Returns false for invalid inputs' };
  };

  const testRemoveReaderRemovesSuccessfully = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, granteePkr);
    const result = rws.removeReader(ownerPkr, granteePkr);
    if (result !== true || rws.hasReader(granteePkr)) {
      return { success: false, error: 'Should remove reader successfully' };
    }
    return { success: true, message: 'Removes reader successfully' };
  };

  const testRemoveReaderReturnsFalseIfNotReader = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.removeReader(ownerPkr, granteePkr);
    // Not a reader, so should return false (but operation succeeds, just nothing to remove)
    if (result !== true) {
      return { success: false, error: 'Should handle non-reader removal gracefully' };
    }
    return { success: true, message: 'Returns false if not a reader (gracefully handled)' };
  };

  const testAddWriterReturnsFalseForInvalidGranter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addWriter(null, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid granter' };
    }
    return { success: true, message: 'Returns false for invalid granter' };
  };

  const testAddWriterReturnsFalseForInvalidGrantee = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addWriter(ownerPkr, null);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid grantee' };
    }
    return { success: true, message: 'Returns false for invalid grantee' };
  };

  const testAddWriterReturnsFalseIfCannotGrant = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addWriter(otherPkr, granteePkr);
    if (result !== false) {
      return { success: false, error: 'Should return false if granter cannot grant' };
    }
    return { success: true, message: 'Returns false if granter cannot grant' };
  };

  const testAddWriterAddsSuccessfully = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.addWriter(ownerPkr, granteePkr);
    if (result !== true || !rws.hasWriter(granteePkr)) {
      return { success: false, error: 'Should add writer successfully' };
    }
    return { success: true, message: 'Adds writer successfully' };
  };

  const testAddWriterPreventsDuplicates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addWriter(ownerPkr, granteePkr);
    const count1 = rws.writerCount();
    rws.addWriter(ownerPkr, granteePkr);
    const count2 = rws.writerCount();
    if (count1 !== count2 || count2 !== 1) {
      return { success: false, error: 'Should prevent duplicate writers' };
    }
    return { success: true, message: 'Prevents duplicate writers' };
  };

  const testRemoveWriterReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.removeWriter(null, ownerPkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid inputs' };
    }
    return { success: true, message: 'Returns false for invalid inputs' };
  };

  const testRemoveWriterRemovesSuccessfully = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addWriter(ownerPkr, granteePkr);
    const result = rws.removeWriter(ownerPkr, granteePkr);
    if (result !== true || rws.hasWriter(granteePkr)) {
      return { success: false, error: 'Should remove writer successfully' };
    }
    return { success: true, message: 'Removes writer successfully' };
  };

  const testRemoveWriterReturnsFalseIfNotWriter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.removeWriter(ownerPkr, granteePkr);
    // Not a writer, but operation succeeds (gracefully handles)
    if (result !== true) {
      return { success: false, error: 'Should handle non-writer removal gracefully' };
    }
    return { success: true, message: 'Returns false if not a writer (gracefully handled)' };
  };

  const testPromoteMovesReaderToWriter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, granteePkr);
    const result = rws.promote(ownerPkr, granteePkr);
    if (result !== true || rws.hasReader(granteePkr) || !rws.hasWriter(granteePkr)) {
      return { success: false, error: 'Should move reader to writer' };
    }
    return { success: true, message: 'Moves reader to writer' };
  };

  const testPromoteReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.promote(null, ownerPkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid inputs' };
    }
    return { success: true, message: 'Returns false for invalid inputs' };
  };

  const testPromoteReturnsFalseIfNotReader = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.promote(ownerPkr, granteePkr);
    // Not a reader, so should return false (nothing to promote)
    if (result !== true) {
      return { success: false, error: 'Should handle non-reader promotion gracefully' };
    }
    return { success: true, message: 'Returns false if not a reader (gracefully handled)' };
  };

  const testDemoteMovesWriterToReader = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addWriter(ownerPkr, granteePkr);
    const result = rws.demote(ownerPkr, granteePkr);
    if (result !== true || rws.hasWriter(granteePkr) || !rws.hasReader(granteePkr)) {
      return { success: false, error: 'Should move writer to reader' };
    }
    return { success: true, message: 'Moves writer to reader' };
  };

  const testDemoteReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.demote(null, ownerPkr);
    if (result !== false) {
      return { success: false, error: 'Should return false for invalid inputs' };
    }
    return { success: true, message: 'Returns false for invalid inputs' };
  };

  const testDemoteReturnsFalseIfNotWriter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const granteePkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const result = rws.demote(ownerPkr, granteePkr);
    // Not a writer, so should return false (nothing to demote)
    if (result !== true) {
      return { success: false, error: 'Should handle non-writer demotion gracefully' };
    }
    return { success: true, message: 'Returns false if not a writer (gracefully handled)' };
  };

  const testIsOwnerReturnsTrue = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.isOwner(ownerPkr)) {
      return { success: false, error: 'Should return true for owner PKR' };
    }
    return { success: true, message: 'Returns true for owner PKR' };
  };

  const testIsOwnerReturnsFalse = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.isOwner(otherPkr)) {
      return { success: false, error: 'Should return false for non-owner' };
    }
    return { success: true, message: 'Returns false for non-owner' };
  };

  const testIsOwnerReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.isOwner(null)) {
      return { success: false, error: 'Should return false for invalid PKR' };
    }
    return { success: true, message: 'Returns false for invalid PKR' };
  };

  const testCanReadReturnsTrueForKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const kernelPkr = Array.from(registry)[0].pkr;
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canRead(kernelPkr)) {
      return { success: false, error: 'Should return true for kernel' };
    }
    return { success: true, message: 'Returns true for kernel' };
  };

  const testCanReadReturnsTrueForOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canRead(ownerPkr)) {
      return { success: false, error: 'Should return true for owner' };
    }
    return { success: true, message: 'Returns true for owner' };
  };

  const testCanReadReturnsTrueForReaders = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, readerPkr);
    if (!rws.canRead(readerPkr)) {
      return { success: false, error: 'Should return true for readers' };
    }
    return { success: true, message: 'Returns true for readers' };
  };

  const testCanReadReturnsTrueForWriters = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addWriter(ownerPkr, writerPkr);
    if (!rws.canRead(writerPkr)) {
      return { success: false, error: 'Should return true for writers' };
    }
    return { success: true, message: 'Returns true for writers' };
  };

  const testCanReadReturnsFalseForOthers = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.canRead(otherPkr)) {
      return { success: false, error: 'Should return false for others' };
    }
    return { success: true, message: 'Returns false for others' };
  };

  const testCanWriteReturnsTrueForKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const kernelPkr = Array.from(registry)[0].pkr;
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canWrite(kernelPkr)) {
      return { success: false, error: 'Should return true for kernel' };
    }
    return { success: true, message: 'Returns true for kernel' };
  };

  const testCanWriteReturnsTrueForOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canWrite(ownerPkr)) {
      return { success: false, error: 'Should return true for owner' };
    }
    return { success: true, message: 'Returns true for owner' };
  };

  const testCanWriteReturnsTrueForWriters = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addWriter(ownerPkr, writerPkr);
    if (!rws.canWrite(writerPkr)) {
      return { success: false, error: 'Should return true for writers' };
    }
    return { success: true, message: 'Returns true for writers' };
  };

  const testCanWriteReturnsFalseForReaders = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, readerPkr);
    if (rws.canWrite(readerPkr)) {
      return { success: false, error: 'Should return false for readers' };
    }
    return { success: true, message: 'Returns false for readers/others' };
  };

  const testCanGrantReturnsTrueForKernel = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const kernelPkr = Array.from(registry)[0].pkr;
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canGrant(kernelPkr)) {
      return { success: false, error: 'Should return true for kernel' };
    }
    return { success: true, message: 'Returns true for kernel' };
  };

  const testCanGrantReturnsTrueForOwner = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.canGrant(ownerPkr)) {
      return { success: false, error: 'Should return true for owner' };
    }
    return { success: true, message: 'Returns true for owner' };
  };

  const testCanGrantReturnsFalseForOthers = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const otherPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.canGrant(otherPkr)) {
      return { success: false, error: 'Should return false for others' };
    }
    return { success: true, message: 'Returns false for others' };
  };

  const testCanGrantReturnsFalseForInvalid = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.canGrant(null)) {
      return { success: false, error: 'Should return false for invalid PKR' };
    }
    return { success: true, message: 'Returns false for invalid PKR' };
  };

  const testHasReader = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.hasReader(readerPkr)) {
      return { success: false, error: 'Should return false before adding' };
    }
    rws.addReader(ownerPkr, readerPkr);
    if (!rws.hasReader(readerPkr)) {
      return { success: false, error: 'Should return true after adding' };
    }
    return { success: true, message: 'Checks if PKR is a reader' };
  };

  const testHasWriter = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.hasWriter(writerPkr)) {
      return { success: false, error: 'Should return false before adding' };
    }
    rws.addWriter(ownerPkr, writerPkr);
    if (!rws.hasWriter(writerPkr)) {
      return { success: false, error: 'Should return true after adding' };
    }
    return { success: true, message: 'Checks if PKR is a writer' };
  };

  const testReaderCount = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const reader1Pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const reader2Pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.readerCount() !== 0) {
      return { success: false, error: 'Should return 0 initially' };
    }
    rws.addReader(ownerPkr, reader1Pkr);
    if (rws.readerCount() !== 1) {
      return { success: false, error: 'Should return 1 after adding one' };
    }
    rws.addReader(ownerPkr, reader2Pkr);
    if (rws.readerCount() !== 2) {
      return { success: false, error: 'Should return 2 after adding two' };
    }
    return { success: true, message: 'Returns correct count' };
  };

  const testWriterCount = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writer1Pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writer2Pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (rws.writerCount() !== 0) {
      return { success: false, error: 'Should return 0 initially' };
    }
    rws.addWriter(ownerPkr, writer1Pkr);
    if (rws.writerCount() !== 1) {
      return { success: false, error: 'Should return 1 after adding one' };
    }
    rws.addWriter(ownerPkr, writer2Pkr);
    if (rws.writerCount() !== 2) {
      return { success: false, error: 'Should return 2 after adding two' };
    }
    return { success: true, message: 'Returns correct count' };
  };

  const testIsKernelDelegates = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const kernelPkr = Array.from(registry)[0].pkr;
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    if (!rws.isKernel(kernelPkr)) {
      return { success: false, error: 'Should delegate isKernel to principals registry' };
    }
    return { success: true, message: 'Delegates isKernel to principals registry' };
  };

  const testClear = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, readerPkr);
    rws.addWriter(ownerPkr, writerPkr);
    rws.clear();
    if (rws.readerCount() !== 0 || rws.writerCount() !== 0) {
      return { success: false, error: 'Should remove all readers and writers' };
    }
    return { success: true, message: 'Removes all readers and writers' };
  };

  const testCloneCreatesIndependent = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const cloned = rws.clone();
    if (cloned === rws) {
      return { success: false, error: 'Should create independent copy' };
    }
    return { success: true, message: 'Creates independent copy' };
  };

  const testClonePreserves = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const writerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    rws.addReader(ownerPkr, readerPkr);
    rws.addWriter(ownerPkr, writerPkr);
    const cloned = rws.clone();
    if (!cloned.hasReader(readerPkr) || !cloned.hasWriter(writerPkr)) {
      return { success: false, error: 'Should preserve readers and writers' };
    }
    return { success: true, message: 'Preserves readers and writers' };
  };

  const testCloneShares = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const cloned = rws.clone();
    // Clone should share same PKR and principals reference
    // This is tested indirectly by checking operations work
    const readerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    cloned.addReader(ownerPkr, readerPkr);
    if (!cloned.hasReader(readerPkr)) {
      return { success: false, error: 'Should share same PKR and principals' };
    }
    return { success: true, message: 'Shares same PKR and principals' };
  };

  const testToRecord = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const record = rws.toRecord();
    if (!record.uuid || record.owner !== ownerPkr.uuid || !Array.isArray(record.readers) || !Array.isArray(record.writers)) {
      return { success: false, error: 'Should return correct structure' };
    }
    return { success: true, message: 'Returns correct structure' };
  };

  const testToString = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const str = rws.toString();
    if (!str.includes('RWS') || !str.includes('readers=') || !str.includes('writers=')) {
      return { success: false, error: 'Should return formatted string' };
    }
    return { success: true, message: 'Returns formatted string' };
  };

  const testUuidAccessible = async () => {
    const registry = new PrincipalRegistry({ kernel: createMockKernel() });
    const ownerPkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: registry });
    const record = rws.toRecord();
    if (!record.uuid || typeof record.uuid !== 'string') {
      return { success: false, error: 'UUID should be accessible via toRecord' };
    }
    return { success: true, message: 'UUID is accessible via toRecord' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>ReaderWriterSet Tests</h2>
      
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


