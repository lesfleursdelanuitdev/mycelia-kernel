import { describe, it, expect } from 'vitest';
import { StandalonePluginSystem } from '../standalone-plugin-system.mycelia.js';

describe('StandalonePluginSystem', () => {
  it('provides no-op message APIs', async () => {
    const system = new StandalonePluginSystem('plugins');
    
    // Plugin system's accept returns true (no-op)
    await expect(system.accept({}, {})).resolves.toBe(true);
    
    // Plugin system's process returns null (no-op)
    await expect(system.process()).resolves.toBeNull();
    
    // Plugin system's pause/resume return this (no-op)
    expect(system.pause()).toBe(system);
    expect(system.resume()).toBe(system);
    
    // Plugin system's registerRoute/unregisterRoute return null if router not available
    expect(system.registerRoute('x', () => {})).toBeNull();
    expect(system.unregisterRoute('x')).toBeNull();
  });
  
  it('can be built and used', async () => {
    const system = new StandalonePluginSystem('test-system');
    await system.build();
    expect(system.isBuilt).toBe(true);
  });
});

