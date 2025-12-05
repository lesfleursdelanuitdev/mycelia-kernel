import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class ChannelMock {
    constructor({ route, ownerPkr, participants = [], metadata = {} }) {
      this.route = route;
      this.ownerPkr = ownerPkr;
      this.metadata = metadata;
      this.participants = new Set(participants);
    }
    addParticipant = vi.fn((pkr) => {
      const sizeBefore = this.participants.size;
      this.participants.add(pkr);
      return this.participants.size !== sizeBefore;
    });
    removeParticipant = vi.fn((pkr) => this.participants.delete(pkr));
    canUse = vi.fn((pkr) => this.ownerPkr === pkr || this.participants.has(pkr));
    snapshot = vi.fn().mockReturnValue({ route: this.route });
  }

  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
  };

  return { ChannelMock, logger };
});

vi.mock('../channel.mycelia.js', () => ({
  Channel: hoisted.ChannelMock,
}));

vi.mock('../../../../utils/logger.utils.mycelia.js', () => ({
  createSubsystemLogger: () => hoisted.logger,
}));

import { ChannelManagerSubsystem } from '../channel-manager.subsystem.mycelia.js';

describe('ChannelManagerSubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers and unregisters channels with owner index', () => {
    const cms = new ChannelManagerSubsystem('channel-manager', { ms: {} });
    const owner = { uuid: 'owner' };
    const channel = cms.registerChannel({ route: 'canvas://channel/main', ownerPkr: owner, metadata: { name: 'main' } });
    expect(channel.route).toBe('canvas://channel/main');
    expect(() => cms.registerChannel({ route: 'canvas://channel/main', ownerPkr: owner })).toThrow(/already exists/);

    expect(cms.getChannel('canvas://channel/main')).not.toBeNull();
    expect(cms.listAllChannelsFor(owner)).toHaveLength(1);
    expect(cms.unregisterChannel('canvas://channel/main')).toBe(true);
    expect(cms.getChannel('canvas://channel/main')).toBeNull();
  });

  it('getChannelFor checks metadata and suffix', () => {
    const cms = new ChannelManagerSubsystem('channel-manager', { ms: {} });
    const owner = { uuid: 'owner' };
    cms.registerChannel({
      route: 'canvas://channel/alpha',
      ownerPkr: owner,
      metadata: { name: 'alpha-name' },
    });
    expect(cms.getChannelFor(owner, 'canvas://channel/alpha')).not.toBeNull();
    expect(cms.getChannelFor(owner, 'alpha-name')).not.toBeNull();
    expect(cms.getChannelFor(owner, 'alpha')).not.toBeNull();
  });

  it('participant helpers delegate to channel and verifyAccess logs', () => {
    const cms = new ChannelManagerSubsystem('channel-manager', { ms: {} });
    const owner = { uuid: 'owner' };
    cms.registerChannel({ route: 'canvas://channel/team', ownerPkr: owner });

    const participant = { uuid: 'p1' };
    expect(cms.addParticipant('canvas://channel/team', participant)).toBe(true);
    expect(cms.removeParticipant('canvas://channel/team', participant)).toBe(true);

    expect(cms.canUseChannel('canvas://channel/team', owner)).toBe(true);
    expect(cms.verifyAccess('canvas://channel/team', { uuid: 'unknown' })).toBe(false);
    expect(hoisted.logger.warn).toHaveBeenCalled();
  });

  it('getStatus snapshots channels and dispose clears them', async () => {
    const cms = new ChannelManagerSubsystem('channel-manager', { ms: {} });
    const owner = { uuid: 'owner' };
    cms.registerChannel({ route: 'canvas://channel/status', ownerPkr: owner });
    const status = cms.getStatus();
    expect(status.count).toBe(1);
    expect(status.channels).toHaveLength(1);

    await cms.dispose();
    expect(cms.listChannels()).toHaveLength(0);
  });
});

