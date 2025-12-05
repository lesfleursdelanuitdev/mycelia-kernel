import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageFactory } from '../message-factory.mycelia.js';

describe('MessageFactory', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates simple messages with generated ids and metadata', () => {
    const msg = MessageFactory.create('canvas://op', { foo: 'bar' });
    const expectedSuffix = (0.123456789).toString(36).substr(2, 9);
    expect(msg.id).toBe(`msg_1700000000000_${expectedSuffix}`);
    expect(msg.path).toBe('canvas://op');
    expect(msg.meta.getType()).toBe('simple');
  });

  it('generates transaction id when requested', () => {
    const txSpy = vi.spyOn(MessageFactory, 'generateTransactionId').mockReturnValue('tx-xyz');
    const msg = MessageFactory.create('cmd://x', {}, { type: 'transaction', generateTransactionId: true });
    expect(txSpy).toHaveBeenCalled();
    expect(msg.meta.getTransaction()).toBe('tx-xyz');
  });

  it('marks command metadata and sender id', () => {
    const msg = MessageFactory.create('command://run', {}, { type: 'command' });
    expect(msg.meta.isCommand()).toBe(true);
    expect(msg.meta.getSenderId()).toMatch(/^sender_/);
  });

  it('createTransactionBatch shares transaction id and sequences', () => {
    vi.spyOn(MessageFactory, 'generateTransactionId').mockReturnValue('tx-batch');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const batch = MessageFactory.createTransactionBatch([
      { path: 'cmd://one', body: {} },
      { path: 'cmd://two', body: {} },
    ], { meta: { priority: 'high' }, type: 'atomic' });
    expect(batch).toHaveLength(2);
    expect(batch[0].meta.getTransaction()).toBe('tx-batch');
    expect(batch[0].meta.getSeq()).toBe(1);
    expect(batch[0].meta.isAtomic()).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });

  it('exposes id helpers', () => {
    const suffix = (0.123456789).toString(36).substr(2, 9);
    expect(MessageFactory.generateId()).toBe(`msg_1700000000000_${suffix}`);
    expect(MessageFactory.generateTransactionId()).toBe(`tx_1700000000000_${suffix}`);
    expect(MessageFactory.generateSenderId()).toBe(`sender_1700000000000_${suffix}`);
    expect(MessageFactory.acquireSenderId()).toBe(`sender_1700000000000_${suffix}`);
  });
});

