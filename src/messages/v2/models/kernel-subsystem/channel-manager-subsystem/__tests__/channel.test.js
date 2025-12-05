import { describe, it, expect } from 'vitest';
import { Channel } from '../channel.mycelia.js';

describe('Channel', () => {
  const owner = { uuid: 'owner' };

  it('validates constructor arguments', () => {
    expect(() => new Channel({ route: '', ownerPkr: owner })).toThrow(/route/);
    expect(() => new Channel({ route: 'route', ownerPkr: null })).toThrow(/ownerPkr/);
    expect(() => new Channel({ route: 'route', ownerPkr: owner, participants: 'bad' })).toThrow(/participants/);
    expect(() => new Channel({ route: 'route', ownerPkr: owner, metadata: 'bad' })).toThrow(/metadata/);
  });

  it('manages participants and access checks', () => {
    const channel = new Channel({ route: 'canvas://channel/test', ownerPkr: owner });
    const participant = { uuid: 'p1' };
    expect(channel.addParticipant(participant)).toBe(true);
    expect(channel.addParticipant(participant)).toBe(false);
    expect(channel.removeParticipant(participant)).toBe(true);
    expect(channel.removeParticipant(participant)).toBe(false);
    expect(channel.canUse(owner)).toBe(true);
    expect(channel.canUse(participant)).toBe(false);
  });

  it('produces snapshots with metadata copy', () => {
    const channel = new Channel({
      route: 'canvas://channel/main',
      ownerPkr: owner,
      participants: [{ uuid: 'p1' }],
      metadata: { name: 'main' },
    });
    const snapshot = channel.snapshot();
    expect(snapshot.route).toBe('canvas://channel/main');
    expect(snapshot.metadata).toEqual({ name: 'main' });
  });
});

