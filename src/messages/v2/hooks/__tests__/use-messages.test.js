import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/message/message-factory.mycelia.js', () => ({
  MessageFactory: {
    create: vi.fn().mockImplementation((path, body, options) => ({
      id: 'msg-1',
      path,
      body,
      ...options,
    })),
    createTransactionBatch: vi.fn().mockReturnValue([
      { id: 't-1', path: 'a', body: {} },
      { id: 't-2', path: 'b', body: {} },
    ]),
    generateId: vi.fn().mockReturnValue('gen-id'),
    generateTransactionId: vi.fn().mockReturnValue('txn-id'),
    acquireSenderId: vi.fn().mockReturnValue('sender-id'),
  },
}));

vi.mock('../../models/message/message.mycelia.js', () => ({
  Message: vi.fn().mockImplementation((data) => ({
    ...data,
    getId: () => data.id,
  })),
}));

import { MessageFactory } from '../../models/message/message-factory.mycelia.js';
import { Message } from '../../models/message/message.mycelia.js';
import { useMessages } from '../messages/use-messages.mycelia.js';

const createMessagesFacet = ({ config = {} } = {}) => {
  const ctx = { config: { messages: config } };
  const api = { name: 'canvas' };
  const subsystem = { name: 'canvas' };
  const facet = useMessages(ctx, api, subsystem);
  return facet;
};

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates messages via MessageFactory', () => {
    const facet = createMessagesFacet();
    const msg = facet.create('path', { body: true }, { type: 'simple', meta: { traceId: '1' } });

    expect(MessageFactory.create).toHaveBeenCalledWith('path', { body: true }, {
      type: 'simple',
      meta: { traceId: '1' },
    });
    expect(Message).toHaveBeenCalledWith(expect.objectContaining({ path: 'path' }));
    expect(msg.getId()).toBe('msg-1');
  });

  it('provides helpers for common message types', () => {
    const facet = createMessagesFacet();

    facet.createSimple('simple', {}, { traceId: '1' });
    expect(MessageFactory.create).toHaveBeenCalledWith('simple', {}, { type: 'simple', meta: { traceId: '1' } });

    facet.createAtomic('atomic', {}, { traceId: '2' });
    expect(MessageFactory.create).toHaveBeenCalledWith('atomic', {}, { type: 'atomic', meta: { traceId: '2' } });

    facet.createBatch('batch', [], { traceId: '3' });
    expect(MessageFactory.create).toHaveBeenCalledWith('batch', [], { type: 'batch', meta: { traceId: '3' } });

    facet.createQuery('query', { foo: 'bar' }, {});
    expect(MessageFactory.create).toHaveBeenCalledWith('query', { foo: 'bar' }, { type: 'query', meta: {} });
  });

  it('supports transaction helpers', () => {
    const facet = createMessagesFacet();
    facet.createTransaction('txn', {}, 'txn-1', 2, { traceId: '4' });
    expect(MessageFactory.create).toHaveBeenCalledWith('txn', {}, {
      type: 'transaction',
      transaction: 'txn-1',
      seq: 2,
      generateTransactionId: false,
      meta: { traceId: '4' },
    });

    const batch = facet.createTransactionBatch([{ path: 'a', body: {} }], { meta: { traceId: 'batch' } });
    expect(MessageFactory.createTransactionBatch).toHaveBeenCalledWith(
      [{ path: 'a', body: {} }],
      { meta: { traceId: 'batch' } },
    );
    expect(batch).toHaveLength(2);
  });

  it('exposes id helpers', () => {
    const facet = createMessagesFacet();
    expect(facet.generateId()).toBe('gen-id');
    expect(facet.generateTransactionId()).toBe('txn-id');
    expect(facet.acquireSenderId()).toBe('sender-id');
  });
});

