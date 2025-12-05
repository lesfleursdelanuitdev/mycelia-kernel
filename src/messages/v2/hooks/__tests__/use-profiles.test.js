import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfiles } from '../profiles/use-profiles.mycelia.js';

const createKernel = () => ({
  identity: { pkr: Symbol('kernel-pkr') },
  getAccessControl: vi.fn().mockReturnValue(null),
});

const createPrincipalsFacet = () => {
  const rws = {
    addReader: vi.fn().mockReturnValue(true),
    addWriter: vi.fn().mockReturnValue(true),
    removeWriter: vi.fn().mockReturnValue(true)
  };
  return {
    createRWS: vi.fn().mockReturnValue(rws),
    rws
  };
};

const createSubsystem = (principalsFacet = null) => ({
  name: 'test-subsystem',
  find: vi.fn().mockImplementation((kind) => (kind === 'principals' ? principalsFacet : null)),
  getRoot: vi.fn()
});

const createCtx = (kernel) => ({ config: { profiles: { kernel } } });

describe('useProfiles', () => {
  let kernel;
  let principals;
  let subsystem;
  let ctx;

  beforeEach(() => {
    vi.clearAllMocks();
    kernel = createKernel();
    principals = createPrincipalsFacet();
    subsystem = createSubsystem(principals);
    ctx = createCtx(kernel);
  });

  it('throws if kernel is missing', () => {
    subsystem.getRoot.mockReturnValue(undefined);
    expect(() => useProfiles({ config: {} }, {}, subsystem)).toThrow(/kernel is required/);
  });

  it('throws if principals facet is missing', () => {
    subsystem.find.mockReturnValue(null);
    expect(() => useProfiles(ctx, {}, subsystem)).toThrow(/principals facet is required/);
  });

  it('creates, retrieves, lists, updates, and deletes profiles', () => {
    const facet = useProfiles(ctx, {}, subsystem);

    const profile = facet.createProfile('student', { math: 'r' }, { level: 'basic' });
    expect(profile.getName()).toBe('student');
    expect(facet.getProfile('student')).toBe(profile);
    expect(facet.hasProfile('student')).toBe(true);
    expect(facet.listProfiles()).toEqual(['student']);
    expect(facet.getAllProfiles()).toHaveLength(1);

    // Duplicate create should throw
    expect(() => facet.createProfile('student', { math: 'rw' })).toThrow(/already exists/);

    // Update merge
    facet.updateProfile('student', { science: 'rw' });
    expect(facet.getProfile('student').getGrantsAsObject()).toEqual({ math: 'r', science: 'rw' });

    // Update replace
    facet.updateProfile('student', { art: 'rwg' }, true);
    expect(facet.getProfile('student').getGrantsAsObject()).toEqual({ art: 'rwg' });

    // Delete
    expect(facet.deleteProfile('student')).toBe(true);
    expect(facet.deleteProfile('student')).toBe(false);
    expect(facet.hasProfile('student')).toBe(false);
  });

  it('applies profile permissions to a principal RWS', () => {
    const facet = useProfiles(ctx, {}, subsystem);
    const { rws } = principals;
    const principal = { publicKey: Symbol('pkr') };

    facet.createProfile('teacher', { read: 'r', write: 'rw', admin: 'rwg' });

    const result = facet.applyProfileToPrincipal('teacher', principal);

    expect(result.success).toBe(true);
    expect(result.applied).toBe(3);
    expect(result.failed).toBe(0);
    expect(principals.createRWS).toHaveBeenCalledWith(principal);
    expect(rws.addReader).toHaveBeenCalledWith(kernel.identity.pkr, principal);
    expect(rws.addWriter).toHaveBeenCalledTimes(2); // rw and rwg
  });

  it('fails apply when profile missing or principal invalid', () => {
    const facet = useProfiles(ctx, {}, subsystem);
    facet.createProfile('teacher', { read: 'r' });

    expect(() => facet.applyProfileToPrincipal('missing', { publicKey: Symbol('p') })).toThrow(/not found/);
    expect(() => facet.applyProfileToPrincipal('teacher', {})).toThrow(/invalid principalPkr/);
  });

  it('removes profile permissions from a principal RWS', () => {
    const facet = useProfiles(ctx, {}, subsystem);
    const { rws } = principals;
    const principal = { publicKey: Symbol('pkr') };

    facet.createProfile('student', { read: 'r', write: 'rw' });

    const result = facet.removeProfileFromPrincipal('student', principal);

    expect(result.success).toBe(true);
    expect(principals.createRWS).toHaveBeenCalledWith(principal);
    expect(rws.removeWriter).toHaveBeenCalledWith(kernel.identity.pkr, principal);
  });
});
