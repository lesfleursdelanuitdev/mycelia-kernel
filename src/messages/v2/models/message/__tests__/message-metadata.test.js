import { describe, it, expect } from 'vitest';
import { MessageMetadata } from '../message-metadata.mycelia.js';

describe('MessageMetadata', () => {
  const fixed = {
    timestamp: 1000,
    type: 'command',
    senderId: 'sender-1',
    transaction: 'tx-1',
    seq: 2,
    maxRetries: 3,
    caller: 'canvas',
    isAtomic: true,
    batch: false,
    isQuery: false,
    isCommand: true,
    isError: false,
  };

  it('requires fixed meta object', () => {
    expect(() => new MessageMetadata(null, {})).toThrow(/fixedMeta/);
  });

  it('exposes getters and retry helpers', () => {
    const meta = new MessageMetadata(fixed, { retries: 1 });
    expect(meta.getTimestamp()).toBe(1000);
    expect(meta.getSenderId()).toBe('sender-1');
    expect(meta.getTransaction()).toBe('tx-1');
    expect(meta.getSeq()).toBe(2);
    expect(meta.getMaxRetries()).toBe(3);
    expect(meta.isAtomic()).toBe(true);
    expect(meta.isCommand()).toBe(true);

    expect(meta.incrementRetry()).toBe(true);
    expect(meta.getRetries()).toBe(2);
    meta.resetRetries();
    expect(meta.getRetries()).toBe(0);
  });

  it('tracks mutable query results and custom fields', () => {
    const meta = new MessageMetadata(fixed, { queryResult: null });
    expect(meta.getQueryResult()).toBeNull();
    meta.setQueryResult({ rows: 1 });
    expect(meta.getQueryResult()).toEqual({ rows: 1 });

    expect(meta.getCustomField('caller')).toBe('canvas');
    meta.updateMutable({ replyPath: 'foo' });
    expect(meta.getCustomMutableField('replyPath')).toBe('foo');
  });

  it('toJSON/clone preserve structure', () => {
    const meta = new MessageMetadata(fixed, { retries: 1 });
    const json = meta.toJSON();
    expect(json.fixed).toEqual(fixed);
    expect(json.mutable).toEqual({ retries: 1 });

    const clone = meta.clone({ retries: 5 });
    expect(clone.getRetries()).toBe(5);
    const fromJson = MessageMetadata.fromJSON(json);
    expect(fromJson.getTimestamp()).toBe(1000);
  });
});

