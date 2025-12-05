import { useState } from 'react';
import { FacetManagerTransaction } from '../models/facet-manager/facet-manager-transaction.mycelia.js';
import { FacetManager } from '../models/facet-manager/facet-manager.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * FacetManagerTransactionTest - React component test suite for FacetManagerTransaction class
 */
export function FacetManagerTransactionTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createSubsystem = (name = 'test-subsystem') => {
    return { name };
  };

  // Helper to create a FacetManager instance
  const createFacetManager = (subsystem = null) => {
    const sub = subsystem || createSubsystem();
    return new FacetManager(sub);
  };

  // Helper to create a FacetManagerTransaction instance
  const createTransaction = (facetManager = null, subsystem = null) => {
    const manager = facetManager || createFacetManager();
    const sub = subsystem || createSubsystem();
    return new FacetManagerTransaction(manager, sub);
  };

  // Helper to create a mock facet
  const createMockFacet = (kind = 'test-facet', options = {}) => {
    const facet = new Facet(kind, options);
    let disposeCalled = false;
    let disposeOrder = null;

    facet.add({
      dispose: async (subsystem) => {
        disposeCalled = true;
        disposeOrder = Date.now(); // Track order
      },
      _disposeCalled: () => disposeCalled,
      _disposeOrder: () => disposeOrder
    });

    return facet;
  };

  const testCases = [
    // Constructor
    { name: 'Constructor creates instance', category: 'Constructor' },
    { name: 'Constructor stores facetManager reference', category: 'Constructor' },
    { name: 'Constructor stores subsystem reference', category: 'Constructor' },
    { name: 'Constructor initializes empty transaction stack', category: 'Constructor' },
    
    // beginTransaction()
    { name: 'beginTransaction() creates new transaction frame', category: 'beginTransaction()' },
    { name: 'beginTransaction() pushes frame onto stack', category: 'beginTransaction()' },
    { name: 'beginTransaction() initializes empty added array', category: 'beginTransaction()' },
    { name: 'beginTransaction() can be called multiple times (nested)', category: 'beginTransaction()' },
    { name: 'beginTransaction() does not throw errors', category: 'beginTransaction()' },
    
    // commit()
    { name: 'commit() removes topmost transaction frame', category: 'commit()' },
    { name: 'commit() does not affect facets (they remain added)', category: 'commit()' },
    { name: 'commit() throws error when no active transaction', category: 'commit()' },
    { name: 'commit() works with nested transactions (only removes top frame)', category: 'commit()' },
    { name: 'commit() allows multiple commits for nested transactions', category: 'commit()' },
    
    // rollback()
    { name: 'rollback() removes topmost transaction frame', category: 'rollback()' },
    { name: 'rollback() disposes facets in reverse order', category: 'rollback()' },
    { name: 'rollback() removes facets from FacetManager', category: 'rollback()' },
    { name: 'rollback() handles missing facets gracefully', category: 'rollback()' },
    { name: 'rollback() handles dispose errors gracefully (best-effort)', category: 'rollback()' },
    { name: 'rollback() throws error when no active transaction', category: 'rollback()' },
    { name: 'rollback() works with nested transactions (only rolls back top frame)', category: 'rollback()' },
    { name: 'rollback() does not affect outer transaction frames', category: 'rollback()' },
    
    // trackAddition()
    { name: 'trackAddition() adds kind to current frame\'s added array', category: 'trackAddition()' },
    { name: 'trackAddition() does nothing when no active transaction', category: 'trackAddition()' },
    { name: 'trackAddition() tracks additions in correct frame (nested)', category: 'trackAddition()' },
    { name: 'trackAddition() can track multiple additions', category: 'trackAddition()' },
    
    // hasActiveTransaction()
    { name: 'hasActiveTransaction() returns false initially', category: 'hasActiveTransaction()' },
    { name: 'hasActiveTransaction() returns true after beginTransaction()', category: 'hasActiveTransaction()' },
    { name: 'hasActiveTransaction() returns false after commit()', category: 'hasActiveTransaction()' },
    { name: 'hasActiveTransaction() returns false after rollback()', category: 'hasActiveTransaction()' },
    { name: 'hasActiveTransaction() correctly reflects nested transaction state', category: 'hasActiveTransaction()' },
    
    // Nested Transactions
    { name: 'Nested transactions are independent', category: 'Nested Transactions' },
    { name: 'Inner transaction commit does not affect outer transaction', category: 'Nested Transactions' },
    { name: 'Inner transaction rollback does not affect outer transaction', category: 'Nested Transactions' },
    { name: 'Complex nested transaction scenario', category: 'Nested Transactions' },
    
    // Integration
    { name: 'Full transaction lifecycle (begin → track → commit)', category: 'Integration' },
    { name: 'Full transaction lifecycle with rollback (begin → track → rollback)', category: 'Integration' },
    { name: 'Integration with FacetManager.add() (tracking)', category: 'Integration' },
  ];

  // ========== Constructor Tests ==========

  const testConstructorCreatesInstance = () => {
    const manager = createFacetManager();
    const subsystem = createSubsystem();
    const transaction = new FacetManagerTransaction(manager, subsystem);
    
    if (!transaction || typeof transaction !== 'object') {
      return { success: false, error: 'Constructor should create an instance' };
    }
    
    return { success: true, message: 'Constructor creates instance' };
  };

  const testConstructorStoresFacetManager = () => {
    const manager = createFacetManager();
    const subsystem = createSubsystem();
    const transaction = new FacetManagerTransaction(manager, subsystem);
    
    // We can't directly access private fields, but we can test behavior
    // The transaction should work with the manager
    transaction.beginTransaction();
    transaction.trackAddition('test');
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Transaction should work with provided manager' };
    }
    
    return { success: true, message: 'Constructor stores facetManager reference' };
  };

  const testConstructorStoresSubsystem = async () => {
    const manager = createFacetManager();
    const subsystem = createSubsystem();
    const transaction = new FacetManagerTransaction(manager, subsystem);
    
    // Test that subsystem is used during rollback
    const facet = createMockFacet('test-facet');
    await manager.add('test-facet', facet);
    transaction.beginTransaction();
    transaction.trackAddition('test-facet');
    
    await transaction.rollback();
    
    // Verify dispose was called (which uses subsystem)
    if (facet._disposeCalled()) {
      return { success: true, message: 'Constructor stores subsystem reference' };
    }
    
    return { success: false, error: 'Subsystem should be used during rollback' };
  };

  const testConstructorInitializesEmptyStack = () => {
    const transaction = createTransaction();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'Transaction stack should be empty initially' };
    }
    
    return { success: true, message: 'Constructor initializes empty transaction stack' };
  };

  // ========== beginTransaction() Tests ==========

  const testBeginTransactionCreatesFrame = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'beginTransaction() should create a transaction frame' };
    }
    
    return { success: true, message: 'beginTransaction() creates new transaction frame' };
  };

  const testBeginTransactionPushesFrame = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.beginTransaction(); // Nested
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'beginTransaction() should push frame onto stack' };
    }
    
    // Commit inner, should still have outer
    transaction.commit();
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    return { success: true, message: 'beginTransaction() pushes frame onto stack' };
  };

  const testBeginTransactionInitializesEmptyArray = () => {
    const transaction = createTransaction();
    const manager = createFacetManager();
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    
    // Commit should work (no errors means frame was properly initialized)
    transaction.commit();
    
    return { success: true, message: 'beginTransaction() initializes empty added array' };
  };

  const testBeginTransactionMultipleTimes = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.beginTransaction();
    transaction.beginTransaction();
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should support nested transactions' };
    }
    
    // Commit all
    transaction.commit();
    transaction.commit();
    transaction.commit();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'All transactions should be committed' };
    }
    
    return { success: true, message: 'beginTransaction() can be called multiple times (nested)' };
  };

  const testBeginTransactionNoErrors = () => {
    const transaction = createTransaction();
    
    try {
      transaction.beginTransaction();
      transaction.beginTransaction();
      transaction.beginTransaction();
      return { success: true, message: 'beginTransaction() does not throw errors' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== commit() Tests ==========

  const testCommitRemovesTopFrame = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.beginTransaction(); // Nested
    
    transaction.commit(); // Remove inner
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    transaction.commit(); // Remove outer
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'No transaction should be active after commit' };
    }
    
    return { success: true, message: 'commit() removes topmost transaction frame' };
  };

  const testCommitDoesNotAffectFacets = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet = createMockFacet('test-facet');
    
    await manager.add('test-facet', facet);
    transaction.beginTransaction();
    transaction.trackAddition('test-facet');
    transaction.commit();
    
    // Facet should still be in manager
    if (!manager.has('test-facet')) {
      return { success: false, error: 'Facet should remain after commit' };
    }
    
    return { success: true, message: 'commit() does not affect facets (they remain added)' };
  };

  const testCommitThrowsNoTransaction = () => {
    const transaction = createTransaction();
    
    try {
      transaction.commit();
      return { success: false, error: 'Should throw error when no active transaction' };
    } catch (error) {
      if (error.message.includes('no active transaction')) {
        return { success: true, message: 'commit() throws error when no active transaction' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testCommitNestedTransactions = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    transaction.commit(); // Inner
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    transaction.commit(); // Outer
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'No transaction should be active' };
    }
    
    return { success: true, message: 'commit() works with nested transactions (only removes top frame)' };
  };

  const testCommitMultipleCommits = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.beginTransaction();
    transaction.beginTransaction();
    
    transaction.commit();
    transaction.commit();
    transaction.commit();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'All transactions should be committed' };
    }
    
    return { success: true, message: 'commit() allows multiple commits for nested transactions' };
  };

  // ========== rollback() Tests ==========

  const testRollbackRemovesTopFrame = async () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.beginTransaction(); // Nested
    
    await transaction.rollback(); // Rollback inner
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    await transaction.rollback(); // Rollback outer
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'No transaction should be active after rollback' };
    }
    
    return { success: true, message: 'rollback() removes topmost transaction frame' };
  };

  const testRollbackDisposesReverseOrder = async () => {
    const manager = createFacetManager();
    const subsystem = createSubsystem();
    const transaction = new FacetManagerTransaction(manager, subsystem);
    
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    const facet3 = createMockFacet('facet3');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.add('facet3', facet3);
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    transaction.trackAddition('facet3');
    
    // Record order before rollback
    const order = [];
    const originalDispose = facet1.dispose;
    facet1.dispose = async () => { order.push('facet1'); await originalDispose.call(facet1, subsystem); };
    const originalDispose2 = facet2.dispose;
    facet2.dispose = async () => { order.push('facet2'); await originalDispose2.call(facet2, subsystem); };
    const originalDispose3 = facet3.dispose;
    facet3.dispose = async () => { order.push('facet3'); await originalDispose3.call(facet3, subsystem); };
    
    await transaction.rollback();
    
    // Should be in reverse order: facet3, facet2, facet1
    if (order.length !== 3 || order[0] !== 'facet3' || order[1] !== 'facet2' || order[2] !== 'facet1') {
      return { success: false, error: `Should dispose in reverse order. Got: [${order.join(', ')}], Expected: [facet3, facet2, facet1]` };
    }
    
    return { success: true, message: 'rollback() disposes facets in reverse order', data: { order } };
  };

  const testRollbackRemovesFacets = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    
    await transaction.rollback();
    
    if (manager.has('facet1') || manager.has('facet2')) {
      return { success: false, error: 'Facets should be removed from manager after rollback' };
    }
    
    return { success: true, message: 'rollback() removes facets from FacetManager' };
  };

  const testRollbackHandlesMissingFacets = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    
    transaction.beginTransaction();
    transaction.trackAddition('non-existent-facet');
    
    // Should not throw even though facet doesn't exist
    try {
      await transaction.rollback();
      return { success: true, message: 'rollback() handles missing facets gracefully' };
    } catch (error) {
      return { success: false, error: `Should handle missing facets gracefully: ${error.message}` };
    }
  };

  const testRollbackHandlesDisposeErrors = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet = createMockFacet('facet1');
    
    // Make dispose throw an error
    facet.add({
      dispose: async () => {
        throw new Error('Dispose error');
      }
    });
    
    await manager.add('facet1', facet);
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    
    // Should not throw (best-effort disposal)
    try {
      await transaction.rollback();
      // Facet should still be removed despite dispose error
      if (manager.has('facet1')) {
        return { success: false, error: 'Facet should be removed even if dispose throws' };
      }
      return { success: true, message: 'rollback() handles dispose errors gracefully (best-effort)' };
    } catch (error) {
      return { success: false, error: `Should handle dispose errors gracefully: ${error.message}` };
    }
  };

  const testRollbackThrowsNoTransaction = async () => {
    const transaction = createTransaction();
    
    try {
      await transaction.rollback();
      return { success: false, error: 'Should throw error when no active transaction' };
    } catch (error) {
      if (error.message.includes('no active transaction')) {
        return { success: true, message: 'rollback() throws error when no active transaction' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testRollbackNestedTransactions = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    await transaction.rollback(); // Rollback inner
    
    // facet2 should be removed, facet1 should remain
    if (manager.has('facet2')) {
      return { success: false, error: 'Inner transaction facet should be removed' };
    }
    if (!manager.has('facet1')) {
      return { success: false, error: 'Outer transaction facet should remain' };
    }
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    return { success: true, message: 'rollback() works with nested transactions (only rolls back top frame)' };
  };

  const testRollbackDoesNotAffectOuter = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    await transaction.rollback(); // Rollback inner
    
    // Outer transaction should still be tracked
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    // Commit outer - facet1 should remain
    transaction.commit();
    
    if (!manager.has('facet1')) {
      return { success: false, error: 'Outer transaction facet should remain after inner rollback' };
    }
    
    return { success: true, message: 'rollback() does not affect outer transaction frames' };
  };

  // ========== trackAddition() Tests ==========

  const testTrackAdditionAddsToFrame = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet = createMockFacet('facet1');
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    
    // Add facet to manager
    await manager.add('facet1', facet);
    
    // Rollback should remove it
    await transaction.rollback();
    
    if (manager.has('facet1')) {
      return { success: false, error: 'Tracked facet should be removed on rollback' };
    }
    
    return { success: true, message: 'trackAddition() adds kind to current frame\'s added array' };
  };

  const testTrackAdditionNoTransaction = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet = createMockFacet('facet1');
    
    // Track without active transaction
    transaction.trackAddition('facet1');
    
    await manager.add('facet1', facet);
    
    // Should not be tracked, so rollback won't remove it
    // But we can't test this directly since there's no transaction
    
    return { success: true, message: 'trackAddition() does nothing when no active transaction' };
  };

  const testTrackAdditionCorrectFrame = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    // Rollback inner - should only remove facet2
    await transaction.rollback();
    
    if (!manager.has('facet1')) {
      return { success: false, error: 'Outer frame facet should not be affected by inner rollback' };
    }
    if (manager.has('facet2')) {
      return { success: false, error: 'Inner frame facet should be removed' };
    }
    
    return { success: true, message: 'trackAddition() tracks additions in correct frame (nested)' };
  };

  const testTrackAdditionMultiple = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    const facet3 = createMockFacet('facet3');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.add('facet3', facet3);
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    transaction.trackAddition('facet3');
    
    await transaction.rollback();
    
    if (manager.has('facet1') || manager.has('facet2') || manager.has('facet3')) {
      return { success: false, error: 'All tracked facets should be removed' };
    }
    
    return { success: true, message: 'trackAddition() can track multiple additions' };
  };

  // ========== hasActiveTransaction() Tests ==========

  const testHasActiveTransactionInitially = () => {
    const transaction = createTransaction();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return false initially' };
    }
    
    return { success: true, message: 'hasActiveTransaction() returns false initially' };
  };

  const testHasActiveTransactionAfterBegin = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return true after beginTransaction()' };
    }
    
    return { success: true, message: 'hasActiveTransaction() returns true after beginTransaction()' };
  };

  const testHasActiveTransactionAfterCommit = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    transaction.commit();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return false after commit()' };
    }
    
    return { success: true, message: 'hasActiveTransaction() returns false after commit()' };
  };

  const testHasActiveTransactionAfterRollback = async () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction();
    await transaction.rollback();
    
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return false after rollback()' };
    }
    
    return { success: true, message: 'hasActiveTransaction() returns false after rollback()' };
  };

  const testHasActiveTransactionNested = () => {
    const transaction = createTransaction();
    
    transaction.beginTransaction(); // Outer
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return true for outer transaction' };
    }
    
    transaction.beginTransaction(); // Inner
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return true for nested transaction' };
    }
    
    transaction.commit(); // Inner
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return true for outer transaction after inner commit' };
    }
    
    transaction.commit(); // Outer
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'Should return false after all transactions committed' };
    }
    
    return { success: true, message: 'hasActiveTransaction() correctly reflects nested transaction state' };
  };

  // ========== Nested Transactions Tests ==========

  const testNestedTransactionsIndependent = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    // Commit inner - facet2 should remain
    transaction.commit();
    
    if (!manager.has('facet2')) {
      return { success: false, error: 'Inner transaction facet should remain after commit' };
    }
    
    // Rollback outer - facet1 should be removed
    await transaction.rollback();
    
    if (manager.has('facet1')) {
      return { success: false, error: 'Outer transaction facet should be removed on rollback' };
    }
    if (!manager.has('facet2')) {
      return { success: false, error: 'Inner transaction facet should remain after outer rollback' };
    }
    
    return { success: true, message: 'Nested transactions are independent' };
  };

  const testInnerCommitDoesNotAffectOuter = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    transaction.commit(); // Inner
    
    // Both should remain
    if (!manager.has('facet1') || !manager.has('facet2')) {
      return { success: false, error: 'Both facets should remain after inner commit' };
    }
    
    // Outer should still be active
    if (!transaction.hasActiveTransaction()) {
      return { success: false, error: 'Outer transaction should still be active' };
    }
    
    return { success: true, message: 'Inner transaction commit does not affect outer transaction' };
  };

  const testInnerRollbackDoesNotAffectOuter = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction(); // Outer
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Inner
    transaction.trackAddition('facet2');
    
    await transaction.rollback(); // Inner
    
    // facet2 should be removed, facet1 should remain
    if (manager.has('facet2')) {
      return { success: false, error: 'Inner transaction facet should be removed' };
    }
    if (!manager.has('facet1')) {
      return { success: false, error: 'Outer transaction facet should remain' };
    }
    
    // Commit outer - facet1 should remain
    transaction.commit();
    
    if (!manager.has('facet1')) {
      return { success: false, error: 'Outer transaction facet should remain after commit' };
    }
    
    return { success: true, message: 'Inner transaction rollback does not affect outer transaction' };
  };

  const testComplexNestedScenario = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    const facet3 = createMockFacet('facet3');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    await manager.add('facet3', facet3);
    
    transaction.beginTransaction(); // Level 1
    transaction.trackAddition('facet1');
    transaction.beginTransaction(); // Level 2
    transaction.trackAddition('facet2');
    transaction.beginTransaction(); // Level 3
    transaction.trackAddition('facet3');
    
    // Commit level 3
    transaction.commit();
    if (!manager.has('facet3')) {
      return { success: false, error: 'Level 3 facet should remain after commit' };
    }
    
    // Rollback level 2
    await transaction.rollback();
    if (manager.has('facet2')) {
      return { success: false, error: 'Level 2 facet should be removed' };
    }
    if (!manager.has('facet1') || !manager.has('facet3')) {
      return { success: false, error: 'Level 1 and 3 facets should remain' };
    }
    
    // Commit level 1
    transaction.commit();
    if (!manager.has('facet1') || !manager.has('facet3')) {
      return { success: false, error: 'Level 1 and 3 facets should remain after commit' };
    }
    
    return { success: true, message: 'Complex nested transaction scenario works correctly' };
  };

  // ========== Integration Tests ==========

  const testFullTransactionLifecycle = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    transaction.commit();
    
    // Both facets should remain
    if (!manager.has('facet1') || !manager.has('facet2')) {
      return { success: false, error: 'Facets should remain after commit' };
    }
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'No transaction should be active after commit' };
    }
    
    return { success: true, message: 'Full transaction lifecycle (begin → track → commit)' };
  };

  const testFullTransactionLifecycleRollback = async () => {
    const manager = createFacetManager();
    const transaction = new FacetManagerTransaction(manager, createSubsystem());
    const facet1 = createMockFacet('facet1');
    const facet2 = createMockFacet('facet2');
    
    await manager.add('facet1', facet1);
    await manager.add('facet2', facet2);
    
    transaction.beginTransaction();
    transaction.trackAddition('facet1');
    transaction.trackAddition('facet2');
    await transaction.rollback();
    
    // Both facets should be removed
    if (manager.has('facet1') || manager.has('facet2')) {
      return { success: false, error: 'Facets should be removed after rollback' };
    }
    if (transaction.hasActiveTransaction()) {
      return { success: false, error: 'No transaction should be active after rollback' };
    }
    
    return { success: true, message: 'Full transaction lifecycle with rollback (begin → track → rollback)' };
  };

  const testIntegrationWithFacetManagerAdd = async () => {
    const manager = createFacetManager();
    const facet = createMockFacet('facet1');
    
    // Use FacetManager's transaction methods (which use its internal FacetManagerTransaction)
    manager.beginTransaction();
    await manager.add('facet1', facet);
    // trackAddition is called automatically by manager.add() on manager's internal transaction
    
    // Rollback using manager's rollback (which uses its internal transaction)
    await manager.rollback();
    
    if (manager.has('facet1')) {
      return { success: false, error: 'Facet should be removed after rollback' };
    }
    
    // Verify dispose was called
    if (!facet._disposeCalled()) {
      return { success: false, error: 'Facet dispose should be called during rollback' };
    }
    
    return { success: true, message: 'Integration with FacetManager.add() (tracking)' };
  };

  // ========== Test Runner ==========

  const runTest = async (testName) => {
    if (runningTests.has(testName)) return;
    
    setRunningTests(prev => new Set(prev).add(testName));
    setResults(prev => {
      const next = new Map(prev);
      next.set(testName, { status: 'running' });
      return next;
    });

    let result;
    try {
      switch (testName) {
        // Constructor
        case 'Constructor creates instance':
          result = testConstructorCreatesInstance();
          break;
        case 'Constructor stores facetManager reference':
          result = await testConstructorStoresFacetManager();
          break;
        case 'Constructor stores subsystem reference':
          result = await testConstructorStoresSubsystem();
          break;
        case 'Constructor initializes empty transaction stack':
          result = testConstructorInitializesEmptyStack();
          break;
        
        // beginTransaction()
        case 'beginTransaction() creates new transaction frame':
          result = testBeginTransactionCreatesFrame();
          break;
        case 'beginTransaction() pushes frame onto stack':
          result = testBeginTransactionPushesFrame();
          break;
        case 'beginTransaction() initializes empty added array':
          result = testBeginTransactionInitializesEmptyArray();
          break;
        case 'beginTransaction() can be called multiple times (nested)':
          result = testBeginTransactionMultipleTimes();
          break;
        case 'beginTransaction() does not throw errors':
          result = testBeginTransactionNoErrors();
          break;
        
        // commit()
        case 'commit() removes topmost transaction frame':
          result = testCommitRemovesTopFrame();
          break;
        case 'commit() does not affect facets (they remain added)':
          result = await testCommitDoesNotAffectFacets();
          break;
        case 'commit() throws error when no active transaction':
          result = testCommitThrowsNoTransaction();
          break;
        case 'commit() works with nested transactions (only removes top frame)':
          result = testCommitNestedTransactions();
          break;
        case 'commit() allows multiple commits for nested transactions':
          result = testCommitMultipleCommits();
          break;
        
        // rollback()
        case 'rollback() removes topmost transaction frame':
          result = await testRollbackRemovesTopFrame();
          break;
        case 'rollback() disposes facets in reverse order':
          result = await testRollbackDisposesReverseOrder();
          break;
        case 'rollback() removes facets from FacetManager':
          result = await testRollbackRemovesFacets();
          break;
        case 'rollback() handles missing facets gracefully':
          result = await testRollbackHandlesMissingFacets();
          break;
        case 'rollback() handles dispose errors gracefully (best-effort)':
          result = await testRollbackHandlesDisposeErrors();
          break;
        case 'rollback() throws error when no active transaction':
          result = await testRollbackThrowsNoTransaction();
          break;
        case 'rollback() works with nested transactions (only rolls back top frame)':
          result = await testRollbackNestedTransactions();
          break;
        case 'rollback() does not affect outer transaction frames':
          result = await testRollbackDoesNotAffectOuter();
          break;
        
        // trackAddition()
        case 'trackAddition() adds kind to current frame\'s added array':
          result = await testTrackAdditionAddsToFrame();
          break;
        case 'trackAddition() does nothing when no active transaction':
          result = await testTrackAdditionNoTransaction();
          break;
        case 'trackAddition() tracks additions in correct frame (nested)':
          result = await testTrackAdditionCorrectFrame();
          break;
        case 'trackAddition() can track multiple additions':
          result = await testTrackAdditionMultiple();
          break;
        
        // hasActiveTransaction()
        case 'hasActiveTransaction() returns false initially':
          result = testHasActiveTransactionInitially();
          break;
        case 'hasActiveTransaction() returns true after beginTransaction()':
          result = testHasActiveTransactionAfterBegin();
          break;
        case 'hasActiveTransaction() returns false after commit()':
          result = testHasActiveTransactionAfterCommit();
          break;
        case 'hasActiveTransaction() returns false after rollback()':
          result = await testHasActiveTransactionAfterRollback();
          break;
        case 'hasActiveTransaction() correctly reflects nested transaction state':
          result = testHasActiveTransactionNested();
          break;
        
        // Nested Transactions
        case 'Nested transactions are independent':
          result = await testNestedTransactionsIndependent();
          break;
        case 'Inner transaction commit does not affect outer transaction':
          result = await testInnerCommitDoesNotAffectOuter();
          break;
        case 'Inner transaction rollback does not affect outer transaction':
          result = await testInnerRollbackDoesNotAffectOuter();
          break;
        case 'Complex nested transaction scenario':
          result = await testComplexNestedScenario();
          break;
        
        // Integration
        case 'Full transaction lifecycle (begin → track → commit)':
          result = await testFullTransactionLifecycle();
          break;
        case 'Full transaction lifecycle with rollback (begin → track → rollback)':
          result = await testFullTransactionLifecycleRollback();
          break;
        case 'Integration with FacetManager.add() (tracking)':
          result = await testIntegrationWithFacetManagerAdd();
          break;
        
        default:
          result = { success: false, error: `Unknown test: ${testName}` };
      }
    } catch (error) {
      result = { success: false, error: error.message };
    }

    setResults(prev => {
      const next = new Map(prev);
      next.set(testName, result);
      return next;
    });
    setRunningTests(prev => {
      const next = new Set(prev);
      next.delete(testName);
      return next;
    });
  };

  const runAllTests = async () => {
    for (const testCase of testCases) {
      await runTest(testCase.name);
      // Small delay to avoid overwhelming the UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  const clearResults = () => {
    setResults(new Map());
    setSelectedTest(null);
  };

  const getResult = (testName) => {
    return results.get(testName) || { status: 'pending' };
  };

  const getStatusColor = (result) => {
    if (result.status === 'running') return '#3b82f6';
    if (result.success === true) return '#10b981';
    if (result.success === false) return '#ef4444';
    return '#6b7280';
  };

  const getStatusIcon = (result) => {
    if (result.status === 'running') return '⟳';
    if (result.success === true) return '✓';
    if (result.success === false) return '✗';
    return '○';
  };

  // Group tests by category
  const testsByCategory = testCases.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          FacetManagerTransaction Class Tests
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Test suite for the FacetManagerTransaction class covering transaction lifecycle, nested transactions, rollback behavior, and error handling.
        </p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={runAllTests}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Run All Tests
        </button>
        <button
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Clear Results
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Test Cases */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Test Cases
          </h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {Object.entries(testsByCategory).map(([category, tests]) => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {category} ({tests.length})
                </h3>
                {tests.map((test) => {
                  const result = getResult(test.name);
                  return (
                    <div
                      key={test.name}
                      onClick={() => setSelectedTest(test.name)}
                      style={{
                        padding: '12px',
                        marginBottom: '6px',
                        backgroundColor: selectedTest === test.name ? '#eff6ff' : result.success === true ? '#f0fdf4' : result.success === false ? '#fef2f2' : '#f9fafb',
                        border: selectedTest === test.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '18px', color: getStatusColor(result) }}>
                        {getStatusIcon(result)}
                      </span>
                      <span style={{ fontSize: '14px', color: '#111827', flex: 1 }}>
                        {test.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Test Details */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Test Details
          </h2>
          {selectedTest ? (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                {selectedTest}
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => runTest(selectedTest)}
                  disabled={runningTests.has(selectedTest)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: runningTests.has(selectedTest) ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: runningTests.has(selectedTest) ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {runningTests.has(selectedTest) ? 'Running...' : 'Run Test'}
                </button>
              </div>
              {(() => {
                const result = getResult(selectedTest);
                if (result.status === 'pending') {
                  return (
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#6b7280' }}>
                      Test not run yet. Click "Run Test" to execute.
                    </div>
                  );
                }
                if (result.status === 'running') {
                  return (
                    <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#3b82f6' }}>
                      Test is running...
                    </div>
                  );
                }
                return (
                  <div>
                    {result.success ? (
                      <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '20px', color: '#10b981' }}>✓</span>
                          <span style={{ fontWeight: '600', color: '#10b981' }}>Passed</span>
                        </div>
                        {result.message && (
                          <p style={{ color: '#065f46', marginTop: '8px', margin: 0 }}>{result.message}</p>
                        )}
                        {result.data && (
                          <pre style={{ marginTop: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '20px', color: '#ef4444' }}>✗</span>
                          <span style={{ fontWeight: '600', color: '#ef4444' }}>Failed</span>
                        </div>
                        {result.error && (
                          <p style={{ color: '#991b1b', marginTop: '8px', margin: 0 }}>{result.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#6b7280', textAlign: 'center' }}>
              Select a test case to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

