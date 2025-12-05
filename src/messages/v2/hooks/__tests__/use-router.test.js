import { describe, it, expect, vi, beforeEach } from 'vitest';

const routerInstance = () => ({
  register: vi.fn(),
  unregister: vi.fn().mockReturnValue(true),
  hasRoute: vi.fn().mockReturnValue(false),
  getRoutes: vi.fn().mockReturnValue([]),
  match: vi.fn(),
});

vi.mock('../router/subsystem-router.mycelia.js', () => {
  const SubsystemRouter = vi.fn().mockImplementation(() => routerInstance());
  return { SubsystemRouter };
});

import { useRouter } from '../router/use-router.mycelia.js';
import { SubsystemRouter } from '../router/subsystem-router.mycelia.js';

const createFacet = ({ config = {}, subsystemOverrides = {} } = {}) => {
  const api = { name: 'canvas' };
  const subsystem = {
    name: 'canvas',
    identity: undefined,
    ...subsystemOverrides,
  };
  const ctx = { config: { router: config } };
  const facet = useRouter(ctx, api, subsystem);
  return { facet, subsystem };
};

const getRouter = () => {
  const result = SubsystemRouter.mock.results.at(-1);
  return result ? result.value : null;
};

describe('useRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a SubsystemRouter with config overrides', () => {
    createFacet({ config: { cacheCapacity: 10, debug: true } });
    expect(SubsystemRouter).toHaveBeenCalledWith(expect.any(Object), {
      cacheCapacity: 10,
      debug: true,
    });
  });

  it('registers routes and logs failures', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { facet } = createFacet();
    const router = getRouter();
    const handler = vi.fn();

    expect(facet.registerRoute('path', handler, { priority: 1 })).toBe(true);
    expect(router.register).toHaveBeenCalledWith('path', handler, { priority: 1 });

    router.register.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => facet.registerRoute('bad', handler)).toThrow('boom');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('registers multiple routes skipping invalid entries', () => {
    const { facet } = createFacet();
    const router = getRouter();
    const handler = vi.fn();

    const count = facet.registerRoutes([
      { pattern: 'valid', handler },
      { pattern: 'missing handler' },
      { pattern: 'bad', handler },
    ]);
    expect(count).toBe(2);
    expect(router.register).toHaveBeenCalledTimes(2);
  });

  it('supports unregister, hasRoute, getRoutes passthrough', () => {
    const { facet } = createFacet();
    const router = getRouter();
    router.hasRoute.mockReturnValue(true);
    router.getRoutes.mockReturnValue([{ pattern: 'x' }]);

    expect(facet.unregisterRoute('foo')).toBe(true);
    expect(router.unregister).toHaveBeenCalledWith('foo');
    expect(facet.hasRoute('foo')).toBe(true);
    expect(router.hasRoute).toHaveBeenCalledWith('foo');
    expect(facet.getRoutes()).toEqual([{ pattern: 'x' }]);
  });

  it('matches routes and wraps handlers with auth when metadata requires permissions', () => {
    const requireAuth = vi.fn((_required, handler) => handler);
    const { facet, subsystem } = createFacet({
      subsystemOverrides: {
        identity: { requireAuth },
      },
    });
    const router = getRouter();
    const matchResult = {
      routeEntry: {
        handler: vi.fn(),
        metadata: { required: 'write' },
      },
      params: { id: '123' },
    };
    router.match.mockReturnValue(matchResult);

    const match = facet.match('path');
    expect(requireAuth).toHaveBeenCalledWith('write', matchResult.routeEntry.handler, {});
    expect(match.params).toEqual({ id: '123' });

    const absent = facet.match('');
    expect(absent).toBeNull();
  });

  it('routes messages by matching paths and sanitizing options', async () => {
    const { facet } = createFacet();
    const router = getRouter();
    const handler = vi.fn().mockResolvedValue('ok');
    router.match.mockReturnValue({
      routeEntry: { handler, metadata: {} },
      params: { id: '1' },
    });
    const message = { getPath: () => 'foo' };

    const result = await facet.route(message, { callerIdSetBy: 'kernel', debug: true });
    expect(handler).toHaveBeenCalledWith(message, { id: '1' }, { debug: true });
    expect(result).toBe('ok');
  });

  it('route returns null when no match and throws for invalid messages', async () => {
    const { facet } = createFacet();
    const router = getRouter();
    router.match.mockReturnValue(null);

    const message = { getPath: () => 'foo' };
    const result = await facet.route(message);
    expect(result).toBeNull();

    await expect(facet.route(null)).rejects.toThrow(/getPath/);
    await expect(facet.route({ getPath: () => '' })).rejects.toThrow(/non-empty string/);
  });
});

