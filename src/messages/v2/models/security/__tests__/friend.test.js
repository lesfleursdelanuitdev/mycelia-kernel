import { describe, it, expect, vi } from 'vitest';
import { Friend } from '../friend.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

vi.mock('../security.utils.mycelia.js', () => ({
  PRINCIPAL_KINDS: { FRIEND: 'friend' },
}));

describe('Friend', () => {
  it('exposes getters and connection state', () => {
    const friend = new Friend({ name: 'Anna', endpoint: 'wss://friend', metadata: { region: 'us' } });
    expect(friend.kind).toBe(PRINCIPAL_KINDS.FRIEND);
    expect(friend.isFriend).toBe(true);
    expect(friend.connected).toBe(false);
    friend.connect();
    expect(friend.connected).toBe(true);
    expect(friend.lastSeen).toBeInstanceOf(Date);
    friend.disconnect();
    expect(friend.connected).toBe(false);
  });

  it('sendProtected delegates to message system when connected', async () => {
    const friend = new Friend({ name: 'Bob' });
    await expect(friend.sendProtected({}, { sendProtected: vi.fn() })).rejects.toThrow(/not connected/);
    friend.connect();
    const ms = { sendProtected: vi.fn().mockResolvedValue('ok') };
    const result = await friend.sendProtected({ path: '/ping' }, ms);
    expect(ms.sendProtected).toHaveBeenCalledWith(friend, { path: '/ping' });
    expect(result).toBe('ok');
  });

  it('serializes name strings and records', () => {
    const friend = new Friend({ name: null, endpoint: null });
    expect(friend.getNameString()).toBe('friend:(anonymous)');
    expect(friend.toString()).toContain('(anonymous)');
    expect(friend.toRecord()).toEqual(
      expect.objectContaining({
        kind: 'friend',
        connected: false,
      }),
    );
  });
});

