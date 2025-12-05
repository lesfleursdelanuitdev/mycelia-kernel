import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../queries/QueryHandlerManager.mycelia.js', () => {
  const QueryHandlerManager = vi.fn().mockImplementation(() => ({
    registerRoute: vi.fn(),
    registerNamedQuery: vi.fn(),
  }));
  return { QueryHandlerManager };
});

import { useQueries } from '../queries/use-queries.mycelia.js';
import { QueryHandlerManager } from '../queries/QueryHandlerManager.mycelia.js';

const buildRequestsFacet = () => {
  const builder = {
    with: vi.fn().mockReturnThis(),
    forMessage: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue('response'),
  };
  return {
    oneShot: vi.fn().mockReturnValue(builder),
    builder,
  };
};

const createFacet = ({
  router = {},
  requests = buildRequestsFacet(),
  ctx = {},
  subsystemOverrides = {},
  messagesFacet = null,
} = {}) => {
  const api = {
    name: 'canvas',
    __facets: {
      router,
      requests,
    },
  };
  const subsystem = {
    name: 'canvas',
    debug: false,
    find: vi.fn((kind) => {
      if (kind === 'router') return router;
      if (kind === 'requests') return requests;
      if (kind === 'messages') return messagesFacet;
      return undefined;
    }),
    ...subsystemOverrides,
  };
  const facet = useQueries({ ...ctx }, api, subsystem);
  return { facet, api, subsystem, requests, messagesFacet };
};

const lastQhm = () => {
  const result = QueryHandlerManager.mock.results.at(-1);
  return result ? result.value : null;
};

describe('useQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires router and requests facets', () => {
    const ctx = {};
    const subsystemNoRouter = {
      name: 'canvas',
      find: vi.fn((kind) => {
        if (kind === 'requests') return {};
        return null;
      }),
    };
    expect(() => useQueries(ctx, { name: 'canvas', __facets: { requests: {} } }, subsystemNoRouter))
      .toThrow(/router facet is required/);
    
    const subsystemNoRequests = {
      name: 'canvas',
      find: vi.fn((kind) => {
        if (kind === 'router') return {};
        return null;
      }),
    };
    expect(() => useQueries(ctx, { name: 'canvas', __facets: { router: {} } }, subsystemNoRequests))
      .toThrow(/requests facet is required/);
  });

  it('constructs QueryHandlerManager with router, subsystem name, and debug flag', () => {
    const router = {};
    createFacet({ router, ctx: { debug: true } });
    expect(QueryHandlerManager).toHaveBeenCalledWith({
      router,
      name: 'canvas',
      debug: true,
    });
  });

  it('delegates registerRoute and register to QueryHandlerManager', () => {
    const { facet } = createFacet();
    const qhm = lastQhm();
    qhm.registerRoute.mockReturnValue('route-id');
    qhm.registerNamedQuery.mockReturnValue('named-id');

    expect(facet.registerRoute('query/run', vi.fn(), { metadata: { foo: 'bar' } }))
      .toBe('route-id');
    expect(qhm.registerRoute).toHaveBeenCalledWith(
      'query/run',
      expect.any(Function),
      { metadata: { foo: 'bar' } },
    );

    expect(facet.register('getBoard', vi.fn(), { timeout: 1000 })).toBe('named-id');
    expect(qhm.registerNamedQuery).toHaveBeenCalledWith('getBoard', expect.any(Function), { timeout: 1000 });
  });

  it('runs ask() by building messages via messages facet when present', async () => {
    const messagesFacet = { create: vi.fn().mockReturnValue({ path: 'query/getBoard', body: { id: 1 } }) };
    const requests = buildRequestsFacet();
    const { facet } = createFacet({ requests, messagesFacet });

    const result = await facet.ask('getBoard', { id: 1 }, { headers: { foo: 'bar' } });

    expect(messagesFacet.create).toHaveBeenCalledWith('query/getBoard', { id: 1 });
    expect(requests.oneShot).toHaveBeenCalled();
    expect(requests.builder.with).toHaveBeenCalledWith({ headers: { foo: 'bar' } });
    expect(requests.builder.forMessage).toHaveBeenCalledWith({ path: 'query/getBoard', body: { id: 1 } });
    expect(requests.builder.send).toHaveBeenCalled();
    expect(result).toBe('response');
  });

  it('falls back to minimal message shape when messages facet is absent', async () => {
    const requests = buildRequestsFacet();
    requests.builder.send.mockResolvedValue('done');
    const { facet } = createFacet({ requests, messagesFacet: null });

    const result = await facet.ask('canvas://query/getBoard', { foo: 'bar' });

    expect(requests.builder.forMessage).toHaveBeenCalledWith({
      path: 'canvas://query/getBoard',
      body: { foo: 'bar' },
      meta: {},
    });
    expect(result).toBe('done');
  });

  it('treats values with slashes or schemes as explicit paths', async () => {
    const messagesFacet = { create: vi.fn().mockReturnValue({ path: 'custom/path', body: null }) };
    const requests = buildRequestsFacet();
    const { facet } = createFacet({ requests, messagesFacet });

    await facet.ask('custom/path');
    expect(messagesFacet.create).toHaveBeenCalledWith('custom/path', undefined);

    await facet.ask('canvas://query/run');
    expect(messagesFacet.create).toHaveBeenCalledWith('canvas://query/run', undefined);
  });
});

