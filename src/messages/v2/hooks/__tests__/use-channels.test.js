import { describe, it, expect, vi } from 'vitest';
import { useChannels } from '../channels/use-channels.mycelia.js';

const buildChannelsFacet = (options = {}) => {
  const defaultIdentity = {
    createChannel: vi.fn(),
    getChannel: vi.fn(),
    listChannels: vi.fn().mockReturnValue([]),
  };

  const identity =
    options.identity !== undefined ? options.identity : defaultIdentity;

  const subsystem = {
    name: 'canvas',
    getNameString: () => 'canvas://',
    identity,
    ...options.subsystem,
  };

  const ctx = { config: {} };
  const api = { name: subsystem.name };
  const facet = useChannels(ctx, api, subsystem);

  return { facet, identity, subsystem };
};

describe('useChannels', () => {
  it('builds canonical routes using subsystem name string', () => {
    const { facet } = buildChannelsFacet();
    expect(facet.buildRoute('updates')).toBe('canvas://channel/updates');
    expect(() => facet.buildRoute('')).toThrow(/localName must be a non-empty string/i);
  });

  it('creates channels via identity and defaults metadata name', () => {
    const { facet, identity } = buildChannelsFacet();
    const channel = { route: 'canvas://channel/updates' };
    identity.createChannel.mockReturnValue(channel);

    const result = facet.create('updates');

    expect(identity.createChannel).toHaveBeenCalledWith('canvas://channel/updates', {
      participants: [],
      metadata: { name: 'updates' },
    });
    expect(result).toBe(channel);
  });

  it('respects custom metadata when name already provided', () => {
    const { facet, identity } = buildChannelsFacet();
    facet.create('updates', { metadata: { name: 'custom', description: 'test' } });

    expect(identity.createChannel).toHaveBeenCalledWith('canvas://channel/updates', {
      participants: [],
      metadata: { name: 'custom', description: 'test' },
    });
  });

  it('creates channels with explicit routes', () => {
    const { facet, identity } = buildChannelsFacet();
    const channel = { route: 'custom://special' };
    identity.createChannel.mockReturnValue(channel);

    const result = facet.createWithRoute('custom://special', {
      participants: ['pkr'],
      metadata: { type: 'special' },
    });

    expect(identity.createChannel).toHaveBeenCalledWith('custom://special', {
      participants: ['pkr'],
      metadata: { type: 'special' },
    });
    expect(result).toBe(channel);
    expect(() => facet.createWithRoute('')).toThrow(/route must be a non-empty string/i);
  });

  it('delegates get/list to the subsystem identity', () => {
    const listResult = [{ route: 'canvas://channel/updates' }];
    const channel = { route: 'canvas://channel/updates' };
    const identity = {
      createChannel: vi.fn(),
      getChannel: vi.fn().mockReturnValue(channel),
      listChannels: vi.fn().mockReturnValue(listResult),
    };

    const { facet } = buildChannelsFacet({ identity });

    expect(facet.get('updates')).toBe(channel);
    expect(identity.getChannel).toHaveBeenCalledWith('updates');
    expect(facet.list()).toBe(listResult);
    expect(identity.listChannels).toHaveBeenCalled();
  });

  it('ensures channels by returning existing entries when found', () => {
    const existing = { route: 'canvas://channel/updates' };
    const identity = {
      createChannel: vi.fn(),
      getChannel: vi.fn().mockReturnValue(existing),
      listChannels: vi.fn(),
    };

    const { facet } = buildChannelsFacet({ identity });
    expect(facet.ensureChannel('updates')).toBe(existing);
    expect(identity.createChannel).not.toHaveBeenCalled();
  });

  it('ensures channels by creating via route or local name', () => {
    const identity = {
      createChannel: vi.fn().mockReturnValueOnce({ route: 'custom://special' }).mockReturnValueOnce({ route: 'canvas://channel/updates' }),
      getChannel: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(null),
      listChannels: vi.fn(),
    };

    const { facet } = buildChannelsFacet({ identity });

    const routeChannel = facet.ensureChannel('custom://special', {
      participants: ['pkr'],
      metadata: { type: 'special' },
    });
    expect(identity.createChannel).toHaveBeenNthCalledWith(1, 'custom://special', {
      participants: ['pkr'],
      metadata: { type: 'special' },
    });
    expect(routeChannel).toEqual({ route: 'custom://special' });

    const localChannel = facet.ensureChannel('updates');
    expect(identity.createChannel).toHaveBeenNthCalledWith(2, 'canvas://channel/updates', {
      participants: [],
      metadata: { name: 'updates' },
    });
    expect(localChannel).toEqual({ route: 'canvas://channel/updates' });
  });

  it('throws helpful errors when identity is missing', () => {
    const { facet } = buildChannelsFacet({ identity: null });

    expect(() => facet.list()).toThrow(/subsystem\.identity is required/i);
    expect(() => facet.create('updates')).toThrow(/subsystem\.identity is required/i);
  });
});

