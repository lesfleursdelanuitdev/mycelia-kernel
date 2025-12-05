import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const deepMergeImpl = (target, source) => {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMergeImpl(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  };

  return {
    verifySubsystemBuild: vi.fn(),
    executeBuild: vi.fn(),
    deepMergeImpl,
  };
});

vi.mock('../subsystem-builder.utils.mycelia.js', () => ({
  verifySubsystemBuild: hoisted.verifySubsystemBuild,
  buildSubsystem: hoisted.executeBuild,
  deepMerge: hoisted.deepMergeImpl,
}));

import { SubsystemBuilder } from '../subsystem-builder.mycelia.js';

describe('SubsystemBuilder', () => {
  const makeSubsystem = () => ({
    ctx: {},
    api: { __facets: new Map() },
    hooks: [],
    defaultHooks: [],
    name: 'testSubsystem',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.verifySubsystemBuild.mockReset();
    hoisted.executeBuild.mockReset();
    hoisted.verifySubsystemBuild.mockReturnValue({
      resolvedCtx: { foo: true },
      orderedKinds: ['router'],
      facetsByKind: { router: {} },
      graphCache: { cached: true },
    });
    hoisted.executeBuild.mockResolvedValue(undefined);
  });

  it('throws when subsystem missing', () => {
    expect(() => new SubsystemBuilder()).toThrow(/subsystem is required/);
  });

  it('withCtx deep-merges config objects', () => {
    const subsystem = makeSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    builder.withCtx({ config: { a: 1 }, foo: 1 }).withCtx({ config: { b: 2 }, bar: 2 });
    builder.plan();
    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledWith(
      subsystem,
      { config: { a: 1, b: 2 }, foo: 1, bar: 2 },
      null,
    );
  });

  it('plan caches result and reuses when ctx unchanged', () => {
    const subsystem = makeSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    builder.withCtx({ foo: 'x' });
    builder.plan();
    builder.plan();
    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledTimes(1);
    expect(builder.getPlan()?.orderedKinds).toEqual(['router']);
  });

  it('plan prefers subsystem ctx graphCache over parameter', () => {
    const subsystem = makeSubsystem();
    const subsystemCache = { fromSubsystem: true };
    subsystem.ctx.graphCache = subsystemCache;

    const builder = new SubsystemBuilder(subsystem);
    const externalCache = { external: true };
    builder.plan(externalCache);

    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledWith(subsystem, {}, subsystemCache);
    expect(builder.getGraphCache()).toEqual({ cached: true });
  });

  it('build creates plan and executes buildSubsystem', async () => {
    const subsystem = makeSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    await builder.build();

    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledTimes(1);
    expect(hoisted.executeBuild).toHaveBeenCalledWith(subsystem, expect.objectContaining({
      orderedKinds: ['router'],
    }));
  });

  it('invalidate clears cached plan and hash', () => {
    const subsystem = makeSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    builder.plan();
    builder.invalidate();
    expect(builder.getPlan()).toBeNull();
    builder.plan();
    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledTimes(2);
  });

  it('clearCtx resets context hash and plan', () => {
    const subsystem = makeSubsystem();
    const builder = new SubsystemBuilder(subsystem);
    builder.withCtx({ foo: 1 }).plan();
    builder.clearCtx();
    builder.plan();
    expect(hoisted.verifySubsystemBuild).toHaveBeenCalledTimes(2);
  });
});

