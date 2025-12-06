import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.messageSystem = options.ms;
      this.use = vi.fn().mockReturnThis();
      this.build = vi.fn().mockResolvedValue(this);
      this.accept = vi.fn();
      this.process = vi.fn();
      this.getNameString = vi.fn().mockReturnValue(`${name}://`);
      this.pause = vi.fn();
      this.resume = vi.fn();
      this.dispose = vi.fn();
      this.find = vi.fn().mockReturnValue(null);
    }
  }

  return {
    BaseSubsystemMock,
    createSynchronousDefaultHooks: vi.fn().mockReturnValue(['hook']),
    useKernelServices: vi.fn(),
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../defaults/default-hooks.mycelia.js', () => ({
  createSynchronousDefaultHooks: hoisted.createSynchronousDefaultHooks,
}));

vi.mock('../../../hooks/kernel-services/use-kernel-services.mycelia.js', () => ({
  useKernelServices: hoisted.useKernelServices,
}));

import { KernelSubsystem } from '../kernel.subsystem.mycelia.js';

describe('KernelSubsystem', () => {
  const ms = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces kernel name and installs default hooks', () => {
    expect(() => new KernelSubsystem('not-kernel', { ms })).toThrow(/name must be "kernel"/);
    const kernel = new KernelSubsystem('kernel', { ms });
    expect(hoisted.createSynchronousDefaultHooks).toHaveBeenCalled();
    expect(kernel.use).toHaveBeenCalledWith(hoisted.useKernelServices);
  });

  it('sets ms router only once', () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    const router = { route: vi.fn() };
    kernel.setMsRouter(router);
    expect(() => kernel.setMsRouter(router)).toThrow(/already set/);
  });

  it('registers subsystems via access control and wraps listeners', () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    const listeners = {
      hasListeners: vi.fn().mockReturnValue(false),
      enableListeners: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    const childSubsystem = {
      accept: vi.fn(),
      process: vi.fn(),
      getNameString: vi.fn().mockReturnValue('child://'),
      pause: vi.fn(),
      resume: vi.fn(),
      dispose: vi.fn(),
      identity: { pkr: { uuid: 'child' } },
      find: vi.fn((kind) => {
        if (kind === 'hierarchy') {
          return { traverse: (fn) => fn({ name: 'grandchild' }) };
        }
        if (kind === 'listeners') {
          return listeners;
        }
        return null;
      }),
    };
    const accessControl = {
      wireSubsystem: vi.fn().mockReturnValue({ subsystem: childSubsystem }),
    };
    kernel.getAccessControl = vi.fn().mockReturnValue(accessControl);

    const wrapper = kernel.registerSubsystem(childSubsystem, { metadata: { foo: true } });
    expect(accessControl.wireSubsystem).toHaveBeenCalledWith('topLevel', childSubsystem, { metadata: { foo: true } });
    expect(wrapper.getNameString()).toBe('child://');
    wrapper.listeners.on('event', vi.fn());
    expect(listeners.enableListeners).toHaveBeenCalled();
  });

  it('sendProtected enforces ACL and response handling', async () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    kernel.identity = { pkr: Symbol('kernel') };
    const router = { route: vi.fn().mockResolvedValue('ok') };
    kernel.setMsRouter(router);

    const channelManager = {
      getChannel: vi.fn().mockReturnValue({}),
      verifyAccess: vi.fn().mockReturnValue(true),
    };
    kernel.getChannelManager = vi.fn().mockReturnValue(channelManager);

    const responseManager = {
      registerResponseRequiredFor: vi.fn(),
      handleResponse: vi.fn().mockReturnValue({ ok: true }),
    };
    kernel.getResponseManager = vi.fn().mockReturnValue(responseManager);

    const message = { path: 'canvas://channel/foo', getId: vi.fn().mockReturnValue('msg-1') };
    await kernel.sendProtected({ uuid: 'caller' }, message, {
      callerId: 'spoof',
      responseRequired: { replyTo: 'canvas://reply', timeout: 1000 },
    });

    expect(router.route).toHaveBeenCalledWith(
      message,
      expect.objectContaining({
        callerId: { uuid: 'caller' },
        callerIdSetBy: kernel.identity.pkr,
      }),
    );
    expect(channelManager.verifyAccess).toHaveBeenCalled();
    expect(responseManager.registerResponseRequiredFor).toHaveBeenCalled();
  });

  it('sendProtected handles response paths and one-shot bypass', async () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    kernel.identity = { pkr: Symbol('kernel') };
    const router = { route: vi.fn().mockResolvedValue('ok') };
    kernel.setMsRouter(router);

    kernel.getChannelManager = vi.fn().mockReturnValue({
      getChannel: vi.fn(),
      verifyAccess: vi.fn(),
    });
    kernel.getResponseManager = vi.fn().mockReturnValue({
      handleResponse: vi.fn().mockReturnValue({ ok: true }),
    });

    const message = { path: 'kernel://request/oneShot/123' };
    await kernel.sendProtected({ uuid: 'caller' }, message, { isResponse: true });
    expect(router.route).toHaveBeenCalledTimes(1);
    expect(kernel.getChannelManager().verifyAccess).not.toHaveBeenCalled();
  });

  it('sendPooledProtected uses pool and enforces security', async () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    kernel.identity = { pkr: Symbol('kernel') };
    const router = { route: vi.fn().mockResolvedValue('ok') };
    kernel.setMsRouter(router);

    const channelManager = {
      getChannel: vi.fn().mockReturnValue({}),
      verifyAccess: vi.fn().mockReturnValue(true),
    };
    kernel.getChannelManager = vi.fn().mockReturnValue(channelManager);

    const responseManager = {
      registerResponseRequiredFor: vi.fn(),
      handleResponse: vi.fn().mockReturnValue({ ok: true }),
    };
    kernel.getResponseManager = vi.fn().mockReturnValue(responseManager);

    // Mock MessageSystem with pool methods
    const mockMessage = { path: 'canvas://channel/foo', getId: vi.fn().mockReturnValue('msg-1') };
    const acquireSpy = vi.fn().mockReturnValue(mockMessage);
    const releaseSpy = vi.fn();
    kernel.messageSystem = {
      acquirePooledMessage: acquireSpy,
      releasePooledMessage: releaseSpy,
    };

    await kernel.sendPooledProtected(
      { uuid: 'caller' },
      'canvas://channel/foo',
      { action: 'test' },
      {
        callerId: 'spoof',
        meta: { traceId: 'abc123' },
        responseRequired: { replyTo: 'canvas://reply', timeout: 1000 },
      }
    );

    // Verify pool was used
    expect(acquireSpy).toHaveBeenCalledWith('canvas://channel/foo', { action: 'test' }, { traceId: 'abc123' });
    expect(releaseSpy).toHaveBeenCalledWith(mockMessage);

    // Verify security was enforced
    expect(router.route).toHaveBeenCalledWith(
      mockMessage,
      expect.objectContaining({
        callerId: { uuid: 'caller' },
        callerIdSetBy: kernel.identity.pkr,
      }),
    );
    expect(channelManager.verifyAccess).toHaveBeenCalled();
    expect(responseManager.registerResponseRequiredFor).toHaveBeenCalled();
  });

  it('sendPooledProtected releases message even on error', async () => {
    const kernel = new KernelSubsystem('kernel', { ms });
    kernel.identity = { pkr: Symbol('kernel') };
    const router = { route: vi.fn().mockRejectedValue(new Error('Routing failed')) };
    kernel.setMsRouter(router);

    kernel.getChannelManager = vi.fn().mockReturnValue({
      getChannel: vi.fn(),
      verifyAccess: vi.fn().mockReturnValue(true),
    });
    kernel.getResponseManager = vi.fn().mockReturnValue({
      registerResponseRequiredFor: vi.fn(),
    });

    // Mock MessageSystem with pool methods
    const mockMessage = { path: 'canvas://test', getId: vi.fn().mockReturnValue('msg-1') };
    const acquireSpy = vi.fn().mockReturnValue(mockMessage);
    const releaseSpy = vi.fn();
    kernel.messageSystem = {
      acquirePooledMessage: acquireSpy,
      releasePooledMessage: releaseSpy,
    };

    await expect(
      kernel.sendPooledProtected({ uuid: 'caller' }, 'canvas://test', {})
    ).rejects.toThrow('Routing failed');

    // Verify message was released even though routing failed
    expect(releaseSpy).toHaveBeenCalledWith(mockMessage);
  });
});

