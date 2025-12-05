import { describe, it, expect, vi } from 'vitest';
import { FacetContract, createFacetContract } from '../facet-contract.mycelia.js';

describe('FacetContract', () => {
  it('validates constructor arguments', () => {
    expect(() => new FacetContract('', {})).toThrow(/name/);
    expect(() => new FacetContract('test', null)).toThrow(/requirements/);
    expect(() => new FacetContract('test', {}, 'not-fn')).toThrow(/validate/);
  });

  it('enforces required methods and properties', () => {
    const contract = new FacetContract('demo', {
      requiredMethods: ['a', 'b'],
      requiredProperties: ['prop'],
    });
    const goodFacet = { a: () => {}, b: () => {}, prop: 1 };
    expect(() => contract.enforce({}, {}, {}, goodFacet)).not.toThrow();

    const missingMethod = { a: () => {}, prop: 1 };
    expect(() => contract.enforce({}, {}, {}, missingMethod)).toThrow(/missing required methods/);

    const missingProp = { a: () => {}, b: () => {} };
    expect(() => contract.enforce({}, {}, {}, missingProp)).toThrow(/missing required properties/);
  });

  it('runs custom validators and surfaces errors', () => {
    const validate = vi.fn((ctx, api, subsystem, facet) => {
      if (!facet.ok) throw new Error('not ok');
    });
    const contract = new FacetContract('custom', {}, validate);
    expect(() => contract.enforce({}, {}, {}, { ok: true })).not.toThrow();
    expect(() => contract.enforce({}, {}, {}, { ok: false })).toThrow(/validation failed/);
    expect(validate).toHaveBeenCalled();
  });

  it('createFacetContract factory builds contract', () => {
    const contract = createFacetContract({ name: 'factory', requiredMethods: ['x'] });
    expect(contract).toBeInstanceOf(FacetContract);
    expect(() => contract.enforce({}, {}, {}, { x: () => {} })).not.toThrow();
  });
});

