import { describe, it, expect, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.use = vi.fn().mockReturnThis();
    }
  }

  return {
    BaseSubsystemMock,
    useListeners: vi.fn(),
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../../hooks/listeners/use-listeners.mycelia.js', () => ({
  useListeners: hoisted.useListeners,
}));

import { StandalonePluginSystem } from '../standalone-plugin-system.mycelia.js';

describe('StandalonePluginSystem', () => {
  it('installs useListeners hook and overrides message APIs', async () => {
    const system = new StandalonePluginSystem('plugins');
    expect(system.use).not.toHaveBeenCalledWith(hoisted.useListeners);
    await expect(system.accept({}, {})).resolves.toBeUndefined();
    await expect(system.process()).resolves.toBeNull();
    expect(system.pause()).toBe(system);
    expect(system.resume()).toBe(system);
    expect(system.registerRoute('x', () => {})).toBe(false);
    expect(system.unregisterRoute('x')).toBe(false);
  });
});

