import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCommands } from '../commands/use-commands.mycelia.js';

const buildRequestsFacet = () => {
  const builder = {
    with: vi.fn().mockReturnThis(),
    forMessage: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue('sent'),
  };
  return {
    facet: {
      command: vi.fn().mockReturnValue(builder),
    },
    builder,
  };
};

const buildMessagesFacet = () => ({
  create: vi.fn((path, payload, meta) => ({
    id: 'msg-1',
    path,
    body: payload,
    meta,
  })),
});

const buildChannelsFacet = () => ({
  create: vi.fn().mockImplementation((name) => ({
    route: `canvas://channel/${name}`,
  })),
});

const createCommandsFacet = (overrides = {}) => {
  const requestsSetup = buildRequestsFacet();
  const messages = buildMessagesFacet();
  const channels = buildChannelsFacet();

  const api = {
    name: 'canvas',
    __facets: {
      requests: requestsSetup.facet,
      messages,
      channels,
      ...(overrides.facets || {}),
    },
  };

  const subsystem = {
    name: 'canvas',
    ...(overrides.subsystem || {}),
  };

  const facet = useCommands({ config: {} }, api, subsystem);
  return { facet, api, subsystem, requestsSetup, messages, channels };
};

describe('useCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires requests, messages, and channels facets', () => {
    const baseApi = { name: 'canvas', __facets: {} };
    const subsystem = { name: 'canvas' };
    expect(() => useCommands({}, baseApi, subsystem)).toThrow(/requires requests, messages, and channels/i);
  });

  it('registers commands and optionally provisions reply channels', () => {
    const { facet, channels } = createCommandsFacet();
    const cmd = facet.register('run', { path: 'kernel://command/run', createChannel: true, meta: { version: 1 } });

    expect(cmd.replyChannel).toBe('canvas://channel/command/run');
    expect(channels.create).toHaveBeenCalledWith('command/run', {});
    expect(facet.list()).toEqual([
      {
        name: 'run',
        path: 'kernel://command/run',
        replyChannel: 'canvas://channel/command/run',
        timeout: undefined,
        meta: { version: 1 },
      },
    ]);
  });

  it('sends named commands using stored configuration', async () => {
    const { facet, requestsSetup, messages } = createCommandsFacet();
    facet.register('run', {
      path: 'kernel://command/run',
      replyChannel: 'canvas://channel/replies',
      timeout: 5000,
      meta: { priority: 'high' },
    });

    const result = await facet.send('run', { data: 1 }, { sendOptions: { headers: { foo: 'bar' } } });

    expect(messages.create).toHaveBeenCalledWith('kernel://command/run', { data: 1 }, { priority: 'high' });
    expect(requestsSetup.facet.command).toHaveBeenCalled();
    expect(requestsSetup.builder.with).toHaveBeenCalledWith({
      replyTo: 'canvas://channel/replies',
      timeout: 5000,
      headers: { foo: 'bar' },
    });
    expect(requestsSetup.builder.forMessage).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'kernel://command/run' }),
    );
    expect(requestsSetup.builder.send).toHaveBeenCalled();
    expect(result).toBe('sent');
  });

  it('allows ad-hoc command sends with explicit reply channel', async () => {
    const { facet, requestsSetup } = createCommandsFacet();
    await facet.send('kernel://command/ad-hoc', { ping: true }, { replyChannel: 'canvas://channel/tmp' });

    expect(requestsSetup.builder.with).toHaveBeenCalledWith({
      replyTo: 'canvas://channel/tmp',
      timeout: undefined,
    });
  });

  it('throws when sending commands without a reply channel', async () => {
    const { facet } = createCommandsFacet();
    await expect(facet.send('kernel://command/run', {})).rejects.toThrow(/replyChannel is required/);
  });
});

