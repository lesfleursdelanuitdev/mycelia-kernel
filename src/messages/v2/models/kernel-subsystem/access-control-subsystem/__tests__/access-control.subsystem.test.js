import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.use = vi.fn().mockReturnThis();
    }
  }

  class ResourceMock {
    constructor(opts) {
      Object.assign(this, opts);
    }
  }

  class FriendMock {
    constructor(opts) {
      Object.assign(this, opts);
    }
  }

  return {
    BaseSubsystemMock,
    ResourceMock,
    FriendMock,
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../../hooks/principals/use-principals.mycelia.js', () => ({
  usePrincipals: vi.fn(),
}));

vi.mock('../../security/resource.mycelia.js', () => ({
  Resource: hoisted.ResourceMock,
}));

vi.mock('../../security/friend.mycelia.js', () => ({
  Friend: hoisted.FriendMock,
}));

import { AccessControlSubsystem } from '../access-control.subsystem.mycelia.js';

describe('AccessControlSubsystem', () => {
  let acs;
  let principalsFacet;

  beforeEach(() => {
    vi.clearAllMocks();
    acs = new AccessControlSubsystem('access-control', { ms: {} });
    principalsFacet = {
      createPrincipal: vi.fn().mockReturnValue({ uuid: 'pkr' }),
      createIdentity: vi.fn().mockReturnValue({ setSubsystem: vi.fn() }),
      createFriendIdentity: vi.fn().mockReturnValue({}),
    };
    // Mock find() to return principals facet (the code uses this.find('principals'))
    acs.find = vi.fn((kind) => {
      if (kind === 'principals') return principalsFacet;
      return null;
    });
    // Also set directly for backward compatibility if needed
    acs.principals = principalsFacet;
  });

  it('validates createResource inputs and attaches identity', () => {
    const owner = { identity: { pkr: { uuid: 'owner' } } };
    const resourceInstance = {};
    const resource = acs.createResource(owner, 'cache', resourceInstance, { tier: 'hot' });
    expect(resource.name).toBe('cache');
    expect(principalsFacet.createPrincipal).toHaveBeenCalledWith(
      'resource',
      expect.objectContaining({ owner: owner.identity.pkr }),
    );
    expect(resourceInstance.identity).toBeDefined();
  });

  it('creates friends and registers principals', () => {
    const friend = acs.createFriend('alice', { endpoint: 'wss://alice' });
    expect(friend.name).toBe('alice');
    expect(principalsFacet.createPrincipal).toHaveBeenCalledWith(
      'friend',
      expect.objectContaining({ name: 'alice' }),
    );
    expect(friend.identity).toBeDefined();
  });

  it('wires subsystems for topLevel and child types', () => {
    const subsystem = {
      name: 'canvas',
      getRoot: vi.fn().mockReturnValue({ identity: { pkr: { uuid: 'kernel' } } }),
    };
    const topLevel = acs.wireSubsystem('topLevel', subsystem, { metadata: { tier: 'ui' } });
    expect(topLevel.pkr).toBeDefined();

    const childSubsystem = {
      name: 'child',
      getRoot: vi.fn().mockReturnValue({ identity: { pkr: { uuid: 'kernel' } } }),
    };
    acs.wireSubsystem('child', childSubsystem);
    expect(childSubsystem.identity).toBeDefined();
  });
});

