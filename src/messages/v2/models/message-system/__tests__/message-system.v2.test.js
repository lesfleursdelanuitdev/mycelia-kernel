import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.ctx = { config: options.config || {}, ms: null };
      this.debug = !!options.debug;
      this.api = { __facets: { find: vi.fn(), getAllKinds: vi.fn() }, name };
      this._isBuilt = false;
      this.use = vi.fn().mockReturnThis();
      this.build = vi.fn().mockResolvedValue(this);
      this.find = vi.fn().mockReturnValue(null);
    }
  }

  const KernelSubsystemMock = vi.fn(function KernelSubsystemMock() {
    this.bootstrap = vi.fn().mockResolvedValue(undefined);
    this.registerSubsystem = vi.fn((subsystem) => subsystem);
    this.setMsRouter = vi.fn();
  });

  return {
    BaseSubsystemMock,
    KernelSubsystemMock,
    DependencyGraphCache: vi.fn(),
    hooks: {
      useGlobalScheduler: vi.fn(),
      useMessages: vi.fn(),
      useMessageSystemRouter: vi.fn(),
      useMessageSystemRegistry: vi.fn(),
    },
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../kernel-subsystem/kernel.subsystem.mycelia.js', () => ({
  KernelSubsystem: hoisted.KernelSubsystemMock,
}));

vi.mock('../../subsystem-builder/dependency-graph-cache.mycelia.js', () => ({
  DependencyGraphCache: hoisted.DependencyGraphCache,
}));

vi.mock('../../../hooks/global-scheduler/use-global-scheduler.mycelia.js', () => ({
  useGlobalScheduler: hoisted.hooks.useGlobalScheduler,
}));
vi.mock('../../../hooks/messages/use-messages.mycelia.js', () => ({
  useMessages: hoisted.hooks.useMessages,
}));
vi.mock('../../../hooks/message-system-router/use-message-system-router.mycelia.js', () => ({
  useMessageSystemRouter: hoisted.hooks.useMessageSystemRouter,
}));
vi.mock('../../../hooks/message-system-registry/use-message-system-registry.mycelia.js', () => ({
  useMessageSystemRegistry: hoisted.hooks.useMessageSystemRegistry,
}));

import { MessageSystem } from '../message-system.v2.mycelia.js';

describe('MessageSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets up context and default hooks', () => {
    const ms = new MessageSystem('main', { config: { kernel: { foo: true } }, debug: true });
    expect(ms.defaultHooks).toEqual([
      hoisted.hooks.useGlobalScheduler,
      hoisted.hooks.useMessages,
      hoisted.hooks.useMessageSystemRegistry,
      hoisted.hooks.useMessageSystemRouter,
    ]);
  });

  it('bootstrap wires router and kernel', async () => {
    const ms = new MessageSystem('main', {});
    const router = { setKernel: vi.fn(), route: vi.fn(), find: vi.fn() };
    // Mock this.find() to return router (MessageSystem.find() calls this.find())
    ms.find = vi.fn((kind) => {
      if (kind === 'messageSystemRouter') return router;
      return null;
    });
    ms.api.__facets = {
      find: vi.fn().mockReturnValue(router),
      getAllKinds: vi.fn().mockReturnValue([]),
    };

    await ms.bootstrap();

    expect(ms.build).toHaveBeenCalledWith(expect.objectContaining({ graphCache: expect.any(Object) }));
    const kernelInstance = hoisted.KernelSubsystemMock.mock.instances.at(-1);
    expect(kernelInstance.setMsRouter).toHaveBeenCalledWith(router);
    expect(kernelInstance.bootstrap).toHaveBeenCalled();
  });

  it('registers subsystems and updates registry', async () => {
    const ms = new MessageSystem('main', {});
    const registry = {
      set: vi.fn().mockReturnValue(true),
      has: vi.fn(),
    };
    const scheduler = { start: vi.fn(), stop: vi.fn() };
    ms.find = vi.fn((kind) => {
      if (kind === 'messageSystemRegistry') return registry;
      if (kind === 'globalScheduler') return scheduler;
      return null;
    });
    const kernelInstance = hoisted.KernelSubsystemMock.mock.instances.at(-1);
    const subsystem = {
      name: 'test-subsystem',
      build: vi.fn().mockResolvedValue(undefined),
    };
    await ms.registerSubsystem(subsystem);
    expect(kernelInstance.registerSubsystem).toHaveBeenCalledWith(subsystem, expect.any(Object));
    expect(registry.set).toHaveBeenCalledWith('test-subsystem', subsystem);
  });

  it('send strips callerId and routes via router facet', async () => {
    const ms = new MessageSystem('main', { debug: true });
    const router = { setKernel: vi.fn(), route: vi.fn().mockResolvedValue('ok') };
    // Mock this.find() to return router (MessageSystem.send() calls this.find())
    ms.find = vi.fn((kind) => {
      if (kind === 'messageSystemRouter') return router;
      return null;
    });
    ms.api.__facets = {
      find: vi.fn().mockReturnValue(router),
      getAllKinds: vi.fn().mockReturnValue([]),
    };

    await ms.bootstrap();
    const result = await ms.send({ path: 'foo' }, { callerId: 'spoof', callerIdSetBy: 'spoof' });
    expect(router.route).toHaveBeenCalledWith({ path: 'foo' }, {});
    expect(result).toBe('ok');
  });
});

