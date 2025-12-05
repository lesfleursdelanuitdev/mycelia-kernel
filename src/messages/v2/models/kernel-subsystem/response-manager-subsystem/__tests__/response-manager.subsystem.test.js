import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.identity = options.identity || null;
      this.getRoot = vi.fn().mockReturnValue({ sendProtected: vi.fn().mockResolvedValue(true) });
    }
  }

  const PendingResponseMock = vi.fn().mockImplementation(function PendingResponse(opts) {
    this.correlationId = opts.correlationId;
    this.ownerPkr = opts.ownerPkr;
    this.replyTo = opts.replyTo;
    this.timeoutMs = opts.timeoutMs || null;
    this.resolved = false;
    this.timedOut = false;
    this.startTimeout = vi.fn((cb) => {
      this.timeoutHandler = cb;
    });
    this.clearTimeout = vi.fn();
    this.snapshot = vi.fn().mockReturnValue({ correlationId: this.correlationId });
  });

  class MessageMock {
    constructor(path, body, meta) {
      this.path = path;
      this.body = body;
      this.meta = meta;
    }
  }

  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { BaseSubsystemMock, PendingResponseMock, MessageMock, logger };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../pending-response.mycelia.js', () => ({
  PendingResponse: hoisted.PendingResponseMock,
}));

vi.mock('../../../message/message.mycelia.js', () => ({
  Message: hoisted.MessageMock,
}));

vi.mock('../../../../utils/logger.utils.mycelia.js', () => ({
  createSubsystemLogger: () => hoisted.logger,
}));

import { ResponseManagerSubsystem } from '../response-manager.subsystem.mycelia.js';

describe('ResponseManagerSubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const owner = { uuid: 'owner' };
  const message = { id: 'msg-1', body: { correlationId: 'msg-1' } };

  it('registers pending responses and starts timeout', () => {
    const rms = new ResponseManagerSubsystem('response-manager', { ms: {} });
    const pending = rms.registerResponseRequiredFor(owner, message, { replyTo: 'kernel://reply', timeout: 1000 });
    expect(hoisted.PendingResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'msg-1', replyTo: 'kernel://reply' }),
    );
    expect(pending.startTimeout).toHaveBeenCalled();
  });

  it('cancels entries and logs', () => {
    const rms = new ResponseManagerSubsystem('response-manager', { ms: {} });
    rms.registerResponseRequiredFor(owner, message, { replyTo: 'kernel://reply' });
    expect(rms.cancel('msg-1')).toBe(true);
    expect(hoisted.logger.log).toHaveBeenCalledWith(expect.stringContaining('Cancelled'));
  });

  it('handles responses and finalizes entries', () => {
    const rms = new ResponseManagerSubsystem('response-manager', { ms: {} });
    rms.registerResponseRequiredFor(owner, message, { replyTo: 'kernel://reply' });
    const result = rms.handleResponse({ body: { inReplyTo: 'msg-1' } });
    expect(result.ok).toBe(true);
    expect(result.pending.resolved).toBe(true);
  });

  it('emits timeout responses via kernel', async () => {
    const rms = new ResponseManagerSubsystem('response-manager', { ms: {} });
    rms.registerResponseRequiredFor(owner, message, { replyTo: 'kernel://reply', timeout: 1000 });
    const pendingInstance = hoisted.PendingResponseMock.mock.instances[0];
    const kernel = { sendProtected: vi.fn().mockResolvedValue(true) };
    rms.getRoot = vi.fn().mockReturnValue(kernel);
    await pendingInstance.timeoutHandler?.(pendingInstance);
    expect(kernel.sendProtected).toHaveBeenCalledWith(
      owner,
      expect.any(hoisted.MessageMock),
      expect.objectContaining({ isResponse: true }),
    );
  });

  it('lists pending entries and replyTo lookups', () => {
    const rms = new ResponseManagerSubsystem('response-manager', { ms: {} });
    const pending = rms.registerResponseRequiredFor(owner, message, { replyTo: 'kernel://reply' });
    expect(rms.listAllPending()).toHaveLength(1);
    expect(rms.listPendingFor(owner)).toHaveLength(1);
    expect(rms.getReplyTo('msg-1')).toBe('kernel://reply');
    rms.cancel('msg-1');
    expect(rms.listAllPending()).toHaveLength(0);
  });
});

