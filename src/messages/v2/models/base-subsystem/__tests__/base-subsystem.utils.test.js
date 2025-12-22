import { describe, it, expect, vi } from 'vitest';
import { collectChildren, buildChildren, disposeChildren } from '../base-subsystem.utils.mycelia.js';

describe('base-subsystem.utils', () => {
  const makeParent = (reg) => ({
    ctx: { graphCache: { cache: true } },
    find: vi.fn((kind) => (kind === 'hierarchy' ? { children: reg } : null)),
    children: reg,
  });

  it('collectChildren prefers hierarchy registry', () => {
    const registry = { list: vi.fn().mockReturnValue(['child1']) };
    const parent = makeParent(registry);
    const children = collectChildren(parent);
    expect(children).toEqual(['child1']);
    expect(parent.find).toHaveBeenCalledWith('hierarchy');
  });

  it('collectChildren handles Map and array fallbacks', () => {
    const mapParent = { find: () => null, children: new Map([['a', 'child']]) };
    expect(collectChildren(mapParent)).toEqual(['child']);
    const arrParent = { find: () => null, children: ['a'] };
    expect(collectChildren(arrParent)).toEqual(['a']);
    const noneParent = { find: () => null };
    expect(collectChildren(noneParent)).toEqual([]);
  });

  it('buildChildren builds children with parent context', async () => {
    const child = {
      build: vi.fn().mockResolvedValue(undefined),
      _isBuilt: false,
      ctx: {},
    };
    const parent = makeParent([child]);
    parent.ctx.parent = { foo: true };

    await buildChildren(parent);

    expect(child.ctx.parent).toBe(parent.ctx);
    expect(child.ctx.graphCache).toBe(parent.ctx.graphCache);
    expect(child.build).toHaveBeenCalled();
  });

  it('buildChildren skips already built children', async () => {
    const child = { build: vi.fn(), _isBuilt: true, ctx: {} };
    const parent = makeParent([child]);
    await buildChildren(parent);
    expect(child.build).not.toHaveBeenCalled();
  });

  it('disposeChildren disposes in reverse order', async () => {
    const child1 = { dispose: vi.fn().mockResolvedValue(undefined) };
    const child2 = { dispose: vi.fn().mockResolvedValue(undefined) };
    const parent = makeParent([child1, child2]);

    await disposeChildren(parent);

    expect(child2.dispose).toHaveBeenCalled();
    expect(child1.dispose).toHaveBeenCalled();
    expect(child2.dispose.mock.invocationCallOrder[0]).toBeLessThan(child1.dispose.mock.invocationCallOrder[0]);
  });
});

