import { describe, it, expect } from 'vitest';
import { MessageSystemRegistry } from '../message-system-registry.mycelia.js';

describe('MessageSystemRegistry', () => {
  it('sets and finds subsystems, hiding kernel from get/find', () => {
    const registry = new MessageSystemRegistry();
    expect(registry.set('kernel', { name: 'kernel' })).toBe(true);
    expect(registry.set('kernel', { name: 'kernel-2' })).toBe(false);
    registry.set('canvas', { name: 'canvas' });

    expect(registry.find('canvas')).toEqual({ name: 'canvas' });
    expect(registry.find('kernel')).toBeUndefined();
    expect(registry.getNames()).toEqual(['canvas']);
  });

  it('throws on invalid input and exposes iteration helpers', () => {
    const registry = new MessageSystemRegistry();
    expect(() => registry.set('', {})).toThrow(/name/);
    expect(() => registry.set('svc', null)).toThrow(/subsystem/);
    registry.set('svc', { name: 'svc' });

    expect(registry.has('svc')).toBe(true);
    expect(registry.size).toBe(1);
    expect(Array.from(registry).length).toBe(1);
    expect(registry.keys()).toEqual(['svc']);
    expect(registry.values()).toEqual([{ name: 'svc' }]);
    expect(registry.delete('svc')).toBe(true);
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

