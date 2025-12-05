import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSynchronous } from '../synchronous/use-synchronous.mycelia.js';

const buildFacets = (overrides = {}) => ({
  processor: {
    processImmediately: vi.fn().mockResolvedValue('immediate'),
    processMessage: vi.fn().mockResolvedValue('message'),
    processTick: vi.fn().mockResolvedValue(null),
    facetKind: 'processor',
  },
  statistics: { facetKind: 'statistics' },
  listeners: { facetKind: 'listeners' },
  queries: { facetKind: 'queries' },
  ...overrides,
});

const createFacet = (facetsOverrides = {}) => {
  const facets = buildFacets(facetsOverrides);
  const facetManager = {
    ...facets,
    find: (kind) => facets[kind] || null,
  };
  const api = {
    name: 'kernel',
    __facets: facetManager,
  };
  const subsystem = {};
  const ctx = { config: {} };
  const facet = useSynchronous(ctx, api, subsystem);
  return { facet, facets, api };
};

describe('useSynchronous', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires processor, statistics, listeners, queries facets', () => {
    const api = { name: 'kernel', __facets: {} };
    expect(() => useSynchronous({}, api, {})).toThrow(/processor facet not found/);
  });

  it('marks API as synchronous and delegates accept to processor', async () => {
    const { facet, facets, api } = createFacet();
    expect(api.isSynchronous).toBe(true);

    const message = { meta: {} };
    const result = await facet.accept(message);
    expect(message.meta.processImmediately).toBe(true);
    expect(facets.processor.processImmediately).toHaveBeenCalledWith(message, {});
    expect(result).toBe('immediate');
  });

  it('falls back to processMessage when processImmediately missing', async () => {
    const { facet, facets } = createFacet({
      processor: {
        processMessage: vi.fn().mockResolvedValue('message'),
      },
    });

    const message = { meta: {} };
    const result = await facet.accept(message);

    expect(facets.processor.processMessage).toHaveBeenCalled();
    expect(result).toBe('message');
  });

  it('delegates processMessage, processImmediately, processTick, process', async () => {
    const { facet, facets } = createFacet();
    await facet.processMessage({ id: 1 });
    expect(facets.processor.processMessage).toHaveBeenCalled();

    await facet.processImmediately({ id: 1 });
    expect(facets.processor.processImmediately).toHaveBeenCalledTimes(1);

    await facet.processTick();
    expect(facets.processor.processTick).toHaveBeenCalled();

    await facet.process();
    expect(facets.processor.processTick).toHaveBeenCalledTimes(2);
  });
});

