import { describe, it, expect, vi } from 'vitest';
import { Facet } from '../facet.mycelia.js';

describe('Facet', () => {
  it('requires a non-empty kind string and valid contract', () => {
    expect(() => new Facet()).toThrow(/kind/);
    expect(() => new Facet('router', { contract: 1 })).toThrow(/contract/);
    expect(() => new Facet('router', { contract: 'routerContract' })).not.toThrow();
  });

  it('add copies properties and rejects non-object input', () => {
    const facet = new Facet('router');
    expect(() => facet.add(null)).toThrow(/object must be/);
    const source = {
      value: 1,
      get computed() {
        return this.value * 2;
      },
      [Symbol.iterator]: function* () {
        yield this.value;
      },
    };
    facet.add(source);
    expect(facet.value).toBe(1);
    expect(facet.computed).toBe(2);
    expect([...facet]).toEqual([1]);
  });

  it('onInit/onDispose require functions and init freezes facet', async () => {
    const facet = new Facet('router');
    expect(() => facet.onInit(null)).toThrow(/function/);
    expect(() => facet.onDispose(null)).toThrow(/function/);

    const initSpy = vi.fn();
    const disposeSpy = vi.fn();
    facet.onInit(initSpy).onDispose(disposeSpy);
    await facet.init({ ctx: true });
    expect(initSpy).toHaveBeenCalled();
    expect(Object.isFrozen(facet)).toBe(true);
    await facet.dispose();
    expect(disposeSpy).toHaveBeenCalledWith(facet);
    await facet.init(); // second call no-op
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('prevents mutation after init', async () => {
    const facet = new Facet('router');
    await facet.init();
    expect(() => facet.add({ extra: true })).toThrow(/cannot mutate/);
    expect(() => facet.addDependency('queue')).toThrow(/cannot modify/);
    expect(() => facet.removeDependency('queue')).toThrow(/cannot modify/);
  });

  it('manages dependencies safely', () => {
    const facet = new Facet('router', { required: ['queue'] });
    facet.addDependency('processor').addDependency('queue');
    expect(facet.getDependencies()).toEqual(['queue', 'processor']);
    facet.removeDependency('queue');
    expect(facet.hasDependency('queue')).toBe(false);
    expect(facet.hasDependencies()).toBe(true);
  });

  it('exposes metadata accessors', () => {
    const facet = new Facet('router', { attach: true, overwrite: true, source: 'src', contract: 'routerContract' });
    expect(facet.getKind()).toBe('router');
    expect(facet.shouldAttach()).toBe(true);
    expect(facet.shouldOverwrite()).toBe(true);
    expect(facet.getSource()).toBe('src');
    expect(facet.getContract()).toBe('routerContract');
  });

  it('manages orderIndex correctly', () => {
    const facet = new Facet('router');
    expect(facet.orderIndex).toBeNull();
    
    facet.setOrderIndex(0);
    expect(facet.orderIndex).toBe(0);
    
    facet.setOrderIndex(5);
    expect(facet.orderIndex).toBe(5);
    
    // Should throw if index is invalid
    expect(() => facet.setOrderIndex(-1)).toThrow(/non-negative integer/);
    expect(() => facet.setOrderIndex(1.5)).toThrow(/non-negative integer/);
    expect(() => facet.setOrderIndex('0')).toThrow(/non-negative integer/);
  });

  it('prevents setting orderIndex after init', async () => {
    const facet = new Facet('router');
    await facet.init({}, {}, {});
    
    expect(() => facet.setOrderIndex(0)).toThrow(/cannot set order index after init/);
  });
});

