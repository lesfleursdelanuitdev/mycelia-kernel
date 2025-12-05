import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PendingResponse } from '../pending-response.mycelia.js';

describe('PendingResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates constructor arguments', () => {
    expect(() => new PendingResponse({ correlationId: '', ownerPkr: {}, replyTo: 'r' })).toThrow(/correlationId/);
    expect(() => new PendingResponse({ correlationId: 'id', ownerPkr: null, replyTo: 'r' })).toThrow(/ownerPkr/);
    expect(() => new PendingResponse({ correlationId: 'id', ownerPkr: {}, replyTo: '' })).toThrow(/replyTo/);
  });

  it('starts and clears timeouts', () => {
    const onTimeout = vi.fn();
    const pending = new PendingResponse({ correlationId: 'id', ownerPkr: {}, replyTo: 'reply', timeoutMs: 10 });
    pending.startTimeout(onTimeout);
    vi.advanceTimersByTime(11);
    expect(onTimeout).toHaveBeenCalledWith(pending);
    pending.clearTimeout();
    expect(pending.timerId).toBeNull();
  });

  it('produces snapshots', () => {
    const pending = new PendingResponse({ correlationId: 'id', ownerPkr: { uuid: 'owner' }, replyTo: 'reply' });
    const snapshot = pending.snapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({
        correlationId: 'id',
        replyTo: 'reply',
        resolved: false,
        timedOut: false,
      }),
    );
  });
});

