import { describe, it, expect, vi } from 'vitest';
import { Resource } from '../resource.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

vi.mock('../security.utils.mycelia.js', () => ({
  PRINCIPAL_KINDS: { RESOURCE: 'resource' },
}));

const mockOwner = (name = 'kernel') => ({
  name,
  getNameString: vi.fn().mockReturnValue(`${name}://`),
  identity: { pkr: { uuid: 'uuid-123' } },
});

describe('Resource', () => {
  it('captures constructor arguments and exposes getters', () => {
    const owner = mockOwner();
    const resource = new Resource({
      name: 'cache',
      type: 'memory',
      metadata: { tier: 'hot' },
      owner,
      instance: { ref: true },
    });
    expect(resource.kind).toBe(PRINCIPAL_KINDS.RESOURCE);
    expect(resource.isResource).toBe(true);
    expect(resource.name).toBe('cache');
    expect(resource.type).toBe('memory');
    expect(resource.metadata).toEqual({ tier: 'hot' });
    expect(resource.owner).toBe(owner);
    expect(resource.instance).toEqual({ ref: true });
    expect(resource.children instanceof Map).toBe(true);
  });

  it('manages children keyed by name/type combo', () => {
    const parent = new Resource({ name: 'parent', type: 'bucket' });
    const child1 = new Resource({ name: 'child', type: 'node' });
    expect(parent.addChild('child', 'node', child1)).toBe(true);
    expect(parent.hasChild('child', 'node')).toBe(true);
    expect(parent.addChild('child', 'node', child1)).toBe(false);
  });

  it('builds hierarchical name strings', () => {
    const owner = mockOwner('kernel');
    const root = new Resource({ name: 'root-resource', type: 'bucket', owner });
    const child = new Resource({ name: 'leaf', type: 'file', parent: root, owner });
    expect(root.getNameString()).toContain('type.bucket.name.root-resource');
    expect(child.getNameString()).toContain('/res.type.file.name.leaf');
    expect(child.toString()).toContain('Resource');
  });

  it('toRecord prefers owner identity UUID', () => {
    const owner = mockOwner('kernel');
    const resource = new Resource({ name: 'db', type: 'sql', owner });
    const record = resource.toRecord();
    expect(record).toEqual(
      expect.objectContaining({
        kind: 'resource',
        name: 'db',
        owner: 'uuid-123',
      }),
    );
  });
});

