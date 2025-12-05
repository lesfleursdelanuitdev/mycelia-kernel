import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../listeners/listener-manager.mycelia.js', () => {
  const ListenerManager = vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnValue(true),
    off: vi.fn().mockReturnValue(true),
    emit: vi.fn().mockReturnValue(1),
    registerHandlerGroup: vi.fn().mockReturnValue(true),
    unregisterHandlerGroup: vi.fn().mockReturnValue(true),
  }));
  return { ListenerManager };
});

import { useListeners } from '../listeners/use-listeners.mycelia.js';
import { ListenerManager } from '../listeners/listener-manager.mycelia.js';

const createFacet = (config = {}, ctxOverrides = {}) => {
  const ctx = { config: { listeners: config }, ...ctxOverrides };
  const api = { name: 'canvas' };
  const subsystem = { name: 'canvas' };
  const facet = useListeners(ctx, api, subsystem);
  return { facet, ctx, api, subsystem };
};

const lastManagerInstance = () => {
  const result = ListenerManager.mock.results.at(-1);
  return result ? result.value : null;
};

describe('useListeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a listeners facet and instantiates ListenerManager with config defaults', () => {
    const { facet } = createFacet({
      registrationPolicy: 'single',
      policyOptions: { max: 5 },
      debug: true,
    });

    expect(facet.hasListeners()).toBe(false);
    facet.enableListeners();

    expect(ListenerManager).toHaveBeenCalledTimes(1);
    expect(ListenerManager).toHaveBeenCalledWith({
      registrationPolicy: 'single',
      debug: true,
      policyOptions: { max: 5 },
    });
    expect(facet.hasListeners()).toBe(true);
    expect(facet.listeners).toBe(lastManagerInstance());
    expect(facet._listenerManager()).toBe(lastManagerInstance());
  });

  it('allows runtime overrides when enabling listeners and memoizes the manager instance', () => {
    const { facet } = createFacet({}, { debug: false });
    facet.enableListeners({
      registrationPolicy: 'single',
      debug: true,
      policyOptions: { max: 1 },
    });

    expect(ListenerManager).toHaveBeenCalledWith({
      registrationPolicy: 'single',
      debug: true,
      policyOptions: { max: 1 },
    });

    facet.enableListeners({ registrationPolicy: 'multiple' });
    expect(ListenerManager).toHaveBeenCalledTimes(1);
  });

  it('refuses to register listeners when disabled and optionally logs in debug', () => {
    const { facet } = createFacet();
    const handler = vi.fn();

    expect(facet.on('path', handler)).toBe(false);
    expect(facet.off('path', handler)).toBe(false);
    expect(facet.emit('path', {})).toBe(0);
    expect(ListenerManager).not.toHaveBeenCalled();
  });

  it('delegates to ListenerManager when enabled', () => {
    const { facet } = createFacet();
    facet.enableListeners();
    const manager = lastManagerInstance();
    manager.emit.mockReturnValue(2);

    const handler = vi.fn();
    expect(facet.on('layers/create', handler)).toBe(true);
    expect(manager.on).toHaveBeenCalledWith('layers/create', handler);

    expect(facet.emit('layers/create', { body: {} })).toBe(2);
    expect(manager.emit).toHaveBeenCalledWith('layers/create', { body: {} });

    expect(facet.off('layers/create', handler)).toBe(true);
    expect(manager.off).toHaveBeenCalledWith('layers/create', handler);

    facet.disableListeners();
    expect(facet.hasListeners()).toBe(false);
    expect(facet.emit('layers/create', {})).toBe(0);
  });

  it('supports handler group registration via ListenerManager helpers', () => {
    const { facet } = createFacet();
    facet.enableListeners();
    const manager = lastManagerInstance();
    const handlerGroup = {
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      onTimeout: vi.fn(),
    };

    expect(facet.on('query/run', handlerGroup, { isHandlerGroup: true })).toBe(true);
    expect(manager.registerHandlerGroup).toHaveBeenCalledWith(
      'query/run',
      handlerGroup,
      { isHandlerGroup: true },
    );

    expect(facet.off('query/run', handlerGroup, { isHandlerGroup: true })).toBe(true);
    expect(manager.unregisterHandlerGroup).toHaveBeenCalledWith(
      'query/run',
      handlerGroup,
      { isHandlerGroup: true },
    );
  });
});

