import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const principalInstances = [];
  class PrincipalMock {
    constructor(opts = {}) {
      this.uuid = `principal-${principalInstances.length + 1}`;
      this.name = opts.name || null;
      this.kind = opts.kind;
      this.publicKey = opts.publicKey;
      this.metadata = opts.metadata;
      this.instance = opts.instance || null;
      this._pkr = {
        uuid: this.uuid,
        isExpired: vi.fn().mockReturnValue(false),
        isValid: vi.fn().mockReturnValue(true),
      };
      principalInstances.push(this);
    }
    get pkr() {
      return this._pkr;
    }
    refresh(newPublicKey) {
      this.publicKey = newPublicKey;
      this._pkr = {
        uuid: this.uuid,
        isExpired: vi.fn().mockReturnValue(false),
        isValid: vi.fn().mockReturnValue(true),
      };
      return this._pkr;
    }
  }

  const readerWriterSets = new Set();
  const createIdentityMock = vi.fn().mockImplementation((registry, pkr, kernel) => ({
    registry,
    pkr,
    kernel,
    kind: 'identity',
  }));
  const createFriendIdentityMock = vi.fn().mockImplementation((registry, pkr, kernel) => ({
    registry,
    pkr,
    kernel,
    kind: 'friend',
  }));

  return {
    principalInstances,
    PrincipalMock,
    readerWriterSets,
    createIdentityMock,
    createFriendIdentityMock,
  };
});

vi.mock('../principal.mycelia.js', () => ({
  Principal: mocks.PrincipalMock,
}));

vi.mock('../reader-writer-set.mycelia.js', () => ({
  ReaderWriterSet: vi.fn().mockImplementation((opts) => {
    const instance = { opts };
    mocks.readerWriterSets.add(instance);
    return instance;
  }),
}));

vi.mock('../create-identity.mycelia.js', () => ({
  createIdentity: mocks.createIdentityMock,
}));
vi.mock('../create-friend-identity.mycelia.js', () => ({
  createFriendIdentity: mocks.createFriendIdentityMock,
}));

import { PrincipalRegistry } from '../principal-registry.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

describe('PrincipalRegistry', () => {
  let kernel;

  beforeEach(() => {
    mocks.principalInstances.length = 0;
    mocks.readerWriterSets.clear();
    vi.clearAllMocks();
    kernel = { sendProtected: vi.fn() };
  });

  it('bootstraps kernel principal and identity', () => {
    const registry = new PrincipalRegistry({ kernel });
    expect(kernel.identity).toEqual(
      expect.objectContaining({ kind: 'identity' }),
    );
    expect(registry.kernelId).not.toBeNull();
    expect(registry.size).toBe(1);
  });

  it('creates principals and prevents duplicate kernel', () => {
    const registry = new PrincipalRegistry();
    const pk = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, { name: 'app' });
    expect(pk.uuid).toContain('principal');

    expect(() => registry.createPrincipal('unknown')).toThrow(/invalid kind/);
    registry.createPrincipal(PRINCIPAL_KINDS.KERNEL);
    expect(() => registry.createPrincipal(PRINCIPAL_KINDS.KERNEL)).toThrow(/already exists/);
  });

  it('creates and caches reader-writer sets', () => {
    const registry = new PrincipalRegistry();
    const owner = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, { name: 'owner' });
    const rws1 = registry.createRWS(owner);
    const rws2 = registry.createRWS(owner);
    expect(rws1).toBe(rws2);
  });

  it('refreshes principal PKRs when expired and updates identities', () => {
    const registry = new PrincipalRegistry({ kernel });
    const instance = { identity: null };
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND, { instance });
    const principal = registry.get(pkr.uuid);

    principal.pkr.isExpired.mockReturnValue(true);
    registry.refreshPrincipal(principal);
    expect(mocks.createFriendIdentityMock).toHaveBeenCalled();
  });

  it('createIdentity/createFriendIdentity validate PKR ownership', () => {
    const registry = new PrincipalRegistry({ kernel });
    expect(() => registry.createIdentity({ uuid: 'unknown' })).toThrow(/invalid/);

    const owner = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL);
    const identity = registry.createIdentity(owner);
    expect(identity.kind).toBe('identity');
    expect(mocks.createIdentityMock).toHaveBeenCalled();

    const friend = registry.createPrincipal(PRINCIPAL_KINDS.FRIEND);
    const friendIdentity = registry.createFriendIdentity(friend);
    expect(friendIdentity.kind).toBe('friend');
    expect(() => registry.createFriendIdentity(owner)).toThrow(/expected a friend/);
  });

  it('tracks principals via has/delete/resolvePKR', () => {
    const registry = new PrincipalRegistry();
    const pkr = registry.createPrincipal(PRINCIPAL_KINDS.TOP_LEVEL, { name: 'svc' });
    expect(registry.has(pkr.uuid)).toBe(true);
    expect(typeof registry.resolvePKR(pkr)).toBe('symbol');
    const deleted = registry.delete(pkr.uuid);
    expect(deleted).not.toBeNull();
    expect(registry.has(pkr.uuid)).toBe(false);
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

