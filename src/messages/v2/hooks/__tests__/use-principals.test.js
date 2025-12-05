import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/security/principal-registry.mycelia.js', () => {
  const PrincipalRegistry = vi.fn().mockImplementation(() => ({
    mint: vi.fn().mockReturnValue({ publicKey: 'pk', privateKey: Symbol('sk') }),
    createPrincipal: vi.fn().mockReturnValue({ uuid: 'uuid-1' }),
    resolvePKR: vi.fn(),
    createRWS: vi.fn().mockReturnValue({}),
    createIdentity: vi.fn().mockReturnValue({ requireAuth: vi.fn() }),
    createFriendIdentity: vi.fn().mockReturnValue({}),
    isKernel: vi.fn().mockReturnValue(false),
    get: vi.fn().mockReturnValue({ uuid: 'uuid-1' }),
    has: vi.fn().mockReturnValue(true),
    refreshPrincipal: vi.fn().mockReturnValue({ uuid: 'uuid-2' }),
  }));
  return { PrincipalRegistry };
});

import { usePrincipals } from '../principals/use-principals.mycelia.js';
import { PrincipalRegistry } from '../../models/security/principal-registry.mycelia.js';

const createPrincipalsFacet = (overrides = {}) => {
  const ctx = { config: { principals: { kernel: {} } }, ...overrides.ctx };
  const api = { name: 'kernel' };
  const subsystem = {};
  const facet = usePrincipals(ctx, api, subsystem);
  return facet;
};

describe('usePrincipals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires kernel reference in config', () => {
    expect(() => usePrincipals({ config: {} }, { name: 'kernel' }, {})).toThrow(/kernel is required/);
  });

  it('exposes PrincipalRegistry operations', () => {
    const facet = createPrincipalsFacet();
    const registry = PrincipalRegistry.mock.results.at(-1).value;

    expect(facet.mint()).toEqual({ publicKey: 'pk', privateKey: expect.any(Symbol) });
    expect(registry.mint).toHaveBeenCalled();

    expect(facet.createPrincipal('topLevel')).toEqual({ uuid: 'uuid-1' });
    expect(registry.createPrincipal).toHaveBeenCalledWith('topLevel', {});

    facet.resolvePKR({ uuid: 'uuid-1' });
    expect(registry.resolvePKR).toHaveBeenCalled();

    facet.createRWS({ uuid: 'owner' });
    expect(registry.createRWS).toHaveBeenCalled();

    facet.createIdentity({ uuid: 'owner' });
    expect(registry.createIdentity).toHaveBeenCalled();

    facet.createFriendIdentity({ uuid: 'friend' });
    expect(registry.createFriendIdentity).toHaveBeenCalled();

    facet.isKernel({ uuid: 'something' });
    expect(registry.isKernel).toHaveBeenCalled();

    facet.get('uuid-1');
    expect(registry.get).toHaveBeenCalledWith('uuid-1');

    facet.has('uuid-1');
    expect(registry.has).toHaveBeenCalledWith('uuid-1');

    facet.refreshPrincipal('uuid-1');
    expect(registry.refreshPrincipal).toHaveBeenCalledWith('uuid-1');

    expect(facet.registry).toBe(registry);
  });
});

