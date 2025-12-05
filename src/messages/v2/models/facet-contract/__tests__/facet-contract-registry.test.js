import { describe, it, expect, vi } from 'vitest';
import { FacetContractRegistry } from '../facet-contract-registry.mycelia.js';
import { FacetContract } from '../facet-contract.mycelia.js';

const makeContract = (name = 'demo') =>
  new FacetContract(name, { requiredMethods: ['a'], requiredProperties: [] });

describe('FacetContractRegistry', () => {
  it('registers contracts and prevents duplicates', () => {
    const registry = new FacetContractRegistry();
    registry.register(makeContract('a'));
    expect(registry.has('a')).toBe(true);
    expect(() => registry.register(makeContract('a'))).toThrow(/already exists/);
  });

  it('enforces contracts and errors when missing', () => {
    const registry = new FacetContractRegistry();
    registry.register(makeContract('demo'));
    const facet = { a: () => {} };
    expect(() => registry.enforce('demo', {}, {}, {}, facet)).not.toThrow();
    expect(() => registry.enforce('missing', {}, {}, {}, {})).toThrow(/no contract/);
  });

  it('removes, lists, and clears registry entries', () => {
    const registry = new FacetContractRegistry();
    registry.register(makeContract('one'));
    registry.register(makeContract('two'));
    expect(registry.list().sort()).toEqual(['one', 'two']);
    expect(registry.size()).toBe(2);
    expect(registry.remove('one')).toBe(true);
    registry.clear();
    expect(registry.size()).toBe(0);
  });
});

