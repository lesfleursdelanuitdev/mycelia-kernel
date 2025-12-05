import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/message-system/message-router.mycelia.js', () => ({
  MessageRouter: vi.fn().mockImplementation(() => ({
    route: vi.fn().mockResolvedValue({ success: true, subsystem: 'canvas', messageId: 'msg-1' }),
    routeToSubsystem: vi.fn().mockResolvedValue({ success: true }),
    getStatistics: vi.fn().mockReturnValue({ routed: 1 }),
    setKernel: vi.fn().mockReturnValue(true),
    clear: vi.fn(),
  })),
}));

import { useMessageSystemRouter } from '../message-system-router/use-message-system-router.mycelia.js';
import { MessageRouter } from '../../models/message-system/message-router.mycelia.js';

const createRouterFacet = ({ ctxOverrides = {}, config = {} } = {}) => {
  const ctx = {
    ms: {},
    subsystems: {},
    config: { messageSystemRouter: config },
    ...ctxOverrides,
  };
  const api = { name: 'canvas' };
  
  // Create a mock registry facet with _registry property
  const registryFacet = {
    _registry: ctx.subsystems || {},
  };
  
  const subsystem = {
    name: 'canvas',
    find: vi.fn((kind) => {
      if (kind === 'messageSystemRegistry') {
        return registryFacet;
      }
      return null;
    }),
  };
  
  return useMessageSystemRouter(ctx, api, subsystem);
};

describe('useMessageSystemRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires MessageSystem and subsystems registry', () => {
    const subsystemWithoutFind = { name: 'canvas' };
    expect(() => useMessageSystemRouter({ config: {} }, { name: 'canvas' }, subsystemWithoutFind)).toThrow(/MessageSystem/);
    
    const subsystemWithFind = {
      name: 'canvas',
      find: vi.fn(() => null), // Returns null (no registry facet)
    };
    expect(() => useMessageSystemRouter({ ms: {}, config: {} }, { name: 'canvas' }, subsystemWithFind)).toThrow(/messageSystemRegistry/);
  });

  it('creates MessageRouter with ctx-provided dependencies', () => {
    createRouterFacet({ config: { options: { strategy: 'round-robin' } } });
    expect(MessageRouter).toHaveBeenCalledWith(expect.any(Object), null, expect.any(Object), {
      debug: false,
      strategy: 'round-robin',
    });
  });

  it('routes messages and surfaces stats', async () => {
    const facet = createRouterFacet();
    const router = MessageRouter.mock.results.at(-1).value;
    const message = { id: 'msg-1' };

    const result = await facet.route(message, { callerId: Symbol('caller') });
    expect(router.route).toHaveBeenCalledWith(message, { callerId: expect.any(Symbol) });
    expect(result).toEqual({ success: true, subsystem: 'canvas', messageId: 'msg-1' });

    const targetSubsystem = { name: 'target', accept: vi.fn() };
    await facet.routeToSubsystem(message, targetSubsystem, { immediate: true });
    expect(router.routeToSubsystem).toHaveBeenCalledWith(message, targetSubsystem, { immediate: true });

    expect(facet.getStatistics()).toEqual({ routed: 1 });

    expect(facet.setKernel({ name: 'kernel' })).toBe(true);
    expect(router.setKernel).toHaveBeenCalled();

    facet.clear();
    expect(router.clear).toHaveBeenCalled();
  });
});

