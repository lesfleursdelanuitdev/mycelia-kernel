import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMessageMetadata } from '../message-metadata.utils.mycelia.js';

describe('buildMessageMetadata', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(1_700_000_000_000);
  });

  it('marks atomic and batch flags appropriately', () => {
    const generator = vi.fn().mockReturnValue('sender_1');

    const atomic = buildMessageMetadata('atomic', {}, {}, generator);
    expect(atomic.fixedMeta.isAtomic).toBe(true);

    const batch = buildMessageMetadata('batch', {}, {}, generator);
    expect(batch.fixedMeta.batch).toBe(true);
    expect(batch.fixedMeta.isAtomic).toBe(false);
  });

  it('auto-detects query path when type simple', () => {
    const { fixedMeta } = buildMessageMetadata('simple', {}, { path: 'sub://query/get' }, vi.fn());
    expect(fixedMeta.isQuery).toBe(true);
  });

  it('fills retry/transaction/command metadata', () => {
    const generator = vi.fn().mockReturnValue('sender_X');
    const retry = buildMessageMetadata('retry', {}, { maxRetries: 7 }, generator);
    expect(retry.fixedMeta.maxRetries).toBe(7);

    const tx = buildMessageMetadata('transaction', { isAtomic: true }, { transaction: 'tx-1', seq: 2 }, generator);
    expect(tx.fixedMeta.transaction).toBe('tx-1');
    expect(tx.fixedMeta.seq).toBe(2);
    expect(tx.fixedMeta.isAtomic).toBe(true);

    const command = buildMessageMetadata('command', {}, {}, generator);
    expect(command.fixedMeta.senderId).toBe('sender_X');
    expect(command.fixedMeta.isCommand).toBe(true);
  });

  it('marks errors and keeps defaults for unknown type', () => {
    const { fixedMeta } = buildMessageMetadata('error', {}, {}, vi.fn());
    expect(fixedMeta.isError).toBe(true);

    const fallback = buildMessageMetadata('unknown', {}, {}, vi.fn());
    expect(fallback.fixedMeta.type).toBe('unknown');
  });
});

