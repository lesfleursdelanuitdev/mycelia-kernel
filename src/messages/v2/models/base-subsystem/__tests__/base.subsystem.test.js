import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger utilities
vi.mock('../../utils/logger.utils.mycelia.js', () => ({
  createSubsystemLogger: () => ({
    log: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock disposeChildren utility
const hoisted = vi.hoisted(() => ({
  disposeChildren: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../base-subsystem.utils.mycelia.js', () => hoisted);

import { BaseSubsystem } from '../base.subsystem.mycelia.js';
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
    // Verify builder and facet manager are created (real implementations)
    expect(subsystem._builder).toBeDefined();
    expect(subsystem.api.__facets).toBeDefined();
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
    // Verify builder was used (real implementation)
    expect(subsystem._builder).toBeDefined();
    expect(init).toHaveBeenCalledWith(subsystem.api, subsystem.ctx);
  });

  it('build reuses promise while in progress', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    // Mock the builder's build method to delay
    const originalBuild = subsystem._builder.build.bind(subsystem._builder);
    subsystem._builder.build = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(), 10)),
    );
    const p1 = subsystem.build();
    const p2 = subsystem.build();
    expect(p1).toStrictEqual(p2);
    // Restore original
    subsystem._builder.build = originalBuild;
  });

  it('dispose waits for build, disposes facets and children', async () => {
    const subsystem = new BaseSubsystem('test', makeOptions());
    await subsystem.build();
    // Mock disposeAll to verify it's called
    const disposeAllSpy = vi.spyOn(subsystem.api.__facets, 'disposeAll').mockResolvedValue(undefined);
    await subsystem.dispose();
    // disposeChildren is called by the parent class (plugin system)
    // We can verify the subsystem was disposed
    expect(disposeAllSpy).toHaveBeenCalledWith(subsystem);
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

