/**
 * Hook Dependency Resolution Tests
 * 
 * Tests the registry-based dependency resolution system where multiple hooks
 * can be registered for the same kind, and overwrite hooks depend on previous hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractHookMetadata,
  orderHooksByDependencies,
  validateHookDependencies,
} from '../hook-processor.utils.mycelia.js';
import { Facet } from '../../facet-manager/facet.mycelia.js';

describe('Hook Dependency Resolution', () => {
  const hookFactory = (kind, { required = [], overwrite = false, source = null } = {}) => {
    const hook = vi.fn((ctx, api) => {
      const facet = new Facet(kind, { attach: true, source: source || `${kind}.js`, overwrite });
      vi.spyOn(facet, 'getDependencies').mockReturnValue([]);
      return facet;
    });
    hook.kind = kind;
    hook.required = required;
    hook.overwrite = overwrite;
    hook.source = source || `${kind}.js`;
    return hook;
  };

  describe('extractHookMetadata', () => {
    it('stores multiple hooks per kind as arrays', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('router', { overwrite: true }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      
      expect(Array.isArray(hooksByKind.router)).toBe(true);
      expect(hooksByKind.router.length).toBe(2);
      expect(hooksByKind.router[0].index).toBe(0);
      expect(hooksByKind.router[1].index).toBe(1);
      expect(hooksByKind.router[0].hook).toBe(hooks[0]);
      expect(hooksByKind.router[1].hook).toBe(hooks[1]);
    });

    it('maintains registration order', () => {
      const hooks = [
        hookFactory('router', { source: 'router-v1.js' }),
        hookFactory('router', { overwrite: true, source: 'router-v2.js' }),
        hookFactory('router', { overwrite: true, source: 'router-v3.js' }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      
      expect(hooksByKind.router.length).toBe(3);
      expect(hooksByKind.router[0].source).toBe('router-v1.js');
      expect(hooksByKind.router[1].source).toBe('router-v2.js');
      expect(hooksByKind.router[2].source).toBe('router-v3.js');
    });

    it('tracks overwrite flag correctly', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('router', { overwrite: true }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      
      expect(hooksByKind.router[0].overwrite).toBe(false);
      expect(hooksByKind.router[1].overwrite).toBe(true);
    });
  });

  describe('orderHooksByDependencies - Basic Ordering', () => {
    it('orders hooks with simple dependencies', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('queue'),
        hookFactory('processor', { required: ['router', 'queue'] }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      // processor should come after router and queue
      const routerIndex = ordered.indexOf(hooks[0]);
      const queueIndex = ordered.indexOf(hooks[1]);
      const processorIndex = ordered.indexOf(hooks[2]);
      
      expect(routerIndex).toBeLessThan(processorIndex);
      expect(queueIndex).toBeLessThan(processorIndex);
    });

    it('handles hooks with no dependencies', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('queue'),
        hookFactory('storage'),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      // All hooks should be present
      expect(ordered.length).toBe(3);
      expect(ordered).toContain(hooks[0]);
      expect(ordered).toContain(hooks[1]);
      expect(ordered).toContain(hooks[2]);
    });
  });

  describe('orderHooksByDependencies - Overwrite Hooks', () => {
    it('orders overwrite hook after original hook of same kind', () => {
      const hooks = [
        hookFactory('router', { source: 'use-router.js' }),
        hookFactory('router', { overwrite: true, required: ['router'], source: 'use-router-with-scopes.js' }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const originalIndex = ordered.indexOf(hooks[0]);
      const overwriteIndex = ordered.indexOf(hooks[1]);
      
      expect(originalIndex).toBeLessThan(overwriteIndex);
    });

    it('handles multiple overwrite hooks in chain', () => {
      const hooks = [
        hookFactory('router', { source: 'router-v1.js' }),
        hookFactory('router', { overwrite: true, required: ['router'], source: 'router-v2.js' }),
        hookFactory('router', { overwrite: true, required: ['router'], source: 'router-v3.js' }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const v1Index = ordered.indexOf(hooks[0]);
      const v2Index = ordered.indexOf(hooks[1]);
      const v3Index = ordered.indexOf(hooks[2]);
      
      expect(v1Index).toBeLessThan(v2Index);
      expect(v2Index).toBeLessThan(v3Index);
    });

    it('allows overwrite hook to depend on other kinds too', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('queue'),
        hookFactory('router', { overwrite: true, required: ['router', 'queue'] }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const routerIndex = ordered.indexOf(hooks[0]);
      const queueIndex = ordered.indexOf(hooks[1]);
      const overwriteIndex = ordered.indexOf(hooks[2]);
      
      expect(routerIndex).toBeLessThan(overwriteIndex);
      expect(queueIndex).toBeLessThan(overwriteIndex);
    });
  });

  describe('orderHooksByDependencies - Complex Scenarios', () => {
    it('handles overwrite hooks with mixed dependencies', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('storage'),
        hookFactory('router', { overwrite: true, required: ['router', 'storage'] }),
        hookFactory('processor', { required: ['router'] }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const routerIndex = ordered.indexOf(hooks[0]);
      const storageIndex = ordered.indexOf(hooks[1]);
      const overwriteIndex = ordered.indexOf(hooks[2]);
      const processorIndex = ordered.indexOf(hooks[3]);
      
      // Overwrite router depends on original router and storage
      expect(routerIndex).toBeLessThan(overwriteIndex);
      expect(storageIndex).toBeLessThan(overwriteIndex);
      
      // Processor depends on router (should get the last one, but execution order matters)
      // Processor should come after the overwrite router
      expect(overwriteIndex).toBeLessThan(processorIndex);
    });

    it('handles multiple kinds with overwrites', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('queue'),
        hookFactory('router', { overwrite: true, required: ['router'] }),
        hookFactory('queue', { overwrite: true, required: ['queue'] }),
        hookFactory('processor', { required: ['router', 'queue'] }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const routerIndex = ordered.indexOf(hooks[0]);
      const queueIndex = ordered.indexOf(hooks[1]);
      const routerOverwriteIndex = ordered.indexOf(hooks[2]);
      const queueOverwriteIndex = ordered.indexOf(hooks[3]);
      const processorIndex = ordered.indexOf(hooks[4]);
      
      // Overwrites come after originals
      expect(routerIndex).toBeLessThan(routerOverwriteIndex);
      expect(queueIndex).toBeLessThan(queueOverwriteIndex);
      
      // Processor comes after all
      expect(routerOverwriteIndex).toBeLessThan(processorIndex);
      expect(queueOverwriteIndex).toBeLessThan(processorIndex);
    });
  });

  describe('validateHookDependencies', () => {
    const makeFacets = (kinds) => {
      const facets = {};
      for (const kind of kinds) {
        facets[kind] = new Facet(kind, { attach: true, source: `${kind}.js` });
      }
      return facets;
    };

    it('validates overwrite hook has previous hook of same kind', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('router', { overwrite: true, required: ['router'] }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      const facetsByKind = makeFacets(['router']);
      const subsystem = { ms: { isKernelInit: () => false } };
      
      // Should not throw - previous hook exists
      expect(() => {
        validateHookDependencies(hooksByKind, facetsByKind, subsystem);
      }).not.toThrow();
    });

    it('throws when overwrite hook is first hook of kind', () => {
      const hooks = [
        hookFactory('router', { overwrite: true, required: ['router'] }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      const facetsByKind = makeFacets(['router']);
      const subsystem = { ms: { isKernelInit: () => false } };
      
      // Should throw - no previous hook to overwrite
      expect(() => {
        validateHookDependencies(hooksByKind, facetsByKind, subsystem);
      }).toThrow(/is the first hook of that kind/);
    });

    it('validates external dependencies exist', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('processor', { required: ['router', 'queue'] }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      const facetsByKind = makeFacets(['router']); // Missing 'queue'
      const subsystem = { ms: { isKernelInit: () => false } };
      
      expect(() => {
        validateHookDependencies(hooksByKind, facetsByKind, subsystem);
      }).toThrow(/requires missing facet 'queue'/);
    });

    it('skips kernelServices validation when kernel not initialized', () => {
      const hooks = [
        hookFactory('processor', { required: ['kernelServices'] }),
      ];
      
      const hooksByKind = extractHookMetadata(hooks);
      const facetsByKind = {}; // No kernelServices facet
      const subsystem = { ms: { isKernelInit: () => false } };
      
      // Should not throw - kernelServices is skipped
      expect(() => {
        validateHookDependencies(hooksByKind, facetsByKind, subsystem);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles overwrite hook without required dependency on same kind', () => {
      // Overwrite hook that doesn't require its own kind (should still work)
      const hooks = [
        hookFactory('router'),
        hookFactory('router', { overwrite: true, required: [] }), // No self-dependency
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      // Both hooks should be present
      expect(ordered.length).toBe(2);
      expect(ordered).toContain(hooks[0]);
      expect(ordered).toContain(hooks[1]);
    });

    it('handles overwrite hook requiring non-existent kind', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('router', { overwrite: true, required: ['router', 'nonexistent'] }),
      ];
      
      // Should not throw during ordering (validation happens later)
      const ordered = orderHooksByDependencies(hooks);
      
      expect(ordered.length).toBe(2);
    });

    it('handles multiple hooks of different kinds with same dependencies', () => {
      const hooks = [
        hookFactory('router'),
        hookFactory('queue'),
        hookFactory('processor1', { required: ['router', 'queue'] }),
        hookFactory('processor2', { required: ['router', 'queue'] }),
      ];
      
      const ordered = orderHooksByDependencies(hooks);
      
      const routerIndex = ordered.indexOf(hooks[0]);
      const queueIndex = ordered.indexOf(hooks[1]);
      const proc1Index = ordered.indexOf(hooks[2]);
      const proc2Index = ordered.indexOf(hooks[3]);
      
      expect(routerIndex).toBeLessThan(proc1Index);
      expect(queueIndex).toBeLessThan(proc1Index);
      expect(routerIndex).toBeLessThan(proc2Index);
      expect(queueIndex).toBeLessThan(proc2Index);
    });

    it('handles empty hooks array', () => {
      const ordered = orderHooksByDependencies([]);
      expect(ordered).toEqual([]);
    });

    it('handles single hook', () => {
      const hooks = [hookFactory('router')];
      const ordered = orderHooksByDependencies(hooks);
      expect(ordered).toEqual([hooks[0]]);
    });
  });

  describe('Integration - Real World Scenarios', () => {
    it('simulates useRouter -> useRouterWithScopes scenario', () => {
      const useRouter = hookFactory('router', { source: 'use-router.js' });
      const useRouterWithScopes = hookFactory('router', {
        overwrite: true,
        required: ['router'],
        source: 'use-router-with-scopes.js'
      });
      
      const hooks = [useRouter, useRouterWithScopes];
      const ordered = orderHooksByDependencies(hooks);
      
      // useRouter should execute before useRouterWithScopes
      expect(ordered[0]).toBe(useRouter);
      expect(ordered[1]).toBe(useRouterWithScopes);
    });

    it('simulates enhancement chain: base -> enhanced -> super-enhanced', () => {
      const base = hookFactory('storage', { source: 'base-storage.js' });
      const enhanced = hookFactory('storage', {
        overwrite: true,
        required: ['storage'],
        source: 'cached-storage.js'
      });
      const superEnhanced = hookFactory('storage', {
        overwrite: true,
        required: ['storage'],
        source: 'encrypted-cached-storage.js'
      });
      
      const hooks = [base, enhanced, superEnhanced];
      const ordered = orderHooksByDependencies(hooks);
      
      expect(ordered[0]).toBe(base);
      expect(ordered[1]).toBe(enhanced);
      expect(ordered[2]).toBe(superEnhanced);
    });

    it('handles parallel overwrite chains', () => {
      const router1 = hookFactory('router', { source: 'router-v1.js' });
      const router2 = hookFactory('router', { overwrite: true, required: ['router'], source: 'router-v2.js' });
      const queue1 = hookFactory('queue', { source: 'queue-v1.js' });
      const queue2 = hookFactory('queue', { overwrite: true, required: ['queue'], source: 'queue-v2.js' });
      const processor = hookFactory('processor', { required: ['router', 'queue'] });
      
      const hooks = [router1, router2, queue1, queue2, processor];
      const ordered = orderHooksByDependencies(hooks);
      
      // Both chains should be ordered correctly
      const router1Index = ordered.indexOf(router1);
      const router2Index = ordered.indexOf(router2);
      const queue1Index = ordered.indexOf(queue1);
      const queue2Index = ordered.indexOf(queue2);
      const processorIndex = ordered.indexOf(processor);
      
      expect(router1Index).toBeLessThan(router2Index);
      expect(queue1Index).toBeLessThan(queue2Index);
      expect(router2Index).toBeLessThan(processorIndex);
      expect(queue2Index).toBeLessThan(processorIndex);
    });
  });
});

