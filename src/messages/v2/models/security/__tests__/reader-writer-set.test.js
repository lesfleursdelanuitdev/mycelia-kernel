import { describe, it, expect, vi, beforeEach } from 'vitest';

const uuidSequence = ['uuid-1', 'uuid-2'];
vi.mock('../security.utils.mycelia.js', () => ({
  randomUUID: () => uuidSequence.shift() || 'uuid-x',
}));

import { ReaderWriterSet } from '../reader-writer-set.mycelia.js';

const makePKR = (id, { valid = true, kernelValid = true } = {}) => ({
  uuid: id,
  isExpired: vi.fn().mockReturnValue(!valid),
  isValid: vi.fn().mockReturnValue(kernelValid),
});

describe('ReaderWriterSet', () => {
  let principals;
  let ownerPKR;
  let rws;

  beforeEach(() => {
    ownersetup();
  });

  function ownersetup() {
    ownerPKR = makePKR('owner', { valid: true });
    const keyMap = new Map();
    principals = {
      kernelId: { uuid: 'kernel' },
      isKernel: vi.fn().mockReturnValue(false),
      resolvePKR: vi.fn((pkr) => {
        if (!pkr) return null;
        if (!keyMap.has(pkr.uuid)) keyMap.set(pkr.uuid, Symbol(pkr.uuid));
        return keyMap.get(pkr.uuid);
      }),
    };
    rws = new ReaderWriterSet({ pkr: ownerPKR, principals });
  }

  it('validates constructor inputs', () => {
    expect(() => new ReaderWriterSet()).toThrow(/pkr/);
    expect(() => new ReaderWriterSet({ pkr: ownerPKR })).toThrow(/principals/);
  });

  it('manages readers and writers with grant validation', () => {
    const granter = ownerPKR;
    const reader = makePKR('reader');
    const writer = makePKR('writer');

    expect(rws.addReader(granter, reader)).toBe(true);
    expect(rws.hasReader(reader)).toBe(true);
    expect(rws.readerCount()).toBe(1);

    expect(rws.addWriter(granter, writer)).toBe(true);
    expect(rws.hasWriter(writer)).toBe(true);

    expect(rws.removeReader(granter, reader)).toBe(true);
    expect(rws.readerCount()).toBe(0);
  });

  it('promotes/demotes members and respects validation failures', () => {
    const granter = ownerPKR;
    const member = makePKR('member');
    const invalid = makePKR('invalid', { valid: false });

    rws.addReader(granter, member);
    expect(rws.promote(granter, member)).toBe(true);
    expect(rws.hasWriter(member)).toBe(true);

    expect(rws.demote(granter, member)).toBe(true);
    expect(rws.hasReader(member)).toBe(true);

    expect(rws.addReader(invalid, member)).toBe(false);
    expect(rws.promote(invalid, member)).toBe(false);
  });

  it('checks owner/kernel privileges for read/write/grant', () => {
    const kernelPKR = makePKR('kernel');
    principals.isKernel.mockImplementation((pkr) => pkr === kernelPKR);

    const reader = makePKR('reader');
    rws.addReader(ownerPKR, reader);

    expect(rws.canRead(reader)).toBe(true);
    expect(rws.canWrite(reader)).toBe(false);

    expect(rws.canRead(kernelPKR)).toBe(true);
    expect(rws.canWrite(kernelPKR)).toBe(true);
    expect(rws.canGrant(kernelPKR)).toBe(true);

    expect(rws.isOwner(ownerPKR)).toBe(true);
  });

  it('clone produces independent copy and toRecord serializes state', () => {
    const reader = makePKR('reader');
    rws.addReader(ownerPKR, reader);
    const clone = rws.clone();
    expect(clone).not.toBe(rws);
    expect(clone.hasReader(reader)).toBe(true);

    const record = rws.toRecord();
    expect(record).toEqual(
      expect.objectContaining({
        owner: ownerPKR.uuid,
        readers: expect.any(Array),
        writers: expect.any(Array),
        granters: expect.any(Array),
      }),
    );
    expect(rws.toString()).toContain('readers=1');
  });

  it('supports multiple granters with addGranter and removeGranter', () => {
    const granter1 = makePKR('granter1');
    const granter2 = makePKR('granter2');
    const grantee = makePKR('grantee');

    // Owner grants granter permission to granter1
    expect(rws.addGranter(ownerPKR, granter1)).toBe(true);
    expect(rws.hasGranter(granter1)).toBe(true);
    expect(rws.granterCount()).toBe(1);
    expect(rws.canGrant(granter1)).toBe(true);

    // granter1 can now grant permissions
    expect(rws.addReader(granter1, grantee)).toBe(true);
    expect(rws.hasReader(grantee)).toBe(true);

    // Owner grants granter permission to granter2
    expect(rws.addGranter(ownerPKR, granter2)).toBe(true);
    expect(rws.hasGranter(granter2)).toBe(true);
    expect(rws.granterCount()).toBe(2);
    expect(rws.canGrant(granter2)).toBe(true);

    // granter2 can also grant permissions
    const grantee2 = makePKR('grantee2');
    expect(rws.addWriter(granter2, grantee2)).toBe(true);
    expect(rws.hasWriter(grantee2)).toBe(true);

    // Remove granter1
    expect(rws.removeGranter(ownerPKR, granter1)).toBe(true);
    expect(rws.hasGranter(granter1)).toBe(false);
    expect(rws.granterCount()).toBe(1);
    expect(rws.canGrant(granter1)).toBe(false);

    // granter1 can no longer grant permissions
    const grantee3 = makePKR('grantee3');
    expect(rws.addReader(granter1, grantee3)).toBe(false);
  });

  it('only current granters can add new granters', () => {
    const granter1 = makePKR('granter1');
    const granter2 = makePKR('granter2');
    const nonGranter = makePKR('nonGranter');

    // Owner grants granter permission to granter1
    rws.addGranter(ownerPKR, granter1);

    // granter1 can grant granter permission to granter2
    expect(rws.addGranter(granter1, granter2)).toBe(true);
    expect(rws.hasGranter(granter2)).toBe(true);

    // nonGranter cannot grant granter permission
    expect(rws.addGranter(nonGranter, makePKR('grantee'))).toBe(false);
  });

  it('clone includes granters and toRecord serializes granters', () => {
    const granter = makePKR('granter');
    rws.addGranter(ownerPKR, granter);

    const clone = rws.clone();
    expect(clone.hasGranter(granter)).toBe(true);
    expect(clone.canGrant(granter)).toBe(true);

    const record = rws.toRecord();
    expect(record.granters).toEqual(expect.any(Array));
    expect(record.granters.length).toBe(1);
    expect(rws.toString()).toContain('granters=1');
  });

  it('clear removes all granters', () => {
    const granter1 = makePKR('granter1');
    const granter2 = makePKR('granter2');
    
    rws.addGranter(ownerPKR, granter1);
    rws.addGranter(ownerPKR, granter2);
    expect(rws.granterCount()).toBe(2);

    rws.clear();
    expect(rws.granterCount()).toBe(0);
    expect(rws.hasGranter(granter1)).toBe(false);
    expect(rws.hasGranter(granter2)).toBe(false);
  });
});

