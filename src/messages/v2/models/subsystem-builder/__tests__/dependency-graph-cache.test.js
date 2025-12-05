import { describe, it, expect } from 'vitest';
import { DependencyGraphCache } from '../dependency-graph-cache.mycelia.js';

describe('DependencyGraphCache', () => {
  it('requires positive capacity', () => {
    expect(() => new DependencyGraphCache(0)).toThrow(/capacity/);
  });

  it('stores and returns entries, updating LRU order', () => {
    const cache = new DependencyGraphCache(2);
    cache.set('a', true, ['a']);
    cache.set('b', true, ['b']);
    expect(cache.get('a')?.orderedKinds).toEqual(['a']);
    cache.set('c', true, ['c']);
    expect(cache.get('b')).toBeNull(); // evicted
    expect(cache.get('c')?.orderedKinds).toEqual(['c']);
  });

  it('overwrites existing keys without evicting', () => {
    const cache = new DependencyGraphCache(1);
    cache.set('a', true, ['a']);
    cache.set('a', false, null, 'err');
    expect(cache.get('a')).toEqual({ valid: false, error: 'err' });
    expect(cache.size()).toBe(1);
  });

  it('clear resets cache and getStats reports values', () => {
    const cache = new DependencyGraphCache(2);
    cache.set('a', true, ['a']);
    expect(cache.getStats()).toEqual({ capacity: 2, size: 1, keys: ['a'] });
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeNull();
  });
});

