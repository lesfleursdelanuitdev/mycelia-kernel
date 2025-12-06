import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRws = {
  canRead: vi.fn().mockReturnValue(true),
  canWrite: vi.fn().mockReturnValue(true),
  canGrant: vi.fn().mockReturnValue(true),
  addReader: vi.fn(),
  addWriter: vi.fn(),
  removeReader: vi.fn(),
  removeWriter: vi.fn(),
  promote: vi.fn(),
  demote: vi.fn(),
  isKernel: vi.fn().mockReturnValue(true),
};

vi.mock('../reader-writer-set.mycelia.js', () => ({
  ReaderWriterSet: vi.fn().mockImplementation(() => mockRws),
}));

import { createIdentity } from '../create-identity.mycelia.js';

const ownerPkr = { uuid: 'owner', publicKey: Symbol('owner') };

describe('createIdentity', () => {
  let principals;
  let kernel;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockRws, {
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canGrant: vi.fn().mockReturnValue(true),
      addReader: vi.fn(),
      addWriter: vi.fn(),
      removeReader: vi.fn(),
      removeWriter: vi.fn(),
      promote: vi.fn(),
      demote: vi.fn(),
      isKernel: vi.fn().mockReturnValue(true),
    });
    principals = {
      createRWS: vi.fn().mockReturnValue(mockRws),
      resolvePKR: vi.fn().mockReturnValue(Symbol('priv')),
    };
    kernel = {
      sendProtected: vi.fn().mockResolvedValue('sent'),
      sendPooledProtected: vi.fn().mockResolvedValue('sent'),
      getAccessControl: vi.fn(),
      getChannelManager: vi.fn(),
    };
  });

  it('validates inputs', () => {
    expect(() => createIdentity(null, ownerPkr, kernel)).toThrow(/invalid principals/);
    expect(() => createIdentity(principals, { publicKey: 'not-symbol' }, kernel)).toThrow(/invalid owner/);
    expect(() => createIdentity(principals, ownerPkr, {})).toThrow(/kernel must support/);
  });

  it('provides permission wrappers and grant helpers', () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    const handler = vi.fn();
    const wrapped = identity.requireRead(handler, { callerId: { uuid: 'caller' } });
    wrapped('payload');
    expect(handler).toHaveBeenCalledWith('payload');
    identity.grantReader(Symbol('grant'), Symbol('grantee'));
    expect(mockRws.addReader).toHaveBeenCalled();
  });

  it('requireAuth validates kernel provenance and permission type', () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    const handler = vi.fn();
    identity.requireAuth('write', handler, { callerId: {}, callerIdSetBy: {} })('data');
    expect(handler).toHaveBeenCalledWith('data');
    expect(() => identity.requireAuth('unknown', handler, { callerIdSetBy: {} })).toThrow(/unknown/);
    mockRws.isKernel.mockReturnValue(false);
    expect(() => identity.requireAuth('read', handler, { callerIdSetBy: {} })).toThrow(/callerIdSetBy/);
  });

  it('sendProtected delegates to kernel', async () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    await identity.sendProtected({ path: '/ping' });
    expect(kernel.sendProtected).toHaveBeenCalledWith(ownerPkr, { path: '/ping' }, {});
  });

  it('sendPooledProtected delegates to kernel', async () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    await identity.sendPooledProtected('api://users/123', { action: 'get' }, { meta: { traceId: 'abc' } });
    expect(kernel.sendPooledProtected).toHaveBeenCalledWith(ownerPkr, 'api://users/123', { action: 'get' }, { meta: { traceId: 'abc' } });
  });

  it('sendPooledProtected throws if kernel does not support it', async () => {
    const kernelWithoutPooled = {
      sendProtected: vi.fn().mockResolvedValue('sent'),
      getAccessControl: vi.fn(),
      getChannelManager: vi.fn(),
    };
    const identity = createIdentity(principals, ownerPkr, kernelWithoutPooled);
    await expect(identity.sendPooledProtected('api://test', {})).rejects.toThrow(/kernel must support sendPooledProtected/);
  });

  it('createResourceIdentity requires subsystem and access control', () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    expect(() => identity.createResourceIdentity('cache', {})).toThrow(/setSubsystem/);
    identity.setSubsystem({ name: 'subsystem' });
    expect(() => identity.createResourceIdentity('cache', {})).toThrow(/AccessControlSubsystem/);
    kernel.getAccessControl.mockReturnValue({ createResource: vi.fn().mockReturnValue('resource') });
    expect(identity.createResourceIdentity('cache', {})).toBe('resource');
  });

  it('channel helpers require channel manager', () => {
    const identity = createIdentity(principals, ownerPkr, kernel);
    expect(() => identity.createChannel('route')).toThrow(/ChannelManagerSubsystem/);
    const cm = {
      registerChannel: vi.fn().mockReturnValue('channel'),
      getChannelFor: vi.fn().mockReturnValue('channel'),
      listAllChannelsFor: vi.fn().mockReturnValue([]),
    };
    kernel.getChannelManager.mockReturnValue(cm);
    expect(identity.createChannel('route')).toBe('channel');
    expect(identity.getChannel('route')).toBe('channel');
    expect(identity.listChannels()).toEqual([]);
  });
});

