import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  return {
    logger: {
      log: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Note: FacetManager is now from the plugin system, which imports FacetManagerTransaction internally
// We can't easily mock internal imports, so we'll test behavior instead of implementation details

vi.mock('../../utils/logger.utils.mycelia.js', () => ({
  createSubsystemLogger: () => hoisted.logger,
}));

import { FacetManager } from '../facet-manager.mycelia.js';
import { Facet } from '../facet.mycelia.js';

const createFacet = (kind, { attach = false } = {}) =>
  Object.assign(new Facet(kind, { attach }), {
    init: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    shouldAttach: vi.fn().mockReturnValue(attach),
  });

describe('FacetManager', () => {
  let subsystem;

  beforeEach(() => {
    vi.clearAllMocks();
    subsystem = { name: 'testSubsystem' };
  });

  it('adds single facet with init/attach and rolls back on init failure', async () => {
    const manager = new FacetManager(subsystem);
    const facet = createFacet('router', { attach: true });
    await manager.add('router', facet, { init: true, attach: true, ctx: { foo: true }, api: subsystem.api });

    expect(facet.init).toHaveBeenCalled();
    expect(subsystem.router).toBe(facet);

    const failingFacet = createFacet('queue');
    failingFacet.init.mockRejectedValue(new Error('boom'));
    await expect(manager.add('queue', failingFacet, { init: true })).rejects.toThrow('boom');
    expect(manager.find('queue')).toBeUndefined();
  });

  it('attach throws when facet missing or property exists', () => {
    const manager = new FacetManager(subsystem);
    expect(() => manager.attach('router')).toThrow(/not found/);
    const facet = createFacet('router', { attach: true });
    manager.add('router', facet);
    subsystem.router = {};
    expect(() => manager.attach('router')).toThrow(/property already exists/);
  });

  it('remove/find/has/getAll APIs behave correctly', () => {
    const manager = new FacetManager(subsystem);
    const facet = createFacet('router');
    manager.add('router', facet);
    expect(manager.find('router')).toBe(facet);
    expect(manager.has('router')).toBe(true);
    expect(manager.getAllKinds()).toEqual(['router']);
    expect(manager.size()).toBe(1);
    manager.remove('router');
    expect(manager.has('router')).toBe(false);
  });

  it('addMany groups by dependency level and rolls back on failure', async () => {
    const manager = new FacetManager(subsystem);
    const router = createFacet('router', { attach: true });
    const processor = createFacet('processor');
    vi.spyOn(router, 'getDependencies').mockReturnValue([]);
    vi.spyOn(processor, 'getDependencies').mockReturnValue(['router']);

    // Test that addMany works correctly with dependencies
    await manager.addMany(['router', 'processor'], { router, processor }, { init: true, attach: true });
    expect(manager.find('router')).toBe(router);
    expect(manager.find('processor')).toBe(processor);
    
    // Test that rollback happens on failure
    const failing = createFacet('queue');
    failing.init.mockRejectedValue(new Error('fail'));
    await expect(manager.addMany(['queue'], { queue: failing }, { init: true })).rejects.toThrow();
    // After failure, the facet should not be added
    expect(manager.find('queue')).toBeUndefined();
  });

  it('addMany sets orderIndex for each facet based on position in orderedKinds', async () => {
    const manager = new FacetManager(subsystem);
    const queue = createFacet('queue');
    const statistics = createFacet('statistics');
    const router = createFacet('router');
    const processor = createFacet('processor');
    
    vi.spyOn(queue, 'getDependencies').mockReturnValue([]);
    vi.spyOn(statistics, 'getDependencies').mockReturnValue([]);
    vi.spyOn(router, 'getDependencies').mockReturnValue([]);
    vi.spyOn(processor, 'getDependencies').mockReturnValue(['router', 'statistics', 'queue']);

    const orderedKinds = ['queue', 'statistics', 'router', 'processor'];
    await manager.addMany(orderedKinds, { queue, statistics, router, processor }, { init: false, attach: false });

    expect(queue.orderIndex).toBe(0);
    expect(statistics.orderIndex).toBe(1);
    expect(router.orderIndex).toBe(2);
    expect(processor.orderIndex).toBe(3);
  });

  it('disposeAll logs errors and clears facets', async () => {
    const manager = new FacetManager(subsystem);
    const good = createFacet('router');
    const bad = createFacet('processor');
    bad.dispose.mockRejectedValue(new Error('dispose error'));
    manager.add('router', good);
    manager.add('processor', bad);
    await manager.disposeAll(subsystem);
    expect(manager.size()).toBe(0);
    expect(bad.dispose).toHaveBeenCalled();
  });

  it('find returns last facet when orderIndex not provided', async () => {
    const manager = new FacetManager(subsystem);
    const router1 = createFacet('router');
    const router2 = createFacet('router');
    // Set overwrite to allow adding multiple facets of same kind
    vi.spyOn(router2, 'shouldOverwrite').mockReturnValue(true);
    
    // Add first facet - addMany will set orderIndex to 0
    await manager.addMany(['router'], { router: router1 }, { init: false, attach: false });
    // Manually set orderIndex after adding
    router1.setOrderIndex(2);
    
    // Add second facet - addMany will set orderIndex to 0, but we'll update it
    await manager.addMany(['router'], { router: router2 }, { init: false, attach: false });
    router2.setOrderIndex(5);
    
    // find() without orderIndex should return the last one (highest orderIndex)
    expect(manager.find('router')).toBe(router2);
    expect(manager.find('router', undefined)).toBe(router2);
  });

  it('find returns specific facet when orderIndex is provided', async () => {
    const manager = new FacetManager(subsystem);
    const router1 = createFacet('router');
    const router2 = createFacet('router');
    // Set overwrite to allow adding multiple facets of same kind
    vi.spyOn(router2, 'shouldOverwrite').mockReturnValue(true);
    
    // Add first facet
    await manager.addMany(['router'], { router: router1 }, { init: false, attach: false });
    router1.setOrderIndex(2);
    
    // Add second facet
    await manager.addMany(['router'], { router: router2 }, { init: false, attach: false });
    router2.setOrderIndex(5);
    
    // find() with orderIndex should return the specific facet
    expect(manager.find('router', 2)).toBe(router1);
    expect(manager.find('router', 5)).toBe(router2);
    expect(manager.find('router', 10)).toBeUndefined(); // Non-existent index
  });

  it('getCount returns correct count for facets', async () => {
    const manager = new FacetManager(subsystem);
    
    // No facets
    expect(manager.getCount('router')).toBe(0);
    
    // Single facet
    const router1 = createFacet('router');
    await manager.addMany(['router'], { router: router1 }, { init: false, attach: false });
    expect(manager.getCount('router')).toBe(1);
    
    // Multiple facets
    const router2 = createFacet('router');
    vi.spyOn(router2, 'shouldOverwrite').mockReturnValue(true);
    await manager.addMany(['router'], { router: router2 }, { init: false, attach: false });
    expect(manager.getCount('router')).toBe(2);
  });

  it('hasMultiple returns true only when multiple facets exist', async () => {
    const manager = new FacetManager(subsystem);
    
    // No facets
    expect(manager.hasMultiple('router')).toBe(false);
    
    // Single facet
    const router1 = createFacet('router');
    await manager.addMany(['router'], { router: router1 }, { init: false, attach: false });
    expect(manager.hasMultiple('router')).toBe(false);
    
    // Multiple facets
    const router2 = createFacet('router');
    vi.spyOn(router2, 'shouldOverwrite').mockReturnValue(true);
    await manager.addMany(['router'], { router: router2 }, { init: false, attach: false });
    expect(manager.hasMultiple('router')).toBe(true);
  });

  it('getByIndex returns facet at specific position in array', async () => {
    const manager = new FacetManager(subsystem);
    const router1 = createFacet('router');
    const router2 = createFacet('router');
    const router3 = createFacet('router');
    
    // Set orderIndex before adding (so array is sorted correctly)
    router1.setOrderIndex(2);
    router2.setOrderIndex(5);
    router3.setOrderIndex(8);
    
    // Set overwrite to allow adding multiple facets of same kind
    vi.spyOn(router2, 'shouldOverwrite').mockReturnValue(true);
    vi.spyOn(router3, 'shouldOverwrite').mockReturnValue(true);
    
    // Add facets - they will be sorted by orderIndex when added
    await manager.addMany(['router'], { router: router1 }, { init: false, attach: false });
    await manager.addMany(['router'], { router: router2 }, { init: false, attach: false });
    await manager.addMany(['router'], { router: router3 }, { init: false, attach: false });
    
    // getByIndex returns by position in array (sorted by orderIndex)
    expect(manager.getByIndex('router', 0)).toBe(router1); // First in array (orderIndex 2)
    expect(manager.getByIndex('router', 1)).toBe(router2); // Second in array (orderIndex 5)
    expect(manager.getByIndex('router', 2)).toBe(router3); // Third in array (orderIndex 8)
    expect(manager.getByIndex('router', 3)).toBeUndefined(); // Out of bounds
  });

  it('getByIndex handles single facet (legacy)', () => {
    const manager = new FacetManager(subsystem);
    const router = createFacet('router');
    manager.add('router', router);
    
    expect(manager.getByIndex('router', 0)).toBe(router);
    expect(manager.getByIndex('router', 1)).toBeUndefined();
  });
});

