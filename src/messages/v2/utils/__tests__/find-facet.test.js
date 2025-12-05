import { describe, it, expect } from 'vitest';
import { findFacet } from '../find-facet.utils.mycelia.js';

describe('findFacet', () => {
  it('returns false when manager missing or facet absent', () => {
    expect(findFacet(null, 'router')).toBe(false);
    const manager = { find: () => null };
    expect(findFacet(manager, 'router')).toBe(false);
  });

  it('wraps found facets with result flag', () => {
    const facet = { name: 'router' };
    const manager = { find: () => facet };
    const result = findFacet(manager, 'router');
    expect(result).toEqual({ result: true, facet });
  });
});

