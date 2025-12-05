import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../subsystem-builder/subsystem-builder.mycelia.js', () => ({
  SubsystemBuilder: vi.fn().mockImplementation(() => ({
    withCtx: vi.fn().mockReturnThis(),
    build: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn(),
  })),
}));

vi.mock('../../facet-manager/facet-manager.mycelia.js', () => ({
  FacetManager: vi.fn().mockImplementation(() => ({
    getAllKinds: vi.fn().mockReturnValue(['router']),
    find: vi.fn(),
    addMany: vi.fn(),
    disposeAll: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../subsystem-builder/dependency-graph-cache.mycelia.js', () => ({
  DependencyGraphCache: vi.fn().mockImplementation(() => ({ cache: true })),
}));

vi.mock('../../utils/logger.utils.mycelia.js', () => ({
  createSubsystemLogger: () => ({
    log: vi.fn(),
    error: vi.fn(),
  }),
}));

const hoisted = vi.hoisted(() => ({
  disposeChildren: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../base-subsystem.utils.mycelia.js', () => hoisted);

import { BaseSubsystem } from '../base.subsystem.mycelia.js';
import { SubsystemBuilder } from '../../subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../../facet-manager/facet-manager.mycelia.js';
import { disposeChildren } from '../base-subsystem.utils.mycelia.js';

const msInstance = { name: 'ms' };
const makeOptions = () => ({ ms: msInstance, config: { foo: true } });

describe('BaseSubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires name and ms', () => {
    expect(() => new BaseSubsystem()).toThrow(/name/);
    expect(() => new BaseSubsystem('test')).toThrow(/options.ms/);
  });

  it('initializes ctx, builder, and facet manager', () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    expect(subsystem.ctx.ms).toBe(makeOptions().ms);
    expect(subsystem.ctx.config).toEqual({ foo: true });
    expect(SubsystemBuilder).toHaveBeenCalledWith(subsystem);
    expect(FacetManager).toHaveBeenCalledWith(subsystem);
  });

  it('setParent uses hierarchy facet when available', () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    const hierarchy = { setParent: vi.fn().mockReturnValue('ok'), getParent: () => 'parent', isRoot: () => false, getRoot: () => 'root' };
    subsystem.api.__facets.find = vi.fn().mockReturnValue(hierarchy);
    expect(subsystem.setParent('p')).toBe('ok');
    expect(subsystem.getParent()).toBe('parent');
    expect(subsystem.isRoot()).toBe(false);
    expect(subsystem.getRoot()).toBe('root');
  });

  it('use() rejects after build and non-functions', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    subsystem.use(() => {});
    expect(() => subsystem.use('not-fn')).toThrow(/hook must be a function/);
    subsystem._isBuilt = true;
    expect(() => subsystem.use(() => {})).toThrow(/cannot add hooks/);
  });

  it('build orchestrates builder and init callbacks', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    const init = vi.fn();
    subsystem.onInit(init);
    await subsystem.build();
    expect(subsystem._isBuilt).toBe(true);
    expect(SubsystemBuilder.mock.results[0].value.build).toHaveBeenCalled();
    expect(init).toHaveBeenCalledWith(subsystem.api, subsystem.ctx);
  });

  it('build reuses promise while in progress', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    const builderInstance = SubsystemBuilder.mock.results[0].value;
    builderInstance.build.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(), 10)),
    );
    const p1 = subsystem.build();
    const p2 = subsystem.build();
    expect(p1).toStrictEqual(p2);
  });

  it('dispose waits for build, disposes facets and children', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    await subsystem.build();
    await subsystem.dispose();
    expect(disposeChildren).toHaveBeenCalledWith(subsystem);
    expect(subsystem.api.__facets.disposeAll).toHaveBeenCalledWith(subsystem);
    expect(subsystem._isBuilt).toBe(false);
  });

  it('pause/resume delegate to scheduler facet', () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    const scheduler = { pauseProcessing: vi.fn(), resumeProcessing: vi.fn(), process: vi.fn().mockResolvedValue('done') };
    subsystem.api.__facets.find = vi.fn().mockReturnValue(scheduler);
    subsystem.pause();
    subsystem.resume();
    expect(scheduler.pauseProcessing).toHaveBeenCalled();
    expect(scheduler.resumeProcessing).toHaveBeenCalled();
  });

  it('accept/process guard missing facets', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    subsystem.coreProcessor = { accept: vi.fn().mockResolvedValue(true), processTick: vi.fn().mockResolvedValue('tick') };
    expect(await subsystem.accept({}, {})).toBe(true);
    expect(await subsystem.process()).toBe('tick');
    subsystem.coreProcessor.accept = undefined;
    await expect(subsystem.accept({}, {})).rejects.toThrow(/missing core/);
  });
});

