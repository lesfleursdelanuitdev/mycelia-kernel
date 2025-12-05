import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deepMerge,
  verifySubsystemBuild,
  buildSubsystem,
} from '../subsystem-builder.utils.mycelia.js';
import { Facet } from '../../facet-manager/facet.mycelia.js';

describe('deepMerge helper', () => {
  it('merges nested objects without touching arrays', () => {
    const result = deepMerge(
      { a: 1, nested: { k: 1 }, arr: [1] },
      { b: 2, nested: { x: 2 }, arr: [2] },
    );
    expect(result).toEqual({ a: 1, b: 2, nested: { k: 1, x: 2 }, arr: [2] });
  });
});

describe('verifySubsystemBuild', () => {
  const baseFacet = (kind, deps = []) => {
    const facet = new Facet(kind, { attach: true, source: `${kind}.js` });
    vi.spyOn(facet, 'getDependencies').mockReturnValue(deps);
    vi.spyOn(facet, 'hasDependency').mockImplementation((dep) => deps.includes(dep));
    vi.spyOn(facet, 'removeDependency').mockImplementation(() => {});
    return facet;
  };

  const hookFactory = (kind, { required = [], overwrite = false } = {}) => {
    const hook = vi.fn((ctx, api) => {
      const facet = new Facet(kind, { attach: true, source: `${kind}.js`, overwrite });
      vi.spyOn(facet, 'getDependencies').mockReturnValue([]);
      return facet;
    });
    hook.kind = kind;
    hook.required = required;
    hook.overwrite = overwrite;
    hook.source = `${kind}.js`;
    return hook;
  };

  const makeSubsystem = (hooks) => ({
    ctx: { config: { base: true } },
    api: { __facets: new Map() },
    hooks,
    defaultHooks: [],
    ms: { isKernelInit: () => false },
  });

  it('builds plan with dependency ordering', () => {
    const hooks = [
      hookFactory('router'),
      hookFactory('queue'),
      hookFactory('processor', { required: ['router', 'queue'] }),
    ];
    const subsystem = makeSubsystem(hooks);
    const plan = verifySubsystemBuild(subsystem, {});
    expect(plan.orderedKinds).toEqual(['router', 'queue', 'processor']);
    expect(plan.facetsByKind.processor).toBeDefined();
    expect(hooks[2]).toHaveBeenCalled();
  });

  it('throws for duplicate facets without overwrite', () => {
    const hooks = [hookFactory('router'), hookFactory('router')];
    const subsystem = makeSubsystem(hooks);
    expect(() => verifySubsystemBuild(subsystem, {})).toThrow(/Duplicate facet kind/);
  });

  it('uses graph cache when provided', () => {
    const cache = { get: vi.fn().mockReturnValue({ valid: true, orderedKinds: ['router'] }) };
    const hooks = [hookFactory('router')];
    const subsystem = makeSubsystem(hooks);
    const plan = verifySubsystemBuild(subsystem, {}, cache);
    expect(plan.orderedKinds).toEqual(['router']);
    expect(cache.get).toHaveBeenCalled();
  });

  it('throws when required dependency missing', () => {
    const hooks = [hookFactory('processor', { required: ['router'] })];
    const subsystem = makeSubsystem(hooks);
    expect(() => verifySubsystemBuild(subsystem, {})).toThrow(/requires missing facet 'router'/);
  });
});

describe('buildSubsystem', () => {
  const makeSubsystem = () => {
    const facets = new Map();
    facets.has = vi.fn(() => false);
    facets.find = vi.fn(() => undefined);
    facets.remove = vi.fn();
    facets.addMany = vi.fn().mockResolvedValue(undefined);
    return {
      ctx: {},
      api: { __facets: facets },
      name: 'test',
    };
  };

  it('adds new facets via FacetManager', async () => {
    const subsystem = makeSubsystem();
    const plan = {
      resolvedCtx: { config: {} },
      orderedKinds: ['router'],
      facetsByKind: { router: { getKind: () => 'router' } },
    };
    await buildSubsystem(subsystem, plan);
    expect(subsystem.api.__facets.addMany).toHaveBeenCalledWith(
      ['router'],
      { router: plan.facetsByKind.router },
      expect.objectContaining({ init: true, attach: true }),
    );
  });

  it('skips facet add when already present and not overwritable', async () => {
    const subsystem = makeSubsystem();
    const existingFacet = { getKind: () => 'router', shouldOverwrite: () => false };
    subsystem.api.__facets.find = vi.fn((kind) => kind === 'router' ? existingFacet : undefined);
    const plan = {
      resolvedCtx: {},
      orderedKinds: ['router'],
      facetsByKind: { router: { getKind: () => 'router', shouldOverwrite: () => false } },
    };
    await buildSubsystem(subsystem, plan);
    expect(subsystem.api.__facets.addMany).not.toHaveBeenCalled();
  });

  it('throws on invalid plan shape', async () => {
    const subsystem = makeSubsystem();
    await expect(buildSubsystem(subsystem, null)).rejects.toThrow(/invalid plan/);
  });
});

