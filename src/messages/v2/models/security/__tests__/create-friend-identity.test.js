import { describe, it, expect, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  createIdentityMock: vi.fn().mockReturnValue({ identity: true }),
}));

vi.mock('../create-identity.mycelia.js', () => ({
  createIdentity: hoisted.createIdentityMock,
}));

import { createFriendIdentity } from '../create-friend-identity.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

const friendPkr = { uuid: 'friend-1' };

describe('createFriendIdentity', () => {
  it('validates PKR and kernel', () => {
    expect(() => createFriendIdentity({}, null, {})).toThrow(/invalid/);
    expect(() => createFriendIdentity({}, friendPkr, {})).toThrow(/kernel reference/);
  });

  it('requires friend principal and resolves PKR before delegating', () => {
    const principals = {
      get: vi.fn().mockReturnValue({ kind: PRINCIPAL_KINDS.FRIEND }),
      resolvePKR: vi.fn().mockReturnValue(Symbol('priv')),
    };
    const kernel = { sendProtected: vi.fn() };

    const identity = createFriendIdentity(principals, friendPkr, kernel);
    expect(identity).toEqual({ identity: true });
    expect(hoisted.createIdentityMock).toHaveBeenCalledWith(principals, friendPkr, kernel);

    principals.get.mockReturnValue({ kind: 'notFriend' });
    expect(() => createFriendIdentity(principals, friendPkr, kernel)).toThrow(/expected a friend/);
  });
});

