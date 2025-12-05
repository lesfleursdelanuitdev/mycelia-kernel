import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Message } from '../message.mycelia.js';
import { MessageMetadata } from '../message-metadata.mycelia.js';

vi.mock('../message-factory.mycelia.js', () => {
  const create = vi.fn().mockImplementation((path, body) => ({
    id: 'factory-id',
    path,
    body,
    meta: new MessageMetadata({ timestamp: 1, type: 'simple' }, {}),
  }));
  return { MessageFactory: { create } };
});

const { MessageFactory } = await import('../message-factory.mycelia.js');

describe('Message class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs from raw path by delegating to factory', () => {
    const message = new Message('canvas://run', { foo: 'bar' });
    expect(MessageFactory.create).toHaveBeenCalledWith('canvas://run', { foo: 'bar' }, { meta: {} });
    expect(message.getPath()).toBe('canvas://run');
    expect(message.getMeta()).toBeInstanceOf(MessageMetadata);
  });

  it('accepts prebuilt message data without factory call', () => {
    const data = {
      id: 'pre-id',
      path: 'cmd://x',
      body: {},
      meta: new MessageMetadata({ timestamp: 2, type: 'command', isCommand: true }, {}),
    };
    const message = new Message(data);
    expect(MessageFactory.create).not.toHaveBeenCalled();
    expect(message.getId()).toBe('pre-id');
    expect(message.isCommand()).toBe(true);
  });

  it('static create uses factory once', () => {
    const msg = Message.create('path://one', {});
    expect(MessageFactory.create).toHaveBeenCalledTimes(1);
    expect(msg).toBeInstanceOf(Message);
  });

  it('fromJSON rebuilds metadata structure', () => {
    const json = {
      id: 'json-id',
      path: 'query://x',
      body: { value: 1 },
      meta: { fixed: { type: 'query', timestamp: 5, isQuery: true }, mutable: { retries: 2 } },
    };
    const msg = Message.fromJSON(json);
    expect(msg.isQuery()).toBe(true);
    expect(msg.getRetries()).toBe(2);
  });

  it('clone and update meta', () => {
    const msg = new Message('canvas://clone', { data: 1 });
    msg.updateMeta({ replyPath: 'foo' });
    const clone = msg.clone();
    expect(clone.getRetries()).toBe(0);
    expect(msg.toString()).toContain('canvas://clone');
  });
});

