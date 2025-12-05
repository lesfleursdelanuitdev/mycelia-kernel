import { describe, it, expect } from 'vitest';
import { useMessageSystemRegistry } from '../message-system-registry/use-message-system-registry.mycelia.js';

const createFacet = () => {
  const ctx = { config: {} };
  const api = { name: 'host-subsystem' };
  const subsystem = {};
  return useMessageSystemRegistry(ctx, api, subsystem);
};

describe('useMessageSystemRegistry', () => {
  it('creates a registry facet with attach semantics', () => {
    const facet = createFacet();
    expect(facet.getKind()).toBe('messageSystemRegistry');
    expect(facet.shouldAttach()).toBe(true);
  });

  it('registers subsystems and exposes query helpers', () => {
    const facet = createFacet();
    const canvas = { name: 'canvas' };
    const worker = { name: 'worker' };

    expect(facet.set('canvas', canvas)).toBe(true);
    expect(facet.set('worker', worker)).toBe(true);

    expect(facet.get('canvas')).toBe(canvas);
    expect(facet.find('worker')).toBe(worker);
    expect(facet.getNames()).toEqual(expect.arrayContaining(['canvas', 'worker']));
    expect(facet.has('worker')).toBe(true);
    expect(facet.size).toBe(2);
    expect(facet.keys()).toEqual(expect.arrayContaining(['canvas', 'worker']));
    expect(facet.values()).toEqual(expect.arrayContaining([canvas, worker]));
    expect(Array.from(facet)).toEqual(
      expect.arrayContaining([
        ['canvas', canvas],
        ['worker', worker],
      ]),
    );
  });

  it('deletes and clears registry entries', () => {
    const facet = createFacet();
    facet.set('canvas', { name: 'canvas' });

    expect(facet.delete('canvas')).toBe(true);
    expect(facet.has('canvas')).toBe(false);

    facet.set('worker', { name: 'worker' });
    facet.clear();
    expect(facet.size).toBe(0);
    expect(facet.getNames()).toHaveLength(0);
  });

  it('rejects reserved subsystem names', () => {
    const facet = createFacet();
    expect(() => facet.set('kernel', {})).toThrow(/reserved name/i);
    expect(() => facet.set('query', {})).toThrow(/reserved name/i);
  });
});

