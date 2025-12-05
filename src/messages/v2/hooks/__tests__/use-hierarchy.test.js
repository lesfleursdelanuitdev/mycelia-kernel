import { describe, it, expect } from 'vitest';
import { useHierarchy } from '../hierarchy/use-hierarchy.mycelia.js';

const createCtx = (overrides = {}) => ({
  config: {},
  ...overrides,
});

const createApi = (name) => ({ name });

const createSubsystemWithHierarchy = (name = 'subsystem') => {
  const subsystem = { name, _parent: null };
  const api = createApi(name);
  const ctx = createCtx();
  const facet = useHierarchy(ctx, api, subsystem);

  subsystem.find = (kind) => (kind === 'hierarchy' ? facet : undefined);

  return { subsystem, facet };
};

describe('useHierarchy', () => {
  it('creates an attachable hierarchy facet with a contract', () => {
    const { facet } = createSubsystemWithHierarchy('parent');

    expect(facet.getKind()).toBe('hierarchy');
    expect(facet.getContract()).toBe('hierarchy');
    expect(facet.shouldAttach()).toBe(true);
  });

  it('manages children through the registry interface', () => {
    const { facet } = createSubsystemWithHierarchy('parent');
    const child = { name: 'child-1', _parent: null, find: () => undefined };

    const added = facet.addChild(child);
    expect(added).toBe(child);
    expect(facet.listChildren()).toHaveLength(1);
    expect(facet.getChild('child-1')).toBe(child);

    const { children: registryA } = facet;
    const { children: registryB } = facet;
    expect(registryA).toBe(registryB);
    expect(registryA.list()).toEqual([child]);
  });

  it('disallows registering reserved child names', () => {
    const { facet } = createSubsystemWithHierarchy('parent');
    const reservedChild = { name: 'kernel', _parent: null };

    expect(() => facet.addChild(reservedChild)).toThrow(/reserved name/i);
  });

  it('validates parent assignments', () => {
    const { facet, subsystem } = createSubsystemWithHierarchy('parent');
    expect(() => facet.setParent('not-an-object')).toThrow(/parent must be an object/i);

    const newParent = { name: 'root', find: () => undefined };
    expect(facet.setParent(newParent)).toBe(subsystem);
    expect(facet.getParent()).toBe(newParent);
  });

  it('traverses the hierarchy depth-first and breadth-first', () => {
    const root = createSubsystemWithHierarchy('root');
    const childA = createSubsystemWithHierarchy('child-a');
    const childB = createSubsystemWithHierarchy('child-b');
    const grandChild = createSubsystemWithHierarchy('grand-child');

    root.subsystem.find = (kind) => (kind === 'hierarchy' ? root.facet : undefined);
    childA.subsystem.find = (kind) => (kind === 'hierarchy' ? childA.facet : undefined);
    childB.subsystem.find = (kind) => (kind === 'hierarchy' ? childB.facet : undefined);
    grandChild.subsystem.find = (kind) => (kind === 'hierarchy' ? grandChild.facet : undefined);

    root.facet.addChild(childA.subsystem);
    root.facet.addChild(childB.subsystem);
    childA.subsystem._parent = root.subsystem;
    childB.subsystem._parent = root.subsystem;

    childA.facet.addChild(grandChild.subsystem);
    grandChild.subsystem._parent = childA.subsystem;

    const dfsOrder = [];
    root.facet.traverse((subsystem) => dfsOrder.push(subsystem.name));
    expect(dfsOrder).toEqual(['child-a', 'grand-child', 'child-b']);

    const bfsOrder = [];
    root.facet.traverseBFS((subsystem) => bfsOrder.push(subsystem.name));
    expect(bfsOrder).toEqual(['child-a', 'child-b', 'grand-child']);
  });

  it('clears registry state on dispose', () => {
    const { facet } = createSubsystemWithHierarchy('parent');
    facet.addChild({ name: 'child-1', _parent: null });

    facet.dispose();

    expect(facet.listChildren()).toHaveLength(0);
  });
});

