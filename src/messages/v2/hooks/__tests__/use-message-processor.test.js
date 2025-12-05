import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../message-processor/accept-message.mycelia.js', () => ({
  acceptMessage: vi.fn().mockResolvedValue(true),
}));

import { useMessageProcessor } from '../message-processor/use-message-processor.mycelia.js';
import { acceptMessage } from '../message-processor/accept-message.mycelia.js';

const buildFacets = () => {
  const router = {
    facetKind: 'router',
    _routeRegistry: {
      match: vi.fn(),
      getRoutes: vi.fn().mockReturnValue([]),
    },
    route: vi.fn().mockResolvedValue({ success: true, data: 'processed' }),
  };
  const statistics = {
    facetKind: 'statistics',
    _statistics: {
      recordAccepted: vi.fn(),
      recordError: vi.fn(),
      recordProcessed: vi.fn(),
    },
  };
  const queue = {
    facetKind: 'queue',
    _queueManager: {},
    selectNextMessage: vi.fn(),
  };
  return { router, statistics, queue };
};

const createProcessorFacet = (overrides = {}) => {
  const ctx = { ms: {}, config: {}, ...overrides.ctx };
  const facets = buildFacets();
  const facetManager = {
    ...facets,
    find: (kind) => facets[kind] || null,
  };
  const api = {
    name: 'canvas',
    __facets: facetManager,
    ...overrides.api,
  };
  const subsystem = {
    name: 'canvas',
    find: (kind) => facets[kind] || null,
    ...overrides.subsystem,
  };
  const facet = useMessageProcessor(ctx, api, subsystem);
  return { facet, facets, subsystem };
};

describe('useMessageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires statistics/queue facets', () => {
    const ctx = { ms: {} };
    const subsystem = {};
    expect(() => useMessageProcessor(ctx, { name: 'canvas', __facets: {} }, subsystem))
      .toThrow(/statistics facet not found/);
  });

  it('processes messages via router facet route() method', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };

    const result = await facet.processMessage(message, { callerId: Symbol('caller') });
    
    expect(facets.router.route).toHaveBeenCalledWith(message, { callerId: expect.any(Symbol) });
    expect(result).toEqual({ success: true, data: 'processed' });
  });

  it('processes messages with pair format', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };
    const pair = { msg: message, options: { callerId: Symbol('caller') } };

    const result = await facet.processMessage(pair, { extra: 'option' });
    
    expect(facets.router.route).toHaveBeenCalledWith(
      message,
      expect.objectContaining({ callerId: expect.any(Symbol), extra: 'option' })
    );
    expect(result).toEqual({ success: true, data: 'processed' });
  });

  it('processImmediately processes messages without queuing', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };

    const result = await facet.processImmediately(message, { callerId: Symbol('caller') });
    
    expect(facets.router.route).toHaveBeenCalledWith(message, { callerId: expect.any(Symbol) });
    expect(result).toEqual({ success: true, data: 'processed' });
  });

  it('processTick consumes queue entries and delegates to processMessage', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };
    facets.queue.selectNextMessage.mockReturnValue({ msg: message, options: { callerId: Symbol('id') } });

    const result = await facet.processTick();
    
    expect(facets.queue.selectNextMessage).toHaveBeenCalled();
    expect(facets.router.route).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: 'processed' });
  });

  it('processTick returns null when queue is empty', async () => {
    const { facet, facets } = createProcessorFacet();
    facets.queue.selectNextMessage.mockReturnValue(null);

    const result = await facet.processTick();
    
    expect(facets.queue.selectNextMessage).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('accept records stats and delegates to acceptMessage helper', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1 };
    await facet.accept(message, { currentPiece: 'x' });

    expect(acceptMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        queueManager: facets.queue._queueManager,
      }),
      message,
      { currentPiece: 'x' },
    );
  });

  it('throws error when router.route() is not available', async () => {
    const { facet, facets } = createProcessorFacet();
    // Remove route() method to trigger error
    delete facets.router.route;
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };

    await expect(facet.processImmediately(message, { callerId: Symbol('caller') }))
      .rejects.toThrow(/Router facet does not have a route\(\) method/);
    
    expect(facets.statistics._statistics.recordError).toHaveBeenCalled();
  });

  it('records statistics on successful processing', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };

    await facet.processImmediately(message);
    
    expect(facets.statistics._statistics.recordProcessed).toHaveBeenCalled();
  });

  it('records errors on processing failure', async () => {
    const { facet, facets } = createProcessorFacet();
    const message = { id: 1, getPath: () => 'test/path', getId: () => '1' };
    facets.router.route.mockRejectedValue(new Error('Processing failed'));

    await expect(facet.processImmediately(message)).rejects.toThrow('Processing failed');
    
    expect(facets.statistics._statistics.recordError).toHaveBeenCalled();
  });
});

