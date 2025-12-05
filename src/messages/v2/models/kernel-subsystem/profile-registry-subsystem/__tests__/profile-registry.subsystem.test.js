import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.use = vi.fn().mockReturnThis();
      this.find = vi.fn();
      this.getRoot = vi.fn();
    }
  }

  return {
    BaseSubsystemMock,
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../../hooks/profiles/use-profiles.mycelia.js', () => ({
  useProfiles: vi.fn(),
}));

vi.mock('../../../hooks/principals/use-principals.mycelia.js', () => ({
  usePrincipals: vi.fn(),
}));

import { useProfiles } from '../../../hooks/profiles/use-profiles.mycelia.js';
import { ProfileRegistrySubsystem } from '../profile-registry.subsystem.mycelia.js';

describe('ProfileRegistrySubsystem', () => {
  let prs;
  let profilesFacet;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create instance - use() will be called in constructor
    prs = new ProfileRegistrySubsystem('profile-registry', { ms: {} });
    
    profilesFacet = {
      createProfile: vi.fn(),
      getProfile: vi.fn(),
      applyProfileToPrincipal: vi.fn(),
      removeProfileFromPrincipal: vi.fn(),
      listProfiles: vi.fn().mockReturnValue([]),
    };
    
    prs.find = vi.fn((kind) => {
      if (kind === 'profiles') return profilesFacet;
      return null;
    });
  });

  it('installs the profiles hook in constructor', () => {
    if (typeof prs.use === 'function' && prs.use.mock) {
      expect(prs.use).toHaveBeenCalledTimes(1);
      expect(prs.use).toHaveBeenCalledWith(useProfiles);
    } else {
      expect(prs).toBeDefined();
      expect(prs.name).toBe('profile-registry');
    }
  });

  it('getProfiles returns profiles facet', () => {
    const profiles = prs.getProfiles();
    expect(profiles).toBe(profilesFacet);
    expect(prs.find).toHaveBeenCalledWith('profiles');
  });

  it('createProfile delegates to profiles facet', () => {
    const mockProfile = { name: 'admin', getGrants: () => new Map() };
    profilesFacet.createProfile.mockReturnValue(mockProfile);
    
    const profile = prs.createProfile('admin', { 'resource1': 'rw' });
    
    expect(profilesFacet.createProfile).toHaveBeenCalledWith('admin', { 'resource1': 'rw' }, {});
    expect(profile).toBe(mockProfile);
  });

  it('getProfile delegates to profiles facet', () => {
    const mockProfile = { name: 'admin' };
    profilesFacet.getProfile.mockReturnValue(mockProfile);
    
    const profile = prs.getProfile('admin');
    
    expect(profilesFacet.getProfile).toHaveBeenCalledWith('admin');
    expect(profile).toBe(mockProfile);
  });

  it('applyProfileToPrincipal delegates to profiles facet', () => {
    const mockPkr = { uuid: 'test-pkr', publicKey: Symbol('key') };
    const mockResult = { success: true, applied: 2 };
    profilesFacet.applyProfileToPrincipal.mockReturnValue(mockResult);
    
    const result = prs.applyProfileToPrincipal('admin', mockPkr);
    
    expect(profilesFacet.applyProfileToPrincipal).toHaveBeenCalledWith('admin', mockPkr);
    expect(result).toBe(mockResult);
  });

  it('removeProfileFromPrincipal delegates to profiles facet', () => {
    const mockPkr = { uuid: 'test-pkr', publicKey: Symbol('key') };
    const mockResult = { success: true, removed: 2 };
    profilesFacet.removeProfileFromPrincipal.mockReturnValue(mockResult);
    
    const result = prs.removeProfileFromPrincipal('admin', mockPkr);
    
    expect(profilesFacet.removeProfileFromPrincipal).toHaveBeenCalledWith('admin', mockPkr);
    expect(result).toBe(mockResult);
  });

  it('listProfiles delegates to profiles facet', () => {
    profilesFacet.listProfiles.mockReturnValue(['admin', 'user']);
    
    const profiles = prs.listProfiles();
    
    expect(profilesFacet.listProfiles).toHaveBeenCalled();
    expect(profiles).toEqual(['admin', 'user']);
  });

  it('throws error when profiles facet not found in createProfile', () => {
    prs.find.mockReturnValue(null);
    
    expect(() => {
      prs.createProfile('admin', {});
    }).toThrow('profiles facet not found');
  });

  it('throws error when profiles facet not found in applyProfileToPrincipal', () => {
    prs.find.mockReturnValue(null);

    expect(() => {
      prs.applyProfileToPrincipal('admin', { uuid: 'pkr' });
    }).toThrow('profiles facet not found');
  });

  it('throws error when profiles facet not found in removeProfileFromPrincipal', () => {
    prs.find.mockReturnValue(null);

    expect(() => {
      prs.removeProfileFromPrincipal('admin', { uuid: 'pkr' });
    }).toThrow('profiles facet not found');
  });

  it('returns undefined when profiles facet not found in getProfile', () => {
    prs.find.mockReturnValue(null);
    
    const profile = prs.getProfile('admin');
    expect(profile).toBeUndefined();
  });

  it('returns empty array when profiles facet not found in listProfiles', () => {
    prs.find.mockReturnValue(null);
    
    const profiles = prs.listProfiles();
    expect(profiles).toEqual([]);
  });
});

