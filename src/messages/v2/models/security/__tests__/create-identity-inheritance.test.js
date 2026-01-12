import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIdentity } from '../create-identity.mycelia.js';
import { Resource } from '../resource.mycelia.js';
import { PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

describe('createIdentity - Permission Inheritance', () => {
  let principals;
  let kernel;
  let ownerPkr;
  let userPkr;
  let parentResourcePkr;
  let childResourcePkr;

  beforeEach(() => {
    ownerPkr = { uuid: 'owner', publicKey: Symbol('owner') };
    userPkr = { uuid: 'user', publicKey: Symbol('user') };
    parentResourcePkr = { uuid: 'parent-resource', publicKey: Symbol('parent-resource') };
    childResourcePkr = { uuid: 'child-resource', publicKey: Symbol('child-resource') };

    // Mock RWS for parent resource
    const parentRws = {
      canRead: vi.fn().mockReturnValue(true), // User has read on parent
      canWrite: vi.fn().mockReturnValue(false), // User doesn't have write on parent
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn().mockReturnValue(true),
      addWriter: vi.fn().mockReturnValue(true),
      addGranter: vi.fn().mockReturnValue(true),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };

    // Mock RWS for child resource (no permissions granted)
    const childRws = {
      canRead: vi.fn().mockReturnValue(false), // User doesn't have read on child
      canWrite: vi.fn().mockReturnValue(false), // User doesn't have write on child
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn().mockReturnValue(true),
      addWriter: vi.fn().mockReturnValue(true),
      addGranter: vi.fn().mockReturnValue(true),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };

    // Mock PrincipalRegistry
    const parentPrincipal = {
      uuid: parentResourcePkr.uuid,
      instance: null, // Will be set to parent resource
    };

    const childPrincipal = {
      uuid: childResourcePkr.uuid,
      instance: null, // Will be set to child resource
    };

    principals = {
      createRWS: vi.fn((pkr) => {
        if (pkr.uuid === parentResourcePkr.uuid) return parentRws;
        if (pkr.uuid === childResourcePkr.uuid) return childRws;
        return childRws; // Default
      }),
      resolvePKR: vi.fn().mockReturnValue(Symbol('priv')),
      get: vi.fn((uuid) => {
        if (uuid === parentResourcePkr.uuid) return parentPrincipal;
        if (uuid === childResourcePkr.uuid) return childPrincipal;
        return null;
      }),
    };

    kernel = {
      sendProtected: vi.fn().mockResolvedValue('sent'),
      sendPooledProtected: vi.fn().mockResolvedValue('sent'),
      getAccessControl: vi.fn(),
      getChannelManager: vi.fn(),
    };
  });

  it('inherits read permission from parent resource when inherit is enabled', () => {
    // Create parent instance and resource
    const parentInstance = {};
    const parentResource = new Resource({
      name: 'parent',
      type: 'gedcom-tree',
      owner: { name: 'owner' },
      instance: parentInstance,
    });

    // Create parent identity
    const parentIdentity = createIdentity(principals, parentResourcePkr, kernel);
    parentInstance.identity = parentIdentity;

    // Set parent principal's instance
    const parentPrincipal = principals.get(parentResourcePkr.uuid);
    parentPrincipal.instance = parentResource;

    // Create child instance and resource with parent
    const childInstance = {};
    const childResource = new Resource({
      name: 'child',
      type: 'gedcom-branch',
      owner: { name: 'owner' },
      parent: parentResource,
      instance: childInstance,
    });

    // Create child identity
    const childIdentity = createIdentity(principals, childResourcePkr, kernel);
    childInstance.identity = childIdentity;

    // Set child principal's instance
    const childPrincipal = principals.get(childResourcePkr.uuid);
    childPrincipal.instance = childResource;

    // Without inheritance: child doesn't have permission
    expect(childIdentity.canRead(userPkr)).toBe(false);

    // With inheritance: child inherits permission from parent
    expect(childIdentity.canRead(userPkr, { inherit: true })).toBe(true);
  });

  it('does not inherit write permission when parent also lacks it', () => {
    // Create parent instance and resource
    const parentInstance = {};
    const parentResource = new Resource({
      name: 'parent',
      type: 'gedcom-tree',
      owner: { name: 'owner' },
      instance: parentInstance,
    });

    // Create parent identity
    const parentIdentity = createIdentity(principals, parentResourcePkr, kernel);
    parentInstance.identity = parentIdentity;

    // Set parent principal's instance
    const parentPrincipal = principals.get(parentResourcePkr.uuid);
    parentPrincipal.instance = parentResource;

    // Create child instance and resource with parent
    const childInstance = {};
    const childResource = new Resource({
      name: 'child',
      type: 'gedcom-branch',
      owner: { name: 'owner' },
      parent: parentResource,
      instance: childInstance,
    });

    // Create child identity
    const childIdentity = createIdentity(principals, childResourcePkr, kernel);
    childInstance.identity = childIdentity;

    // Set child principal's instance
    const childPrincipal = principals.get(childResourcePkr.uuid);
    childPrincipal.instance = childResource;

    // Parent doesn't have write permission
    expect(parentIdentity.canWrite(userPkr)).toBe(false);

    // Child also doesn't have write permission, even with inheritance
    expect(childIdentity.canWrite(userPkr, { inherit: true })).toBe(false);
  });

  it('does not inherit when resource has no parent', () => {
    // Create RWS that returns false (no permission)
    const noPermissionRws = {
      canRead: vi.fn().mockReturnValue(false),
      canWrite: vi.fn().mockReturnValue(false),
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      addGranter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };
    principals.createRWS.mockReturnValue(noPermissionRws);

    // Create instance and resource without parent
    const instance = {};
    const resource = new Resource({
      name: 'resource',
      type: 'gedcom-tree',
      owner: { name: 'owner' },
      instance: instance,
    });

    // Create identity
    const identity = createIdentity(principals, parentResourcePkr, kernel);
    instance.identity = identity;

    // Set principal's instance
    const principal = principals.get(parentResourcePkr.uuid);
    principal.instance = resource;

    // Without inheritance: no permission
    expect(identity.canRead(userPkr)).toBe(false);

    // With inheritance: still no permission (no parent to inherit from)
    expect(identity.canRead(userPkr, { inherit: true })).toBe(false);
  });

  it('does not inherit when identity does not belong to a resource', () => {
    // Create RWS that returns true for owner
    const ownerRws = {
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canGrant: vi.fn().mockReturnValue(true),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      addGranter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };
    principals.createRWS.mockReturnValue(ownerRws);

    // Create identity for a non-resource principal
    const identity = createIdentity(principals, ownerPkr, kernel);

    // Set principal without resource instance
    const principal = {
      uuid: ownerPkr.uuid,
      instance: { name: 'subsystem' }, // Not a resource
    };
    principals.get.mockReturnValue(principal);

    // Inheritance should not work (not a resource), but own permission works
    expect(identity.canRead(userPkr, { inherit: true })).toBe(true); // Own permission works
  });

  it('inherits recursively through multiple levels', () => {
    const grandparentPkr = { uuid: 'grandparent-resource', publicKey: Symbol('grandparent-resource') };
    const grandparentRws = {
      canRead: vi.fn().mockReturnValue(true), // User has read on grandparent
      canWrite: vi.fn().mockReturnValue(false),
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      addGranter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };
    const parentRws = {
      canRead: vi.fn().mockReturnValue(false),
      canWrite: vi.fn().mockReturnValue(false),
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      addGranter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };
    const childRws = {
      canRead: vi.fn().mockReturnValue(false),
      canWrite: vi.fn().mockReturnValue(false),
      canGrant: vi.fn().mockReturnValue(false),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      addGranter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      removeGranter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(false),
    };
    principals.createRWS.mockImplementation((pkr) => {
      if (pkr.uuid === grandparentPkr.uuid) return grandparentRws;
      if (pkr.uuid === parentResourcePkr.uuid) return parentRws;
      if (pkr.uuid === childResourcePkr.uuid) return childRws;
      return childRws;
    });

    // Create grandparent instance and resource
    const grandparentInstance = {};
    const grandparentResource = new Resource({
      name: 'grandparent',
      type: 'gedcom-tree',
      owner: { name: 'owner' },
      instance: grandparentInstance,
    });
    const grandparentIdentity = createIdentity(principals, grandparentPkr, kernel);
    grandparentInstance.identity = grandparentIdentity;
    const grandparentPrincipal = { uuid: grandparentPkr.uuid, instance: grandparentResource };

    // Create parent instance and resource with grandparent as parent
    const parentInstance = {};
    const parentResource = new Resource({
      name: 'parent',
      type: 'gedcom-branch',
      owner: { name: 'owner' },
      parent: grandparentResource,
      instance: parentInstance,
    });
    const parentIdentity = createIdentity(principals, parentResourcePkr, kernel);
    parentInstance.identity = parentIdentity;
    const parentPrincipal = { uuid: parentResourcePkr.uuid, instance: parentResource };

    // Create child instance and resource with parent
    const childInstance = {};
    const childResource = new Resource({
      name: 'child',
      type: 'gedcom-node',
      owner: { name: 'owner' },
      parent: parentResource,
      instance: childInstance,
    });
    const childIdentity = createIdentity(principals, childResourcePkr, kernel);
    childInstance.identity = childIdentity;
    const childPrincipal = { uuid: childResourcePkr.uuid, instance: childResource };

    principals.get.mockImplementation((uuid) => {
      if (uuid === grandparentPkr.uuid) return grandparentPrincipal;
      if (uuid === parentResourcePkr.uuid) return parentPrincipal;
      if (uuid === childResourcePkr.uuid) return childPrincipal;
      return null;
    });

    // Child should inherit from grandparent through parent
    expect(childIdentity.canRead(userPkr, { inherit: true })).toBe(true);
  });
});

