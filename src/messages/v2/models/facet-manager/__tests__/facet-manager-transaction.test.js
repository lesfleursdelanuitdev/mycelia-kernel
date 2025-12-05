import { describe, it, expect, vi } from 'vitest';
import { FacetManagerTransaction } from '../facet-manager-transaction.mycelia.js';

const createFacetManagerStub = () => {
  const facets = new Map();
  return {
    find: vi.fn((kind) => facets.get(kind)),
    remove: vi.fn((kind) => facets.delete(kind)),
    facets,
  };
};

describe('FacetManagerTransaction', () => {
  it('commits and rolls back only with active frames', async () => {
    const manager = createFacetManagerStub();
    const subsystem = {};
    const txn = new FacetManagerTransaction(manager, subsystem);

    expect(() => txn.commit()).toThrow(/no active transaction/);
    expect(txn.hasActiveTransaction()).toBe(false);

    txn.beginTransaction();
    expect(txn.hasActiveTransaction()).toBe(true);
    txn.commit();
    expect(txn.hasActiveTransaction()).toBe(false);

    await expect(txn.rollback()).rejects.toThrow(/no active transaction/);
  });

  it('rolls back additions in reverse order', async () => {
    const manager = createFacetManagerStub();
    const subsystem = {};
    const txn = new FacetManagerTransaction(manager, subsystem);

    const facetA = { dispose: vi.fn() };
    const facetB = { dispose: vi.fn() };
    manager.facets.set('a', facetA);
    manager.facets.set('b', facetB);
    manager.find.mockImplementation((kind) => manager.facets.get(kind));

    txn.beginTransaction();
    txn.trackAddition('a');
    txn.trackAddition('b');
    await txn.rollback();

    expect(facetB.dispose).toHaveBeenCalled();
    expect(facetA.dispose).toHaveBeenCalled();
    expect(manager.remove).toHaveBeenCalledWith('b');
    expect(manager.remove).toHaveBeenCalledWith('a');
  });

  it('ignores trackAddition without active frame', () => {
    const txn = new FacetManagerTransaction(createFacetManagerStub(), {});
    expect(() => txn.trackAddition('a')).not.toThrow();
  });
});

